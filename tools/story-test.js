// node tools/story-test.js  (sin DOM)
const assert = require('assert');
const Story = require('../src/story.js');
const RK = Object.keys(Story.ROLES), ST = Object.keys(Story.STATS);
const fresh = () => ({ round: 1, s: { agua: 10, salud: 70, material: 60, confianza: 60 }, log: [], picks: {}, roundData: null });
const allowed = (rd, k, s) => rd.options[k].map((op, i) => i).filter(i => !rd.options[k][i].req || Object.keys(rd.options[k][i].req).every(x => s[x] >= rd.options[k][i].req[x]));

// 1) estructura de demoRound
for (let r = 1; r <= 5; r++) {
  const rd = Story.demoRound(r, fresh());
  assert(typeof rd.scene === 'string' && rd.scene.length > 30);
  RK.forEach(k => { assert(typeof rd.private[k] === 'string'); assert(rd.options[k].length === 3);
    rd.options[k].forEach(op => ST.forEach(s => assert(Number.isInteger(op.effects[s]) && Math.abs(op.effects[s]) <= Story.LIM))); });
  assert(Story.validRound(JSON.parse(JSON.stringify(rd))), 'demo no pasa validRound r' + r);
  assert(Story.dialogue(r).length >= 3);
}
assert(Story.intro.length >= 6 && Story.intro.length <= 8);
assert(Story.demoRound(3).scene, 'demoRound sin estado');

// 2) ramificación real
const a = fresh(), b = fresh();
b.log.push({ r: 1, scene: 'x', picks: [{ role: 'guia', tag: 'g_oculta', text: 't', score: 0 }, { role: 'ing', tag: 'i_oculta', text: 't', score: 0 }], delta: {} });
const r2a = Story.demoRound(2, a), r2b = Story.demoRound(2, b);
assert(r2a.scene !== r2b.scene && r2a.private.guia !== r2b.private.guia && r2a.options.guia[2].text !== r2b.options.guia[2].text, 'sin ramificación');
const low = fresh(); low.s.material = 10;
assert(Story.demoRound(4, low).options.ing[2].req.material, 'falta req');

// 3) validRound rechaza basura y trampas
const good = JSON.parse(JSON.stringify(Story.demoRound(1, fresh())));
const mut = f => { const x = JSON.parse(JSON.stringify(good)); f(x); return x; };
[x => { x.options.guia.pop(); }, x => { x.options.ing[0].effects.agua = 99; }, x => { x.options.ing[0].effects.agua = 'a'; }, x => { delete x.private.medica; },
 x => { x.options.guia[0].effects = { agua: -5, salud: 20, material: 5, confianza: 20 }; }].forEach((f, i) =>
  assert.throws(() => Story.validRound(mut(f)), undefined, 'debía rechazar caso ' + i));

// 4) resolve: aplica picks, clamp, log, bots rellenan
const t = fresh(); t.roundData = Story.demoRound(1, t); t.picks = { guia: 0 };
const before = { ...t.s }, d = Story.resolve(t);
assert(t.log.length === 1 && t.log[0].picks.length === 3 && ST.every(s => t.s[s] === before[s] + d[s]));
const ex = fresh(); ex.round = 5; ex.s = { agua: 99, salud: 2, material: 0, confianza: 100 }; ex.roundData = Story.demoRound(5, ex); Story.resolve(ex);
ST.forEach(s => assert(ex.s[s] >= 0 && ex.s[s] <= 100));
assert(Story.isOver(ex));
// botPick respeta req
const bp = fresh(); bp.s.material = 0; bp.roundData = Story.demoRound(4, bp);
for (let i = 0; i < 100; i++) assert(!bp.roundData.options.ing[Story.botPick('ing', bp)].req, 'bot eligió opción bloqueada');

// 5) askRound sin clave y con fetch simulado (2 intentos + caída a demo)
(async () => {
  const st = fresh(); st.round = 2; st.roundData = null;
  assert((await Story.askRound(st))._fallback, 'sin clave debe caer a demo');
  Story.setKey('k'); let n = 0;
  global.fetch = async () => ({ ok: true, json: async () => ({ content: [{ text: n++ ? JSON.stringify(good) : '{"scene":"mal"}' }] }) });
  const ok = await Story.askRound(st); assert(!ok._fallback && n === 2, 'segundo intento');
  global.fetch = async () => { throw new Error('red'); };
  assert((await Story.askRound(st))._fallback, 'fallo de red -> demo');
  assert(typeof (await Story.verdict(st)) === 'string');
  Story.setKey('');

  // 6) 200 partidas aleatorias
  let wins = 0, wb = 0, N = 200;
  const play = pick => { const g = fresh(); for (let r = 1; r <= 5; r++) { g.round = r; g.roundData = Story.demoRound(r, g); g.picks = {};
      RK.forEach(k => g.picks[k] = pick(k, g)); Story.resolve(g);
      ST.forEach(s => assert(Number.isInteger(g.s[s]) && g.s[s] >= 0 && g.s[s] <= 100, 'estado fuera de rango'));
      if (Story.isOver(g)) break; } return Story.saved(g); };
  for (let i = 0; i < N; i++) { if (play((k, g) => { const al = allowed(g.roundData, k, g.s); return al[Math.floor(Math.random() * al.length)]; })) wins++;
    if (play((k, g) => Story.botPick(k, g))) wb++; }
  console.log('victorias aleatorios:', wins + '/' + N, ' con botPick:', wb + '/' + N);
  assert(wins / N >= 0.3 && wins / N <= 0.7, 'tasa de victoria fuera de 30-70%: ' + wins / N);
  console.log('OK');
})().catch(e => { console.error(e); process.exit(1); });
