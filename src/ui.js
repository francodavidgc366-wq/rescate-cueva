/* ui.js - Rescate en la Cueva v2. DOM + cinematicas + audio chiptune. window.UI */
(function () {
'use strict';
const W = 320, H = 180;
const $ = (t, c, p, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; if (p) p.appendChild(e); return e; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => { t = clamp(t, 0, 1); return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
const mod = (a, n) => ((a % n) + n) % n;
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgb = c => 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const ev = {};
const on = (e, f) => { (ev[e] = ev[e] || []).push(f); };
const emit = (e, d) => { (ev[e] || []).forEach(f => { try { f(d); } catch (x) { console.error(x); } }); };

/* ================= AUDIO (WebAudio chiptune, todo por codigo) ================= */
const Aud = (() => {
  let ac = null, master, musG, sfxG, delay, noiseB, windG, windF, trG = null, cur = null, curName = null, want = null, timer = null, step = 0, nextT = 0, sid = 0;
  let muted = store.get('rcv2_mute') === '1', vol = parseFloat(store.get('rcv2_vol')); if (!(vol >= 0 && vol <= 1)) vol = .7;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const pw = {};
  const pulse = d => { if (pw[d]) return pw[d]; const n = 32, re = new Float32Array(n), im = new Float32Array(n); for (let i = 1; i < n; i++) re[i] = 2 / (i * Math.PI) * Math.sin(i * Math.PI * d); return pw[d] = ac.createPeriodicWave(re, im); };
  function init() {
    if (ac) return ac;
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      ac = new C(); const comp = ac.createDynamicsCompressor(); master = ac.createGain(); musG = ac.createGain(); sfxG = ac.createGain();
      musG.gain.value = .55; sfxG.gain.value = .9; master.gain.value = muted ? 0 : vol;
      musG.connect(master); sfxG.connect(master); master.connect(comp); comp.connect(ac.destination);
      // eco calido para arpegios
      delay = ac.createDelay(1); delay.delayTime.value = .3; const fb = ac.createGain(); fb.gain.value = .36; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
      delay.connect(lp); lp.connect(fb); fb.connect(delay); const wet = ac.createGain(); wet.gain.value = .5; lp.connect(wet); wet.connect(musG);
      noiseB = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = noiseB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      // viento continuo
      const ws = ac.createBufferSource(); ws.buffer = noiseB; ws.loop = true; windF = ac.createBiquadFilter(); windF.type = 'bandpass'; windF.frequency.value = 500; windF.Q.value = .8; windG = ac.createGain(); windG.gain.value = 0;
      ws.connect(windF); windF.connect(windG); windG.connect(master); ws.start();
      timer = setInterval(tick, 40);
    } catch (e) { ac = null; }
    return ac;
  }
  function osc(type, f, t, d, v, dest, o) {
    o = o || {}; const os = ac.createOscillator(), g = ac.createGain();
    if (typeof type === 'object') os.setPeriodicWave(type); else os.type = type;
    os.frequency.setValueAtTime(f, t); if (o.to) os.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + d);
    const a = o.a || .005; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    let n = os; if (o.lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; os.connect(fl); n = fl; }
    n.connect(g); g.connect(dest || sfxG); if (o.send) g.connect(delay); os.start(t); os.stop(t + d + .05);
  }
  function noise(t, d, v, dest, o) {
    o = o || {}; const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter(); s.buffer = noiseB; s.loop = true;
    f.type = o.type || 'lowpass'; f.frequency.setValueAtTime(o.f || 1000, t); if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.to), t + d); f.Q.value = o.q || 1;
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + (o.a || .005)); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    s.connect(f); f.connect(g); g.connect(dest || sfxG); s.start(t, Math.random()); s.stop(t + d + .05);
  }
  // ---- musica: secuenciador de corcheas con lookahead ----
  const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10], DOR = [0, 2, 3, 5, 7, 9, 10], PEN = [0, 2, 4, 7, 9];
  const TR = {
    title: { bpm: 76, root: 57, sc: PEN, prog: [0, 3, 4, 2], arp: [0, 2, 1, 2, 0, 2, 1, 3], duty: .25, bass: [0, -1, -1, -1, 0, -1, -1, -1], lead: .35 },
    intro: { bpm: 62, root: 55, sc: PEN, prog: [0, 4, 3, 4], arp: [0, -1, 1, -1, 2, -1, 1, -1], duty: .125, bass: [0, -1, -1, -1, -1, -1, -1, -1], lead: .3 },
    r1: { bpm: 88, root: 60, sc: MAJ, prog: [0, 5, 3, 4], arp: [0, 1, 2, 1, 3, 2, 1, 2], duty: .25, bass: [0, -1, 0, -1, 0, -1, 0, -1], lead: .4 },
    r2: { bpm: 92, root: 57, sc: MIN, prog: [0, 5, 2, 6], arp: [0, 2, 1, 3, 0, 2, 1, 2], duty: .25, bass: [0, -1, -1, 0, 0, -1, -1, 0], lead: .35, hat: 1 },
    r3: { bpm: 100, root: 62, sc: DOR, prog: [0, 3, 0, 4], arp: [0, 1, 2, 3, 2, 1, 2, 1], duty: .125, bass: [0, -1, 0, -1, 0, -1, 0, 0], lead: .3, hat: 1, kick: 1 },
    r4: { bpm: 108, root: 54, sc: MIN, prog: [0, 5, 3, 6], arp: [0, 2, 3, 2, 1, 3, 2, 1], duty: .125, bass: [0, 0, -1, 0, 0, -1, 0, -1], lead: .25, hat: 1, kick: 1 },
    r5: { bpm: 116, root: 60, sc: MAJ, prog: [0, 4, 5, 3], arp: [0, 2, 1, 3, 2, 3, 1, 2], duty: .25, bass: [0, -1, 0, 0, 0, -1, 0, 0], lead: .5, hat: 1, kick: 1 },
    win: { bpm: 92, root: 62, sc: MAJ, prog: [0, 4, 5, 3], arp: [0, 1, 2, 3, 2, 1, 2, 3], duty: .25, bass: [0, -1, -1, -1, 0, -1, -1, -1], lead: .55 },
    lose: { bpm: 56, root: 52, sc: MIN, prog: [0, 5, 3, 4], arp: [0, -1, -1, 1, -1, -1, 2, -1], duty: .125, bass: [0, -1, -1, -1, -1, -1, -1, -1], lead: .2 }
  };
  function play(s, t, tr, g, rnd) {
    const sd = 60 / tr.bpm / 2, n = tr.sc.length, bar = Math.floor(s / 8) % tr.prog.length, d = tr.prog[bar], ch = [d, d + 2, d + 4, d + 7];
    const note = k => tr.root + tr.sc[mod(k, n)] + 12 * Math.floor(k / n);
    if (s % 8 === 0) for (let i = 0; i < 3; i++) osc('triangle', mtof(note(ch[i])), t, sd * 8, .05, g, { a: .5, lp: 1100 });
    if (tr.bass[s % 8] >= 0) osc('triangle', mtof(note(d) - 24), t, sd * 1.9, .17, g, { lp: 500 });
    const a = tr.arp[s % 8]; if (a >= 0) osc(pulse(tr.duty), mtof(note(ch[a]) + 12), t, sd * 1.4, .04, g, { send: 1, lp: 3200 });
    if (tr.lead && (s % 8 === 2 || s % 8 === 6) && rnd() < tr.lead) osc(pulse(.25), mtof(note(d + [0, 2, 4, 1, 3, 5][Math.floor(rnd() * 6)]) + 24), t, sd * 2.2, .03, g, { send: 1, a: .01, lp: 2800 });
    if (tr.kick && (s % 8 === 0 || s % 8 === 4)) osc('sine', 120, t, .14, .2, g, { to: 42 });
    if (tr.hat && s % 2) noise(t, .04, .035, g, { type: 'highpass', f: 7000 });
    if (tr.kick && s % 8 === 4) noise(t, .1, .05, g, { type: 'bandpass', f: 1800 });
  }
  let rnd = rng(1);
  function tick() {
    if (!ac || !cur || ac.state !== 'running') return;
    const sd = 60 / cur.bpm / 2; if (nextT < ac.currentTime) nextT = ac.currentTime + .05;
    while (nextT < ac.currentTime + .25) { play(step, nextT, cur, trG, rnd); nextT += sd; step++; }
    if (windF) windF.frequency.setTargetAtTime(350 + 250 * Math.sin(ac.currentTime * .31) + 120 * Math.sin(ac.currentTime * .9), ac.currentTime, .3);
  }
  function setTrack(name) {
    want = name; if (!ac || !TR[name] || name === curName) return; if (ac.state !== 'running') { ac.resume && ac.resume(); return; }
    const t = ac.currentTime; if (trG) { trG.gain.cancelScheduledValues(t); trG.gain.setTargetAtTime(0, t, .4); const old = trG; setTimeout(() => { try { old.disconnect(); } catch (e) { } }, 2500); }
    trG = ac.createGain(); trG.gain.value = 0; trG.gain.setTargetAtTime(1, t + .05, .6); trG.connect(musG);
    cur = TR[name]; curName = name; step = 0; nextT = t + .1; rnd = rng(name.length * 977 + name.charCodeAt(name.length - 1));
  }
  function stopMusic() { want = null; curName = null; cur = null; if (trG && ac) trG.gain.setTargetAtTime(0, ac.currentTime, .3); }
  function wind(l) { if (init() && windG) windG.gain.setTargetAtTime(clamp(l, 0, 1) * .22, ac.currentTime, .6); }
  function unlock() { if (!init()) return; if (ac.state !== 'running') ac.resume().then(() => { if (want) { curName = null; setTrack(want); } }); else if (want && !curName) setTrack(want); }
  function setMute(b) { muted = !!b; store.set('rcv2_mute', muted ? '1' : '0'); if (ac) master.gain.setTargetAtTime(muted ? 0 : vol, ac.currentTime, .05); emit('mute', muted); }
  function setVol(v) { vol = clamp(v, 0, 1); store.set('rcv2_vol', String(vol)); if (ac && !muted) master.gain.setTargetAtTime(vol, ac.currentTime, .05); }
  function sfx(n, o) {
    if (muted || !init() || ac.state !== 'running') return; o = o || {}; const t = ac.currentTime, r = Math.random;
    const arp = (ns, tp, v, gap, dur) => ns.forEach((m, i) => osc(tp, mtof(m), t + i * gap, dur || gap * 2.2, v, sfxG, { send: 1, lp: 4000 }));
    switch (n) {
      case 'jump': osc('square', 280, t, .15, .09, sfxG, { to: 760, lp: 3000 }); break;
      case 'land': noise(t, .09, .12, sfxG, { f: 500, to: 120 }); break;
      case 'water': noise(t, 1.1, .3, sfxG, { type: 'bandpass', f: 1400, to: 260, q: 2, a: .15 }); for (let i = 0; i < 5; i++) osc('sine', 300 + r() * 500, t + .1 + i * .11, .1, .08, sfxG, { to: 900 + r() * 400 }); break;
      case 'decision': arp([72, 76, 79, 84], 'square', .07, .065); osc('triangle', mtof(60), t, .5, .15); break;
      case 'select': osc('square', 880, t, .05, .05, sfxG, { lp: 4000 }); break;
      case 'click': osc('square', 520, t, .07, .07, sfxG, { to: 900, lp: 4000 }); break;
      case 'back': osc('square', 700, t, .07, .06, sfxG, { to: 380, lp: 3000 }); break;
      case 'error': osc('square', 150, t, .12, .1, sfxG, { lp: 900 }); osc('square', 110, t + .13, .16, .1, sfxG, { lp: 900 }); break;
      case 'blip': osc('square', o.f || 500 + r() * 90, t, .035, .045, sfxG, { lp: 2400 }); break;
      case 'drip': osc('sine', 1500, t, .1, .09, sfxG, { to: 600, send: 1 }); break;
      case 'radio': for (let i = 0; i < 4; i++) noise(t + i * .07, .06, .1, sfxG, { type: 'bandpass', f: 1500 + r() * 1500, q: 3 }); break;
      case 'flick': noise(t, .03, .12, sfxG, { type: 'highpass', f: 2000 }); osc('square', 90, t, .04, .05, sfxG); break;
      case 'thunder': noise(t, .1, .35, sfxG, { type: 'highpass', f: 1500 }); noise(t, 2.6, .55, sfxG, { f: 2200, to: 70, a: .08 }); osc('sine', 60, t, 2, .3, sfxG, { to: 28, a: .1 }); break;
      case 'win': arp([67, 71, 74, 79, 83, 86], 'square', .07, .1, .5); break;
      case 'lose': arp([64, 60, 57, 52], 'triangle', .14, .22, .6); break;
      case 'cable': noise(t, .6, .06, sfxG, { type: 'bandpass', f: 220, to: 160, q: 4 }); break;
    }
  }
  return { init, unlock, setTrack, stopMusic, wind, sfx, setMute, setVol, toggle() { setMute(!muted); return muted; }, get muted() { return muted; }, get vol() { return vol; }, tracks: Object.keys(TR) };
})();

/* ================= ESCENA PROCEDURAL (cielo, montanas, nubes, nieve, teleferico) ================= */
const HY = 118, WD = 1024;
const SKY = {
  dusk: [[0, '#1d1450'], [.25, '#4a2a80'], [.5, '#9a3f93'], [.68, '#e0586f'], [.82, '#ff8f4d'], [.93, '#ffc55c'], [1, '#ffe79a']],
  storm: [[0, '#0c0c20'], [.4, '#1c1c3e'], [.7, '#36305a'], [.88, '#5c3c58'], [.96, '#8c5450'], [1, '#b57a58']],
  dawn: [[0, '#34428f'], [.3, '#6f62bd'], [.55, '#d68ab4'], [.75, '#ffb68c'], [.9, '#ffdb8c'], [1, '#fff2c0']]
};
for (const k in SKY) SKY[k] = SKY[k].map(s => [s[0], hex(s[1])]);
function gradAt(st, t) { if (t <= st[0][0]) return st[0][1]; for (let i = 1; i < st.length; i++) if (t <= st[i][0]) return mix(st[i - 1][1], st[i][1], (t - st[i - 1][0]) / (st[i][0] - st[i - 1][0])); return st[st.length - 1][1]; }
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
const skyCache = {};
function getSky(pal, storm) {
  const q = Math.round(storm * 16), key = pal + q; if (skyCache[key]) return skyCache[key];
  const c = mk(W, 250), g = c.getContext('2d'), id = g.createImageData(W, 250), B = 18, cols = [];
  for (let i = 0; i <= B; i++) cols.push(mix(gradAt(SKY[pal], i / B), gradAt(SKY.storm, i / B), q / 16 * .96));
  for (let y = 0; y < 250; y++) { const tt = Math.min(1, y / 150) * B, bs = Math.floor(tt), fr = tt - bs; for (let x = 0; x < W; x++) { const b = Math.min(B, bs + (fr > BAY[(y & 3) * 4 + (x & 3)] ? 1 : 0)), p = (y * W + x) * 4, cc = cols[b]; id.data[p] = cc[0]; id.data[p + 1] = cc[1]; id.data[p + 2] = cc[2]; id.data[p + 3] = 255; } }
  g.putImageData(id, 0, 0); return skyCache[key] = c;
}
const M = { s: 0, pal: 'dusk' };
// color dependiente del estado de animo: duskHex -> mezcla hacia tormenta (gris azulado) o amanecer (calido)
function tone(h, k) { let c = hex(h); if (M.pal === 'dawn') c = mix(c, [255, 226, 190], .3); const k2 = k || 0; return mix(c, [74 - 18 * k2, 76 - 18 * k2, 112 - 20 * k2], M.s * .85); }
const disc = (g, cx, cy, r, col) => { g.fillStyle = col; for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + r * .5)); g.fillRect(cx - w, cy + y, w * 2 + 1, 1); } };
function line(g, x0, y0, x1, y1, w) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), w, w); }
function ridge(seed) { const R = rng(seed), f = [2, 5, 11, 23], a = [1, .55, .28, .14], ph = f.map(() => R() * 6.28), o = new Float32Array(WD); for (let x = 0; x < WD; x++) { let v = 0; for (let i = 0; i < 4; i++) v += a[i] * (1 - Math.abs(Math.sin(2 * Math.PI * f[i] * x / WD + ph[i]))); o[x] = v / 1.97; } return o; }
const LAY = [
  { par: .1, base: 112, amp: 36, r: ridge(7), rock: ['#e2829a', '#b4639f', '#7e4a99'], snow: ['#ffe0b8', '#f0b7c8', '#c9a0d8'], sd: .8 },
  { par: .25, base: 126, amp: 46, r: ridge(19), rock: ['#b9577f', '#8a4a8c', '#5a3a7e'], snow: ['#ffd0a8', '#e0a0b8', '#a98ac8'], sd: .65 },
  { par: .5, base: 146, amp: 50, r: ridge(31), rock: ['#7a3f78', '#52346f', '#2f2257'], snow: ['#f8c8b0', '#c898c0', '#8a78b8'], sd: .5 }
];
LAY.forEach(l => { l.ys = Array.from(l.r, v => l.base - l.amp * Math.pow(v, 1.6) * 1.5); });
function drawLayer(g, l, i, cx, cy) {
  const off = Math.floor(cx * l.par), dy = Math.round(cy * l.par * .9), rc = l.rock.map(c => rgb(tone(c, i))), sc = l.snow.map(c => rgb(tone(c, i)));
  for (let sx = 0; sx < W; sx++) {
    const wx = mod(sx + off, WD), y = Math.round(l.ys[wx]) + dy, sl = l.ys[(wx + 9) % WD] - l.ys[mod(wx - 9, WD)], k = sl > 5 ? 0 : sl > -5 ? 1 : 2;
    const sd = Math.max(0, (l.base - l.ys[wx]) - l.amp * .3) * l.sd + ((wx * 7 + (wx >> 2)) % 3);
    if (sd > 0) { g.fillStyle = sc[k]; g.fillRect(sx, y, 1, Math.ceil(sd)); }
    const y0 = y + Math.ceil(sd); g.fillStyle = rc[k]; g.fillRect(sx, y0, 1, Math.min(8, H - y0));
    for (let yy = y0 + 8, j = 1; yy < H; yy += 8, j++) { const s2 = l.ys[(wx + 9 - j * 5 + WD) % WD] - l.ys[mod(wx - 9 - j * 5, WD)], k2 = s2 > 5 ? 0 : s2 > -5 ? 1 : 2; g.fillStyle = rc[k2]; g.fillRect(sx, yy, 1, 8); }
  }
  // bruma en el valle
  const hz = rgb(mix(tone('#ffb070', 0), [200, 200, 230], M.s * .3)); g.fillStyle = hz; g.globalAlpha = .14; g.fillRect(0, l.base + dy - 8, W, H); g.globalAlpha = .12; g.fillRect(0, l.base + dy + 14, W, H); g.globalAlpha = 1;
}
const CL = [[], [], []];
(() => { const R = rng(3); [[8, .1, 40, 80, 22, 8], [7, .25, 36, 90, 34, 12], [5, .6, 100, 40, 46, 16]].forEach((p, i) => { for (let k = 0; k < p[0]; k++) CL[i].push({ x: R() * 720, y: p[2] + R() * p[3], w: p[4] + R() * p[4], h: p[5] + R() * 6, sp: 3 + R() * 5, sd: R() * 9, par: p[1] }); }); })();
function dome(g, cx, base, w, h, cols, sd) {
  for (let i = 0; i < h; i++) {
    const f = (i + 1) / h, ww = Math.round(w * (.3 + .7 * Math.sqrt(Math.sin(f * Math.PI / 2))) * (1 + .06 * Math.sin(i * 2.3 + sd))), y = base - h + i;
    g.fillStyle = f < .26 ? cols[0] : f < .72 ? cols[1] : cols[2]; g.fillRect(Math.round(cx - ww / 2), y, ww, 1);
  }
}
function drawClouds(g, li, cx, cy, T, wind) {
  const c = CL[li], cols = li === 2 ? [rgb(tone('#ffd7c8', 0)), rgb(tone('#e9a9c0', 0)), rgb(tone('#a780c0', 0))] : [rgb(tone('#ffb27a', 0)), rgb(tone('#d9689a', 0)), rgb(tone('#6a3a8c', 1))];
  if (li === 2) g.globalAlpha = .42 + M.s * .2;
  c.forEach(o => {
    const x = mod(o.x - cx * o.par + T * o.sp * (.4 + wind * 2.2), 720) - 200, y = Math.round(o.y + cy * o.par);
    dome(g, x, y + o.h, o.w, o.h, cols, o.sd); dome(g, x + o.w * .3, y + o.h, o.w * .6, o.h * 1.3, cols, o.sd + 2); dome(g, x - o.w * .28, y + o.h, o.w * .5, o.h * .85, cols, o.sd + 5);
  });
  g.globalAlpha = 1;
}
const STARS = (() => { const R = rng(11); return Array.from({ length: 40 }, () => [R() * W, R() * 70, R() * 6]); })();
const SNOW = (() => { const R = rng(5); return Array.from({ length: 260 }, () => ({ x: R() * W, y: R() * H, z: R(), ph: R() * 6.3 })); })();
function drawSnow(g, dt, T, amount, wind, clip) {
  const n = Math.floor(SNOW.length * clamp(amount, 0, 1)); if (clip) { g.save(); g.beginPath(); g.rect(clip[0], clip[1], clip[2], clip[3]); g.clip(); }
  for (let i = 0; i < n; i++) {
    const p = SNOW[i]; p.y += (16 + p.z * 46 + amount * 40) * dt; p.x -= (wind * (.3 + p.z) + Math.sin(T * 1.3 + p.ph) * 7) * dt;
    if (p.y > H + 2) { p.y = -2; } if (p.x < -3) p.x += W + 6; if (p.x > W + 3) p.x -= W + 6;
    g.fillStyle = p.z > .66 ? '#f4f8ff' : p.z > .33 ? '#cfd8f8' : '#9aa6dc'; const s = p.z > .72 ? 2 : 1; g.fillRect(Math.round(p.x), Math.round(p.y), s, s);
  }
  if (clip) g.restore();
}
const cableYw = x => 104 - .22 * (x + 60) + 5 * Math.sin(Math.PI * mod(x - 40, 280) / 280);
function pylon(g, sx, y0) {
  const dk = rgb(tone('#2a1a3e', 2)), lt = rgb(tone('#7a4a78', 1));
  for (let y = 0; y < 200 - y0; y++) {
    const yy = Math.round(y0 + y), hw = 3 + Math.floor(y * .1); g.fillStyle = dk; g.fillRect(sx - hw, yy, 2, 1); g.fillRect(sx + hw - 1, yy, 2, 1);
    g.fillStyle = lt; g.fillRect(sx + hw + 1, yy, 1, 1);
    if (y % 16 < 2) g.fillRect(sx - hw, yy, hw * 2 + 1, 1), g.fillStyle = dk, g.fillRect(sx - hw, yy, hw * 2, 1), g.fillStyle = lt;
    if (y % 16 >= 2 && y % 16 < 15) { const d = Math.round((y % 16 - 2) / 13 * (hw * 2 - 2)); g.fillStyle = dk; g.fillRect(sx - hw + 1 + d, yy, 1, 1); }
  }
  g.fillStyle = dk; g.fillRect(sx - 9, Math.round(y0) - 2, 19, 3); g.fillStyle = lt; g.fillRect(sx - 9, Math.round(y0) - 3, 19, 1); g.fillRect(sx + 9, Math.round(y0) - 2, 1, 3);
}
function buildCabin(lit) {
  const c = mk(40, 30), x = c.getContext('2d'), R = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  R(19, 0, 2, 6, '#2a1d3c'); R(16, 0, 8, 1, '#4a3a5c'); R(15, 5, 10, 2, '#3a2a4c');
  R(4, 7, 32, 2, '#7b2a3e'); R(1, 9, 38, 2, '#9a3548'); R(1, 9, 38, 1, '#d4606a'); R(8, 6, 24, 1, '#a63c50');
  R(2, 11, 36, 15, '#e0663f'); R(2, 11, 36, 1, '#f69a62'); R(2, 22, 36, 2, '#f2e6d0'); R(2, 24, 36, 2, '#8c3a2c'); R(2, 11, 2, 15, '#c4502e'); R(36, 11, 2, 15, '#b44428');
  const hats = ['#e8743b', '#f1ece8', '#f2c230'], skin = ['#d9a074', '#8a5a3c', '#f0c8a0'], body = ['#2f6f73', '#e6e2ea', '#3a5ea8'];
  for (let i = 0; i < 3; i++) {
    const wx = 5 + i * 11; R(wx, 13, 9, 9, '#3a2640'); R(wx + 1, 14, 7, 8, lit ? '#ffd56a' : '#6a5a7a');
    if (lit) { R(wx + 2, 15, 5, 2, hats[i]); R(wx + 3, 17, 3, 3, skin[i]); R(wx + 2, 20, 5, 2, body[i]); R(wx + 3, 18, 1, 1, '#2a1a3a'); R(wx + 5, 18, 1, 1, '#2a1a3a'); } else R(wx + 2, 18, 5, 4, '#3a2c4a');
  }
  R(3, 26, 34, 2, '#4a2c3e'); R(0, 27, 40, 1, '#2a1d3c'); return c;
}
const CAB = { lit: buildCabin(true), dim: buildCabin(false) };
let assetCab = null, assetImgs = {};
function assetImg(name) { if (assetImgs[name] !== undefined) return assetImgs[name]; assetImgs[name] = null; const A = window.ASSETS; if (A && A.images && A.images[name]) { const im = new Image(); im.onload = () => { assetImgs[name] = im; }; im.src = A.images[name]; } return null; }
function drawCabin(g, sx, sy, s, sway, lit, T) {
  const big = s >= 2 && assetImg('cablecar'), im = big ? assetImg('cablecar') : null;
  if (im) {
    const a = Math.floor(T * 2) % 4, ss = s / 2, fw = 96, fh = 72;
    for (let r = 0; r < fh; r++) { const dx = Math.round(sway * Math.pow(r / fh, 1.2)); g.drawImage(im, a * fw, r, fw, 1, sx - 48 * ss + dx * s, sy - 5 * ss + r * ss, fw * ss, ss); }
    return;
  }
  const sp = lit ? CAB.lit : CAB.dim, w = 40, h = 30;
  for (let r = 0; r < h; r++) { const dx = Math.round(sway * Math.pow(r / h, 1.2)); g.drawImage(sp, 0, r, w, 1, sx - 20 * s + dx * s, sy + r * s, w * s, s); }
}
function drawCableLine(g, cam) {
  const dk = rgb(tone('#1b1230', 2)), hi = rgb(tone('#ffb27a', 1));
  for (let sx = 0; sx < W; sx++) { const y = Math.round(cableYw(sx + cam.x) + cam.y); g.fillStyle = dk; g.fillRect(sx, y, 1, 2); if (sx % 3 === 0) { g.fillStyle = hi; g.fillRect(sx, y - 1, 1, 1); } }
}
const PINES = (() => { const R = rng(23); return Array.from({ length: 16 }, () => ({ x: R() * 640, s: R() < .5 ? 1 : 2, t: 4 + Math.floor(R() * 2) })); })();
function drawPine(g, x, base, s, tiers) {
  const dk = rgb(tone('#150b2b', 2)), lt = rgb(tone('#3b2459', 2)), sn = rgb(tone('#c9b8f0', 1));
  g.fillStyle = dk; g.fillRect(x - s, base - 3 * s, 2 * s, 3 * s);
  for (let t = 0; t < tiers; t++) { const w = (5 + t * 4) * s, y = base - (3 + (tiers - t) * 6) * s; g.fillStyle = dk; for (let r = 0; r < 8 * s; r += s) { const ww = Math.round(w * (r / (8 * s) * .55 + .45) / 2); g.fillRect(x - ww, y + r, ww * 2, s); } g.fillStyle = lt; g.fillRect(x + Math.round(w / 3), y + 4 * s, s, s); g.fillStyle = sn; g.fillRect(x - s, y, 2 * s, s); }
}
function drawFore(g, cam) {
  const off = Math.floor(cam.x * .85), dy = Math.round(cam.y * .85), dk = rgb(tone('#130a28', 2)), rim = rgb(tone('#8a5a9a', 1));
  PINES.forEach(p => { const sx = mod(p.x - off, 640) - 120; if (sx > -30 && sx < W + 30) drawPine(g, sx, 172 + dy + (p.s === 2 ? 14 : 2), p.s, p.t); });
  for (let sx = 0; sx < W; sx++) { const wx = sx + off, y = Math.round(166 + 5 * Math.sin(wx * .03) + 3 * Math.sin(wx * .11) + dy); g.fillStyle = dk; g.fillRect(sx, y, 1, H - y + 40); g.fillStyle = rim; g.fillRect(sx, y, 1, 1); }
}
// Dibuja el mundo completo. o: {cam:{x,y}, storm, pal, T, dt, snow, wind, cab:{x,s,sw,lit}|null}
function drawWorld(g, o) {
  const cam = o.cam, T = o.T; M.s = o.storm || 0; M.pal = o.pal || 'dusk';
  const sk = getSky(M.pal, M.s), dy = Math.round(HY - 150 + cam.y * .35); g.drawImage(sk, 0, dy);
  if (M.pal !== 'dawn' && M.s < .85) STARS.forEach(s => { const y = s[1] + dy + 40; if (y < 90) { g.globalAlpha = (.35 + .35 * Math.sin(T * 2 + s[2])) * (1 - M.s); g.fillStyle = '#fff3d8'; g.fillRect(Math.round(s[0]), Math.round(y), 1, 1); } }); g.globalAlpha = 1;
  if (M.s < .9) { const sx = Math.round(236 - cam.x * .05), sy = Math.round(HY - 8 + cam.y * .3), a = 1 - M.s; g.globalAlpha = .08 * a; [42, 30].forEach(r => disc(g, sx, sy, r, '#ffd9a0')); g.globalAlpha = .18 * a; disc(g, sx, sy, 20, '#ffe6a8'); g.globalAlpha = a; disc(g, sx, sy, 11, '#fff3b8'); g.globalAlpha = 1; }
  // techo de tormenta
  if (M.s > .05) { const hh = M.s * 62; g.fillStyle = rgb(mix([40, 38, 70], [14, 14, 32], M.s)); for (let x = 0; x < W; x += 2) { const h2 = Math.round(hh * (.7 + .3 * Math.sin(x * .021 + T * .3) * Math.cos(x * .047 - T * .2)) + cam.y * .25); g.fillRect(x, 0, 2, Math.max(0, h2)); g.fillStyle = rgb(mix([54, 50, 88], [24, 22, 46], M.s)); g.fillRect(x, Math.max(0, h2 - 3), 2, 3); g.fillStyle = rgb(mix([40, 38, 70], [14, 14, 32], M.s)); } }
  drawClouds(g, 0, cam.x, cam.y, T, o.wind || 0); drawLayer(g, LAY[0], 0, cam.x, cam.y);
  drawClouds(g, 1, cam.x, cam.y, T, o.wind || 0); drawLayer(g, LAY[1], 1, cam.x, cam.y); drawLayer(g, LAY[2], 2, cam.x, cam.y);
  drawClouds(g, 2, cam.x, cam.y, T, o.wind || 0);
  for (let k = Math.floor((cam.x - 40) / 280) - 1; k <= Math.floor((cam.x + W - 40) / 280) + 1; k++) { const wx = 40 + 280 * k, sx = Math.round(wx - cam.x); if (sx > -30 && sx < W + 30) pylon(g, sx, Math.round(cableYw(wx) + cam.y)); }
  drawCableLine(g, cam);
  if (o.cab) { const c = o.cab, wx = c.x, sx = Math.round(wx - cam.x), sy = Math.round(cableYw(wx) + cam.y); drawCabin(g, sx, sy, c.s, c.sw * (2.2 * Math.sin(T * 1.3) + .8 * Math.sin(T * 2.9)), c.lit !== false, T); }
  drawFore(g, cam);
  if (o.snow) drawSnow(g, o.dt || 0, T, o.snow, o.wind || 0);
}
function vignette(g) { g.fillStyle = '#0a0414'; [.16, .12, .09, .06].forEach((a, i) => { g.globalAlpha = a; const t = (i + 1) * 5; g.fillRect(0, 0, W, t); g.fillRect(0, H - t, W, t); g.fillRect(0, 0, t, H); g.fillRect(W - t, 0, t, H); }); g.globalAlpha = 1; }
function bolt(g, x0, y1, seed, a) {
  const R = rng(seed); let x = x0, y = 0; const pts = [[x, y]]; while (y < y1) { y += 8 + R() * 8; x += (R() - .5) * 22; pts.push([x, y]); }
  g.globalAlpha = a * .35; g.fillStyle = '#b9a8ff'; for (let i = 1; i < pts.length; i++) line(g, pts[i - 1][0] - 2, pts[i - 1][1], pts[i][0] - 2, pts[i][1], 5);
  g.globalAlpha = a; g.fillStyle = '#ffffff'; for (let i = 1; i < pts.length; i++) line(g, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 2);
  const b = pts[Math.floor(pts.length / 2)]; g.fillStyle = '#e8e0ff'; line(g, b[0], b[1], b[0] + 30 * (R() < .5 ? -1 : 1), b[1] + 30, 1); g.globalAlpha = 1;
}
// Retratos de los rescatadores (pixel art por rectangulos)
const PERS = [
  { skin: '#d9a074', hat: '#e8743b', hatT: 'beanie', body: '#2f6f73', hi: '#3f8c90', scarf: '#ffd56a' },
  { skin: '#8a5a3c', hat: '#f1ece8', hatT: 'hood', body: '#e6e2ea', hi: '#ffffff', scarf: '#d63e4a' },
  { skin: '#f0c8a0', hat: '#f2c230', hatT: 'helmet', body: '#3a5ea8', hi: '#4f78c8', scarf: '#5a3a28' }
];
function person(g, x, y, s, i, T, talk) {
  const o = PERS[i], R = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(x + a * s, y + b * s, w * s, h * s); }, br = Math.round(Math.sin(T * 2 + i) * .5 + .5), blink = Math.floor(T * 1.3 + i * 3.1) % 5 === 0 && (T * 1.3 % 1) < .12;
  y += br * 0; R(1, 9 + br, 10, 6, o.body); R(1, 9 + br, 10, 1, o.hi); R(3, 8 + br, 6, 1, o.scarf);
  if (i === 1) { R(5, 11 + br, 2, 4, '#d63e4a'); R(4, 12 + br, 4, 2, '#d63e4a'); }
  R(3, 2 + br, 6, 6, o.skin); R(3, 6 + br, 6, 2, 'rgba(0,0,0,.12)');
  if (o.hatT === 'beanie') { R(2, 0 + br, 8, 3, o.hat); R(2, 3 + br, 8, 1, '#c85a28'); R(5, -1 + br, 2, 1, '#ffd56a'); }
  if (o.hatT === 'hood') { R(2, 0 + br, 8, 3, o.hat); R(2, 3 + br, 1, 5, o.hat); R(9, 3 + br, 1, 5, o.hat); R(2, 8 + br, 8, 1, '#d8d0dc'); }
  if (o.hatT === 'helmet') { R(2, 0 + br, 8, 3, o.hat); R(1, 3 + br, 10, 1, '#d8a010'); R(5, 0 + br, 2, 1, '#fffbe0'); R(3, 7 + br, 6, 1, '#5a3a28'); }
  if (blink) { R(4, 5 + br, 1, 0.5, '#2a1a3a'); R(7, 5 + br, 1, 0.5, '#2a1a3a'); } else { R(4, 4.5 + br, 1, 1, '#2a1a3a'); R(7, 4.5 + br, 1, 1, '#2a1a3a'); }
  if (talk && Math.floor(T * 9) % 2) R(5, 6.5 + br, 2, 1, '#6a2a3a'); else R(5, 6.5 + br, 2, .5, '#8a4a50');
}

/* ================= GUION VISUAL: cinematica de apertura + transiciones ================= */
const fol = (cab, top) => { const c = cab; return { x: c.x - 160, y: (top || 52) - cableYw(c.x) }; };
const flashA = (st, list) => { let a = 0, b = 0; list.forEach(f => { const d = st - f; if (d >= 0 && d < .75) { a = Math.max(a, Math.pow(1 - d / .75, 2)); if (d < .16) b = 1; } }); return [a, b]; };
const SHOTS = [
  { id: 'valle', cam: st => ({ x: lerp(-30, 40, st / 10), y: lerp(34, 6, ease(st / 10)) }), cab: st => ({ x: lerp(10, 120, st / 10), s: 1, sw: .4 }), storm: () => 0, snow: .22, wind: .08 },
  { id: 'cabina', follow: 1, cab: st => ({ x: lerp(120, 190, st / 10), s: 2, sw: .8 }), storm: () => .08, snow: .3, wind: .15 },
  { id: 'rescatadores', interior: 1, cab: st => ({ x: lerp(60, 90, st / 10), s: 1, sw: 0 }), storm: () => .14, snow: .35, wind: .2 },
  { id: 'tormenta', cam: st => ({ x: lerp(150, 195, st / 10), y: lerp(2, 14, st / 10) }), cab: st => ({ x: lerp(210, 238, st / 10), s: 1, sw: lerp(.8, 1.6, st / 10) }), storm: st => lerp(.2, .78, clamp(st / 8, 0, 1)), snow: .75, wind: .55, shake: .6, ev: [[2.5, 'cable']], flash: [7] },
  { id: 'relampago', follow: 1, cab: st => ({ x: 240 + 14 * (1 - ease(st / 2.5)), s: 2, sw: lerp(.6, 1.7, ease(st / 3)), lit: !(st > 1.2 && st < 1.7) && !(st > 4.1 && st < 4.3) }), storm: () => .88, snow: .95, wind: .85, shake: 1, flash: [1.2, 1.6, 4], ev: [[1.55, 'thunder'], [4.35, 'thunder']] },
  { id: 'radio', radio: 1, ev: [[.3, 'radio'], [2, 'radio'], [4.2, 'radio']] },
  { id: 'silencio', cam: st => ({ x: 200, y: lerp(0, 88, ease(st / 8)) }), cab: () => ({ x: 252, s: 1, sw: 1.3, lit: true }), storm: () => .96, snow: 1, wind: .95, shake: .5, flash: [5], ev: [[5.3, 'thunder']] },
  { id: 'titulo', title: 1 }
];
function drawRadio(g, st, T, typing, who) {
  g.fillStyle = '#120a1e'; g.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 3) { g.fillStyle = y % 6 ? '#170d26' : '#1c1030'; g.fillRect(0, y, W, 3); }
  // radio
  const x = 38, y = 36; g.fillStyle = '#0a0612'; g.fillRect(x - 2, y - 2, 134, 100);
  g.fillStyle = '#4a5a48'; g.fillRect(x, y, 130, 96); g.fillStyle = '#6a7a64'; g.fillRect(x, y, 130, 3); g.fillStyle = '#34402f'; g.fillRect(x, y + 93, 130, 3);
  g.fillStyle = '#222a22'; g.fillRect(x + 8, y + 10, 62, 40); g.fillStyle = '#0c2a1c'; g.fillRect(x + 10, y + 12, 58, 36);
  g.fillStyle = typing ? '#6dffa8' : '#2a6a4a'; let py = y + 30; for (let i = 0; i < 58; i += 2) { const a = typing ? (Math.sin(i * .5 + T * 20) * Math.sin(T * 7 + i * .13)) * 14 * (.4 + .6 * Math.abs(Math.sin(T * 3.1))) : Math.sin(i * .4 + T * 3) * 1.5; g.fillRect(x + 10 + i, Math.round(py + a), 2, 2); }
  g.fillStyle = '#1a2a22'; for (let i = 0; i < 6; i++) g.fillRect(x + 78, y + 12 + i * 5, 40, 2);
  disc(g, x + 30, y + 72, 11, '#1a1f1a'); disc(g, x + 30, y + 72, 8, '#8a948a'); g.fillStyle = '#d63e4a'; line(g, x + 30, y + 72, x + 30 + Math.round(Math.cos(T * .4) * 6), y + 72 + Math.round(Math.sin(T * .4) * 6), 1);
  disc(g, x + 70, y + 72, 6, '#1a1f1a'); disc(g, x + 70, y + 72, 4, '#c0c8b8');
  g.fillStyle = Math.floor(T * 3) % 2 || typing ? '#ff5a4a' : '#5a1a1a'; g.fillRect(x + 100, y + 68, 6, 6);
  g.fillStyle = '#2a2a2a'; g.fillRect(x + 118, y - 40, 2, 40); g.fillRect(x + 116, y - 42, 6, 3);
  // ruido blanco
  if (typing) { g.globalAlpha = .12; for (let i = 0; i < 80; i++) { g.fillStyle = '#c8d0ff'; g.fillRect(Math.random() * W | 0, Math.random() * H | 0, 6 + Math.random() * 16 | 0, 1); } g.globalAlpha = 1; }
  // recuadro de Lia en la cueva
  const px = 196, py2 = 36, pw = 94, ph = 96; g.fillStyle = '#c9a060'; g.fillRect(px - 3, py2 - 3, pw + 6, ph + 6); g.fillStyle = '#6a4a28'; g.fillRect(px - 3, py2 - 3, pw + 6, 2);
  g.save(); g.beginPath(); g.rect(px, py2, pw, ph); g.clip(); g.fillStyle = '#071820'; g.fillRect(px, py2, pw, ph);
  for (let i = 0; i < ph; i += 4) { g.fillStyle = mix2('#0a2430', '#0e3a4a', i / ph); g.fillRect(px, py2 + i, pw, 4); }
  g.fillStyle = '#04121a'; for (let i = 0; i < 9; i++) { const hh = 10 + (i * 7) % 16; for (let r = 0; r < hh; r++) g.fillRect(px + i * 11 + r * .5, py2 + r, 10 - r, 1); }
  const fl = .75 + .25 * Math.sin(T * 17) * Math.sin(T * 5.3);
  g.globalAlpha = .22 * fl; disc(g, px + 66, py2 + 68, 26, '#ffb060'); g.globalAlpha = .3 * fl; disc(g, px + 66, py2 + 68, 14, '#ffd080'); g.globalAlpha = 1;
  disc(g, px + 66, py2 + 72, 3, '#ffe9a0');
  g.fillStyle = '#0a1c28'; g.fillRect(px, py2 + 78, pw, 18); g.fillStyle = '#1e5a7a'; g.fillRect(px, py2 + 78, pw, 1); for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(160,220,255,.35)'; g.fillRect(px + (i * 17 + T * 8) % pw, py2 + 80 + (i * 5) % 14, 8, 1); }
  // Lia sentada
  const bx = px + 36, by = py2 + 74; g.fillStyle = '#c0392b'; g.fillRect(bx, by - 14, 12, 14); g.fillStyle = '#e8b890'; g.fillRect(bx + 2, by - 24, 8, 9); g.fillStyle = '#7a3a28'; g.fillRect(bx + 1, by - 26, 10, 4); g.fillStyle = '#f2c230'; g.fillRect(bx + 1, by - 11, 10, 2); g.fillStyle = '#2a1a3a'; g.fillRect(bx + 3, by - 20, 1, 1); g.fillRect(bx + 7, by - 20, 1, 1); g.fillRect(bx - 4, by - 2, 20, 3);
  g.restore(); g.fillStyle = '#ff9a5a'; g.font = 'bold 8px monospace'; g.fillStyle = Math.floor(T * 2) % 2 ? '#ff5a4a' : '#7a2a2a'; g.fillRect(px + 4, py2 + 4, 4, 4);
}
function mix2(a, b, t) { return rgb(mix(hex(a), hex(b), t)); }
function drawIntroShot(g, i, st, T, dt, typing) {
  const S = SHOTS[i], sc = Math.min(st, 10);
  if (S.radio) { drawRadio(g, st, T, typing); return; }
  if (S.title) { g.fillStyle = '#05030c'; g.fillRect(0, 0, W, H); STARS.forEach(s => { g.globalAlpha = .4 + .4 * Math.sin(T * 2 + s[2]); g.fillStyle = '#fff3d8'; g.fillRect(s[0] | 0, (s[1] * 2.4) | 0, 1, 1); }); g.globalAlpha = 1; drawSnow(g, dt, T, .35, 20); return; }
  const cab = S.cab ? S.cab(sc) : null, storm = S.storm(sc);
  let cam = S.follow ? fol(cab, 50) : S.cam ? S.cam(sc) : { x: 0, y: 0 };
  if (S.interior) cam = { x: cab.x, y: lerp(10, 22, st / 10) };
  const sh = (S.shake || 0) * storm * 1.4; cam = { x: cam.x + Math.round(Math.sin(T * 37) * sh), y: cam.y + Math.round(Math.cos(T * 29) * sh) };
  const fa = S.flash ? flashA(st, S.flash) : [0, 0];
  drawWorld(g, { cam, storm: clamp(storm + fa[0] * .0, 0, 1), pal: 'dusk', T, dt, snow: S.interior ? 0 : S.snow, wind: S.wind * 90, cab: S.interior ? null : cab });
  if (S.interior) {
    // interior de la cabina: ventana al paisaje, tres rescatadores
    const wx = 14, wy = 28, ww = 292, wh = 76, wall = '#2b1a2e', wd = '#1a0f20';
    g.fillStyle = wall; g.fillRect(0, 0, W, wy); g.fillRect(0, wy + wh, W, H - wy - wh); g.fillRect(0, wy, wx, wh); g.fillRect(wx + ww, wy, W - wx - ww, wh);
    for (let y = 0; y < H; y += 8) { g.fillStyle = wd; g.fillRect(0, y, wx, 1); g.fillRect(wx + ww, y, W, 1); }
    g.fillStyle = '#6a3a3a'; g.fillRect(wx - 2, wy - 2, ww + 4, 2); g.fillRect(wx - 2, wy + wh, ww + 4, 2); g.fillRect(wx - 2, wy - 2, 2, wh + 4); g.fillRect(wx + ww, wy - 2, 2, wh + 4);
    g.fillStyle = '#3a2438'; [110, 208].forEach(x => g.fillRect(x, wy, 4, wh));
    drawSnow(g, 0, T, 0, 0); g.fillStyle = 'rgba(255,255,255,.5)'; [[wx, wy], [wx + ww - 6, wy], [wx, wy + wh - 4], [wx + ww - 6, wy + wh - 4]].forEach(p => g.fillRect(p[0], p[1], 6, 3));
    const sp = Math.floor(T / 3.2) % 3; // quien habla
    [0, 1, 2].forEach(k => { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(36 + k * 94, 122, 52, 4); person(g, 38 + k * 94, 70 + (k === 1 ? 4 : 0), 4, k, T, typing && sp === k); });
    g.fillStyle = '#3a2224'; g.fillRect(0, 128, W, 52); g.fillStyle = '#5a3430'; g.fillRect(0, 128, W, 3); g.fillStyle = '#2a1618'; for (let x = 0; x < W; x += 24) g.fillRect(x, 134, 1, 46);
    g.fillStyle = 'rgba(255,200,120,.10)'; g.fillRect(0, wy, W, wh + 60);
  }
  if (S.ev) { /* eventos de sonido: los procesa el bucle */ }
  if (fa[0] > 0) { if (fa[1]) bolt(g, 70 + (Math.floor(st * 3) % 4) * 60, 108, Math.floor(st * 10) + i, 1); g.globalAlpha = Math.min(.85, fa[0] * .9); g.fillStyle = '#e6dcff'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  if (storm > .25) { g.globalAlpha = (storm - .2) * .25; g.fillStyle = '#10142a'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
}
// ---- cinematicas cortas ----
function cave(g, tint, T) {
  for (let y = 0; y < H; y += 6) { g.fillStyle = mix2(tint[0], tint[1], y / H); g.fillRect(0, y, W, 6); }
  const R = rng(4); g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 40; i++) g.fillRect(R() * W | 0, R() * H | 0, 3 + R() * 10 | 0, 1);
  g.fillStyle = tint[2]; for (let x = -6; x < W; x += 15) { const h = 14 + ((x * 7) & 31); for (let r = 0; r < h; r += 1) g.fillRect(x + r * .45, r, Math.max(1, 14 - r * .9), 1); }
  g.fillRect(0, 0, 14, H); g.fillRect(W - 12, 0, 12, H); g.fillStyle = tint[3]; g.fillRect(14, 0, 2, H); g.fillRect(W - 14, 0, 2, H);
}
function lia(g, x, y, T, a) { g.globalAlpha = a == null ? 1 : a; const b = Math.round(Math.sin(T * 2) * .5); g.fillStyle = '#c0392b'; g.fillRect(x, y - 14 + b, 12, 14 - b); g.fillStyle = '#e8b890'; g.fillRect(x + 2, y - 24 + b, 8, 9); g.fillStyle = '#7a3a28'; g.fillRect(x + 1, y - 26 + b, 10, 4); g.fillStyle = '#f2c230'; g.fillRect(x + 1, y - 11, 10, 2); g.fillStyle = '#2a1a3a'; g.fillRect(x + 3, y - 20 + b, 1, 1); g.fillRect(x + 7, y - 20 + b, 1, 1); g.fillRect(x - 5, y - 2, 22, 3); g.globalAlpha = 1; }
function drawAgua(g, t, dur, T) {
  cave(g, ['#0b1a2e', '#17405a', '#07101e', '#2a6a8a'], T);
  // haces de luz
  g.globalAlpha = .07; g.fillStyle = '#bfe3ff'; for (let k = 0; k < 3; k++) for (let y = 0; y < 150; y += 2) g.fillRect(150 + k * 40 - y * .5, y, 16, 2); g.globalAlpha = 1;
  g.fillStyle = '#2a1c34'; g.fillRect(190, 112, 100, 10); g.fillStyle = '#4a3454'; g.fillRect(190, 112, 100, 2);
  lia(g, 232, 112, T);
  const wl = Math.round(lerp(172, 118, ease(t / dur)));
  for (let y = wl; y < H; y += 2) { g.fillStyle = mix2('#2b79bd', '#0d3566', clamp((y - wl) / 80, 0, 1)); g.fillRect(14, y, W - 26, 2); }
  g.globalAlpha = .4; g.fillStyle = '#8ee0ff'; for (let y = wl + 6; y < H; y += 9) for (let x = 14; x < W - 12; x += 2) if (((x * 3 + y * 5 + Math.floor(T * 4)) % 11) === 0) g.fillRect(x, y, 4, 1); g.globalAlpha = 1;
  for (let x = 14; x < W - 12; x++) { const y = wl + Math.round(Math.sin(x * .09 + T * 3.1) * 1.6); g.fillStyle = '#c8f2ff'; g.fillRect(x, y - 1, 1, 2); g.fillStyle = '#5fb8f0'; g.fillRect(x, y + 1, 1, 1); }
  for (let i = 0; i < 14; i++) { const by = H - mod(T * (14 + i % 5 * 4) + i * 41, Math.max(10, H - wl)), bx = 30 + i * 19 + Math.sin(T * 2 + i) * 3; if (by > wl + 3) { g.fillStyle = '#cdeeff'; g.fillRect(bx | 0, by | 0, 2, 2); g.fillStyle = '#7fc8f0'; g.fillRect(bx | 0, (by | 0) + 2, 1, 1); } }
  if (wl < 130) { g.globalAlpha = .5; g.fillStyle = '#ffffff'; for (let i = 0; i < 6; i++) g.fillRect(190 + mod(i * 31 + T * 20, 100), 112 + (i % 2) * 2, 3, 1); g.globalAlpha = 1; }
  g.globalAlpha = .07; disc(g, 40, 40, 34, '#ffb060'); g.globalAlpha = .12; disc(g, 40, 40, 22, '#ffb060'); g.globalAlpha = .2; disc(g, 40, 40, 12, '#ffd080'); g.globalAlpha = 1; disc(g, 40, 40, 5, '#fff0b0'); g.fillStyle = '#4a2a1a'; g.fillRect(38, 44, 4, 10);
}
function drawRelampago(g, t, dur, T) {
  const fa = flashA(t, [.9, 1.5, 2.4]);
  drawWorld(g, { cam: { x: 210, y: 40 }, storm: 1, T, dt: 0, snow: 0, wind: 100 });
  if (fa[1]) bolt(g, 120 + Math.floor(t) * 50, 112, Math.floor(t * 9), 1);
  g.fillStyle = '#04020a'; for (let y = 0; y < H; y++) { const hw = Math.round(Math.sqrt(Math.max(0, 1 - Math.pow((y - 96) / 92, 2))) * 124); g.fillRect(0, y, 160 - hw, 1); g.fillRect(160 + hw, y, 160, 1); }
  g.fillStyle = '#04020a'; for (let x = 30; x < 290; x += 17) { const h = 12 + ((x * 11) & 15); for (let r = 0; r < h; r++) g.fillRect(x + r * .4, r, Math.max(1, 12 - r * .8), 1); }
  g.fillRect(0, 150, W, 30);
  const k = Math.min(1, .12 + fa[0]); g.globalAlpha = k; [0, 1, 2].forEach(i => person(g, 80 + i * 62, 112, 3, i, T, false)); g.globalAlpha = 1; g.fillStyle = '#04020a'; g.fillRect(0, 150, W, 30);
  drawSnow(g, 0, T, 1, 120, [60, 20, 200, 130]);
  if (fa[0] > 0) { g.globalAlpha = Math.min(.8, fa[0] * .85); g.fillStyle = '#e6dcff'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
}
function drawLinterna(g, t, dur, T) {
  cave(g, ['#17132c', '#2a2250', '#0a0716', '#3a2e5c'], T);
  const R = rng(9); for (let i = 0; i < 30; i++) { const x = 20 + R() * 280, y = 20 + R() * 120; g.fillStyle = ['#6fd0ff', '#c79bff', '#7fffd0'][i % 3]; g.fillRect(x | 0, y | 0, 2, 4); g.fillRect((x | 0) + 2, (y | 0) + 2, 1, 2); }
  g.fillStyle = '#10182a'; g.fillRect(14, 142, W - 26, 38); g.fillStyle = '#1c3050'; g.fillRect(14, 142, W - 26, 1); g.fillStyle = '#26436a'; for (let x = 18; x < 290; x += 12) g.fillRect(x + ((x * 5) & 7), 150 + ((x * 3) & 7), 6, 1);
  lia(g, 236, 142, T);
  let I = t < .5 ? 0 : t < .7 ? 1 : t < .95 ? 0 : t < 1.1 ? 1 : t < 1.5 ? 0 : t < 1.6 ? .8 : 1; if (t > 3.2 && t < 3.35) I = .3; if (t > 3.4) I = .9 + .1 * Math.sin(T * 40);
  const D = linterna.c || (linterna.c = mk(W, H)), d = D.getContext('2d'); d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W, H); d.fillStyle = 'rgba(2,1,8,.97)'; d.fillRect(0, 0, W, H); d.globalCompositeOperation = 'destination-out';
  const ox = 52, oy = 128, ang = lerp(-.25, -.02, ease((t - 1.6) / 2.4)), sp = .3;
  [[1, .3], [.7, .35], [.5, .4], [.3, .4]].forEach((s, i) => { d.globalAlpha = I * (.4 + i * .15); const L = 150 + s[0] * 150 - i * 20, w = sp * (.6 + s[0] * .6); d.beginPath(); d.moveTo(ox, oy); d.lineTo(ox + Math.cos(ang - w) * L, oy + Math.sin(ang - w) * L); d.lineTo(ox + Math.cos(ang + w) * L, oy + Math.sin(ang + w) * L); d.closePath(); d.fill(); });
  d.globalAlpha = I * .9; [16, 10, 5].forEach(r => { d.beginPath(); d.arc(ox, oy, r, 0, 7); d.fill(); }); d.globalAlpha = 1; d.globalCompositeOperation = 'source-over';
  g.drawImage(D, 0, 0); g.fillStyle = '#0a0612'; g.fillRect(ox - 6, oy - 4, 10, 8); g.fillStyle = I > .5 ? '#fff3b0' : '#4a3a2a'; g.fillRect(ox + 3, oy - 3, 2, 6);
  if (I > .5) { g.globalAlpha = .06 * I; g.fillStyle = '#ffe9a0'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
}
linterna.c = null; function linterna() { }
const SHORT = {
  agua: { d: 5, draw: drawAgua, track: null, ev: [[.15, 'water'], [1.5, 'drip'], [3.2, 'drip']], tt: 'Cada minuto el agua gana un palmo.' },
  relampago: { d: 4.4, draw: drawRelampago, ev: [[.9, 'thunder'], [1.5, 'thunder'], [2.4, 'thunder']], tt: 'Un relampago ilumina la boca de la cueva.' },
  linterna: { d: 5, draw: drawLinterna, ev: [[.5, 'flick'], [.95, 'flick'], [1.5, 'flick'], [3.2, 'flick'], [3.4, 'flick']], tt: 'La linterna parpadea. Quedan pocas pilas.' }
};
const BYROUND = { 1: 'linterna', 2: 'agua', 3: 'relampago', 4: 'agua', 5: 'linterna' };

/* ================= DOM / PANTALLAS ================= */
const ROLE_DEF = {
  guia: { name: 'Nico', title: 'Guia', desc: 'Conoce cada galeria y cada ruta. Abre camino y escala con cuerda.', col: '#e8743b', i: 0 },
  medica: { name: 'Dra. Ona', title: 'Medica', desc: 'Mantiene viva a Lia. Estabiliza y cura en las zonas medicas.', col: '#e6e2ea', i: 1 },
  ing: { name: 'Ivan', title: 'Ingeniero', desc: 'Anclajes, puentes y material. Si se puede montar, lo monta.', col: '#f2c230', i: 2 }
};
const RK = ['guia', 'medica', 'ing'];
function rdef(k) { const d = Object.assign({}, ROLE_DEF[k]), R = window.Story && Story.ROLES && Story.ROLES[k]; if (R) { if (R.short) d.name = R.short; if (R.name) d.full = R.name; if (R.goal) d.goal = R.goal; } return d; }
function statDef(k) { const S = window.Story && Story.STATS && Story.STATS[k]; return S ? { label: S[0], col: S[1] } : { label: k, col: '#fff' }; }
const STATK = ['agua', 'salud', 'material', 'confianza'];
const ICONS = {
  agua: ['...#...', '..###..', '..###..', '.#####.', '#######', '#######', '.#####.'],
  salud: ['..###..', '..###..', '#######', '#######', '#######', '..###..', '..###..'],
  material: ['#######', '#.....#', '#.###.#', '#.#.#.#', '#.###.#', '#.....#', '#######'],
  confianza: ['.##.##.', '#######', '#######', '#######', '.#####.', '..###..', '...#...']
};
function icon(k, col) { const c = mk(7, 7), g = c.getContext('2d'); ICONS[k].forEach((r, y) => { for (let x = 0; x < 7; x++) if (r[x] === '#') { g.fillStyle = col; g.fillRect(x, y, 1, 1); } }); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(2, 2, 1, 1); c.className = 'ico'; return c; }
function portrait(i, active) { const c = mk(28, 30), g = c.getContext('2d'); g.fillStyle = ['#2b3a4a', '#3a2f4a', '#3a3a2a'][i]; g.fillRect(0, 0, 28, 30); person(g, 2, 3, 2, i, 0, false); c.className = 'pcv'; return c; }

const CSS = `
#rcv-ui{--ink:#0d0818;--panel:#1b1230;--panel2:#2a1b48;--gold:#f2b66d;--gold-d:#a8693c;--rose:#e0586f;--orange:#ff8f4d;--sun:#ffd56a;--ice:#bfe3ff;--tx:#f6ead8;--mute:#a99bc8;--good:#7fe0a0;--bad:#ff6b6b;
position:fixed;inset:0;background:#07040f;color:var(--tx);font-family:'Press Start 2P',ui-monospace,Menlo,Consolas,'Courier New',monospace;font-size:var(--f);line-height:1.65;overflow:hidden;user-select:none;-webkit-font-smoothing:none;z-index:9000}
#rcv-ui *{box-sizing:border-box}
#rcv-ui canvas{image-rendering:pixelated;image-rendering:crisp-edges}
#rcv-ui .stage{position:absolute;width:calc(var(--k)*320px);height:calc(var(--k)*180px);overflow:hidden;background:#07040f}
#rcv-ui .stage>canvas{position:absolute;inset:0;width:100%;height:100%;display:none}
#rcv-ui .stage>canvas.on{display:block}
#rcv-ui .shade{position:absolute;inset:0;background:linear-gradient(rgba(10,4,24,.15),rgba(10,4,24,.55));display:none}
#rcv-ui .shade.on{display:block}
#rcv-ui .scr{position:absolute;inset:0;display:none;overflow:auto;padding:calc(var(--p)*6px)}
#rcv-ui .scr.on{display:flex}
#rcv-ui .col{margin:auto;width:min(100%,calc(var(--k)*300px));display:flex;flex-direction:column;gap:calc(var(--p)*5px);align-items:stretch}
#rcv-ui .box{position:relative;background:var(--panel);border:calc(var(--p)*1px) solid var(--gold-d);padding:calc(var(--p)*7px);
box-shadow:0 0 0 calc(var(--p)*1px) var(--ink),inset 0 0 0 calc(var(--p)*1px) #3a2663,calc(var(--p)*2px) calc(var(--p)*3px) 0 calc(var(--p)*1px) rgba(0,0,0,.5)}
#rcv-ui .box::before{content:'';position:absolute;inset:calc(var(--p)*2px);pointer-events:none;--r:calc(var(--p)*3px);
background:linear-gradient(var(--gold),var(--gold)) 0 0/var(--r) var(--r) no-repeat,linear-gradient(var(--gold),var(--gold)) 100% 0/var(--r) var(--r) no-repeat,linear-gradient(var(--gold),var(--gold)) 0 100%/var(--r) var(--r) no-repeat,linear-gradient(var(--gold),var(--gold)) 100% 100%/var(--r) var(--r) no-repeat}
#rcv-ui .box.fr{border-style:solid;border-width:calc(var(--p)*8px);border-image:var(--frame) 8 fill/calc(var(--p)*8px) stretch;box-shadow:calc(var(--p)*2px) calc(var(--p)*3px) 0 rgba(0,0,0,.45);background:none}
#rcv-ui .box.fr::before{display:none}
#rcv-ui h2,#rcv-ui h3{margin:0;font-weight:normal}
#rcv-ui .lab{font-size:var(--fs);color:var(--gold);letter-spacing:.08em}
#rcv-ui .mut{color:var(--mute)} #rcv-ui .sm{font-size:var(--fs)}
#rcv-ui .btn{font:inherit;color:#2a1018;cursor:pointer;border:calc(var(--p)*1px) solid var(--ink);padding:calc(var(--p)*4px) calc(var(--p)*8px);
background:linear-gradient(#ffd98a 0 50%,#f0a550 50% 100%);box-shadow:inset calc(var(--p)*-1px) calc(var(--p)*-1px) 0 #c06a30,inset calc(var(--p)*1px) calc(var(--p)*1px) 0 #fff0b8,0 calc(var(--p)*2px) 0 #6a2a24;text-align:center;position:relative;top:0;text-shadow:0 calc(var(--p)*1px) 0 rgba(255,255,255,.35)}
#rcv-ui .btn:hover,#rcv-ui .btn:focus-visible{filter:brightness(1.12);outline:calc(var(--p)*1px) solid #fff;outline-offset:calc(var(--p)*1px)}
#rcv-ui .btn:active{top:calc(var(--p)*2px);box-shadow:inset calc(var(--p)*-1px) calc(var(--p)*-1px) 0 #c06a30,inset calc(var(--p)*1px) calc(var(--p)*1px) 0 #fff0b8,0 0 0 #6a2a24}
#rcv-ui .btn.sec{color:var(--tx);background:linear-gradient(#5a3f8f 0 50%,#46307a 50% 100%);box-shadow:inset calc(var(--p)*-1px) calc(var(--p)*-1px) 0 #2e1f56,inset calc(var(--p)*1px) calc(var(--p)*1px) 0 #8466c0,0 calc(var(--p)*2px) 0 #1a1030;text-shadow:none}
#rcv-ui .btn[disabled]{filter:grayscale(1) brightness(.6);cursor:not-allowed}
#rcv-ui input[type=text],#rcv-ui input[type=password]{font:inherit;width:100%;background:#0d0818;color:var(--tx);border:calc(var(--p)*1px) solid var(--gold-d);padding:calc(var(--p)*3px) calc(var(--p)*4px);outline:none;user-select:text}
#rcv-ui input:focus{border-color:var(--sun)}
#rcv-ui .row{display:flex;gap:calc(var(--p)*4px);align-items:center;flex-wrap:wrap}
#rcv-ui .row>.grow{flex:1;min-width:0}
#rcv-ui .blink{animation:rcvb 1s steps(2) infinite}@keyframes rcvb{50%{opacity:0}}
/* titulo */
#rcv-ui .logo{text-align:center;display:flex;flex-direction:column;gap:calc(var(--p)*2px);filter:drop-shadow(0 calc(var(--p)*3px) 0 #2b0f40) drop-shadow(0 0 calc(var(--p)*10px) rgba(255,140,80,.45));animation:rcvf 3s steps(6) infinite}
@keyframes rcvf{50%{transform:translateY(calc(var(--p)*-2px))}}
#rcv-ui .logo span{background:linear-gradient(#fff6d0 0 38%,#ffc15a 38% 68%,#ff7a4a 68%);-webkit-background-clip:text;background-clip:text;color:transparent}
#rcv-ui .logo .l1{font-size:calc(var(--f)*1.5)}#rcv-ui .logo .l2{font-size:calc(var(--f)*2.5)}
#rcv-ui .menu{display:flex;flex-direction:column;gap:calc(var(--p)*4px);width:min(100%,calc(var(--k)*90px));margin:0 auto}
#rcv-ui .foot{position:absolute;left:0;right:0;bottom:calc(var(--p)*3px);text-align:center;font-size:var(--fs);color:var(--mute);opacity:.8}
/* lobby */
#rcv-ui .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:calc(var(--p)*4px)}
#rcv-ui .card{font:inherit;color:var(--tx);text-align:left;cursor:pointer;background:#140c26;border:calc(var(--p)*1px) solid #3a2663;padding:calc(var(--p)*4px);display:flex;flex-direction:column;gap:calc(var(--p)*2px);position:relative}
#rcv-ui .card:hover{border-color:var(--gold)}
#rcv-ui .card.sel{border-color:var(--sun);background:#2a1b48;box-shadow:0 0 0 calc(var(--p)*1px) var(--sun)}
#rcv-ui .card.taken{opacity:.5;cursor:not-allowed}
#rcv-ui .card .pcv{width:calc(var(--p)*28px);height:calc(var(--p)*30px)}
#rcv-ui .code{font-size:calc(var(--f)*2);letter-spacing:.25em;color:var(--sun);text-align:center;filter:drop-shadow(0 calc(var(--p)*2px) 0 #6a2a24)}
#rcv-ui .dot{display:inline-block;width:calc(var(--p)*3px);height:calc(var(--p)*3px);background:#555;margin-right:calc(var(--p)*2px)}#rcv-ui .dot.ok{background:var(--good)}
/* decision */
#rcv-ui .scr-decision{background:rgba(8,3,18,.78)}
#rcv-ui .opt{font:inherit;color:var(--tx);text-align:left;cursor:pointer;background:#140c26;border:calc(var(--p)*1px) solid #3a2663;padding:calc(var(--p)*4px) calc(var(--p)*5px);display:flex;gap:calc(var(--p)*5px);align-items:flex-start;line-height:1.55}
#rcv-ui .opt:hover:not([disabled]),#rcv-ui .opt:focus-visible{border-color:var(--sun);background:#2a1b48;outline:none;transform:translateX(calc(var(--p)*2px))}
#rcv-ui .opt .key{flex:none;background:var(--gold);color:#2a1018;padding:0 calc(var(--p)*3px);box-shadow:0 calc(var(--p)*1px) 0 #6a2a24}
#rcv-ui .opt[disabled]{opacity:.45;cursor:not-allowed}
#rcv-ui .opt .rq{color:var(--bad);font-size:var(--fs);display:block}
#rcv-ui .opt.pick{border-color:var(--good);background:#16402c}
#rcv-ui .priv{background:#2b1620;border-color:var(--rose)}
#rcv-ui .priv .lab{color:var(--rose)}
#rcv-ui .pills{display:flex;gap:calc(var(--p)*3px);flex-wrap:wrap}
#rcv-ui .pill{font-size:var(--fs);padding:0 calc(var(--p)*3px);background:#140c26;border:calc(var(--p)*1px) solid #3a2663;color:var(--mute)}#rcv-ui .pill.ok{color:var(--good);border-color:var(--good)}
/* HUD */
#rcv-ui .hud{position:absolute;inset:0;pointer-events:none;display:none}#rcv-ui .hud.on{display:block}
#rcv-ui .hud-l{position:absolute;left:calc(var(--k)*3px);top:calc(var(--k)*3px);display:flex;flex-direction:column;gap:calc(var(--p)*2px)}
#rcv-ui .hbox{background:rgba(20,10,40,.82);border:calc(var(--p)*1px) solid var(--gold-d);box-shadow:0 0 0 calc(var(--p)*1px) var(--ink);padding:calc(var(--p)*2px) calc(var(--p)*3px)}
#rcv-ui .rnd{font-size:var(--fs);color:var(--sun);display:flex;gap:calc(var(--p)*2px);align-items:center}
#rcv-ui .pip{width:calc(var(--p)*3px);height:calc(var(--p)*3px);background:#3a2663}#rcv-ui .pip.on{background:var(--sun)}#rcv-ui .pip.cur{background:#fff;animation:rcvb .8s steps(2) infinite}
#rcv-ui .bar{display:flex;align-items:center;gap:calc(var(--p)*2px);position:relative;font-size:var(--fs)}
#rcv-ui .bar .ico{width:calc(var(--p)*7px);height:calc(var(--p)*7px)}
#rcv-ui .bar .tr{width:calc(var(--k)*44px);height:calc(var(--p)*5px);background:#0d0818;border:calc(var(--p)*1px) solid #4a3a6a;position:relative}
#rcv-ui .bar .fi{position:absolute;left:0;top:0;bottom:0;transition:width .7s steps(7);background:linear-gradient(rgba(255,255,255,.4) 0 35%,transparent 35%),var(--c)}
#rcv-ui .bar .tr::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 calc(10% - var(--p)*1px),rgba(0,0,0,.55) calc(10% - var(--p)*1px) 10%)}
#rcv-ui .bar.warn .tr{border-color:var(--bad);animation:rcvb .6s steps(2) infinite}
#rcv-ui .bar .v{min-width:calc(var(--f)*2.2);text-align:right}
#rcv-ui .dl{position:absolute;left:calc(var(--k)*62px);font-size:var(--fs);animation:rcvup 1.4s steps(8) forwards;white-space:nowrap}
@keyframes rcvup{0%{transform:translateY(0);opacity:1}80%{opacity:1}100%{transform:translateY(calc(var(--p)*-8px));opacity:0}}
#rcv-ui .hud-r{position:absolute;right:calc(var(--k)*3px);top:calc(var(--k)*3px);display:flex;gap:calc(var(--p)*3px);pointer-events:auto}
#rcv-ui .team{position:absolute;right:calc(var(--k)*3px);bottom:calc(var(--k)*3px);display:flex;gap:calc(var(--p)*3px);pointer-events:auto;align-items:flex-end}
#rcv-ui .por{font:inherit;color:var(--tx);cursor:pointer;background:rgba(20,10,40,.85);border:calc(var(--p)*1px) solid #4a3a6a;box-shadow:0 0 0 calc(var(--p)*1px) var(--ink);padding:calc(var(--p)*2px);display:flex;flex-direction:column;align-items:center;gap:calc(var(--p)*1px);position:relative;font-size:var(--fs);line-height:1.2}
#rcv-ui .por .pcv{width:calc(var(--p)*20px);height:calc(var(--p)*21px);filter:grayscale(.55) brightness(.75)}
#rcv-ui .por.act{border-color:var(--sun);background:rgba(60,34,100,.92);box-shadow:0 0 0 calc(var(--p)*1px) var(--ink),0 0 calc(var(--p)*8px) rgba(255,213,106,.7);transform:translateY(calc(var(--p)*-3px))}
#rcv-ui .por.act .pcv{filter:none}
#rcv-ui .por.act::after{content:'';position:absolute;top:calc(var(--p)*-5px);left:50%;margin-left:calc(var(--p)*-2px);border:calc(var(--p)*2px) solid transparent;border-top:calc(var(--p)*3px) solid var(--sun);animation:rcvf 1s steps(2) infinite}
#rcv-ui .por.lock{opacity:.55;cursor:not-allowed}
#rcv-ui .por .tg{color:var(--mute);font-size:calc(var(--fs)*.85)}#rcv-ui .por.act .tg{color:var(--sun)}
#rcv-ui .por .kb{position:absolute;top:calc(var(--p)*-1px);left:calc(var(--p)*-1px);background:var(--gold);color:#2a1018;padding:0 calc(var(--p)*1px);font-size:calc(var(--fs)*.8)}
#rcv-ui .radio{position:absolute;left:calc(var(--k)*3px);bottom:calc(var(--k)*3px);width:calc(var(--k)*186px);display:none}
#rcv-ui .radio.on{display:block}
#rcv-ui .radio .who{color:var(--sun);font-size:var(--fs)}
#rcv-ui .ib{pointer-events:auto;font:inherit;cursor:pointer;width:calc(var(--p)*13px);height:calc(var(--p)*13px);padding:0;color:var(--tx);background:rgba(20,10,40,.85);border:calc(var(--p)*1px) solid var(--gold-d);box-shadow:0 0 0 calc(var(--p)*1px) var(--ink);font-size:var(--fs)}
#rcv-ui .ib:hover{border-color:var(--sun)}
/* cine */
#rcv-ui .cine{position:absolute;inset:0;display:none}#rcv-ui .cine.on{display:block}
#rcv-ui .ctext{position:absolute;left:calc(var(--k)*14px);right:calc(var(--k)*14px);bottom:0;height:calc(var(--k)*24px);display:flex;flex-direction:column;justify-content:center;transition:opacity .4s;opacity:0}
#rcv-ui .ctext.on{opacity:1}
#rcv-ui .ctext .who{color:var(--sun);font-size:var(--fs)}
#rcv-ui .ctext .tx{color:#fff4e0;text-shadow:0 calc(var(--p)*1px) 0 #000;min-height:3.3em}
#rcv-ui .ctext .nx{position:absolute;right:0;bottom:calc(var(--k)*3px);color:var(--sun);animation:rcvb .8s steps(2) infinite}
#rcv-ui .ctitle{position:absolute;inset:0;display:none;align-items:center;justify-content:center}#rcv-ui .ctitle.on{display:flex}
#rcv-ui .skip{position:absolute;right:calc(var(--k)*3px);top:calc(var(--k)*3px);font-size:var(--fs);color:var(--mute);cursor:pointer;opacity:.8;pointer-events:auto}
#rcv-ui .skip:hover{color:var(--sun)}
/* misc */
#rcv-ui .toasts{position:absolute;left:0;right:0;top:calc(var(--k)*14px);display:flex;flex-direction:column;align-items:center;gap:calc(var(--p)*2px);pointer-events:none;z-index:5}
#rcv-ui .toast{background:var(--panel2);border:calc(var(--p)*1px) solid var(--gold);box-shadow:0 0 0 calc(var(--p)*1px) var(--ink);padding:calc(var(--p)*3px) calc(var(--p)*6px);font-size:var(--fs);animation:rcvt 3.2s steps(10) forwards;max-width:90%}
@keyframes rcvt{0%{opacity:0;transform:translateY(-8px)}8%{opacity:1;transform:none}85%{opacity:1}100%{opacity:0}}
#rcv-ui .gear{position:absolute;right:calc(var(--p)*4px);top:calc(var(--p)*4px);display:flex;gap:calc(var(--p)*3px);z-index:4}
#rcv-ui .scr-settings{background:rgba(5,2,12,.8);z-index:6}
#rcv-ui .big{font-size:calc(var(--f)*1.7);text-align:center;line-height:1.3;filter:drop-shadow(0 calc(var(--p)*2px) 0 rgba(0,0,0,.6))}
#rcv-ui .obj{display:flex;gap:calc(var(--p)*3px);align-items:flex-start}
#rcv-ui .obj b{flex:none;font-weight:normal}
#rcv-ui .fbar{display:grid;grid-template-columns:repeat(4,1fr);gap:calc(var(--p)*4px)}
#rcv-ui .fbar .tr{height:calc(var(--p)*5px);background:#0d0818;border:calc(var(--p)*1px) solid #4a3a6a;margin-top:calc(var(--p)*1px)}#rcv-ui .fbar i{display:block;height:100%}
#rcv-ui .ver{min-height:6.5em;line-height:1.8}
#rcv-ui .log{max-height:calc(var(--k)*34px);overflow:auto;font-size:var(--fs);line-height:1.6}
`;

let root, stage, bg, gc, shade, hud, cine, ctextEl, scr = {}, mode = 'blank', T = 0, last = 0, raf = 0, K = 4, toasts, demo = null, switchCb = [], localId = 'p0';
const U = { role: 'guia', active: 'guia', st: null, mode: 'idle', code: '', link: '', players: [], ready: false };

function layout() {
  K = Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H))); const p = Math.max(1, Math.floor(K / 2));
  root.style.setProperty('--k', K); root.style.setProperty('--p', p); root.style.setProperty('--f', Math.max(10, K * 4) + 'px'); root.style.setProperty('--fs', Math.max(8, K * 2.5 | 0) + 'px');
  stage.style.left = Math.round((innerWidth - W * K) / 2) + 'px'; stage.style.top = Math.round((innerHeight - H * K) / 2) + 'px';
}
function ensure() {
  if (root) return;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  try { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'; l.onerror = () => l.remove(); document.head.appendChild(l); } catch (e) { }
  const A = window.ASSETS; if (A && A.images && A.images.ui_frame) st.textContent += '#rcv-ui{--frame:url(' + A.images.ui_frame + ')}';
  root = $('div'); root.id = 'rcv-ui'; document.body.appendChild(root);
  stage = $('div', 'stage', root); bg = $('canvas', '', stage); bg.width = W; bg.height = H; gc = $('canvas', '', stage); gc.width = W; gc.height = H; gc.id = 'rcv-game';
  shade = $('div', 'shade', stage); hud = $('div', 'hud', stage); buildHud(); cine = $('div', 'cine', stage); buildCine();
  ['title', 'lobby', 'decision', 'final', 'settings'].forEach(n => { scr[n] = $('div', 'scr scr-' + n, root); });
  toasts = $('div', 'toasts', root);
  buildTitle(); buildSettings();
  const gear = $('div', 'gear', root); const bm = $('button', 'ib', gear, ''); bm.title = 'Silencio (M)'; const bs = $('button', 'ib', gear, '&#9881;'); bs.title = 'Ajustes';
  root.muteBtn = bm; const sy = () => { bm.innerHTML = Aud.muted ? '&#9834;&#215;' : '&#9834;'; bm.style.opacity = Aud.muted ? .6 : 1; }; sy(); on('mute', sy);
  bm.onclick = () => { Aud.unlock(); Aud.toggle(); Aud.sfx('click'); }; bs.onclick = () => { Aud.unlock(); openSettings(); };
  root.gear = gear;
  addEventListener('resize', layout); layout();
  addEventListener('pointerdown', () => Aud.unlock(), true);
  addEventListener('keydown', onKey, true);
  stage.addEventListener('click', e => { if (C && !e.target.closest('.skip')) cineNext(); });
}
function show(n) { Object.keys(scr).forEach(k => scr[k].classList.toggle('on', k === n)); }
function setMode(m) {
  mode = m; const bgOn = ['title', 'lobby', 'final', 'cine'].includes(m), g = m === 'game' || (m === 'title' && demo);
  bg.classList.toggle('on', bgOn && !(m === 'title' && demo)); gc.classList.toggle('on', g); shade.classList.toggle('on', m === 'title' || m === 'lobby' || m === 'final');
  hud.classList.toggle('on', m === 'game'); cine.classList.toggle('on', m === 'cine');
  root.gear.style.display = m === 'cine' ? 'none' : 'flex'; kick();
}
function toast(msg) { ensure(); const t = $('div', 'toast', toasts); t.textContent = msg; setTimeout(() => t.remove(), 3300); }

// ---- titulo ----
function buildTitle() {
  const c = $('div', 'col', scr.title);
  $('div', 'logo', c, '<span class="l1">RESCATE EN</span><span class="l2">LA CUEVA</span>');
  $('div', 'sm mut', c, '').style.textAlign = 'center';
  c.lastChild.textContent = 'UN RESCATE COOPERATIVO  -  3 PERSONAJES  -  5 RONDAS';
  const m = $('div', 'menu', c);
  const b1 = $('button', 'btn', m, 'JUGAR'), b2 = $('button', 'btn sec', m, 'AJUSTES');
  b1.onclick = () => { Aud.unlock(); Aud.sfx('decision'); showLobby(); emit('play'); }; b2.onclick = () => { Aud.sfx('click'); openSettings(); };
  $('div', 'sm blink', c, 'PULSA ENTER').style.textAlign = 'center';
  $('div', 'foot', scr.title, 'Mover: flechas/AWD  -  Saltar: ESPACIO  -  Interactuar: E/F  -  Cambiar personaje: TAB/Q/E');
  c.b1 = b1;
}
function showTitle() {
  ensure(); stopDemo(); show('title'); Aud.setTrack('title'); Aud.wind(.15);
  try { if (window.Engine && Engine.demoLoop) { const d = Engine.demoLoop(gc); demo = d || { stop() { } }; } } catch (e) { demo = null; }
  setMode('title'); setTimeout(() => { const b = scr.title.querySelector('.btn'); b && b.focus({ preventScroll: true }); }, 30);
}
function stopDemo() { if (demo) { try { if (typeof demo === 'function') demo(); else if (demo.stop) demo.stop(); } catch (e) { } demo = null; } }

// ---- ajustes ----
function buildSettings() {
  const c = $('div', 'col', scr.settings), b = $('div', 'box', c); c.style.width = 'min(100%,calc(var(--k)*200px))';
  $('h2', 'lab', b, 'AJUSTES'); const body = $('div', '', b); body.style.cssText = 'display:flex;flex-direction:column;gap:calc(var(--p)*4px);margin-top:calc(var(--p)*4px)';
  body.innerHTML = '<div class="sm">CLAVE API (opcional, activa la IA real)</div><input type="password" id="rcv-key" placeholder="sk-ant-..." autocomplete="off"><div class="sm mut">Se guarda solo en este navegador. Sin clave, el juego usa el modo demo pregrabado.</div>'
    + '<div class="row"><button class="btn sm" id="rcv-keysave">GUARDAR</button><button class="btn sec sm" id="rcv-keydel">BORRAR</button></div>'
    + '<div class="row"><button class="btn sec" id="rcv-mute"></button><div class="grow"><div class="sm">VOLUMEN</div><input type="range" id="rcv-vol" min="0" max="100" style="width:100%"></div></div>'
    + '<button class="btn" id="rcv-close">CERRAR</button>';
  const q = id => b.querySelector('#' + id), sm = () => { q('rcv-mute').textContent = Aud.muted ? 'SONIDO: NO' : 'SONIDO: SI'; };
  q('rcv-keysave').onclick = () => { const k = q('rcv-key').value.trim(); setKey(k); toast(k ? 'Clave guardada' : 'Sin clave: modo demo'); Aud.sfx('decision'); };
  q('rcv-keydel').onclick = () => { q('rcv-key').value = ''; setKey(''); toast('Clave borrada'); };
  q('rcv-mute').onclick = () => { Aud.toggle(); sm(); Aud.sfx('click'); }; q('rcv-vol').oninput = e => Aud.setVol(e.target.value / 100);
  q('rcv-close').onclick = closeSettings; on('mute', sm); b.sync = () => { q('rcv-vol').value = Math.round(Aud.vol * 100); q('rcv-key').value = store.get('rcv2_key') || ''; sm(); }; scr.settings.box = b;
}
function setKey(k) { store.set('rcv2_key', k); try { window.Story && Story.setKey && Story.setKey(k); } catch (e) { } emit('key', k); }
function openSettings() { ensure(); scr.settings.box.sync(); scr.settings.classList.add('on'); }
function closeSettings() { scr.settings.classList.remove('on'); }

// ---- lobby ----
function normPlayers(p) { return Array.isArray(p) ? p : Object.values(p || {}); }
function showLobby() {
  ensure(); stopDemo(); show('lobby'); setMode('lobby'); Aud.setTrack('title'); renderLobby();
  const m = /#sala=([A-Za-z0-9]+)/.exec(location.hash || ''); if (m && !U.code) { const i = scr.lobby.querySelector('#rcv-code'); if (i) i.value = m[1].toUpperCase(); }
}
function lobbyUpdate(info) { if (info) { if (info.players) U.players = normPlayers(info.players); if (info.code) U.code = info.code; if (info.link) U.link = info.link; if (info.mode) U.mode = info.mode; } if (scr.lobby && scr.lobby.classList.contains('on')) renderLobby(); }
function renderLobby() {
  const L = scr.lobby, keep = (L.querySelector('#rcv-code') || {}).value || ''; L.innerHTML = '';
  const c = $('div', 'col', L), top = $('div', 'box', c);
  $('h2', 'lab', top, 'SALA DE ESPERA'); const body = $('div', '', top); body.style.cssText = 'display:flex;flex-direction:column;gap:calc(var(--p)*4px);margin-top:calc(var(--p)*4px)';
  const netOk = window.Net && Net.available !== false;
  if (U.mode === 'idle') {
    body.innerHTML = '<div class="sm">Juega en solitario (controlas a los tres) o invita a hasta 2 amigos con un enlace.</div><div class="row"><button class="btn" id="rcv-host">CREAR SALA</button><div class="row grow" style="flex-wrap:nowrap"><input type="text" id="rcv-code" maxlength="60" placeholder="CODIGO O ENLACE" class="grow"><button class="btn sec" id="rcv-join">UNIRSE</button></div></div>' + (netOk ? '' : '<div class="sm" style="color:var(--bad)">Multijugador no disponible (sin red). Solo modo solitario.</div>');
    body.querySelector('#rcv-code').value = keep;
    body.querySelector('#rcv-host').onclick = doHost; body.querySelector('#rcv-join').onclick = doJoin;
    body.querySelector('#rcv-code').onkeydown = e => { if (e.key === 'Enter') doJoin(); };
  } else {
    body.innerHTML = '<div class="sm mut">' + (U.mode === 'host' ? 'COMPARTE ESTE CODIGO' : 'CONECTADO A LA SALA') + '</div><div class="code">' + esc(U.code) + '</div>' + (U.link ? '<div class="row" style="flex-wrap:nowrap"><input type="text" id="rcv-link" readonly class="grow" value="' + esc(U.link) + '"><button class="btn" id="rcv-copy">COPIAR</button></div>' : '');
    const cp = body.querySelector('#rcv-copy'); if (cp) cp.onclick = () => copyText(U.link, body.querySelector('#rcv-link'));
  }
  // jugadores
  const pb = $('div', 'box', c); $('h2', 'lab', pb, 'EQUIPO - ELIGE TU PERSONAJE INICIAL');
  const cards = $('div', 'cards', pb); cards.style.marginTop = 'calc(var(--p)*4px)';
  RK.forEach((k, i) => {
    const d = rdef(k), taken = U.players.find(p => p && p.role === k && p.id !== localId && !p.bot && p.connected !== false), b = $('button', 'card' + (U.role === k ? ' sel' : '') + (taken ? ' taken' : ''), cards);
    b.appendChild(portrait(i)); $('div', '', b, '<span style="color:' + d.col + '">' + esc(d.name) + '</span>'); $('div', 'sm mut', b, esc(d.title)); $('div', 'sm', b, esc(d.desc));
    if (taken) $('div', 'sm', b, '<span style="color:var(--good)">&#9679; ' + esc(taken.name || 'Jugador') + '</span>');
    b.onclick = () => { if (taken) return Aud.sfx('error'); U.role = k; U.active = k; Aud.sfx('click'); emit('role', k); try { window.Net && Net.setRole && Net.role && Net.setRole(k); } catch (e) { } renderLobby(); };
  });
  const hum = U.players.filter(p => p && !p.bot); const pl = $('div', 'sm mut', pb, ''); pl.style.marginTop = 'calc(var(--p)*4px)';
  pl.innerHTML = hum.length ? hum.map(p => '<span class="dot ok"></span>' + esc(p.name || p.id) + (p.host ? ' (anfitrion)' : '')).join('&nbsp;&nbsp; ') + '<br>Los huecos libres los controla la IA.' : 'En solitario controlas a los tres personajes alternando (TAB / Q / E).';
  const act = $('div', 'row', c); act.style.justifyContent = 'space-between';
  const back = $('button', 'btn sec', act, 'VOLVER'); back.onclick = () => { Aud.sfx('back'); if (U.mode !== 'idle') { try { Net.leave && Net.leave(); } catch (e) { } U.mode = 'idle'; U.code = U.link = ''; U.players = []; } showTitle(); };
  const go = $('button', 'btn', act, U.mode === 'client' ? (U.ready ? 'NO ESTOY LISTO' : 'ESTOY LISTO') : 'EMPEZAR');
  go.onclick = () => { Aud.unlock(); if (U.mode === 'client') { U.ready = !U.ready; Aud.sfx('click'); emit('ready', U.ready); try { Net.send('ready', { ready: U.ready }); } catch (e) { } renderLobby(); } else { Aud.sfx('decision'); emit('start', { role: U.role, host: U.mode === 'host', solo: U.mode === 'idle' }); } };
  if (U.mode === 'client') $('div', 'sm mut', act, 'Esperando al anfitrion...');
}
function copyText(t, inp) { const ok = () => { toast('Enlace copiado'); Aud.sfx('decision'); }; try { navigator.clipboard.writeText(t).then(ok, () => { inp.select(); document.execCommand('copy'); ok(); }); } catch (e) { try { inp.select(); document.execCommand('copy'); ok(); } catch (x) { toast('Copia el enlace a mano'); } } }
function doHost() {
  Aud.sfx('click'); if (!window.Net || !Net.host) return toast('Multijugador no disponible'); toast('Creando sala...');
  Promise.resolve(Net.host({ name: 'Anfitrion' })).then(r => { U.mode = 'host'; U.code = r.roomCode; U.link = r.link; try { Net.setRole && Net.setRole(U.role); } catch (e) { } renderLobby(); emit('host', r); }).catch(e => { Aud.sfx('error'); toast((e && e.message) || 'No se pudo crear la sala'); });
}
function doJoin() {
  const v = (scr.lobby.querySelector('#rcv-code').value || '').trim(); if (!v) { Aud.sfx('error'); return toast('Escribe un codigo o pega el enlace'); }
  Aud.sfx('click'); toast('Conectando...'); Promise.resolve(Net.join(v, { name: 'Jugador' })).then(r => { U.mode = 'client'; U.code = r.roomCode || v; if (r.role) U.role = r.role; U.active = U.role; if (r.id) localId = r.id; renderLobby(); emit('join', r); }).catch(e => { Aud.sfx('error'); toast((e && e.message) || 'No se pudo unir'); });
}

// ---- HUD ----
let hudEls = {}, prevS = null, radioT = null, radioLines = [], radioR = 0;
function buildHud() {
  const l = $('div', 'hud-l', hud), rb = $('div', 'hbox rnd', l); hudEls.rnd = $('span', '', rb); hudEls.pips = $('span', '', rb); hudEls.pips.style.cssText = 'display:flex;gap:calc(var(--p)*2px)';
  const bx = $('div', 'hbox', l); bx.style.cssText = 'display:flex;flex-direction:column;gap:calc(var(--p)*2px)'; hudEls.bars = {};
  STATK.forEach(k => { const d = statDef(k), r = $('div', 'bar', bx); r.appendChild(icon(k, d.col)); const tr = $('div', 'tr', r), fi = $('div', 'fi', tr); fi.style.setProperty('--c', d.col); const v = $('span', 'v', r, '0'); r.title = d.label; hudEls.bars[k] = { r, fi, v, d }; });
  hudEls.team = $('div', 'team', hud); hudEls.por = {};
  RK.forEach((k, i) => { const b = $('button', 'por', hudEls.team); b.appendChild(portrait(i)); $('span', '', b, esc(rdef(k).name)).style.color = rdef(k).col; $('span', 'tg', b, '-'); $('span', 'kb', b, ['Q', 'TAB', 'E'][i]); b.onclick = () => switchTo(k); hudEls.por[k] = b; });
  hudEls.radio = $('div', 'radio hbox', hud); hudEls.who = $('div', 'who', hudEls.radio); hudEls.rtx = $('div', '', hudEls.radio); hudEls.rtx.style.minHeight = '3.3em';
}
function ownerOf(k) { const p = U.st && U.st.players && U.st.players[k]; return p ? p.owner : undefined; }
function canSwitch(k) { const o = ownerOf(k); return !o || o === localId; }
function switchTo(k) {
  if (!RK.includes(k) || k === U.active) return; if (!canSwitch(k)) { Aud.sfx('error'); return toast('Ese personaje lo controla otro jugador'); }
  U.active = k; Aud.sfx('select'); paintTeam(); switchCb.forEach(f => { try { f(k); } catch (e) { console.error(e); } });
}
function cycle(d) { const av = RK.filter(canSwitch); if (av.length < 2) return; let i = av.indexOf(U.active); i = i < 0 ? 0 : (i + d + av.length) % av.length; switchTo(av[i]); }
function paintTeam() {
  RK.forEach(k => {
    const b = hudEls.por[k], o = ownerOf(k), act = k === U.active; b.classList.toggle('act', act); b.classList.toggle('lock', !canSwitch(k));
    const nm = o && o !== localId ? ((U.players.find(p => p.id === o) || {}).name || 'J2') : null;
    b.querySelector('.tg').textContent = act ? 'TU' : nm ? nm.slice(0, 6) : (o === localId ? 'TUYO' : 'IA');
  });
}
function updateHud(state) {
  ensure(); if (!state) return; U.st = state; if (window.Net && Net.localId) localId = Net.localId; if (mode !== 'game' && mode !== 'cine') { stopDemo(); setMode('game'); }
  if (state.active && RK.includes(state.active)) U.active = state.active;
  const R = Story.ROUNDS || 5; hudEls.rnd.textContent = 'RONDA ' + state.round + '/' + R; hudEls.pips.innerHTML = ''; for (let i = 1; i <= R; i++) $('i', 'pip' + (i < state.round ? ' on' : i === state.round ? ' cur' : ''), hudEls.pips);
  STATK.forEach(k => {
    const e = hudEls.bars[k], v = clamp(Math.round(state.s[k]), 0, 100); e.fi.style.width = v + '%'; e.v.textContent = v;
    const warn = k === 'agua' ? v >= 70 : v <= 25; e.r.classList.toggle('warn', warn);
    if (prevS && prevS[k] !== v) { const dlt = v - prevS[k], good = k === 'agua' ? dlt < 0 : dlt > 0, s = $('span', 'dl', e.r, (dlt > 0 ? '+' : '') + dlt); s.style.color = good ? 'var(--good)' : 'var(--bad)'; setTimeout(() => s.remove(), 1500); }
  });
  prevS = Object.assign({}, state.s); paintTeam();
  if (state.round !== radioR) { radioR = state.round; try { radioLines = Story.dialogue(state.round, state) || []; } catch (e) { radioLines = []; } radioI = 0; radioTimer = 0; }
  if (state.verdict === undefined) { /* nada */ }
  Aud.setTrack('r' + clamp(state.round, 1, 5)); Aud.wind(0);
  if (Object.keys(U.pickPills || {}).length || U.decRole) refreshDecision(state);
}
let radioI = 0, radioTimer = 0, typeI = 0, typeTxt = '';
function say(text, who) { ensure(); hudEls.radio.classList.add('on'); hudEls.who.innerHTML = '<span class="blink">&#9679;</span> ' + esc((who || 'RADIO').toUpperCase()); typeTxt = text; typeI = 0; hudEls.rtx.textContent = ''; Aud.sfx('radio'); kick(); }
function radioStep(dt) {
  if (typeI < typeTxt.length) { const n0 = Math.floor(typeI); typeI += dt * 32; const n1 = Math.floor(typeI); if (n1 !== n0) { hudEls.rtx.textContent = typeTxt.slice(0, n1); if (typeTxt[n1 - 1] !== ' ' && n1 % 2) Aud.sfx('blip', { f: 700 }); } return; }
  radioTimer += dt; if (radioTimer > 4.5 + typeTxt.length * .03 && radioLines.length) { radioTimer = 0; const l = radioLines[radioI++ % radioLines.length]; say(l.text || l, l.who); }
}

// ---- decision ----
function meets(req, s) { if (!req) return true; if (!s) return true; if (typeof req === 'function') return !!req(s); return Object.keys(req).every(k => s[k] == null || s[k] >= req[k]); }
function reqText(req) { return typeof req === 'object' ? Object.keys(req).map(k => statDef(k).label + ' &ge; ' + req[k]).join(', ') : String(req); }
function showDecision(rd, onPick, opts) {
  ensure(); opts = opts || {}; const role = rd.role || U.active, state = opts.state || U.st, d = rdef(role), i = ROLE_DEF[role].i;
  const priv = rd.private && typeof rd.private === 'object' ? rd.private[role] : rd.private, options = Array.isArray(rd.options) ? rd.options : (rd.options && rd.options[role]) || [];
  U.decRole = role; U.active = role; const S = scr.decision; S.innerHTML = ''; S.classList.add('on'); Aud.sfx('select'); if (mode === 'game') paintTeam();
  const c = $('div', 'col', S), head = $('div', 'box', c), hr = $('div', 'row', head); hr.appendChild(portrait(i)); hr.lastChild.style.cssText = 'width:calc(var(--p)*28px);height:calc(var(--p)*30px)';
  const ht = $('div', 'grow', hr, '<div class="lab">DECIDE ' + (state ? 'RONDA ' + state.round : '') + '</div><div style="color:' + d.col + '">' + esc(d.full || d.name) + '</div>');
  U.pillsEl = $('div', 'pills', hr); U.pickPills = {}; RK.forEach(k => { U.pickPills[k] = $('span', 'pill', U.pillsEl, esc(rdef(k).name)); });
  refreshDecision(state);
  if (rd.scene) { const b = $('div', 'box', c); $('div', 'lab', b, 'ESCENA'); $('div', '', b, esc(rd.scene)).style.marginTop = 'calc(var(--p)*2px)'; }
  if (priv) { const b = $('div', 'box priv', c); $('div', 'lab', b, 'SOLO PARA TI &middot; ' + esc(d.name).toUpperCase()); $('div', '', b, esc(priv)).style.marginTop = 'calc(var(--p)*2px)'; }
  const ol = $('div', '', c); ol.style.cssText = 'display:flex;flex-direction:column;gap:calc(var(--p)*3px)'; let done = false; const btns = [];
  options.slice(0, 3).forEach((o, n) => {
    const ok = !o.disabled && meets(o.req, state && state.s), b = $('button', 'opt', ol); b.disabled = !ok; $('span', 'key', b, String(n + 1));
    $('span', '', b, esc(o.text) + (o.req && !ok ? '<span class="rq">Requiere ' + reqText(o.req) + '</span>' : '')); btns.push(b);
    b.onclick = () => choose(n);
  });
  function choose(n) {
    if (done || !options[n] || btns[n].disabled) { if (!done) Aud.sfx('error'); return; } done = true; btns[n].classList.add('pick'); Aud.sfx('decision'); U.decKey = null;
    setTimeout(() => { if (!opts.keep) hideDecision(); try { onPick && onPick(n, role); } catch (e) { console.error(e); } }, 320);
  }
  U.decKey = n => choose(n); setTimeout(() => { const f = btns.find(b => !b.disabled); f && f.focus({ preventScroll: true }); }, 40);
}
function refreshDecision(state) { if (!U.pickPills) return; RK.forEach(k => { const p = U.pickPills[k]; if (p) { const ok = state && state.picks && state.picks[k] != null; p.className = 'pill' + (ok ? ' ok' : ''); p.textContent = (ok ? '✓ ' : '') + rdef(k).name; } }); }
function hideDecision() { scr.decision.classList.remove('on'); U.decRole = null; U.decKey = null; U.pickPills = null; }
// Decide en cadena por todos los personajes sin pick que controle este humano (o los 3 en solitario).
function decide(state, onPick, onDone, roles) {
  const rd = state.roundData; if (!rd) return onDone && onDone();
  const list = (roles || RK.filter(k => canSwitch(k))).filter(k => !(state.picks && state.picks[k] != null));
  (function next(i) {
    if (i >= list.length) return onDone && onDone(); const k = list[i];
    showDecision({ role: k, scene: rd.scene, private: rd.private[k], options: rd.options[k] }, (n, r) => { onPick && onPick(r, n); next(i + 1); }, { state });
  })(0);
}

// ---- final ----
function showFinal(state) {
  ensure(); stopDemo(); hideDecision(); const F = scr.final; F.innerHTML = ''; show('final'); const ok = Story.saved ? Story.saved(state) : state.saved; U.win = ok; setMode('final'); Aud.setTrack(ok ? 'win' : 'lose'); Aud.wind(ok ? 0 : .5); Aud.sfx(ok ? 'win' : 'lose');
  const c = $('div', 'col', F), h = $('div', 'box', c), t = $('div', 'big', h, ok ? 'LIA ESTA A SALVO' : (state.s.agua >= 100 ? 'EL AGUA GANO' : 'NO LLEGASTEIS A TIEMPO')); t.style.color = ok ? 'var(--sun)' : 'var(--bad)';
  $('div', 'sm mut', h, ok ? 'Salisteis de la cueva al amanecer.' : 'La cueva guarda su secreto.').style.cssText = 'text-align:center;margin-top:calc(var(--p)*3px)';
  const fb = $('div', 'fbar', h); fb.style.marginTop = 'calc(var(--p)*5px)'; STATK.forEach(k => { const d = statDef(k), v = clamp(Math.round(state.s[k]), 0, 100); $('div', '', fb, '<div class="sm" style="color:' + d.col + '">' + esc(d.label) + ' ' + v + '</div><div class="tr"><i style="width:' + v + '%;background:' + d.col + '"></i></div>'); });
  const ob = $('div', 'box', c); $('div', 'lab', ob, 'OBJETIVOS INDIVIDUALES'); let objs = []; try { objs = Story.objectives(state) || []; } catch (e) { }
  objs.forEach(o => { const r = $('div', 'obj', ob); r.style.marginTop = 'calc(var(--p)*2px)'; r.innerHTML = '<b style="color:' + (o.ok ? 'var(--good)' : 'var(--bad)') + '">' + (o.ok ? '[OK]' : '[X]') + '</b><span><span style="color:' + rdef(o.role).col + '">' + esc(rdef(o.role).name) + '</span>: ' + esc(o.text) + '</span>'; });
  const vb = $('div', 'box', c); $('div', 'lab', vb, 'VEREDICTO'); const vt = $('div', 'ver', vb, '...'); vt.style.marginTop = 'calc(var(--p)*2px)';
  let vi = 0, txt = ''; const tw = setInterval(() => { if (!txt) return; vi += 2; vt.textContent = txt.slice(0, vi); if (vi % 4 === 0) Aud.sfx('blip', { f: 420 }); if (vi >= txt.length) clearInterval(tw); }, 30);
  Promise.resolve(Story.verdict ? Story.verdict(state) : state.verdict).then(v => { txt = String(v || state.verdict || ''); }).catch(() => { txt = state.verdict || 'Fin.'; });
  const act = $('div', 'row', c); act.style.justifyContent = 'center'; const r = $('button', 'btn', act, 'JUGAR OTRA VEZ'), m = $('button', 'btn sec', act, 'MENU');
  r.onclick = () => { clearInterval(tw); Aud.sfx('decision'); emit('restart'); }; m.onclick = () => { clearInterval(tw); Aud.sfx('back'); emit('menu'); showTitle(); }; setTimeout(() => r.focus({ preventScroll: true }), 50);
}

// ---- cinematicas ----
let C = null, cineEls = {};
function buildCine() {
  const tx = $('div', 'ctext', cine); ctextEl = tx; cineEls.who = $('div', 'who', tx); cineEls.tx = $('div', 'tx', tx); cineEls.nx = $('div', 'nx', tx, '&#9660;'); cineEls.nx.style.display = 'none';
  const ti = $('div', 'ctitle', cine, '<div class="logo"><span class="l1">RESCATE EN</span><span class="l2">LA CUEVA</span></div>'); cineEls.title = ti;
  const sk = $('div', 'skip', cine, 'ESPACIO &#9656;  ESC SALTAR'); sk.onclick = e => { e.stopPropagation(); finishCine(); };
}
function lineOf(x) { if (x == null) return { text: '' }; if (typeof x === 'string') return { text: x }; return { text: x.text || x.t || '', who: x.who || x.speaker || '' }; }
function playCinematic(id, opts) {
  ensure(); opts = opts || {}; if (typeof id === 'number') id = 'ronda' + id; const m = /^(?:r|ronda)(\d)$/.exec(id); if (m) id = BYROUND[m[1]] || 'agua';
  return new Promise(res => {
    if (C) finishCine(true); stopDemo(); hideDecision(); const prev = mode === 'game' ? 'game' : 'blank';
    let beats, intro = id === 'intro';
    if (intro) {
      const src = (window.Story && (Story.intro.beats || Story.intro)) || [], arr = (Array.isArray(src) ? src : [src]).map(lineOf), n = arr.length;
      beats = arr.map((b, i) => Object.assign(b, { shot: n < 2 ? 0 : Math.round(i * 6 / (n - 1)) })); beats.push({ text: '', shot: 7, hold: 5 });
      Aud.setTrack('intro'); Aud.wind(.3);
    } else {
      const S = SHORT[id] || SHORT.agua; let ln = opts.text ? { text: opts.text, who: opts.who } : null;
      if (!ln) { try { const r = (opts.round || (U.st && U.st.round) || 1), d = Story.dialogue(r, U.st); ln = d && d.length ? lineOf(d[Math.floor(Math.random() * d.length)]) : null; } catch (e) { } }
      beats = [{ text: (ln && ln.text) || S.tt, who: ln && ln.who, shot: -1, hold: S.d }];
    }
    C = { id, intro, beats, i: -1, res, prev, bar: 0, fade: 1, closing: false, T0: T, st: 0, ti: 0, tl: '', pause: 0, wait: 0, done: false, fired: {}, S: SHORT[id] };
    setMode('cine'); show(null); cineEnter(0); kick();
  });
}
function cineEnter(i) {
  const b = C.beats[i]; C.i = i; C.st = 0; C.ti = 0; C.tl = b.text || ''; C.who = b.who || ''; C.wait = 0; C.fired = {}; C.fade = C.intro ? 1 : C.fade; C.pause = 0;
  cineEls.who.textContent = C.who ? C.who.toUpperCase() : ''; cineEls.tx.textContent = ''; cineEls.nx.style.display = 'none'; cineEls.title.classList.toggle('on', b.shot === 7);
  C.voice = /l.a|radio/i.test(C.who) ? 760 : C.who ? 430 + (C.who.length * 37) % 140 : 520; if (C.intro) Aud.wind(.25 + .6 * clamp(b.shot / 5, 0, 1));
}
function cineNext() {
  if (!C || C.closing) return; Aud.unlock();
  if (C.ti < C.tl.length) { C.ti = C.tl.length; cineEls.tx.textContent = C.tl; return; }
  if (C.i + 1 < C.beats.length) cineEnter(C.i + 1); else C.closing = true;
}
function finishCine(silent) {
  if (!C) return; const c = C; C = null; cineEls.title.classList.remove('on'); ctextEl.classList.remove('on'); Aud.wind(0);
  if (!silent) { if (c.prev === 'game') setMode('game'); else { setMode('blank'); } }
  c.res();
}
function cineStep(dt) {
  const c = C, g = bg.getContext('2d'); g.imageSmoothingEnabled = false; c.st += dt;
  if (c.closing) { c.bar -= dt / .6; c.fade = Math.min(1, c.fade + dt * 1.5); ctextEl.classList.remove('on'); if (c.bar <= 0) { return finishCine(); } }
  else { c.bar = Math.min(1, c.bar + dt / .9); c.fade = Math.max(0, c.fade - dt * 1.6); ctextEl.classList.toggle('on', c.bar >= 1 && !!c.tl); }
  // maquina de escribir
  if (c.bar >= 1 && c.ti < c.tl.length) {
    if (c.pause > 0) c.pause -= dt; else { const a = Math.floor(c.ti); c.ti += dt * 34; const b = Math.floor(c.ti); if (b !== a) { cineEls.tx.textContent = c.tl.slice(0, b); const ch = c.tl[b - 1]; if (ch !== ' ' && b % 2) Aud.sfx('blip', { f: c.voice + (b % 5) * 12 }); if (/[,;:]/.test(ch)) c.pause = .16; if (/[.!?]/.test(ch)) c.pause = .34; } }
  } else if (c.bar >= 1 && !c.closing) {
    cineEls.nx.style.display = c.tl ? 'block' : 'none'; c.wait += dt; const hold = c.beats[c.i].hold;
    if (hold ? c.st > hold : c.wait > Math.max(2.6, c.tl.length * .055 + 1.4)) cineNext();
  }
  const sh = c.beats[c.i].shot, typing = c.ti < c.tl.length;
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  if (c.intro) {
    const S = SHOTS[sh]; if (S && S.ev) S.ev.forEach((e, k) => { if (c.st >= e[0] && !c.fired[k]) { c.fired[k] = 1; Aud.sfx(e[1]); } });
    drawIntroShot(g, sh, c.st, T, dt, typing);
  } else {
    const S = c.S || SHORT.agua, d = S.d; S.ev.forEach((e, k) => { if (c.st >= e[0] && !c.fired[k]) { c.fired[k] = 1; Aud.sfx(e[1]); } });
    S.draw(g, Math.min(c.st, d), d, T); if (c.st > d + .2 && !c.closing) { c.ti = c.tl.length; c.closing = true; }
  }
  vignette(g);
  if (c.fade > 0) { g.globalAlpha = Math.min(1, c.fade); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  const bh = Math.round(24 * ease(c.bar)); g.fillStyle = '#05020a'; g.fillRect(0, 0, W, bh); g.fillRect(0, H - bh, W, bh); g.fillStyle = '#2a1b48'; if (bh) { g.fillRect(0, bh, W, 1); g.fillRect(0, H - bh - 1, W, 1); }
}
function bgStep(dt) {
  const g = bg.getContext('2d'); g.imageSmoothingEnabled = false; const win = mode === 'final' && U.win, lose = mode === 'final' && !U.win;
  if (mode === 'title' && assetImg('sky_layers') && !demo) {
    const im = assetImg('sky_layers'), par = [0, .1, .25, .45, .8]; for (let i = 0; i < 5; i++) { const off = mod(T * par[i] * 14, 320); g.drawImage(im, 0, i * 180, 320, 180, -off, 0, 320, 180); g.drawImage(im, 0, i * 180, 320, 180, 320 - off, 0, 320, 180); }
    const cam = { x: 0, y: 0 }; drawCableLine(g, cam); drawCabin(g, Math.round(mod(T * 9, 420) - 50), Math.round(cableYw(mod(T * 9, 420) - 50)), 2, .5, true, T);
  } else drawWorld(g, { cam: { x: T * 7, y: 20 + Math.sin(T * .2) * 6 }, storm: lose ? 1 : 0, pal: win ? 'dawn' : 'dusk', T, dt, snow: lose ? .9 : .3, wind: lose ? 80 : 14, cab: { x: mod(T * 9, 560) - 40, s: 1, sw: .5 } });
  vignette(g);
}
function frame(now) {
  raf = 0; const dt = Math.min(.05, (now - last) / 1000); last = now; T += dt;
  if (C) cineStep(dt); else if (mode === 'title' || mode === 'lobby' || mode === 'final') { if (!(mode === 'title' && demo)) bgStep(dt); }
  if (mode === 'game' && hudEls.radio.classList.contains('on') || typeI < typeTxt.length) radioStep(dt);
  if (C || mode === 'title' || mode === 'lobby' || mode === 'final' || mode === 'game') raf = requestAnimationFrame(frame);
}
function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

function onKey(e) {
  const tag = (e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'textarea';
  if (scr.settings.classList.contains('on')) { if (e.key === 'Escape') { closeSettings(); e.preventDefault(); } return; }
  if (typing) return;
  if (C) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); cineNext(); } else if (e.key === 'Escape') { e.preventDefault(); finishCine(); } return; }
  if ((e.key === 'm' || e.key === 'M')) { Aud.unlock(); Aud.toggle(); return; }
  if (U.decKey && /^[1-3]$/.test(e.key)) { e.preventDefault(); e.stopPropagation(); U.decKey(+e.key - 1); return; }
  if (mode === 'title' && e.key === 'Enter' && document.activeElement && document.activeElement.tagName !== 'BUTTON') { scr.title.querySelector('.btn').click(); return; }
  if (mode === 'game' && !scr.decision.classList.contains('on')) {
    if (e.key === 'Tab') { e.preventDefault(); cycle(1); } else if (e.key === 'q' || e.key === 'Q') cycle(-1); else if (e.key === 'e' || e.key === 'E') cycle(1);
  }
}
// Net: lista de jugadores en vivo
function hookNet() { if (window.Net && Net.on) { try { Net.on('players', p => { U.players = normPlayers(p); if (U.st) paintTeam(); lobbyUpdate(); }); } catch (e) { } } }
const api = {
  showTitle, showLobby, playCinematic, showDecision, updateHud, showFinal, toast,
  decide, hideDecision, say, lobbyUpdate, openSettings,
  gameCanvas() { ensure(); return gc; },
  showGame() { ensure(); stopDemo(); show(null); setMode('game'); },
  hideAll() { ensure(); show(null); setMode('blank'); },
  setLocalId(id) { localId = id; if (U.st) paintTeam(); },
  setActive(role) { if (RK.includes(role)) { U.active = role; if (hudEls.por) paintTeam(); } },
  getActive() { return U.active; },
  onSwitch(cb) { switchCb.push(cb); }, switchTo, on, emit
};
const UI = { api, audio: Aud, sfx: Aud.sfx, cfg: {} };
Object.assign(UI, api);
window.UI = UI;
const boot = () => { try { hookNet(); } catch (e) { } }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
