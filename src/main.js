// main.js: máquina de estados. Host = autoridad (motor + lógica); clientes solo renderizan snapshots y envían input/picks.
(function () {
  'use strict';
  const RK = ['guia', 'medica', 'ing'], ZERO = { left: 0, right: 0, jump: 0, interact: 0, up: 0, down: 0 };
  const CIN = ['linterna', 'agua', 'relampago', 'agua', 'linterna'];
  const SFX = { jump: 'jump', land: 'land', splash: 'water', swim: 'water', interact: 'blip', heal: 'blip', plank: 'click', rumble: 'thunder', switch: 'click', warp: 'flick' };
  const netOn = () => !!(window.Net && Net.role);
  const isClient = () => netOn() && Net.role === 'client';
  let st = null, eng = null, active = 'guia', myId = 'solo', rdPromise = null, chain = Promise.resolve(), lastRadio = '';
  const keys = {};

  const newState = () => ({ phase: 'cinematic', round: 1, s: { agua: 10, salud: 70, material: 60, confianza: 60 },
    players: { guia: { owner: null }, medica: { owner: null }, ing: { owner: null } },
    roundData: null, picks: {}, log: [], verdict: null, saved: null, note: '', radio: '', demo: !Story.hasKey(), noIntro: false });
  const humanRoles = () => RK.filter(r => st.players[r].owner);
  const mine = () => RK.filter(r => st.players[r].owner === myId);
  const bcast = () => { if (netOn() && !isClient()) Net.broadcast('state', st); };
  const setPhase = p => { st.phase = p; bcast(); enter(st); };

  // ---------- Motor ----------
  function makeEngine(authority) {
    if (eng) return;
    eng = Engine.create(UI.gameCanvas(), { assets: window.ASSETS, getState: () => st, authority, localId: active, water: 10,
      onInteract: (role, id) => { if (!isClient() && id === 'zone' + st.round) startDecision(); },
      onSfx: n => { if (SFX[n]) UI.sfx(SFX[n]); } });
    eng.start();
  }
  function applyOwners() { // los humanos no siguen a nadie: los controla su input
    RK.forEach(r => eng.setFollow(r, r !== active && (!st.players[r].owner || st.players[r].owner === myId)));
  }
  function claim(role, id) { // un humano toma un personaje (solo si no es de otro humano)
    const o = st.players[role].owner;
    if (id === 'solo') return true; // en solitario controlas los tres: no se suelta ninguno
    if (o && o !== id) return false;
    RK.forEach(r => { if (st.players[r].owner === id && r !== role) st.players[r].owner = null; });
    if (o !== id) { st.players[role].owner = id; bcast(); }
    return true;
  }

  // ---------- Entrada ----------
  const KEYMAP = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down',
    ' ': 'jump', z: 'jump', k: 'jump', f: 'interact', x: 'interact' };
  function pushInput() {
    if (!st || !eng) return;
    const inp = curInput();
    if (isClient()) Net.send('input', Object.assign({ role: active }, inp)); else eng.setInput(active, inp);
  }
  addEventListener('keydown', e => { if (/INPUT|TEXTAREA/.test(e.target.tagName)) return; const k = KEYMAP[e.key.length > 1 ? e.key : e.key.toLowerCase()]; if (k) { keys[k] = 1; if (st && st.phase === 'play') e.preventDefault(); pushInput(); } });
  addEventListener('keyup', e => { const k = KEYMAP[e.key.length > 1 ? e.key : e.key.toLowerCase()]; if (k) { keys[k] = 0; pushInput(); } });
  addEventListener('blur', () => Object.keys(keys).forEach(k => keys[k] = 0));
  const curInput = () => (st && st.phase === 'play') ? Object.assign({}, ZERO, keys) : ZERO;
  setInterval(() => {
    pushInput(); if (st && eng && !isClient() && netOn()) Net.broadcast('snapshot', eng.snapshot());
  }, 50);

  UI.onSwitch(role => {
    if (!st || !eng || st.phase === 'decide') return;
    active = role; UI.setActive(role); eng.setActive(role);
    if (isClient()) Net.send('input', Object.assign({ role }, ZERO));
    else { claim(role, myId); applyOwners(); }
  });

  // ---------- Host: lógica de partida ----------
  function prepareRound() {
    rdPromise = (st.demo ? Promise.resolve(Story.demoRound(st.round, st)) : Story.askRound(st))
      .then(rd => { st.roundData = rd; if (rd._fallback) st.note = 'La IA falló: ronda pregrabada.'; });
    Story.npcLine(st).then(t => { st.radio = t; bcast(); enter(st); }).catch(() => { });
  }
  async function startDecision() {
    if (st.phase !== 'play') return;
    st.phase = 'wait'; // evita doble disparo mientras llega la ronda
    UI.toast('El director prepara la decisión…');
    await rdPromise;
    st.picks = {}; setPhase('decide');
  }
  function onPick(d, from) {
    if (isClient() || !st || st.phase !== 'decide' || !RK.includes(d.role)) return;
    if (st.players[d.role].owner !== from || !Number.isInteger(d.idx)) return;
    st.picks[d.role] = d.idx;
    if (humanRoles().every(r => Number.isInteger(st.picks[r]))) resolveRound();
  }
  async function resolveRound() {
    st.phase = 'resolve-wait';
    Story.resolve(st); eng.setWater(st.s.agua);
    st.lastDelta = st.log[st.log.length - 1];
    setPhase('resolve');
  }
  async function afterResolve() { // host, tras la cinemática de transición
    if (Story.isOver(st)) {
      st.saved = Story.saved(st); st.verdict = await Story.verdict(st); return setPhase('final');
    }
    st.round++; st.roundData = null; st.picks = {}; st.radio = '';
    eng.gather(st.round); eng.pan(st.round); prepareRound(); setPhase('play');
  }

  // ---------- Entrada de fase (host y clientes) ----------
  function enter(s) { chain = chain.then(() => run(s)).catch(e => console.error(e)); }
  async function run(s) {
    if (s.radio && s.radio !== lastRadio) { lastRadio = s.radio; UI.say(s.radio, 'Lía'); }
    if (s.phase === 'cinematic') {
      if (s._seen === 'cinematic') return; s._seen = 'cinematic';
      if (!s.noIntro) await UI.playCinematic('intro');
      UI.updateHud(s); if (!isClient()) { prepareRound(); setPhase('play'); UI.toast('Flechas/WASD mover · Espacio saltar · F interactuar · Tab cambiar de personaje'); }
    } else if (s.phase === 'play') { UI.hideDecision(); UI.updateHud(s); if (s.note) { UI.toast(s.note); s.note = ''; } }
    else if (s.phase === 'decide') {
      const roles = RK.filter(r => s.players[r].owner === myId);
      UI.updateHud(s);
      await new Promise(done => { if (!roles.length) return done(); UI.decide(s, (role, idx) => { if (netOn()) Net.send('pick', { role, idx }); else onPick({ role, idx }, myId); }, done, roles); });
    } else if (s.phase === 'resolve') {
      UI.updateHud(s); const d = s.lastDelta && s.lastDelta.delta;
      if (d) UI.toast(Object.keys(d).map(k => Story.STATS[k][0] + ' ' + (d[k] > 0 ? '+' : '') + d[k]).join(' · '));
      await UI.playCinematic(CIN[(s.round - 1) % CIN.length], { round: s.round });
      if (!isClient()) await afterResolve();
    } else if (s.phase === 'final') { UI.showFinal(s); }
  }

  // ---------- Red ----------
  function wireNet() {
    if (!window.Net || !Net.available) return;
    Net.on('input', (d, from) => { // host
      if (isClient() || !st || !eng || !RK.includes(d.role)) return;
      if (from === 'p0') return; // el host usa su teclado local
      if (!claim(d.role, from)) return;
      eng.setFollow(d.role, false); eng.setInput(d.role, st.phase === 'play' ? d : ZERO);
    });
    Net.on('pick', (d, from) => onPick(d, from));
    Net.on('players', () => { // host: quien se va pasa a bot
      if (isClient() || !st) return;
      let ch = false; const live = Net.players.filter(p => !p.bot && p.connected !== false).map(p => p.id);
      RK.forEach(r => { const o = st.players[r].owner; if (o && o !== 'solo' && !live.includes(o)) { st.players[r].owner = null; if (eng) eng.setFollow(r, r !== active); ch = true; } });
      if (ch) { bcast(); if (st.phase === 'decide' && humanRoles().every(r => Number.isInteger(st.picks[r]))) resolveRound(); }
    });
    Net.on('state', s => { // cliente
      if (!isClient()) return;
      if (!st) beginClient(s);
      st = s; enter(s);
    });
    Net.on('snapshot', s => { if (isClient() && eng) eng.applySnapshot(s); });
    Net.on('leave', d => { if (d && d.host) UI.toast('El anfitrión se ha ido. Volviendo al inicio…'), setTimeout(() => location.reload(), 2500); });
  }
  function beginClient(s) {
    myId = Net.localId; UI.setLocalId(myId);
    const me = Net.players.find(p => p.id === myId); active = (me && me.role) || RK.find(r => s.players[r].owner === myId) || 'medica';
    makeEngine(false); UI.setActive(active); eng.setActive(active); UI.showGame();
  }

  // ---------- Arranque ----------
  function begin(o) {
    if (isClient()) return;
    st = newState(); active = o.role || 'guia'; st.noIntro = !!o.noIntro;
    if (netOn() && Net.isHost() && !o.solo) {
      myId = Net.localId; Net.lock(true);
      Net.players.forEach(p => { if (!p.bot && p.role && RK.includes(p.role)) st.players[p.role].owner = p.id; });
    } else { myId = 'solo'; RK.forEach(r => st.players[r].owner = 'solo'); }
    UI.setLocalId(myId); UI.setActive(active);
    makeEngine(true); eng.resetGates(); eng.setWater(st.s.agua); eng.gather(1); eng.setActive(active); applyOwners(); UI.showGame();
    bcast(); enter(st);
  }
  UI.on('start', o => begin(o || {}));
  UI.on('restart', () => {
    if (isClient()) return UI.toast('Solo el anfitrión puede reiniciar.');
    if (!st) return;
    const solo = myId === 'solo', owners = RK.map(r => st.players[r].owner);
    begin({ role: active, solo, noIntro: true });
    if (!solo) RK.forEach((r, i) => st.players[r].owner = owners[i]);
  });
  UI.on('menu', () => location.reload());
  window.RC = { st: () => st, eng: () => eng, decide: startDecision }; // gancho para pruebas
  wireNet(); UI.showTitle(); if (/#sala=/.test(location.hash)) UI.showLobby(); // enlace de invitación: directo al lobby con el código puesto
})();
