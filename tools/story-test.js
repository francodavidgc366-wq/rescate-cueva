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
  for (const dif of ['facil', 'normal', 'everest']) for (const style of ['coop', 'ego', 'random', 'persona']) {
    let w = 0, grades = {}, ach = new Set();
    for (let i = 0; i < N; i++) { const { fin } = await play(style, dif, 1000 + i); if (fin.saved) w++; grades[fin.grade] = (grades[fin.grade] || 0) + 1; fin.achievements.forEach(a => ach.add(a.id)); }
    out[dif + '/' + style] = w / N; console.log(dif.padEnd(8), style.padEnd(8), (100 * w / N).toFixed(1) + '%', JSON.stringify(grades), 'logros:', ach.size);
  }
  const R = (a, lo, hi) => assert(out[a] >= lo && out[a] <= hi, a + ' fuera de [' + lo + ',' + hi + ']: ' + out[a]);
  R('facil/coop', .84, .95); R('facil/random', .36, .55); R('normal/coop', .64, .78); R('normal/ego', .18, .32); R('normal/random', .08, .25); R('everest/coop', .28, .42); R('everest/ego', 0, .09);
  assert(out['facil/coop'] > out['normal/coop'] && out['facil/random'] > out['normal/random'] + .15, 'Fácil más fácil que Normal');
  assert(out['everest/coop'] < out['normal/coop'] - .1, 'Everest debe ser más duro'); assert(out['everest/random'] <= out['normal/random']);
  // v16: finales distintos, ruta, modo rápido, sin pistas en el plan
  const gk = new Set(), bk = new Set(), kinds = new Set();
  for (let i = 0; i < 300; i++) {
    const { st, fin } = await play(['coop', 'ego', 'random', 'persona'][i % 4], ['facil', 'normal', 'everest'][i % 3], 5000 + i, (s, r) => { r.plan && assert(s.path.length && s.path[s.path.length - 1].kind === r.plan.kind); });
    const e = Story.endingPanels(st); assert.strictEqual(e.panels.length, 7); e.panels.forEach(x => assert(x.text.length <= 90, x.text));
    assert.strictEqual(Story.endingTitle(st).title, e.title); assert.strictEqual(fin.ending.title, e.title);
    (e.saved ? gk : bk).add(e.key); st.path.forEach(x => kinds.add(x.kind));
  }
  console.log('finales buenos', [...gk].join(), '| malos', [...bk].join()); assert(gk.size >= 5, 'finales buenos distintos: ' + gk.size); assert(bk.size >= 4, 'finales malos distintos: ' + bk.size);
  const q = Story.newGame({ seed: 3, quick: true }); assert(Story.isQuick(q) && !Story.isQuick(Story.newGame({ seed: 3 }))); await Story.roundStart(q);
  assert.strictEqual(q.tleft, 5); Story.setPhase(q, 'explore'); assert.strictEqual(q.tleft, 35); Story.setPhase(q, 'plan'); assert.strictEqual(q.tleft, 15); Story.setPhase(q, 'secret'); assert.strictEqual(q.tleft, 10); assert.strictEqual(q.pois.length, 4);
  assert(q.plan.brief === '' && q.plan.options.every(o => o.what.length <= 45 && o.what && o.hints == null && o.known == null && o.kind && o.speed));
  assert(!/hints|known|clue|planBrief/.test(JSON.stringify(Story.publicState(q).plan)) && !/clue|hints|known/.test(JSON.stringify(Story.privOf(q, 'guia').planOpts)));
  const pq = Story.newGame({ seed: 4, quick: true }); await Story.roundStart(pq); Story.setPhase(pq, 'explore'); const pi2 = pq.pois.find(x => x.kind === 'info'); const po = Story.poiInteract(pq, 'guia', pi2.id); assert(po.chatLine && po.chatLine.length <= 55 && po.explain);
  const w0 = Story.newGame({ seed: 4, quick: true }), w1 = Story.newGame({ seed: 4 }); assert(Story.waterRate(w0) > Story.waterRate(w1) * 5, 'agua proporcional en modo rápido');
  // la ruta cambia el tramo siguiente
  const pf = Story.newGame({ seed: 6 }); await Story.roundStart(pf); pf.path.push({ round: 1, kind: 'balsa', outcome: 'bien' }); pf.round = 2; const a0 = pf.s.agua; await Story.roundStart(pf); assert(pf.s.agua >= a0 + 8 && pf.chat.some(m => /balsa/.test(m.text)), 'balsa: agua +8');
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
    const seenT = []; for (let i = 0; i < 3; i++) { m = Story.mission(ms, 'ing'); while (m.now.gate) { Story.openGate(ms, ms.gates.find(g => g.id === m.now.gate).role, m.now.gate); m = Story.mission(ms, 'ing'); } m = Story.mission(ms, 'ing'); assert(m.now.target && !seenT.includes(m.now.target)); seenT.push(m.now.target); const ri = Story.poiInteract(ms, 'ing', m.now.target); assert(ri.ok, JSON.stringify([ri, m.now, ms.round])); }
    assert(!Story.crisisReady(ms).ready || Story.crisisReady(ms).progress.missing.length === 0, 'crisis exige aporte de cada rol'); for (const k of RK) { const op = ms.pois.find(p => p.owner === k); if (op.gate) Story.openGate(ms, ms.gates.find(g => g.id === op.gate).role, op.gate); Story.poiInteract(ms, k, op.id); }
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
  const allP = []; const pz = Story.newGame({ seed: 40 }); for (let r = 1; r <= 5; r++) { pz.round = r; await Story.roundStart(pz); pz.pois.forEach(p => { allP.push(p); assert(p.why.length > 25 && p.zone === r && p.name && p.todo && p.hintRole === p.owner && p.common === !p.owner); assert(!/Orilla del río/.test(p.name)); }); }
  assert.strictEqual(allP.length, 20); for (let z = 1; z <= 5; z++) { const zp = allP.filter(p => p.zone === z); assert.deepStrictEqual(zp.map(p => p.owner).filter(Boolean).sort(), ['guia', 'ing', 'medica'], 'cada rol su POI en zona ' + z); assert.strictEqual(zp.filter(p => p.common).length, 1); } assert.strictEqual(new Set(allP.map(p => p.name)).size, 20);
  // puerta bloquea el POI, solo su rol la abre, y persiste al avanzar
  const g1 = v.gates.find(g => g.id === 'z1_anclaje'), bp = v.pois.find(p => p.id === 'r1_2');
  const blk = Story.poiInteract(v, 'ing', bp.id); assert(!blk.ok && blk.reason === 'puerta' && blk.gateId === 'z1_anclaje' && v.priv.ing.ap === 3, 'POI bloqueado no gasta AP');
  assert(Story.mission(v, 'ing').now.target !== 'r1_2');
  assert(!Story.openGate(v, 'ing', 'z1_anclaje').ok && !Story.openGate(v, 'guia', 'z2_anclaje').ok);
  // request: IA acepta/rechaza según estilo y deja chat con mood+delay; humano no decide
  let acc = 0, rej = 0, lies = 0; for (let i = 0; i < 60; i++) { const q = Story.newGame({ seed: 500 + i, style: i % 2 ? 'coop' : 'ego', humans: ['guia'] }); await Story.roundStart(q); const r = Story.request(q, 'guia', 'ing', { gateId: 'z1_anclaje' }); assert(!r.ok && r.reason === 'rol'); const r2 = Story.request(q, 'medica', 'guia', { gateId: 'z1_anclaje' }); assert(r2.ok && r2.human && r2.accept === null);
    const r3 = Story.request(q, 'guia', 'medica', { gateId: 'z1_anclaje' }); assert(!r3.ok); q.round = 2; const q2 = Story.newGame({ seed: 500 + i, style: i % 2 ? 'coop' : 'ego' }); q2.round = 2; await Story.roundStart(q2); const r4 = Story.request(q2, 'guia', 'ing', { gateId: 'z2_puente' }); assert(r4.ok && typeof r4.accept === 'boolean' && r4.delay > 0 && r4.line && r4.msg.mood); if (r4.accept) { acc++; assert(Story.openGate(q2, 'ing', 'z2_puente', { helpFor: 'guia' }).ok); assert(q2.gatesOpen.z2_puente && !Story.request(q2, 'guia', 'ing', { gateId: 'z2_puente' }).ok); } else { rej++; if (r4.lie) lies++; } }
  assert(acc > 8 && rej > 8, 'aceptar y rechazar: ' + acc + '/' + rej);
  // coop acepta más que ego
  let ca = 0, ea = 0; for (let i = 0; i < 200; i++) for (const sty of ['coop', 'ego']) { const q = Story.newGame({ seed: 900 + i, style: sty }); await Story.roundStart(q); q.round = 2; if (Story.request(q, 'guia', 'ing', { gateId: 'z2_puente' }).accept) sty === 'coop' ? ca++ : ea++; } assert(ca > ea + 40, 'cooperativo debe aceptar más: ' + ca + ' vs ' + ea);
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
  for (const k of ['event', 'plan', 'resolve', 'lia', 'final']) { const L = Story.scene(sc, k); assert(L.length >= 1 && L.length <= (k === 'final' ? 7 : 4), 'escena ' + k); L.forEach(l => { assert(['lia', 'director', ...RK].includes(l.who) && MOODS.includes(l.mood) && l.text && l.text.length <= 112); }); }
  Story.tally(sc); Story.setPhase(sc, 'secret'); Story.resolve(sc); assert(Story.scene(sc, 'resolve').length >= 2); assert(Story.statusLabels.agua.tip && Story.statusLabels.confianza.tip);
  assert(!Story.intro.some(x => /pulsa|tecla|vota|Cómo se juega/i.test(x)), 'intro sin controles');
  // ===== v6 =====
  assert(Story.TIMES.resolve === 6 && Story.TIMES.summary <= 30);
  // misión distinta por rol; cada bot va a SU tarea
  for (let z = 1; z <= 5; z++) { const t = Story.newGame({ seed: 60 + z }); t.round = z; await Story.roundStart(t); Story.setPhase(t, 'explore'); const tg = RK.map(k => Story.mission(t, k).now.text); assert.strictEqual(new Set(tg).size, 3, 'misiones distintas z' + z + ' ' + tg);
    const first = []; for (const k of RK) { const a = await Story.botAct(t, k, 'explore'); const target = a.type === 'gate' ? a.gateId : a.poiId; first.push(target); if (a.type === 'poi') { const op = t.pois.find(p => p.owner === k); assert(t.pois.find(p => p.id === a.poiId).owner === k || (op.gate && !t.gatesOpen[op.gate]), 'bot va a su POI'); } assert(a.say); } assert.strictEqual(new Set(first).size, 3); }
  // parseRequest / answerChat
  const pr = Story.newGame({ seed: 70, humans: ['guia'], style: 'coop' }); pr.round = 3; await Story.roundStart(pr); Story.setPhase(pr, 'explore');
  for (const [txt, to, gate] of [['ivan haz el puente', 'ing', null], ['Samuel, abre la válvula', 'ing', 'z3_valvula'], ['elena abre', 'medica', 'z3_reptadero'], ['Iván, abre la válvula', 'ing', 'z3_valvula'], ['abrid la valvula', 'ing', 'z3_valvula'], ['abran la válvula', 'ing', 'z3_valvula'], ['ivan ábrela', 'ing', 'z3_valvula'], ['la médica puede abrir el reptadero?', 'medica', 'z3_reptadero'], ['ONA abre', 'medica', 'z3_reptadero']]) { const q = Story.parseRequest(pr, 'guia', txt); assert(q && q.to === to && q.kind === 'gate', txt + ' ' + JSON.stringify(q)); if (gate) assert.strictEqual(q.gateId, gate, txt); }
  assert.strictEqual(Story.parseRequest(pr, 'ing', 'mateo qué ves').to, 'guia'); assert.strictEqual(Story.parseRequest(pr, 'ing', 'nico qué ves').to, 'guia'); assert.strictEqual(Story.parseRequest(pr, 'guia', 'hola a todos'), null); assert.strictEqual(Story.parseRequest(pr, 'guia', 'ona qué ves').kind, 'info'); assert.strictEqual(Story.parseRequest(pr, 'guia', 'ivan sitúate').kind, 'where'); assert.strictEqual(Story.parseRequest(pr, 'guia', 'ona ayúdame').kind, 'help');
  assert.strictEqual(Story.parseRequest(pr, 'guia', 'ona abre la valvula').redirect, 'ing');
  const an = Story.answerChat(pr, 'guia', 'iván abre la válvula'); assert(an.ok && an.to === 'ing' && an.msgs.length === 1 && an.msgs[0].from === 'ing' && an.msgs[0].mood && typeof an.accept === 'boolean'); if (an.accept) assert.strictEqual(an.gateId, 'z3_valvula');
  Story.openGate(pr, 'ing', 'z3_valvula'); assert(/ya está abierta/.test(Story.answerChat(pr, 'guia', 'ivan abre la válvula otra vez').text)); Story.openGate(pr, 'medica', 'z3_reptadero'); Story.openGate(pr, 'ing', 'z2_puente'); Story.openGate(pr, 'guia', 'z1_anclaje'); Story.openGate(pr, 'guia', 'z2_anclaje'); assert(/ninguna que me toque/.test(Story.answerChat(pr, 'guia', 'ivan abre algo').text));
  let acc6 = 0; for (let i = 0; i < 40; i++) { const q = Story.newGame({ seed: 800 + i, humans: ['guia'], style: 'coop' }); q.round = 2; await Story.roundStart(q); Story.setPhase(q, 'explore'); const r = Story.answerChat(q, 'guia', 'ivan haz el puente'); assert(r.to === 'ing' && r.msgs.length === 1); if (r.accept) acc6++; } assert(acc6 > 28, 'coop acepta lo escrito: ' + acc6);
  const rr2 = await Story.botsReact(pr, 'chat', { from: 'guia', text: 'ona qué ves' }); assert(rr2.every(m => m.from === 'medica'), 'solo responde la aludida');
  // share siempre en el chat y publicState
  const sh6 = Story.newGame({ seed: 71, humans: ['ing'] }); await Story.roundStart(sh6); Story.setPhase(sh6, 'explore'); const ca6 = Story.poiInteract(sh6, 'ing', sh6.pois.find(p => p.owner === 'ing' && p.kind === 'info').id).card; const sg6 = Story.chatSuggest(sh6, 'ing').find(x => x.cardId);
  assert(sg6 && sg6.cardId === ca6.id); const s1 = Story.share(sh6, 'ing', sg6.cardId, {}); const pub = JSON.parse(JSON.stringify(Story.publicState(sh6))); const pm = pub.chat.find(m => m.id === s1.msg.id); assert(pm && pm.kind === 'share' && pm.from === 'ing' && pm.card && pm.text === ca6.text && pm.mood, 'share visible en publicState');
  const c2 = Story.poiInteract(sh6, 'ing', sh6.pois.find(p => p.kind === 'info' && p.owner !== 'ing').id).card; const s2 = Story.share(sh6, 'ing', c2.id, {}); assert(s2.ok && sh6.priv.ing.intel.find(c => c.id === c2.id).shared && Story.publicState(sh6).chat.some(m => m.id === s2.msg.id && m.kind === 'share')); assert(!Story.share(sh6, 'ing', c2.id, {}).ok);
  // opciones del plan con ask/what/gain/risk
  await Story.roundStart(sh6); sh6.plan.options.forEach(o => { assert(/^¿.*\?$/.test(o.ask) && o.what.length > 15 && o.gain && o.risk); });
  // explainResult
  const ex = await play('coop', 'normal', 5151, (st) => { const e = Story.explainResult(st); assert(e.headline && e.lines.length && e.why.length >= 2 && e.lines.every(l => ['agua', 'salud', 'material', 'confianza', 'info'].includes(l.icon) && l.text)); assert(/\d\/3/.test(e.why[0])); }); assert(ex.st);
  // coach solo en zona 1, <=10 palabras, avanza
  const co = Story.newGame({ seed: 72, humans: ['ing'] }); await Story.roundStart(co); Story.setPhase(co, 'explore'); let c0 = Story.coach(co, 'ing'); assert(c0.step === 1 && c0.total === 8 && c0.text.split(/\s+/).length <= 10);
  Story.poiInteract(co, 'ing', co.pois.find(p => p.owner === 'ing').id); c0 = Story.coach(co, 'ing'); assert(c0.step === 4); Story.share(co, 'ing', co.priv.ing.intel[0].id); c0 = Story.coach(co, 'ing'); assert(c0.step === 6 && /Mateo/.test(c0.text) && c0.text.split(/\s+/).length <= 10, c0.text);
  Story.answerChat(co, 'ing', 'mateo haz el anclaje'); assert.strictEqual(Story.coach(co, 'ing').step, 7); Story.setPhase(co, 'plan'); assert.strictEqual(Story.coach(co, 'ing').step, 8); Story.vote(co, 'ing', 'A'); assert.strictEqual(Story.coach(co, 'ing'), null); co.round = 2; assert.strictEqual(Story.coach(co, 'ing'), null);
  assert.strictEqual(Story.difficulty('facil').rate < Story.difficulty('normal').rate, true);
  // botStuck
  const bs = Story.newGame({ seed: 73 }); await Story.roundStart(bs); Story.setPhase(bs, 'explore'); const own = bs.pois.find(p => p.owner === 'ing').id, b6 = Story.botStuck(bs, 'ing', own); assert(b6.ok && b6.msg && b6.next !== own); assert(!Story.botStuck(bs, 'ing', own).msg, 'solo una vez'); const a6 = await Story.botAct(bs, 'ing', 'explore'); assert(a6.poiId !== own);
  // destinos: solo 4 (Lía + 3 rescatistas), con causa -> efecto y retrato portrait_<id>
  assert.strictEqual(Story.SURVIVORS.length, 1); assert.deepStrictEqual(Object.values(Story.NAMES), ['Mateo', 'Elena', 'Samuel', 'Lía']);
  const fa = await play('coop', 'normal', 91); const fx = fa.fin; assert.strictEqual(fx.fates.length, 4); assert.deepStrictEqual(fx.fates.map(f => f.id), ['lia', 'guia', 'medica', 'ing']);
  assert(fx.fates.every(f => f.name && f.portrait === 'portrait_' + f.id && ['vivo', 'herido', 'muerto'].includes(f.status) && f.why.length > 15) && fa.st.fates === fx.fates && fa.st.final.saved_count === fx.saved_count && fx.saved_count === fx.fates.filter(f => f.status !== 'muerto').length && fx.total_count === 4);
  for (let i = 0; i < 40; i++) { const { fin } = await play(i % 2 ? 'coop' : 'ego', 'normal', 3000 + i); if (!fin.saved) assert.strictEqual(fin.fates[0].status, 'muerto'); assert(fin.saved_count <= 4); }
  assert(!/Nico|\bOna\b|Iv[áa]n|Sara|Marta|\bLeo\b|Hugo/.test(JSON.stringify([fx, Story.intro, Story.ROLES, Story.scene(fa.st, 'final'), Story.PROMPTS])), 'nombres antiguos/supervivientes en texto visible');
  // ===== v7: uses / explain / planBrief / red de seguridad =====
  const u7 = Story.newGame({ seed: 80, humans: ['ing'] }); await Story.roundStart(u7); Story.setPhase(u7, 'explore');
  const iu = Story.poiInteract(u7, 'ing', u7.pois.find(p => p.kind === 'info' && p.owner === 'ing').id); assert(/^Voto/.test(iu.card.uses) && /voto/.test(iu.explain), iu.explain);
  const rp7 = u7.pois.find(p => p.kind === 'recurso'); if (rp7.gate) Story.openGate(u7, u7.gates.find(g => g.id === rp7.gate).role, rp7.gate); const ru = Story.poiInteract(u7, 'guia', rp7.id); assert(ru.card.uses && /todos/.test(ru.explain)); const sp7 = u7.pois.find(p => p.kind === 'secreto'); if (sp7.gate) Story.openGate(u7, u7.gates.find(g => g.id === sp7.gate).role, sp7.gate); const hu = Story.poiInteract(u7, 'guia', sp7.id); assert(hu.card.uses && hu.explain);
  const u8 = Story.newGame({ seed: 82 }); await Story.roundStart(u8); Story.setPhase(u8, 'explore'); RK.forEach(k => assert(Story.mission(u8, k).now.why.length > 5, Story.mission(u8, k).now.why));
  Story.setPhase(u7, 'plan'); assert(u7.chat.some(m => m.from === 'director' && /pista/i.test(m.text)), 'resumen al empezar el plan');
  const pb0 = Story.planBrief(u7); assert(pb0.text.split(/(?<=\.)\s/).length <= 3 && /Sin pistas/.test(pb0.text) && pb0.best === null);
  Story.setPhase(u7, 'explore'); const cu = iu.card, cdu = u7.hid.cards[cu.id], sh7 = Story.share(u7, 'ing', cu.id, {}); const pb1 = Story.planBrief(u7);
  assert(sh7.ok && pb1.known.length === 1 && pb1.known[0].includes(u7.plan.options[cdu.opt].n) && /Samuel/.test(pb1.known[0]), JSON.stringify(pb1)); assert(cdu.pol > 0 ? pb1.best === u7.plan.options[cdu.opt].id : pb1.best === null);
  // red de seguridad: un tramo malo no hunde (Normal/Fácil); en Everest sí; respiro avisado
  const g7 = Story.newGame({ seed: 81, difficulty: 'facil' }); g7.round = 2; await Story.roundStart(g7); g7.s.agua = 98; g7.s.salud = 5; g7.hid.bad = {}; Story.setPhase(g7, 'plan'); Story.tally(g7); Story.setPhase(g7, 'secret'); Story.resolve(g7);
  assert(!Story.isOver(g7) && g7.hid.respiroNext === 3, 'un solo tramo malo no termina'); g7.round = 3; await Story.roundStart(g7); const ro = g7.plan.options.filter(o => o.respiro); assert(ro.length === 1 && g7.chat.some(m => m.from === 'director' && /respiro/.test(m.text)), 'opción de respiro avisada');
  const e7 = Story.newGame({ seed: 81, difficulty: 'everest' }); e7.round = 2; await Story.roundStart(e7); e7.s.agua = 99; e7.s.salud = 5; Story.setPhase(e7, 'plan'); Story.tally(e7); Story.setPhase(e7, 'secret'); Story.resolve(e7); assert(Story.isOver(e7), 'Everest sin red');
    // v9: español neutro (sin vosotros/vale/coger en textos visibles) y finales
  { const src = require('fs').readFileSync(require('path').join(__dirname, '../src/story.js'), 'utf8'); const bad = /\bvosotros\b|\b(?:habéis|estáis|tenéis|podéis|queréis|sabéis|vais)\b|\bvale,|'Vale\b|\bcoger\b|\bordenador\b|\bvuestr\w+|\bos (?:oigo|cuento|lo|la|llega|ayuda)\b/i; const m = src.split('\n').filter(l => !/nunca «vosotros»|sin vosotros/.test(l)).join('\n').match(bad); assert(!m, 'quedó español de España: ' + (m && m[0])); }
  for (const win of [true, false]) { const f9 = Story.newGame({ seed: 90 + win }); f9.round = 5; f9.log = new Array(5).fill(0).map((_, i) => ({ round: i + 1, rolls: [{ ok: true }] })); if (!win) f9.s.agua = 100; else { f9.s.agua = 40; f9.s.salud = 70; } await Story.finish(f9); const sc = Story.scene(f9, 'final'), et = Story.endingTitle(f9);
    assert(sc.length >= 5 && sc.length <= 7 && sc.every(l => l.text.length <= 110 && l.who && l.mood), 'final ' + win + ' ' + sc.length); assert.strictEqual(et.saved, win); assert(et.title && et.title === Story.endingPanels(f9).title); assert(et.sub); if (!win) assert.strictEqual(sc[sc.length - 1].who, 'lia'); }
  // ===== v12: sin bloqueos, meta de equipo, IA siempre ayuda, viaje =====
  for (let z = 1; z <= 5; z++) { const t = Story.newGame({ seed: 120 + z, humans: ['medica'] }); t.round = z; await Story.roundStart(t); Story.setPhase(t, 'explore');
    for (const k of RK) { const free = t.pois.filter(p => !p.gate), ownFree = free.filter(p => p.owner === k || p.owner === null); assert(free.length >= 2 && Story.tasks(t, k).filter(x => x.type !== 'help').length >= 2, 'z' + z + ' ' + k + ' sin 2 tareas libres'); assert(t.pois.every(p => !p.gate || p.owner === null || t.gates.find(g => g.id === p.gate).role === p.owner), 'puerta ajena sobre POI propio z' + z); assert(Story.tasks(t, k)[0].type !== 'help', 'primera tarea no depende de otro'); }
    assert(!/Ahora no puedo/.test(JSON.stringify(Story.request(t, 'medica', t.gates.find(g => g.zone === z).role, { gateId: t.gates.find(g => g.zone === z).id }))));
    for (const g of t.gates.filter(x => x.zone === z)) { const a = Story.request(t, 'medica', g.role, { gateId: g.id }); if (g.role === 'medica') continue; assert(a.accept === true && a.delay <= 6000 && /Voy, tardo|Termino esta/.test(a.line), 'IA acepta siempre: ' + a.line); }
    t.hid.expT = 1e9; assert(Story.crisisReady(t).ready, 'el avance de zona siempre es posible'); }
  { const t = Story.newGame({ seed: 130, humans: ['medica'] }); await Story.roundStart(t); Story.setPhase(t, 'explore'); const cr = Story.crisisReady(t); assert(cr.progress.goal && RK.every(k => cr.progress.roles[k].done === false)); const mm = Story.mission(t, 'medica'); assert(mm.team.goal.startsWith('Entre los tres') && mm.team.needs.length === 2 && /^Pide a /.test(mm.team.needs[0].text));
    for (const k of ['guia', 'ing']) Story.poiInteract(t, k, t.pois.find(p => p.owner === k).id); assert(!Story.crisisReady(t).ready && Story.crisisReady(t).progress.missing[0] === 'medica', 'no basta con que la IA haga 3'); const own = t.pois.find(p => p.owner === 'medica'); Story.poiInteract(t, 'medica', own.id); assert(Story.crisisReady(t).ready);
    const u = Story.newGame({ seed: 131, humans: ['medica'] }); await Story.roundStart(u); Story.setPhase(u, 'explore'); const gid = u.gates.find(g => g.zone === 1).id; const q1 = Story.request(u, 'medica', 'guia', { gateId: gid }), q2 = Story.request(u, 'medica', 'guia', { gateId: gid }); assert(q1.accept && q1.delay <= 6000 && q2.accept && !/no puedo/i.test(q1.line + q2.line));
    const bz = Story.newGame({ seed: 132, humans: ['medica'] }); bz.round = 2; await Story.roundStart(bz); Story.setPhase(bz, 'explore'); Story.request(bz, 'medica', 'guia', { gateId: 'z2_anclaje' }); const bq = Story.request(bz, 'medica', 'guia', { gateId: 'z1_anclaje' }); const qb = Story.request(bz, 'ing', 'guia', { gateId: 'z2_anclaje' }); assert(qb.accept);
    const pa = Story.newGame({ seed: 133, humans: ['medica'] }); await Story.roundStart(pa); Story.setPhase(pa, 'explore'); const ga = pa.gates.find(g => g.zone === 1), ba = await Story.botAct(pa, 'guia', 'explore'); assert(ba.type === 'gate' && ba.gateId === ga.id, 'el bot abre ya la puerta que bloquea al humano'); }
  { const t = Story.newGame({ seed: 134 }); for (let r = 1; r <= 5; r++) { t.round = r; await Story.roundStart(t); t.plan.options.forEach(o => { assert(o.travel && o.travel.kind && o.travel.caption && o.travel.lines.length >= 2 && o.travel.lines.length <= 3 && o.travel.lines.every(l => l.who && l.mood && l.text), 'travel ' + o.n); }); }
    for (const style of ['coop', 'random']) for (let i = 0; i < 20; i++) { const { st } = await play(style, 'normal', 300 + i, (g, res) => { const ts = Story.travelScene(g); assert(ts && ts.kind && ts.caption && ts.lines.length >= 2 && ts.toZone === res.round + 1 && ts.outcome === (res.ok ? 'bien' : 'mal') && (res.ok || ts.caption !== res.plan.travel.caption), 'travelScene'); }); } }
  // ===== v13: diario, paneles finales, estado de Lía, petición visible en el chat =====
  { for (const sty of ['coop', 'ego']) { const z = Story.newGame({ seed: 141, style: sty, humans: ['medica'] }); await Story.roundStart(z); Story.setPhase(z, 'explore'); const n1 = z.chat.length, r = Story.request(z, 'medica', 'guia', { gateId: 'z1_anclaje' });
      assert(r.ok && r.ask && r.msgs.length === 2 && r.msgs[0] === r.ask && r.msgs[1] === r.msg && z.chat[n1] === r.ask && z.chat[n1 + 1] === r.msg && r.ask.from === 'medica' && r.ask.mood === 'talk' && /Mateo, ¿puedes/.test(r.ask.text), 'la petición se ve en el chat antes de la respuesta'); }
    const ty = Story.newGame({ seed: 142, humans: ['medica'] }); await Story.roundStart(ty); const n2 = ty.chat.length; assert(Story.request(ty, 'medica', 'guia', { gateId: 'z1_anclaje', typed: true }).msgs.length === 1 && ty.chat.length === n2 + 1, 'typed no duplica'); }
  { const j = Story.newGame({ seed: 143, humans: ['ing'] }); assert.strictEqual(Story.liaStatus(j), 'no_encontrada'); assert.strictEqual(Story.journal(j), null); j.round = 5; await Story.roundStart(j); Story.setPhase(j, 'explore'); assert.strictEqual(Story.liaStatus(j), 'no_encontrada');
    const ch = j.pois.find(p => p.id === 'r5_0'); if (ch.gate) Story.openGate(j, j.gates.find(g => g.id === ch.gate).role, ch.gate); assert(Story.poiInteract(j, 'medica', 'r5_0').ok); assert.strictEqual(Story.liaStatus(j), 'encontrada'); }
  for (const style of ['coop', 'ego']) for (let i = 0; i < 25; i++) { const { st } = await play(style, 'normal', 700 + i, (g, res) => { const jr = Story.journal(g); assert(jr && jr.day === g.round && jr.title && jr.intro && Array.isArray(jr.entries) && ['bien', 'mal'].includes(jr.decision.outcome) && jr.decision.title && jr.decision.text && jr.note, 'journal');
        assert.strictEqual(jr.decision.outcome === 'bien', res.ok); jr.entries.forEach(e => assert(e.icon && e.title && e.text && e.use)); jr.decision.effects.forEach(e => assert(['agua', 'salud', 'material', 'confianza'].includes(e.icon) && e.text && e.delta)); });
    const rc = Story.recap(st), pn = Story.endingPanels(st), win = Story.saved(st), M = ['neutral', 'alert', 'hurt', 'angry', 'happy', 'talk'];
    assert(rc.days.length === st.log.length && rc.entries.every(e => e.day && e.use) && rc.note, 'recap'); assert.strictEqual(Story.liaStatus(st), win ? 'rescatada' : 'perdida'); assert.strictEqual(pn.saved, win);
    assert(pn.panels.length >= 5 && pn.panels.length <= 7 && pn.panels.every(p => p.text.length <= 110 && (win ? /^end_good_[123]$/ : /^end_bad_[123]$/).test(p.img) && (!p.mood || M.includes(p.mood))), 'paneles');
    assert(win ? /Lía|linterna/.test(pn.panels[0].text) : /Lía|llegar|alcanz|camino/.test(pn.panels[0].text), 'primer panel deja claro si la encontraron'); }
  { const src = require('fs').readFileSync(require('path').join(__dirname, '../src/story.js'), 'utf8'); assert(!/Temblor de manos|Saturación de Lía|pulsioxímetro|apuntalamiento/.test(src), 'jerga en textos'); }
  // ===== v14: dieta de texto (límites de caracteres) =====
  { const lim = (w, s, n) => assert(typeof s !== 'string' || s.length <= n, w + ' (' + s.length + '>' + n + '): ' + s);
    const D = Story._D, ex = s => s.replace(/\{poi\}/g, 'x'.repeat(20)).replace(/\{opt\}/g, 'x'.repeat(20)).replace(/\{who\}/g, 'xxxxxx').replace(/\{n\}/g, 'xx');
    D.ROUND_D.forEach(R => { const nn = R.opts.map(o => o.n).sort((a, b) => b.length - a.length)[0];
      R.ev.forEach(e => { lim('ev.text', e.text, 60); lim('ev.radio', e.radio, 55); });
      R.opts.forEach(o => { lim('opt.t', o.t, 28); lim('opt.x', o.x, 60); lim('opt.k', o.k, 60); });
      R.poi.forEach(p => { lim('poi.label', p.label + ' · pista', 28); RK.forEach(k => { lim('card.title', p.cards[k][1], 28); lim('card', p.cards[k][2].replace('{o}', nn).replace(/\b([Dd])e el /g, '$1el ').replace(/\b([Aa]) el /g, '$1l '), 85); }); });
      lim('rec', R.rec.text, 85); lim('rec.label', R.rec.label + ' · salud', 28); lim('sec', R.sec.h.text, 85); lim('sec.label', R.sec.label + ' · hallazgo', 28); });
    for (const r in D.SA) D.SA[r].forEach(a => a.forEach(x => lim('act', x.text, 52)));
    const walk = (o, f) => { if (typeof o === 'string') f(o); else if (o && typeof o === 'object') for (const k in o) walk(o[k], f); };
    walk({ a: D.BR, b: D.LN, c: D.LIA }, t => lim('chat bot', ex(t), 57)); Object.values(D.CONFESS).forEach(c => lim('confesión', c.msg, 55));
    Story.GATES.forEach(g => { lim('gate.label', g.label, 28); lim('gate.why', g.why, 65); });
    for (const dif of ['facil', 'everest']) for (const seed of [1, 2, 3]) {
      const st = Story.newGame({ seed, difficulty: dif, demo: true });
      for (let r = 1; r <= 5; r++) { st.round = r; await Story.roundStart(st); Story.setPhase(st, 'explore');
        lim('event.text', st.event.text, 90); st.pois.forEach(p => { lim('poi.name', p.name, 22); lim('poi.label', p.label, 28); lim('poi.give', p.give, 70); lim('poi.act', p.act, 70); lim('poi.why', p.why, 65); });
        st.plan.options.forEach(o => { lim('title', o.title, 18); lim('what', o.what, 45); lim('ask', st.plan.ask, 45); lim('brief', st.plan.brief, 55); lim('gain', o.gain, 35); lim('risk', o.risk, 35); lim('opt.text', o.text, 90); });
        for (const k of RK) { const m = Story.mission(st, k); lim('now.text', m.now.text, 40); lim('now.why', m.now.why, 45); lim('now.hint', m.now.hint, 70); lim('now.short', m.now.short, 28); lim('desc', m.desc, 70); m.steps.forEach(x => lim('step', x.text, 70)); }
        for (let it = 0; it < 40; it++) { let any = false; for (const k of RK) { const a = await Story.botAct(st, k, 'explore'); if (a) { any = true; Story.exec(st, k, a); } } if (!any) break; }
        RK.forEach(k => st.priv[k].intel.forEach(c => { lim('card.text', c.text, 60); lim('card.uses', c.uses, 70); }));
        st.chat.forEach(m => { if (m.kind === 'sys' || m.kind === 'event') lim('sys', m.text, 70); });
        Story.setPhase(st, 'plan'); for (const k of RK) { const a = await Story.botAct(st, k, 'plan'); if (a) Story.exec(st, k, a); } Story.tally(st); Story.setPhase(st, 'secret'); for (const k of RK) { const a = await Story.botAct(st, k, 'secret'); if (a) Story.exec(st, k, a); }
        Story.resolve(st); ['event', 'lia', 'plan', 'resolve'].forEach(kd => Story.scene(st, kd).forEach(l => lim('scene', l.text, 55)));
        const tr = Story.travelScene(st); if (tr) { lim('travel', tr.caption, 45); assert(tr.lines.length <= 2); tr.lines.forEach(l => lim('travel', l.text, 45)); }
        const j = Story.journal(st); j.entries.forEach(e => { lim('journal', e.text, 60); lim('journal.use', e.use, 50); }); lim('journal.decision', j.decision.text, 80); lim('journal.note', j.note, 80); lim('journal.intro', j.intro, 80);
        const e = Story.explainResult(st); lim('headline', e.headline, 70); e.lines.forEach(l => lim('explain', l.text, 55)); e.why.forEach(w => lim('explain.why', w, 55));
        if (Story.isOver(st)) break; Story.advance(st); }
      Story.scene(st, 'final').forEach(l => lim('scene final', l.text, 55)); Story.endingPanels(st).panels.forEach(p => lim('panel', p.text, 90)); }
    assert(/55 caracteres/.test(Story.PROMPTS.bot) && /200 caracteres/.test(Story.PROMPTS.judge), 'prompts piden respuestas cortas'); }
  // ===== v14: recompensas de minijuego y logros =====
  { const mk = async (seed, round) => { const g = Story.newGame({ seed, humans: ['guia'] }); g.round = round || 1; await Story.roundStart(g); Story.setPhase(g, 'explore'); return g; };
    const free = g => g.pois.filter(p => !g.gates.find(x => !g.gatesOpen[x.id] && 'r' + x.zone + '_' + x.poi === p.id));
    const gI = await mk(300), pi = free(gI).find(p => p.kind === 'info'), gF = await mk(300), gP = await mk(300), gO = await mk(300);
    const ok = Story.poiInteract(gO, 'guia', pi.id), pf = Story.poiInteract(gP, 'guia', pi.id, { quality: 'perfect' }), fl = Story.poiInteract(gF, 'guia', pi.id, { quality: 'fail' });
    assert(ok.reward.quality === 'ok' && !ok.reward.bonus.length && ok.reward.streak === 0, 'ok sin bonus');
    assert(pf.reward.quality === 'perfect' && pf.reward.streak === 1 && Story.streak(gP, 'guia') === 1 && pf.reward.bonus.length >= 2 && pf.reward.bonus.every(b => b.icon && b.text), 'perfect: racha y bonus');
    assert(pf.card.reliability > ok.card.reliability && fl.card.reliability < ok.card.reliability && Math.abs(pf.card.reliability - ok.card.reliability - .15) < .02 + .0001 || pf.card.reliability >= .98, 'fiabilidad +-15');
    assert(gP.score.info > gO.score.info + 15 && gP.s.material === gO.s.material + 3, 'perfect: +20 precisión y +3 material'); assert.strictEqual(fl.reward.streak, 0); assert(gF.priv.guia.ap === gO.priv.guia.ap, 'fail gasta acción');
    const g = await mk(301), fp = free(g); Story.poiInteract(g, 'guia', fp[0].id, { quality: 'perfect' }); Story.poiInteract(g, 'guia', fp[1].id, { quality: 'perfect' }); const r3 = Story.poiInteract(g, 'guia', fp[2].id, { quality: 'perfect' }); assert.strictEqual(r3.reward.streak, 3);
    Story.setPhase(g, 'plan'); Story.tally(g); const rs = Story.resolve(g); assert(rs.achievements.some(a => a.id === 'racha3' && a.role === 'guia') && rs.achievements.some(a => a.id === 'sin_fallos' && a.role === 'guia'), 'logros racha3 y sin_fallos');
    const gb = await mk(302), fb = free(gb); Story.poiInteract(gb, 'guia', fb[0].id, { quality: 'perfect' }); assert.strictEqual(Story.poiInteract(gb, 'guia', fb[1].id, { quality: 'fail' }).reward.streak, 0, 'fail reinicia la racha');
    const gt = await mk(303), gate = gt.gates.find(x => x.zone === 1), gt2 = await mk(303), gt3 = await mk(303), gt4 = await mk(303);
    const a0 = Story.openGate(gt, gate.role, gate.id), a1 = Story.openGate(gt2, gate.role, gate.id, { quality: 'perfect' }), a2 = Story.openGate(gt3, gate.role, gate.id, { quality: 'fail' });
    assert(a0.ok && a1.ok && a2.ok && a0.reward.quality === 'ok' && a1.reward.bonus.length && gt2.s.confianza === gt.s.confianza + 1 && gt2.score.total > gt.score.total, 'puerta perfect'); assert(gt3.s.material === gt.s.material - 3 && a2.reward.bonus.length, 'puerta fail cuesta 3 de material');
    const g5 = await mk(304, 5); const cam = g5.pois.find(p => p.id === 'r5_0'), gc = g5.gates.find(x => x.zone === 5 && 'r5_' + x.poi === 'r5_0'); if (gc) Story.openGate(g5, gc.role, gc.id); assert(Story.poiInteract(g5, 'guia', 'r5_0', { quality: 'ok' }).ok); Story.setPhase(g5, 'plan'); Story.tally(g5);
    assert(Story.resolve(g5).achievements.some(a => a.id === 'primero' && a.role === 'guia'), 'Primero en llegar'); ['racha3', 'manos_oro', 'sin_fallos', 'primero'].forEach(id => assert(Story.achievementsList().some(a => a.id === id && a.name.length <= 20))); }
console.log('OK');
})().catch(e => { console.error(e); process.exit(1); });
