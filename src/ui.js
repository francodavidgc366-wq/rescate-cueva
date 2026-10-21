/* ui.js - Rescate en la Cueva v3. Pantallas fuera de la partida: menu, tutorial, cinematica, rol, lobby, final, logros, ajustes, creditos. window.UI
   Audio: NO va aqui (window.Sound, con guardas). Arte: ASSETS.* si existe; si no, fallback procedural. */
(function () {
'use strict';
const $ = (t, c, p, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; if (p) p.appendChild(e); return e; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };
const jget = (k, d) => { try { return JSON.parse(store.get(k)) || d; } catch (e) { return d; } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => { t = clamp(t, 0, 1); return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = {};
const on = (e, f) => { (ev[e] = ev[e] || []).push(f); };
const emit = (e, d) => { (ev[e] || []).forEach(f => { try { f(d); } catch (x) { console.error(x); } }); };
const snd = (m, a, b) => { try { if (window.Sound && Sound[m]) return Sound[m](a, b); } catch (e) { } };
const sfx = (n, o) => snd('sfx', n, o);
const RK = ['guia', 'medica', 'ing'];
const RD = {
  guia: { n: 'Mateo', t: 'El guia', col: '#f0a030', hat: '#e0a030', body: '#c0392b', skill: 'Conoce las galerias: lee rutas y abre atajos.', ai: 'Cauto y reservado', goal: 'Mantener unido al equipo.' },
  medica: { n: 'Elena', t: 'La medica', col: '#2fd0b0', hat: '#e8e8f0', body: '#2e9e6b', skill: 'Cuida de Lia: lee su estado y detecta lo que otros no ven.', ai: 'Empatica, directa', goal: 'Que Lia llegue con salud.' },
  ing: { n: 'Samuel', t: 'El ingeniero', col: '#5aa8ff', hat: '#4aa0e8', body: '#7a5a3a', skill: 'Mide el agua y gestiona el material y los anclajes.', ai: 'Tecnico, algo orgulloso', goal: 'Cuidar el material.' }
};
const rinfo = k => { const R = (window.Story && Story.ROLES && Story.ROLES[k]) || {}; const d = RD[k]; return { id: k, n: R.short || d.n, full: R.name || (d.n + ', ' + d.t), t: d.t, col: d.col, hat: R.hat || d.hat, body: R.body || d.body, skill: R.skill || d.skill, ai: R.personality || d.ai, goal: R.goal || d.goal }; };
const GRADE = { S: '#ffd34d', A: '#6be08a', B: '#5ab8ff', C: '#ff9a4d', D: '#ff5a5a' };
const ICONS = ['agua', 'salud', 'material', 'confianza', 'cuerda', 'bateria', 'radio', 'mapa', 'botiquin', 'llave', 'ojo', 'candado', 'trofeo', 'estrella', 'reloj', 'chat', 'voto', 'alerta', 'secreto', 'ap'];
const EMO = { agua: '\u{1F4A7}', salud: '❤️', material: '\u{1F9F0}', confianza: '\u{1F91D}', cuerda: '\u{1FAA2}', bateria: '\u{1F50B}', radio: '\u{1F4FB}', mapa: '\u{1F5FA}️', botiquin: '\u{1FA79}', llave: '\u{1F511}', ojo: '\u{1F441}️', candado: '\u{1F512}', trofeo: '\u{1F3C6}', estrella: '⭐', reloj: '⏱️', chat: '\u{1F4AC}', voto: '\u{1F5F3}️', alerta: '⚠️', secreto: '\u{1F92B}', ap: '●' };

/* ================= Ajustes ================= */
const DEF = { diff: 'normal', ts: 1, flash: false, narr: false, vol: { music: .7, sfx: .8, voice: .9 }, mute: false };
let S = Object.assign({}, DEF, jget('rcv3_set', {})); S.vol = Object.assign({}, DEF.vol, S.vol);
const saveS = () => store.set('rcv3_set', JSON.stringify(S));
function applySound() { try { if (window.Sound) { Object.keys(S.vol).forEach(k => k === 'master' ? (Sound.setVolume && Sound.setVolume(S.vol[k])) : (Sound.setVol && Sound.setVol(k, S.vol[k]))); Sound.mute && Sound.mute(!!S.mute); } } catch (e) { } }

/* ================= Assets ================= */
const IM = {};
function getImg(name) { // Image o null; onload dispara 'rcv-img'
  const A = window.ASSETS; if (!A || !A.images || !A.images[name]) return null;
  if (IM[name]) return IM[name];
  const im = new Image(); im.onload = () => { im.ok = true; (im._cb || []).forEach(f => f()); }; im.src = A.images[name]; return IM[name] = im;
}
const withImg = (name, f) => { const im = getImg(name); if (!im) return false; if (im.ok) f(im); else (im._cb = im._cb || []).push(() => f(im)); return true; };
const meta = n => (window.ASSETS && ASSETS.meta && ASSETS.meta[n]) || {};

/* ---- retratos / iconos / trofeos ---- */
const EXPR = { neutral: 0, preocupado: 1, enfadado: 2, feliz: 3 };
function faceFallback(c, role, expr) {
  const g = c.getContext('2d'); g.clearRect(0, 0, 48, 48); const d = role === 'lia' ? { hat: '#7a3b2a', body: '#8855cc' } : role === 'director' ? { hat: '#2b2b3a', body: '#4a3a6a' } : rinfo(role);
  g.fillStyle = '#1a1430'; g.fillRect(0, 0, 48, 48); g.fillStyle = d.body; g.fillRect(8, 36, 32, 12); g.fillRect(12, 32, 24, 6);
  g.fillStyle = '#f0c8a0'; g.fillRect(15, 14, 18, 20); g.fillStyle = '#d8a880'; g.fillRect(15, 30, 18, 4);
  g.fillStyle = d.hat; g.fillRect(13, 9, 22, 8); g.fillRect(11, 14, 4, 8); g.fillRect(33, 14, 4, 8);
  const e = EXPR[expr] || 0; g.fillStyle = '#1a1020';
  if (e === 2) { g.fillRect(18, 21, 5, 2); g.fillRect(25, 21, 5, 2); g.fillRect(19, 23, 3, 3); g.fillRect(26, 23, 3, 3); g.fillRect(20, 30, 8, 2); }
  else { g.fillRect(19, 22, 3, e === 1 ? 3 : 4); g.fillRect(26, 22, 3, e === 1 ? 3 : 4); if (e === 1) { g.fillRect(18, 19, 5, 1); g.fillRect(26, 19, 5, 1); g.fillRect(21, 30, 6, 1); } else if (e === 3) { g.fillRect(19, 29, 10, 1); g.fillRect(20, 30, 8, 1); g.fillRect(21, 31, 6, 1); } else g.fillRect(21, 30, 6, 1); }
}
function portrait(role, expr, px) {
  const c = mk(48, 48); c.className = 'pix'; if (px) { c.style.width = c.style.height = px + 'px'; }
  faceFallback(c, role, expr);
  withImg('portrait_' + role, im => { const m = meta('portrait_' + role), fw = m.fw || 48, fh = m.fh || fw, i = EXPR[expr] || 0, cols = Math.max(1, Math.floor(im.width / fw));
    const g = c.getContext('2d'); g.clearRect(0, 0, 48, 48); g.imageSmoothingEnabled = false; g.drawImage(im, (i % cols) * fw, Math.floor(i / cols) * fh, fw, fh, 0, 0, 48, 48); });
  return c;
}
function icon(name, px) {
  px = px || 20; const i = Math.max(0, ICONS.indexOf(name === 'ap-punto' ? 'ap' : name)), s = $('span', 'ico'); s.style.cssText = 'width:' + px + 'px;height:' + px + 'px;font-size:' + px * .8 + 'px';
  s.textContent = EMO[name] || ''; const m = meta('icons');
  withImg('icons', im => { const fw = m.fw || 16, fh = m.fh || fw, names = m.names, idx = names && names.indexOf(name) >= 0 ? names.indexOf(name) : i, cols = Math.max(1, Math.floor(im.width / fw)), c = mk(fw, fh), g = c.getContext('2d'); g.drawImage(im, (idx % cols) * fw, Math.floor(idx / cols) * fh, fw, fh, 0, 0, fw, fh); c.className = 'pix'; c.style.cssText = 'width:100%;height:100%'; s.textContent = ''; s.appendChild(c); });
  return s;
}
function trophy(idx, px, locked) {
  const c = mk(32, 32); c.className = 'pix' + (locked ? ' lk' : ''); c.style.width = c.style.height = px + 'px'; const g = c.getContext('2d'), hue = (idx * 47) % 360;
  g.fillStyle = 'hsl(' + hue + ',55%,45%)'; g.beginPath(); g.arc(16, 16, 13, 0, 7); g.fill(); g.strokeStyle = '#ffd34d'; g.lineWidth = 3; g.stroke(); g.fillStyle = '#ffd34d'; g.font = '16px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', 16, 17);
  withImg('trophies', im => { const m = meta('trophies'), fw = m.fw || 32, fh = m.fh || fw, cols = Math.max(1, Math.floor(im.width / fw)), n = Math.max(1, cols * Math.floor(im.height / fh)), k = idx % n; g.clearRect(0, 0, 32, 32); g.imageSmoothingEnabled = false; g.drawImage(im, (k % cols) * fw, Math.floor(k / cols) * fh, fw, fh, 0, 0, 32, 32); });
  return c;
}

/* ================= Escenas procedurales (fallback de still_*) ================= */
const SCN = {
  valle: { sky: ['#2a1f4e', '#e07a3a'], sun: [230, 105], mt: ['#3a2c5c', '#2a2148', '#1a1535'], snow: 1 },
  cabina: { sky: ['#1a1830', '#3a3050'], int: 1 },
  tormenta: { sky: ['#0c0e1c', '#2a3048'], mt: ['#1a1d30', '#12142a', '#0a0b18'], storm: 1 },
  entrada: { sky: ['#14122a', '#2a2040'], mt: ['#1c1a34', '#141228', '#0c0a18'], cave: 1 },
  radio: { sky: ['#0e0c18', '#1c1830'], radio: 1 },
  mapa: { sky: ['#2a1c10', '#4a3420'], map: 1 },
  inundada: { sky: ['#06141c', '#0e2a3a'], flood: 1 },
  rescate: { sky: ['#f0c070', '#fff4d0'], mt: ['#5a6a9a', '#3a4a7a', '#26305a'], light: 1 },
  derrota: { sky: ['#050a10', '#0a1a24'], flood: 1, dark: 1 }
};
const SCC = {};
function scene(id) {
  if (SCC[id]) return SCC[id]; const P = SCN[id] || SCN.valle, c = mk(320, 180), g = c.getContext('2d'), r = rng(id.length * 977 + id.charCodeAt(0) * 31);
  const gr = g.createLinearGradient(0, 0, 0, 180); gr.addColorStop(0, P.sky[0]); gr.addColorStop(1, P.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, 320, 180);
  if (P.sun) { const rg = g.createRadialGradient(P.sun[0], P.sun[1], 2, P.sun[0], P.sun[1], 90); rg.addColorStop(0, 'rgba(255,220,150,.95)'); rg.addColorStop(.2, 'rgba(255,150,70,.5)'); rg.addColorStop(1, 'rgba(255,100,40,0)'); g.fillStyle = rg; g.fillRect(0, 0, 320, 180); }
  if (!P.int && !P.radio && !P.map && !P.flood) for (let i = 0; i < 25; i++) { g.fillStyle = 'rgba(255,255,255,' + r() * .5 + ')'; g.fillRect(r() * 320, r() * 70, 1, 1); }
  (P.mt || []).forEach((col, L) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, 180); let y = 70 + L * 30; for (let x = 0; x <= 320; x += 8) { y += (r() - .5) * 18; y = clamp(y, 50 + L * 28, 120 + L * 25); g.lineTo(x, y); } g.lineTo(320, 180); g.fill(); });
  if (P.snow || P.storm || P.cave) { g.fillStyle = '#0a0a16'; for (let i = 0; i < 26; i++) { const x = r() * 320, h = 14 + r() * 22, y = 150 + r() * 20; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5, y + h); g.lineTo(x + 5, y + h); g.fill(); g.fillRect(x - 1, y + h, 2, 5); } }
  if (P.snow) { g.strokeStyle = '#1a1a2a'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 40); g.lineTo(320, 70); g.stroke(); g.fillStyle = '#c04030'; g.fillRect(150, 46, 18, 12); g.fillStyle = '#ffd890'; g.fillRect(153, 49, 4, 4); g.fillRect(160, 49, 4, 4); }
  if (P.storm) { g.strokeStyle = '#05050c'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 30); g.lineTo(320, 60); g.stroke(); g.fillStyle = '#05050c'; for (let i = 0; i < 8; i++) { g.beginPath(); g.ellipse(r() * 320, r() * 40, 50 + r() * 40, 14 + r() * 8, 0, 0, 7); g.fill(); } }
  if (P.cave) { g.fillStyle = '#0a0812'; g.beginPath(); g.ellipse(160, 140, 62, 52, 0, Math.PI, 0); g.rect(98, 140, 124, 40); g.fill(); const rg = g.createRadialGradient(160, 150, 4, 160, 150, 70); rg.addColorStop(0, 'rgba(255,170,70,.55)'); rg.addColorStop(1, 'rgba(255,170,70,0)'); g.fillStyle = rg; g.fillRect(80, 80, 160, 100); g.fillStyle = '#ffd890'; g.fillRect(158, 140, 4, 6); }
  if (P.int) { g.fillStyle = '#0a0812'; g.fillRect(0, 0, 320, 18); g.fillRect(0, 160, 320, 20); g.fillRect(0, 0, 22, 180); g.fillRect(298, 0, 22, 180); g.fillRect(155, 0, 10, 180); [[70, '#c0392b', '#e0a030'], [150, '#2e9e6b', '#e8e8f0'], [235, '#7a5a3a', '#4aa0e8']].forEach(([x, b, h]) => { g.fillStyle = '#05050c'; g.beginPath(); g.ellipse(x, 130, 26, 40, 0, Math.PI, 0); g.fill(); g.fillRect(x - 26, 130, 52, 50); g.fillStyle = h; g.fillRect(x - 11, 74, 22, 7); }); }
  if (P.radio) { g.fillStyle = '#2a2a3a'; g.fillRect(60, 40, 200, 110); g.fillStyle = '#16161f'; g.fillRect(70, 50, 180, 90); g.fillStyle = '#103020'; g.fillRect(80, 60, 100, 30); g.fillStyle = '#4cff9a'; g.font = '14px monospace'; g.fillText('146.520', 92, 82); g.fillStyle = '#555'; g.beginPath(); g.arc(215, 80, 22, 0, 7); g.fill(); g.fillStyle = '#aaa'; g.fillRect(213, 60, 4, 16); for (let i = 0; i < 12; i++) { g.fillStyle = '#333'; g.fillRect(84 + i * 6, 105, 3, 24); } g.strokeStyle = '#2a2a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(250, 40); g.lineTo(290, 0); g.stroke(); }
  if (P.map) { g.fillStyle = '#d8c08a'; g.fillRect(40, 20, 240, 140); g.strokeStyle = '#6a4a2a'; g.lineWidth = 1; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(50, 30 + i * 15); g.bezierCurveTo(120, 20 + i * 15 + r() * 30, 200, 60 + r() * 60, 270, 30 + i * 14); g.stroke(); } g.strokeStyle = '#a02818'; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(60, 140); g.bezierCurveTo(110, 90, 160, 130, 200, 70); g.lineTo(255, 40); g.stroke(); g.setLineDash([]); g.fillStyle = '#a02818'; g.font = 'bold 18px sans-serif'; g.fillText('X', 248, 48); }
  if (P.flood) { g.fillStyle = P.dark ? '#02060a' : '#0a1018'; for (let i = 0; i < 14; i++) { const x = r() * 320; g.beginPath(); g.moveTo(x - 7, 0); g.lineTo(x + 7, 0); g.lineTo(x, 22 + r() * 36); g.fill(); } const wl = P.dark ? 70 : 105, wg = g.createLinearGradient(0, wl, 0, 180); wg.addColorStop(0, 'rgba(60,140,190,.75)'); wg.addColorStop(1, 'rgba(8,30,50,.95)'); g.fillStyle = wg; g.fillRect(0, wl, 320, 180 - wl); g.fillStyle = 'rgba(180,230,255,.35)'; for (let i = 0; i < 40; i++) g.fillRect(r() * 320, wl + r() * 70, 6 + r() * 14, 1); if (!P.dark) { g.fillStyle = '#8855cc'; g.fillRect(195, wl - 16, 12, 18); g.fillStyle = '#f0c8a0'; g.fillRect(197, wl - 24, 8, 8); } }
  if (P.light) { const rg = g.createRadialGradient(160, 90, 4, 160, 90, 140); rg.addColorStop(0, 'rgba(255,255,230,1)'); rg.addColorStop(1, 'rgba(255,230,160,0)'); g.fillStyle = rg; g.fillRect(0, 0, 320, 180); g.fillStyle = '#10101c'; g.beginPath(); g.moveTo(0, 180); g.lineTo(0, 60); g.lineTo(90, 100); g.lineTo(130, 140); g.lineTo(190, 140); g.lineTo(230, 100); g.lineTo(320, 60); g.lineTo(320, 180); g.fill(); }
  return SCC[id] = c;
}
function stillSrc(id) { const im = getImg('still_' + id); return im && im.ok ? im : scene(id); }
function loadStill(id) { return new Promise(res => { const im = getImg('still_' + id); if (!im || im.ok) return res(); im._cb = (im._cb || []).concat(res); im.onerror = res; setTimeout(res, 1500); }); }

/* ================= CSS ================= */
const css = `
#rcv3{position:fixed;inset:0;z-index:60;font-family:'Trebuchet MS','Segoe UI',system-ui,sans-serif;font-size:calc(clamp(13px,.5vw + 9px,17px) * var(--ts,1));color:#f3e9d2;pointer-events:none;--amb:#f0a030;--vio:#7b5fd0;--teal:#2fd0b0;--bg:#0d0b1a;--bg2:#1a1430;--good:#6be08a;--bad:#ff6a6a;--mut:#a89fc4}
#rcv3 *{box-sizing:border-box}
#rcv3 .px,#rcv3 .btn,#rcv3 h1,#rcv3 h2,#rcv3 .lab{font-family:'Press Start 2P','Courier New',monospace;font-weight:400}
#rcv3 .pix{image-rendering:pixelated}
#rcv3 .scr{position:absolute;inset:0;display:none;pointer-events:auto;background:var(--bg);overflow:hidden;flex-direction:column}
#rcv3 .scr.on{display:flex;animation:rfade .45s ease both}
#rcv3 .scr.scroll{overflow-y:auto}
@keyframes rfade{from{opacity:0}to{opacity:1}}
@keyframes rrise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes rpop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.12);opacity:1}100%{transform:scale(1)}}
@keyframes rpulse{50%{transform:scale(1.06)}}
@keyframes rglow{50%{filter:brightness(1.35)}}
@keyframes rshake{20%{transform:translate(-6px,3px)}40%{transform:translate(5px,-4px)}60%{transform:translate(-3px,2px)}80%{transform:translate(2px,-1px)}}
@keyframes rfloat{from{transform:translateY(0)}to{transform:translateY(-70px);opacity:0}}
#rcv3 .bgc{position:absolute;inset:0;width:100%;height:100%;display:block}
#rcv3 .rel{position:relative;z-index:2}
#rcv3 h1{font-size:clamp(18px,4.6vw,44px);line-height:1.25;margin:0;color:#ffe9b8;text-shadow:0 3px 0 #7a3a10,0 0 24px rgba(240,160,48,.6);text-align:center;letter-spacing:1px}
#rcv3 h2{font-size:clamp(11px,2vw,18px);margin:0 0 .6em;color:var(--amb);line-height:1.5}
#rcv3 .lab{font-size:.62em;color:var(--mut);letter-spacing:1px;line-height:1.6}
#rcv3 .mut{color:var(--mut)}
#rcv3 .btn{font-size:clamp(9px,1.4vw,13px);color:#fff4d8;background:linear-gradient(#5a3fa0,#3a2870);border:3px solid var(--amb);border-radius:2px;padding:.9em 1.2em;cursor:pointer;box-shadow:0 4px 0 #1a1030,0 0 0 1px #000;transition:transform .1s,box-shadow .15s,filter .15s;text-align:center;line-height:1.4;position:relative}
#rcv3 .btn:hover,#rcv3 .btn:focus-visible,#rcv3 .btn.sel{transform:translateY(-2px);filter:brightness(1.25);box-shadow:0 6px 0 #1a1030,0 0 18px rgba(240,160,48,.55);outline:none}
#rcv3 .btn:active{transform:translateY(3px);box-shadow:0 1px 0 #1a1030}
#rcv3 .btn.sec{background:linear-gradient(#2c2548,#1c1730);border-color:#6a5a9a}
#rcv3 .btn.go{background:linear-gradient(#e0a030,#b06a18);color:#2a1408;border-color:#ffe08a}
#rcv3 .btn:disabled{opacity:.4;pointer-events:none}
#rcv3 .btn .k{position:absolute;right:.5em;top:50%;transform:translateY(-50%);font-size:.7em;opacity:.55;border:1px solid currentColor;padding:.25em .45em}
#rcv3 .panel{background:linear-gradient(#20193c,#161230);border:3px solid #6a4a20;border-radius:3px;padding:1em 1.2em;box-shadow:inset 0 0 0 2px #0d0b1a,0 6px 24px rgba(0,0,0,.5)}
#rcv3.hf .panel{border:16px solid transparent;border-image:var(--frame) 8 fill/16px stretch;image-rendering:pixelated;background:none;box-shadow:none;padding:.4em .6em}
#rcv3 .row{display:flex;gap:.8em;align-items:center;flex-wrap:wrap}
#rcv3 .grow{flex:1}
#rcv3 .ico{display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;line-height:1}
#rcv3 :focus-visible{outline:3px solid #fff;outline-offset:2px}
/* menu */
#rcv3 .menu{align-items:center;justify-content:center;gap:clamp(10px,3vh,28px);padding:4vh 16px}
#rcv3 .menu .sub{font-size:clamp(11px,1.6vw,16px);color:#ffd9a0;text-align:center;text-shadow:0 2px 6px #000;max-width:34em}
#rcv3 .mlist{display:flex;flex-direction:column;gap:.7em;width:min(340px,92vw)}
#rcv3 .mlist .btn{text-align:left;padding-left:1.8em;animation:rrise .5s both}
#rcv3 .mlist .btn::before{content:'\\25B6';position:absolute;left:.6em;opacity:0;transition:opacity .15s,transform .15s;transform:translateX(-4px);color:var(--amb)}
#rcv3 .mlist .btn:hover::before,#rcv3 .mlist .btn.sel::before{opacity:1;transform:none}
#rcv3 .diff{display:flex;gap:.5em;align-items:center;flex-wrap:wrap;justify-content:center}
#rcv3 .chip{font-family:'Press Start 2P',monospace;font-size:.62em;padding:.7em .9em;border:2px solid #6a5a9a;background:#1c1730;color:#d8ccf0;cursor:pointer;border-radius:2px;transition:all .12s}
#rcv3 .chip:hover{border-color:var(--amb);transform:translateY(-1px)}
#rcv3 .chip.on{background:var(--amb);color:#2a1408;border-color:#ffe08a}
#rcv3 .foot{position:absolute;bottom:8px;left:0;right:0;text-align:center;font-size:.72em;color:#8a80a8;z-index:3}
#rcv3 .corner{position:absolute;top:10px;right:10px;z-index:5;display:flex;gap:.5em}
#rcv3 .corner .btn{padding:.6em .8em}
/* modal */
#rcv3 .mod{position:absolute;inset:0;z-index:20;background:rgba(5,4,12,.8);display:flex;align-items:center;justify-content:center;padding:12px;pointer-events:auto;animation:rfade .2s both}
#rcv3 .mod .panel{max-width:560px;width:100%;max-height:92vh;overflow-y:auto;animation:rpop .3s both}
#rcv3 .mod label{display:flex;align-items:center;gap:.8em;margin:.55em 0}
#rcv3 .mod label>span:first-child{min-width:7.5em}
#rcv3 input[type=range]{flex:1;accent-color:var(--amb);height:1.6em}
#rcv3 input[type=text],#rcv3 input[type=password]{flex:1;background:#0d0b1a;border:2px solid #6a5a9a;color:#fff;padding:.6em;font:inherit;border-radius:2px;min-width:0}
#rcv3 .tog{width:3.2em;height:1.7em;border-radius:1em;background:#3a3050;border:2px solid #6a5a9a;position:relative;cursor:pointer;flex:none}
#rcv3 .tog::after{content:'';position:absolute;left:.15em;top:.15em;width:1.1em;height:1.1em;border-radius:50%;background:#ddd;transition:transform .15s}
#rcv3 .tog.on{background:#2e9e6b}#rcv3 .tog.on::after{transform:translateX(1.5em)}
/* toasts */
#rcv3 .toasts{position:absolute;left:0;right:0;bottom:14px;display:flex;flex-direction:column;align-items:center;gap:6px;z-index:40;pointer-events:none}
#rcv3 .toast{background:#20193c;border:2px solid var(--amb);padding:.6em 1em;border-radius:3px;font-size:.9em;animation:rrise .25s both;box-shadow:0 4px 14px rgba(0,0,0,.6);max-width:92vw}
#rcv3 .toast.bad{border-color:var(--bad)}
/* tutorial */
#rcv3 .tut{align-items:center;padding:12px;gap:10px;justify-content:center}
#rcv3 .tcard{width:min(880px,100%);display:grid;grid-template-columns:1.15fr 1fr;gap:1.2em;align-items:stretch;animation:rrise .35s both}
#rcv3 .tart{position:relative;background:#0a0814;border:3px solid #3a2e60;border-radius:3px;overflow:hidden;min-height:200px;aspect-ratio:16/10;display:flex;flex-direction:column}
#rcv3 .tart canvas.cv{width:100%;height:100%;display:block;image-rendering:pixelated}
#rcv3 .ttext h2{font-size:clamp(11px,1.7vw,16px)}
#rcv3 .ttext p{margin:.5em 0;line-height:1.55;font-size:1.02em}
#rcv3 .tip{margin-top:.8em;padding:.6em .8em;border-left:4px solid var(--teal);background:rgba(47,208,176,.1);font-size:.92em;line-height:1.45}
#rcv3 .dots{display:flex;gap:.5em;justify-content:center}
#rcv3 .dots i{width:.9em;height:.9em;background:#3a3050;border:2px solid #6a5a9a;display:block;cursor:pointer;transition:all .2s}
#rcv3 .dots i.on{background:var(--amb);border-color:#ffe08a;transform:scale(1.25)}
#rcv3 .dots i.done{background:#2e9e6b}
#rcv3 .tnav{display:flex;gap:.8em;justify-content:space-between;align-items:center;width:min(880px,100%)}
#rcv3 .key{display:inline-block;min-width:1.9em;padding:.25em .5em;border:2px solid #fff;border-bottom-width:4px;border-radius:4px;background:#2c2548;text-align:center;font-family:'Press Start 2P',monospace;font-size:.7em;margin:0 .1em}
#rcv3 .key.pulse{animation:rpulse .8s infinite;border-color:var(--amb);color:var(--amb)}
#rcv3 .mock{padding:.6em;display:flex;flex-direction:column;gap:.45em;flex:1;justify-content:center;font-size:.86em}
#rcv3 .bub{padding:.45em .7em;border-radius:3px;background:#2a2248;border-left:4px solid var(--c,#888);animation:rrise .3s both;line-height:1.35}
#rcv3 .bub b{color:var(--c)}
#rcv3 .bub.share{background:#1c3a3a;border-left-width:6px}
#rcv3 .bub.lie{background:#3a1c28}
#rcv3 .card2{background:#14102a;border:2px dashed var(--teal);padding:.55em .7em;border-radius:3px}
#rcv3 .opt{display:block;width:100%;text-align:left;background:#241c44;border:2px solid #4a3e80;color:inherit;padding:.6em .8em;border-radius:3px;cursor:pointer;font:inherit;transition:all .12s;line-height:1.35}
#rcv3 .opt:hover:not(:disabled){border-color:var(--amb);transform:translateX(3px)}
#rcv3 .opt.pick{border-color:var(--amb);background:#4a3418}
#rcv3 .opt:disabled{cursor:default}
#rcv3 .vt{display:inline-block;margin:.2em .2em 0 0;padding:.15em .5em;border-radius:10px;font-size:.78em;color:#111;animation:rpop .3s both}
/* rol */
#rcv3 .role{align-items:center;justify-content:center;padding:14px;gap:1em}
#rcv3 .rcard{width:min(620px,100%);display:flex;flex-direction:column;gap:.9em;align-items:center;text-align:center}
#rcv3 .rcard .big{border:4px solid var(--c);box-shadow:0 0 30px var(--c);border-radius:4px;animation:rpop .5s both}
#rcv3 .sbox{width:100%;text-align:left;padding:.8em 1em;border-radius:3px;background:#14102a;border:2px solid var(--c);position:relative}
#rcv3 .sbox .t{line-height:1.5;transition:filter .5s}
#rcv3 .sbox.hid .t{filter:blur(7px)}
#rcv3 .sbox.hid::after{content:'Pulsa para revelar (solo lo ves tu)';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:.9em;color:#fff;text-shadow:0 0 6px #000;cursor:pointer}
/* lobby */
#rcv3 .lobby{padding:16px;align-items:center;gap:1em}
#rcv3 .lobby>*{width:min(900px,100%);flex:none}
#rcv3 .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:.8em}
#rcv3 .rc{background:#1c1636;border:3px solid #3a2e60;padding:.8em;border-radius:3px;cursor:pointer;display:flex;flex-direction:column;gap:.4em;align-items:center;text-align:center;transition:all .15s;font:inherit;color:inherit;position:relative}
#rcv3 .rc:hover{transform:translateY(-3px);border-color:var(--c)}
#rcv3 .rc.sel{border-color:var(--c);background:#2a2250;box-shadow:0 0 22px var(--c)}
#rcv3 .rc.taken{opacity:.55;cursor:not-allowed}
#rcv3 .rc .tag{font-size:.78em;padding:.2em .6em;border-radius:10px;background:#0d0b1a;color:var(--mut)}
#rcv3 .rc .tag.me{background:var(--c);color:#111}
#rcv3 .code{font-family:'Press Start 2P',monospace;font-size:clamp(18px,4vw,34px);letter-spacing:.3em;color:var(--amb);text-align:center;text-shadow:0 0 14px rgba(240,160,48,.5)}
/* final */
#rcv3 .final{align-items:center;padding:16px 14px 30px;gap:1em}
#rcv3 .final>.rel{width:min(900px,100%)}
#rcv3 .grade{font-family:'Press Start 2P',monospace;font-size:clamp(70px,16vw,150px);line-height:1;text-align:center;color:var(--c);text-shadow:0 6px 0 rgba(0,0,0,.6),0 0 40px var(--c);animation:rpop .7s cubic-bezier(.2,1.6,.4,1) both}
#rcv3 .grid2{display:grid;grid-template-columns:1fr 1fr;gap:1em}
#rcv3 .ln{display:flex;justify-content:space-between;gap:.6em;padding:.35em 0;border-bottom:1px dashed #3a3060;animation:rrise .35s both}
#rcv3 .ok{color:var(--good)}#rcv3 .no{color:var(--bad)}
#rcv3 .ach{display:flex;gap:.7em;align-items:center;padding:.5em;background:#2a2248;border:2px solid #ffd34d;border-radius:3px;animation:rpop .5s both}
#rcv3 .ach.old{border-color:#3a2e60;background:#1c1636}
/* logros */
#rcv3 .fates{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.9em;margin:.6em auto 0;max-width:1100px;width:100%}@media (max-width:640px){#rcv3 .fates{grid-template-columns:repeat(2,minmax(0,1fr))}}
#rcv3 .fate{display:flex;flex-direction:column;text-align:center;gap:.5em;align-items:center;padding:.6em;background:rgba(20,14,40,.85);border:2px solid #3b2f66;border-radius:12px;animation:rrise .5s both}
#rcv3 .fate .pt{flex:none;border-radius:12px;overflow:hidden;border:3px solid #7e62c8;background:radial-gradient(circle at 50% 100%,#4a3a8a,#150b30)}#rcv3 .fate .pt canvas{display:block;width:clamp(96px,12vw,150px);height:clamp(96px,12vw,150px);image-rendering:pixelated}
#rcv3 .fate.vivo .pt{border-color:#5fe39a}#rcv3 .fate.herido .pt{border-color:#f2a93b}#rcv3 .fate.muerto{opacity:.9;border-color:#4a4658}#rcv3 .fate.muerto .pt{border-color:#6b6678;background:#1c1a24}#rcv3 .fate.muerto .pt canvas{filter:grayscale(1) brightness(.75)}
#rcv3 .fate .st{display:inline-block;font-size:.72em;font-weight:800;letter-spacing:.5px;padding:2px 7px;border-radius:8px;margin:.2em 0}#rcv3 .fate.vivo .st{background:#1d4a30;color:#9affc0}#rcv3 .fate.herido .st{background:#4a3208;color:#ffd27a}#rcv3 .fate.muerto .st{background:#2c2a36;color:#b9b4c8}
#rcv3 .fate .cdl{display:inline-block;width:6px;height:15px;background:#e8dcc0;position:relative;margin-left:.5em;vertical-align:middle;border-radius:1px}#rcv3 .fate .cdl:before{content:"";position:absolute;left:0;top:-8px;width:6px;height:8px;background:#ffb347;border-radius:50% 50% 40% 40%;animation:cflk .6s ease-in-out infinite alternate}@keyframes cflk{to{transform:scaleY(.8) translateY(1px);opacity:.8}}
#rcv3 .fhead{font-size:clamp(26px,5vw,48px);font-weight:900;text-align:center;line-height:1.15;margin:.2em 0 .1em;text-shadow:0 4px 0 rgba(0,0,0,.6)}
#rcv3 .agrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:.7em}
#rcv3 .acell{display:flex;gap:.7em;align-items:center;padding:.6em;background:#1c1636;border:2px solid #3a2e60;border-radius:3px}
#rcv3 .acell.got{border-color:#ffd34d;background:#2a2248}
#rcv3 .lk{filter:grayscale(1) brightness(.45)}
#rcv3 .prog{height:.9em;background:#0d0b1a;border:2px solid #6a5a9a;border-radius:2px;overflow:hidden}
#rcv3 .prog>i{display:block;height:100%;background:linear-gradient(90deg,var(--amb),#ffd34d);transition:width .8s}
#rcv3 .scroll-head{display:flex;justify-content:space-between;align-items:center;gap:1em;flex-wrap:wrap}
/* creditos */
#rcv3 .cred{align-items:center;justify-content:flex-start;text-align:center}
#rcv3 .cred .roll{position:absolute;left:0;right:0;top:100%;padding:0 20px;display:flex;flex-direction:column;gap:1.1em;align-items:center;line-height:1.6;animation:rroll 38s linear forwards;max-width:640px;margin:0 auto}
@keyframes rroll{to{top:-120%}}
/* cine */
#rcv3 .cine{background:#000;align-items:center;justify-content:center}
#rcv3 .cvw{position:relative;width:min(100vw,177.7vh);aspect-ratio:16/9;background:#000;overflow:hidden}
#rcv3 .cvw canvas{width:100%;height:100%;display:block}
#rcv3 .sub3{position:absolute;left:5%;right:5%;bottom:4%;text-align:center;font-size:clamp(13px,1.9vw,24px);line-height:1.5;text-shadow:0 2px 4px #000,0 0 10px #000;min-height:3em}
#rcv3 .sub3 .who{display:block;font-family:'Press Start 2P',monospace;font-size:.5em;color:var(--amb);margin-bottom:.5em;letter-spacing:2px}
#rcv3 .sub3.title{bottom:auto;top:32%;font-family:'Press Start 2P',monospace}
#rcv3 .sub3.title .tt{display:block;font-size:clamp(18px,5vw,48px);color:#ffe9b8;text-shadow:0 3px 0 #7a3a10,0 0 30px rgba(240,160,48,.7);margin-bottom:.8em;animation:rpop 1.4s both}
#rcv3 .skip{position:absolute;top:10px;right:10px;z-index:5;opacity:.6}
#rcv3 .skip:hover{opacity:1}
#rcv3 .cdots{position:absolute;left:0;right:0;top:2.2%;display:flex;gap:6px;justify-content:center;z-index:3}
#rcv3 .cdots i{width:18px;height:3px;background:rgba(255,255,255,.25);display:block}
#rcv3 .cdots i.on{background:#fff}
#rcv3 .fl{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
@media(max-aspect-ratio:1/1){#rcv3 .cine{justify-content:flex-start;padding-top:8vh}#rcv3 .sub3{position:static;margin:14px 16px 0;width:auto}#rcv3 .sub3.title{position:absolute;top:30%;left:5%;right:5%;margin:0}}
@media(max-width:720px){#rcv3 .tcard{grid-template-columns:1fr}#rcv3 .grid2{grid-template-columns:1fr}#rcv3 .cards{gap:.4em}#rcv3 .rc{padding:.5em .3em;font-size:.82em}#rcv3 .tut{justify-content:flex-start;overflow-y:auto}#rcv3 .tart{min-height:0}}
@media(prefers-reduced-motion:reduce){#rcv3 *{animation-duration:.01s!important}}
#rcv3.rm *{animation-duration:.01s!important}

/* v7 Blasphemous: marcos de oro viejo, rojos apagados */
#rcv3{--bg:#0a0505;--bg2:#1a0b0c;--amb:#b8923a;--vio:#7a1a1a;--gold2:#d9c88f;--title:'Cinzel','Palatino Linotype',Georgia,serif}
#rcv3 .scr{background:radial-gradient(ellipse at 50% 0%,#2a0e0f,#0a0505 70%)}
#rcv3 h1,#rcv3 h2,#rcv3 .lab,#rcv3 .btn{font-family:var(--title);font-weight:700;text-transform:uppercase;letter-spacing:.16em}
#rcv3 h1{color:#e8d9a8;text-shadow:0 3px 0 #000,0 0 22px rgba(122,26,26,.7);letter-spacing:.18em}
#rcv3 h2,#rcv3 .lab{color:var(--gold2)}
#rcv3 .btn{color:#e8d9a8;background:linear-gradient(#5a1818,#2c0a0b);border:2px solid #b8923a;border-radius:2px;box-shadow:0 3px 0 #000,inset 0 0 0 1px #000}
#rcv3 .btn.sec{background:linear-gradient(#1f1210,#120a09);border-color:#5a4420}#rcv3 .btn.go{background:linear-gradient(#6b4f16,#3b2a0a);color:#f6e9bb;border-color:#d9c88f}
#rcv3 .btn:hover,#rcv3 .btn:focus-visible,#rcv3 .btn.sel{box-shadow:0 5px 0 #000,0 0 14px rgba(184,146,58,.4)}
#rcv3 .panel,#rcv3.hf .panel,#rcv3 .fate,#rcv3 .ach{border-image:none!important;padding:1em 1.2em;--co:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='26' height='26' viewBox='0 0 26 26'%3E%3Cg fill='none' stroke='%23b8923a' stroke-width='1.6'%3E%3Cpath d='M2 24V9Q2 2 9 2H24'/%3E%3Cpath d='M10 10q5-1 5 4' stroke-width='1'/%3E%3Ccircle cx='2.5' cy='2.5' r='2' fill='%23d9c88f' stroke='none'/%3E%3C/g%3E%3C/svg%3E");background:var(--co) top 3px left 3px/20px no-repeat,radial-gradient(ellipse at 50% 0%,#2a0e0f,#120707 60%,#0a0505);border:2px solid #7a5f2a;border-radius:3px;box-shadow:inset 0 0 0 1px #000,inset 0 0 0 4px #160a08,inset 0 0 0 5px #4a3818}
#rcv3 .fate{padding:1.1em .8em;animation:rrise .5s both}#rcv3 .fate .pt{border-radius:3px;border:2px solid #b8923a}#rcv3 .fate b{font-family:var(--title);letter-spacing:.14em;text-transform:uppercase;color:var(--gold2);font-size:1.15em}
#rcv3 .fate .mut{display:block;font-size:.95em;line-height:1.35;color:#cfc3a8}
#rcv3 .fate.vivo .pt{border-color:#b8923a}#rcv3 .fate.herido .pt{border-color:#a8605a}
#rcv3 .fate .st,#rcv3 .fate.vivo .st,#rcv3 .fate.herido .st,#rcv3 .fate.muerto .st{border-radius:2px;letter-spacing:.14em}
#rcv3 .fhead{font-family:var(--title);text-transform:uppercase;letter-spacing:.16em;color:var(--gold2)!important}
`;

/* ================= Raiz, pantallas, bucle ================= */
let root, scr = {}, cur = null, fx, fxg, parts = [], tks = new Set(), raf = 0, last = 0, keyH = null, toasts, localId = 'solo';
function mount(el) {
  if (root) return root;
  const st = $('style', '', document.head); st.textContent = css;
  if (!document.getElementById('rcv3-font')) { const l = $('link', '', document.head); l.id = 'rcv3-font'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Cinzel:wght@600;700&display=swap'; }
  root = $('div', ''); root.id = 'rcv3'; (el || document.body).appendChild(root); applyLook();
  fx = $('canvas', '', root); fx.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:50'; fxg = fx.getContext('2d');
  toasts = $('div', 'toasts', root);
  const fr = window.ASSETS && ASSETS.images && ASSETS.images.ui_frame; if (fr) { root.style.setProperty('--frame', 'url(' + fr + ')'); root.classList.add('hf'); }
  addEventListener('resize', () => { fx.width = innerWidth; fx.height = innerHeight; }); fx.width = innerWidth; fx.height = innerHeight;
  const unl = () => { snd('unlock'); applySound(); };
  addEventListener('pointerdown', unl, { capture: true, once: true }); addEventListener('keydown', unl, { capture: true, once: true });
  addEventListener('pointerdown', e => { if (cur && e.target.closest && e.target.closest('#rcv3')) burst(e.clientX, e.clientY, '#ffd34d', 9); }, true);
  addEventListener('mouseover', e => { const b = e.target.closest && e.target.closest('#rcv3 .btn,#rcv3 .chip,#rcv3 .rc,#rcv3 .opt'); if (b && b !== mouseover.last) { mouseover.last = b; if (!b.disabled) sfx('hover'); } });
  addEventListener('keydown', e => { if (!cur || !keyH || /INPUT|TEXTAREA/.test(e.target.tagName) && e.key !== 'Escape') return; if (keyH(e) !== false && ['Escape', 'Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault(); }, true);
  startLoop(); return root;
}
const mouseover = {};
function applyLook() { if (!root) return; root.style.setProperty('--ts', S.ts); root.classList.toggle('rm', !!S.flash); }
function ensure() { if (!root) mount(); }
function tick(f) { tks.add(f); startLoop(); return () => tks.delete(f); }
function startLoop() { if (raf) return; last = performance.now(); raf = requestAnimationFrame(frame); }
function frame(t) {
  const dt = Math.min(.05, (t - last) / 1000); last = t; raf = 0;
  tks.forEach(f => { try { f(dt, t / 1000); } catch (e) { console.error(e); tks.delete(f); } });
  if (fxg) { fxg.clearRect(0, 0, fx.width, fx.height); for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.l -= dt; if (p.l <= 0) { parts.splice(i, 1); continue; } p.vy += (p.g || 300) * dt; p.x += p.vx * dt; p.y += p.vy * dt; fxg.globalAlpha = clamp(p.l / p.m, 0, 1); fxg.fillStyle = p.c; fxg.fillRect(p.x, p.y, p.s, p.s); } fxg.globalAlpha = 1; }
  if (tks.size || parts.length) raf = requestAnimationFrame(frame);
}
function burst(x, y, c, n, o) { o = o || {}; for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = (o.v || 160) * (.3 + Math.random()); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, s: 2 + Math.random() * 3, c: Array.isArray(c) ? c[i % c.length] : c, l: .5 + Math.random() * .5, m: 1, g: o.g }); } startLoop(); }
function confetti(n) { const cs = ['#ffd34d', '#6be08a', '#5ab8ff', '#ff6aa8', '#c77dff']; for (let i = 0; i < n; i++) parts.push({ x: Math.random() * innerWidth, y: -10 - Math.random() * 100, vx: (Math.random() - .5) * 80, vy: 40 + Math.random() * 120, s: 4 + Math.random() * 4, c: cs[i % 5], l: 3 + Math.random() * 2, m: 4, g: 40 }); startLoop(); }

function mkScr(name, cls) { if (!scr[name]) { scr[name] = $('div', 'scr ' + (cls || ''), root); scr[name].dataset.n = name; } return scr[name]; }
let offTick = [];
function go(name, opts) { // abre una pantalla (limpia la anterior)
  ensure(); opts = opts || {};
  Object.keys(scr).forEach(k => { if (k !== name) scr[k].classList.remove('on'); }); offTick.forEach(f => f()); offTick = [];
  const s = scr[name]; s.classList.add('on'); s.scrollTop = 0; cur = name; keyH = opts.keys || null;
  if (opts.music) snd('music', opts.music);
  return s;
}
function hide() { Object.keys(scr).forEach(k => scr[k].classList.remove('on')); offTick.forEach(f => f()); offTick = []; cur = null; keyH = null; closeModal(); }
const own = f => { offTick.push(f); return f; };
function toast(msg, o) { ensure(); o = o || {}; const t = $('div', 'toast' + (o.bad ? ' bad' : ''), toasts, esc(msg)); sfx(o.bad ? 'error' : 'toast'); setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = 0; setTimeout(() => t.remove(), 450); }, o.ms || 2600); }
function floatTxt(x, y, txt, col) { const e = $('div', 'px', root, esc(txt)); e.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;color:' + (col || '#6be08a') + ';font-size:12px;z-index:55;pointer-events:none;text-shadow:0 2px 0 #000;animation:rfloat 1.2s forwards'; setTimeout(() => e.remove(), 1250); }

/* ---- modal ---- */
let modalEl = null, modalPrevKey = null, modalClose = null;
function modal(build, onClose) {
  closeModal(); ensure(); const m = modalEl = $('div', 'mod', root), p = $('div', 'panel', m); build(p, closeModal); modalPrevKey = keyH; modalClose = onClose;
  keyH = e => { if (e.key === 'Escape') { sfx('back'); closeModal(); } else if (e.key === 'Tab') { const f = [...m.querySelectorAll('button,input,select')].filter(x => !x.disabled); if (f.length) { const i = f.indexOf(document.activeElement); e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus(); } } return true; };
  m.addEventListener('pointerdown', e => { if (e.target === m) closeModal(); }); setTimeout(() => { const f = m.querySelector('button,input'); f && f.focus(); }, 30); return m;
}
function closeModal() { if (!modalEl) return; modalEl.remove(); modalEl = null; keyH = modalPrevKey; const c = modalClose; modalClose = null; c && c(); }
function ask(title, text, btns) { return new Promise(res => modal((p, close) => { $('h2', '', p, esc(title)); $('p', '', p, esc(text)).style.lineHeight = 1.5; const r = $('div', 'row', p); r.style.marginTop = '1em'; btns.forEach((b, i) => { const x = $('button', 'btn ' + (b.cls || ''), r, esc(b.t)); x.onclick = () => { sfx('click'); modalClose = null; close(); res(b.v); }; }); }, () => res(null))); }

/* ---- teclado en listas de botones ---- */
function listKeys(getBtns, extra) {
  return e => {
    const b = getBtns(); let i = b.findIndex(x => x.classList.contains('sel')); if (i < 0) i = 0;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') i = (i + 1) % b.length;
    else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') i = (i - 1 + b.length) % b.length;
    else if (e.key === 'Enter' || e.key === ' ') { if (document.activeElement && document.activeElement.tagName === 'BUTTON' && document.activeElement.closest('.mlist')) return false; b[i].click(); return; }
    else if (extra && extra(e) !== false) return;
    else return false;
    b.forEach(x => x.classList.remove('sel')); b[i].classList.add('sel'); b[i].focus(); sfx('select');
  };
}

/* ================= Fondo animado (escena + nieve + parallax raton) ================= */
function backdrop(canvas, id, o) {
  o = o || {}; const g = canvas.getContext('2d'), r = rng(7), fl = []; let mx = 0, my = 0, T = 0, lt = 0, fh = 0;
  const kind = o.kind || 'snow'; for (let i = 0; i < (o.n || 90); i++) fl.push({ x: r(), y: r(), z: .3 + r() * .9, p: r() * 6 });
  const mv = e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }; addEventListener('pointermove', mv);
  const stop = tick(dt => {
    const w = canvas.clientWidth | 0, h = canvas.clientHeight | 0; if (!w) return; if (canvas.width !== w >> 1 || canvas.height !== h >> 1) { canvas.width = w >> 1; canvas.height = h >> 1; }
    const W = canvas.width, H = canvas.height; T += dt; const im = stillSrc(id), iw = im.width || 320, ih = im.height || 180, z = 1.12 + .03 * Math.sin(T * .15);
    const sc = Math.max(W / iw, H / ih) * z, vw = W / sc, vh = H / sc, sx = (iw - vw) * (.5 + mx * .25 + Math.sin(T * .1) * .1), sy = (ih - vh) * (.5 + my * .25);
    g.imageSmoothingEnabled = true; g.drawImage(im, clamp(sx, 0, iw - vw), clamp(sy, 0, ih - vh), vw, vh, 0, 0, W, H);
    if (o.light !== false) { const lf = .15 + .05 * Math.sin(T * 7) + (Math.random() < .02 ? .06 : 0); const gr = g.createRadialGradient(W * .7 - mx * 40, H * .45, 4, W * .7, H * .45, W * .6); gr.addColorStop(0, 'rgba(255,170,70,' + lf + ')'); gr.addColorStop(1, 'rgba(255,170,70,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
    fl.forEach(f => { f.y += dt * (kind === 'ember' ? -.05 : .04 + f.z * .06); f.x += dt * (.02 + Math.sin(T + f.p) * .015) * f.z; if (f.y > 1.02) f.y = -.02; if (f.y < -.02) f.y = 1.02; if (f.x > 1) f.x -= 1; g.fillStyle = kind === 'ember' ? 'rgba(255,' + (150 + f.z * 80 | 0) + ',60,' + f.z * .8 + ')' : 'rgba(255,255,255,' + f.z * .75 + ')'; const s = Math.max(1, f.z * 2.2); g.fillRect(f.x * W - mx * 30 * f.z, f.y * H - my * 20 * f.z, s, s); });
    const vg = g.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, W * .75); vg.addColorStop(0, 'rgba(5,3,12,0)'); vg.addColorStop(1, 'rgba(5,3,12,' + (o.dark || .7) + ')'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  });
  return () => { stop(); removeEventListener('pointermove', mv); };
}
const bgc = (p, id, o) => { const c = $('canvas', 'bgc pix', p); c.style.imageRendering = 'auto'; loadStill(id).then(() => 0); own(backdrop(c, id, o)); return c; };

/* ================= MENU ================= */
function showMenu() {
  ensure(); const s = mkScr('menu', 'menu'); s.innerHTML = '';
  const items = [['Jugar en solitario', 'solo', '1', 'go'], ['Crear sala', 'host', '2'], ['Unirse a sala', 'join', '3'], ['Como se juega', 'tut', '4'], ['Logros', 'ach', '5'], ['Ajustes', 'set', '6'], ['Creditos', 'cred', '7']];
  go('menu', { music: 'menu', keys: e => { const k = e.key; if (/^[1-7]$/.test(k)) { const b = s.querySelectorAll('.mlist .btn')[+k - 1]; b && b.click(); return; } if (k === 'd' || k === 'D' || k === 'ArrowLeft' || k === 'ArrowRight') { const o = ['facil', 'normal', 'everest'], i = o.indexOf(S.diff); setDiff(o[(i + (k === 'ArrowLeft' ? 2 : 1)) % 3]); return; } if (k === 'm' || k === 'M') { toggleMute(); return; } return listKeys(() => [...s.querySelectorAll('.mlist .btn')])(e); } });
  bgc(s, 'valle', { kind: 'snow' });
  const t = $('div', 'rel', s); t.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:14px'; const h = $('h1', '', t, 'RESCATE<br>EN LA CUEVA'); h.style.animation = 'rglow 3s infinite';
  $('div', 'sub rel', t, 'Cuatro cabezas, tres rescatadores, una cueva que se inunda. Habla, comparte lo que sabes... y decide en quien confias.');
  const dv = $('div', 'diff rel', s); $('span', 'lab', dv, 'DIFICULTAD'); const chips = {};
  [['facil', 'Facil'], ['normal', 'Normal'], ['everest', 'Everest']].forEach(([k, n]) => { const c = chips[k] = $('button', 'chip' + (S.diff === k ? ' on' : ''), dv, n); c.onclick = () => setDiff(k); });
  function setDiff(k) { S.diff = k; saveS(); Object.keys(chips).forEach(x => chips[x].classList.toggle('on', x === k)); sfx('select'); }
  const L = $('div', 'mlist rel', s);
  const act = { solo: () => startFlow('solo'), host: () => startFlow('host'), join: () => joinDialog(), tut: () => showTutorial(), ach: () => showAchievements(), set: () => openSettings(), cred: () => showCredits() };
  items.forEach(([n, k, key, cls], i) => { const b = $('button', 'btn ' + (cls || ''), L, esc(n) + '<span class="k">' + key + '</span>'); b.style.animationDelay = i * .06 + .2 + 's'; b.onclick = () => { sfx(k === 'solo' ? 'confirm' : 'click'); act[k](); }; if (!i) b.classList.add('sel'); });
  const c = $('div', 'corner', s); const mb = $('button', 'btn sec', c, S.mute ? 'MUDO' : 'SON'); mb.title = 'Sonido (M)'; mb.setAttribute('aria-label', 'Silenciar'); mb.onclick = toggleMute;
  function toggleMute() { S.mute = !S.mute; saveS(); applySound(); mb.textContent = S.mute ? 'MUDO' : 'SON'; sfx('click'); }
  $('div', 'foot', s, '1-7 elegir &middot; flechas/W-S mover &middot; Enter aceptar &middot; D dificultad &middot; M sonido');
  return s;
}
async function startFlow(mode) {
  if (!store.get('rcv3_tut')) { const r = await ask('Primera vez?', 'Hay mucho que entender: roles secretos, chat, votos. El tutorial dura menos de 2 minutos y te evita perderte.', [{ t: 'Ver tutorial', v: 'y', cls: 'go' }, { t: 'Ya se jugar', v: 'n', cls: 'sec' }]); if (r === null) return; if (r === 'y') { await showTutorial(); } else store.set('rcv3_tut', '1'); }
  if (mode === 'solo') emit('solo', { difficulty: S.diff }); else emit('host', { difficulty: S.diff });
  showLobby({ mode: mode === 'solo' ? 'idle' : 'host' });
}
function joinDialog() {
  modal((p, close) => { $('h2', '', p, 'Unirse a una sala'); $('p', 'mut', p, 'Pega el enlace o escribe el codigo de 5 letras que te pasa el anfitrion.'); const i = $('input', '', p); i.type = 'text'; i.placeholder = 'ABCDE'; i.maxLength = 200; i.style.cssText = 'width:100%;margin:.6em 0;text-transform:uppercase'; i.setAttribute('aria-label', 'Codigo de sala'); try { const h = window.Net && Net.codeFromHash && Net.codeFromHash(); if (h) i.value = h; } catch (e) { }
    const r = $('div', 'row', p), a = $('button', 'btn sec', r, 'Cancelar'), b = $('button', 'btn go', r, 'Unirme'); a.onclick = () => { sfx('back'); close(); }; b.onclick = () => { const v = i.value.trim(); if (!v) { sfx('error'); return toast('Escribe un codigo o pega el enlace', { bad: 1 }); } close(); showLobby({ mode: 'join', code: v }); }; i.onkeydown = e => { if (e.key === 'Enter') b.click(); }; });
}

/* ================= LOBBY ================= */
let U = { mode: 'idle', code: '', link: '', players: [], role: 'guia', ready: false };
let lobbyOff = null;
function showLobby(o) {
  ensure(); o = o || {}; const s = mkScr('lobby', 'lobby scroll'); U = Object.assign({ mode: 'idle', code: '', link: '', players: [], role: U.role || 'guia', ready: false }, { mode: o.mode || 'idle' });
  go('lobby', { music: 'menu', keys: e => { if (e.key === 'Escape') { back(); return; } const i = '123'.indexOf(e.key); if (i >= 0) pickRole(RK[i]); else if (e.key === 'Enter') { s.querySelector('.go') && s.querySelector('.go').click(); } else return false; } });
  if (window.Net && Net.on && !lobbyOff) { const f = () => { U.players = Net.players || []; if (cur === 'lobby') render(); }; Net.on('players', f); lobbyOff = () => { try { Net.off && Net.off('players', f); } catch (e) { } lobbyOff = null; }; own(lobbyOff); }
  if (U.mode === 'host') { toast('Creando sala...'); Promise.resolve(window.Net && Net.host ? Net.host({ name: 'Anfitrion' }) : Promise.reject(new Error('Multijugador no disponible'))).then(r => { U.code = r.roomCode; U.link = r.link; try { Net.setRole && Net.setRole(U.role); } catch (e) { } emit('host', r); render(); }).catch(e => { sfx('error'); toast((e && e.message) || 'No se pudo crear la sala', { bad: 1 }); U.mode = 'idle'; render(); }); }
  if (U.mode === 'join') { toast('Conectando...'); Promise.resolve(Net.join(o.code, { name: 'Jugador' })).then(r => { U.code = r.roomCode || o.code; if (r.role) U.role = r.role; if (r.id) localId = r.id; emit('join', r); render(); }).catch(e => { sfx('error'); toast((e && e.message) || 'No se pudo unir', { bad: 1 }); showMenu(); }); }
  showLobby.rerender = render; render(); return s;
  function back() { sfx('back'); if (U.mode !== 'idle') { try { Net.leave && Net.leave(); } catch (e) { } } emit('menu', { lobby: 1 }); showMenu(); }
  function pickRole(k) { const t = taken(k); if (t) { sfx('error'); return toast('Ese rol ya lo juega ' + (t.name || 'otro jugador'), { bad: 1 }); } U.role = k; sfx('select'); emit('role', k); try { Net.role && Net.setRole && Net.setRole(k); } catch (e) { } render(); }
  function taken(k) { return U.players.find(p => p && p.role === k && p.id !== localId && p.id !== (window.Net && Net.localId) && !p.bot && p.connected !== false); }
  function render() {
    s.innerHTML = ''; const top = $('div', 'row', s); top.style.justifyContent = 'space-between'; $('h2', '', top, U.mode === 'idle' ? 'PARTIDA EN SOLITARIO' : U.mode === 'host' ? 'TU SALA' : 'SALA DE ' + esc(U.code)); const bk = $('button', 'btn sec', top, 'Volver'); bk.onclick = back;
    if (U.mode === 'host' || U.mode === 'join') { const b = $('div', 'panel', s); $('div', 'lab', b, U.mode === 'host' ? 'COMPARTE ESTE CODIGO CON TUS AMIGOS' : 'CONECTADO A LA SALA'); $('div', 'code', b, esc(U.code || '. . . . .')); if (U.link) { const r = $('div', 'row', b); r.style.flexWrap = 'nowrap'; r.style.marginTop = '.6em'; const i = $('input', '', r); i.type = 'text'; i.readOnly = true; i.value = U.link; i.setAttribute('aria-label', 'Enlace'); const c = $('button', 'btn', r, 'Copiar'); c.onclick = () => { try { navigator.clipboard.writeText(U.link).then(() => { toast('Enlace copiado'); }, () => { i.select(); document.execCommand('copy'); toast('Enlace copiado'); }); } catch (x) { i.select(); toast('Copia el enlace a mano', { bad: 1 }); } }; } }
    const p = $('div', 'panel', s); $('div', 'lab', p, 'ELIGE TU ROL (1 / 2 / 3) &middot; LOS HUECOS LOS LLEVAN COMPANEROS IA'); const cards = $('div', 'cards', p); cards.style.marginTop = '.7em';
    RK.forEach((k, i) => { const d = rinfo(k), t = taken(k), b = $('button', 'rc' + (U.role === k ? ' sel' : '') + (t ? ' taken' : ''), cards); b.style.setProperty('--c', d.col); b.appendChild(portrait(k, U.role === k ? 'feliz' : 'neutral', 72)); $('b', '', b, esc(d.n)).style.color = d.col; $('span', 'mut', b, esc(d.t)); const sk = $('span', '', b, esc(d.skill)); sk.style.cssText = 'font-size:.85em;line-height:1.35'; $('span', 'tag' + (U.role === k ? ' me' : ''), b, U.role === k ? 'TU' : t ? esc(t.name || 'Jugador') : 'IA: ' + esc(d.ai)); b.onclick = () => pickRole(k); });
    const hum = U.players.filter(x => x && !x.bot); if (U.mode !== 'idle') $('div', 'mut', p, (hum.length ? hum.map(x => '<span class="ok">●</span> ' + esc(x.name || x.id) + (x.host ? ' (anfitrion)' : '')).join(' &nbsp; ') : 'Esperando jugadores...') + '<br>Maximo 3 humanos. Si alguien se va, lo sustituye la IA.').style.marginTop = '.7em';
    else $('div', 'mut', p, 'Juegas con ' + esc(rinfo(U.role).n) + '. Los otros dos son IA con personalidad propia: pueden callar, compartir o mentir. Rejuega con otro rol para ver la otra cara.').style.marginTop = '.7em';
    if (U.mode !== 'join') { const dv = $('div', 'diff', s); $('span', 'lab', dv, 'DIFICULTAD'); [['facil', 'Facil'], ['normal', 'Normal'], ['everest', 'Everest']].forEach(([k, n]) => { const c = $('button', 'chip' + (S.diff === k ? ' on' : ''), dv, n); c.onclick = () => { S.diff = k; saveS(); sfx('select'); render(); }; }); }
    const act = $('div', 'row', s); act.style.justifyContent = 'flex-end'; const go2 = $('button', 'btn go', act, U.mode === 'join' ? (U.ready ? 'No estoy listo' : 'Estoy listo') : 'Empezar'); go2.focus();
    go2.onclick = () => { snd('unlock'); sfx('confirm'); if (U.mode === 'join') { U.ready = !U.ready; emit('ready', U.ready); try { Net.send('ready', { ready: U.ready }); } catch (e) { } render(); } else emit('start', { role: U.role, host: U.mode === 'host', solo: U.mode === 'idle', difficulty: S.diff }); };
    if (U.mode === 'join') $('span', 'mut', act, 'Esperando al anfitrion...');
  }
}
function lobbyUpdate(d) { d = d || {}; if (d.players) U.players = d.players; if (d.code) U.code = d.code; if (d.link) U.link = d.link; if (d.mode) U.mode = d.mode; if (cur === 'lobby') showLobby.rerender && showLobby.rerender(); }

/* ================= TUTORIAL ================= */
function person(g, role, x, y, sc, fr, flip) { // sprite real si existe; si no, muneco
  const im = getImg('player_' + role), m = meta('player_' + role);
  if (im && im.ok) { const fw = m.fw || 24; g.imageSmoothingEnabled = false; g.save(); g.translate(x, y); if (flip) g.scale(-1, 1); g.drawImage(im, (fr % 6) * fw, 0, fw, fw, -fw * sc / 2, -fw * sc + 2 * sc, fw * sc, fw * sc); g.restore(); return; }
  const d = rinfo(role), b = Math.sin(fr * 1.3) * sc * .6; g.fillStyle = d.body; g.fillRect(x - 5 * sc, y - 12 * sc + b, 10 * sc, 9 * sc); g.fillStyle = '#f0c8a0'; g.fillRect(x - 4 * sc, y - 19 * sc + b, 8 * sc, 7 * sc); g.fillStyle = d.hat; g.fillRect(x - 5 * sc, y - 21 * sc + b, 10 * sc, 3 * sc); g.fillStyle = '#222'; g.fillRect(x - 4 * sc, y - 3 * sc, 3 * sc, 3 * sc + (fr % 2) * sc); g.fillRect(x + sc, y - 3 * sc, 3 * sc, 3 * sc + ((fr + 1) % 2) * sc);
}
function canvasArt(p, draw, w, h, sc) { sc = sc || 1; w = w || 320; h = h || 200; const c = $('canvas', 'cv', p); c.width = w * sc; c.height = h * sc; const g = c.getContext('2d'); let T = 0; own(tick(dt => { g.setTransform(sc, 0, 0, sc, 0, 0); g.imageSmoothingEnabled = false; T += dt; draw(g, T, w, h, dt); })); return c; }
function bar(g, x, y, w, h, v, col) { g.fillStyle = '#0d0b1a'; g.fillRect(x, y, w, h); g.fillStyle = col; g.fillRect(x + 1, y + 1, (w - 2) * v, h - 2); }

/* ---- mini-demos del tutorial: todo con sprites REALES de ASSETS (jugadores, tiles, props, iconos, retratos, agua) ---- */
const TW = 224, TH = 140, FLOOR = 108;
const ANIM = { idle: [0, 4, 6], run: [1, 6, 12], jump: [2, 2, 4], fall: [3, 2, 4], interact: [4, 4, 8] };
const frac = (u, a, b) => clamp((u - a) / (b - a), 0, 1);
function blit(g, name, sx, sy, sw, sh, dx, dy, dw, dh) { const im = getImg(name); if (!im || !im.ok) return false; g.imageSmoothingEnabled = false; g.drawImage(im, sx, sy, sw, sh, Math.round(dx), Math.round(dy), dw || sw, dh || sh); return true; }
function ttile(g, idx, x, y) { if (!blit(g, 'tiles', (idx % 8) * 16, Math.floor(idx / 8) * 16, 16, 16, x, y)) { g.fillStyle = idx < 16 ? '#4a3a63' : '#1a1430'; g.fillRect(x, y, 16, 16); } }
function tplayer(g, role, an, T, x, y, flip, fr) { // feet en (x,y)
  const m = ANIM[an] || ANIM.idle, f = fr != null ? fr : Math.floor(T * m[2]) % m[1];
  const im = getImg('player_' + role); if (!im || !im.ok) return person(g, role, x, y, 1, T * 8, flip);
  g.save(); g.imageSmoothingEnabled = false; g.translate(Math.round(x), Math.round(y)); if (flip) g.scale(-1, 1); g.drawImage(im, f * 24, m[0] * 24, 24, 24, -12, -22, 24, 24); g.restore();
}
function tcave(g, w, h, T, cam) { // fondo + suelo real; cam = desplazamiento horizontal (px)
  cam = cam || 0; g.fillStyle = '#0d0b1a'; g.fillRect(0, 0, w, h);
  for (let x = -((cam * .5) % 16) - 16; x < w; x += 16) for (let y = 0; y < FLOOR; y += 16) ttile(g, ((x + cam * .5 | 0) / 16 + y / 16) % 3 === 0 ? 17 : 16, x, y);
  g.fillStyle = 'rgba(8,6,20,.55)'; g.fillRect(0, 0, w, FLOOR);
  for (let x = -(cam % 16) - 16; x < w; x += 16) { ttile(g, 1, x, FLOOR); ttile(g, 0, x, FLOOR + 16); }
}
function tprop(g, row, fr, x, y) { return blit(g, 'props', fr * 16, row * 16, 16, 16, x - 8, y - 15); } // base en (x,y)
function tpill(g, x, y, w, h, fill, bd) { g.fillStyle = '#10081c'; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = bd; g.fillRect(x, y, w, h); g.fillStyle = fill; g.fillRect(x + 1, y + 1, w - 2, h - 2); }
function ttext(g, s, x, y, col, size, al) { g.font = 'bold ' + (size || 8) + 'px monospace'; g.textAlign = al || 'left'; g.textBaseline = 'middle'; g.lineWidth = 2; g.lineJoin = 'round'; g.strokeStyle = '#0a0716'; g.strokeText(s, x, y); g.fillStyle = col || '#fff2d0'; g.fillText(s, x, y); g.textAlign = 'left'; }
function tkey(g, x, y, s, on, w) { w = w || 14; g.fillStyle = '#10081c'; g.fillRect(x - 1, y - 1, w + 2, 15); g.fillStyle = on ? '#ffd24a' : '#6a6070'; g.fillRect(x, y + (on ? 2 : 0), w, on ? 11 : 12); g.fillStyle = on ? '#fff2c0' : '#cfc8d8'; g.fillRect(x, y + (on ? 1 : 0), w, 10); ttext(g, s, x + w / 2, y + 6 + (on ? 2 : 0), '#2a1408', 7, 'center'); }
function ticon(g, name, cx, cy, big) { const m = meta('poi_icons'), i = m && m.names ? m.names.indexOf(name) : -1, s = big || 16; if (i >= 0 && blit(g, 'poi_icons', (i % 10) * 16, Math.floor(i / 10) * 16, 16, 16, cx - s / 2, cy - s / 2, s, s)) return; g.fillStyle = '#ffd24a'; g.fillRect(cx - 4, cy - 4, 8, 8); }
const tr = r => r === 'lia' ? { col: '#7bf0a0', n: 'Lía' } : rinfo(r);
function tface(g, role, ex, x, y, s) { const i = { neutral: 0, worried: 1, angry: 2, happy: 3 }[ex] || 0; const fw = ((window.ASSETS && ASSETS.meta['portrait_' + role]) || {}).fw || 64; if (!blit(g, 'portrait_' + role, i * fw, 0, fw, fw, x, y, s, s)) { g.fillStyle = tr(role).col || '#888'; g.fillRect(x, y, s, s); } g.strokeStyle = tr(role).col || '#fff'; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, s - 1, s - 1); }
function tpoi(g, x, y, T, name, used) { // POI como en el motor: aro en el suelo + pastilla con icono flotando
  const rp = (T * .5) % 1, by = Math.round(Math.sin(T * 5) * 1.5), py = y - 26 + by; if (!used) { g.strokeStyle = 'rgba(255,210,74,' + (.6 * (1 - rp)) + ')'; g.beginPath(); g.ellipse(x, y, 4 + rp * 10, 1.5 + rp * 3, 0, 0, 7); g.stroke(); }
  tpill(g, x - 8, py - 8, 17, 17, used ? '#2a2638' : '#241a3a', used ? '#5a5870' : '#ffd24a'); g.globalAlpha = used ? .4 : 1; ticon(g, name, x, py); g.globalAlpha = 1; if (used) ttext(g, '✔', x + 6, py - 9, '#7dffb0', 9, 'center');
}
function tprompt(g, x, y, label, on, bd) { g.font = 'bold 8px monospace'; const w = 20 + g.measureText(label).width, bx = Math.round(x - w / 2); tpill(g, bx, y, w, 15, '#1a1228', bd || '#ffd24a'); tkey(g, bx + 3, y + 1, 'E', on, 11); ttext(g, label, bx + 18, y + 8, '#fff2d0', 8); }
function tbubble(g, x, y, s, col) { g.font = 'bold 8px monospace'; const w = g.measureText(s).width + 10, bx = Math.round(x - w / 2); tpill(g, bx, y, w, 14, '#f6ecd6', col || '#888'); ttext(g, s, bx + 5, y + 7.5, '#2a1606', 8); g.fillStyle = col || '#888'; g.fillRect(x - 1, y + 14, 3, 2); }
function tsparks(g, x, y, k, col) { for (let i = 0; i < 10; i++) { const a = i * .63, d = 4 + k * 22; g.globalAlpha = 1 - k; g.fillStyle = col || '#ffd24a'; g.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d - k * 8, 2, 2); } g.globalAlpha = 1; }
function twrap(g, s, maxw) { const out = []; let cur = ''; s.split(' ').forEach(w => { if (cur && g.measureText(cur + ' ' + w).width > maxw) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }); if (cur) out.push(cur); return out; }

const TSTEPS = [
  { t: 'Muévete por la cueva', p: 'Controlas <b>un solo personaje</b>. Corre con <span class="key">A</span> <span class="key">D</span> o las flechas y salta con <span class="key">Espacio</span> y mantén <span class="key">Shift</span> para correr más rápido. La cueva es un mapa grande y continuo: puedes subir, bajar y volver atrás.', tip: 'Si caes al agua, nadas: pulsa saltar para sacar la cabeza y respirar.',
    art(p) { canvasArt(p, (g, T, w, h) => { const u = T % 9; let x, y, an = 'idle', fl = false, k = {};
      if (u < .6) { x = 24; y = FLOOR; } else if (u < 2.6) { x = lerp(24, 96, frac(u, .6, 2.6)); y = FLOOR; an = 'run'; k.r = 1; } else if (u < 3.5) { const f = frac(u, 2.6, 3.5); x = lerp(96, 122, f); y = FLOOR - 24 * f - 18 * Math.sin(Math.PI * f); an = f < .5 ? 'jump' : 'fall'; k.s = 1; k.r = 1; }
      else if (u < 5.2) { x = lerp(122, 168, frac(u, 3.5, 5.2)); y = FLOOR - 24; an = 'run'; k.r = 1; } else if (u < 6) { const f = frac(u, 5.2, 6); x = lerp(168, 186, f); y = FLOOR - 24 + 24 * f * f; an = 'fall'; k.r = 1; } else if (u < 7.2) { x = 186; y = FLOOR; fl = false; } else { x = lerp(186, 60, frac(u, 7.2, 8.8)); y = FLOOR; an = 'run'; fl = true; k.l = 1; }
      tcave(g, w, h, T, 0); for (let i = 0; i < 3; i++) ttile(g, 20, 112 + i * 16, FLOOR - 24); tplayer(g, 'guia', an, T, x, y, fl);
      tkey(g, 8, 8, 'A', k.l); tkey(g, 26, 8, 'D', k.r); tkey(g, 8, 24, '←', k.l); tkey(g, 26, 24, '→', k.r); tkey(g, 48, 8, 'ESPACIO', k.s, 46); ttext(g, 'correr', 20, 46, '#cfc8d8', 7, 'center'); ttext(g, 'saltar', 72, 24, '#cfc8d8', 7, 'center'); }, TW, TH, 2); } },
  { t: 'Examina cosas con E', p: 'Los <b>iconos que flotan</b> son pistas. Acércate hasta que salga el cartelito con <span class="key">E</span> y púlsala: tu personaje lo mira y consigues una <b>tarjeta de información</b>. Solo la ves tú.', tip: 'Tus tarjetas se guardan en el cuaderno (tecla <b>J</b>). Tú decides si se las cuentas al equipo.',
    art(p) { canvasArt(p, (g, T, w, h) => { const u = T % 9, px = 112; let x = u < 2.2 ? lerp(20, 88, u / 2.2) : 88, an = u < 2.2 ? 'run' : u < 3.3 ? 'idle' : u < 4.8 ? 'interact' : 'idle', used = u > 4.2;
      tcave(g, w, h, T, 0); tprop(g, 4, u > 4.2 ? 1 : 0, px, FLOOR); tpoi(g, px, FLOOR, T, 'mapa', used); tplayer(g, 'medica', an, T, x, FLOOR, false);
      if (u > 2 && u < 4.4) tprompt(g, px, FLOOR - 58, 'Examinar mapa viejo', u > 3.2 && u < 3.7); if (u > 3.2 && u < 3.8) tsparks(g, px, FLOOR - 40, 0);
      if (u > 4.2 && u < 5) tsparks(g, px, FLOOR - 40, frac(u, 4.2, 5), '#2fd0b0');
      if (u > 4.6) { const k = ease(frac(u, 4.6, 5.1)), y0 = 8 - (1 - k) * 40; tpill(g, 100, y0, 118, 64, '#14283a', '#2fd0b0'); ttext(g, 'NUEVA INFORMACIÓN', 106, y0 + 8, '#2fd0b0', 7); ticon(g, 'mapa', 114, y0 + 26, 16); ttext(g, 'Mapa viejo', 126, y0 + 24, '#fff', 8); ttext(g, '"El barro marca por', 106, y0 + 42, '#fff2d0', 7.5); ttext(g, 'dónde baja el agua"', 106, y0 + 53, '#fff2d0', 7.5); }
      if (u > 5.6) ttext(g, 'Solo tú la ves  ·  J = cuaderno', 112, 84, '#ffd24a', 7, 'center'); }, TW, TH, 2); } },
  { t: 'Sigue la flecha', p: 'Arriba siempre ves <b>un solo objetivo</b>: qué hacer y <b>por qué</b>. La <b>flecha amarilla</b> te lleva hasta allí y te dice cuántos metros faltan. La lista completa está en el cuaderno.', tip: 'No tienes que adivinar nada: haz lo que pone el cartel y deja que la flecha te guíe.',
    art(p) { canvasArt(p, (g, T, w, h) => { const u = T % 10, wx = lerp(20, 330, ease(frac(u, .5, 7.5))), cam = clamp(wx - 70, 0, 200), x = wx - cam, arrived = u > 7.6, tx = 330 - cam; tcave(g, w, h, T, cam);
      for (let i = 0; i < 3; i++) ttile(g, 27, tx - 56 + i * 16, FLOOR - 16); tpoi(g, tx, FLOOR, T, 'agua', arrived && u > 8.4); tplayer(g, 'ing', arrived ? 'idle' : 'run', T, x, FLOOR, false);
      if (!arrived) { const dist = Math.round(lerp(58, 0, frac(u, .5, 7.5))), ax = Math.min(x + 40, w - 30), by = Math.sin(T * 6) * 2; g.save(); g.translate(ax, FLOOR - 34 + by); g.fillStyle = '#10081c'; g.beginPath(); g.moveTo(14, 0); g.lineTo(-2, -11); g.lineTo(-2, 11); g.fill(); g.fillStyle = '#ffd24a'; g.beginPath(); g.moveTo(11, 0); g.lineTo(1, -8); g.lineTo(1, 8); g.fill(); g.fillRect(-9, -3, 10, 6); g.restore(); ttext(g, dist + ' M', ax - 4, FLOOR - 50 + by, '#ffd24a', 8, 'center'); }
      tpill(g, 10, 6, 204, 44, '#241a3a', arrived ? '#2fd0b0' : '#f2a93b'); ttext(g, 'AHORA', 16, 13, '#2fd0b0', 6);
      ttext(g, arrived ? 'Examina el barro (pulsa E)' : 'Ve al barro junto al río', 16, 24, '#ffd27a', 9); ttext(g, arrived ? 'Ahí verás por dónde baja el agua.' : 'Por qué: el barro marca por', 16, 35, '#d9f5ff', 7.5); ttext(g, arrived ? '' : 'dónde baja el agua.', 16, 44, '#d9f5ff', 7.5); }, TW, TH, 2); } },
  { t: 'Habla con tu equipo', p: 'Los otros dos rescatadores los lleva la IA (o amigos). Les hablas por el <b>chat</b> (tecla <span class="key">T</span>) y Lía te llama por <b>radio</b>. Cada cara cambia según cómo se sienten. Al pulsar <b>Compartir</b>, tu tarjeta aparece en el chat para todos.', tip: 'Puedes contar lo que viste... o cambiarlo y mentir. Si te pillan, baja la confianza.',
    art(p) { const MSG = [['lia', 'worried', 'Daos prisa... el agua sube.', 'radio'], ['guia', 'neutral', 'Yo he visto huellas al norte.'], ['medica', 'happy', 'Barro en la orilla: marca por dónde baja el agua.', 'share'], ['ing', 'angry', 'Eso no cuadra con lo que he medido yo.']];
      canvasArt(p, (g, T, w, h) => { const u = T % 14, n = clamp(Math.floor(u / 2.6) + 1, 0, 4); g.fillStyle = '#150f2a'; g.fillRect(0, 0, w, h); g.fillStyle = '#241c46'; g.fillRect(0, 0, w, 11); ttext(g, 'CHAT DEL EQUIPO', 6, 6, '#ffd27a', 6);
        g.save(); g.beginPath(); g.rect(0, 12, w, 100); g.clip(); const rowH = [30, 30, 44, 30]; let s0 = 0, tot = 0; for (let i = 0; i < n; i++) tot += rowH[i]; while (tot > 100) tot -= rowH[s0++]; let y = 16;
        for (let i = s0; i < n; i++) { const m = MSG[i], c = tr(m[0]).col, me = m[0] === 'medica', age = (u - i * 2.6), a = clamp(age / .3, 0, 1); g.globalAlpha = a; const x0 = me ? w - 32 : 4; tface(g, m[0], m[1], x0, y, 28);
            g.font = 'bold 7px monospace'; const lines = twrap(g, m[2], 124), bh = m[3] === 'share' ? 44 : 6 + lines.length * 10 + 2, bx = me ? w - 36 - 150 : 36;
            tpill(g, bx, y, 150, bh - 2, m[3] === 'radio' ? '#06140f' : m[3] === 'share' ? '#0c2229' : me ? '#3d2b0f' : '#241c46', m[3] === 'radio' ? '#2c7a52' : m[3] === 'share' ? '#2fd0b0' : '#3b2f66');
            ttext(g, tr(m[0]).n + (m[3] === 'radio' ? ' (radio)' : ''), bx + 4, y + 7, c, 7); if (m[3] === 'share') ttext(g, 'HAS COMPARTIDO · INTEL', bx + 4, y + 17, '#2fd0b0', 6); lines.forEach((l, k) => ttext(g, l, bx + 4, y + (m[3] === 'share' ? 27 : 17) + k * 10, m[3] === 'radio' ? '#7bf0a0' : '#fff', 7)); y += bh; g.globalAlpha = 1; }
        g.restore(); const press = u > 4.6 && u < 5.4; tpill(g, 4, 118, 120, 17, press ? '#4a3418' : '#241c46', press ? '#ffd24a' : '#b58cff'); ttext(g, 'Os cuento lo que he visto', 9, 126.5, '#fff', 7); tpill(g, 130, 118, 90, 17, '#0a0716', '#3b2f66'); ttext(g, 'Escribe al equipo...', 135, 126.5, '#8a82a8', 7); }, TW, TH, 2); } },
  { t: 'Habilidad y ayuda', p: 'Cada rol tiene una <b>habilidad con la tecla</b> <span class="key">Q</span>: Mateo clava anclajes, Elena da aire y primeros auxilios, Samuel hace puentes y abre válvulas. Hay puertas que solo abre un rol concreto: si no eres tú, <b>pídeselo a tu compañero</b> con «Pedir ayuda».', tip: 'Tu compañero puede ayudarte... o negarse si no se fía de ti. Por eso hablar importa.',
    art(p) { canvasArt(p, (g, T, w, h) => { const u = T % 13, open = u > 8.2, GX = 168; tcave(g, w, h, T, 0);
      if (!open) { for (let r = 0; r < 2; r++) ttile(g, 19, GX, FLOOR - 16 - r * 16); tpill(g, GX - 28, FLOOR - 54, 74, 13, '#2a2638', '#f2a93b'); ttext(g, 'PUENTE · solo Samuel', GX - 24, FLOOR - 47, '#ffd27a', 6.5); } else { for (let i = 0; i < 4; i++) ttile(g, 20, GX - 16 + i * 16, FLOOR - 16); }
      const ox = u < 2 ? lerp(20, 112, u / 2) : u < 9.5 ? 112 : lerp(112, 200, frac(u, 9.5, 11.5)); tplayer(g, 'medica', u < 2 || u > 9.5 ? 'run' : 'idle', T, ox, FLOOR, false);
      const ix = u < 4.2 ? -30 : u < 6 ? lerp(-30, 140, frac(u, 4.2, 6)) : 140; if (u > 4.2 && u < 10) tplayer(g, 'ing', u < 6 ? 'run' : u < 8.4 ? 'interact' : 'idle', T, ix, FLOOR, false);
      if (u > 2.4 && u < 5) tbubble(g, 112, FLOOR - 50, 'No puedo pasar...', '#3fd0c0'); if (u > 6.2 && u < 8.2) tsparks(g, 152, FLOOR - 14, frac(u, 6.2, 8.2) % 1, '#b58cff'); if (u > 8.4 && u < 10.4) tbubble(g, 140, FLOOR - 40, '¡Hecho!', '#b58cff');
      tpill(g, 6, 6, 96, 17, '#1a1228', '#6a6070'); tkey(g, 9, 7, 'Q', false, 11); ttext(g, 'Estabilizar (Elena)', 24, 14.5, '#9a94b0', 7);
      const pr = u > 3.4 && u < 4.4, vis = u > 2.4 && u < 8.2; if (vis) { tpill(g, 6, 28, 122, 17, pr ? '#4a3418' : '#241c46', pr ? '#ffd24a' : '#b58cff'); ttext(g, 'Pedir a Samuel: puente', 12, 36.5, '#fff', 7.5); } if (u > 3 && u < 4.6) ttext(g, '▲ pulsa aquí', 70, 54, '#ffd24a', 7, 'center'); }, TW, TH, 2); } },
  { t: 'Agua, aire y reunión', p: 'El <b>agua sube</b>. Bajo el agua se gasta tu <b>aire</b>: sal a respirar antes de que llegue a 0. Cuando hayáis investigado, pulsa <b>Convocar reunión</b>: el equipo debate y <b>vota</b> el plan (teclas 1, 2 o 3). Cada crisis resuelta abre una zona nueva.', tip: 'Los puntos solo se cuentan al final, por categorías. Ahora céntrate en rescatar a Lía.',
    art(p) { canvasArt(p, (g, T, w, h) => { const u = T % 14; tcave(g, w, h, T, 0);
      if (u < 7) { const wl = lerp(90, 80, u / 7), under = u > 1 && u < 4.6, f = frac(u, 1, 4.6); for (let x = 0; x < w; x += 16) { blit(g, 'water_tile', (Math.floor(T * 5) % 4) * 16, 0, 16, 16, x, wl - 2); for (let y = wl + 14; y < h; y += 16) blit(g, 'water_tile', (Math.floor(T * 5) % 4) * 16, 16, 16, 16, x, y); }
        const x = lerp(30, 170, frac(u, .3, 6.5)), y = under ? wl + 16 + Math.sin(T * 4) * 2 : wl + 6; tplayer(g, 'guia', under ? 'fall' : 'jump', T, x, y + 14, false, 0); if (under) for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(200,240,255,.8)'; g.fillRect(x + 6 + Math.sin(T * 3 + i) * 3, y - ((T * 20 + i * 11) % 26), 2, 2); }
        const air = u < 1 ? 100 : under ? lerp(100, 18, f) : u < 5.4 ? lerp(18, 100, frac(u, 4.6, 5.4)) : 100; tpill(g, 6, 6, 120, 28, '#0e1a2c', air < 25 ? '#ff5d5d' : '#3aa0ff'); ttext(g, air < 25 ? '¡SIN AIRE! Sal del agua' : 'AIRE', 12, 14, air < 25 ? '#ff9a94' : '#bfe3ff', 7); g.fillStyle = '#0a0716'; g.fillRect(12, 22, 108, 8); g.fillStyle = air < 25 ? '#ff5d5d' : '#3aa0ff'; g.fillRect(13, 23, 106 * air / 100, 6);
        if (u > 4.6) ttext(g, '¡Respira!', x, y - 24, '#7dffb0', 8, 'center'); }
      else { const press = u > 8 && u < 8.8; if (u < 8.8) { tplayer(g, 'medica', 'idle', T, 40, FLOOR, false); tplayer(g, 'ing', 'idle', T, 70, FLOOR, true); tplayer(g, 'guia', 'idle', T, 100, FLOOR, false); }
        if (u < 8.8) { const bw = 120; tpill(g, 56, 118, bw, 18, press ? '#17756c' : '#3fd0c0', '#b4fff4'); ttext(g, 'Convocar reunión', 62, 127.5, '#06302c', 8); }
        else { ttext(g, 'ELEGID EL PLAN', w / 2, 10, '#ffd27a', 8, 'center'); ['A · Cruzar', 'B · Rodear', 'C · Esperar'].forEach((s, i) => { const x = 8 + i * 72, win = i === 1 && u > 11.4; tpill(g, x, 20, 68, 62, win ? '#10381f' : '#241c46', win ? '#5fe39a' : '#b58cff'); ttext(g, s, x + 5, 29, '#ffd27a', 7.5); ttext(g, i === 1 ? 'Lento, seguro' : i === 0 ? 'Rápido, arriesga' : 'Sin riesgo', x + 5, 42, '#d8d0ee', 5.5); });
          [['guia', 1, 0, 9.6], ['ing', 0, 0, 10.4], ['medica', 1, 1, 11]].forEach(([r, c, k, at]) => { if (u > at) tface(g, r, 'neutral', 12 + c * 72 + k * 26, 52, 22); }); if (u > 11.4) ttext(g, 'Gana la mayoría: B', w / 2, 98, '#5fe39a', 9, 'center'); } } }, TW, TH, 2); } }
];
function showTutorial() {
  ensure(); return new Promise(res => {
    const s = mkScr('tut', 'tut'); s.innerHTML = ''; let i = 0; const seen = new Set();
    go('tut', { music: 'tutorial', keys: e => { if (e.key === 'ArrowRight' || e.key === 'Enter') { next(); return; } if (e.key === 'ArrowLeft') { prev(); return; } if (e.key === 'Escape') { finish(true); return; } return false; } });
    own(backdrop(s.appendChild(Object.assign($('canvas', 'bgc'), {})), 'entrada', { dark: .85, light: false, n: 40 }));
    const dots = $('div', 'dots rel', s), card = $('div', 'tcard rel panel', s), nav = $('div', 'tnav rel', s);
    const sk = $('button', 'btn sec', nav, 'Saltar (Esc)'), mid = $('span', 'mut', nav), nx = $('button', 'btn go', nav, 'Siguiente');
    const bp = $('button', 'btn sec', nav, '‹'); nav.insertBefore(bp, mid); bp.setAttribute('aria-label', 'Anterior');
    TSTEPS.forEach((_, k) => { const d = $('i', '', dots); d.onclick = () => { i = k; draw(); }; });
    function draw() {
      offTick.splice(1).forEach(f => f()); card.innerHTML = ''; card.style.animation = 'none'; void card.offsetWidth; card.style.animation = ''; const t = TSTEPS[i]; seen.add(i);
      const art = $('div', 'tart', card); t.art(art); const tx = $('div', 'ttext', card); $('div', 'lab', tx, 'PASO ' + (i + 1) + ' DE ' + TSTEPS.length); $('h2', '', tx, esc(t.t)); $('p', '', tx, t.p); $('div', 'tip', tx, '<b>Consejo:</b> ' + t.tip);
      dots.querySelectorAll('i').forEach((d, k) => { d.className = k === i ? 'on' : seen.has(k) ? 'done' : ''; }); mid.textContent = ''; nx.textContent = i === TSTEPS.length - 1 ? 'A jugar!' : 'Siguiente ›'; bp.style.visibility = i ? 'visible' : 'hidden';
    }
    function next() { sfx('click'); if (i >= TSTEPS.length - 1) return finish(); i++; draw(); }
    function prev() { if (!i) return; sfx('back'); i--; draw(); }
    function finish(skipped) { store.set('rcv3_tut', '1'); sfx(skipped ? 'back' : 'confirm'); emit('tutorial', { skipped: !!skipped }); showMenu(); res(); }
    nx.onclick = next; bp.onclick = prev; sk.onclick = () => finish(true); draw();
  });
}

/* ================= CINEMATICA ================= */
const FXD = { valle: ['snow', 'fog'], cabina: ['sway', 'rain'], tormenta: ['rain', 'lightning'], entrada: ['dust', 'torch'], radio: ['radio'], mapa: ['dust', 'torch'], inundada: ['drip', 'fog'], rescate: ['dust', 'light'], derrota: ['rain', 'fog'] };
const GRADEC = { valle: 'rgba(255,140,60,.16)', cabina: 'rgba(60,70,140,.18)', tormenta: 'rgba(40,70,140,.22)', entrada: 'rgba(255,150,60,.10)', radio: 'rgba(40,200,120,.10)', mapa: 'rgba(255,170,80,.14)', inundada: 'rgba(30,110,160,.2)', rescate: 'rgba(255,230,160,.18)', derrota: 'rgba(20,40,70,.3)' };
const INTRO_DEF = [
  { still: 'valle', text: 'Valle de Sorrosal. Atardece. Hace dos horas que nadie sabe nada de Lia.' },
  { still: 'cabina', text: 'Mateo, Elena y Samuel suben en el viejo teleferico. Nadie habla. Cada uno guarda algo que los demas no saben.' },
  { still: 'tormenta', text: 'La tormenta cae de golpe. El cable se sacude... y la cabina se queda colgada sobre el vacio.' },
  { still: 'entrada', text: 'La boca de la cueva. El suelo ya esta mojado, y el agua no deberia estar aqui.' },
  { still: 'radio', who: 'Lia (radio)', text: '"...aqui Lia... estoy atrapada... la pierna... el agua sube. Por favor... daos prisa."' },
  { still: 'mapa', text: 'Cinco tramos. Un mapa incompleto. Y tres personas que no cuentan todo lo que saben.' },
  { still: 'inundada', text: 'Sacadla con vida... y que cada uno pueda mirarse al espejo despues.' },
  { still: 'entrada', title: 'RESCATE EN LA CUEVA', text: 'Cinco decisiones. Una sola salida.', dur: 5 }
];
const KEYS = [[/radio|lia\b.*:|transmisi/i, 'radio'], [/tormenta|relampago|rayo|lluvia|cae/i, 'tormenta'], [/telef|cabina|suben/i, 'cabina'], [/mapa|ruta|tramos/i, 'mapa'], [/inunda|agua sube|llena|espejo/i, 'inundada'], [/cueva|entrada|boca|galeria/i, 'entrada']];
function buildShots(id, o) {
  if (o && o.shots) return o.shots;
  if (id === 'rescate') return [{ still: 'rescate', text: o && o.text || 'La luz del dia. Lia respira. Lo habeis conseguido.', who: '' }];
  if (id === 'derrota') return [{ still: 'derrota', text: o && o.text || 'El agua lo cubre todo. El silencio es lo peor.', who: '' }];
  let I = window.Story && Array.isArray(Story.intro) && Story.intro.length >= 3 ? Story.intro : null; if (!I) return INTRO_DEF;
  // la cinematica la ven TODOS: fuera las lineas que cuentan lo privado de un rol (empiezan por su nombre) o el secreto
  I = I.filter(e => !/^\s*(Mateo|Elena|Samuel|Nico|Ona|Iv[aá]n)\b|c[oó]mo se juega|pulsa|tecla|\bvota|\bchat\b|explora y busca/i.test(typeof e === 'string' ? e : (e && e.text) || '')); if (I.length < 6) return INTRO_DEF;
  const ord = ['valle', 'cabina', 'tormenta', 'entrada', 'radio', 'mapa', 'inundada'];
  const sh = I.map((e, n) => { const t = typeof e === 'string' ? { text: e } : Object.assign({}, e); if (!t.still) { const k = KEYS.find(x => x[0].test(t.text || '')); t.still = n === 0 ? 'valle' : k ? k[1] : ord[Math.min(n, ord.length - 1)]; } return t; });
  sh.push(INTRO_DEF[INTRO_DEF.length - 1]); return sh;
}
function playCinematic(id, o) {
  ensure(); o = o || {}; id = id || 'intro';
  return new Promise(async res => { try {
    const shots = buildShots(id, o); await Promise.all(shots.map(s => loadStill(s.still)));
    const s = mkScr('cine', 'cine'); s.innerHTML = ''; const W = 640, H = 360;
    const vw = $('div', 'cvw', s), cv = $('canvas', '', vw); cv.width = W; cv.height = H; const g = cv.getContext('2d'), sub = $('div', 'sub3', vw), fl = $('div', 'fl', vw), cd = $('div', 'cdots', vw);
    shots.forEach(() => $('i', '', cd)); const skip = $('button', 'btn sec skip', s, 'Saltar »'); sub.remove(); (matchMedia('(max-aspect-ratio:1/1)').matches ? s : vw).appendChild(sub);
    const prev = mk(W, H), pg = prev.getContext('2d'), nz = mk(160, 90), nzg = nz.getContext('2d'); let gt = 0, done = false, i = -1, t = 0, dur = 6, typed = 0, text = '', fade = 0, flash = 0, thunderAt = -1, wait = 0, shake = 0, P = [], ty = 0, tmo = 0;
    const noise = () => { const d = nzg.createImageData(160, 90); for (let k = 0; k < d.data.length; k += 4) { const v = Math.random() * 255; d.data[k] = d.data[k + 1] = d.data[k + 2] = v; d.data[k + 3] = 255; } nzg.putImageData(d, 0, 0); };
    function nextShot() {
      if (i >= 0) pg.drawImage(cv, 0, 0); i++; if (i >= shots.length) return end(); const sh = shots[i]; t = 0; typed = 0; fade = i ? 1 : 1.4; text = sh.text || ''; const fxl = sh.fx || FXD[sh.still] || []; sh._fx = fxl; ty = 0; tmo = 0;
      const r = rng(i * 131 + 7), n = fxl.includes('rain') ? 170 : fxl.includes('snow') ? 90 : fxl.includes('dust') ? 60 : fxl.includes('drip') ? 4 : 30; P = []; for (let k = 0; k < n; k++) P.push({ x: r() * W, y: r() * H, z: .3 + r() * .9, p: r() * 6 });
      sh._kb = { z0: 1.02, z1: 1.14 + r() * .06, x0: r(), x1: r(), y0: r(), y1: r() }; if (i % 2) { sh._kb.x0 = 1 - sh._kb.x0; sh._kb.x1 = 1 - sh._kb.x1; }
      dur = sh.dur || Math.max(5.2, text.length * .065 + 2.8) + (S.narr ? text.length * .02 : 0); thunderAt = fxl.includes('lightning') ? 1 + Math.random() * 1.5 : -1;
      cd.querySelectorAll('i').forEach((d, k) => d.className = k <= i ? 'on' : ''); sub.className = 'sub3' + (sh.title ? ' title' : '');
      const who = sh.who || ''; sub.innerHTML = (sh.title ? '<span class="tt">' + esc(sh.title) + '</span>' : '') + (who ? '<span class="who">' + esc(who.toUpperCase()) + '</span>' : '') + '<span class="tx"></span>'; sh._tx = sub.querySelector('.tx');
      if (fxl.includes('radio')) { sfx('radio_on'); setTimeout(() => sfx('radio_static'), 400); } else if (i === 0) sfx('round_start'); else sfx('open');
      if (fxl.includes('drip')) sfx('drip'); if (fxl.includes('rain') && !fxl.includes('lightning')) sfx('rumble');
      if (S.narr && text) snd('speak', text, { who: (sh.who || 'narrador') });
    }
    function end() { if (done) return; done = true; stopT(); snd('stopSpeak'); s.style.transition = 'opacity .6s'; s.style.opacity = 0; setTimeout(() => { s.style.opacity = ''; s.style.transition = ''; s.classList.remove('on'); cur = null; res(); }, 650); }
    function advance() { const sh = shots[i]; if (!sh) return; if (typed < text.length) { typed = text.length; return; } if (t > 1.2) { sfx('click'); nextShot(); } }
    let stopT = () => { };
    go('cine', { music: 'briefing', keys: e => { if (e.key === 'Escape') { sfx('back'); end(); return; } if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { advance(); return; } return false; } });
    s.onclick = e => { if (e.target === skip) return; advance(); }; skip.onclick = e => { e.stopPropagation(); sfx('back'); end(); };
    nextShot(); noise();
    stopT = tick(dt => {
      if (done) return; t += dt; const sh = shots[i]; if (!sh) return; const fxl = sh._fx, p = clamp(t / dur, 0, 1);
      if (t > .7 && typed < text.length) { const before = Math.floor(typed); typed = Math.min(text.length, typed + dt * 34); if (Math.floor(typed) !== before && Math.floor(typed) % 4 === 0 && text[Math.floor(typed) - 1] !== ' ') sfx('typing'); }
      if (sh._tx) sh._tx.textContent = text.slice(0, Math.floor(typed));
      if (typed >= text.length && t >= dur) nextShot(); if (done || !shots[i]) return;
      // Ken Burns
      const im = stillSrc(sh.still), iw = im.width || 320, ih = im.height || 180, k = sh._kb, z = lerp(k.z0, k.z1, ease(p)), vwid = iw / z, vh = ih / z, px = lerp(k.x0, k.x1, p), py = lerp(k.y0, k.y1, p);
      const sway = fxl.includes('sway') ? Math.sin(t * 1.3) * 3 : 0, sx = (iw - vwid) * px, sy = (ih - vh) * py; shake = Math.max(0, shake - dt * 3);
      g.save(); const sk = shake * 6 * (S.flash ? 0 : 1); g.translate(Math.sin(t * 60) * sk, Math.cos(t * 47) * sk); g.imageSmoothingEnabled = true; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      if (sway) { g.translate(W / 2, H / 2); g.rotate(sway * .002); g.translate(-W / 2, -H / 2); } g.drawImage(im, sx, sy, vwid, vh, -4, -4, W + 8, H + 8);
      // parallax: niebla y siluetas en primer plano (mas rapidas que el plano)
      if (fxl.includes('fog') || fxl.includes('dust')) for (let q = 0; q < 3; q++) { const x = ((t * (8 + q * 6) + q * 260) % (W + 400)) - 400, gr = g.createLinearGradient(x, 0, x + 400, 0); gr.addColorStop(0, 'rgba(180,200,230,0)'); gr.addColorStop(.5, 'rgba(180,200,230,' + (.07 + q * .02) + ')'); gr.addColorStop(1, 'rgba(180,200,230,0)'); g.fillStyle = gr; g.fillRect(x, H * (.45 + q * .15), 400, H * .3); }
      if (!['cabina', 'radio', 'mapa'].includes(sh.still)) { g.fillStyle = 'rgba(4,3,10,.92)'; const off = -(px - .5) * 90; g.beginPath(); g.moveTo(-20, H); g.lineTo(-20, H * .88); for (let x = -20; x <= W + 20; x += 20) g.lineTo(x, H * (.93 + .03 * Math.sin(x * .07 + i))); g.lineTo(W + 20, H); g.fill(); const r = rng(i * 9 + 3); for (let q = 0; q < 6; q++) { const x = (q < 3 ? r() * 90 : W - r() * 90) + off * (q < 3 ? 1 : 1), hh = 70 + r() * 90; g.beginPath(); g.moveTo(x, H - hh); g.lineTo(x - 18, H); g.lineTo(x + 18, H); g.fill(); } }
      // clima
      if (fxl.includes('rain')) { g.strokeStyle = 'rgba(190,210,240,.35)'; g.lineWidth = 1; g.beginPath(); P.forEach(d => { d.y += dt * (700 + d.z * 500); d.x -= dt * 120; if (d.y > H) { d.y = -20; d.x = Math.random() * (W + 100); } g.moveTo(d.x, d.y); g.lineTo(d.x + 5 * d.z, d.y - 16 * d.z); }); g.stroke(); }
      if (fxl.includes('snow')) P.forEach(d => { d.y += dt * (18 + d.z * 40); d.x += Math.sin(t * .8 + d.p) * dt * 20 * d.z + dt * 14; if (d.y > H) d.y = -4; if (d.x > W) d.x = 0; g.fillStyle = 'rgba(255,255,255,' + (.35 + d.z * .5) + ')'; const sz = 1 + d.z * 2; g.fillRect(d.x, d.y, sz, sz); });
      if (fxl.includes('dust')) P.forEach(d => { d.x += dt * (4 + d.z * 8) * Math.cos(d.p); d.y += dt * (-3 + Math.sin(t * .5 + d.p) * 3); if (d.x > W) d.x = 0; if (d.y < 0) d.y = H; if (d.x < 0) d.x = W; g.fillStyle = 'rgba(255,220,160,' + (.1 + .25 * Math.abs(Math.sin(t + d.p))) * d.z + ')'; g.beginPath(); g.arc(d.x, d.y, 1 + d.z * 1.4, 0, 7); g.fill(); });
      if (fxl.includes('drip')) { ty += dt; if (ty > 1.6) { ty = 0; sfx('drip'); P[0] = { x: 100 + Math.random() * 440, y: 0, v: 0, ring: 0 }; } const d = P[0]; if (d && d.ring < 1) { if (d.y < H * .7) { d.v += 900 * dt; d.y += d.v * dt; g.fillStyle = '#9fd8ff'; g.fillRect(d.x, d.y, 2, 6); } else { d.ring += dt * 1.5; g.strokeStyle = 'rgba(180,230,255,' + (1 - d.ring) + ')'; g.beginPath(); g.ellipse(d.x, H * .7, 30 * d.ring, 8 * d.ring, 0, 0, 7); g.stroke(); } } }
      if (fxl.includes('torch') || fxl.includes('light')) { const a = .18 + .06 * Math.sin(t * 9) + .04 * Math.sin(t * 23), gr = g.createRadialGradient(W * .5, H * .62, 6, W * .5, H * .62, W * .5); gr.addColorStop(0, fxl.includes('light') ? 'rgba(255,255,220,' + (a * 2) + ')' : 'rgba(255,170,70,' + a + ')'); gr.addColorStop(1, 'rgba(255,170,70,0)'); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
      if (GRADEC[sh.still]) { g.globalCompositeOperation = 'overlay'; g.fillStyle = GRADEC[sh.still]; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
      // radio: estatica, glitch, HUD
      if (fxl.includes('radio')) { if (Math.floor(t * 20) !== tmo) { tmo = Math.floor(t * 20); noise(); } const glitchy = (Math.sin(t * 3.1) > .85 || t < .6) && !S.flash; g.globalAlpha = glitchy ? .45 : .14; g.drawImage(nz, 0, 0, W, H); g.globalAlpha = 1; if (glitchy) for (let q = 0; q < 4; q++) { const y = Math.random() * H, hh = 6 + Math.random() * 24; g.drawImage(cv, 0, y, W, hh, (Math.random() - .5) * 30, y, W, hh); }
        g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(16, 38, 190, 26); g.fillStyle = Math.sin(t * 6) > 0 ? '#ff4a4a' : '#5a1a1a'; g.beginPath(); g.arc(30, 51, 4, 0, 7); g.fill(); g.fillStyle = '#4cff9a'; g.font = '10px "Press Start 2P",monospace'; g.fillText('RADIO 146.52', 42, 55); for (let q = 0; q < 4; q++) { g.fillStyle = Math.random() < .3 + q * .15 ? '#4cff9a' : '#1a3a2a'; g.fillRect(176 + q * 6, 56 - q * 4, 4, 4 + q * 4); } }
      // relampagos
      if (thunderAt >= 0 && t > thunderAt) { flash = 1; shake = 1; sfx('thunder'); thunderAt = t + 2.5 + Math.random() * 3; }
      if (flash > 0) { flash = Math.max(0, flash - dt * (Math.random() < .3 ? 6 : 2.2)); const a = flash * (S.flash ? .12 : .75); g.fillStyle = 'rgba(210,225,255,' + a + ')'; g.fillRect(0, 0, W, H); }
      g.restore();
      // grano, viñeta, letterbox
      gt += dt; if (gt > .08) { gt = 0; noise(); } g.globalAlpha = .07; g.drawImage(nz, 0, 0, W, H); g.globalAlpha = 1;
      const vg = g.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, W * .72); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.72)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
      const bh = H * .09 * (i ? 1 : ease(t / 1.2)); g.fillStyle = '#000'; g.fillRect(0, 0, W, bh); g.fillRect(0, H - bh, W, bh);
      // transicion: crossfade desde el plano anterior / fundido desde negro
      if (fade > 0) { fade = Math.max(0, fade - dt / (i ? .9 : 1.4)); if (i) { g.globalAlpha = fade; g.drawImage(prev, 0, 0); g.globalAlpha = 1; } else { g.fillStyle = 'rgba(0,0,0,' + fade + ')'; g.fillRect(0, 0, W, H); } }
      const tail = dur - t; if (i === shots.length - 1 && tail < 1.2) { g.fillStyle = 'rgba(0,0,0,' + (1 - tail / 1.2) + ')'; g.fillRect(0, 0, W, H); }
      fl.style.opacity = 0;
    });
    own(() => { done = true; stopT(); snd('stopSpeak'); });
  } catch (e) { console.error(e); res(); } });
}

/* ================= PANTALLA DE ROL ================= */
function showRole(priv, role) {
  ensure(); priv = priv || {}; return new Promise(res => {
    const d = rinfo(role), s = mkScr('role', 'role'); s.innerHTML = ''; s.style.setProperty('--c', d.col);
    go('role', { music: 'briefing', keys: e => { if (e.key === 'Enter' || e.key === ' ') { adv(); return; } return false; } }); bgc(s, 'entrada', { dark: .85, kind: 'ember', light: false, n: 45 });
    const c = $('div', 'rcard rel', s); c.style.setProperty('--c', d.col); $('div', 'lab', c, 'TU PAPEL EN EL RESCATE'); const pc = portrait(role, 'preocupado', 128); pc.className += ' big'; c.appendChild(pc); sfx('select');
    const h = $('h1', '', c, 'ERES ' + esc(d.n.toUpperCase())); h.style.color = d.col; $('div', 'mut', c, esc(d.t) + ' &middot; ' + esc(d.skill));
    const goal = priv.goal && (priv.goal.text || priv.goal), sec = priv.secret && (priv.secret.text || priv.secret), rb = Story_role(role);
    const gb = $('div', 'sbox', c, '<div class="lab">' + icon('estrella', 14).outerHTML + ' TU OBJETIVO SECRETO' + (priv.goal && priv.goal.points ? ' (+' + priv.goal.points + ' pts)' : '') + '</div><div class="t">' + esc(goal || rb.goal || 'Ayuda al equipo.') + '</div>');
    const sb = $('div', 'sbox hid', c, '<div class="lab">' + icon('candado', 14).outerHTML + ' TU SECRETO (solo lo sabes tu)</div><div class="t">' + esc(sec || rb.secret || 'Guardas algo que el equipo no sabe.') + '</div>'); let shown = false;
    $('div', 'mut', c, 'Nadie mas ve esto. Decide si lo cuentas, lo callas o lo escondes bajo una mentira.');
    const b = $('button', 'btn go', c, 'Revelar mi secreto'); b.onclick = adv; sb.onclick = () => adv(true);
    function adv(only) { if (!shown) { shown = true; sb.classList.remove('hid'); sfx('secret_reveal'); b.textContent = 'Entendido, a la cueva'; burst(innerWidth / 2, innerHeight * .6, d.col, 18); if (only) return; return; } sfx('confirm'); snd('music', 'explore'); s.classList.remove('on'); cur = null; res(); }
  });
}
const Story_role = k => (window.Story && Story.ROLES && Story.ROLES[k]) || {};

/* ================= PANTALLA FINAL ================= */
const NICE = { rounds: 'Tramos jugados', hallazgos: 'Hallazgos', mentiras: 'Mentiras dichas', descubiertas: 'Mentiras descubiertas', compartidas: 'Tarjetas compartidas', votos: 'Votos', tiempo: 'Tiempo total' };
function showFinal(result, state) {
  ensure(); result = result || {}; state = state || result.state || {}; const grade = (result.grade || (result.saved ? 'B' : 'D')).toString().toUpperCase().charAt(0), gc = GRADE[grade] || '#fff', good = 'SAB'.includes(grade);
  const s = mkScr('final', 'final scroll'); s.innerHTML = ''; s.style.setProperty('--c', gc);
  go('final', { music: result.saved === false ? 'lose' : 'win', keys: e => { if (e.key === 'r' || e.key === 'R' || e.key === 'Enter') { b1.click(); return; } if (e.key === 'm' || e.key === 'M' || e.key === 'Escape') { b3.click(); return; } return false; } });
  bgc(s, result.saved === false ? 'derrota' : 'rescate', { dark: .8, kind: good ? 'ember' : 'snow', light: false, n: 60 });
  const c = $('div', 'rel', s), seq = []; let dly = 0; const step = (fn, wait) => { dly += wait; seq.push(setTimeout(fn, dly)); }; own(() => seq.forEach(clearTimeout));
  const IDS4 = ['lia', 'guia', 'medica', 'ing'], fates = ((state.final && state.final.fates) || result.fates || (result.final && result.final.fates) || []).filter(f => f && IDS4.includes(f.id)).sort((a, b) => IDS4.indexOf(a.id) - IDS4.indexOf(b.id)), lf = fates.find(f => f.id === 'lia'), saved = lf ? lf.status !== 'muerto' : result.saved !== false;
  $('div', 'fhead', c, saved ? 'Lía está a salvo' : 'No habéis llegado a tiempo').style.color = saved ? '#9affc0' : '#ffb0a8';
  if (fates.length) {
    const ok = fates.filter(f => f.status !== 'muerto').length; $('div', 'lab', c, 'DESTINO DE LAS PERSONAS').style.textAlign = 'center'; $('div', '', c, 'Salvasteis a <b>' + ok + '</b> de ' + fates.length).style.cssText = 'text-align:center;font-size:1.25em;margin:.2em 0';
    const fg = $('div', 'fates', c); fates.forEach(f => { const dead = f.status === 'muerto', e = $('div', 'fate ' + (f.status || 'vivo'), fg); e.style.opacity = 0; const pt = $('div', 'pt', e); pt.appendChild(fateFace(f));
      $('div', '', e, '<b>' + esc(f.name || f.id) + '</b>' + (dead ? '<i class="cdl"></i>' : '') + '<br><span class="st">' + (dead ? 'NO SOBREVIVIÓ' : f.status === 'herido' ? 'HERIDO' : 'A SALVO') + '</span><br><span class="mut">' + esc(f.why || '') + '</span>');
      step(() => { e.style.opacity = 1; e.style.animation = 'rrise .5s both'; sfx('tick'); }, 450); });
  }
  const gh = $('div', 'grade', c, grade); gh.style.visibility = 'hidden'; $('div', 'lab', c, 'NOTA DEL EQUIPO').style.textAlign = 'center';
  step(() => { gh.style.visibility = 'visible'; sfx(good ? 'grade_s' : 'grade_low'); flashEl(gc); if (good) { confetti(grade === 'S' ? 140 : 70); burst(innerWidth / 2, innerHeight * .25, ['#ffd34d', gc], 30, { v: 300 }); } }, 700);
  const g2 = $('div', 'grid2', c); g2.style.marginTop = '1em'; const sc = result.score || state.score || {}, L = $('div', 'panel', g2), R = $('div', 'panel', g2);
  $('div', 'lab', L, 'PUNTUACION'); const names = { equipo: 'Equipo', info: 'Informacion', honestidad: 'Honestidad', riesgo: 'Riesgo calculado' };
  Object.keys(names).forEach(k => { if (sc[k] == null) return; const ln = $('div', 'ln', L, '<span>' + names[k] + '</span><b class="px" data-v="' + sc[k] + '">0</b>'); ln.style.opacity = 0; step(() => { ln.style.opacity = 1; count(ln.querySelector('b'), sc[k]); sfx('tick'); }, 280); });
  if (sc.total != null) { const ln = $('div', 'ln', L, '<b>TOTAL</b><b class="px" style="color:' + gc + '">0</b>'); ln.style.opacity = 0; step(() => { ln.style.opacity = 1; count(ln.lastChild, sc.total, 900); sfx('confirm'); }, 400); }
  $('div', 'lab', R, 'OBJETIVOS INDIVIDUALES'); const obj = result.objectives || []; obj.forEach(o => { const d = rinfo(o.role), ln = $('div', 'ln', R, '<span style="color:' + d.col + '">' + esc(d.n) + '</span><span class="' + (o.ok ? 'ok' : 'no') + '">' + (o.ok ? '✔ ' : '✘ ') + esc(o.text || '') + '</span>'); ln.style.opacity = 0; step(() => { ln.style.opacity = 1; sfx(o.ok ? 'resolve_good' : 'resolve_bad'); }, 420); });
  const mvp = result.mvp && (result.mvp.role || result.mvp); if (mvp && RD[mvp]) { const d = rinfo(mvp), m = $('div', 'row', R); m.style.marginTop = '.7em'; m.appendChild(portrait(mvp, 'feliz', 48)); $('div', '', m, '<span class="lab">MVP</span><br><b style="color:' + d.col + '">' + esc(d.n) + '</b>' + (result.mvp.why ? '<br><span class="mut">' + esc(result.mvp.why) + '</span>' : '')); m.style.opacity = 0; step(() => { m.style.opacity = 1; sfx('select'); }, 400); }
  // logros nuevos
  const got = jget('rcv3_ach', {}), list = achList(), ids = (result.achievements || state.achievements || []).map(a => typeof a === 'string' ? a : a.id), news = ids.filter(id => !got[id]); ids.forEach(id => { if (!got[id]) got[id] = Date.now(); }); store.set('rcv3_ach', JSON.stringify(got));
  if (ids.length) { const A = $('div', 'panel', c); A.style.marginTop = '1em'; $('div', 'lab', A, 'LOGROS ' + (news.length ? '(' + news.length + ' NUEVO' + (news.length > 1 ? 'S' : '') + ')' : '')); const ag = $('div', 'agrid', A); ag.style.marginTop = '.5em'; ids.forEach(id => { const a = list.find(x => x.id === id) || { id, name: id, desc: '' }, isNew = news.includes(id), e = $('div', 'ach' + (isNew ? '' : ' old'), ag); e.style.opacity = 0; e.appendChild(trophy(Math.max(0, list.findIndex(x => x.id === id)), 40)); $('div', '', e, '<b>' + esc(a.name) + '</b>' + (isNew ? ' <span class="ok">NUEVO</span>' : '') + '<br><span class="mut">' + esc(a.desc || '') + '</span>'); step(() => { e.style.opacity = 1; if (isNew) { sfx('achievement'); burst(e.getBoundingClientRect().left + 30, e.getBoundingClientRect().top + 20, '#ffd34d', 12); } }, 500); }); }
  // estadisticas
  const stt = result.stats || state.stats || null; if (stt) { const P = $('div', 'panel', c); P.style.marginTop = '1em'; $('div', 'lab', P, 'ESTADISTICAS'); Object.keys(stt).forEach(k => $('div', 'ln', P, '<span>' + esc(NICE[k] || k) + '</span><b>' + esc(stt[k]) + '</b>').style.animation = 'none'); }
  const vp = $('div', 'panel', c); vp.style.marginTop = '1em'; $('div', 'lab', vp, 'VEREDICTO'); const vt = $('div', '', vp, ''); vt.style.cssText = 'line-height:1.55;font-size:1.05em;margin-top:.4em;min-height:3em';
  step(() => typeInto(vt, String(result.verdict || state.verdict || (result.saved === false ? 'No lo conseguisteis esta vez. Cada decision cuenta: rejugad con otro rol.' : 'Lia esta fuera. Lo que cada uno hizo en la oscuridad, quedara entre vosotros.')), 36), 500);
  const bt = $('div', 'row', c); bt.style.cssText = 'justify-content:center;margin-top:1.2em'; const b1 = $('button', 'btn go', bt, 'Otra partida<span class="k">R</span>'), b2 = $('button', 'btn', bt, 'Cambiar de rol'), b3 = $('button', 'btn sec', bt, 'Menu<span class="k">M</span>');
  b1.onclick = () => { sfx('confirm'); emit('restart', { changeRole: false }); }; b2.onclick = () => { sfx('click'); emit('restart', { changeRole: true }); showLobby({ mode: 'idle' }); }; b3.onclick = () => { sfx('back'); emit('menu', {}); showMenu(); };
  return s;
}
function fateFace(f) { // retrato segun estado: _dead / _hurt / hoja; si falta cae al generico o a un hueco
  const c = mk(96, 96), A = (window.ASSETS && ASSETS.images) || {}, id = f.id, base = f.portrait || (['lia', 'guia', 'medica', 'ing'].includes(id) ? 'portrait_' + id : 'pers_' + id), root0 = base.replace(/_(dead|hurt)$/, '');
  const suf = f.status === 'muerto' ? '_dead' : f.status === 'herido' ? '_hurt' : '', name = [root0 + suf, root0, 'portrait_' + id].find(n => A[n]);
  const g = c.getContext('2d'); g.fillStyle = '#2a2240'; g.fillRect(0, 0, 96, 96); g.fillStyle = '#9a90b8'; g.font = 'bold 50px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText((f.name || '?').charAt(0), 48, 50);
  if (name) withImg(name, im => { const mt = meta(name), fw = mt.fw || 64, fh = mt.fh || Math.min(im.height, fw), cols = Math.max(1, Math.floor(im.width / fw)), i = name.endsWith('_dead') || name.endsWith('_hurt') || cols < 2 ? 0 : f.status === 'herido' ? 1 : f.status === 'muerto' ? 0 : Math.min(3, cols - 1); g.clearRect(0, 0, 96, 96); g.imageSmoothingEnabled = false; g.drawImage(im, i * fw, 0, fw, Math.min(fh, im.height), 0, 0, 96, 96); });
  return c;
}
function flashEl(col) { if (S.flash || (window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches)) return; const f = $('div', '', root); f.style.cssText = 'position:absolute;inset:0;box-shadow:inset 0 0 0 3px ' + col + ';opacity:.12;z-index:45;pointer-events:none;transition:opacity .14s'; requestAnimationFrame(() => f.style.opacity = 0); setTimeout(() => f.remove(), 200); }
function count(el, to, ms) { ms = ms || 700; let t0 = performance.now(); const f = () => { const p = clamp((performance.now() - t0) / ms, 0, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); }; f(); }
function typeInto(el, txt, cps) { let i = 0; const iv = setInterval(() => { i += 2; el.textContent = txt.slice(0, i); if (i >= txt.length || !el.isConnected) clearInterval(iv); }, 1000 / (cps || 30) * 2); }

/* ================= LOGROS ================= */
const ACH_DEF = [['confesion', 'Confesion', 'Revela tu secreto al equipo.'], ['cero_bajas', 'Cero bajas', 'Termina con Lia a salvo y la salud sobre 70.'], ['cartografo', 'Cartografo', 'Examina todos los puntos de interes de un tramo.'], ['lengua_plata', 'Lengua de plata', 'Miente y que nadie lo descubra.'], ['detective', 'Detective de mentiras', 'Descubre una mentira del equipo.'], ['al_borde', 'Al borde', 'Gana con el agua por encima de 90.'], ['todos_cumplen', 'Todo el equipo cumple', 'Que los tres objetivos individuales se cumplan.'], ['sin_pausas', 'Sin pausas', 'Usa las 3 acciones en cada tramo.'], ['everest', 'Everest', 'Gana en dificultad Everest.'], ['primer_rescate', 'Primer rescate', 'Saca a Lia de la cueva.'], ['manos_limpias', 'Manos limpias', 'Termina sin mentir ni una vez.'], ['coleccionista', 'Coleccionista', 'Encuentra los 5 hallazgos secretos.'], ['voz_equipo', 'Voz del equipo', 'Consigue que tu plan gane 3 votaciones.'], ['rejugable', 'Otra cara', 'Termina una partida con cada rol.']];
function achList() { try { const l = window.Story && Story.achievementsList && Story.achievementsList(); if (l && l.length) return l.map(a => Array.isArray(a) ? { id: a[0], name: a[1], desc: a[2] } : a); } catch (e) { } return ACH_DEF.map(a => ({ id: a[0], name: a[1], desc: a[2] })); }
function showAchievements() {
  ensure(); const s = mkScr('ach', 'scroll'); s.innerHTML = ''; go('ach', { music: 'menu', keys: e => { if (e.key === 'Escape' || e.key === 'Enter') { back.click(); return; } return false; } }); bgc(s, 'mapa', { dark: .88, light: false, n: 30 });
  const c = $('div', 'rel', s); c.style.cssText = 'padding:16px;max-width:980px;width:100%;margin:0 auto'; const got = jget('rcv3_ach', {}), list = achList(), n = list.filter(a => got[a.id]).length;
  const hd = $('div', 'scroll-head', c); $('h2', '', hd, 'LOGROS'); const back = $('button', 'btn sec', hd, 'Volver (Esc)'); back.onclick = () => { sfx('back'); showMenu(); };
  $('div', '', c, '<b>' + n + ' / ' + list.length + '</b> desbloqueados').style.margin = '.4em 0'; const pr = $('div', 'prog', c, '<i style="width:0"></i>'); setTimeout(() => pr.firstChild.style.width = (n / list.length * 100) + '%', 100);
  const gr = $('div', 'agrid', c); gr.style.marginTop = '1em'; list.forEach((a, i) => { const ok = !!got[a.id], e = $('div', 'acell' + (ok ? ' got' : ''), gr); e.style.animation = 'rrise .4s both'; e.style.animationDelay = i * .03 + 's'; e.appendChild(trophy(i, 44, !ok)); $('div', '', e, '<b>' + esc(ok || !a.secret ? a.name : '???') + '</b><br><span class="mut">' + esc(ok || !a.secret ? a.desc : 'Logro secreto') + '</span>'); });
}

/* ================= AJUSTES ================= */
function openSettings() {
  ensure(); snd('unlock'); modal((p, close) => {
    $('h2', '', p, 'AJUSTES'); const row = (name, el) => { const l = $('label', '', p); $('span', '', l, name); l.appendChild(el); return l; }, tog = (k, f) => { const t = $('button', 'tog' + (S[k] ? ' on' : '')); t.setAttribute('role', 'switch'); t.setAttribute('aria-checked', !!S[k]); t.onclick = () => { S[k] = !S[k]; t.classList.toggle('on', S[k]); t.setAttribute('aria-checked', S[k]); saveS(); f && f(); sfx('click'); changed(); }; return t; };
    const changed = () => { saveS(); applyLook(); applySound(); emit('settings', Object.assign({}, S)); };
    const dv = $('div', 'diff'); [['facil', 'Facil'], ['normal', 'Normal'], ['everest', 'Everest']].forEach(([k, n]) => { const c = $('button', 'chip' + (S.diff === k ? ' on' : ''), dv, n); c.onclick = () => { S.diff = k; dv.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === c)); sfx('select'); changed(); }; }); row('Dificultad', dv);
    { const r = $('input'); r.type = 'range'; r.min = 0; r.max = 100; let v0 = S.vol.master; try { if (v0 == null && window.Sound && Sound.getVolume) v0 = Sound.getVolume(); } catch (e) { } r.value = Math.round((v0 == null ? .4 : v0) * 100); r.setAttribute('aria-label', 'Volumen general'); r.oninput = () => { S.vol.master = r.value / 100; applySound(); }; r.onchange = () => { sfx('click'); changed(); }; row('Volumen general', r); }
    [['music', 'Musica'], ['sfx', 'Efectos'], ['voice', 'Voz']].forEach(([k, n]) => { const r = $('input'); r.type = 'range'; r.min = 0; r.max = 100; r.value = Math.round(S.vol[k] * 100); r.setAttribute('aria-label', n); r.oninput = () => { S.vol[k] = r.value / 100; applySound(); }; r.onchange = () => { sfx('click'); changed(); }; row(n, r); });
    row('Silenciar todo', tog('mute')); row('Narracion (voz)', tog('narr', () => { if (S.narr) snd('speak', 'Narracion activada.', { who: 'narrador' }); }));
    const ts = $('div', 'diff'); [['Normal', 1], ['Grande', 1.2], ['Muy grande', 1.4]].forEach(([n, v]) => { const c = $('button', 'chip' + (S.ts === v ? ' on' : ''), ts, n); c.onclick = () => { S.ts = v; ts.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === c)); sfx('select'); changed(); }; }); row('Tamano de texto', ts);
    row('Reducir flashes y movimiento', tog('flash', changed));
    const ky = $('input'); ky.type = 'password'; ky.placeholder = 'sk-ant-... (opcional)'; ky.autocomplete = 'off'; ky.value = store.get('rcv3_key') || ''; ky.setAttribute('aria-label', 'Clave API'); ky.onchange = () => { store.set('rcv3_key', ky.value.trim()); try { window.Story && Story.setKey && Story.setKey(ky.value.trim()); } catch (e) { } toast(ky.value.trim() ? 'Clave guardada: la IA real hara de director y companeros' : 'Sin clave: modo demo (funciona igual, sin internet)'); emit('settings', Object.assign({}, S, { key: !!ky.value.trim() })); };
    row('Clave API Claude', ky); $('p', 'mut', p, 'Opcional. Con una clave de Anthropic, el director y los companeros IA usan Claude de verdad. Se guarda solo en este navegador. Sin ella el juego usa contenido pregrabado y funciona sin conexion.').style.cssText = 'font-size:.85em;line-height:1.45;margin:.3em 0 .8em';
    const b = $('button', 'btn go', p, 'Listo'); b.onclick = () => { sfx('back'); close(); };
  });
}

/* ================= CREDITOS ================= */
function showCredits() {
  ensure(); const s = mkScr('cred', 'cred'); s.innerHTML = ''; go('cred', { music: 'menu', keys: e => { if (e.key === 'Escape' || e.key === 'Enter') { sfx('back'); showMenu(); return; } return false; } }); bgc(s, 'valle', { dark: .85, n: 50 });
  const r = $('div', 'roll', s); $('h1', '', r, 'RESCATE<br>EN LA CUEVA'); const ln = (a, b) => { $('div', '', r, (a ? '<div class="lab">' + a + '</div>' : '') + '<div>' + b + '</div>'); };
  ln('DISENO Y PROGRAMACION', 'Un equipo de agentes de IA coordinados, dirigidos por una persona'); ln('ARTE', 'Todos los sprites, fondos e ilustraciones estan generados por codigo (CC0)'); ln('MUSICA Y SONIDO', 'Sintetizados en tiempo real con WebAudio, sin muestras'); ln('HISTORIA', 'Cueva inundada: informacion asimetrica, confianza y decisiones bajo presion');
  const cr = window.ASSETS && ASSETS.credits; (cr || []).forEach(c => ln('', esc(c))); ln('FUENTE', 'Press Start 2P (CodeMan38, SIL OFL 1.1)'); ln('RED', 'PeerJS (MIT)'); ln('', 'Gracias por jugar.');
  const b = $('button', 'btn sec rel', s, 'Volver (Esc)'); b.style.cssText = 'position:absolute;top:10px;right:10px;z-index:5'; b.onclick = () => { sfx('back'); showMenu(); };
}

/* ================= API ================= */
const UI = { mount, showMenu, showTutorial, showLobby, lobbyUpdate, showRole, playCinematic, showFinal, showAchievements, openSettings, showCredits, toast, hide, on, emit,
  settings: () => Object.assign({}, S), setLocalId: id => { localId = id; }, gameCanvas: () => document.querySelector('canvas#game') || null, isOpen: () => !!cur, burst, confetti, portrait, icon, trophy,
  unlock(ids) { const g = jget('rcv3_ach', {}); (Array.isArray(ids) ? ids : [ids]).forEach(i => { if (!g[i]) g[i] = Date.now(); }); store.set('rcv3_ach', JSON.stringify(g)); }, achievements: () => jget('rcv3_ach', {}),
  showTitle: showMenu };
UI.api = UI; window.UI = UI;
const st0 = store.get('rcv3_key'); if (st0) try { window.Story && Story.setKey && Story.setKey(st0); } catch (e) { }
})();
