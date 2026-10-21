/* audio.js - Rescate en la Cueva v3. Motor WebAudio 100% procedural. window.Sound
   Core(ctx) es independiente del tipo de contexto: el mismo codigo suena en tiempo real y en OfflineAudioContext (tests). */
(function () {
'use strict';
const KEY = 'rcv3_audio';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mod = (a, n) => ((a % n) + n) % n;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

/* ---------------- composicion ---------------- */
const MIN = [0, 2, 3, 5, 7, 8, 10], DOR = [0, 2, 3, 5, 7, 9, 10], PHR = [0, 1, 3, 5, 7, 8, 10], MAJ = [0, 2, 4, 5, 7, 9, 11];
const ARPD = [0, 2, 4, 7, 9, 11];            // grados de acorde para el arpegio (indices '0'..'5')
// root = tonica grave (MIDI); pads +12, arp/melodia +24. Patrones de 16 semicorcheas por compas ('.' = silencio).
// prog = grado de la escala por compas (acorde = grado, +2, +4, +6 si sev). motif = [compas, paso, grado, largo en pasos].
const TR = {
  menu: { bpm: 72, root: 45, sc: MIN, prog: [0, 5, 2, 6], sw: .05, bass: 'x.......f...o...', arp: '0.1.2.1.3.2.1.2.', arp2: '0102130210213021',
    perc: { k: 'x.......x.......', r: '....x.......x...', h: '..x...x...x...x.' }, mv: 'bell', wind: .5, drip: .5, base: .35, lp: 1000,
    motif: [[0, 0, 4, 6], [0, 8, 6, 2], [0, 10, 4, 4], [1, 0, 5, 6], [1, 8, 4, 2], [1, 10, 2, 6], [2, 0, 4, 8], [2, 10, 2, 2], [2, 12, 4, 4], [3, 0, 6, 6], [3, 8, 5, 2], [3, 10, 4, 6]] },
  tutorial: { bpm: 88, root: 48, sc: MAJ, prog: [0, 4, 5, 3], sw: .09, bass: 'x...x...f...x...', arp: '0.1.2.1.0.1.2.3.', arp2: '0120120301201232',
    perc: { k: 'x.......x.......', r: '....x.......x...', h: '..x...x...x...x.' }, mv: 'pluck', wind: .15, drip: .15, base: .4, lp: 1400,
    motif: [[0, 0, 4, 2], [0, 2, 5, 2], [0, 4, 7, 4], [0, 10, 4, 2], [1, 0, 6, 2], [1, 2, 5, 2], [1, 4, 4, 4], [2, 0, 5, 2], [2, 2, 7, 2], [2, 4, 9, 4], [2, 10, 7, 2], [3, 0, 5, 4], [3, 6, 4, 2], [3, 8, 2, 6]] },
  briefing: { bpm: 60, root: 38, sc: PHR, prog: [0, 1, 0, 6], sw: 0, bass: 'x...............', arp: '0...1...2...1...', arp2: '0.1.2.1.0.1.2.1.',
    perc: { k: 'x.....x.........', t: '........x.......' }, mv: 'bell', wind: .8, drip: .6, base: .45, lp: 800,
    motif: [[0, 0, 4, 12], [1, 0, 5, 8], [1, 8, 4, 4], [2, 0, 4, 8], [2, 8, 2, 8], [3, 0, 1, 16]] },
  explore: { bpm: 84, root: 40, sc: DOR, prog: [0, 3, 6, 4], sw: .06, adapt: 1, bass: 'x..x..x.x..x..f.', arp: '0.1.2.3.2.1.2.1.', arp2: '0123210301232103',
    perc: { k: 'x.....x...x.....', t: '........x....x..', r: '....x.......x...', h: '..x...x...x...x.' }, mv: 'bell', wind: .6, drip: .8, base: .3, lp: 1000,
    motif: [[0, 0, 4, 4], [0, 6, 2, 2], [0, 8, 4, 6], [1, 0, 5, 4], [1, 6, 3, 2], [1, 8, 5, 6], [2, 0, 6, 4], [2, 6, 4, 2], [2, 8, 2, 6], [3, 0, 3, 8], [3, 10, 4, 2], [3, 12, 1, 4]] },
  plan: { bpm: 78, root: 42, sc: MIN, prog: [0, 5, 3, 4], sw: 0, adapt: 1, bass: 'x...x...x...x...', arp: '0.2.1.3.0.2.1.3.', arp2: '0213021302130213',
    perc: { k: 'x.......x.......', r: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' }, mv: 'pluck', wind: .3, drip: .3, base: .3, lp: 1100,
    motif: [[0, 0, 7, 6], [0, 8, 6, 4], [1, 0, 5, 8], [2, 0, 4, 6], [2, 8, 5, 4], [3, 0, 6, 6], [3, 8, 4, 8]] },
  secret: { bpm: 66, root: 34, sc: [0, 2, 3, 5, 7, 8, 11], prog: [0, 5, 0, 4], sw: 0, bass: 'x.......x.......', arp: '0...0...0...0...', arp2: '0.3.0.3.0.3.0.3.',
    perc: { r: 'x...x...x...x...' }, mv: 'bell', wind: .7, drip: .4, base: .55, lp: 700, sev: 1,
    motif: [[0, 0, 4, 3], [0, 8, 5, 3], [1, 0, 6, 3], [1, 8, 5, 3], [2, 0, 7, 3], [2, 8, 4, 3], [3, 0, 3, 8]] },
  resolve: { bpm: 108, root: 38, sc: MIN, prog: [0, 5, 6, 4], sw: 0, bass: 'x.x.x.x.x.x.x.x.', arp: '0.1.2.1.0.1.2.3.', arp2: '0123012301230123',
    perc: { k: 'x..x..x.x.......', t: 'x.......x..x....', r: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' }, mv: 'bell', wind: .3, drip: 0, base: .8, lp: 1300,
    motif: [[0, 0, 7, 3], [0, 4, 6, 3], [0, 8, 4, 8], [1, 0, 7, 3], [1, 4, 8, 3], [1, 8, 7, 8], [2, 0, 6, 3], [2, 4, 7, 3], [2, 8, 9, 8], [3, 0, 8, 3], [3, 4, 6, 3], [3, 8, 4, 8]] },
  summary: { bpm: 76, root: 43, sc: MAJ, prog: [0, 5, 3, 4], sw: .04, bass: 'x.......f.......', arp: '0.1.2.1.3.2.1.2.', arp2: '0102130210213021',
    perc: { h: 'x.x.x.x.x.x.x.x.' }, mv: 'bell', wind: 0, drip: 0, base: .3, lp: 1600,
    motif: [[0, 0, 4, 4], [0, 4, 5, 4], [0, 8, 7, 8], [1, 0, 6, 4], [1, 4, 5, 4], [1, 8, 4, 8], [2, 0, 5, 6], [2, 8, 7, 4], [2, 12, 9, 4], [3, 0, 8, 8], [3, 8, 6, 4], [3, 12, 5, 4]] },
  win: { bpm: 100, root: 38, sc: MAJ, prog: [0, 4, 5, 3], sw: .05, bass: 'x...x...x...x...', arp: '0.1.2.3.2.1.2.3.', arp2: '0123210323012103',
    perc: { k: 'x.......x.......', r: '....x.......x...', h: '..x...x...x...x.' }, mv: 'bell', wind: 0, drip: 0, base: .65, lp: 1800,
    motif: [[0, 0, 4, 4], [0, 4, 7, 4], [0, 8, 9, 8], [1, 0, 8, 4], [1, 4, 7, 4], [1, 8, 6, 8], [2, 0, 7, 4], [2, 4, 5, 4], [2, 8, 4, 8], [3, 0, 5, 4], [3, 4, 4, 4], [3, 8, 7, 8]] },
  lose: { bpm: 52, root: 33, sc: MIN, prog: [0, 5, 3, 4], sw: 0, bass: 'x...............', arp: '0.......2.......', arp2: '0...1...2...1...',
    perc: { t: 'x.......' + '........' }, mv: 'bell', wind: .8, drip: .5, base: .25, lp: 550,
    motif: [[0, 0, 7, 8], [0, 8, 6, 8], [1, 0, 5, 8], [1, 8, 4, 8], [2, 0, 3, 8], [2, 8, 2, 8], [3, 0, 1, 12]] }
};
const SFX_NAMES = 'click hover back error select confirm open close toast chat_send chat_recv typing tick tick_urgent round_start intel share lie vote vote_pass vote_fail secret_reveal dice resolve_good resolve_bad achievement grade_s grade_low water_warn thunder rumble drip radio_on radio_static heal rope plank rescue win lose cable jump land step splash swim interact gasp drown ability gate_open help dialogue_open'.split(' ');
const THROTTLE = { hover: .04, step: .07, typing: .025, tick: .05, tick_urgent: .05, drip: .08, land: .08, jump: .08, click: .03, gasp: .3, dialogue_open: .15 };

/* ---------------- Core: grafo + voces + secuenciador + SFX ---------------- */
function Core(ctx, master) {
  const sr = ctx.sampleRate, R = rng(20241021);
  const G = () => ctx.createGain();
  const gain = (v, to) => { const g = G(); g.gain.value = v; if (to) g.connect(to); return g; };
  const filt = (type, f, q) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; };
  /* master: buses -> mute -> compresor -> saturador tanh (garantiza |x|<1: sin clipping digital) -> salida */
  /* v5: bus -> mute -> compresor -> limitador -> lowpass 9k -> tanh (techo .64 = -3.9 dBFS) -> volumen maestro (<=1, def .4) -> salida */
  const out = gain(master == null ? .4 : master, ctx.destination);
  const sat = ctx.createWaveShaper(); { const c = new Float32Array(2049); for (let i = 0; i < c.length; i++) c[i] = .8 * Math.tanh((i / 1024 - 1) * 1.1); sat.curve = c; } sat.connect(out);
  const mlp = filt('lowpass', 9000, .5); mlp.connect(sat);
  const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -6; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .002; lim.release.value = .12; lim.connect(mlp);
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.knee.value = 14; comp.ratio.value = 3.5; comp.attack.value = .008; comp.release.value = .25; comp.connect(lim);
  const an = ctx.createAnalyser(); an.fftSize = 1024; out.connect(an);
  const muteG = gain(1, comp);
  const musicVol = gain(.6, muteG), duck = gain(1, musicVol), musicIn = gain(.398, duck); // musica -8 dB vs v4
  const sfxVol = gain(.8, muteG), sfxIn = gain(.631), sfxLP = filt('lowpass', 6000, .5); sfxIn.connect(sfxLP); sfxLP.connect(sfxVol); // SFX -4 dB y agudos suaves
  /* ruido y reverb (impulso generado: ruido estereo con decaimiento exponencial y amortiguacion de agudos creciente) */
  const nb = ctx.createBuffer(1, sr * 3, sr); { const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1; }
  const ir = ctx.createBuffer(2, Math.floor(sr * 2.6), sr);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c), N = d.length; let y = 0; for (let i = 0; i < N; i++) { const t = i / N, k = .75 - .6 * t; y += ((R() * 2 - 1) - y) * k; d[i] = i < sr * .012 ? 0 : y * Math.pow(1 - t, 3.2) * (1 + 2.5 * (i < sr * .08 ? 1 - i / (sr * .08) : 0)); } }
  const mkRev = (dest, ret) => { const i = G(), cv = ctx.createConvolver(); cv.buffer = ir; i.connect(cv); cv.connect(gain(ret, dest)); return i; };
  const revM = mkRev(musicIn, .9), revS = mkRev(sfxIn, .8);
  /* buses SFX: seco (rev corta) y brillante (rev + eco) */
  const sD = gain(1, sfxIn); sD.connect(gain(.14, revS));
  const sW = gain(1, sfxIn); sW.connect(gain(.55, revS));
  const sDly = ctx.createDelay(1); sDly.delayTime.value = .27; { const fb = gain(.32), lp = filt('lowpass', 2200); sDly.connect(lp); lp.connect(fb); fb.connect(sDly); lp.connect(gain(.5, sfxIn)); sW.connect(gain(.3, sDly)); }

  /* ---- voces ---- */
  function adsr(p, t, v, a, d, s, dur, r) { a = Math.max(a, .006); p.setValueAtTime(.0001, t); p.linearRampToValueAtTime(v, t + a); const sl = Math.max(v * s, .0001); p.exponentialRampToValueAtTime(sl, t + a + d); const te = Math.max(t + dur, t + a + d); p.setValueAtTime(sl, te); p.exponentialRampToValueAtTime(.0001, te + r); return te + r; }
  function tone(dest, type, f, t, dur, v, o) {
    o = o || {}; const os = ctx.createOscillator(), g = G(); os.type = type; os.frequency.setValueAtTime(f, t);
    if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || dur)); if (o.det) os.detune.value = o.det;
    let n = os; if (o.lp) { const fl = filt('lowpass', o.lp, o.q || .7); if (o.lpTo) fl.frequency.exponentialRampToValueAtTime(o.lpTo, t + dur); os.connect(fl); n = fl; }
    if (o.am) { const am = gain(1 - o.am[1]), l = ctx.createOscillator(); l.frequency.value = o.am[0]; l.connect(gain(o.am[1], am.gain)); l.start(t); l.stop(t + dur + 2); n.connect(am); n = am; }
    n.connect(g); g.connect(dest); const end = adsr(g.gain, t, v, o.a == null ? .004 : o.a, o.d == null ? dur : o.d, o.s || 0, dur, o.r == null ? .04 : o.r); os.start(t); os.stop(end + .05); return g;
  }
  function nz(dest, t, dur, v, o) {
    o = o || {}; const s = ctx.createBufferSource(), g = G(), f = filt(o.type || 'lowpass', o.f || 1000, o.q || .8); s.buffer = nb; s.loop = true;
    f.frequency.setValueAtTime(o.f || 1000, t); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    let n = f; if (o.am) { const am = gain(1 - o.am[1]), l = ctx.createOscillator(); l.frequency.value = o.am[0]; l.connect(gain(o.am[1], am.gain)); l.start(t); l.stop(t + dur + 2); f.connect(am); n = am; }
    s.connect(f); n.connect(g); g.connect(dest); const end = adsr(g.gain, t, v, o.a == null ? .004 : o.a, o.d == null ? dur : o.d, o.s || 0, dur, o.r == null ? .03 : o.r);
    s.start(t, R() * 2); s.stop(end + .05);
  }
  const bell = (dest, m, t, dur, v) => { // FM suave: portadora + modulador inarmonico con indice decreciente
    const f = mtof(m), c = ctx.createOscillator(), md = ctx.createOscillator(), mg = G(), g = G(); c.frequency.value = f; md.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 1.4, t); mg.gain.exponentialRampToValueAtTime(f * .02, t + dur * .7); md.connect(mg); mg.connect(c.frequency); c.connect(g); g.connect(dest);
    adsr(g.gain, t, v, .003, dur, 0, dur * .3, .2); c.start(t); md.start(t); c.stop(t + dur * 1.6); md.stop(t + dur * 1.6); tone(dest, 'sine', f * 2, t, dur * .3, v * .25);
  };
  const pluck = (dest, m, t, dur, v) => { tone(dest, 'triangle', mtof(m), t, dur, v, { lp: 3200, lpTo: 500, d: dur, q: 1.5 }); tone(dest, 'sine', mtof(m) * 2, t, dur * .4, v * .3); };
  const pad = (dest, ms, t, dur, v, lp) => ms.forEach((m, i) => [-8, 8].forEach(dt => tone(dest, 'sawtooth', mtof(m), t, dur, v / ms.length, { det: dt, lp: lp * .6, lpTo: lp * 1.2, q: .5, a: dur * .35, d: dur * .3, s: .8, r: dur * .3 })));
  const thump = (dest, t, v, f) => { tone(dest, 'sine', f || 100, t, .24, v, { to: (f || 100) * .45, glide: .16 }); nz(dest, t, .03, v * .25, { f: 900 }); };

  /* ---- pistas ---- */
  const LAYERS = { pad: [.5, .5, 0], bass: [.6, .06, 0], arp: [.6, .35, .5], perc: [.7, .15, 0], mel: [.5, .45, .35], ten: [.5, .5, 0], amb: [.6, .4, 0] };
  const levels = x => ({ pad: 1 - .3 * x, bass: sstep(.08, .3, x), arp: sstep(.22, .5, x), perc: sstep(.4, .62, x), mel: 1 - .6 * sstep(.7, 1, x), ten: sstep(.62, .9, x), amb: 1 });
  const tracks = []; let intensity = 0, cur = null;
  function makeTrack(name, t0, x) {
    const D = TR[name], T = { name, d: D, sd: 60 / D.bpm / 4, step: 0, nextT: t0, dead: false, x, L: {}, stop: [], fades: [] }, r = rng(name.length * 977 + name.charCodeAt(1) * 31);
    T.r = r; const grp = gain(.0001, musicIn), gr = gain(.0001, revM), gd = G(); T.fades = [grp.gain, gr.gain, gd.gain]; T.grp = grp; T.nodes = [grp, gr, gd];
    const dly = ctx.createDelay(2); dly.delayTime.value = 60 / D.bpm * .75; const fb = gain(.38), dl = filt('lowpass', 2200); gd.connect(dly); dly.connect(dl); dl.connect(fb); fb.connect(dly); dl.connect(grp); gd.gain.value = .0001; T.nodes.push(dly, dl, fb);
    for (const k in LAYERS) { const g = gain(0, grp); if (LAYERS[k][1]) g.connect(gain(LAYERS[k][1], gr)); if (LAYERS[k][2]) g.connect(gain(LAYERS[k][2], gd)); T.L[k] = g; }
    T.scPad = gain(1, T.L.pad); T.scBass = gain(1, T.L.bass);
    if (D.wind) { // viento de cueva: ruido en banda con vaivén lento
      const s = ctx.createBufferSource(), f = filt('bandpass', 380, .9), g = gain(D.wind * .09), l = ctx.createOscillator(), lg = gain(D.wind * .06); s.buffer = nb; s.loop = true; l.frequency.value = .07; l.connect(lg); lg.connect(g.gain);
      const l2 = ctx.createOscillator(), l2g = gain(160); l2.frequency.value = .11; l2.connect(l2g); l2g.connect(f.frequency); s.connect(f); f.connect(g); g.connect(T.L.amb); s.start(t0, R()); l.start(t0); l2.start(t0); T.stop.push(s, l, l2);
    }
    setLevels(T, x, true, t0); return T;
  }
  function setLevels(T, x, now, t) {
    const lv = levels(x); T.x = x; for (const k in LAYERS) { const p = T.L[k].gain, v = LAYERS[k][0] * lv[k]; if (now) { p.setValueAtTime(v, t || ctx.currentTime); } else p.setTargetAtTime(v, ctx.currentTime, .9); }
  }
  function playStep(T, s, t) {
    const D = T.d, n = D.sc.length, L = T.L, st = s % 16, barN = Math.floor(s / 16), bar = barN % D.prog.length, cyc = Math.floor(barN / D.prog.length), deg = D.prog[bar], sd = T.sd, r = T.r;
    const note = k => D.root + D.sc[mod(k, n)] + 12 * Math.floor(k / n);
    t += (st % 2 ? D.sw * sd * 2 : 0) + (r() - .5) * .008;
    const kick = D.perc.k && D.perc.k[st] === 'x';
    if (kick && T.x > .4) { // sidechain suave: pad y bajo "respiran" con el bombo
      [T.scPad, T.scBass].forEach(g => { g.gain.setValueAtTime(.72, t); g.gain.setTargetAtTime(1, t + .01, .09); });
    }
    if (st === 0) {
      const ch = [0, 2, 4, D.sev ? 6 : 7].map(i => note(deg + i) + 12);
      pad(T.scPad, ch, t, sd * 16, .34, D.lp);
      const tn = note(deg) + 24, ft = D.lp * 1.3; // capa de tension: cluster disonante (2a menor + tritono) con trémolo, desde el compas
      tone(L.ten, 'sawtooth', mtof(tn), t, sd * 16, .035, { lp: ft, am: [5.5, .5], a: sd * 6, d: sd * 8, s: .7, r: sd * 3 });
      tone(L.ten, 'sawtooth', mtof(tn + 6), t, sd * 16, .03, { lp: ft, am: [5.5, .5], a: sd * 8, d: sd * 6, s: .7, r: sd * 3 });
      tone(L.ten, 'sawtooth', mtof(tn + 13), t, sd * 16, .02, { lp: ft, am: [4.2, .6], a: sd * 8, d: sd * 6, s: .7, r: sd * 3 });
      for (let j = 0; j < 2; j++) if (r() < D.drip) { const dt = t + r() * sd * 16; tone(L.amb, 'sine', mtof(84 + Math.floor(r() * 5) * 2), dt, .14, .08 + r() * .05, { to: mtof(70), glide: .1 }); }
    }
    if (st === 0 || st === 6) thump(L.ten, t, .3 * (st ? .6 : 1), 62); // latido
    const b = D.bass[st]; if (b !== '.') { const m = b === 'f' ? note(deg + 4) : b === 'o' ? note(deg) + 12 : note(deg); tone(T.scBass, 'triangle', mtof(m), t, sd * 3, .3, { lp: 760, a: .01, d: sd * 3, s: .2, r: .08 }); tone(T.scBass, 'sine', mtof(m), t, sd * 3.2, .15, { a: .01, d: sd * 3, s: .3, r: .08 }); }
    const ap = (T.x > .7 ? D.arp2 : D.arp)[st]; if (ap !== '.') pluck(L.arp, note(deg + ARPD[+ap]) + 24, t, sd * 2.4, .32 * (st % 4 ? .75 : 1));
    const pc = D.perc;
    if (pc.k && kick) thump(L.perc, t, .3, 95);
    if (pc.t && pc.t[st] === 'x') { tone(L.perc, 'sine', 130, t, .35, .35, { to: 70, glide: .3 }); nz(L.perc, t, .06, .08, { f: 500 }); }
    if (pc.r && pc.r[st] === 'x') { nz(L.perc, t, .07, .12, { type: 'bandpass', f: 2200, q: 2 }); tone(L.perc, 'triangle', 820, t, .03, .1); }
    if (pc.h && pc.h[st] === 'x') nz(L.perc, t, .035, .055 * (.7 + r() * .6), { type: 'highpass', f: 7500 });
    for (const m of D.motif) if (m[0] === bar && m[1] === st) { const dg = m[2] + (cyc % 2 ? 2 : 0), mm = note(dg) + 24, du = m[3] * sd; (D.mv === 'bell' ? bell : pluck)(L.mel, mm, t, Math.max(du, .5), .24); }
  }
  function pump(horizon) {
    for (const T of tracks) { if (T.dead) continue; if (T.nextT < ctx.currentTime - .05) { const miss = Math.ceil((ctx.currentTime + .05 - T.nextT) / T.sd); T.step += miss; T.nextT += miss * T.sd; }
      while (T.nextT < horizon) { playStep(T, T.step, T.nextT); T.nextT += T.sd; T.step++; } }
  }
  function fade(T, v, tc, t) { T.fades.forEach(p => { p.cancelScheduledValues(t); p.setTargetAtTime(v, t, tc); }); }
  function music(name, o) {
    o = o || {}; const t = o.at != null ? o.at : ctx.currentTime;
    if (cur) { const old = cur; fade(old, 0.0001, .7, t); old.dead = true; if (!o.offline) setTimeout(() => { try { old.stop.forEach(s => s.stop()); old.nodes.forEach(n => n.disconnect()); } catch (e) { } tracks.splice(tracks.indexOf(old), 1); }, 5000); }
    cur = null; if (!name || !TR[name]) return !name;
    const D = TR[name], T = makeTrack(name, t + .06, D.adapt ? (o.x != null ? o.x : intensity) : D.base); tracks.push(T); cur = T;
    if (o.offline) { T.fades.forEach(p => p.setValueAtTime(1, t)); } else { T.fades.forEach(p => { p.setValueAtTime(.0001, t); p.setTargetAtTime(1, t + .02, .6); }); }
    return true;
  }
  function setIntensity(x) { intensity = clamp(+x || 0, 0, 1); if (cur && cur.d.adapt) setLevels(cur, intensity); }

  /* ---- blips de dialogo (typewriter): tono por rol, color por mood; muy suaves ---- */
  const TALK = { guia: 200, medica: 330, ing: 150, lia: 400, director: 120 }, MOOD = { neutral: [1, 'sine'], alegre: [1.18, 'triangle'], feliz: [1.18, 'triangle'], tenso: [.94, 'triangle'], miedo: [1.3, 'sine'], triste: [.82, 'sine'], enfadado: [.88, 'triangle'], serio: [.92, 'sine'] };
  function talk(role, mood, at) {
    let b = TALK[role]; if (!b) { let h = 0; for (const ch of String(role || '')) h = (h * 31 + ch.charCodeAt(0)) | 0; b = 130 + mod(h, 280); }
    const md = MOOD[mood] || MOOD.neutral, t = (at != null ? at : ctx.currentTime) + .003, f = b * md[0] * (1 + (R() - .5) * .08);
    tone(sfxIn, md[1], f, t, .045, .05, { lp: 1800, a: .008, r: .03, to: f * (mood === 'tenso' || mood === 'triste' ? .95 : 1.04) });
  }

  /* ---- SFX ---- */
  const m = mtof, rnd = () => R();
  function sfx(name, o, at) {
    o = o || {}; const t = (at != null ? at : ctx.currentTime) + .005, p = o.pitch || 1, V = o.vol == null ? 1 : o.vol, D = sD, W = sW;
    const tn = (ty, f, dt, du, v, op, bus) => tone(bus || D, ty, f * p, t + dt, du, v * V, op), nzz = (dt, du, v, op, bus) => nz(bus || D, t + dt, du, v * V, op);
    const bl = (mi, dt, du, v) => bell(W, mi + Math.round(12 * Math.log2(p)), t + dt, du, v * V), pl = (mi, dt, du, v) => pluck(W, mi + Math.round(12 * Math.log2(p)), t + dt, du, v * V);
    const arp = (ms, gap, du, v, fn) => ms.forEach((mi, i) => (fn || bl)(mi, i * gap, du, v));
    const chord = (ms, dt, du, v, lp) => pad(W, ms, t + dt, du, v * V, lp);
    switch (name) {
      case 'click': tn('sine', 1500, 0, .05, .3, { to: 800 }); nzz(0, .02, .1, { type: 'highpass', f: 3000 }); break;
      case 'hover': tn('sine', 2300, 0, .05, .3, { a: .003 }); break;
      case 'back': tn('triangle', 620, 0, .1, .3, { to: 340 }); nzz(0, .03, .06, { type: 'highpass', f: 2000 }); break;
      case 'error': for (const [dt, a, b] of [[0, 55, 56], [.13, 50, 51]]) { tn('sawtooth', m(a), dt, .26, .17, { lp: 900, d: .26 }); tn('sawtooth', m(b), dt, .26, .15, { lp: 900, d: .26 }); } tn('sine', 90, 0, .16, .35, { to: 50 }); break;
      case 'select': bl(76, 0, .3, .26); bl(81, .06, .4, .26); break;
      case 'confirm': arp([72, 76, 79, 84], .05, .5, .22, pl); tn('sine', m(48), 0, .4, .3); break;
      case 'open': nzz(0, .3, .16, { type: 'bandpass', f: 300, to: 3200, q: 1.2, a: .15 }); tn('sine', 400, 0, .25, .12, { to: 900, a: .1 }); break;
      case 'close': nzz(0, .24, .14, { type: 'bandpass', f: 3000, to: 300, q: 1.2, a: .05 }); tn('sine', 900, 0, .2, .12, { to: 400 }); break;
      case 'toast': bl(84, 0, .5, .24); bl(91, .09, .7, .22); break;
      case 'chat_send': tn('sine', 500, 0, .12, .3, { to: 1100 }); nzz(0, .05, .07, { type: 'highpass', f: 4000 }); break;
      case 'chat_recv': tn('triangle', 880, 0, .09, .25); tn('triangle', 1175, .07, .12, .22); break;
      case 'typing': nzz(0, .03, .6, { type: 'bandpass', f: 1800 + rnd() * 1800, q: 2 }); break;
      case 'tick': nzz(0, .03, .45, { type: 'bandpass', f: 1300, q: 6 }); tn('sine', 900, 0, .03, .1); break;
      case 'tick_urgent': tn('square', 1400, 0, .05, .13, { lp: 2600 }); tn('square', 1750, .09, .06, .14, { lp: 2600 }); nzz(0, .03, .2, { type: 'bandpass', f: 2000, q: 5 }); break;
      case 'round_start': chord([50, 57, 62, 65], 0, 1.3, .6, 1400); thump(D, t, .7 * V, 70); arp([62, 65, 69, 74], .11, 1, .2); nzz(0, .9, .1, { type: 'bandpass', f: 200, to: 2500, q: 1, a: .5 }, W); break;
      case 'intel': arp([79, 83, 86, 91], .06, .6, .22); nzz(.15, .4, .05, { type: 'highpass', f: 6000, a: .1 }, W); break;
      case 'share': nzz(0, .22, .12, { type: 'bandpass', f: 500, to: 3000, q: 1, a: .08 }); tn('sine', 700, 0, .15, .2, { to: 1200 }); bl(84, .1, .5, .22); bl(91, .2, .6, .2); break;
      case 'lie': tn('sawtooth', m(45), 0, .6, .15, { lp: 450, to: m(44), glide: .6, am: [7, .5] }, W); tn('sawtooth', m(51), 0, .6, .12, { lp: 450, to: m(49), glide: .6, am: [7, .5] }, W); nzz(0, .5, .1, { type: 'bandpass', f: 900, q: 3, a: .2 }, W); break;
      case 'vote': tn('sine', 230, 0, .09, .5, { to: 110 }); nzz(0, .03, .2, { type: 'bandpass', f: 900 }); bl(88, .07, .3, .18); break;
      case 'vote_pass': arp([72, 76, 79, 84, 88], .06, .6, .22); break;
      case 'vote_fail': arp([67, 62, 58], .13, .5, .24, (mi, dt, du, v) => tone(W, 'triangle', m(mi), t + dt, du, v * V, { lp: 1400, d: du })); break;
      case 'secret_reveal': nzz(0, .85, .18, { type: 'bandpass', f: 200, to: 6000, q: 1, a: .7 }, W); tn('sine', 300, 0, .85, .16, { to: 1400, a: .6 }, W); thump(W, t + .85, .6 * V, 75); bl(84, .85, 1, .26); bl(91, .88, 1, .22); break;
      case 'dice': { let dt = 0, g = .045; for (let i = 0; i < 8; i++) { nzz(dt, .03, .35, { type: 'bandpass', f: 1800 + rnd() * 2500, q: 3 }); tn('sine', 300 + rnd() * 500, dt, .03, .12); dt += g; g *= 1.28; } nzz(dt, .05, .5, { type: 'bandpass', f: 1500, q: 2 }); tn('sine', 180, dt, .08, .3, { to: 120 }); break; }
      case 'resolve_good': arp([60, 64, 67, 71, 76, 79], .07, .8, .22); chord([48, 55, 59, 64], 0, 1.3, .5, 1500); break;
      case 'resolve_bad': arp([64, 63, 60, 55], .15, .8, .22, (mi, dt, du, v) => tone(W, 'triangle', m(mi), t + dt, du, v * V, { lp: 1200, d: du })); thump(D, t, .6 * V, 60); chord([40, 46, 52], 0, 1.3, .4, 600); break;
      case 'achievement': arp([72, 76, 79, 84], .08, .8, .22); arp([84, 88, 91, 96], 0, 1.4, .18, (mi, dt, du, v) => bell(W, mi, t + .42, du, v * V)); nzz(.4, .8, .05, { type: 'highpass', f: 7000, a: .1 }, W); break;
      case 'grade_s': chord([50, 57, 62, 66, 69], 0, 2, .7, 2200); arp([74, 78, 81, 86, 90, 93], .07, 1.2, .22); thump(D, t, .8 * V, 70); nzz(.4, 1, .07, { type: 'highpass', f: 6000, a: .2 }, W); break;
      case 'grade_low': [58, 57, 56, 55].forEach((mi, i) => tn('sawtooth', m(mi), i * .3, i === 3 ? 1.1 : .3, .18, { lp: 800, to: m(mi - (i === 3 ? 1.5 : .3)), glide: i === 3 ? 1.1 : .3, am: i === 3 ? [6, .3] : null, a: .03 }, W)); break;
      case 'water_warn': nzz(0, .9, .35, { f: 180, a: .3 }); for (let i = 0; i < 6; i++) { const f = 300 + rnd() * 300; tn('sine', f, .1 + i * .1, .1, .12, { to: f * 2.2 }); } tn('sine', 440, 0, .3, .14, null, W); tn('sine', 349, .3, .4, .14, null, W); break;
      case 'thunder': nzz(0, .1, .5, { type: 'highpass', f: 1800 }); nzz(.02, 2.8, .9, { f: 2400, to: 90, a: .08, q: .5, am: [3.5, .35] }, W); tn('sine', 58, .05, 2.2, .55, { to: 28, a: .1 }); break;
      case 'rumble': nzz(0, 2.2, .7, { f: 150, a: .5, am: [5, .4] }); tn('sine', 42, 0, 2.2, .5, { a: .5, am: [3, .4] }); break;
      case 'drip': { const f = 1700 + rnd() * 700; tn('sine', f, 0, .09, .3, { to: f * .45 }, W); tn('sine', f * 1.5, .02, .06, .08, { to: f * .6 }, W); break; }
      case 'radio_on': nzz(0, .015, .5, { type: 'highpass', f: 2500 }); nzz(.02, .22, .22, { type: 'bandpass', f: 1800, q: 1.5, a: .02 }); tn('square', 1100, .26, .07, .1, { lp: 2600 }); break;
      case 'radio_static': for (let i = 0; i < 14; i++) nzz(i * .07, .07, .06 + rnd() * .14, { type: 'bandpass', f: 900 + rnd() * 2400, q: 1 + rnd() * 3 }); break;
      case 'heal': arp([67, 71, 74, 79, 83], .09, .8, .2, (mi, dt, du, v) => tone(W, 'sine', m(mi), t + dt, du, v * V * 1.3, { a: .01 })); chord([55, 59, 62], 0, 1.2, .4, 1800); break;
      case 'rope': nzz(0, .4, .45, { type: 'bandpass', f: 400, to: 1200, q: 4, a: .08 }); tn('sawtooth', 120, 0, .4, .12, { lp: 400, to: 150, am: [18, .5] }); break;
      case 'plank': tn('sine', 180, 0, .13, .5, { to: 90 }); nzz(0, .06, .3, { type: 'bandpass', f: 700, q: 2 }); tn('sine', 150, .1, .13, .4, { to: 80 }); nzz(.1, .05, .22, { type: 'bandpass', f: 600, q: 2 }); break;
      case 'rescue': chord([48, 55, 60, 64, 72], 0, 2, .6, 1800); arp([72, 76, 79, 84, 88, 91], .1, 1.2, .22); break;
      case 'win': arp([62, 66, 69, 74, 78, 81, 86], .09, 1.2, .22); chord([50, 57, 62, 66], .3, 1.8, .6, 2000); thump(D, t, .6 * V, 80); break;
      case 'lose': arp([69, 65, 62, 57, 50], .22, 1.2, .2, (mi, dt, du, v) => tone(W, 'sawtooth', m(mi), t + dt, du, v * V, { lp: 800, d: du, a: .02 })); tn('sine', m(33), 0, 2, .3, { a: .3 }, W); break;
      case 'cable': nzz(0, .8, .2, { type: 'bandpass', f: 320, to: 210, q: 5, a: .1 }); tn('sawtooth', 90, 0, .8, .08, { lp: 300, am: [11, .4], a: .1 }); tn('sine', 600, .1, .6, .035, { to: 660, a: .2 }); break;
      case 'jump': tn('sine', 280, 0, .13, .3, { to: 640 }); nzz(0, .03, .08, { type: 'highpass', f: 3000 }); break;
      case 'land': tn('sine', 120, 0, .13, .5, { to: 55 }); nzz(0, .07, .2, { f: 500 }); break;
      case 'step': nzz(0, .05, .35, { f: 450 + rnd() * 450, q: .5 }); tn('sine', 85 + rnd() * 20, 0, .05, .12); break;
      case 'splash': nzz(0, .8, .5, { type: 'bandpass', f: 1500, to: 300, q: 1.2, a: .02 }); for (let i = 0; i < 5; i++) { const f = 400 + rnd() * 500; tn('sine', f, .05 + i * .09, .09, .1, { to: f * 2 }, W); } break;
      case 'swim': for (let i = 0; i < 2; i++) nzz(i * .3, .35, .22, { type: 'bandpass', f: 600, to: 1500, q: 1.2, a: .12 }); tn('sine', 500, .2, .08, .08, { to: 1100 }); break;
      case 'interact': arp([76, 83], .07, .5, .22, pl); nzz(.05, .3, .04, { type: 'highpass', f: 6000, a: .05 }, W); break;
      case 'gasp': nzz(0, .32, .3, { type: 'bandpass', f: 600, to: 1700, q: 1, a: .1 }, W); tn('sine', 420, 0, .3, .05, { to: 640, a: .1 }); nzz(.4, .08, .05, { type: 'bandpass', f: 900, q: 1 }); break;
      case 'drown': nzz(0, 1.6, .3, { f: 700, to: 150, a: .1, q: .6 }, W); for (let i = 0; i < 6; i++) { const f = 500 - i * 45 + rnd() * 80; tn('sine', f, .1 + i * .22, .14, .12, { to: f * 1.8, a: .02 }, W); } tn('sine', 90, .2, 1.4, .25, { to: 40, a: .3 }); break;
      case 'ability': arp([79, 84, 88, 91], .06, .6, .2); nzz(0, .35, .08, { type: 'bandpass', f: 800, to: 3200, q: 1, a: .15 }, W); tn('sine', 300, 0, .3, .1, { to: 900, a: .1 }); break;
      case 'gate_open': nzz(0, 1.8, .35, { f: 300, to: 120, a: .4, q: .6, am: [7, .4] }); tn('sawtooth', 70, 0, 1.8, .12, { lp: 260, to: 95, glide: 1.6, a: .4, am: [9, .4] }); tn('sine', 48, 0, 1.8, .3, { a: .4 }); bl(72, 1.5, 1, .2); bl(79, 1.6, 1.2, .18); break;
      case 'help': for (let i = 0; i < 2; i++) { tn('triangle', 600, i * .42, .32, .2, { to: 860, a: .03, lp: 2400 }, W); tn('sine', 1200, i * .42, .3, .04, { to: 1720, a: .03 }, W); } break;
      case 'dialogue_open': nzz(0, .16, .08, { type: 'bandpass', f: 500, to: 1800, q: 1, a: .06 }); bl(79, .05, .35, .2); bl(86, .12, .45, .16); break;
      default: return false;
    }
    return true;
  }
  return { ctx, an, music, sfx, talk, pump, setIntensity, nodes: { lim, mlp, sfxLP, muteG, musicVol, sfxVol, duck, out, comp }, get cur() { return cur; }, get intensity() { return intensity; } };
}

/* ---------------- tiempo real: estado, desbloqueo, voz, persistencia ---------------- */
let ctx = null, core = null, want = null, pumpTimer = null, hooked = false, voiceOK = false, speaking = 0, utter = null, speakGuard = null, lastSfx = {}, warned = {};
let S = { muted: false, vols: { music: .6, sfx: .8, voice: 1 }, master: .4 };
try { const j = JSON.parse(localStorage.getItem(KEY) || 'null'); if (j) { S.muted = !!j.muted; if (j.master >= 0 && j.master <= 1) S.master = +j.master; for (const k in S.vols) if (j.vols && j.vols[k] >= 0 && j.vols[k] <= 1) S.vols[k] = +j.vols[k]; } } catch (e) { }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };
const running = () => !!ctx && ctx.state === 'running';

function applyGains() {
  if (!core) return; const t = ctx.currentTime, N = core.nodes;
  N.muteG.gain.setTargetAtTime(S.muted ? 0 : 1, t, .04); N.musicVol.gain.setTargetAtTime(S.vols.music, t, .05); N.sfxVol.gain.setTargetAtTime(S.vols.sfx, t, .05); N.out.gain.setTargetAtTime(S.master, t, .05);
}
function ensure() {
  if (core) return core;
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ctx = new AC({ latencyHint: 'interactive' }); core = Core(ctx, S.master); applyGains();
    ctx.onstatechange = () => { if (running()) onRunning(); };
    pumpTimer = setInterval(() => { if (running()) { core.pump(ctx.currentTime + .6); } else if (ctx.state === 'interrupted') ctx.resume().catch(() => { }); }, 80);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx && ctx.state !== 'running') ctx.resume().catch(() => { }); });
  } catch (e) { ctx = core = null; }
  return core;
}
function onRunning() { if (want && (!core.cur || core.cur.name !== want)) core.music(want); }
function unlock() {
  if (!ensure()) return Promise.resolve(false);
  const p = ctx.state === 'running' ? Promise.resolve() : ctx.resume().catch(() => { });
  return p.then(() => { if (running()) { onRunning(); unhook(); } return running(); });
}
// Causa del "no suena" de v2: solo escuchaba 'pointerdown' (en Chrome un pointerdown de raton NO cuenta como gesto de activacion; si
// hay que pulsar teclas/soltar el boton, el contexto seguia suspendido) y sfx() descartaba todo en silencio hasta entonces.
const GEST = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend', 'keydown', 'keyup'];
function hook() { if (hooked || typeof window === 'undefined') return; hooked = true; GEST.forEach(e => window.addEventListener(e, unlock, true)); }
function unhook() { if (!hooked) return; hooked = false; GEST.forEach(e => window.removeEventListener(e, unlock, true)); }

function music(track) {
  want = track || null; if (!ensure()) return false;
  if (!running()) { hook(); return true; }
  if (core.cur && core.cur.name === want) return true; return core.music(want);
}
function sfx(name, o) {
  if (!ensure()) return false; if (!running()) { hook(); unlock(); return false; }
  if (S.muted) return false; const t = ctx.currentTime, th = THROTTLE[name] || 0; if (th && lastSfx[name] > t - th) return false; lastSfx[name] = t;
  const ok = core.sfx(name, o); if (!ok && !warned[name]) { warned[name] = 1; try { console.warn('Sound.sfx: nombre desconocido', name); } catch (e) { } } return ok;
}
function setDuck(on) { if (core) core.nodes.duck.gain.setTargetAtTime(on ? .3 : 1, ctx.currentTime, .15); }

/* voz: mejor voz es-ES disponible, con fallback silencioso */
function pickVoice() {
  let vs = []; try { vs = speechSynthesis.getVoices() || []; } catch (e) { }
  const es = vs.filter(v => /^es([-_]|$)/i.test(v.lang)); if (!es.length) return null;
  const sc = v => (/^es[-_]ES/i.test(v.lang) ? 50 : /^es[-_](MX|US|419|AR)/i.test(v.lang) ? 12 : 0) + (/natural|neural|online/i.test(v.name) ? 40 : 0) + (/google/i.test(v.name) ? 25 : 0) + (/microsoft/i.test(v.name) ? 20 : 0) + (/premium|enhanced|siri/i.test(v.name) ? 20 : 0) - (/compact|espeak/i.test(v.name) ? 30 : 0) + (v.localService ? 0 : 3);
  return es.sort((a, b) => sc(b) - sc(a))[0];
}
const WHO = { guia: [.88, .98], medica: [1.18, 1], ing: [.72, 1.02], lia: [1.3, 1.05], director: [.62, .9] };
function speak(text, o) {
  o = o || {}; text = String(text || '').trim();
  if (!text || S.muted || S.vols.voice <= 0 || typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return false;
  try {
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text), v = pickVoice(), w = WHO[o.who] || [1, 1]; u.lang = 'es-ES'; if (v) { u.voice = v; u.lang = v.lang; }
    u.pitch = clamp(o.pitch || w[0], .1, 2); u.rate = clamp(o.rate || w[1], .5, 1.6); u.volume = clamp(S.vols.voice * (.3 + .7 * S.master), 0, 1); // v5: voz acompasada al volumen maestro (def .4 -> .58) utter = u; const id = ++speaking;
    const end = () => { if (id === speaking) { speaking = 0; setDuck(false); clearTimeout(speakGuard); } };
    u.onstart = () => { if (id === speaking) setDuck(true); }; u.onend = u.onerror = end;
    clearTimeout(speakGuard); speakGuard = setTimeout(end, 2500 + text.length * 90); // si el motor nunca avisa (sin voces), no dejar la musica atenuada
    speechSynthesis.resume(); speechSynthesis.speak(u); return true;
  } catch (e) { return false; }
}
function stopSpeak() { try { speechSynthesis.cancel(); } catch (e) { } speaking = 0; clearTimeout(speakGuard); setDuck(false); }

const Sound = {
  unlock, music, sfx, speak, stopSpeak, tracks: Object.keys(TR), sfxNames: SFX_NAMES.slice(),
  setIntensity(x) { if (ensure()) core.setIntensity(x); else return; },
  mute(b) { S.muted = b === undefined ? true : !!b; if (S.muted) stopSpeak(); applyGains(); save(); return S.muted; },
  toggle() { return Sound.mute(!S.muted); },
  setVolume(v) { S.master = clamp(+v || 0, 0, 1); applyGains(); save(); return S.master; },
  getVolume() { return S.master; },
  talk(role, mood) {
    if (!ensure() || !running() || S.muted) return false; const t = ctx.currentTime; if (Sound._lt > t - .06) return false; Sound._lt = t;
    try { core.talk(role, mood); return true; } catch (e) { return false; }
  },
  _lt: 0,
  setVol(k, v) { if (!(k in S.vols)) return false; S.vols[k] = clamp(+v || 0, 0, 1); applyGains(); save(); return true; },
  state() {
    return { running: running(), ctxState: ctx ? ctx.state : 'none', muted: S.muted, music: core && core.cur ? core.cur.name : null, want, intensity: core ? core.intensity : 0,
      vols: Object.assign({}, S.vols), master: S.master, speaking: !!speaking, voice: (() => { try { const v = pickVoice(); return v ? v.name + ' (' + v.lang + ')' : null; } catch (e) { return null; } })() };
  },
  level() { if (!core) return 0; const a = new Float32Array(1024); core.an.getFloatTimeDomainData(a); let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * a[i]; return Math.sqrt(s / a.length); }, // RMS de la salida real (VU / pruebas)
  /* Render offline (tests): kind 'music'|'sfx' -> Promise<AudioBuffer> */
  render(kind, name, o) {
    o = o || {}; const sec = o.seconds || (kind === 'music' ? 20 : 3), sr = o.sampleRate || 44100, OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const oc = new OC(2, Math.ceil(sec * sr), sr), c = Core(oc, o.master);
    if (o.burst) o.burst.forEach(b => c.sfx(b[0], null, b[1]));
    if (kind === 'music') { if (o.intensity != null) c.setIntensity(o.intensity); c.music(name, { offline: true, at: 0, x: o.intensity }); c.pump(sec + .2); }
    else if (o.burst) { }
    else if (kind === 'talk') c.talk(name, o.mood, o.at || 0);
    else c.sfx(name, o.opts, o.at || 0);
    return oc.startRendering();
  },
  _ctx: () => ctx,
  _TR: TR
};
window.Sound = Sound;
hook(); // escucha el primer gesto desde la carga, sin depender de que la UI llame a unlock()
})();
