// main.js v3: orquestador. El host es la autoridad (fases, temporizadores, bots, motor); los clientes reciben `state` público + su `priv`.
(function () {
  'use strict';
  const RK = ['guia', 'medica', 'ing'], ZERO = { left: 0, right: 0, jump: 0, interact: 0, up: 0, down: 0, ability: 0, run: 0 };
  const TRACK = { briefing: 'briefing', explore: 'explore', plan: 'plan', secret: 'secret', resolve: 'resolve', summary: 'summary' };
  const WHY = { sin_ap: 'Sin acciones: ya gastaste las 3', ya_visto: 'Ya has revisado esto', agotado: 'Otro compañero se lo ha llevado', fase: 'Ahora no se puede', poi: 'Eso no existe' };
  const S = window.Sound || {}, snd = (n) => { try { S.sfx && S.sfx(n); } catch (e) { } };
  let st = null, eng = null, cv = null, gameEl = null, myRole = 'ing', myId = 'solo', myPriv = null, mode = 'solo', started = false;
  let timer = null, snapT = null, busyRound = false, lastTrack = '', shownRes = -1, shownSum = -1, shownFinal = false, lastChatId = 0, lastChatAt = 0, lastStart = null;
  let earlyN = 0, sec = 0, typing = false, lastScene = '', lastChatId0 = false; const busy = {}, nextBot = {}, introReady = {}, keys = {};
  const isClient = () => mode === 'client';
  const ownerRole = id => RK.find(r => st.players[r].owner === id);

  // ---------- Contenedor, motor y HUD ----------
  function ensureGame() {
    if (gameEl) return;
    gameEl = document.createElement('div'); gameEl.id = 'rcgame';
    gameEl.style.cssText = 'position:fixed;inset:0;background:#0d0b16;display:none;align-items:center;justify-content:center;z-index:10';
    cv = document.createElement('canvas'); cv.width = 320; cv.height = 180; cv.style.imageRendering = 'pixelated';
    gameEl.appendChild(cv); document.body.appendChild(gameEl);
    addEventListener('resize', () => eng && eng.fit(innerWidth, innerHeight));
    Hud.mount(gameEl);
    Hud.onChat(onChat); Hud.onShare(onShare); Hud.onVote(onVote); Hud.onSecret(onSecret); Hud.onReady(onReady);
    Hud.onAsk && Hud.onAsk(onAsk); Hud.onAbility && Hud.onAbility(() => { if (!isClient() && eng) { const o = eng.useAbility(myRole); if (o && !o.ok) Hud.floatText(o.reason === 'rol' ? 'Esa puerta la abre otro compañero: pídeselo por radio' : 'Aquí no puedes usar tu habilidad', 'bad'); } });
    Hud.onDialogue && Hud.onDialogue(o => { if (o && eng) Object.keys(keys).forEach(k => keys[k] = 0), pushInput(); });
    Hud.onExit(() => location.reload()); Hud.onSettings(() => UI.openSettings());
    Hud.onFx && Hud.onFx((t, i) => eng && eng.camShake(i || 2)); Hud.onChatFocus && Hud.onChatFocus(b => { typing = b; pushInput(); });
  }
  function makeEngine(authority) {
    if (eng) return;
    eng = Engine.create(cv, { assets: window.ASSETS, getState: () => st, authority, localRole: myRole, water: 10, onInteract, onSfx: n => snd(n), onGate, onDrown, onUnreachable });
    eng.start(); eng.fit(innerWidth, innerHeight);
    const ins = () => { try { eng.setViewInsets(Hud.getInsets()); } catch (e) { } }; ins(); Hud.onInsets && Hud.onInsets(ins);
  }
  // Misión v5: UN objetivo, flecha guía, habilidad, ayuda, aire, reunión y chips de chat contextuales
  let gKey = '', quickMap = {};
  const humansActed = () => RK.filter(r => st.players[r].owner).every(r => { try { return Story.privOf(st, r).ap < 3; } catch (e) { return true; } });
  function guide() {
    if (!st || !eng || !started || !myPriv || st.phase === 'intro' || st.phase === 'final') return;
    const ex = st.phase === 'explore', air = eng.getAir ? eng.getAir(myRole) : 100;
    Hud.setAir && Hud.setAir(ex && air != null && air < 99 ? air : null);
    let m; try { m = Story.mission(st, myRole); } catch (e) { return; } if (!m || !m.now) return;
    const cr = ex ? Story.crisisReady(st) : { ready: false }, g = ex ? eng.nearGate(myRole) : null;
    const gates = (st.gates || []).filter(x => !st.gatesOpen[x.id] && x.zone === st.round && x.role !== myRole);
    const k = JSON.stringify([m.now.text, !!g, m.steps.map(x => x.done), st.round, ex && myPriv.ap, !!g, cr.ready, gates.length]);
    if (k !== gKey) {
      gKey = k; const rl = Story.readyLabel(st.phase) || {};
      Hud.setNow({ text: m.now.text, why: m.now.why || '', sub: m.now.hint || '', kind: ex ? (m.now.target ? 'go' : 'explore') : st.phase === 'plan' ? 'plan' : st.phase === 'secret' ? 'secret' : 'info' });
      Hud.setMission({ title: m.title, steps: m.steps.map(x => ({ text: x.text, done: x.done })) });
      Hud.setReady({ label: 'Hablar con el equipo y decidir', tip: 'Cuando estés listo, el equipo se reúne para votar el plan', pulse: !!cr.ready });
      const ab = { guia: 'Clavar anclaje', medica: 'Estabilizar / reptadero', ing: 'Puente / válvula' }[myRole];
      Hud.setAbilities && Hud.setAbilities(ex && g ? { key: 'Q', label: ab, hint: g.text, ready: true } : null);
      Hud.setHelp && Hud.setHelp(ex ? gates.map(x => ({ role: x.role, label: 'Pedir a ' + { guia: 'Mateo', medica: 'Elena', ing: 'Samuel' }[x.role] + ': ' + x.kind, enabled: true, hint: x.why, gateId: x.id })) : null);
      try { const q = Story.chatSuggest(st, myRole) || []; quickMap = {}; q.forEach(c => quickMap[c.text] = c); Hud.setQuick && Hud.setQuick(q.map(c => ({ label: c.label, text: c.text }))); } catch (e) { }
    }
    try { const c = st.phase === 'explore' || st.phase === 'plan' ? Story.coach(st, myRole, coachFlags(m)) : null; Hud.setCoach && Hud.setCoach(c ? { step: c.step, total: c.total, text: c.text } : null); } catch (e) { }
    const tgt = ex && m.now.target ? m.now.target : null; if (tgt !== guide.t) { guide.t = tgt; eng.setGuide(tgt, tgt ? { label: m.now.short ? m.now.short.replace(/^Ve a /, '') : '' } : undefined); }
  }
  // Puertas de habilidad: el motor las abre (jugador o bot) y aquí se refleja en el estado de la historia
  const helpFor = {};
  function onGate(role, gateId) {
    if (isClient() || !st) return;
    const o = Story.openGate(st, role, gateId, { helpFor: helpFor[gateId] }); if (!o || !o.ok) return;
    syncPois(); snd('gate_open'); Hud.floatText('PUERTA ABIERTA: ' + (o.kind || ''), 'info'); gKey = ''; push();
  }
  const sayOnce = (r, t) => { if (!st.chat.slice(-40).some(m => m.from === r && m.text === t)) Story.say(st, r, t, 'chat'); };
  function onUnreachable(role, poiId) { if (isClient() || !st) return; try { Story.botStuck(st, role, poiId); push(); } catch (e) { } }
  let lastPos = null, movedAcc = 0;
  function coachFlags(m) {
    let near = false; try { const p = eng.snapshot()[myRole]; if (p) { if (lastPos) movedAcc += Math.abs(p[0] - lastPos[0]) + Math.abs(p[1] - lastPos[1]); lastPos = [p[0], p[1]]; const t = m && m.now && m.now.target, q = t && eng.getPoiPos(t); near = !!(q && Math.hypot(q.x - p[0], q.y - p[1]) < 40); } } catch (e) { }
    return { moved: movedAcc > 60, near, notebook: coachFlags.nb };
  }
  function onDrown(role) { if (isClient() || !st || st.phase !== 'explore') return; st.s.salud = Math.max(0, st.s.salud - 5); if (role === myRole) Hud.floatText('¡Te ahogas! -5 salud', 'bad'); }
  function onAsk(toRole, gateId) {
    if (isClient()) return Net.send('poi', { act: 'ask', toRole, gateId });
    doAsk(myRole, toRole, gateId);
  }
  function doAsk(from, to, gateId) {
    const q = Story.request(st, from, to, { gateId }); push(); if (!q || !q.ok || !q.accept || q.human) return;
    helpFor[gateId] = from; setTimeout(() => { if (st && st.phase === 'explore') eng.botOpenGate(to, gateId, () => { }); }, q.delay || 1500);
  }
  function setupBots() { RK.forEach(r => eng.setBot(r, r !== myRole && (!isClient() ? st.players[r].ai : true))); eng.setLocal(myRole); }
  function showGame() { gameEl.style.display = 'flex'; Hud.show && Hud.show(); eng.fit(innerWidth, innerHeight); }

  // ---------- Teclado ----------
  const KEYMAP = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ' ': 'jump', e: 'interact', q: 'ability', Shift: 'run' };
  const kmap = e => KEYMAP[e.key.length > 1 ? e.key : e.key.toLowerCase()];
  const cur = () => (st && st.phase === 'explore' && !typing && !(Hud.isDialogue && Hud.isDialogue())) ? Object.assign({}, ZERO, keys) : ZERO;
  function pushInput() { if (!st || !eng || !started) return; const i = cur(); if (isClient()) Net.send('input', i); else eng.setInput(myRole, i); }
  addEventListener('keydown', e => { if (/INPUT|TEXTAREA/.test(e.target.tagName) || e.ctrlKey || e.metaKey) return; const k = kmap(e); if (k) { keys[k] = 1; if (st && st.phase === 'explore') e.preventDefault(); pushInput(); } });
  addEventListener('keydown', e => { if (!/INPUT|TEXTAREA/.test(e.target.tagName) && /^j$/i.test(e.key)) coachFlags.nb = true; });
  addEventListener('keydown', e => { if (st && st.phase === 'summary' && (e.key === ' ' || e.key === 'Enter') && !/INPUT|TEXTAREA/.test(e.target.tagName)) { const b = document.querySelector('#rcgame button[data-act=cont]:not([disabled])'); if (b) { e.preventDefault(); b.click(); } } });
  addEventListener('keyup', e => { const k = kmap(e); if (k) { keys[k] = 0; pushInput(); } });
  addEventListener('blur', () => { Object.keys(keys).forEach(k => keys[k] = 0); pushInput(); });

  // ---------- Estado -> pantalla ----------
  function syncPois() { if (!eng || !st || !st.pois) return; st.pois.forEach(p => eng.markPoi(p.id, { used: p.used, by: p.by })); }
  function push() {
    if (!st) return; render();
    if (mode === 'host') {
      Net.broadcast('state', Story.publicState(st));
      RK.forEach(r => { const o = st.players[r].owner; if (o && o !== myId && o !== 'solo') Net.sendTo(o, 'priv', Story.privOf(st, r)); });
    }
  }
  const revKind = t => t === 'lie' ? 'lie' : (t === 'secret' || t === 'secret_action' || t === 'trap' || t === 'crisis') ? 'secret' : 'good';
  const achs = res => (res && res.achievements || []).map(a => ({ id: a.id, title: a.name, text: a.desc }));
  function render() {
    if (!st || !started) return;
    if (!isClient()) myPriv = Story.privOf(st, myRole);
    syncPois();
    if (st.phase === 'intro' || !myPriv) return;
    Hud.update(st, myPriv, myRole);
    const t = TRACK[st.phase]; if (t && t !== lastTrack) { lastTrack = t; S.music && S.music(t); }
    S.setIntensity && S.setIntensity(st.s.agua / 100);
    (st.chat || []).forEach(m => { if (m.id > lastChatId) { lastChatId = m.id; lastChatAt = Date.now(); if (RK.includes(m.from) && (m.kind === 'chat' || m.kind === 'share') && eng) eng.say(m.from, String(m.text).slice(0, 70)); if (lastChatId0 && m.from !== myRole && (m.from === 'lia' || (RK.includes(m.from) && (m.kind === 'chat' || m.kind === 'share')))) Hud.say && Hud.say({ who: m.from, mood: m.mood || 'talk', text: String(m.text || (m.card && m.card.text) || '').slice(0, 110) }); } lastChatId0 = true; });
    const sk = st.round + ':' + st.phase;
    if (sk !== lastScene) {
      lastScene = sk; const kind = st.phase === 'briefing' ? 'event' : st.phase === 'plan' ? 'plan' : null;
      if (kind && Hud.dialogue) { let ls = []; try { ls = Story.scene(st, kind) || []; } catch (e) { } if (st.round === 1 && kind === 'event') { try { ls = ls.concat(Story.scene(st, 'lia') || []); } catch (e) { } }
        Hud.dialogue(ls).then(() => { if (kind === 'event' && mode !== 'client' && st && st.phase === 'briefing') advance(); }); }
    }
    const res = st.lastRes;
    if (st.phase === 'resolve' && res && shownRes !== st.round) {
      shownRes = st.round;
      let ex = null; try { ex = Story.explainResult(st); } catch (e) { }
      Hud.showResolve(Object.assign({}, res, { explain: ex, reveals: (res.reveals || []).map(r => Object.assign({}, r, { kind: revKind(r.type) })), achievements: achs(res) })).then(() => { if (mode !== 'client' && st && st.phase === 'resolve') advance(); });
    }
    if (st.phase === 'summary' && shownSum !== st.round) {
      shownSum = st.round; Hud.showSummary({ round: st.round, score: res ? res.scoreDelta : {}, total: st.score.total, achievements: achs(res) }).then(() => { if (mode !== 'client' && st && st.phase === 'summary') advance(); });
    }
    if (st.phase === 'final' && st.final && !shownFinal) {
      shownFinal = true; try { localStorage.setItem('rcv3_games', String((+localStorage.getItem('rcv3_games') || 0) + 1)); } catch (e) { } Hud.hide && Hud.hide(); gameEl.style.display = 'none'; S.music && S.music(st.final.saved ? 'win' : 'lose');
      UI.showFinal(st.final, st);
    }
  }

  // ---------- Intro y rol ----------
  async function playIntro() {
    UI.hide(); gameEl.style.display = 'none'; Hud.hide && Hud.hide();
    for (let i = 0; i < 30 && !myPriv; i++) await new Promise(r => setTimeout(r, 100));
    await UI.playCinematic('intro'); if (myPriv) await UI.showRole(myPriv, myRole);
    UI.hide(); showGame(); S.music && S.music('briefing');
  }
  async function waitIntro() { // host: espera a los clientes humanos (máx. 90 s)
    const t0 = Date.now(), pend = () => RK.some(r => { const o = st.players[r].owner; return o && o !== myId && o !== 'solo' && !introReady[o]; });
    while (Date.now() - t0 < 90000 && pend()) await new Promise(r => setTimeout(r, 500));
  }

  // ---------- Host: partida ----------
  async function startGame(o, noIntro) {
    lastStart = o; shownRes = shownSum = -1; shownFinal = false; lastChatId = 0; lastTrack = ''; lastScene = ''; lastChatId0 = false; lastPos = null; movedAcc = 0; clearInterval(timer);
    const hostMode = o.host && !o.solo && window.Net && Net.role === 'host';
    mode = hostMode ? 'host' : 'solo'; myRole = o.role || 'ing'; myId = hostMode ? Net.localId : 'solo';
    const hs = hostMode ? Net.players.filter(p => !p.bot && RK.includes(p.role)).map(p => p.role) : [myRole];
    st = Story.newGame({ seed: (Date.now() % 1000000) | 0, difficulty: Story.defaultDifficulty && Story.defaultDifficulty() === 'facil' ? 'facil' : (o.difficulty || (UI.settings && UI.settings().diff) || 'normal'), humans: hs, demo: !Story.hasKey() });
    if (hostMode) { Net.lock(true); Net.players.forEach(p => { if (!p.bot && RK.includes(p.role)) { st.players[p.role].owner = p.id; st.players[p.role].connected = true; } }); }
    else st.players[myRole].owner = 'solo';
    started = true; ensureGame(); makeEngine(true); setupBots(); eng.resetGates(); eng.setWater(st.s.agua); eng.setWaterRate(0);
    st.phase = 'intro'; busyRound = true; myPriv = Story.privOf(st, myRole);
    if (hostMode) RK.forEach(r => { const ow = st.players[r].owner; if (ow && ow !== myId) Net.sendTo(ow, 'priv', Story.privOf(st, r)); });
    snapT = snapT || setInterval(() => { if (mode === 'host' && eng) Net.broadcast('snapshot', eng.snapshot()); pushInput(); }, 50);
    if (hostMode) Net.broadcast('state', Story.publicState(st));
    if (noIntro) { UI.hide(); showGame(); } else { await playIntro(); await waitIntro(); }
    await startRound(); timer = setInterval(tick, 250);
  }
  async function startRound() {
    busyRound = true; earlyN = 0;
    await Story.roundStart(st);
    eng.setUnlocked(st.round); eng.setPois(st.round, st.pois); try { eng.setPoiHints(Story.poiHints(st, myRole)); } catch (e) { } eng.gather(st.round); eng.pan(st.round); eng.setWaterRate(0); eng.setWater(st.s.agua);
    busyRound = false; push(); react('brief'); gKey = ''; guide.t = undefined; guide();
    const ev = st.event, fp = ev && ev.focus && ev.focus.poi && eng.getPoiPos(ev.focus.poi); if (fp) setTimeout(() => eng.focus(fp.x, fp.y, { ms: 2500 }), 1500);
  }
  async function react(trig, ctx) { try { await Story.botsReact(st, trig, ctx); } catch (e) { } push(); }
  const allVoted = () => RK.every(r => st.plan.votes && st.plan.votes[r]);
  const allSecret = () => RK.every(r => { const p = Story.privOf(st, r); return p.secretPick !== null && p.secretPick !== undefined; });

  function tick() {
    if (!st || busyRound || st.phase === 'intro' || st.phase === 'final') return;
    if (Hud.isDialogue && Hud.isDialogue()) return;
    if (st.phase === 'resolve' || st.phase === 'summary') st.tleft = Math.max(st.tleft, 60); // avanzan con CONTINUAR
    st.tleft = Math.max(0, st.tleft - 0.25);
    if (st.phase === 'explore') {
      const w = Story.tickWater(st, 0.25); eng.setWater(st.s.agua);
      if (w && w.warn) { snd('water_warn'); react('water', { level: w.warn }); }
    }
    botLoop(); guide();
    if (st.phase === 'explore' && Date.now() - lastChatAt > 25000) { lastChatAt = Date.now(); react('idle'); }
    if (st.phase === 'explore' && !(sec % 20)) { try { Story.botRequest(st) && push(); } catch (e) { } }
    const cr = st.phase === 'explore' ? Story.crisisReady(st) : {}, early = (st.phase === 'explore' && (Story.allConvened(st) || (cr.ready && (cr.reason === 'tiempo' || humansActed())))) || (st.phase === 'plan' && allVoted()) || (st.phase === 'secret' && allSecret());
    earlyN = early ? earlyN + 1 : 0;
    if (st.tleft <= 0 || earlyN >= 8) advance();
    else if (++sec % 4 === 0) push();
  }
  async function advance() {
    if (busyRound) return; busyRound = true; earlyN = 0;
    try {
      switch (st.phase) {
        case 'briefing': Story.setPhase(st, 'explore'); break;
        case 'explore': Story.setPhase(st, 'plan'); try { const b = Story.planBrief(st); if (b && st.plan) st.plan.brief = b.lines || b.text; } catch (e) { } react('plan'); break;
        case 'plan': { const t = Story.tally(st); if (t && t.react) react('tally', t.react.ctx); Story.setPhase(st, 'secret'); react('secret'); break; }
        case 'secret': Story.setPhase(st, 'resolve'); st.lastRes = Story.resolve(st); eng.setWater(st.s.agua); react('resolve', { result: st.lastRes }); break;
        case 'resolve': Story.setPhase(st, 'summary'); break;
        case 'summary':
          if (Story.isOver(st)) { st.final = await Story.finish(st, { role: myRole }); break; }
          Story.advance(st); await startRound(); return;
      }
    } catch (e) { console.error(e); }
    busyRound = false; push();
  }

  // ---------- Compañeros IA ----------
  function botLoop() {
    if (!['explore', 'plan', 'secret'].includes(st.phase)) return;
    RK.forEach(r => {
      if (!st.players[r].ai || busy[r] || Date.now() < (nextBot[r] || 0)) return;
      nextBot[r] = Date.now() + 2500 + Math.random() * 3500; busy[r] = true; botStep(r).catch(() => { }).then(() => busy[r] = false);
    });
  }
  async function botStep(r) {
    const ph = st.phase, a = await Story.botAct(st, r, ph); if (!a || st.phase !== ph) return;
    if (a.type === 'poi') {
      if (a.say) sayOnce(r, a.say); else Story.botChat(st, r, 'poi', { poi: a.label }).then(push).catch(() => { });
      eng.botGoto(r, a.poiId, ok => {
        if (!ok || st.phase !== 'explore') return; Story.exec(st, r, a); syncPois();
        Story.botChat(st, r, 'found', { poi: a.label, hide: false }).catch(() => { }).then(push); push();
      });
    } else if (a.type === 'gate') { if (a.say) { sayOnce(r, a.say); push(); } eng.botOpenGate(r, a.gateId, () => { });
    } else { const out = Story.exec(st, r, a); if (out && out.react) react(out.react.trigger, out.react.ctx); push(); }
  }

  // ---------- Acciones del jugador (host las ejecuta; los clientes las envían) ----------
  function fb(role, out) {
    const msg = out.card ? 'NUEVA INFO: ' + out.card.title : out.hallazgo ? 'HALLAZGO ' + out.hallazgo.n + '/5: ' + out.hallazgo.title : out.kind === 'recurso' ? 'RECURSO PARA EL EQUIPO' : '';
    const sfx = out.hallazgo ? 'achievement' : 'intel';
    if (role === myRole) { if (out.explain && Hud.floatCard) Hud.floatCard({ title: out.card ? out.card.title : out.hallazgo ? out.hallazgo.title : 'Recurso', text: out.explain, uses: out.card && (out.card.uses || out.card.use) }); else if (msg) Hud.floatText(msg, 'info'); snd(sfx); }
    else { const o = st.players[role].owner; if (o && o !== 'solo') Net.sendTo(o, 'phase', { note: msg, sfx }); }
  }
  function onInteract(role, poiId) { // solo host
    if (isClient() || !st || st.phase !== 'explore') return;
    const out = Story.poiInteract(st, role, poiId);
    if (!out || !out.ok) { if (role === myRole) Hud.floatText(WHY[out && out.reason] || 'No se puede', 'bad'); return; }
    syncPois(); fb(role, out); push();
  }
  function doChat(role, text) {
    text = String(text || '').slice(0, 300).trim(); if (!text) return; Story.say(st, role, text, 'chat');
    let ans = null; try { ans = Story.answerChat(st, role, text); } catch (e) { }
    if (!ans) return react('chat', { from: role, text });
    push(); if (ans.accept && ans.gateId && !ans.human) { helpFor[ans.gateId] = role; setTimeout(() => { if (st && st.phase === 'explore') eng.botOpenGate(ans.to, ans.gateId, () => { }); }, ans.delay || 1500); }
  }
  function doShare(role, d) { const out = Story.share(st, role, d.cardId, { asIs: d.asIs !== false, text: d.text }); if (out && out.ok) { if (out.lie && role === myRole) Hud.floatText('Has compartido información falsa', 'bad'); if (out.react) react(out.react.trigger, out.react.ctx); } push(); }
  function doVote(role, optId) { const out = Story.vote(st, role, optId); if (out && out.react) react(out.react.trigger, out.react.ctx); push(); }
  function onChat(text) {
    const c = quickMap[text];
    if (c && c.gateId && c.toRole) return onAsk(c.toRole, c.gateId);
    if (c && c.cardId) return onShare(c.cardId);
    if (isClient()) Net.send('chat', { text }); else doChat(myRole, text);
  }
  function onShare(cardId, o) { const d = { act: 'share', cardId, asIs: !o || o.asIs !== false, text: o && o.text }; if (isClient()) Net.send('poi', d); else doShare(myRole, d); }
  function onVote(optId) { if (isClient()) Net.send('vote', { optId }); else doVote(myRole, optId); }
  function onSecret(idx) { if (isClient()) Net.send('secret', { idx }); else { Story.secretPick(st, myRole, idx); push(); } }
  function onReady() { if (isClient()) Net.send('ready', { act: 'explore' }); else { const o = Story.convene(st, myRole); if (o && !o.ok) Hud.floatText('Investiga algo antes de convocar al equipo', 'bad'); push(); } }

  // ---------- Red ----------
  function wireNet() {
    if (!window.Net || !Net.available) return;
    const host = () => mode === 'host' && st;
    Net.on('input', (d, from) => { if (!host() || from === 'p0') return; const r = ownerRole(from); if (!r) return; eng.setBot(r, false); eng.setInput(r, st.phase === 'explore' ? d : ZERO); });
    Net.on('chat', (d, from) => { if (!host()) return; const r = ownerRole(d.from || from); if (r && r !== myRole && d.text) doChat(r, d.text); });
    Net.on('poi', (d, from) => { if (!host() || !d) return; const r = ownerRole(from); if (!r) return; if (d.act === 'share') doShare(r, d); else if (d.act === 'ask' && RK.includes(d.toRole)) doAsk(r, d.toRole, d.gateId); });
    Net.on('vote', (d, from) => { if (!host()) return; const r = ownerRole(from); if (r) doVote(r, d.optId); });
    Net.on('secret', (d, from) => { if (!host()) return; const r = ownerRole(from); if (r) { Story.secretPick(st, r, d.idx); push(); } });
    Net.on('ready', (d, from) => { if (!host() || !d) return; if (d.act === 'intro') introReady[from] = 1; else if (d.act === 'explore') { const r = ownerRole(from); if (r) { Story.convene(st, r); push(); } } });
    Net.on('players', () => { // quien se va pasa a compañero IA
      if (!host()) return; const live = Net.players.filter(p => !p.bot && p.connected !== false).map(p => p.id); let ch = false;
      RK.forEach(r => { const o = st.players[r].owner; if (o && o !== myId && !live.includes(o)) { st.players[r].owner = null; st.players[r].ai = true; st.players[r].connected = false; eng.setBot(r, true); ch = true; } });
      if (ch) push();
    });
    Net.on('state', s => { // cliente
      if (Net.role !== 'client') return;
      const prev = st; st = s;
      if (!started) {
        mode = 'client'; myId = Net.localId; const me = Net.players.find(p => p.id === myId); myRole = (me && me.role) || RK.find(r => s.players[r].owner === myId) || 'medica';
        started = true; UI.hide(); ensureGame(); makeEngine(false); setupBots();
      }
      if (s.phase === 'intro' && (!prev || prev.phase !== 'intro')) playIntro().then(() => Net.send('ready', { act: 'intro' }));
      else if (s.phase !== 'intro') render();
    });
    Net.on('priv', d => { myPriv = d; if (st) render(); });
    Net.on('phase', d => { if (d && d.note) { Hud.floatText(d.note, 'info'); snd(d.sfx || 'intel'); } });
    Net.on('snapshot', s => { if (mode === 'client' && eng) eng.applySnapshot(s); });
    Net.on('leave', d => { if (d && d.host) { UI.toast('El anfitrión se ha ido. Volviendo al inicio…', { bad: true }); setTimeout(() => location.reload(), 2500); } });
  }

  // ---------- Arranque ----------
  UI.on('start', o => { if (window.Net && Net.role === 'client') return; startGame(o || {}, false); });
  UI.on('restart', () => { if (isClient()) return UI.toast('Solo el anfitrión puede reiniciar.'); if (lastStart) startGame(lastStart, true); });
  UI.on('menu', () => location.reload());
  window.RC = { st: () => st, eng: () => eng, advance: () => advance(), priv: () => myPriv, role: () => myRole }; // gancho para pruebas
  window.RC_NOCARD = true; wireNet(); UI.showMenu();
  if (/#sala=/.test(location.hash)) UI.showLobby({ mode: 'join' });
})();
