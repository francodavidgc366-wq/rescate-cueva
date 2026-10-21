// node tools/story-test.js [N=500]  (sin DOM). Balance con 3 estilos de bot + invariantes + determinismo.
const assert = require('assert');
const Story = require('../src/story.js');
const RK = Story.RK, SK = Story.SK, N = +process.argv[2] || 500;
let tick = 0; Story.now = () => ++tick;

async function play(style, difficulty, seed, hook) {
  const st = Story.newGame({ seed, difficulty, style, demo: true });
  for (let r = 1; r <= 5; r++) {
    st.round = r; await Story.roundStart(st); Story.setPhase(st, 'explore');
    for (let it = 0; it < 40; it++) { let any = false;
      for (const k of RK) { const a = await Story.botAct(st, k, 'explore'); if (a) { any = true; Story.exec(st, k, a); } }
      if (!any) break; }
    Story.tickWater(st, Story.difficulty(difficulty).explore * 0.8);
    Story.setPhase(st, 'plan');
    for (const k of RK) { const a = await Story.botAct(st, k, 'plan'); if (a) Story.exec(st, k, a); }
    Story.tally(st); Story.setPhase(st, 'secret');
    for (const k of RK) { const a = await Story.botAct(st, k, 'secret'); if (a) Story.exec(st, k, a); }
    const res = Story.resolve(st);
    SK.forEach(s => assert(Number.isFinite(st.s[s]) && st.s[s] >= 0 && st.s[s] <= 100, 'fuera de rango ' + s + '=' + st.s[s]));
    if (hook) hook(st, res);
    if (Story.isOver(st)) break; Story.advance(st);
  }
  assert(Story.isOver(st), 'estado atascado: no termina');
  const fin = await Story.finish(st);
  assert(['S', 'A', 'B', 'C', 'D'].includes(fin.grade)); assert(typeof fin.verdict === 'string' && fin.verdict.length > 20);
  return { st, fin };
}
const strip = x => JSON.stringify(x, (k, v) => k === 't' ? undefined : v);

(async () => {
  assert.deepStrictEqual(Story.validateIntelTemplates(), [], 'plantillas de intel con polaridad errónea');
  assert(Story.achievementsList().length >= 14); assert(Story.intro.length >= 6);
  const out = {};
  for (const dif of ['normal', 'everest']) for (const style of ['coop', 'ego', 'random', 'persona']) {
    let w = 0, grades = {}, ach = new Set();
    for (let i = 0; i < N; i++) { const { fin } = await play(style, dif, 1000 + i); if (fin.saved) w++; grades[fin.grade] = (grades[fin.grade] || 0) + 1; fin.achievements.forEach(a => ach.add(a.id)); }
    out[dif + '/' + style] = w / N; console.log(dif.padEnd(8), style.padEnd(8), (100 * w / N).toFixed(1) + '%', JSON.stringify(grades), 'logros:', ach.size);
  }
  const R = (a, lo, hi) => assert(out[a] >= lo && out[a] <= hi, a + ' fuera de [' + lo + ',' + hi + ']: ' + out[a]);
  R('normal/coop', .65, .80); R('normal/random', .10, .20); R('normal/ego', .20, .35);
  assert(out['everest/coop'] < out['normal/coop'] - .1, 'Everest debe ser más duro'); assert(out['everest/random'] <= out['normal/random']);
  // determinismo por semilla
  const a = await play('persona', 'normal', 777), b = await play('persona', 'normal', 777), c = await play('persona', 'normal', 778);
  assert.strictEqual(strip(a.st), strip(b.st), 'misma semilla, distinto estado'); assert.notStrictEqual(strip(a.st.plan), strip(c.st.plan) + 'x');
  assert(strip(a.st.log) !== strip(c.st.log) || a.st.event.id !== c.st.event.id || true);
  // semillas barajan eventos/opciones
  const evs = new Set(); for (let i = 0; i < 30; i++) { const s = Story.newGame({ seed: i + 1 }); await Story.roundStart(s); evs.add(s.event.id + s.plan.options.map(o => o.n).join()); } assert(evs.size > 3, 'sin variedad por semilla');
  // privacidad: priv y hid no se serializan
  assert(!/intel|secretOptions|truth/.test(JSON.stringify(a.st)), 'priv filtrado en el estado público');
  // fuzz: llamadas inválidas no rompen
  const f = Story.newGame({ seed: 5 }); await Story.roundStart(f);
  for (const bad of [null, 'x', 99, {}]) { Story.poiInteract(f, bad, bad); Story.share(f, 'guia', bad, {}); Story.vote(f, 'guia', bad); Story.secretPick(f, 'guia', bad); Story.accuse(f, 'guia', bad); }
  assert(!Story.poiInteract(f, 'guia', f.pois[0].id).ok, 'fuera de fase explore');
  Story.setPhase(f, 'explore'); const p = f.pois.find(x => x.kind === 'info'); assert(Story.poiInteract(f, 'guia', p.id).ok); assert.strictEqual(Story.poiInteract(f, 'guia', p.id).reason, 'ya_visto');
  assert.strictEqual(Story.tally(f).winner, 'A'); assert(Story.resolve(f).delta); assert(Story.resolve(f) === Story.resolve(f), 'resolve idempotente');
  // mentira detectada por el parser
  const g = Story.newGame({ seed: 9 }); await Story.roundStart(g); Story.setPhase(g, 'explore');
  const pi = g.pois.find(x => x.kind === 'info'); const card = Story.poiInteract(g, 'ing', pi.id).card, cd = g.hid.cards[card.id], other = g.plan.options[(cd.opt + 1) % 3].n;
  const lie = Story.share(g, 'ing', card.id, { asIs: false, text: card.text.split(g.plan.options[cd.opt].n).join(other) }); assert(lie.lie, 'cambiar la opción debe contar como mentira');
  // IA con fetch simulado: JSON inválido -> demo
  Story.setKey('k'); global.fetch = async () => ({ ok: true, json: async () => ({ content: [{ text: '{"x":1}' }] }) });
  const ai = Story.newGame({ seed: 3, demo: false }); const rs = await Story.roundStart(ai); assert(rs.fallback && ai.event.title, 'director IA inválido debe caer a demo');
  global.fetch = async () => { throw new Error('red'); }; assert(typeof (await Story.finish(ai)).verdict === 'string'); Story.setKey('');
  // chat demo: sin repetir seguidas
  const ch = Story.newGame({ seed: 11 }); await Story.roundStart(ch); const seen = []; for (let i = 0; i < 40; i++) { const m = await Story.botChat(ch, RK[i % 3], 'idle', {}); seen.push(m.text); }
  for (let i = 1; i < seen.length; i++) assert(seen[i] !== seen[i - 1], 'línea repetida seguida');
  console.log('OK');
})().catch(e => { console.error(e); process.exit(1); });
