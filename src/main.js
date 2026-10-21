// main.js v3: orquestador. El host es la autoridad (fases, temporizadores, bots, motor); los clientes reciben `state` público + su `priv`.
(function () {
  'use strict';
  const RK = ['guia', 'medica', 'ing'], ZERO = { left: 0, right: 0, jump: 0, interact: 0, up: 0, down: 0 };
  const TRACK = { briefing: 'briefing', explore: 'explore', plan: 'plan', secret: 'secret', resolve: 'resolve', summary: 'summary' };
  const WHY = { sin_ap: 'Sin acciones: ya gastaste las 3', ya_visto: 'Ya has revisado esto', agotado: 'Otro compañero se lo ha llevado', fase: 'Ahora no se puede', poi: 'Eso no existe' };
  const S = window.Sound || {}, snd = (n) => { try { S.sfx && S.sfx(n); } catch (e) { } };
  let st = null, eng = null, cv = null, gameEl = null, myRole = 'ing', myId = 'solo', myPriv = null, mode = 'solo', started = false;
  let timer = null, snapT = null, busyRound = false, lastTrack = '', shownRes = -1, shownSum = -1, shownFinal = false, lastChatId = 0, lastChatAt = 0, lastStart = null;
  let earlyN = 0, sec = 0, typing = false; const busy = {}, nextBot = {}, introReady = {}, keys = {};
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
    Hud.onExit(() => location.reload()); Hud.onSettings(() => UI.openSettings());
    Hud.onFx && Hud.onFx((t, i) => eng && eng.camShake(i || 2)); Hud.onChatFocus && Hud.onChatFocus(b => { typing = b; pushInput(); });
  }
  function makeEngine(authority) {
    if (eng) return;
    eng = Engine.create(cv, { assets: window.ASSETS, getState: () => st, authority, localRole: myRole, water: 10, onInteract, onSfx: n => snd(n) });
    eng.start(); eng.fit(innerWidth, innerHeight);
  }
  function setupBots() { RK.forEach(r => eng.setBot(r, r !== myRole && (!isClient() ? st.players[r].ai : true))); eng.setLocal(myRole); }
  function showGame() { gameEl.style.display = 'flex'; Hud.show && Hud.show(); eng.fit(innerWidth, innerHeight); }

  // ---------- Teclado ----------
  const KEYMAP = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ' ': 'jump', e: 'interact' };
  const kmap = e => KEYMAP[e.key.length > 1 ? e.key : e.key.toLowerCase()];
  const cur = () => (st && st.phase === 'explore' && !typing) ? Object.assign({}, ZERO, keys) : ZERO;
  function pushInput() { if (!st || !eng || !started) return; const i = cur(); if (isClient()) Net.send('input', i); else eng.setInput(myRole, i); }
  addEventListener('keydown', e => { if (/INPUT|TEXTAREA/.test(e.target.tagName) || e.ctrlKey || e.metaKey) return; const k = kmap(e); if (k) { keys[k] = 1; if (st && st.phase === 'explore') e.preventDefault(); pushInput(); } });
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
    (st.chat || []).forEach(m => { if (m.id > lastChatId) { lastChatId = m.id; lastChatAt = Date.now(); if (RK.includes(m.from) && (m.kind === 'chat' || m.kind === 'share') && eng) eng.say(m.from, String(m.text).slice(0, 70)); } });
    const res = st.lastRes;
    if (st.phase === 'resolve' && res && shownRes !== st.round) {
      shownRes = st.round;
      Hud.showResolve(Object.assign({}, res, { reveals: (res.reveals || []).map(r => Object.assign({}, r, { kind: revKind(r.type) })), achievements: achs(res) }));
    }
    if (st.phase === 'summary' && shownSum !== st.round) {
      shownSum = st.round; Hud.showSummary({ round: st.round, score: res ? res.scoreDelta : {}, total: st.score.total, achievements: achs(res) });
    }
    if (st.phase === 'final' && st.final && !shownFinal) {
      shownFinal = true; Hud.hide && Hud.hide(); gameEl.style.display = 'none'; S.music && S.music(st.final.saved ? 'win' : 'lose');
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
    lastStart = o; shownRes = shownSum = -1; shownFinal = false; lastChatId = 0; lastTrack = ''; clearInterval(timer);
    const hostMode = o.host && !o.solo && window.Net && Net.role === 'host';
    mode = hostMode ? 'host' : 'solo'; myRole = o.role || 'ing'; myId = hostMode ? Net.localId : 'solo';
    const hs = hostMode ? Net.players.filter(p => !p.bot && RK.includes(p.role)).map(p => p.role) : [myRole];
    st = Story.newGame({ seed: (Date.now() % 1000000) | 0, difficulty: o.difficulty || (UI.settings && UI.settings().diff) || 'normal', humans: hs, demo: !Story.hasKey() });
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
    eng.setPois(st.round, st.pois); eng.gather(st.round); eng.pan(st.round); eng.setWaterRate(0); eng.setWater(st.s.agua);
    busyRound = false; push(); react('brief');
  }
  async function react(trig, ctx) { try { await Story.botsReact(st, trig, ctx); } catch (e) { } push(); }
  const allVoted = () => RK.every(r => st.plan.votes && st.plan.votes[r]);
  const allSecret = () => RK.every(r => { const p = Story.privOf(st, r); return p.secretPick !== null && p.secretPick !== undefined; });

  function tick() {
    if (!st || busyRound || st.phase === 'intro' || st.phase === 'final') return;
    st.tleft = Math.max(0, st.tleft - 0.25);
    if (st.phase === 'explore') {
      const w = Story.tickWater(st, 0.25); eng.setWater(st.s.agua);
      if (w && w.warn) { snd('water_warn'); react('water', { level: w.warn }); }
    }
    botLoop();
    if (st.phase === 'explore' && Date.now() - lastChatAt > 25000) { lastChatAt = Date.now(); react('idle'); }
    const early = (st.phase === 'explore' && Story.allReady(st)) || (st.phase === 'plan' && allVoted()) || (st.phase === 'secret' && allSecret());
    earlyN = early ? earlyN + 1 : 0;
    if (st.tleft <= 0 || earlyN >= 8) advance();
    else if (++sec % 4 === 0) push();
  }
  async function advance() {
    if (busyRound) return; busyRound = true; earlyN = 0;
    try {
      switch (st.phase) {
        case 'briefing': Story.setPhase(st, 'explore'); break;
        case 'explore': Story.setPhase(st, 'plan'); react('plan'); break;
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
      Story.botChat(st, r, 'poi', { poi: a.label }).then(push).catch(() => { });
      eng.botGoto(r, a.poiId, ok => {
        if (!ok || st.phase !== 'explore') return; Story.exec(st, r, a); syncPois();
        Story.botChat(st, r, 'found', { poi: a.label, hide: false }).catch(() => { }).then(push); push();
      });
    } else { const out = Story.exec(st, r, a); if (out && out.react) react(out.react.trigger, out.react.ctx); push(); }
  }

  // ---------- Acciones del jugador (host las ejecuta; los clientes las envían) ----------
  function fb(role, out) {
    const msg = out.card ? 'NUEVA INFO: ' + out.card.title : out.hallazgo ? 'HALLAZGO ' + out.hallazgo.n + '/5: ' + out.hallazgo.title : out.kind === 'recurso' ? 'RECURSO PARA EL EQUIPO' : '';
    const sfx = out.hallazgo ? 'achievement' : 'intel';
    if (role === myRole) { if (msg) Hud.floatText(msg, 'info'); snd(sfx); }
    else { const o = st.players[role].owner; if (o && o !== 'solo') Net.sendTo(o, 'phase', { note: msg, sfx }); }
  }
  function onInteract(role, poiId) { // solo host
    if (isClient() || !st || st.phase !== 'explore') return;
    const out = Story.poiInteract(st, role, poiId);
    if (!out || !out.ok) { if (role === myRole) Hud.floatText(WHY[out && out.reason] || 'No se puede', 'bad'); return; }
    syncPois(); fb(role, out); push();
  }
  function doChat(role, text) { text = String(text || '').slice(0, 300).trim(); if (!text) return; Story.say(st, role, text, 'chat'); react('chat', { from: role, text }); }
  function doShare(role, d) { const out = Story.share(st, role, d.cardId, { asIs: d.asIs !== false, text: d.text }); if (out && out.ok) { if (out.lie && role === myRole) Hud.floatText('Has compartido información falsa', 'bad'); if (out.react) react(out.react.trigger, out.react.ctx); } push(); }
  function doVote(role, optId) { const out = Story.vote(st, role, optId); if (out && out.react) react(out.react.trigger, out.react.ctx); push(); }
  function onChat(text) { if (isClient()) Net.send('chat', { text }); else doChat(myRole, text); }
  function onShare(cardId, o) { const d = { act: 'share', cardId, asIs: !o || o.asIs !== false, text: o && o.text }; if (isClient()) Net.send('poi', d); else doShare(myRole, d); }
  function onVote(optId) { if (isClient()) Net.send('vote', { optId }); else doVote(myRole, optId); }
  function onSecret(idx) { if (isClient()) Net.send('secret', { idx }); else { Story.secretPick(st, myRole, idx); push(); } }
  function onReady() { if (isClient()) Net.send('ready', { act: 'explore' }); else { Story.ready(st, myRole); push(); } }

  // ---------- Red ----------
  function wireNet() {
    if (!window.Net || !Net.available) return;
    const host = () => mode === 'host' && st;
    Net.on('input', (d, from) => { if (!host() || from === 'p0') return; const r = ownerRole(from); if (!r) return; eng.setBot(r, false); eng.setInput(r, st.phase === 'explore' ? d : ZERO); });
    Net.on('chat', (d, from) => { if (!host()) return; const r = ownerRole(d.from || from); if (r && r !== myRole && d.text) doChat(r, d.text); });
    Net.on('poi', (d, from) => { if (!host() || !d || d.act !== 'share') return; const r = ownerRole(from); if (r) doShare(r, d); });
    Net.on('vote', (d, from) => { if (!host()) return; const r = ownerRole(from); if (r) doVote(r, d.optId); });
    Net.on('secret', (d, from) => { if (!host()) return; const r = ownerRole(from); if (r) { Story.secretPick(st, r, d.idx); push(); } });
    Net.on('ready', (d, from) => { if (!host() || !d) return; if (d.act === 'intro') introReady[from] = 1; else if (d.act === 'explore') { const r = ownerRole(from); if (r) { Story.ready(st, r); push(); } } });
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
  wireNet(); UI.showMenu();
  if (/#sala=/.test(location.hash)) UI.showLobby({ mode: 'join' });
})();
