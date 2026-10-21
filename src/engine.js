/* engine.js - Rescate en la Cueva v2. window.Engine. Ver NOTES-engine.md */
(function (global) {
'use strict';
var W = 320, H = 180, T = 16, SECW = 60, NS = 5, LW = 300, LH = 16, PW = 4800, PH = 256, SPW = 960, TAU = Math.PI * 2;
var HW = 4, HH = 12;                       // hitbox: 8x12, origen = centro x / pies y
var START_ROW = [14, 12, 10, 8, 6];        // fila de suelo donde empieza cada seccion
var DARK = [20, 14, 32];

/* ---------- utilidades ---------- */
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function hash(x, y, s) { var h = (x * 374761393 + y * 668265263 + (s | 0) * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function rng(a) { return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function rgb(c, a) { var r = Math.round(c[0]), g = Math.round(c[1]), b = Math.round(c[2]); return a === undefined ? 'rgb(' + r + ',' + g + ',' + b + ')' : 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; }
function hex(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
function approach(v, t, d) { return v < t ? Math.min(v + d, t) : Math.max(v - d, t); }
function canvasOf(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

/* ---------- temas por seccion ---------- */
var THEMES = [
  { rock: [104, 74, 62], rim: [160, 180, 90], amb: [46, 22, 26], crystal: [255, 180, 70], torch: [255, 170, 80] },
  { rock: [64, 82, 100], rim: [170, 226, 236], amb: [6, 30, 46], crystal: [90, 240, 224], torch: [255, 190, 110] },
  { rock: [92, 68, 116], rim: [200, 160, 240], amb: [34, 12, 58], crystal: [214, 110, 255], torch: [255, 170, 130] },
  { rock: [52, 76, 110], rim: [120, 200, 180], amb: [8, 20, 58], crystal: [100, 170, 255], torch: [255, 190, 100] },
  { rock: [120, 60, 82], rim: [250, 160, 120], amb: [58, 14, 34], crystal: [255, 100, 140], torch: [255, 150, 90] }
];
var ROLE_COL = {
  guia: { coat: '#e8743b', trim: '#b8432a', pants: '#3a3550', hair: '#4a2a1c', name: '#ffb070' },
  medica: { coat: '#3fb8af', trim: '#e8f6f4', pants: '#2c4a60', hair: '#20182a', name: '#7ff0e0' },
  ing: { coat: '#4a78c8', trim: '#f2c230', pants: '#5a5a68', hair: '#7a4a24', name: '#ffe070' }
};

/* ---------- fuente 3x5 ---------- */
var FONT = { A: [7,5,7,5,5], B: [6,5,6,5,6], C: [7,4,4,4,7], D: [6,5,5,5,6], E: [7,4,6,4,7], F: [7,4,6,4,4], G: [7,4,5,5,7], H: [5,5,7,5,5], I: [7,2,2,2,7], J: [1,1,1,5,2], K: [5,5,6,5,5], L: [4,4,4,4,7], M: [5,7,7,5,5], N: [7,5,5,5,5], O: [7,5,5,5,7], P: [7,5,7,4,4], Q: [7,5,5,7,1], R: [7,5,6,5,5], S: [7,4,7,1,7], T: [7,2,2,2,2], U: [5,5,5,5,7], V: [5,5,5,5,2], W: [5,5,7,7,5], X: [5,5,2,5,5], Y: [5,5,2,2,2], Z: [7,1,2,4,7],
  '0': [7,5,5,5,7], '1': [2,6,2,2,7], '2': [7,1,7,4,7], '3': [7,1,7,1,7], '4': [5,5,7,1,1], '5': [7,4,7,1,7], '6': [7,4,7,5,7], '7': [7,1,1,1,1], '8': [7,5,7,5,7], '9': [7,5,7,1,7], '!': [2,2,2,0,2], '?': [7,1,2,0,2], '.': [0,0,0,0,2], '-': [0,0,7,0,0], ' ': [0,0,0,0,0] };
function textW(s) { return s.length * 4 - 1; }
function drawText(c, s, x, y, col, outline) {
  s = String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  for (var pass = outline ? 0 : 1; pass < 2; pass++) {
    c.fillStyle = pass ? col : outline;
    for (var i = 0; i < s.length; i++) {
      var g = FONT[s[i]] || FONT['?'];
      for (var r = 0; r < 5; r++) for (var k = 0; k < 3; k++) if (g[r] & (4 >> k)) {
        var px = x + i * 4 + k, py = y + r;
        if (pass) c.fillRect(px, py, 1, 1);
        else { c.fillRect(px - 1, py, 3, 1); c.fillRect(px, py - 1, 1, 3); }
      }
    }
  }
}

/* =====================================================================
   MUNDO (nivel + capas pre-renderizadas). Se construye una sola vez.
   ===================================================================== */
var World = null;
function getWorld() { return World || (World = buildWorld()); }

function buildWorld() {
  var g = new Uint8Array(LW * LH);           // 0 aire, 1 solido, 2 one-way
  var R = rng(1337);
  function inb(c, r) { return c >= 0 && c < LW && r >= 0 && r < LH; }
  function get(c, r) { return inb(c, r) ? g[r * LW + c] : 1; }
  function set(c, r, v) { if (inb(c, r)) g[r * LW + c] = v; }

  // techo irregular, suelo, paredes
  var ceilH = [];
  for (var c = 0; c < LW; c++) {
    var ch = 2 + ((Math.sin(c * 0.37) + Math.sin(c * 0.131 + 2) + Math.sin(c * 0.071 + 5)) > 0.7 ? 1 : 0);
    ceilH[c] = ch; for (var r = 0; r < ch; r++) set(c, r, 1);
    set(c, 14, 1); set(c, 15, 1);
    if (c < 2 || c >= LW - 2) for (r = 0; r < LH; r++) set(c, r, 1);
  }

  // ----- ruta principal por seccion: [fila, largo, hueco, tipo]; 'pin' = pegada al borde derecho
  var ROUTES = [
    [[13,3,6,'p'],[13,4,2,'p'],[12,5,2,'p'],[12,3,3,'s'],[11,4,2,'s'],[12,4,2,'p'],[12,5,3,'s'],[13,3,2,'o'],[12,6,'pin','p']],
    [[12,6,0,'p'],[12,3,3,'s'],[11,4,2,'p'],[10,3,2,'o'],[11,5,2,'p'],[11,3,3,'s'],[12,4,2,'p'],[11,3,2,'o'],[10,4,2,'p'],[10,6,'pin','p']],
    [[10,6,0,'p'],[9,3,3,'s'],[10,4,2,'p'],[9,3,3,'o'],[9,5,2,'p'],[8,3,2,'s'],[9,4,3,'p'],[10,3,2,'o'],[9,4,2,'p'],[8,6,'pin','p']],
    [[8,6,0,'p'],[7,3,3,'s'],[8,4,2,'p'],[7,3,3,'o'],[7,5,2,'p'],[6,3,2,'s'],[7,4,3,'p'],[8,3,2,'o'],[7,4,2,'p'],[6,6,'pin','p']],
    [[6,6,0,'p'],[6,3,3,'s'],[5,4,2,'p'],[6,3,2,'o'],[6,5,2,'p'],[5,3,3,'s'],[6,4,2,'p'],[6,3,3,'o'],[6,2,2,'p'],[6,8,'pin','p']]
  ];
  // ramas extra [fila, col, largo, tipo]
  var EXTRAS = [
    [[10,22,3,'o'],[8,27,3,'s'],[7,32,4,'s'],[8,38,3,'o']],
    [[8,23,2,'o'],[6,26,3,'s'],[5,31,4,'s'],[7,37,3,'o']],
    [[8,6,3,'o'],[6,12,3,'s'],[5,18,4,'s'],[5,24,4,'s']],
    [[11,7,4,'p'],[12,14,4,'s'],[11,20,3,'o'],[13,26,4,'p'],[11,32,4,'s'],[12,38,3,'o'],[11,44,4,'p']],
    [[9,5,4,'p'],[10,12,3,'s'],[9,19,4,'o'],[10,26,4,'p'],[9,33,3,'s'],[10,40,4,'o'],[9,47,4,'p']]
  ];
  var plats = [], mains = [];
  function slab(c, r, l, type, hasPillar) {
    for (var i = 0; i < l; i++) {
      if (type === 'o') { if (get(c + i, r) === 0) set(c + i, r, 2); }
      else set(c + i, r, 1);
    }
    if (type === 's' && l > 2) for (i = 1; i < l - 1; i++) set(c + i, r + 1, 1);
    if (type === 'p') {
      var k = 0;
      for (var rr = r + 1; rr < 14; rr++, k++) {
        var wd = Math.max(1, l - 2 - Math.floor(k / 2)), c0 = c + Math.floor((l - wd) / 2);
        if (rr - r > 5 && (hash(c, rr, 3) < 0.5)) { wd = Math.max(1, wd - 1); c0 = c + Math.floor((l - wd) / 2); }
        for (i = 0; i < wd; i++) set(c0 + i, rr, 1);
      }
    }
  }
  for (var s = 0; s < NS; s++) {
    var pos = 0, off = s * SECW;
    ROUTES[s].forEach(function (p, idx) {
      var st = p[2] === 'pin' ? SECW - p[1] : pos + p[2];
      slab(off + st, p[0], p[1], p[3]);
      var pl = { s: s, c0: off + st, row: p[0], len: p[1], type: p[3], idx: idx }; plats.push(pl); mains.push(pl);
      pos = st + p[1];
    });
    EXTRAS[s].forEach(function (e) {
      var ok = true;
      mains.forEach(function (m) {
        if (m.s !== s) return;
        if (e[1] + off < m.c0 + m.len && e[1] + off + e[2] > m.c0 && e[0] > m.row - 4 && e[0] <= m.row + 1) ok = false;
      });
      if (!ok) { if (global.console) console.warn('extra descartada', s, e); return; }
      slab(off + e[1], e[0], e[2], e[3]);
      plats.push({ s: s, c0: off + e[1], row: e[0], len: e[2], type: e[3], extra: true });
    });
    // escaleras de regreso: cadenas de repisas one-way junto a dos plataformas principales
    [3, 7].forEach(function (mi) {
      var m = mains.filter(function (q) { return q.s === s; })[mi];
      if (!m) return;
      var row = m.row + 2, i = 0;
      if (row > 13) return;
      while (true) {
        var c0 = i % 2 === 0 ? m.c0 - 3 : m.c0 - 8;
        var okc = true; for (var q = 0; q < 3; q++) if (get(c0 + q, row) !== 0 || get(c0 + q, row - 1) !== 0) okc = false;
        if (okc) { for (q = 0; q < 3; q++) set(c0 + q, row, 2); plats.push({ s: s, c0: c0, row: row, len: 3, type: 'o', ladder: true }); }
        if (row >= 12) break;
        row += 2; i++;
      }
    });
  }
  // foso del puente (seccion 2): lo cruza solo quien tenga puente (ingeniero)
  for (c = 2 * 0 + SECW + 36; c <= SECW + 48; c++) for (r = 3; r <= 13; r++) set(c, r, 0);
  // bultos de suelo (estalagmitas solidas)
  for (c = 4; c < LW - 4; c++) if (get(c, 13) === 0 && get(c, 12) === 0 && hash(c, 9, 4) < 0.09 && plats.every(function (p) { return p.type === 'o' || Math.abs(p.c0 + p.len / 2 - c) > 5 || p.row < 11; })) {
    set(c, 13, 1); if (hash(c, 9, 5) < 0.4 && get(c + 1, 13) === 0) set(c + 1, 13, 1);
  }

  var Wd = { g: g, plats: plats, mains: mains, zones: [], ropes: [], torches: [], crystals: [], shrooms: [], puddles: [], stals: [], shafts: [], props: [], glints: [] };
  function platOf(s, i) { return mains.filter(function (p) { return p.s === s; })[i]; }

  // zonas: radio en cada seccion, Lia al fondo
  for (s = 0; s < NS; s++) {
    var zp = platOf(s, 2);
    Wd.zones.push({ id: 'zone' + (s + 1), s: s, x: (zp.c0 + zp.len / 2) * T, y: zp.row * T, r: 22 });
  }
  var lp = platOf(4, 9);
  Wd.gates = [
    { id: 'wall3', type: 'wall', c0: 2 * SECW + 31, c1: 2 * SECW + 32, r0: 4, r1: 13, keep: 9 },
    { id: 'bridge2', type: 'bridge', c0: SECW + 36, c1: SECW + 48, row: 11 },
    { id: 'barrier4', type: 'barrier', c0: 3 * SECW + 31, c1: 3 * SECW + 32, r0: 3, r1: 13 }
  ];
  Wd.zones.push({ id: 'bridge2', s: 1, x: (SECW + 36) * T - 6, y: 11 * T, r: 20, role: 'ing' });
  var mp = platOf(3, 4);
  Wd.zones.push({ id: 'med4', s: 3, x: (mp.c0 + 1.5) * T, y: mp.row * T, r: 20, role: 'medica' });
  Wd.lia = { id: 'lia', x: (lp.c0 + 5) * T, y: lp.row * T, r: 26 };
  Wd.zones.push({ id: 'lia', s: 4, x: Wd.lia.x, y: Wd.lia.y, r: 26, lia: true });
  // cuerdas desde el techo hasta un punto junto a ramas altas
  [[0, 36, 8], [1, 30, 7], [2, 19, 6], [3, 19, 8], [4, 31, 9]].forEach(function (a) {
    var cc = a[0] * SECW + a[1];
    Wd.ropes.push({ x: cc * T + 8, y0: ceilH[cc] * T - 2, y1: a[2] * T + 2, ph: a[1] });
  });
  // antorchas sobre la ruta principal
  [[0,1],[0,5],[0,8],[1,1],[1,5],[1,8],[2,1],[2,4],[2,8],[3,1],[3,5],[3,8],[4,1],[4,4],[4,7],[4,9]].forEach(function (a) {
    var p = platOf(a[0], a[1]); if (!p) return;
    Wd.torches.push({ x: (p.c0 + (p.len > 3 ? 1 : 0.5)) * T + 8, y: p.row * T, s: p.s, ph: R() * 6 });
  });
  Wd.torches.push({ x: 3 * T + 8, y: 14 * T, s: 0, ph: 1 });
  Wd.torches.push({ x: 10 * T + 8, y: 14 * T, s: 0, ph: 2 });
  // superficies: cristales, setas, puestos, estalactitas, charcos
  for (var cx = 2; cx < LW - 2; cx++) {
    var sec = Math.min(NS - 1, Math.floor(cx / SECW));
    for (var ry = 2; ry < 15; ry++) {
      var t0 = get(cx, ry);
      if (t0 !== 1 && t0 !== 2) continue;
      var above = get(cx, ry - 1), below = get(cx, ry + 1);
      var hh = hash(cx, ry, 11);
      if (above === 0 && t0 === 1) {
        if (hh < 0.075) Wd.crystals.push({ x: cx * T + 3 + (hash(cx, ry, 12) * 10 | 0), y: ry * T, s: sec, sz: 5 + (hash(cx, ry, 13) * 8 | 0), seed: cx * 31 + ry });
        else if (hh < 0.125) Wd.shrooms.push({ x: cx * T + 4 + (hash(cx, ry, 14) * 8 | 0), y: ry * T, s: sec, seed: cx * 7 + ry });
        else if (ry === 14 && hh < 0.28) { var pw = 2 + (hash(cx, ry, 15) * 3 | 0); Wd.puddles.push({ x: cx * T, y: ry * T, w: pw * T, s: sec }); cx += pw; break; }
        else if (hh < 0.2) Wd.props.push({ t: 'rubble', x: cx * T + (hash(cx, ry, 16) * 12 | 0), y: ry * T, s: sec });
      }
      if (below === 0 && t0 === 1 && hash(cx, ry, 17) < 0.3) {
        var len = 1 + (hash(cx, ry, 18) * 3 | 0);
        Wd.stals.push({ x: cx * T + 8, y: (ry + 1) * T, len: len * T - 4, s: sec, drip: len > 1 && hash(cx, ry, 19) < 0.55, ph: hash(cx, ry, 20) * 400 });
      }
    }
  }
  // props junto a zonas
  for (s = 0; s < NS; s += 2) { var bp = platOf(s, 3); Wd.props.push({ t: 'crate', x: (bp.c0 + 1) * T + 8, y: bp.row * T, s: s }); }
  // rayos de luz desde grietas del techo
  for (s = 0; s < NS; s++) [14, 38].forEach(function (a, i) { Wd.shafts.push({ x: (s * SECW + a + i * 3) * T, w: 26 + R() * 18, s: s, ph: R() * 6 }); });
  Wd.ceilH = ceilH;

  buildTiles(Wd);
  buildBgLayers(Wd);
  return Wd;
}

/* ---------- columnas de tema (mezcla suave en fronteras) ---------- */
function themeCols() {
  var out = new Array(PW);
  for (var x = 0; x < PW; x++) {
    var i = Math.min(NS - 1, Math.floor(x / SPW)), w = 0, j = i;
    var d = x - (i + 1) * SPW;
    if (i < NS - 1 && d > -56) { w = smooth((d + 56) / 112); j = i + 1; }
    else if (i > 0 && x - i * SPW < 56) { w = smooth(1 - (x - i * SPW + 56) / 112); j = i - 1; }
    out[x] = { rock: mix(THEMES[i].rock, THEMES[j].rock, w), rim: mix(THEMES[i].rim, THEMES[j].rim, w), cry: mix(THEMES[i].crystal, THEMES[j].crystal, w) };
  }
  return out;
}

/* ---------- roca con bordes organicos (mascara a nivel de pixel) ---------- */
function buildTiles(Wd) {
  var g = Wd.g, tc = themeCols();
  var m = new Uint8Array(PW * PH);
  var x, y, i, tx, ty;
  for (ty = 0; ty < LH; ty++) for (tx = 0; tx < LW; tx++) if (g[ty * LW + tx] === 1)
    for (y = 0; y < T; y++) { var o = (ty * T + y) * PW + tx * T; for (x = 0; x < T; x++) m[o + x] = 1; }
  function gt(a, b) { return a < 0 || b < 0 || a >= LW || b >= LH ? 1 : (g[b * LW + a] === 1 ? 1 : 0); }
  for (var pass = 0; pass < 2; pass++) {
    var n = new Uint8Array(m);
    for (ty = 0; ty < LH; ty++) for (tx = 0; tx < LW; tx++) {
      var me = gt(tx, ty), uni = true;
      for (var dy = -1; dy <= 1 && uni; dy++) for (var dx = -1; dx <= 1; dx++) if (gt(tx + dx, ty + dy) !== me) { uni = false; break; }
      if (uni) continue;
      for (y = 0; y < T; y++) for (x = 0; x < T; x++) {
        var px = tx * T + x, py = ty * T + y;
        if (px < 1 || py < 1 || px >= PW - 1 || py >= PH - 1) continue;
        i = py * PW + px;
        var cnt = m[i - 1] + m[i + 1] + m[i - PW] + m[i + PW] + m[i - PW - 1] + m[i - PW + 1] + m[i + PW - 1] + m[i + PW + 1];
        var hv = hash(px, py, 40 + pass);
        if (m[i]) { if (cnt <= 4 && hv < 0.5) n[i] = 0; else if (cnt <= 5 && hv < 0.2) n[i] = 0; }
        else { if (cnt >= 4 && hv < 0.5) n[i] = 1; else if (cnt >= 3 && hv < 0.25) n[i] = 1; }
      }
    }
    m = n;
  }
  // distancias a aire en 4 direcciones
  var dU = new Uint8Array(PW * PH), dD = new Uint8Array(PW * PH), dL = new Uint8Array(PW * PH), dR = new Uint8Array(PW * PH);
  for (x = 0; x < PW; x++) { var run = 255; for (y = 0; y < PH; y++) { i = y * PW + x; run = m[i] ? Math.min(run + 1, 254) : 0; if (y === 0 && m[i]) run = 255; dU[i] = run; }
    run = 255; for (y = PH - 1; y >= 0; y--) { i = y * PW + x; run = m[i] ? Math.min(run + 1, 254) : 0; if (y === PH - 1 && m[i]) run = 255; dD[i] = run; } }
  for (y = 0; y < PH; y++) { var rr = 255; for (x = 0; x < PW; x++) { i = y * PW + x; rr = m[i] ? Math.min(rr + 1, 254) : 0; if (x === 0 && m[i]) rr = 255; dL[i] = rr; }
    rr = 255; for (x = PW - 1; x >= 0; x--) { i = y * PW + x; rr = m[i] ? Math.min(rr + 1, 254) : 0; if (x === PW - 1 && m[i]) rr = 255; dR[i] = rr; } }
  var cv = canvasOf(PW, PH), cx = cv.getContext('2d'), img = cx.createImageData(PW, PH), d = img.data;
  var OUT = DARK;
  for (y = 0; y < PH; y++) for (x = 0; x < PW; x++) {
    i = y * PW + x; if (!m[i]) continue;
    var th = tc[x], e = Math.min(dU[i], dD[i], dL[i], dR[i]), col;
    var base = th.rock;
    var strata = Math.sin(y * 0.42 + Math.sin(x * 0.05) * 3 + Math.sin(x * 0.013) * 5) > 0.82 ? 1.1 : 1;
    var nz = 0.9 + hash(x >> 1, y >> 1, 7) * 0.2;
    var k = strata * nz;
    if (dL[i] === 2 || dL[i] === 3) k *= 1.12;
    if (dD[i] === 2) k *= 0.78;
    if (dR[i] === 2) k *= 0.85;
    var ao = e > 5 ? clamp(1 - (e - 5) * 0.02, 0.55, 1) : 1; k *= ao;
    col = [base[0] * k, base[1] * k, base[2] * k];
    if (dU[i] === 2) col = mix(th.rim, col, hash(x, y, 8) < 0.2 ? 0.3 : 0.05);
    else if (dU[i] === 3 && hash(x >> 1, y, 9) < 0.7) col = mix(th.rim, col, 0.5);
    else if (dU[i] === 4 && hash(x >> 2, 4, 10) < 0.3) col = mix(th.rim, col, 0.7);
    else if (hash(x, y, 21) < 0.006) col = mix(th.cry, col, 0.2);
    if (e === 1) col = mix(OUT, col, dU[i] === 1 ? 0.15 : 0.2);
    var o4 = i * 4; d[o4] = col[0]; d[o4 + 1] = col[1]; d[o4 + 2] = col[2]; d[o4 + 3] = 255;
  }
  cx.putImageData(img, 0, 0);
  // repisas one-way: tablones con soportes
  for (ty = 0; ty < LH; ty++) for (tx = 0; tx < LW; tx++) if (g[ty * LW + tx] === 2) {
    var x0 = tx * T, y0 = ty * T, left = g[ty * LW + tx - 1] !== 2, right = g[ty * LW + tx + 1] !== 2;
    cx.fillStyle = '#1b1220'; cx.fillRect(x0 - (left ? 1 : 0), y0 - 1, T + (left ? 1 : 0) + (right ? 1 : 0), 7);
    cx.fillStyle = '#8a5a3a'; cx.fillRect(x0, y0, T, 5);
    cx.fillStyle = '#b57c4a'; cx.fillRect(x0, y0, T, 1);
    cx.fillStyle = '#5a3a2a'; cx.fillRect(x0, y0 + 4, T, 1);
    cx.fillStyle = '#3d2620'; cx.fillRect(x0 + 7, y0 + 1, 1, 4);
    cx.fillStyle = '#d6b07a'; cx.fillRect(x0 + 2, y0 + 2, 1, 1); cx.fillRect(x0 + 12, y0 + 2, 1, 1);
    if (left || right) { cx.fillStyle = '#1b1220'; cx.fillRect(x0 + (left ? 1 : 12), y0 + 5, 3, 4); cx.fillStyle = '#6a4630'; cx.fillRect(x0 + (left ? 2 : 13), y0 + 5, 1, 3); }
  }
  Wd.tiles = cv;

  // ---------- decoracion estatica ----------
  var dv = canvasOf(PW, PH), dc = dv.getContext('2d');
  Wd.stals.forEach(function (st) { var th = tc[Math.min(PW - 1, st.x | 0)]; drawStalactite(dc, st.x, st.y - 2, st.len, th.rock); });
  Wd.puddles.forEach(function (p) {
    dc.fillStyle = '#12182e'; dc.fillRect(p.x + 1, p.y - 1, p.w - 2, 2);
    dc.fillStyle = 'rgba(80,150,210,0.7)'; dc.fillRect(p.x + 2, p.y - 1, p.w - 4, 1);
  });
  Wd.crystals.forEach(function (c) { var rr = rng(c.seed); drawCrystal(dc, c.x, c.y, c.sz, THEMES[c.s].crystal, rr); });
  Wd.shrooms.forEach(function (sh) { drawShroom(dc, sh.x, sh.y, THEMES[sh.s].crystal, sh.s); });
  Wd.props.forEach(function (p) {
    if (p.t === 'rubble') { var r2 = rng(p.x * 13 + p.y); for (var q = 0; q < 4; q++) { var rx = p.x + (r2() * 10 | 0) - 5, rw = 1 + (r2() * 3 | 0); dc.fillStyle = '#1b1426'; dc.fillRect(rx - 1, p.y - rw - 1, rw + 2, rw + 1); dc.fillStyle = rgb(mix(THEMES[p.s].rock, [200, 190, 190], 0.15)); dc.fillRect(rx, p.y - rw, rw, rw); } }
  });
  Wd.decor = dv;
}

function drawStalactite(c, x, y, len, rock) {
  var wmax = len > 20 ? 7 : 5;
  for (var j = 0; j < len; j++) {
    var f = 1 - j / len, hw = Math.max(0, Math.round(wmax * 0.5 * Math.pow(f, 0.8)));
    c.fillStyle = '#1b1426'; c.fillRect(x - hw - 1, y + j, hw * 2 + 3, 1);
    c.fillStyle = rgb(mix(rock, DARK, 0.1 + j / len * 0.25));
    c.fillRect(x - hw, y + j, hw * 2 + 1, 1);
    c.fillStyle = rgb(mix(rock, [255, 255, 255], 0.15)); c.fillRect(x - hw, y + j, 1, 1);
  }
  c.fillStyle = '#1b1426'; c.fillRect(x, y + len, 1, 1);
}
function drawCrystal(c, x, y, sz, col, rr) {
  var n = 2 + (rr() * 3 | 0), dark = mix(col, DARK, 0.55), light = mix(col, [255, 255, 255], 0.55), body = mix(col, DARK, 0.15);
  for (var pass = 0; pass < 2; pass++) for (var i = 0; i < n; i++) {
    var dx = Math.round((i - (n - 1) / 2) * 3 + (rr() * 2 - 1)), h = Math.max(4, Math.round(sz * (0.55 + rr() * 0.7))), w = h > 8 ? 4 : 3;
    for (var yy = 0; yy < h; yy++) {
      var wid = Math.max(1, Math.round(w * (1 - yy / h) + 0.4)), x0 = x + dx - (wid >> 1);
      if (pass === 0) { c.fillStyle = '#12101e'; c.fillRect(x0 - 1, y - yy - 1, wid + 2, 1); if (yy === h - 1) c.fillRect(x0, y - yy - 2, wid, 1); }
      else { c.fillStyle = rgb(yy > h * 0.7 ? light : body); c.fillRect(x0, y - yy - 1, wid, 1); c.fillStyle = rgb(mix(col, [255, 255, 255], 0.25 + 0.2 * (yy / h))); c.fillRect(x0, y - yy - 1, 1, 1); if (wid > 2) { c.fillStyle = rgb(dark); c.fillRect(x0 + wid - 1, y - yy - 1, 1, 1); } }
    }
  }
}
function drawShroom(c, x, y, col, s) {
  var cap = mix(col, [255, 255, 255], 0.15), dk = mix(col, DARK, 0.6);
  c.fillStyle = '#12101e'; c.fillRect(x - 3, y - 6, 7, 3); c.fillRect(x - 1, y - 4, 3, 4);
  c.fillStyle = '#d8cdb8'; c.fillRect(x, y - 4, 1, 4);
  c.fillStyle = rgb(dk); c.fillRect(x - 2, y - 4, 5, 1);
  c.fillStyle = rgb(cap); c.fillRect(x - 2, y - 5, 5, 1); c.fillRect(x - 1, y - 6, 3, 1);
  c.fillStyle = '#fff'; c.fillRect(x - 1, y - 5, 1, 1);
}

/* ---------- capas parallax (periodo 640) ---------- */
function buildBgLayers(Wd) {
  Wd.bg = [];
  for (var ti = 0; ti < NS; ti++) {
    var th = THEMES[ti], R = rng(500 + ti), P = 640, out = [];
    function ridge(c, col, rim, top, base, amp, per1, per2, ph, spikes) {
      for (var x = 0; x < P; x++) {
        var a = Math.abs(((x + ph) % per1) / per1 * 2 - 1), b = Math.abs(((x + ph * 2) % per2) / per2 * 2 - 1);
        var h = base + amp * (Math.pow(1 - a, 1.4) * 0.7 + Math.pow(1 - b, 1.6) * 0.5) + (spikes ? 0 : 6 * Math.sin(x / P * TAU * 3));
        h = Math.round(h);
        if (top) { c.fillStyle = col; c.fillRect(x, 0, 1, h); c.fillStyle = rim; c.fillRect(x, h - 1, 1, 1); }
        else { c.fillStyle = col; c.fillRect(x, 260 - h, 1, h); c.fillStyle = rim; c.fillRect(x, 260 - h, 1, 1); }
      }
    }
    var far = canvasOf(P, 260), fc = far.getContext('2d');
    var cFar = rgb(mix([30, 26, 56], th.amb, 0.25)), rFar = rgb(mix([54, 48, 90], th.rim, 0.12));
    ridge(fc, cFar, rFar, true, 18, 56, 128, 160, 20, true);
    ridge(fc, cFar, rFar, false, 22, 46, 160, 80, 55, true);
    // luciernagas / liquen lejano
    for (var q = 0; q < 46; q++) { fc.fillStyle = rgb(th.crystal, 0.35 + R() * 0.4); fc.fillRect(R() * P | 0, 40 + R() * 150 | 0, 1, 1); }
    var mid = canvasOf(P, 260), mc = mid.getContext('2d');
    var cMid = rgb(mix([42, 36, 74], th.amb, 0.3)), rMid = rgb(mix([78, 68, 116], th.rim, 0.2));
    // pilares
    var pil = 5;
    for (q = 0; q < pil; q++) {
      var px = q * (P / pil) + (R() * 30 | 0), pw = 16 + (R() * 18 | 0), bulge = 4 + (R() * 6 | 0);
      for (var y = 0; y < 260; y++) {
        var wv = pw + Math.round(Math.sin(y * 0.07 + q) * 3 + bulge * Math.pow(Math.abs(y - 130) / 130, 2));
        mc.fillStyle = cMid; mc.fillRect(px - (wv >> 1), y, wv, 1);
        mc.fillStyle = rMid; mc.fillRect(px - (wv >> 1), y, 2, 1);
        mc.fillStyle = rgb(mix([20, 16, 40], th.amb, 0.5)); mc.fillRect(px + (wv >> 1) - 2, y, 2, 1);
      }
    }
    ridge(mc, cMid, rMid, true, 10, 46, 80, 64, 10, true);
    ridge(mc, cMid, rMid, false, 14, 36, 64, 128, 40, true);
    for (q = 0; q < 30; q++) { var cx0 = R() * P | 0, cy0 = 150 + R() * 100 | 0; mc.fillStyle = rgb(th.crystal, 0.9); mc.fillRect(cx0, cy0, 1, 3); mc.fillRect(cx0 + 1, cy0 + 1, 1, 2); }
    var near = canvasOf(P, 260), nc = near.getContext('2d');
    ridge(nc, rgb(mix([16, 12, 30], th.amb, 0.35)), rgb(mix([46, 38, 70], th.rim, 0.2)), true, 4, 38, 64, 32, 7, true);
    ridge(nc, rgb(mix([16, 12, 30], th.amb, 0.35)), rgb(mix([46, 38, 70], th.rim, 0.2)), false, 10, 26, 80, 40, 30, true);
    // raices/lianas colgantes
    for (q = 0; q < 14; q++) { var vx = R() * P | 0, vl = 14 + R() * 50 | 0; nc.fillStyle = rgb(mix(th.rim, [10, 10, 20], 0.7)); for (y = 0; y < vl; y++) nc.fillRect(vx + Math.round(Math.sin(y * 0.2 + q) * 1.2), 30 + y, 1, 1); }
    out = [far, mid, near]; Wd.bg.push(out);
  }
  // primer plano oscuro (periodo 640, alto 56)
  var fg = canvasOf(640, 56), gc = fg.getContext('2d'), R2 = rng(77);
  for (var x = 0; x < 640; x += 1) {
    var h2 = Math.max(0, Math.sin(x * TAU / 128 * 1) * 10 + Math.sin(x * TAU / 80) * 8 - 6);
    if (h2 > 0) { gc.fillStyle = '#0c0a16'; gc.fillRect(x, 56 - h2, 1, h2); }
  }
  for (x = 0; x < 640; x += 3) if (R2() < 0.4) { var bl = 4 + R2() * 12; gc.fillStyle = '#0c0a16'; gc.fillRect(x, 56 - 8 - bl, 1, bl + 8); }
  Wd.fg = fg;
  // vineta
  var vg = canvasOf(W, H), vc = vg.getContext('2d'), gr = vc.createRadialGradient(W / 2, H / 2, 70, W / 2, H / 2, 200);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(6,4,14,0.62)'); vc.fillStyle = gr; vc.fillRect(0, 0, W, H);
  Wd.vig = vg;
}

/* =====================================================================
   INSTANCIA
   ===================================================================== */
function waterY(level) { return 250 - level * 1.75; }
var NOINP = { left: 0, right: 0, jump: 0, interact: 0, up: 0, down: 0 };

function create(canvas, opts) {
  opts = opts || {};
  var wd = getWorld(), g = wd.g;
  canvas.width = W; canvas.height = H;
  canvas.style.imageRendering = 'pixelated';
  var out = canvas.getContext('2d'); out.imageSmoothingEnabled = false;
  var sc = canvasOf(W, H).getContext('2d'); sc.imageSmoothingEnabled = false; var scv = sc.canvas;
  var dk = canvasOf(W, H).getContext('2d'); var dkv = dk.canvas;
  var authority = opts.authority !== false;
  var assets = opts.assets || global.ASSETS || null;
  var localId = null;
  var ROLES = ['guia', 'medica', 'ing'], NAMES = { guia: 'Nico', medica: 'Dra. Ona', ing: 'Ivan' };
  var active = ROLES.indexOf(opts.localId) >= 0 ? opts.localId : 'guia', follow = {}, followSet = {};
  var dyn = new Uint8Array(LW * LH), gate = { wall3: 0, bridge2: 0, barrier4: 0 }, bridgeN = 0, bodiesInit = false;
  var bodies = {}, inputs = {}, parts = [], ripples = [], tick = 0, acc = 0, running = false, raf = 0, last = 0;
  var wlCur = opts.water !== undefined ? opts.water : 10, wlTarget = wlCur;
  var shake = 0, flash = 0, flashCol = '255,240,200';
  var cam = { x: 0, y: 0, panT: 0, panX: 0, mode: 'follow', fx: 0, fy: 0 };
  var rr = rng(99), self = {};
  var imgs = {};

  // --- carga de sprites reales (fallback procedural si faltan) ---
  function loadImg(name) {
    if (!assets || !assets.images || !assets.images[name] || imgs[name]) return;
    var im = new Image(); im.onload = function () { im.ok = true; }; im.src = assets.images[name]; imgs[name] = im;
  }
  ['player_guia', 'player_medica', 'player_ing', 'lia', 'props'].forEach(loadImg);
  function sheet(name) { var im = imgs[name]; return im && im.ok && assets.meta && assets.meta[name] ? im : null; }

  function st() { return opts.getState ? opts.getState() : null; }
  function spawnOf(s, k) { var row = START_ROW[s]; return { x: s * SPW + (s === 0 ? 40 : 28) + (k || 0) * 16, y: row * T }; }

  function addBody(id, role, name, k) {
    var sp = spawnOf(0, k);
    var b = bodies[id] = { id: id, role: role || 'guia', name: name || id, x: sp.x, y: sp.y, vx: 0, vy: 0, face: 1, anim: 'idle', grounded: true, coyote: 0, buf: 0, pj: false, pi: false, jumping: false, climb: null, drop: 0, sx: 1, sy: 1, fr: 0, interT: 0, safeX: sp.x, safeY: sp.y, wasW: false, swimCd: 0, tx: sp.x, ty: sp.y, ph: k * 5, lantern: 1 };
    return b;
  }
  function syncBodies() {
    var s = st(); if (!s || !s.players) return;
    ROLES.forEach(function (id) {
      var p = s.players[id]; if (!p) return;
      if (!bodies[id].synced && isFinite(p.x) && isFinite(p.y) && (p.x || p.y)) { bodies[id].x = p.x; bodies[id].y = p.y; }
      bodies[id].synced = true; bodies[id].name = p.name || bodies[id].name;
    });
  }
  ROLES.forEach(function (r, i) { addBody(r, r, NAMES[r], i); bodies[r].manual = true; });
  function writeBack() {
    var s = st(); if (!s || !s.players) return;
    Object.keys(bodies).forEach(function (id) {
      var p = s.players[id], b = bodies[id]; if (!p) return;
      p.x = Math.round(b.x * 100) / 100; p.y = Math.round(b.y * 100) / 100; p.vx = Math.round(b.vx * 100) / 100; p.vy = Math.round(b.vy * 100) / 100; p.face = b.face; p.anim = b.exAnim || b.anim;
    });
  }

  /* ---------- colisiones ---------- */
  function tileAt(tx, ty) { if (tx < 0 || tx >= LW || ty < 0 || ty >= LH) return 1; var d = dyn[ty * LW + tx]; return d === 1 ? 1 : (g[ty * LW + tx] || d); }
  function hit(x, y) {
    var x0 = Math.floor((x - HW) / T), x1 = Math.floor((x + HW - 0.001) / T), y0 = Math.floor((y - HH) / T), y1 = Math.floor((y - 0.001) / T);
    for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) if (tileAt(tx, ty) === 1) return true;
    return false;
  }
  function oneWay(x, ny, oldY, b) {
    if (b.drop > 0) return false;
    var ry = Math.floor(ny / T); if (ny <= ry * T || oldY > ry * T + 0.01) return false;
    var x0 = Math.floor((x - HW) / T), x1 = Math.floor((x + HW - 0.001) / T);
    for (var tx = x0; tx <= x1; tx++) if (tileAt(tx, ry) === 2) return true;
    return false;
  }
  function supported(b) { return hit(b.x, b.y + 0.5) || oneWay(b.x, b.y + 0.5, b.y, b); }

  function moveX(b) {
    var n = Math.ceil(Math.abs(b.vx)); if (!n) return; var s = b.vx / n;
    for (var i = 0; i < n; i++) {
      var nx = b.x + s; if (!hit(nx, b.y)) { b.x = nx; continue; }
      var ok = false;
      for (var d = 1; d <= 4; d++) if (!hit(nx, b.y - d) && !hit(b.x, b.y - d)) { b.x = nx; b.y -= d; ok = true; break; }   // correccion de esquina horizontal
      if (!ok) { b.vx = 0; break; }
    }
  }
  function moveY(b) {
    var n = Math.ceil(Math.abs(b.vy)); if (!n) return; var s = b.vy / n;
    for (var i = 0; i < n; i++) {
      var ny = b.y + s;
      if (s > 0) {
        if (hit(b.x, ny) || oneWay(b.x, ny, b.y, b)) { b.y = Math.floor(ny / T) * T; b.vy = 0; break; }
        b.y = ny;
      } else {
        if (!hit(b.x, ny)) { b.y = ny; continue; }
        var ok = false;
        for (var k = 1; k <= 4 && !ok; k++) for (var sg = -1; sg <= 1; sg += 2) if (!hit(b.x + sg * k, ny)) { b.x += sg * k; b.y = ny; ok = true; break; }   // corner correction al techo
        if (!ok) { b.y = (Math.floor((ny - HH) / T) + 1) * T + HH; b.vy = 0; b.jumping = false; break; }
      }
    }
  }
  function ropeAt(b) {
    for (var i = 0; i < wd.ropes.length; i++) { var r = wd.ropes[i]; if (Math.abs(b.x - r.x) < 6 && b.y - 6 > r.y0 && b.y - 6 < r.y1) return r; }
    return null;
  }

  /* ---------- fisica de un jugador (un tick a 1/60) ---------- */
  function sfx(n, b) { if (opts.onSfx) opts.onSfx(n, b ? b.id : null); }
  function tickBody(b) {
    var inp = follow[b.id] && b.id !== active ? followInput(b) : (inputs[b.id] || NOINP);
    var dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    var jp = inp.jump && !b.pj; b.pj = !!inp.jump;
    var ip = inp.interact && !b.pi; b.pi = !!inp.interact;
    if (jp) b.buf = 6; else if (b.buf > 0) b.buf--;
    if (b.drop > 0) b.drop--;
    if (b.swimCd > 0) b.swimCd--;
    b.sx = approach(b.sx, 1, 0.06); b.sy = approach(b.sy, 1, 0.06);
    var wy = waterY(wlCur), inW = (b.y - 5) > wy;
    if (inW !== b.wasW) { addRipple(b.x, 2.5); splash(b.x, wy, Math.min(10, 4 + Math.abs(b.vy) * 2), b.vy); sfx('splash', b); b.wasW = inW; }
    // cuerdas
    if (!b.climb) { var rp = ropeAt(b); if (rp && (inp.up || (inp.down && !b.grounded))) { b.climb = rp; b.vx = b.vy = 0; b.jumping = false; } }
    if (b.climb) {
      var r = b.climb, dv = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
      b.x += (r.x - b.x) * 0.35; b.y += dv * (dv < 0 ? (b.role === 'guia' ? 1.25 : 0.9) : 1.5); b.vx = b.vy = 0;
      if (dir) b.face = dir;
      if (b.y - 8 < r.y0) b.y = r.y0 + 8;
      if (jp) { b.climb = null; b.vy = -4.8; b.vx = dir * 1.5; b.jumping = true; sfx('jump', b); }
      else if (b.y - 6 > r.y1) { b.climb = null; }
      b.anim = 'jump'; b.exAnim = Math.abs(dv) ? 'run' : 'idle'; b.fr += Math.abs(dv) ? 1 : 0; b.cl = 1;
      b.grounded = false; return;
    }
    b.cl = 0;
    var onG = b.grounded, wdir = 0;
    if (b.role === 'guia' && !inW) {                       // habilidad guia: escalada de pared + salto de pared
      if (onG) b.stam = 150;
      if (hit(b.x + 1.5, b.y - 2)) wdir = 1; else if (hit(b.x - 1.5, b.y - 2)) wdir = -1;
      if (wdir && (dir === wdir || inp.up) && !onG || (wdir && inp.up)) {
        if (inp.up && b.stam > 0) {
          b.stam--; b.vx = 0; b.vy = -0.85; b.face = wdir; b.cl = 2; b.wall = 8; moveY(b); b.grounded = false; b.anim = 'jump'; b.exAnim = 'run'; b.fr++;
          if (!hit(b.x + wdir * 1.5, b.y - 9)) { b.vy = -3; b.vx = wdir * 1.4; }      // remata el borde
          if (jp) { b.vx = -wdir * 2.4; b.vy = -5.2; b.stam -= 20; b.face = -wdir; b.jumping = true; sfx('jump', b); puff(b.x, b.y, 3, 0); }
          return;
        }
        if (dir === wdir && b.vy > 1.2) b.vy = 1.2;     // deslizar
      }
      if (wdir) b.wall = 6; else if (b.wall > 0) b.wall--;
      if (jp && !onG && b.wall > 0 && b.coyote <= 0 && (wdir || b.wall > 0) && b.wdirLast) { b.vx = -b.wdirLast * 2.4; b.vy = -5.2; b.face = -b.wdirLast; b.jumping = true; b.wall = 0; b.buf = 0; sfx('jump', b); puff(b.x, b.y, 3, 0); }
      if (wdir) b.wdirLast = wdir;
    }
    if (onG) b.coyote = 6; else if (b.coyote > 0) b.coyote--;
    var max = inW ? 0.95 : 1.7, a = onG ? 0.26 : 0.17;
    if (inW) a = 0.09;
    if (dir) {
      if (Math.abs(b.vx) > max && Math.sign(b.vx) === dir) b.vx = approach(b.vx, dir * max, 0.07);
      else { var ac = (b.vx * dir < 0) ? a * 2.2 : a; b.vx = approach(b.vx, dir * max, ac); }
      if (onG && b.vx * dir < -0.8 && tick % 3 === 0) puff(b.x, b.y, 1, -dir);        // derrape
      b.face = dir;
    } else b.vx = approach(b.vx, 0, onG ? 0.32 : (inW ? 0.05 : 0.05));
    // gravedad / nado
    if (inW) {
      b.vy = approach(b.vy, 1.0, 0.05);
      if (jp && b.swimCd === 0) {
        var nearTop = (b.y - HH) - wy < 8;
        b.vy = nearTop ? -4.7 : -2.4; b.swimCd = 10; addRipple(b.x, 1.4); bubbles(b.x, b.y - 8, 3); sfx('swim', b);
      } else if (inp.jump) b.vy = Math.max(b.vy - 0.13, -1.7);
    } else {
      var gr = 0.3;
      if (b.vy < 0 && !inp.jump) gr = 0.55;
      else if (Math.abs(b.vy) < 0.9 && inp.jump) gr *= 0.5;                 // flotar en el pico, como Celeste
      b.vy = Math.min(b.vy + gr, inp.down ? 8 : 6.2);
      if (b.jumping && !inp.jump && b.vy < -1.5) { b.vy *= 0.5; b.jumping = false; }   // salto variable
    }
    if (b.buf > 0 && b.coyote > 0 && !inW) {
      b.vy = -5.8; b.vx += dir * 0.3; b.buf = 0; b.coyote = 0; b.jumping = true; b.sx = 0.75; b.sy = 1.25; puff(b.x, b.y, 4, 0); sfx('jump', b);
    }
    if (inp.down && onG && b.drop === 0 && tileAt(Math.floor(b.x / T), Math.floor((b.y + 1) / T)) === 2) { b.drop = 10; b.y += 1; }
    var vyBefore = b.vy;
    moveX(b); moveY(b);
    var gnow = supported(b);
    if (gnow && !b.grounded && vyBefore > 1) {
      b.sx = 1.3; b.sy = 0.7; puff(b.x, b.y, vyBefore > 4 ? 6 : 3, 0); sfx('land', b);
      if (vyBefore > 5.5) addShake(1.5);
    }
    b.grounded = gnow; if (gnow) b.jumping = false;
    if (gnow && hit(b.x, b.y + 0.5)) { b.safeX = b.x; b.safeY = b.y; }
    if (b.grounded && dir && Math.abs(b.vx) > 1 && tick % 9 === 0) { puff(b.x, b.y, 1, -dir); if (tick % 18 === 0) sfx('step', b); }
    if (b.y > PH + 40 || b.x < 0 || b.x > PW) { b.x = b.safeX; b.y = b.safeY; b.vx = b.vy = 0; }
    // interaccion
    if (b.interT > 0) b.interT--;
    var z = zoneNear(b);
    if (z && z.role && z.role !== b.role) z = z.id === 'lia' ? z : null;
    if (b.role === 'medica' && inp.interact && z && (z.id === 'med4' || z.id === 'lia') && b.grounded && !(z.id === 'med4' && gate.barrier4)) {   // curar: accion larga
      b.holdT = (b.holdT || 0) + 1; b.interT = 3; b.holdZ = z;
      if (b.holdT % 12 === 0) spark(z.x + (rr() - 0.5) * 8, z.y - 8, 2);
      if (b.holdT >= 90) { b.holdT = 0; healDone(b, z); }
    } else {
      b.holdT = 0;
      if (ip && z) {
        if (z.id === 'bridge2') { if (b.role === 'ing' && !gate.bridge2) { gate.bridge2 = 1; bridgeN = 0; b.interT = 40; sfx('interact', b); if (opts.onInteract) opts.onInteract(b.id, 'bridge2'); } }
        else if (z.id === 'med4') { spark(z.x, z.y - 10, 3); }
        else { b.interT = 24; spark(z.x, z.y - 10, 6); sfx('interact', b); if (opts.onInteract) opts.onInteract(b.id, z.id); }
      }
    }
    // anim
    b.anim = b.interT > 0 ? 'interact' : !b.grounded ? (b.vy < 0 ? 'jump' : 'fall') : Math.abs(b.vx) > 0.3 && dir ? 'run' : 'idle';
    b.exAnim = b.anim; b.fr++;
    if (inW && tick % 40 === (b.ph | 0) % 40) bubbles(b.x, b.y - 10, 1);
  }
  function healDone(b, z) {
    for (var i = 0; i < 14; i++) addP({ k: 'spark', x: z.x + (rr() - 0.5) * 14, y: z.y - 4, vx: (rr() - 0.5) * 0.6, vy: -0.4 - rr() * 1.1, g: -0.01, life: 50, sz: 2, c: '120,255,190', glow: 1 });
    sfx('heal', b); flash = 0.25; flashCol = '140,255,200';
    if (z.id === 'med4') { gate.barrier4 = 1; setCells(wd.gates[2], 0); shatter(wd.gates[2]); }
    if (opts.onInteract) opts.onInteract(b.id, z.id === 'lia' ? 'lia_heal' : z.id);
  }
  function setCells(gt, v) { for (var c = gt.c0; c <= gt.c1; c++) for (var r = gt.r0; r <= gt.r1; r++) dyn[r * LW + c] = v; }
  function shatter(gt) { addShake(4); for (var i = 0; i < 40; i++) addP({ k: 'spark', x: (gt.c0 + rr() * (gt.c1 - gt.c0 + 1)) * T, y: (gt.r0 + rr() * (gt.r1 - gt.r0 + 1)) * T, vx: (rr() - 0.5) * 2, vy: -rr() * 2, g: 0.08, life: 40, sz: 2, c: '130,230,255', glow: 1 }); }
  function closedGateBetween(x0, x1) {
    var lo = Math.min(x0, x1), hi = Math.max(x0, x1);
    return (!gate.wall3 && (wd.gates[0].c0 * T > lo && wd.gates[0].c0 * T < hi)) || (!gate.barrier4 && (wd.gates[2].c0 * T > lo && wd.gates[2].c0 * T < hi)) || (!gate.bridge2 && wd.gates[1].c0 * T > lo && wd.gates[1].c0 * T < hi);
  }
  function resetGates() { gate.wall3 = gate.bridge2 = gate.barrier4 = 0; bridgeN = 0; dyn.fill(0); initGates(); }
  function initGates() { setCells(wd.gates[0], 1); setCells(wd.gates[2], 1); }
  initGates();
  function gateTick() {
    var g0 = wd.gates[0], b = bodies.guia;
    if (!gate.wall3 && b && b.grounded && b.x > g0.c0 * T + 4 && b.x < (g0.c1 + 1) * T - 4 && b.y <= g0.r0 * T + 1) {   // la guia llega arriba: ancla la cuerda y baja la pared
      gate.wall3 = 1; for (var c = g0.c0; c <= g0.c1; c++) for (var r = g0.r0; r < g0.keep; r++) dyn[r * LW + c] = 0;
      shatter({ c0: g0.c0, c1: g0.c1, r0: g0.r0, r1: g0.keep - 1 }); sfx('rumble'); if (opts.onInteract) opts.onInteract('guia', 'wall3');
    }
    var gb = wd.gates[1];
    if (gate.bridge2 && bridgeN <= gb.c1 - gb.c0) {
      if (tick % 4 === 0) { var cc = gb.c0 + bridgeN; dyn[gb.row * LW + cc] = 2; puff(cc * T + 8, gb.row * T, 3, 0); sfx('plank'); bridgeN++; if (bridgeN > gb.c1 - gb.c0) { addShake(2); } }
    }
  }
  var SEP = { guia: 0, medica: 1, ing: 2 };
  function followInput(b) {
    var a = bodies[active], inp = { left: 0, right: 0, jump: 0, interact: 0, up: 0, down: 0 };
    if (!a) return inp;
    var rank = ROLES.filter(function (r) { return r !== active; }).indexOf(b.id), want = 28 + rank * 22, dx = a.x - b.x;
    if (closedGateBetween(b.x, a.x) && Math.abs(dx) < 400) want = want;
    var farWait = Math.abs(dx) <= want && Math.abs(a.y - b.y) < 20;
    if (farWait) { b.fstuck = 0; return inp; }
    var cmd = botInput(b.id, Math.abs(dx) <= want ? b.x : a.x - Math.sign(dx) * want * 0.6);
    // progreso: si lleva mucho sin acercarse, teletransporte (salvo puertas cerradas)
    b.fd = b.fd === undefined ? Math.abs(dx) : b.fd;
    if (tick % 30 === 0) { b.fstuck = (Math.abs(dx) > b.fd - 6 ? (b.fstuck || 0) + 1 : 0); b.fd = Math.abs(dx); }
    if ((b.fstuck > 7 || Math.abs(dx) > 420) && !closedGateBetween(b.x, a.x) && !gateBlocked(b, a)) { puff(b.x, b.y, 6, 0); b.x = a.safeX - Math.sign(dx || 1) * 10; b.y = a.safeY; b.vx = b.vy = 0; b.fstuck = 0; sfx('warp', b); }
    return cmd;
  }
  function gateBlocked(b, a) { return closedGateBetween(b.x, a.x); }
  function zoneNear(b) {
    var best = null, bd = 1e9;
    wd.zones.forEach(function (z) { var d = Math.abs(b.x - z.x) + Math.abs(b.y - z.y) * 0.8; if (Math.abs(b.x - z.x) < z.r && Math.abs(b.y - z.y) < 22 && d < bd) { bd = d; best = z; } });
    return best;
  }

  /* ---------- particulas ---------- */
  function addP(p) { if (parts.length > 500) parts.shift(); p.max = p.life; parts.push(p); }
  function puff(x, y, n, dirx) { for (var i = 0; i < n; i++) addP({ k: 'dust', x: x + (rr() - 0.5) * 6, y: y - 1, vx: (rr() - 0.5) * 0.8 + (dirx || 0) * 0.5, vy: -rr() * 0.4, g: -0.005, life: 16 + rr() * 12, sz: 1 + (rr() * 2 | 0), c: '190,175,170' }); }
  function spark(x, y, n) { for (var i = 0; i < n; i++) addP({ k: 'spark', x: x, y: y, vx: (rr() - 0.5) * 1.6, vy: -rr() * 1.6 - 0.3, g: 0.05, life: 22 + rr() * 20, sz: 1, c: rr() < 0.5 ? '255,200,90' : '255,240,180', glow: 1 }); }
  function splash(x, y, n, vy) { for (var i = 0; i < n; i++) addP({ k: 'drop', x: x + (rr() - 0.5) * 6, y: y, vx: (rr() - 0.5) * 1.8, vy: -rr() * 2.4 - 0.8, g: 0.14, life: 40, sz: 1, c: '170,225,255', die: 'water' }); }
  function bubbles(x, y, n) { for (var i = 0; i < n; i++) addP({ k: 'bub', x: x + (rr() - 0.5) * 8, y: y, vx: 0, vy: -0.35 - rr() * 0.4, g: 0, life: 140, sz: 1 + (rr() * 2 | 0), c: '200,240,255', ph: rr() * 6 }); }
  function drip(x, y) { addP({ k: 'drop', x: x, y: y, vx: 0, vy: 0.2, g: 0.12, life: 200, sz: 1, c: '150,210,255', die: 'any' }); }
  function confetti(x, y, n) { var cs = ['255,120,90', '255,220,90', '120,230,200', '150,160,255', '255,150,220']; for (var i = 0; i < n; i++) addP({ k: 'conf', x: x + (rr() - 0.5) * 10, y: y, vx: (rr() - 0.5) * 3, vy: -rr() * 3.5 - 1, g: 0.07, life: 90 + rr() * 60, sz: 2, c: cs[i % cs.length], ph: rr() * 6 }); }
  function debris(n) { for (var i = 0; i < n; i++) addP({ k: 'dust', x: cam.x + rr() * W, y: cam.y + 6, vx: (rr() - 0.5) * 0.3, vy: 0.4 + rr() * 1.2, g: 0.08, life: 60, sz: 1 + (rr() * 2 | 0), c: '150,135,140' }); }
  function addRipple(x, amp) { ripples.push({ x: x, a: amp, t: 0 }); if (ripples.length > 14) ripples.shift(); }
  function addShake(a) { shake = Math.max(shake, a); }
  function updParts() {
    var wy = waterY(wlCur);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.life--; p.vy += p.g; p.x += p.vx; p.y += p.vy;
      if (p.k === 'bub') { p.x += Math.sin(tick * 0.1 + p.ph) * 0.15; if (p.y < wy) p.life = 0; }
      if (p.k === 'conf') p.vx = Math.sin(tick * 0.12 + p.ph) * 0.6;
      if (p.die) {
        if (p.y >= wy && p.vy > 0) { p.life = 0; addRipple(p.x, 0.7); if (p.die === 'any' || rr() < 0.3) bubbles(p.x, p.y, 1); }
        else if (p.die === 'any' && tileAt(Math.floor(p.x / T), Math.floor(p.y / T)) === 1) { p.life = 0; spark(p.x, p.y - 1, 0); for (var j = 0; j < 2; j++) addP({ k: 'drop', x: p.x, y: p.y - 1, vx: (rr() - 0.5), vy: -0.8 - rr(), g: 0.12, life: 14, sz: 1, c: '150,210,255' }); }
      }
      if (p.life <= 0) parts.splice(i, 1);
    }
  }

  /* ---------- agua y snapshot ---------- */
  function setWater(l) {
    l = clamp(+l || 0, 0, 100);
    if (l > wlTarget + 4) { addShake(3); debris(14); sfx('rumble'); }
    wlTarget = l;
  }
  function spawnFx(type, x, y) {
    x = x == null ? cam.x + W / 2 : x; y = y == null ? cam.y + H / 2 : y;
    switch (type) {
      case 'dust': puff(x, y, 8, 0); break;
      case 'splash': splash(x, y, 14, 0); addRipple(x, 3); break;
      case 'spark': case 'sparks': spark(x, y, 14); break;
      case 'drip': drip(x, y); break;
      case 'bubble': case 'bubbles': bubbles(x, y, 8); break;
      case 'confetti': confetti(x, y, 40); break;
      case 'rescue': confetti(x, y, 70); spark(x, y, 24); flash = 0.7; addShake(3); break;
      case 'debris': debris(24); addShake(2); break;
      case 'shake': addShake(clamp(+y || 4, 1, 10)); break;
      case 'flash': flash = 0.9; break;
      case 'smoke': for (var i = 0; i < 10; i++) addP({ k: 'dust', x: x + (rr() - 0.5) * 6, y: y, vx: (rr() - 0.5) * 0.3, vy: -0.4 - rr() * 0.4, g: -0.01, life: 50, sz: 2, c: '120,110,120' }); break;
    }
  }
  function snapshot() {
    var p = {}; Object.keys(bodies).forEach(function (id) { var b = bodies[id]; p[id] = [Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10, Math.round(b.vx * 100) / 100, Math.round(b.vy * 100) / 100, b.face, b.exAnim, b.cl || 0, b.role, b.name]; });
    return { v: 2, t: tick, w: wlTarget, wc: Math.round(wlCur * 100) / 100, a: active, g: [gate.wall3, gate.bridge2, gate.barrier4, bridgeN], p: p };
  }
  function applySnapshot(s) {
    if (!s || !s.p) return;
    if (s.w !== undefined && s.w !== wlTarget) setWater(s.w);
    if (s.g) { if (s.g[0] && !gate.wall3) { gate.wall3 = 1; for (var c = wd.gates[0].c0; c <= wd.gates[0].c1; c++) for (var r = wd.gates[0].r0; r < wd.gates[0].keep; r++) dyn[r * LW + c] = 0; }
      if (s.g[1] && !gate.bridge2) gate.bridge2 = 1;
      if (s.g[1]) { for (var k2 = 0; k2 < s.g[3]; k2++) dyn[wd.gates[1].row * LW + wd.gates[1].c0 + k2] = 2; bridgeN = s.g[3]; }
      if (s.g[2] && !gate.barrier4) { gate.barrier4 = 1; setCells(wd.gates[2], 0); shatter(wd.gates[2]); } }
    Object.keys(s.p).forEach(function (id) {
      var q = s.p[id], b = bodies[id]; if (!b) return;
      b.tx = q[0]; b.ty = q[1]; b.vx = q[2]; b.vy = q[3]; b.face = q[4]; b.anim = q[5]; b.exAnim = q[5]; b.cl = q[6]; b.role = q[7] || b.role; b.name = q[8] || b.name;
      if (!b.seen || Math.abs(b.tx - b.x) > 48 || Math.abs(b.ty - b.y) > 48) { b.x = b.tx; b.y = b.ty; b.seen = true; }
      if (authority) { b.x = b.tx; b.y = b.ty; }
    });
  }

  /* ---------- tick global ---------- */
  function doTick() {
    tick++;
    if (authority) { syncBodies(); gateTick(); Object.keys(bodies).forEach(function (id) { tickBody(bodies[id]); }); writeBack(); }
    else {
      Object.keys(bodies).forEach(function (id) { var b = bodies[id]; b.x += (b.tx - b.x) * 0.35; b.y += (b.ty - b.y) * 0.35; b.fr++; b.grounded = b.exAnim !== 'jump' && b.exAnim !== 'fall'; });
      if (!st() && false) return;
    }
    wlCur += (wlTarget - wlCur) * 0.012 + Math.sign(wlTarget - wlCur) * 0.004; if (Math.abs(wlTarget - wlCur) < 0.01) wlCur = wlTarget;
    if (wlCur !== wlTarget && tick % 20 === 0) { addShake(0.6); }
    ripples.forEach(function (r) { r.t++; }); while (ripples.length && ripples[0].t > 260) ripples.shift();
    // goteo de estalactitas y ambiente
    var vx0 = cam.x - 20, vx1 = cam.x + W + 20;
    wd.stals.forEach(function (s) { if (s.drip && s.x > vx0 && s.x < vx1 && (tick + s.ph) % 240 === 0) drip(s.x, s.y + s.len); });
    if (tick % 6 === 0) addP({ k: 'mote', x: cam.x + rr() * W, y: cam.y + rr() * H, vx: (rr() - 0.5) * 0.15, vy: -0.05 - rr() * 0.1, g: 0, life: 160, sz: 1, c: '255,235,200' });
    wd.shrooms.forEach(function (s) { if (s.x > vx0 && s.x < vx1 && tick % 50 === (s.seed % 50)) addP({ k: 'mote', x: s.x, y: s.y - 6, vx: (rr() - 0.5) * 0.2, vy: -0.2, g: 0, life: 90, sz: 1, c: rgb(THEMES[s.s].crystal).slice(4, -1), glow: 1 }); });
    wd.torches.forEach(function (t) { if (t.x > vx0 && t.x < vx1 && tick % 7 === 0 && rr() < 0.7) addP({ k: 'spark', x: t.x + (rr() - 0.5) * 3, y: t.y - 17, vx: (rr() - 0.5) * 0.3, vy: -0.5 - rr() * 0.4, g: -0.005, life: 30, sz: 1, c: '255,190,90', glow: 1 }); });
    updParts();
    shake *= 0.9; if (shake < 0.1) shake = 0;
    if (flash > 0) flash = Math.max(0, flash - 0.02);
    updCam();
  }
  function step(dt) {
    if (dt === undefined) { doTick(); return; }
    acc += dt; var n = 0;
    while (acc >= 1 / 60 - 1e-9 && n < 6) { doTick(); acc -= 1 / 60; n++; }
    if (n === 6) acc = 0;
  }

  /* ---------- camara ---------- */
  function followBody() { return bodies[active]; }
  function updCam() {
    var tx, ty;
    if (cam.panT > 0) { cam.panT--; tx = cam.panX - W / 2; ty = cam.y; var f = followBody(); ty = f ? f.y - 100 : ty; }
    else if (cam.mode === 'fixed') { tx = cam.fx; ty = cam.fy; }
    else { var b = followBody(); if (b) { tx = b.x - W / 2 + b.face * 22; ty = b.y - 104; } else { tx = cam.x; ty = cam.y; } }
    tx = clamp(tx, 0, PW - W); ty = clamp(ty, 0, PH - H);
    var k = cam.panT > 0 ? 0.045 : cam.trans > 0 ? 0.05 : 0.09; if (cam.trans > 0) cam.trans--;
    cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * (k + 0.02);
  }
  function pan(round) {
    var r = clamp((round | 0) || 1, 1, NS) - 1; cam.panX = r * SPW + SPW / 2; cam.panT = 170;
  }
  function gather(round) {
    var s = clamp((round | 0) || 1, 1, NS) - 1, k = 0;
    Object.keys(bodies).forEach(function (id) { var b = bodies[id], sp = spawnOf(s, k++); b.x = b.tx = sp.x; b.y = b.ty = sp.y; b.vx = b.vy = 0; b.climb = null; puff(b.x, b.y, 6, 0); });
    cam.x = clamp(spawnOf(s, 0).x - W / 2, 0, PW - W);
  }

  /* ---------- bot sencillo (para demoLoop y para main.js) ---------- */
  function botInput(id, targetX) {
    var b = bodies[id], inp = { left: 0, right: 0, jump: 0, interact: 0, up: 0, down: 0 };
    if (!b) return inp;
    var d = targetX - b.x, dir = d > 0 ? 1 : -1;
    if (b.back > 0) {   // atascado: retrocede para tomar carrerilla y salta
      b.back--; if (dir > 0) inp.left = 1; else inp.right = 1; b.stk = 0;
      if (b.back === 8) b.bj = 18; if (b.bj > 0) { b.bj--; inp.jump = 1; } if (b.back < 14) { inp.left = inp.right = 0; if (dir > 0) inp.right = 1; else inp.left = 1; }
      return inp;
    }
    if (Math.abs(d) > 5) { if (d > 0) inp.right = 1; else inp.left = 1; }
    if (Math.abs(d) > 5 && b.grounded && Math.abs(b.vx) < 0.3) { b.stk = (b.stk || 0) + 1; if (b.stk > 20 && b.stk % 2 === 0 && hash(tick, b.ph | 0, 5) < 0.02) b.back = 36; if (b.stk > 70) { b.back = 36; b.stk = 0; } } else b.stk = 0;
    if (b.bj > 0) { b.bj--; inp.jump = 1; }
    if (b.grounded && Math.abs(d) > 5) {
      var ax = b.x + dir * (HW + 5), wall = tileAt(Math.floor(ax / T), Math.floor((b.y - 4) / T)) === 1;
      var fx = b.x + dir * 12, noFloor = tileAt(Math.floor(fx / T), Math.floor((b.y + 2) / T)) === 0;
      var step = tileAt(Math.floor(ax / T), Math.floor((b.y - 20) / T)) === 0;
      var wantUp = false;
      for (var k = 1; k <= 4 && !wantUp; k++) { var cx = Math.floor((b.x + dir * k * 16) / T), cyy = Math.floor((b.y - 14) / T); var t0 = tileAt(cx, cyy); if ((t0 === 2 || t0 === 1) && tileAt(cx, cyy - 1) === 0) wantUp = tileAt(cx, cyy - 2) === 0 && k >= 1; }
      if (wall || (noFloor && !lookDown(b, dir)) || (wantUp && hash(tick >> 3, id.length, 3) < 0.5 && Math.abs(d) > 20)) { inp.jump = 1; b.bj = 16; }
      else if (noFloor) { inp.jump = 1; b.bj = 14; }
    }
    if (b.y > 200 && !b.grounded === false) { /* ya esta abajo */ }
    return inp;
  }
  function lookDown(b, dir) { // hay repisa a ~1-2 tiles bajo el borde?
    var fx = Math.floor((b.x + dir * 20) / T), fy = Math.floor(b.y / T);
    return tileAt(fx, fy + 1) !== 0;
  }

  /* =================== RENDER =================== */
  function themeBlend(px) { // devuelve {i,j,w}
    var f = clamp(px / SPW, 0, NS - 0.001), i = Math.floor(f), w = smooth((f - i - 0.7) / 0.3);
    return { i: i, j: Math.min(NS - 1, i + 1), w: i >= NS - 1 ? 0 : w };
  }
  function drawLayer(idx, factor, ycoef, tb, cx, cy) {
    var yo = -Math.round(cy * ycoef), P = 640, xo = -(Math.round(cx * factor) % P);
    for (var x = xo; x < W; x += P) {
      sc.globalAlpha = 1; sc.drawImage(wd.bg[tb.i][idx], x, yo);
      if (tb.w > 0.01) { sc.globalAlpha = tb.w; sc.drawImage(wd.bg[tb.j][idx], x, yo); sc.globalAlpha = 1; }
    }
  }
  function frame(name, i, row) { return { im: sheet(name) }; }
  function drawSheetFrame(name, col, row, x, y, flip, cellW, cellH, feetY) {
    var im = sheet(name); if (!im) return false;
    var fw = cellW, fh = cellH;
    sc.save(); sc.translate(Math.round(x), Math.round(y - feetY));
    if (flip) { sc.scale(-1, 1); sc.drawImage(im, col * fw, row * fh, fw, fh, -fw / 2, 0, fw, fh); }
    else sc.drawImage(im, col * fw, row * fh, fw, fh, -fw / 2, 0, fw, fh);
    sc.restore(); return true;
  }
  function rects(list, ox, oy, face, col, sx, sy) { // list: [dx,dy,w,h,color]
    for (var i = 0; i < list.length; i++) {
      var r = list[i], x = face > 0 ? r[0] : -r[0] - r[2];
      sc.fillStyle = col || r[4];
      sc.fillRect(Math.round(ox + x * sx), Math.round(oy + r[1] * sy), Math.max(1, Math.round(r[2] * sx)), Math.max(1, Math.round(r[3] * sy)));
    }
  }
  function charParts(b) {
    var C = ROLE_COL[b.role] || ROLE_COL.guia, an = b.anim, f = b.fr, p = [], ph = (f >> 2) & 3;
    var bob = an === 'idle' ? (((f + b.ph * 7) >> 5) & 1) : an === 'run' ? (ph === 1 || ph === 3 ? 1 : 0) : 0;
    var l1x = -3, l2x = 1, l1h = 4, l2h = 4;
    if (an === 'run') { var o = [-1, 0, 1, 0][ph]; l1x += o; l2x -= o; if (ph === 1) l1h = 3; if (ph === 3) l2h = 3; }
    else if (an === 'jump') { l1h = l2h = 3; l1x = -3; l2x = 1; } else if (an === 'fall') { l1x = -4; l2x = 2; }
    p.push([l1x, -l1h, 2, l1h, C.pants], [l2x, -l2h, 2, l2h, C.pants], [l1x, -1, 2, 1, '#2a2030'], [l2x, -1, 2, 1, '#2a2030']);
    p.push([-3, -9 + bob, 6, 5, C.coat], [-3, -5 + bob, 6, 1, C.trim]);
    p.push([-3, -14 + bob, 6, 5, '#f1c9a0'], [-3, -14 + bob, 6, 2, C.hair], [-3, -12 + bob, 2, 3, C.hair], [1, -11 + bob, 1, 1, '#2a1e2c']);
    if (b.role === 'guia') { p.push([-3, -9 + bob, 7, 2, '#d8402a']); p.push([-6 - (ph & 1), -8 + bob, 3, 1, '#d8402a']); }
    if (b.role === 'medica') { p.push([-1, -8 + bob, 3, 1, '#fff'], [0, -9 + bob, 1, 3, '#fff'], [-5, -15 + bob, 3, 3, C.hair]); }
    if (b.role === 'ing') { p.push([-4, -16 + bob, 8, 3, '#f2c230'], [-4, -13 + bob, 9, 1, '#d89a20'], [3, -15 + bob, 2, 1, '#fff']); }
    var ay = -8 + bob;
    if (an === 'jump') p.push([2, ay - 3, 2, 4, C.coat]); else if (an === 'fall') p.push([3, ay - 1, 2, 3, C.coat], [-5, ay - 1, 2, 3, C.coat]);
    else if (an === 'interact') p.push([3, ay, 4, 2, C.coat], [7, ay, 1, 2, '#f1c9a0']);
    else if (an === 'run') p.push([2 + [-1, 0, 1, 0][ph], ay, 2, 4, C.coat]);
    else p.push([2, ay, 2, 4, C.coat]);
    return p;
  }
  function drawBody(b) {
    var x = Math.round(b.x), y = Math.round(b.y), t = tick, shown = false;
    var meta = assets && assets.meta && assets.meta['player_' + b.role];
    if (meta && meta.anims && sheet('player_' + b.role)) {
      var an = meta.anims[b.cl ? 'jump' : b.anim] || meta.anims.idle, fi = Math.floor(b.fr * (an.fps || 8) / 60);
      fi = an.loop === false ? Math.min(fi % (an.frames * 4), an.frames - 1) : fi % an.frames;
      if (b.anim === 'jump' && !b.cl) fi = b.vy < -1 ? 0 : 1;
      if (b.anim === 'fall') fi = Math.floor(b.fr / 8) % 2;
      shown = drawSheetFrame('player_' + b.role, fi, an.row, x, y, b.face < 0, meta.fw, meta.fh, meta.feet_y || 22);
    }
    if (!shown) {
      var parts2 = charParts(b);
      rects(parts2, x - 0, y, b.face, '#1a1424', 1, 1);       // contorno: copias desplazadas
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (o) { rects(parts2, x + o[0], y + o[1], b.face, '#1a1424', b.sx, b.sy); });
      rects(parts2, x, y, b.face, null, b.sx, b.sy);
    }
  }
  function drawLia(z, t) {
    var x = Math.round(z.x), y = Math.round(z.y);
    // manta de rescate y destellos
    if (!drawSheetFrame('lia', Math.floor(t / 30) % 4, 0, x, y, false, 24, 24, 22)) {
      var br = (Math.floor(t / 30)) & 1, P = [[-6, -5, 13, 5, '#6b4a9e'], [-6, -5, 13, 1, '#8a66c4'], [-5, -11 + br, 8, 6, '#e8743b'], [-5, -11 + br, 8, 1, '#ffb070'], [-3, -17 + br, 6, 6, '#f1c9a0'], [-4, -18 + br, 7, 3, '#4a2a1c'], [-4, -17 + br, 1, 5, '#4a2a1c'], [-3, -15 + br, 6, 1, '#e44a4a'], [2, -14 + br, 1, 1, '#2a1e2c'], [-6, -1, 3, 1, '#2a2030']];
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (o) { rects(P, x + o[0], y + o[1], 1, '#1a1424', 1, 1); });
      rects(P, x, y, 1, null, 1, 1);
    }
    if (((t / 24) | 0) % 2 === 0) { sc.fillStyle = '#ffe9a0'; sc.fillRect(x + 6, y - 20, 1, 1); }
  }
  function drawTorch(t, tick2) {
    var x = Math.round(t.x), y = Math.round(t.y), fl = Math.sin(tick2 * 0.4 + t.ph) * 0.5 + 0.5, h = 5 + Math.round(fl * 2 + rrh(tick2, t.ph) * 1.5);
    if (sheet('props') && assets.meta.props) {
      var im = sheet('props'); sc.drawImage(im, (Math.floor(tick2 / 8) % 4) * 16, 0, 16, 16, x - 8, y - 22, 16, 16);
      sc.fillStyle = '#1a1424'; sc.fillRect(x - 2, y - 8, 4, 8); sc.fillStyle = '#6a4630'; sc.fillRect(x - 1, y - 8, 2, 8); sc.fillStyle = '#9a6a42'; sc.fillRect(x - 1, y - 8, 1, 8);
      return;
    }
    sc.fillStyle = '#1a1424'; sc.fillRect(x - 3, y - 10, 7, 3); sc.fillRect(x - 2, y - 8, 5, 9);
    sc.fillStyle = '#6a4630'; sc.fillRect(x - 1, y - 8, 3, 8); sc.fillStyle = '#9a6a42'; sc.fillRect(x - 1, y - 8, 1, 8);
    sc.fillStyle = '#3a3a4a'; sc.fillRect(x - 2, y - 10, 5, 2); sc.fillStyle = '#7a7a8a'; sc.fillRect(x - 2, y - 10, 5, 1);
    sc.fillStyle = '#e0501e'; sc.fillRect(x - 2, y - 10 - h + 2, 5, h - 1); sc.fillRect(x - 1, y - 10 - h, 3, 2);
    sc.fillStyle = '#ffa030'; sc.fillRect(x - 1, y - 10 - h + 3, 3, h - 2);
    sc.fillStyle = '#ffe890'; sc.fillRect(x, y - 10 - h + 5, 1, Math.max(1, h - 4));
  }
  function rrh(a, b) { return hash(a >> 1, 3, (b * 10) | 0); }
  function drawRope(r, t) {
    var x0 = r.x; sc.fillStyle = '#1a1424';
    for (var y = r.y0; y < r.y1; y += 2) {
      var sway = Math.sin(t * 0.04 + r.ph + y * 0.03) * (0.4 + (y - r.y0) * 0.012);
      var xx = Math.round(x0 + sway - cam.x), yy = Math.round(y - cam.y);
      sc.fillStyle = '#1a1424'; sc.fillRect(xx - 1, yy, 3, 2);
      sc.fillStyle = (y >> 2) & 1 ? '#c9a064' : '#a67c48'; sc.fillRect(xx, yy, 1, 2);
    }
    var ex = Math.round(x0 - cam.x), ey = Math.round(r.y1 - cam.y);
    sc.fillStyle = '#1a1424'; sc.fillRect(ex - 2, ey, 5, 3); sc.fillStyle = '#a67c48'; sc.fillRect(ex - 1, ey, 3, 2);
    sc.fillStyle = '#1a1424'; sc.fillRect(ex - 3, Math.round(r.y0 - cam.y), 7, 2); sc.fillStyle = '#556'; sc.fillRect(ex - 2, Math.round(r.y0 - cam.y), 5, 1);
  }
  function drawZone(z, t, active, near) {
    var x = Math.round(z.x - cam.x), y = Math.round(z.y - cam.y);
    if (z.lia || z.id === 'bridge2') return;
    if (z.id === 'med4') { var P2 = [[-7, -9, 14, 9, '#e8f2f0'], [-7, -9, 14, 1, '#ffffff'], [-7, -2, 14, 2, '#9ab8b4'], [-1, -7, 2, 5, '#d83a4a'], [-3, -5, 6, 1, '#d83a4a']]; [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (o) { rects(P2, x + o[0], y + o[1], 1, '#1a1424', 1, 1); }); rects(P2, x, y, 1, null, 1, 1); if (!gate.barrier4) { sc.fillStyle = 'rgba(120,255,190,' + (0.5 + 0.4 * Math.sin(t * 0.1)) + ')'; sc.fillRect(x - 1, y - 14, 3, 1); sc.fillRect(x, y - 15, 1, 3); } return; }
    var led = ((t / 20) | 0) % 2 === 0 || active;
    var done = sheet('props');
    if (done && assets.meta.props) { sc.drawImage(done, (Math.floor(t / (active ? 10 : 20)) % 2 + (active ? 2 : 0)) * 16, 32, 16, 16, x - 8, y - 15, 16, 16); }
    else {
      var P = [[-7, -9, 14, 9, '#4a4a5e'], [-7, -9, 14, 1, '#7a7a96'], [-5, -7, 6, 4, '#1c2a24'], [-4, -6, 4, 2, active ? '#7dffb0' : '#3a8a5a'], [2, -7, 3, 3, '#a05040'], [2, -3, 5, 1, '#262636'], [-1, -14, 1, 5, '#8a8aa6'], [-2, -15, 3, 1, '#8a8aa6']];
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (o) { rects(P, x + o[0], y + o[1], 1, '#1a1424', 1, 1); });
      rects(P, x, y, 1, null, 1, 1);
      if (led) { sc.fillStyle = active ? '#ffdd60' : '#ff5a4a'; sc.fillRect(x - 6 + 12, y - 8, 1, 1); sc.fillRect(x - 1, y - 16, 1, 1); }
    }
    if (active && !near) { var by = Math.round(Math.sin(t * 0.1) * 2); sc.fillStyle = '#1a1424'; sc.fillRect(x - 3, y - 25 + by, 7, 4); sc.fillRect(x - 2, y - 21 + by, 5, 2); sc.fillRect(x - 1, y - 19 + by, 3, 2); sc.fillStyle = '#ffd24a'; sc.fillRect(x - 2, y - 24 + by, 5, 2); sc.fillRect(x - 1, y - 22 + by, 3, 1); sc.fillRect(x, y - 21 + by, 1, 1); }
  }
  function drawCrate(p) {
    var x = Math.round(p.x - cam.x), y = Math.round(p.y - cam.y), im = sheet('props');
    if (im && assets.meta.props) { sc.drawImage(im, 0, 64, 16, 16, x - 8, y - 16, 16, 16); return; }
    sc.fillStyle = '#1a1424'; sc.fillRect(x - 7, y - 11, 14, 11); sc.fillStyle = '#9a6a3a'; sc.fillRect(x - 6, y - 10, 12, 9);
    sc.fillStyle = '#c28a50'; sc.fillRect(x - 6, y - 10, 12, 1); sc.fillStyle = '#5a3a24'; sc.fillRect(x - 6, y - 6, 12, 1); sc.fillRect(x - 1, y - 10, 2, 9);
    sc.fillStyle = '#d8cdb8'; sc.fillRect(x + 3, y - 8, 2, 2);
  }

  function drawGates(L, cx, cy, t) {
    var g0 = wd.gates[0], g1 = wd.gates[1], g2 = wd.gates[2], th, x, y, w, h, i, j;
    function rock(x, y, w, h, tint, top) {
      sc.fillStyle = '#14101f'; sc.fillRect(x - 1, y - 1, w + 2, h + 2);
      sc.fillStyle = rgb(mix(tint, [255, 255, 255], 0.0)); sc.fillRect(x, y, w, h);
      for (var yy = 0; yy < h; yy += 2) for (var xx = 0; xx < w; xx += 2) { var hv = hash(xx + x + cx, yy + y + cy, 61); if (hv < 0.3) { sc.fillStyle = rgb(mix(tint, [255, 255, 255], 0.1)); sc.fillRect(x + xx, y + yy, 2, 2); } else if (hv > 0.78) { sc.fillStyle = rgb(mix(tint, DARK, 0.3)); sc.fillRect(x + xx, y + yy, 2, 2); } }
      sc.fillStyle = rgb(mix(tint, [255, 255, 255], 0.3)); sc.fillRect(x, y, 2, h);
      sc.fillStyle = rgb(mix(tint, DARK, 0.5)); sc.fillRect(x + w - 2, y, 2, h);
      if (top) { sc.fillStyle = rgb(THEMES[2].rim); sc.fillRect(x, y, w, 2); sc.fillStyle = rgb(mix(THEMES[2].rim, DARK, 0.4)); sc.fillRect(x, y + 2, w, 1); }
    }
    // pared de escalada (solo la guia la trepa)
    if (g0.c1 * T + 16 > cx && g0.c0 * T < cx + W) {
      x = g0.c0 * T - cx; w = (g0.c1 - g0.c0 + 1) * T;
      var top = gate.wall3 ? g0.keep : g0.r0;
      y = top * T - cy; h = (g0.r1 + 1 - top) * T;
      rock(x, y, w, h, mix(THEMES[2].rock, [255, 255, 255], 0.06), true);
      sc.fillStyle = '#e8d070'; for (j = 0; j < h - 6; j += 12) { sc.fillRect(x + 6 + (j / 12 % 2) * 14, y + 6 + j, 2, 2); }   // clavijas de escalada
      if (gate.wall3) { var rx = x + 8; for (j = g0.r0 * T - cy - 4; j < y + 2; j += 2) { sc.fillStyle = '#14101f'; sc.fillRect(rx - 1, j, 3, 2); sc.fillStyle = (j >> 2) & 1 ? '#c9a064' : '#a67c48'; sc.fillRect(rx, j, 1, 2); if (((j >> 3) & 3) === 0) { sc.fillStyle = '#e8d6a0'; sc.fillRect(rx - 1, j, 3, 1); } }
        sc.fillStyle = '#556'; sc.fillRect(rx - 2, y - 2 , 5, 2); }
      else { sc.fillStyle = 'rgba(255,230,120,0.9)'; var ar = Math.round(Math.sin(t * 0.1) * 2); sc.fillRect(x + 15, y - 12 + ar, 2, 5); sc.fillRect(x + 13, y - 8 + ar, 6, 1); sc.fillRect(x + 14, y - 7 + ar, 4, 1); }
    }
    // barrera de cristal (solo la medica la disuelve)
    if (!gate.barrier4 && g2.c1 * T + 16 > cx && g2.c0 * T < cx + W) {
      x = g2.c0 * T - cx; y = g2.r0 * T - cy; w = (g2.c1 - g2.c0 + 1) * T; h = (g2.r1 - g2.r0 + 1) * T;
      th = THEMES[3].crystal; var gg = sc.createLinearGradient(x, 0, x + w, 0);
      gg.addColorStop(0, '#173a66'); gg.addColorStop(0.5, '#2a6ab0'); gg.addColorStop(1, '#173a66');
      sc.fillStyle = '#0a1230'; sc.fillRect(x - 1, y - 1, w + 2, h + 2); sc.fillStyle = gg; sc.fillRect(x, y, w, h);
      for (i = 0; i < w; i += 4) for (j = 0; j < h; j += 5) { var hv2 = hash(i + g2.c0 * 4, j, 71); if (hv2 < 0.35) { sc.fillStyle = hv2 < 0.1 ? '#e8fbff' : '#7fd0ff'; sc.fillRect(x + i + (hv2 * 7 | 0) % 3, y + j, 1, 3 + (hv2 * 9 | 0) % 3); } }
      sc.fillStyle = 'rgba(255,255,255,' + (0.15 + 0.1 * Math.sin(t * 0.07)) + ')'; sc.fillRect(x + 3, y, 2, h);
      for (j = 0; j < h; j += 24) L.push({ x: x + w / 2, y: y + j + 8, r: 38, c: th, a: 0.8 });
    }
    // puente del ingeniero
    var built = bridgeN, bx = g1.c0 * T - cx, by = g1.row * T - cy;
    if (g1.c1 * T + 16 > cx && g1.c0 * T - 16 < cx + W) {
      sc.fillStyle = '#14101f'; sc.fillRect(bx - 5, by - 14, 4, 20); sc.fillStyle = '#7a5538'; sc.fillRect(bx - 4, by - 13, 2, 18); sc.fillStyle = '#e0b060'; sc.fillRect(bx - 4, by - 13, 2, 2);   // anclaje
      if (!gate.bridge2) { sc.fillStyle = 'rgba(255,230,120,0.9)'; var ar2 = Math.round(Math.sin(t * 0.1) * 2); sc.fillRect(bx - 4, by - 26 + ar2, 2, 5); sc.fillRect(bx - 6, by - 22 + ar2, 6, 1); }
      for (i = 0; i < built; i++) {
        var px = bx + i * T, sag = Math.round(Math.sin((i + 0.5) / (g1.c1 - g1.c0 + 1) * Math.PI) * 4);
        sc.fillStyle = '#1b1220'; sc.fillRect(px, by - 1, T, 7); sc.fillStyle = '#8a5a3a'; sc.fillRect(px, by, T, 5); sc.fillStyle = '#b57c4a'; sc.fillRect(px, by, T, 1); sc.fillStyle = '#4d2f26'; sc.fillRect(px + 7, by + 1, 1, 4); sc.fillRect(px + 15, by + 1, 1, 4);
        sc.fillStyle = '#1b1220'; sc.fillRect(px, by - 10 + sag - 1, T, 3); sc.fillStyle = '#c9a064'; sc.fillRect(px, by - 10 + sag, T, 1);
        if (i % 3 === 0) { sc.fillStyle = '#1b1220'; sc.fillRect(px + 6, by - 10 + sag, 3, 10 - sag + 1); sc.fillStyle = '#a67c48'; sc.fillRect(px + 7, by - 9 + sag, 1, 9 - sag); }
        sc.fillStyle = '#d8c8a8'; sc.fillRect(px, by + 5, 1, 1);
      }
    }
  }
  function addLight(L, x, y, r, col, a, kind) { L.push({ x: x - cam.x, y: y - cam.y, r: r, c: col, a: a }); }

  function render() {
    var t = tick, cx0 = cam.x, cy0 = cam.y;
    var sh = shake ? [Math.round((rr() - 0.5) * 2 * shake), Math.round((rr() - 0.5) * 2 * shake)] : [0, 0];
    cam.rx = cam.x; cam.ry = cam.y;
    var cxr = clamp(Math.round(cam.x) + sh[0], 0, PW - W), cyr = clamp(Math.round(cam.y) + sh[1], 0, PH - H);
    cam.x = cxr; cam.y = cyr;                    // dibujamos con la camara entera (pixel-perfect)
    var tb = themeBlend(cxr + W / 2), wy = waterY(wlCur), sy = wy - cyr;
    var amb = mix(THEMES[tb.i].amb, THEMES[tb.j].amb, tb.w);
    // cielo/fondo
    var gr = sc.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, rgb(mix([14, 12, 30], amb, 0.5))); gr.addColorStop(1, rgb(mix([40, 30, 66], amb, 0.5)));
    sc.fillStyle = gr; sc.fillRect(0, 0, W, H);
    drawLayer(0, 0.12, 0.2, tb, cxr, cyr);
    // rayos de luz
    sc.globalCompositeOperation = 'lighter';
    wd.shafts.forEach(function (s) {
      var x = s.x - cxr * 0.9 + cxr * 0.9 - cxr; if (x < -80 || x > W + 80) return;
      var a = 0.07 + 0.03 * Math.sin(t * 0.02 + s.ph), top = -cyr, th = THEMES[s.s].torch;
      var lg = sc.createLinearGradient(0, top, 0, top + 170); lg.addColorStop(0, rgb(th, a)); lg.addColorStop(1, rgb(th, 0));
      sc.fillStyle = lg; sc.beginPath(); sc.moveTo(x, top); sc.lineTo(x + s.w, top); sc.lineTo(x + s.w + 46, top + 170); sc.lineTo(x + 22, top + 170); sc.closePath(); sc.fill();
    });
    sc.globalCompositeOperation = 'source-over';
    drawLayer(1, 0.3, 0.35, tb, cxr, cyr);
    drawLayer(2, 0.55, 0.6, tb, cxr, cyr);
    // roca + decoracion estatica
    sc.drawImage(wd.tiles, cxr, cyr, W, H, 0, 0, W, H);
    sc.drawImage(wd.decor, cxr, cyr, W, H, 0, 0, W, H);
    var L = [], sparkle;
    // cristales: destellos animados y luces
    wd.crystals.forEach(function (c) {
      if (c.x < cxr - 40 || c.x > cxr + W + 40) return;
      var th = THEMES[c.s].crystal, pu = 0.7 + 0.3 * Math.sin(t * 0.05 + c.seed);
      addLight(L, c.x, c.y - c.sz * 0.6, 22 + c.sz * 2.4, th, 0.55 * pu);
      if ((t + c.seed * 3) % 90 < 3) { sc.fillStyle = '#fff'; sc.fillRect(Math.round(c.x - cxr), Math.round(c.y - c.sz - cyr), 1, 1); sc.fillRect(Math.round(c.x - cxr) - 1, Math.round(c.y - c.sz - cyr) + 1, 3, 1); }
    });
    wd.shrooms.forEach(function (s) { if (s.x < cxr - 20 || s.x > cxr + W + 20) return; addLight(L, s.x, s.y - 4, 16, THEMES[s.s].crystal, 0.35 + 0.1 * Math.sin(t * 0.07 + s.seed)); });
    // charcos (reflejo animado)
    wd.puddles.forEach(function (p) {
      if (p.x < cxr - 80 || p.x > cxr + W) return;
      var x = Math.round(p.x - cxr), y = Math.round(p.y - cyr);
      sc.fillStyle = 'rgba(190,230,255,0.55)'; var ph = ((t >> 4) + (p.x >> 4)) % 5; sc.fillRect(x + 3 + ph * 4 % (p.w - 6), y - 1, 3, 1);
    });
    drawGates(L, cxr, cyr, t);
    wd.ropes.forEach(function (r) { if (r.x > cxr - 20 && r.x < cxr + W + 20) drawRope(r, t); });
    // antorchas
    wd.torches.forEach(function (tc) {
      if (tc.x < cxr - 60 || tc.x > cxr + W + 60) return;
      sc.save(); sc.translate(-cxr, -cyr); drawTorch(tc, t); sc.restore();
      var fl = 0.85 + 0.15 * Math.sin(t * 0.37 + tc.ph) + (rrh(t, tc.ph) - 0.5) * 0.15;
      addLight(L, tc.x, tc.y - 16, 84 * fl, THEMES[tc.s].torch, 0.95 * fl);
    });
    wd.props.forEach(function (p) { if (p.t === 'crate' && p.x > cxr - 20 && p.x < cxr + W + 20) drawCrate(p); });
    // zonas
    var s0 = st(), round = s0 ? s0.round : 1, lb = bodies[active], nearZ = lb ? zoneNear(lb) : null;
    wd.zones.forEach(function (z) {
      if (z.x < cxr - 40 || z.x > cxr + W + 40) return;
      var act = z.id === 'zone' + round || (z.lia && round >= 5);
      drawZone(z, t, act, nearZ === z);
      addLight(L, z.x, z.y - 10, z.lia ? 60 : 30, z.lia ? [255, 235, 200] : (act ? [140, 255, 190] : [255, 110, 90]), act || z.lia ? 0.6 : 0.3);
      if (z.lia) { sc.save(); sc.translate(-cxr, -cyr); drawLia(z, t); sc.restore(); }
    });
    // jugadores
    var order = Object.keys(bodies).sort(function (a, b) { return bodies[a].y - bodies[b].y; });
    order.forEach(function (id) {
      var b = bodies[id]; if (b.x < cxr - 30 || b.x > cxr + W + 30) return;
      sc.save(); sc.translate(-cxr, -cyr); drawBody(b); sc.restore();
      addLight(L, b.x, b.y - 12, 54, b.role === 'ing' ? [255, 240, 190] : [255, 220, 170], 0.7);
    });
    // particulas
    parts.forEach(function (p) {
      var x = Math.round(p.x - cxr), y = Math.round(p.y - cyr); if (x < -4 || x > W + 4 || y < -4 || y > H + 4) return;
      var a = clamp(p.life / p.max * (p.k === 'mote' ? 1.4 : 1.6), 0, 1);
      if (p.k === 'mote') a *= 0.5 + 0.5 * Math.sin(p.life * 0.2);
      sc.fillStyle = 'rgba(' + p.c + ',' + (p.k === 'dust' ? a * 0.55 : a) + ')'; sc.fillRect(x, y, p.sz, p.sz);
      if (p.glow) L.push({ x: x, y: y, r: 7, c: p.c.split(',').map(Number), a: 0.35 * a });
    });

    /* ----- agua: refraccion por franjas + tinte + espuma ----- */
    out.drawImage(scv, 0, 0);
    if (sy < H + 4) {
      var yStart = Math.max(0, Math.floor(sy) + 1);
      for (var y = yStart; y < H; y += 2) {
        var off = Math.round(Math.sin(y * 0.4 + t * 0.04) * 1.1 + Math.sin(y * 0.17 - t * 0.021) * 0.9);
        if (off) out.drawImage(scv, 0, y, W, 2, off, y, W, 2);
      }
      var tg = out.createLinearGradient(0, Math.max(0, sy), 0, Math.max(0, sy) + 110);
      tg.addColorStop(0, 'rgba(70,170,210,0.30)'); tg.addColorStop(1, 'rgba(6,24,66,0.66)');
      out.fillStyle = tg; out.fillRect(0, Math.max(0, Math.floor(sy)), W, H);
      // caustics
      out.globalCompositeOperation = 'lighter';
      for (y = Math.max(0, Math.floor(sy)) + 4; y < H; y += 4) {
        out.fillStyle = 'rgba(120,210,235,' + (0.07 * Math.max(0, 1 - (y - sy) / 90)) + ')';
        for (var x = ((y * 7) % 23); x < W; x += 23) { var ln = 4 + Math.round(4 * (1 + Math.sin(x * 0.2 + t * 0.03 + y))); out.fillRect(x + Math.round(Math.sin(t * 0.02 + y) * 3), y + (Math.sin(x * 0.4 + t * 0.05) > 0 ? 0 : 1), ln, 1); }
      }
      out.globalCompositeOperation = 'source-over';
      // superficie con ondas
      var prev = 0;
      for (x = 0; x < W; x++) {
        var wx = x + cxr, wv = Math.sin(wx * 0.06 + t * 0.045) * 1.2 + Math.sin(wx * 0.13 - t * 0.075) * 0.7 + Math.sin(wx * 0.027 + t * 0.02) * 1.1;
        for (var q = 0; q < ripples.length; q++) { var rp = ripples[q], dd = Math.abs(wx - rp.x); wv += rp.a * Math.sin(dd * 0.32 - rp.t * 0.3) * Math.exp(-rp.t / 70) * Math.exp(-dd / 60); }
        var yy = Math.round(sy + wv);
        if (yy < H && yy > -4) {
          out.fillStyle = 'rgba(70,170,215,0.45)'; out.fillRect(x, yy, 1, 3);
          out.fillStyle = 'rgba(225,248,255,0.95)'; out.fillRect(x, yy, 1, 1);
          if (Math.abs(yy - prev) > 0) { out.fillStyle = 'rgba(255,255,255,0.8)'; out.fillRect(x, Math.min(yy, prev) , 1, 1); }
          out.fillStyle = 'rgba(40,120,180,0.5)'; out.fillRect(x, yy + 3, 1, 2);
          prev = yy;
        }
      }
    }
    /* ----- iluminacion ----- */
    var dvl = 0.74 + (wlCur / 100) * 0.06;
    dk.globalCompositeOperation = 'source-over'; dk.clearRect(0, 0, W, H);
    dk.fillStyle = rgb(mix([6, 4, 14], amb, 0.55), dvl); dk.fillRect(0, 0, W, H);
    dk.globalCompositeOperation = 'destination-out';
    var i, l, lg2;
    for (i = 0; i < L.length; i++) {
      l = L[i]; if (l.x < -l.r || l.x > W + l.r || l.y < -l.r || l.y > H + l.r) continue;
      lg2 = dk.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      lg2.addColorStop(0, 'rgba(0,0,0,' + Math.min(1, l.a * 1.1) + ')'); lg2.addColorStop(0.45, 'rgba(0,0,0,' + l.a * 0.6 + ')'); lg2.addColorStop(1, 'rgba(0,0,0,0)');
      dk.fillStyle = lg2; dk.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    dk.globalCompositeOperation = 'source-over';
    out.drawImage(dkv, 0, 0);
    out.globalCompositeOperation = 'lighter';
    for (i = 0; i < L.length; i++) {
      l = L[i]; if (l.x < -l.r || l.x > W + l.r || l.y < -l.r || l.y > H + l.r) continue;
      lg2 = out.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.9);
      lg2.addColorStop(0, rgb(l.c, 0.30 * l.a)); lg2.addColorStop(1, rgb(l.c, 0));
      out.fillStyle = lg2; out.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    out.globalCompositeOperation = 'source-over';
    // primer plano oscuro y vineta
    var fgx = -(Math.round(cxr * 1.35) % 640), fgy = PH - cyr - 30;
    out.globalAlpha = 0.9;
    for (x = fgx; x < W; x += 640) if (fgy < H) out.drawImage(wd.fg, x, fgy);
    out.globalAlpha = 1;
    out.drawImage(wd.vig, 0, 0);
    if (flash > 0) { out.fillStyle = 'rgba(' + flashCol + ',' + flash * 0.6 + ')'; out.fillRect(0, 0, W, H); }
    // etiquetas
    order.forEach(function (id) {
      var b = bodies[id], x = Math.round(b.x - cxr), y = Math.round(b.y - cyr);
      if (x < -20 || x > W + 20) return;
      var nm = String(b.name || id).slice(0, 8), C = ROLE_COL[b.role] || ROLE_COL.guia;
      if (id === active || Math.abs(b.x - bodies[active].x) > 40) drawText(out, nm, x - Math.floor(textW(nm) / 2), y - 25, C.name, '#10081c');
      if (id === active) { out.fillStyle = '#10081c'; out.fillRect(x - 2, y - 30, 5, 3); out.fillStyle = '#fff'; out.fillRect(x - 1, y - 30, 3, 1); out.fillRect(x, y - 29, 1, 1); }
    });
    var mb = bodies.medica;
    if (mb && mb.holdT > 0) { var hx = Math.round(mb.x - cxr), hy = Math.round(mb.y - cyr) - 34, pr = mb.holdT / 90; out.fillStyle = '#10081c'; out.fillRect(hx - 12, hy, 25, 5); out.fillStyle = '#2a4a3a'; out.fillRect(hx - 11, hy + 1, 23, 3); out.fillStyle = '#7dffb0'; out.fillRect(hx - 11, hy + 1, Math.round(23 * pr), 3); }
    if (nearZ) {
      var zx = Math.round(nearZ.x - cxr), zy = Math.round(nearZ.y - cyr - 30 + Math.sin(t * 0.12) * 1.5);
      out.fillStyle = '#10081c'; out.fillRect(zx - 6, zy - 3, 13, 11); out.fillStyle = '#ffd24a'; out.fillRect(zx - 5, zy - 2, 11, 9);
      drawText(out, 'E', zx - 1, zy, '#3a1a10');
    }
    cam.x = cam.rx; cam.y = cam.ry;
  }

  /* ---------- bucle ---------- */
  function loop(ts) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.1, (ts - last) / 1000); last = ts; step(dt); render();
  }
  function start() { if (running) return; running = true; last = performance.now(); acc = 0; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function setInput(id, inp) {
    if (!bodies[id]) return;
    inputs[id] = { left: !!inp.left, right: !!inp.right, jump: !!inp.jump, interact: !!inp.interact, up: !!inp.up, down: !!inp.down };
  }
  function setActive(role) {
    if (!bodies[role] || role === active) return;
    active = role; localId = role; cam.trans = 60; sfx('switch', bodies[role]);
    ROLES.forEach(function (r) { if (!followSet[r]) follow[r] = r !== active; });
    follow[active] = false; inputs[active] = inputs[active] || NOINP;
  }
  function setFollow(role, on) { if (!bodies[role]) return; followSet[role] = true; follow[role] = !!on; if (role === active) follow[role] = false; }
  ROLES.forEach(function (r) { follow[r] = r !== active; });
  function fit(maxW, maxH) {
    maxW = maxW || global.innerWidth; maxH = maxH || global.innerHeight;
    var s = Math.max(1, Math.floor(Math.min(maxW / W, maxH / H)));
    canvas.style.width = W * s + 'px'; canvas.style.height = H * s + 'px'; return s;
  }

  Object.assign(self, {
    start: start, stop: stop, step: step, render: render, setInput: setInput, setActive: setActive, setFollow: setFollow, resetGates: resetGates, gate: gate, snapshot: snapshot, applySnapshot: applySnapshot,
    setWater: setWater, spawnFx: spawnFx, pan: pan, gather: gather, botInput: botInput, fit: fit,
    addPlayer: function (id, role, name) { var b = addBody(id, role, name, Object.keys(bodies).length); b.manual = true; return b; },
    setLocal: function (id) { localId = id; }, setCameraFixed: function (x, y) { cam.mode = 'fixed'; cam.fx = x; cam.fy = y; }, setCameraFollow: function () { cam.mode = 'follow'; },
    bodies: bodies, cam: cam, zones: wd.zones, world: wd, tileAt: tileAt
  });
  Object.defineProperties(self, { water: { get: function () { return wlCur; } }, tick: { get: function () { return tick; } }, active: { get: function () { return active; } } });
  // camara inicial
  var fb0 = followBody(); if (fb0) { cam.x = clamp(fb0.x - W / 2, 0, PW - W); cam.y = clamp(fb0.y - 104, 0, PH - H); }
  syncBodies(); updCam(); cam.x = cam.x || 0;
  if (!opts.noCurrent) global.Engine.current = self;
  return self;
}

/* ---------- demo para menu: 3 bots recorren el nivel, agua cicla ---------- */
function demoLoop(canvas, opts) {
  opts = opts || {};
  var inst = create(canvas, { assets: opts.assets || global.ASSETS, localId: 'guia', authority: true, water: 10 });
  var ids = ['guia', 'medica', 'ing'];
  var wd = inst.world, sec = 0, stuck = 0, lastX = 0, targets = [];
  wd.zones.forEach(function (z) { if (!z.lia) targets.push(z.x + 70); });
  targets.push(wd.lia.x - 10);
  var raf = 0, running = true, last = performance.now(), acc = 0, tk = 0;
  function frame(ts) {
    if (!running) return; raf = requestAnimationFrame(frame);
    acc += Math.min(0.1, (ts - last) / 1000); last = ts;
    while (acc >= 1 / 60) {
      acc -= 1 / 60; tk++;
      var lead = inst.bodies.guia, tx = targets[sec];
      ids.forEach(function (id, i) { inst.setInput(id, inst.botInput(id, tx - i * 18)); });
      inst.step();
      if (Math.abs(lead.x - tx) < 24 || stuck > 600) {
        stuck = 0; sec++;
        if (sec >= targets.length) { sec = 0; inst.gather(1); inst.setWater(10); }
        else inst.setWater(10 + 18 * Math.min(sec, 4));
      }
      if (tk % 30 === 0) { stuck = Math.abs(lead.x - lastX) < 4 ? stuck + 30 : 0; lastX = lead.x; }
      if (stuck > 240) { inst.gather(Math.min(5, Math.floor(lead.x / SPW) + 1)); stuck = 0; }
    }
    inst.render();
  }
  raf = requestAnimationFrame(frame);
  return { engine: inst, stop: function () { running = false; cancelAnimationFrame(raf); } };
}

global.Engine = { create: create, demoLoop: demoLoop, waterY: waterY, W: W, H: H, TILE: T, SECTIONS: NS, LEVEL_W: PW, LEVEL_H: PH, THEMES: THEMES,
  current: null,
  setInput: function (r, i) { if (this.current) this.current.setInput(r, i); },
  setActive: function (r) { if (this.current) this.current.setActive(r); },
  setFollow: function (r, on) { if (this.current) this.current.setFollow(r, on); },
  sectionOf: function (x) { return clamp(Math.floor(x / SPW), 0, NS - 1) + 1; }, version: '1.0' };
})(window);
