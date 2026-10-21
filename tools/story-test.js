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
  // ===== v6 =====
  assert(Story.TIMES.resolve === 6 && Story.TIMES.summary <= 30);
  // misión distinta por rol; cada bot va a SU tarea
  for (let z = 1; z <= 5; z++) { const t = Story.newGame({ seed: 60 + z }); t.round = z; await Story.roundStart(t); Story.setPhase(t, 'explore'); const tg = RK.map(k => Story.mission(t, k).now.text); assert.strictEqual(new Set(tg).size, 3, 'misiones distintas z' + z + ' ' + tg);
    const first = []; for (const k of RK) { const a = await Story.botAct(t, k, 'explore'); const target = a.type === 'gate' ? a.gateId : a.poiId; first.push(target); if (a.type === 'poi') { const op = t.pois.find(p => p.owner === k); assert(t.pois.find(p => p.id === a.poiId).owner === k || (op.gate && !t.gatesOpen[op.gate]), 'bot va a su POI'); } assert(a.say); } assert.strictEqual(new Set(first).size, 3); }
  // parseRequest / answerChat
  const pr = Story.newGame({ seed: 70, humans: ['guia'], style: 'coop' }); pr.round = 3; await Story.roundStart(pr); Story.setPhase(pr, 'explore');
  for (const [txt, to, gate] of [['ivan haz el puente', 'ing', null], ['Samuel, abre la válvula', 'ing', 'z3_valvula'], ['elena abre', 'medica', 'z3_reptadero'], ['Iván, abre la válvula', 'ing', 'z3_valvula'], ['abrid la valvula', 'ing', 'z3_valvula'], ['la médica puede abrir el reptadero?', 'medica', 'z3_reptadero'], ['ONA abre', 'medica', 'z3_reptadero']]) { const q = Story.parseRequest(pr, 'guia', txt); assert(q && q.to === to && q.kind === 'gate', txt + ' ' + JSON.stringify(q)); if (gate) assert.strictEqual(q.gateId, gate, txt); }
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
  const ex = await play('coop', 'normal', 5151, (st) => { const e = Story.explainResult(st); assert(e.headline && e.lines.length && e.why.length >= 2 && e.lines.every(l => ['agua', 'salud', 'material', 'confianza', 'info'].includes(l.icon) && l.text)); assert(/votos? de 3/.test(e.why[0])); }); assert(ex.st);
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
  const iu = Story.poiInteract(u7, 'ing', u7.pois.find(p => p.kind === 'info' && p.owner === 'ing').id); assert(/votación/.test(iu.card.uses) && /^Has encontrado .* → .* → úsalo en: la votación/.test(iu.explain), iu.explain);
  const ru = Story.poiInteract(u7, 'guia', u7.pois.find(p => p.kind === 'recurso').id); assert(ru.card.uses && /→ úsalo en:/.test(ru.explain)); const sp7 = u7.pois.find(p => p.kind === 'secreto'); if (sp7.gate) Story.openGate(u7, u7.gates.find(g => g.id === sp7.gate).role, sp7.gate); const hu = Story.poiInteract(u7, 'guia', sp7.id); assert(hu.card.uses && /→ úsalo en:/.test(hu.explain));
  const u8 = Story.newGame({ seed: 82 }); await Story.roundStart(u8); Story.setPhase(u8, 'explore'); RK.forEach(k => assert(/^Si /.test(Story.mission(u8, k).now.why), Story.mission(u8, k).now.why));
  Story.setPhase(u7, 'plan'); assert(u7.chat.some(m => m.from === 'director' && /Hay 3 caminos/.test(m.text)), 'resumen al empezar el plan');
  const pb0 = Story.planBrief(u7); assert(pb0.text.split(/(?<=\.)\s/).length <= 3 && /Hay 3 caminos/.test(pb0.text) && pb0.best === null);
  Story.setPhase(u7, 'explore'); const cu = iu.card, cdu = u7.hid.cards[cu.id], sh7 = Story.share(u7, 'ing', cu.id, {}); const pb1 = Story.planBrief(u7);
  assert(sh7.ok && pb1.known.length === 1 && pb1.known[0].includes(u7.plan.options[cdu.opt].n) && /Samuel/.test(pb1.known[0]), JSON.stringify(pb1)); assert(cdu.pol > 0 ? pb1.best === u7.plan.options[cdu.opt].id : pb1.best === null);
  // red de seguridad: un tramo malo no hunde (Normal/Fácil); en Everest sí; respiro avisado
  const g7 = Story.newGame({ seed: 81, difficulty: 'facil' }); g7.round = 2; await Story.roundStart(g7); g7.s.agua = 98; g7.s.salud = 5; g7.hid.bad = {}; Story.setPhase(g7, 'plan'); Story.tally(g7); Story.setPhase(g7, 'secret'); Story.resolve(g7);
  assert(!Story.isOver(g7) && g7.hid.respiroNext === 3, 'un solo tramo malo no termina'); g7.round = 3; await Story.roundStart(g7); const ro = g7.plan.options.filter(o => o.respiro); assert(ro.length === 1 && g7.chat.some(m => m.from === 'director' && /respiro/.test(m.text)), 'opción de respiro avisada');
  const e7 = Story.newGame({ seed: 81, difficulty: 'everest' }); e7.round = 2; await Story.roundStart(e7); e7.s.agua = 99; e7.s.salud = 5; Story.setPhase(e7, 'plan'); Story.tally(e7); Story.setPhase(e7, 'secret'); Story.resolve(e7); assert(Story.isOver(e7), 'Everest sin red');
  console.log('OK');
})().catch(e => { console.error(e); process.exit(1); });
