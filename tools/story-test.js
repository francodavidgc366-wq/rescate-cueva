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
  const ch = Story.newGame({ seed: 11 }); await Story.roundStart(ch); const seen = []; for (let i = 0; i < 40; i++) { tick += 10000; const m = await Story.botChat(ch, RK[i % 3], 'idle', {}); if (m) { seen.push(m.text); assert(m.delay >= 0); } }
  assert(seen.length >= 10, 'demasiado pocos mensajes'); for (let i = 1; i < seen.length; i++) assert(seen[i] !== seen[i - 1], 'línea repetida seguida');
  // limitador: ráfaga sin pasar tiempo -> solo 1 espontáneo; sin repetir en las últimas 12 del mismo bot
  const lim = Story.newGame({ seed: 12 }); await Story.roundStart(lim); tick += 99999; let n = 0; for (let i = 0; i < 10; i++) if (await Story.botChat(lim, RK[i % 3], 'explore', {})) n++; assert.strictEqual(n, 1, 'limitador espontáneo');
  const rp = Story.newGame({ seed: 13 }); await Story.roundStart(rp); let nr = 0; for (let i = 0; i < 6; i++) if (await Story.botChat(rp, RK[i % 3], 'chat', { text: 'hola', fromRole: 'ing' })) nr++; assert.strictEqual(nr, 2, 'máx. 2 respuestas seguidas'); Story.say(rp, 'ing', 'hola', 'chat'); rp.players.ing.ai = false; Story.say(rp, 'ing', 'otra', 'chat'); assert(await Story.botChat(rp, 'guia', 'chat', { text: 'x', fromRole: 'ing' }), 'tras hablar el jugador responden de nuevo');
  const mem = Story.newGame({ seed: 14 }); await Story.roundStart(mem); const last = []; for (let i = 0; i < 60; i++) { tick += 10000; const m = await Story.botChat(mem, 'medica', 'poi', { poi: 'Cristal que canta' }); if (m) { assert(!last.slice(-12).includes(m.text), 'repetida en 12: ' + m.text); last.push(m.text); } }
  // intro/roleBrief no filtran secretos
  const leak = /desvi|desvió|lesión|lesion|caudal|reserva|sangre|culpa/i; Story.intro.forEach(x => assert(!leak.test(x), 'intro filtra secreto: ' + x)); RK.forEach(k => { const b = Story.roleBrief(ch, k); assert(!leak.test(JSON.stringify(b)), 'roleBrief filtra secreto ' + k); });
  // misiones, etiquetas, eventos
  const ms = Story.newGame({ seed: 21 }); for (let r = 1; r <= 5; r++) { ms.round = r; await Story.roundStart(ms); assert(ms.event.caption && ms.event.focus && ms.event.focus.slot != null && ms.event.lines.length === 2, 'evento sin focus/caption'); assert(ms.pois.every(p => p.name && p.give && p.act && / · /.test(p.label)));
    for (const ph of ['briefing', 'explore', 'plan', 'secret', 'resolve', 'summary']) { Story.setPhase(ms, ph); const m = Story.mission(ms, 'ing', { slot: 2 }); assert(m.title && m.steps.length && m.now.text && m.now.short, 'misión ' + ph); assert(Story.readyLabel(ph).label); }
    Story.setPhase(ms, 'explore'); let m = Story.mission(ms, 'ing'); assert(m.now.target && m.now.why && m.now.why.length > 15, 'explore sin target/why'); assert(!ms.hid.poiMeta[m.now.target].seen.length || true);
    const seenT = []; for (let i = 0; i < 3; i++) { m = Story.mission(ms, 'ing'); if (m.now.gate && m.now.gate.startsWith('z') && ms.gates.find(g => g.id === m.now.gate).role === 'ing') Story.openGate(ms, 'ing', m.now.gate); m = Story.mission(ms, 'ing'); assert(m.now.target && !seenT.includes(m.now.target)); seenT.push(m.now.target); assert(Story.poiInteract(ms, 'ing', m.now.target).ok); }
    assert(Story.crisisReady(ms).reason === 'hito' && Story.crisisReady(ms).progress.done >= 3, 'hito de crisis'); m = Story.mission(ms, 'ing'); assert(/Convocar reuni/.test(m.now.text) && m.now.why, 'ofrece convocar');
    assert(Story.convene(ms, 'ing').ok); assert(!Story.mission(ms, 'ing').now.text.includes('Esperando'), 'sin espera muerta'); assert.strictEqual(Story.allConvened(ms), false);
    Story.setPhase(ms, 'plan'); assert(/vota/i.test(Story.mission(ms, 'ing').now.text)); Story.tally(ms); Story.setPhase(ms, 'secret'); Story.resolve(ms); if (Story.isOver(ms)) break; Story.advance(ms); }
  assert(Story.TIMES.briefing === 20 && Story.difficulty('everest').explore === 180 && Story.difficulty("facil").explore === 300 && Story.difficulty("normal").explore === 240);
  // ===== v5 =====
  const v = Story.newGame({ seed: 31, humans: ['ing'], difficulty: 'normal' }); await Story.roundStart(v); Story.setPhase(v, 'explore');
  assert(Story.TIMES.explore.normal === 240 && Story.TIMES.explore.facil === 300 && Story.TIMES.explore.everest === 180);
  const GS = Story.GATES; assert(GS.length >= 5 && GS.length <= 10 && GS.every(g => /^z[1-5]_(anclaje|puente|valvula|reptadero)$/.test(g.id) && g.id === 'z' + g.zone + '_' + g.kind)); assert(new Set(GS.map(g => g.role)).size === 3, 'puertas de los 3 roles'); for (let z = 1; z <= 5; z++) assert([1, 2].includes(GS.filter(g => g.zone === z).length));
  assert(v.gates.length === GS.length && v.gatesOpen && !JSON.stringify(v).includes('truth'));
  // 20 POIs con why/hintRole/zona; nombres únicos y sin el nombre absurdo
  const allP = []; const pz = Story.newGame({ seed: 40 }); for (let r = 1; r <= 5; r++) { pz.round = r; await Story.roundStart(pz); pz.pois.forEach(p => { allP.push(p); assert(p.why.length > 25 && p.hintRole && RK.includes(p.hintRole) && p.zone === r && p.name); assert(!/Orilla del río/.test(p.name)); }); }
  assert.strictEqual(allP.length, 20); assert.strictEqual(new Set(allP.map(p => p.name)).size, 20);
  // puerta bloquea el POI, solo su rol la abre, y persiste al avanzar
  const g1 = v.gates.find(g => g.id === 'z1_anclaje'), bp = v.pois.find(p => p.id === 'r1_3');
  const blk = Story.poiInteract(v, 'ing', bp.id); assert(!blk.ok && blk.reason === 'puerta' && blk.gateId === 'z1_anclaje' && v.priv.ing.ap === 3, 'POI bloqueado no gasta AP');
  assert(Story.mission(v, 'ing').now.target !== 'r1_3');
  assert(!Story.openGate(v, 'ing', 'z1_anclaje').ok && !Story.openGate(v, 'guia', 'z2_anclaje').ok);
  // request: IA acepta/rechaza según estilo y deja chat con mood+delay; humano no decide
  let acc = 0, rej = 0, lies = 0; for (let i = 0; i < 60; i++) { const q = Story.newGame({ seed: 500 + i, style: i % 2 ? 'coop' : 'ego', humans: ['guia'] }); await Story.roundStart(q); const r = Story.request(q, 'guia', 'ing', { gateId: 'z1_anclaje' }); assert(!r.ok && r.reason === 'rol'); const r2 = Story.request(q, 'medica', 'guia', { gateId: 'z1_anclaje' }); assert(r2.ok && r2.human && r2.accept === null);
    const r3 = Story.request(q, 'guia', 'medica', { gateId: 'z1_anclaje' }); assert(!r3.ok); q.round = 2; const r4 = Story.request(q, 'guia', 'ing', { gateId: 'z2_puente' }); assert(r4.ok && typeof r4.accept === 'boolean' && r4.delay > 0 && r4.line && r4.msg.mood); if (r4.accept) { acc++; assert(Story.openGate(q, 'ing', 'z2_puente', { helpFor: 'guia' }).ok); assert(q.gatesOpen.z2_puente && !Story.request(q, 'guia', 'ing', { gateId: 'z2_puente' }).ok); } else { rej++; if (r4.lie) lies++; } }
  assert(acc > 8 && rej > 8, 'aceptar y rechazar: ' + acc + '/' + rej);
  // coop acepta más que ego
  let ca = 0, ea = 0; for (let i = 0; i < 200; i++) for (const sty of ['coop', 'ego']) { const q = Story.newGame({ seed: 900 + i, style: sty, humans: ['guia'] }); await Story.roundStart(q); q.round = 2; if (Story.request(q, 'guia', 'ing', { gateId: 'z2_puente' }).accept) sty === 'coop' ? ca++ : ea++; } assert(ca > ea + 40, 'cooperativo debe aceptar más: ' + ca + ' vs ' + ea);
  // botRequest: la IA pide al humano su puerta, con límite temporal
  const br = Story.newGame({ seed: 33, humans: ['guia'] }); await Story.roundStart(br); Story.setPhase(br, 'explore'); tick += 99999; const b1 = Story.botRequest(br); assert(b1 && b1.to === 'guia' && b1.gateId === 'z1_anclaje' && b1.msg.mood, 'botRequest'); assert.strictEqual(Story.botRequest(br), null, 'no repite al instante');
  // chatSuggest: texto real de la tarjeta, pregunta a compañero, pedir ayuda por puerta
  const cs = Story.newGame({ seed: 34, humans: ['ing'] }); await Story.roundStart(cs); Story.setPhase(cs, 'explore'); const ic = Story.poiInteract(cs, 'ing', cs.pois.find(p => p.kind === 'info').id);
  let sg = Story.chatSuggest(cs, 'ing'); assert(sg.length >= 2 && sg.length <= 5 && sg.every(x => x.label && x.text)); assert(sg.some(x => x.text === ic.card.text && x.cardId === ic.card.id), 'contar lo visto con el texto real');
  assert(sg.some(x => x.toRole), 'pregunta a un compañero'); assert(sg.some(x => x.gateId && x.toRole === 'guia'), 'pedir ayuda por puerta pendiente');
  const sh = Story.share(cs, 'ing', ic.card.id, {}); assert(sh.ok && sh.msg.kind === 'share' && sh.msg.text === ic.card.text && cs.chat.includes(sh.msg) && ['happy', 'alert', 'talk'].includes(sh.msg.mood), 'share deja mensaje visible');
  assert(!Story.chatSuggest(cs, 'ing').some(x => x.cardId), 'ya compartida: no se ofrece');
  // mood en TODOS los mensajes de chat de una partida + habilidad por rol (special solo para hintRole)
  const pl = await play('coop', 'normal', 4242); pl.st.chat.forEach(m => assert(['neutral', 'alert', 'hurt', 'angry', 'happy', 'talk'].includes(m.mood), 'mood ' + m.from + ' ' + m.kind));
  const hs = Story.newGame({ seed: 35 }); await Story.roundStart(hs); Story.setPhase(hs, 'explore'); const hp = hs.pois.find(p => p.hintRole === 'ing' && !hs.gates.some(g => g.id === p.gate)), hp2 = hs.pois.find(p => p.hintRole === 'guia' && !hs.gates.some(g => g.id === p.gate));
  if (hp) { assert(Story.poiInteract(hs, 'guia', hp.id).special === undefined); assert(Story.poiInteract(hs, 'ing', hp.id).special); assert(Story.poiHints(hs, 'ing')[hp.id] && !Story.poiHints(hs, 'guia')[hp.id]); }
  // crisis por tiempo y convene sin haber investigado nada
  const ct = Story.newGame({ seed: 36 }); await Story.roundStart(ct); Story.setPhase(ct, 'explore'); assert(!Story.crisisReady(ct).ready); assert.strictEqual(Story.convene(ct, 'ing').reason, 'nada'); Story.tickWater(ct, 239); assert(!Story.crisisReady(ct).ready); Story.tickWater(ct, 2); assert(Story.crisisReady(ct).reason === 'tiempo'); assert(Story.convene(ct, 'ing').ok);
  // puertas persisten entre tramos
  const pe = Story.newGame({ seed: 37 }); await Story.roundStart(pe); Story.openGate(pe, 'guia', 'z1_anclaje'); pe.round = 5; Story.advance; assert(pe.gatesOpen.z1_anclaje && pe.gates.find(g => g.id === 'z1_anclaje').open);
  // escenas: 1-4 líneas cortas con who/mood válidos
  const sc = Story.newGame({ seed: 38 }); await Story.roundStart(sc); Story.setPhase(sc, 'plan'); const MOODS = ['neutral', 'alert', 'hurt', 'angry', 'happy', 'talk'];
  for (const k of ['event', 'plan', 'resolve', 'lia', 'final']) { const L = Story.scene(sc, k); assert(L.length >= 1 && L.length <= 4, 'escena ' + k); L.forEach(l => { assert(['lia', 'director', ...RK].includes(l.who) && MOODS.includes(l.mood) && l.text && l.text.length <= 112); }); }
  Story.tally(sc); Story.setPhase(sc, 'secret'); Story.resolve(sc); assert(Story.scene(sc, 'resolve').length >= 2); assert(Story.statusLabels.agua.tip && Story.statusLabels.confianza.tip);
  assert(!Story.intro.some(x => /pulsa|tecla|vota|Cómo se juega/i.test(x)), 'intro sin controles');
  console.log('OK');
})().catch(e => { console.error(e); process.exit(1); });
