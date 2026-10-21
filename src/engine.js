/* engine.js - Rescate en la Cueva v3. window.Engine. Ver NOTES-engine.md */
(function (global) {
'use strict';
var W = 320, H = 180, T = 16, SECW = 60, NS = 5, LW = 300, LH = 30, PW = 4800, PH = 480, SPW = 960, TAU = Math.PI * 2;
var TA = 25, TB = 19, TC = 13, TD = 7, BGH = 380;   // filas de suelo de las 4 alturas (galerias) de cada tramo
var HW = 4, HH = 12;                       // hitbox: 8x12, origen = centro x / pies y
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
  '0': [7,5,5,5,7], '1': [2,6,2,2,7], '2': [7,1,7,4,7], '3': [7,1,7,1,7], '4': [5,5,7,1,1], '5': [7,4,7,1,7], '6': [7,4,7,5,7], '7': [7,1,1,1,1], '8': [7,5,7,5,7], '9': [7,5,7,1,7], '!': [2,2,2,0,2], '?': [7,1,2,0,2], '.': [0,0,0,0,2], '-': [0,0,7,0,0], ' ': [0,0,0,0,0], ',': [0,0,0,2,4], ':': [0,2,0,2,0], ';': [0,2,0,2,4], '/': [1,1,2,4,4], '+': [0,2,7,2,0], '(': [1,2,2,2,1], ')': [4,2,2,2,4], "'": [2,2,0,0,0], '%': [5,1,2,4,5], '*': [0,5,2,5,0], '>': [4,2,1,2,4], '<': [1,2,4,2,1], '=': [0,7,0,7,0], '_': [0,0,0,0,7], '^': [2,7,0,0,0] };
function textW(s) { return String(s).length * 4 - 1; }
function drawText(c, s, x, y, col, outline, sc2) {
  sc2 = sc2 || 1;
  s = String(s).replace(/[¿]/g, '?').replace(/[¡]/g, '!').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  for (var pass = outline ? 0 : 1; pass < 2; pass++) {
    c.fillStyle = pass ? col : outline;
    for (var i = 0; i < s.length; i++) {
      var g = FONT[s[i]] || FONT['?'];
      for (var r = 0; r < 5; r++) for (var k = 0; k < 3; k++) if (g[r] & (4 >> k)) {
        var px = x + (i * 4 + k) * sc2, py = y + r * sc2;
        if (pass) c.fillRect(px, py, sc2, sc2);
        else { c.fillRect(px - 1, py, sc2 + 2, sc2); c.fillRect(px, py - 1, sc2, sc2 + 2); }
      }
    }
  }
}


/* ---------- iconos 9x9 de reserva y emojis 7x7 ---------- */
var ICOL = { k: '#14101f', w: '#f4ead0', y: '#ffd24a', o: '#e8743b', r: '#e04a4a', b: '#4aa8e8', g: '#5ad28a', n: '#9a6a3a', s: '#9aa0b8', p: '#c07aff', d: '#5a5a72', W: '#ffffff', l: '#2a1e2c' };
var ICONS = {
  mapa: ['kkkkkkkkk','kwwwwwwwk','kwbbwwwwk','kwwbwwrwk','kwwbbwwwk','kwwwbrrwk','kwwwwbwwk','kwwwwwwwk','kkkkkkkkk'],
  caja: ['kkkkkkkkk','knnnnnnnk','knkkkkknk','knknnnknk','knknnnknk','knknnnknk','knkkkkknk','knnnnnnnk','kkkkkkkkk'],
  radio: ['......ok.','.....ok..','kkkkkkkkk','kddddddsk','kdggddddk','kdggdbbdk','kddddbbdk','kddddddsk','kkkkkkkkk'],
  botiquin: ['..kkkkk..','.kwwwwwk.','kkkkkkkkk','kwwwrwwwk','kwwwrwwwk','kwrrrrrwk','kwwwrwwwk','kwwwrwwwk','kkkkkkkkk'],
  cuerda: ['..kkkkk..','.kyyyyyk.','kyykkkyyk','kykyyykyk','kykyokyyk','kykyyykyk','kyykkkyyk','.kyyyyyk.','..kkkkk..'],
  bateria: ['...kkk...','..kwwwk..','.kkkkkkk.','.kgggggk.','.kgggddk.','.kggdddk.','.kgdddgk.','.kkkkkkk.','.........'],
  llave: ['..kkk....','.kyyyk...','.kykyk...','.kyyyk...','..kyk....','..kyyk...','..kyk....','..kyyk...','...kk....'],
  ojo: ['.kkkkkkk.','kwwwwwwwk','kwwkkkwwk','kwkbbbkwk','kwkbkbkwk','kwkbbbkwk','kwwkkkwwk','kwwwwwwwk','.kkkkkkk.'],
  secreto: ['...kkk...','..kpppk..','.kpWWppk.','kpWppppdk','kppppppdk','.kppppdk.','..kppdk..','...kdk...','....k....'],
  info: ['..kkkkk..','kkkwwwkkk','kwwwwwwwk','kwkkkkkwk','kwwwwwwwk','kwkkkkwwk','kwwwwwwwk','kwkkkwwwk','kkkkkkkkk'],
  lampara: ['...kkk...','..kyyyk..','..kyWyk..','...kyk...','.kkkkkkk.','.ksssssk.','.kdddddk.','..kkkkk..','.........']
};
var EMO = {
  '!': ['...r...','...r...','...r...','...r...','...r...','.......','...r...'],
  '?': ['..bbb..','.b...b.','.....b.','...bb..','...b...','.......','...b...'],
  '\u2753': null, '\u2757': null, '\ud83d\udca1': ['..yyy..','.yWyyy.','.yyyyy.','..yyy..','..sss..','..sss..','...s...'],
  '\u2764': ['.rr.rr.','rrrrrrr','rrrrrrr','.rrrrr.','..rrr..','...r...','.......'],
  '\ud83d\udc4d': ['.....g.','....gg.','gg.ggg.','gggggg.','gggggg.','gggggg.','.ggg...'],
  '\ud83d\ude05': ['..bb...','.bbb...','.bbbb..','..bb...','.......','.......','.......']
};
EMO['\u2753'] = EMO['?']; EMO['\u2757'] = EMO['!']; EMO['\ud83e\udd14'] = EMO['?']; EMO['\u2764\ufe0f'] = EMO['\u2764']; EMO['\ud83d\udc99'] = EMO['\u2764']; EMO['\ud83d\ude30'] = EMO['\ud83d\ude05']; EMO['\u2705'] = EMO['\ud83d\udc4d'];
EMO['\u2026'] = null; delete EMO['\u2026'];

/* =====================================================================
   MUNDO (nivel + capas pre-renderizadas). Se construye una sola vez.
   ===================================================================== */
var World = null;
function getWorld() { return World || (World = buildWorld()); }

function buildWorld() {
  var g = new Uint8Array(LW * LH);           // 0 aire, 1 solido, 2 one-way
  g.fill(1);                                 // todo roca: el laberinto se TALLA
  var R = rng(1337);
  function inb(c, r) { return c >= 0 && c < LW && r >= 0 && r < LH; }
  function get(c, r) { return inb(c, r) ? g[r * LW + c] : 1; }
  function set(c, r, v) { if (inb(c, r)) g[r * LW + c] = v; }

  // ----- laberinto: cada tramo (60 col) son 4 alturas de suelo (TA bajo .. TD alto) unidas por escaleras de tablones,
  // con ramas ciegas, desniveles, tuneles bajos y camaras altas. Los tramos estan sellados entre si.
  var O = 0;
  function A(r0, r1, c0, c1) { for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) set(O + c, r, 0); }
  function Pl(r, c0, c1) { for (var c = c0; c <= c1; c++) set(O + c, r, 2); }
  function Rk(r0, r1, c0, c1) { for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) set(O + c, r, 1); }
  function tun(f, c0, c1, h) { A(f - (h || 4), f - 1, c0, c1); }
  function lad(f, c) { A(f - 6, f - 5, c, c + 2); Pl(f - 2, c, c + 2); Pl(f - 4, c, c + 2); Pl(f - 6, c, c + 2); }   // agujero en el suelo de arriba con tablones cada 2 filas (salvable tambien nadando)
  var LAY = [
    function () { // 1 campamento base
      A(18, 24, 3, 25); Pl(22, 18, 21); Pl(19, 22, 25);                       // caverna del campamento + escalones
      tun(TA, 26, 46); A(25, 26, 31, 33); Rk(24, 24, 42, 46); Rk(23, 23, 44, 46);   // galeria baja con foso y reptadero
      lad(TA, 38); tun(TB, 26, 56); Rk(15, 15, 41, 46); lad(TB, 49);
      tun(TC, 30, 56); Rk(12, 12, 53, 56); lad(TC, 36); tun(TD, 20, 48);
      return [[45, 23], [33, 19], [22, 7], [55, 12]];
    },
    function () { // 2 mina vieja (foso con puente del ingeniero; rodeo por la galeria B)
      tun(TA, 3, 56); A(25, 27, 28, 41); Pl(26, 39, 41);
      lad(TA, 8); tun(TB, 6, 50); A(19, 20, 25, 27); lad(TA, 44);
      lad(TB, 30); tun(TC, 18, 44);
      return [[20, 19], [52, 25], [42, 13], [34, 28]];
    },
    function () { // 3 sala de cristales (pared alta que escala la guia; el resto rodea por la galeria baja)
      tun(TA, 3, 56); lad(TA, 8); tun(TB, 6, 56); A(9, 18, 25, 35); lad(TA, 40);
      lad(TB, 46); tun(TC, 38, 56); lad(TC, 42); tun(TD, 28, 52);
      return [[22, 25], [47, 19], [54, 13], [30, 7]];
    },
    function () { // 4 galeria inundada (barrera de cristal que disuelve la medica)
      tun(TA, 3, 56); lad(TA, 22); lad(TA, 36); tun(TB, 6, 56); A(15, 18, 30, 31);
      lad(TB, 44); tun(TC, 30, 54); lad(TC, 36); tun(TD, 20, 50);
      return [[12, 19], [40, 25], [52, 13], [22, 7]];
    },
    function () { // 5 camara de Lia
      tun(TA, 3, 40); lad(TA, 10); tun(TB, 6, 56); lad(TB, 30); tun(TC, 20, 56); lad(TC, 44); tun(TD, 36, 56, 5);
      return [[30, 25], [14, 19], [24, 13], [54, 19]];
    }
  ];
  var slotsPx = [];
  for (var s = 0; s < NS; s++) {
    O = s * SECW;
    var sl = LAY[s]();
    slotsPx.push(sl.map(function (a) { return { x: (s * SECW + a[0]) * T + 8, y: a[1] * T }; }));
  }
  var Wd = { g: g, plats: [], mains: [], zones: [], ropes: [], torches: [], crystals: [], shrooms: [], puddles: [], stals: [], shafts: [], props: [], glints: [], slots: slotsPx, deco: [], pl: [], blocks: [] };
  Wd.gates = [
    { id: 'wall3', type: 'wall', c0: 2 * SECW + 30, c1: 2 * SECW + 31, r0: 13, r1: 18, keep: 16, s: 2 },
    { id: 'bridge2', type: 'bridge', c0: SECW + 28, c1: SECW + 41, row: TA, s: 1 },
    { id: 'barrier4', type: 'barrier', c0: 3 * SECW + 30, c1: 3 * SECW + 31, r0: 15, r1: 18, s: 3 }
  ];
  Wd.zones.push({ id: 'bridge2', s: 1, x: (SECW + 28) * T - 6, y: TA * T, r: 20, role: 'ing' });
  Wd.zones.push({ id: 'med4', s: 3, x: (3 * SECW + 28) * T, y: TB * T, r: 20, role: 'medica' });
  Wd.lia = { id: 'lia', x: (4 * SECW + 52) * T + 8, y: TD * T, r: 26 };
  Wd.zones.push({ id: 'lia', s: 4, x: Wd.lia.x, y: Wd.lia.y, r: 26, lia: true });

  // ----- colocacion de props sobre el suelo REAL (busca un tramo plano; si no cabe, no se pone)
  function floorOf(c, rh) { var r = rh; while (r > 1 && get(c, r) !== 0) r--; while (r < LH - 1 && get(c, r + 1) === 0) r++; return get(c, r + 1) === 1 ? r + 1 : -1; }
  function ceilOf(c, rh) { var r = rh; while (r < LH - 1 && get(c, r) !== 0) r++; while (r > 0 && get(c, r) === 0) r--; return get(c, r) === 1 ? r : -1; }
  function fits(c0, c1, row, ah) { for (var c = c0; c <= c1; c++) { if (get(c, row) !== 1) return false; for (var k = 1; k <= ah; k++) if (get(c, row - k) !== 0) return false; } return true; }
  function taken(c0, c1, row) { return Wd.pl.some(function (q) { return q.row === row && q.c1 >= c0 && q.c0 <= c1; }); }
  var PD = { tent: [2, 2], table: [1, 1], crates: [1, 2], barrel: [0, 1], sign: [1, 2], fire: [1, 1], radio: [1, 2], cart: [1, 2], altar: [1, 1], bigcrystal: [1, 2], candle: [0, 1], nest: [2, 1], lamp: [0, 3], gear: [1, 1], warn: [1, 2], rockfall: [2, 3], door: [2, 3], cutrope: [1, 3] };
  function putFloor(s, t, col, rh, a3, a4) {
    var hw = PD[t] ? PD[t][0] : 1, ah = PD[t] ? PD[t][1] : 2, gc = s * SECW + col;
    if (t === 'frame') { hw = 0; ah = Math.ceil(a4 / T) + 0; }
    for (var d = 0, k = 0; d < 20; d++, k++) {
      var cc = gc + (d % 2 ? (d + 1) >> 1 : -(d >> 1)), row = floorOf(cc, rh);
      if (row < 0) continue;
      var c0 = t === 'frame' ? cc : cc - hw, c1 = t === 'frame' ? cc + Math.ceil(a3 / T) : cc + hw;
      if (!fits(c0, c1, row, ah) || taken(c0 - 1, c1 + 1, row)) continue;
      Wd.pl.push({ t: t, s: s, c0: c0, c1: c1, row: row, cx: cc, a3: a3, a4: a4 }); return true;
    }
    return false;
  }
  var DECO = [
    [['lamp', 4, 24, 26], ['tent', 8, 24, '#c0603a'], ['table', 12, 24], ['tent', 15, 24, '#3a7a9a'], ['fire', 19, 24], ['barrel', 22, 24], ['crates', 28, 24], ['crates', 39, 24],
     ['frame', 27, 18, 32, 40], ['barrel', 36, 18], ['crates', 43, 18], ['sign', 24, 18], ['barrel', 34, 12], ['crates', 40, 12], ['lamp', 46, 12, 26], ['altar', 52, 12], ['radio', 26, 6], ['crates', 44, 6], ['rockfall', 55, 18]],
    [['barrel', 6, 24], ['rails', 10, 24, 24], ['cart', 18, 24], ['frame', 11, 24, 44, 40], ['frame', 46, 24, 52, 40], ['crates', 50, 24], ['sign', 4, 24],
     ['frame', 14, 18, 32, 40], ['barrel', 22, 18], ['crates', 36, 18], ['lamp', 40, 18, 26], ['frame', 22, 12, 32, 36], ['crates', 27, 12], ['altar', 40, 12], ['door', 55, 24]],
    [['bigcrystal', 12, 24, 22], ['bigcrystal', 24, 24, 16], ['bigcrystal', 48, 24, 18], ['bigcrystal', 14, 18, 16], ['bigcrystal', 27, 18, 26], ['bigcrystal', 45, 18, 18], ['bigcrystal', 50, 12, 20], ['bigcrystal', 41, 12, 14],
     ['bigcrystal', 34, 6, 16], ['hcrystal', 30, 20, 22], ['hcrystal', 20, 22, 18], ['hcrystal', 42, 10, 24], ['hcrystal', 33, 12, 30], ['hcrystal', 8, 22, 18], ['altar', 31, 6], ['crates', 6, 24], ['rockfall', 55, 18]],
    [['chain', 11, 16, 5], ['chain', 38, 16, 4], ['gear', 16, 18], ['barrel', 19, 18], ['crates', 48, 18], ['barrel', 52, 24], ['lamp', 20, 24, 26], ['lamp', 28, 18, 16], ['crates', 34, 12], ['barrel', 44, 12], ['lamp', 40, 12, 20], ['altar', 24, 6], ['crates', 30, 6], ['cutrope', 55, 18], ['sign', 5, 24]],
    [['lamp', 4, 24, 26], ['barrel', 12, 24], ['crates', 18, 18], ['nest', 52, 6], ['candle', 47, 6], ['candle', 57, 6], ['crates', 38, 6], ['barrel', 40, 6], ['sign', 3, 6], ['altar', 42, 6], ['bigcrystal', 20, 12, 14], ['bigcrystal', 36, 12, 12], ['bigcrystal', 50, 18, 14], ['barrel', 30, 24]]
  ];
  var FALLS = [[], [[31, 22]], [], [[16, 17], [40, 11], [46, 17], [20, 23]], []];
  DECO.forEach(function (list, s) {
    list.forEach(function (a) {
      var t = a[0];
      if (t === 'rails') { var c0 = s * SECW + a[1], rw = floorOf(c0, a[2] - 1); var c1 = c0 + 14; if (rw >= 0 && fits(c0, c1, rw, 1) && !taken(c0, c1, rw)) Wd.pl.push({ t: 'rails', s: s, c0: c0, c1: c1, row: rw }); return; }
      if (t === 'hcrystal' || t === 'chain') {
        for (var d = 0; d < 8; d++) { var cc = s * SECW + a[1] + (d % 2 ? (d + 1) >> 1 : -(d >> 1)), cr = ceilOf(cc, a[2]); if (cr < 0) continue; var ok = true; for (var k = 1; k <= 3; k++) if (get(cc, cr + k) !== 0) ok = false;
          if (ok) { Wd.pl.push({ t: t, s: s, c0: cc, c1: cc, row: cr, cx: cc, a3: a[3] }); return; } }
        return;
      }
      putFloor(s, t, a[1], a[2] - 1, a[3], a[4]);
    });
  });
  Wd.falls = [];
  FALLS.forEach(function (list, s) { list.forEach(function (a) { var c = s * SECW + a[0], cr = ceilOf(c, a[1]), fr = floorOf(c, a[1]); if (cr >= 0 && fr >= 0) Wd.falls.push({ x: c * T + 8, y: (cr + 1) * T, yb: fr * T, w: 5, s: s }); }); });
  // antorchas automaticas sobre suelo plano (separadas)
  for (s = 0; s < NS; s++) {
    var lastT = {};
    for (var cc = 5; cc < 56; cc++) for (var rr0 = 4; rr0 <= LH - 2; rr0++) {
      var gc2 = s * SECW + cc;
      if (get(gc2, rr0) !== 1 || get(gc2, rr0 - 1) !== 0 || get(gc2, rr0 - 2) !== 0 || get(gc2, rr0 - 3) !== 0 || get(gc2 - 1, rr0) !== 1 || get(gc2 + 1, rr0) !== 1) continue;
      if (hash(gc2, rr0, 77) > 0.16 || (lastT[rr0] !== undefined && cc - lastT[rr0] < 8) || taken(gc2 - 1, gc2 + 1, rr0)) continue;
      if (slotsPx[s].some(function (q) { return Math.abs(q.x - gc2 * T - 8) < 20 && Math.abs(q.y - rr0 * T) < 8; })) continue;
      lastT[rr0] = cc; Wd.torches.push({ x: gc2 * T + 8, y: rr0 * T, s: s, ph: R() * 6 });
    }
  }
  Wd.torches.forEach(function (t) { Wd.pl.push({ t: 'torchmark', s: t.s, c0: (t.x >> 4) - 1, c1: (t.x >> 4) + 1, row: t.y / T }); });
  // superficies: cristales, setas, estalactitas, charcos (sin pisar props)
  for (var cx = 2; cx < LW - 2; cx++) {
    var sec = Math.min(NS - 1, Math.floor(cx / SECW));
    for (var ry = 2; ry < LH - 1; ry++) {
      var t0 = get(cx, ry);
      if (t0 !== 1 && t0 !== 2) continue;
      var above = get(cx, ry - 1), below = get(cx, ry + 1);
      var hh = hash(cx, ry, 11), nearSlot = slotsPx[sec].some(function (q) { return Math.abs(q.x - cx * T - 8) < 24 && Math.abs(q.y - ry * T) < 8; });
      if (nearSlot || taken(cx - 1, cx + 1, ry)) continue;
      if (above === 0 && t0 === 1 && get(cx, ry - 2) === 0) {
        if (hh < 0.07) Wd.crystals.push({ x: cx * T + 3 + (hash(cx, ry, 12) * 10 | 0), y: ry * T, s: sec, sz: 5 + (hash(cx, ry, 13) * 8 | 0), seed: cx * 31 + ry });
        else if (hh < 0.12) Wd.shrooms.push({ x: cx * T + 4 + (hash(cx, ry, 14) * 8 | 0), y: ry * T, s: sec, seed: cx * 7 + ry });
        else if (ry >= TA && hh < 0.28) { var pw = 2 + (hash(cx, ry, 15) * 3 | 0); Wd.puddles.push({ x: cx * T, y: ry * T, w: pw * T, s: sec }); cx += pw; break; }
        else if (hh < 0.2) Wd.props.push({ t: 'rubble', x: cx * T + (hash(cx, ry, 16) * 12 | 0), y: ry * T, s: sec });
      }
      if (below === 0 && t0 === 1 && hash(cx, ry, 17) < 0.3 && get(cx, ry + 2) === 0) {
        var len = 1 + (hash(cx, ry, 18) * 3 | 0);
        Wd.stals.push({ x: cx * T + 8, y: (ry + 1) * T, len: len * T - 4, s: sec, drip: len > 1 && hash(cx, ry, 19) < 0.55, ph: hash(cx, ry, 20) * 400 });
      }
    }
  }
  // rayos de luz desde techos altos (nacen en el techo real de una camara alta)
  for (s = 0; s < NS; s++) [10, 30, 46].forEach(function (a, i) {
    for (var d = 0; d < 6; d++) { var c = s * SECW + a + d; for (var r = 1; r < LH - 8; r++) if (get(c, r) === 0 && get(c, r - 1) === 1) { if (get(c, r + 5) === 0 && get(c + 2, r + 2) === 0) { Wd.shafts.push({ x: c * T, y: r * T, w: 22 + R() * 14, s: s, ph: R() * 6 }); d = 99; } break; } }
  });
  Wd.ceilH = [];
  for (var c3 = 0; c3 < LW; c3++) { var r3 = 0; while (r3 < LH && get(c3, r3) !== 0) r3++; Wd.ceilH[c3] = r3; }

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
  var CS = 9, GW = Math.ceil(PW / CS) + 2, GH = Math.ceil(PH / CS) + 2, fxA = new Float32Array(GW * GH), fyA = new Float32Array(GW * GH), brA = new Float32Array(GW * GH);
  for (var gy2 = 0; gy2 < GH; gy2++) for (var gx2 = 0; gx2 < GW; gx2++) { var gi = gy2 * GW + gx2; fxA[gi] = (gx2 + 0.15 + hash(gx2, gy2, 31) * 0.7) * CS; fyA[gi] = (gy2 + 0.15 + hash(gx2, gy2, 32) * 0.7) * CS; brA[gi] = 0.86 + hash(gx2, gy2, 33) * 0.28; }
  var cv = canvasOf(PW, PH), cx = cv.getContext('2d'), img = cx.createImageData(PW, PH), d = img.data;
  var OUT = DARK;
  for (y = 0; y < PH; y++) for (x = 0; x < PW; x++) {
    i = y * PW + x; if (!m[i]) continue;
    var th = tc[x], e = Math.min(dU[i], dD[i], dL[i], dR[i]), col;
    var base = th.rock;
    var strata = Math.sin(y * 0.42 + Math.sin(x * 0.05) * 3 + Math.sin(x * 0.013) * 5) > 0.82 ? 1.1 : 1;
    var gcx = (x / CS) | 0, gcy = (y / CS) | 0, d1 = 1e9, d2 = 1e9, b1 = 1, f1y = 0;
    for (var vy = -1; vy <= 1; vy++) for (var vx = -1; vx <= 1; vx++) { var vi = (gcy + vy + 1 > 0 ? gcy + vy : 0) * GW + (gcx + vx > 0 ? gcx + vx : 0), ddx = fxA[vi] - x, ddy = fyA[vi] - y, dd = ddx * ddx + ddy * ddy; if (dd < d1) { d2 = d1; d1 = dd; b1 = brA[vi]; f1y = ddy; } else if (dd < d2) d2 = dd; }
    var seam = Math.sqrt(d2) - Math.sqrt(d1), nz = b1 * (0.97 + hash(x, y, 7) * 0.06) * (1 + f1y * 0.012);
    if (seam < 1.2) nz *= 0.62; else if (seam < 2.2) nz *= 0.88;
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
  buildDeco(Wd, dc, m, dU, dD, dL, dR, tc);
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

/* =====================================================================
   DECORACION POR TRAMO + vegetacion/raices (pre-renderizada) y lista de animados
   ===================================================================== */
function R_(c, col, x, y, w, h) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); }
function outlineBox(c, x, y, w, h, fill, hi, lo) { R_(c, '#14101f', x - 1, y - 1, w + 2, h + 2); R_(c, fill, x, y, w, h); if (hi) R_(c, hi, x, y, w, 1); if (lo) R_(c, lo, x, y + h - 1, w, 1); }
var PROP = {
  tent: function (c, x, y, col) { var hi = rgb(mix(hex(col), [255, 255, 255], 0.3)), lo = rgb(mix(hex(col), DARK, 0.45));
    for (var i = 0; i < 17; i++) { var hw = Math.floor(i * 0.72) + 1, yy = y - 17 + i; R_(c, '#14101f', x - hw - 1, yy, hw * 2 + 3, 1); R_(c, col, x - hw, yy, hw, 1); R_(c, lo, x, yy, hw + 1, 1); R_(c, hi, x - hw, yy, 1, 1); }
    R_(c, '#14101f', x - 3, y - 8, 7, 8); R_(c, '#2a1a24', x - 2, y - 7, 5, 7); R_(c, '#e8d6a0', x, y - 20, 1, 4); R_(c, '#e0e0e0', x + 1, y - 20, 4, 2); },
  fire: function (c, x, y) { for (var i = 0; i < 6; i++) R_(c, i % 2 ? '#6a6a7a' : '#8a8a9a', x - 7 + i * 3, y - 2 - (i === 0 || i === 5 ? 0 : 1), 3, 2); R_(c, '#14101f', x - 6, y - 4, 13, 1); outlineBox(c, x - 5, y - 4, 10, 3, '#6a4630', '#9a6a42', '#3a2418'); R_(c, '#3a2418', x - 4, y - 5, 8, 2); },
  crates: function (c, x, y) { outlineBox(c, x - 8, y - 11, 11, 11, '#9a6a3a', '#c28a50', '#5a3a24'); R_(c, '#5a3a24', x - 8, y - 6, 11, 1); R_(c, '#5a3a24', x - 3, y - 11, 1, 11); outlineBox(c, x + 2, y - 8, 9, 8, '#8a5a30', '#b57c4a', '#4a2c1c'); R_(c, '#d8cdb8', x + 5, y - 6, 3, 2); outlineBox(c, x - 4, y - 19, 9, 8, '#a87848', '#d49a5a', '#5a3a24'); },
  barrel: function (c, x, y) { outlineBox(c, x - 4, y - 11, 9, 11, '#7a4a2a', '#b07040', '#3a2014'); R_(c, '#3a3a4a', x - 4, y - 8, 9, 1); R_(c, '#3a3a4a', x - 4, y - 3, 9, 1); R_(c, '#d8c8a8', x - 2, y - 11, 5, 1); },
  table: function (c, x, y) { R_(c, '#14101f', x - 9, y - 10, 19, 3); R_(c, '#8a5a3a', x - 8, y - 10, 17, 2); R_(c, '#b57c4a', x - 8, y - 10, 17, 1); outlineBox(c, x - 7, y - 8, 2, 8, '#6a4630'); outlineBox(c, x + 5, y - 8, 2, 8, '#6a4630'); R_(c, '#e8d6a0', x - 4, y - 12, 8, 2); R_(c, '#c04a3a', x + 1, y - 12, 2, 1); R_(c, '#6a8ab0', x - 3, y - 12, 3, 1); },
  sign: function (c, x, y) { R_(c, '#14101f', x - 1, y - 20, 4, 20); R_(c, '#6a4630', x, y - 20, 2, 20); outlineBox(c, x - 7, y - 19, 14, 6, '#9a6a3a', '#c28a50', '#5a3a24'); R_(c, '#e8d070', x - 4, y - 17, 8, 1); R_(c, '#e8d070', x + 3, y - 18, 1, 3); },
  post: function (c, x, y, h) { R_(c, '#14101f', x - 2, y - h, 5, h); R_(c, '#6a4630', x - 1, y - h, 3, h); R_(c, '#9a6a42', x - 1, y - h, 1, h); },
  frame: function (c, x, y, w, h) { PROP.post(c, x, y, h); PROP.post(c, x + w, y, h); outlineBox(c, x - 4, y - h - 4, w + 9, 4, '#7a5538', '#b07a48', '#3a2418');
    for (var i = 0; i < 5; i++) { R_(c, '#14101f', x + 3 + i, y - h + i, 2, 1); R_(c, '#14101f', x + w - 4 - i, y - h + i, 2, 1); } R_(c, '#a67c48', x + 3, y - h, 1, 1); R_(c, '#a67c48', x + w - 3, y - h, 1, 1);
    var mx = x + (w >> 1);   // farol COLGADO del centro de la viga: argolla, cadena y caja con cristal
    R_(c, '#14101f', mx - 1, y - h - 1, 3, 2); R_(c, '#9a9ab0', mx, y - h - 1, 1, 1);
    for (var j = 0; j < 4; j++) { R_(c, '#14101f', mx - 1, y - h + j * 2, 3, 2); R_(c, j % 2 ? '#7a7a90' : '#a0a0b8', mx, y - h + j * 2, 1, 2); }
    R_(c, '#14101f', mx - 4, y - h + 7, 9, 10); R_(c, '#3a3a4a', mx - 3, y - h + 8, 7, 8); R_(c, '#5a5a6e', mx - 3, y - h + 8, 7, 1); R_(c, '#ffd880', mx - 2, y - h + 9, 5, 6); R_(c, '#fff4c0', mx - 1, y - h + 10, 3, 3); R_(c, '#3a3a4a', mx, y - h + 9, 1, 6); },
  rails: function (c, x0, x1, y) { R_(c, '#14101f', x0, y - 3, x1 - x0, 3); for (var x = x0; x < x1; x += 4) R_(c, '#6a4630', x, y - 2, 2, 2); R_(c, '#8a8aa0', x0, y - 3, x1 - x0, 1); R_(c, '#4a4a5e', x0, y - 1, x1 - x0, 1); },
  cart: function (c, x, y) { outlineBox(c, x - 8, y - 12, 17, 8, '#5a5a70', '#9a9ab8', '#34344a'); R_(c, '#7a5a3a', x - 8, y - 9, 17, 1); for (var i = 0; i < 6; i++) R_(c, i % 2 ? '#7fd0ff' : '#b8f0ff', x - 6 + i * 3, y - 15 + (i % 3), 2, 3 - (i % 2));
    [-5, 5].forEach(function (o) { R_(c, '#14101f', x + o - 2, y - 5, 5, 5); R_(c, '#7a7a90', x + o - 1, y - 4, 3, 3); R_(c, '#14101f', x + o, y - 3, 1, 1); }); },
  pipe: function (c, x0, x1, y) { R_(c, '#14101f', x0, y - 1, x1 - x0, 6); R_(c, '#5a6a78', x0, y, x1 - x0, 4); R_(c, '#8aa0b0', x0, y, x1 - x0, 1); R_(c, '#3a4654', x0, y + 3, x1 - x0, 1); for (var x = x0 + 12; x < x1; x += 22) { R_(c, '#14101f', x - 1, y - 2, 5, 8); R_(c, '#7a5a3a', x, y - 1, 3, 6); } },
  chain: function (c, x, y0, y1) { for (var y = y0; y < y1; y += 3) { R_(c, '#14101f', x - 1, y, 3, 3); R_(c, y % 2 ? '#7a7a90' : '#a0a0b8', x, y, 1, 2); } },
  gear: function (c, x, y) { R_(c, '#14101f', x - 7, y - 14, 15, 14); R_(c, '#7a4a30', x - 6, y - 13, 13, 12); R_(c, '#a06a40', x - 6, y - 13, 13, 1); for (var a = 0; a < 8; a++) { var q = a * Math.PI / 4; R_(c, '#a06a40', x + Math.round(Math.cos(q) * 6), y - 7 + Math.round(Math.sin(q) * 6), 2, 2); } R_(c, '#14101f', x - 2, y - 9, 5, 5); },
  candle: function (c, x, y) { R_(c, '#14101f', x - 2, y - 7, 5, 7); R_(c, '#efe6cc', x - 1, y - 6, 3, 6); R_(c, '#fff', x - 1, y - 6, 1, 6); R_(c, '#6a3a20', x, y - 8, 1, 2); },
  nest: function (c, x, y) { for (var i = 0; i < 9; i++) { var rw = 4 + (hash(i, 3, 1) * 5 | 0); outlineBox(c, x - 22 + i * 5, y - 3 - (i % 3), rw, 3 + (i % 3), rgb(mix([110, 90, 100], [160, 140, 150], hash(i, 5, 2))), '#b8a8b0'); }
    outlineBox(c, x - 13, y - 5, 28, 3, '#6b4a9e', '#8a66c4', '#3a2a5e'); R_(c, '#d8c0ff', x - 12, y - 5, 5, 1); },
  altar: function (c, x, y) { outlineBox(c, x - 6, y - 5, 13, 5, '#5a4a6e', '#8a7aa0', '#2a2038'); outlineBox(c, x - 4, y - 8, 9, 3, '#6a5a80', '#9a8ab4', '#34283e'); },
  radio: function (c, x, y) { PROP.table(c, x, y); outlineBox(c, x - 6, y - 19, 10, 7, '#4a4a5e', '#8a8aa6', '#2a2a3a'); R_(c, '#1c2a24', x - 5, y - 18, 5, 4); R_(c, '#3a8a5a', x - 4, y - 17, 3, 2); R_(c, '#a05040', x + 1, y - 18, 2, 2); R_(c, '#8a8aa6', x + 3, y - 28, 1, 9); R_(c, '#8a8aa6', x + 2, y - 28, 3, 1); },
  bigcrystal: function (c, x, y, sz, col) { drawCrystal(c, x, y, sz, col, rng(x * 7 + y)); drawCrystal(c, x + 7, y, sz * 0.6, col, rng(x * 3 + y)); drawCrystal(c, x - 8, y, sz * 0.5, col, rng(x * 5 + y)); },
  hcrystal: function (c, x, y, len, col) { var dark = mix(col, DARK, 0.5), body = mix(col, DARK, 0.1), lt = mix(col, [255, 255, 255], 0.5);
    for (var j = 0; j < len; j++) { var hw = Math.max(0, Math.round(3 * (1 - j / len) + 0.4)); R_(c, '#12101e', x - hw - 1, y + j, hw * 2 + 3, 1); R_(c, rgb(j < len * 0.3 ? body : lt), x - hw, y + j, hw * 2 + 1, 1); R_(c, rgb(dark), x + hw, y + j, 1, 1); } R_(c, '#12101e', x, y + len, 1, 1); },
  lamp: function (c, x, y, h) { R_(c, '#14101f', x - 1, y - h, 3, h); R_(c, '#4a4a5e', x, y - h, 1, h); R_(c, '#14101f', x - 5, y - h - 1, 11, 3); R_(c, '#6a6a80', x - 4, y - h, 9, 1);
    R_(c, '#14101f', x - 4, y - h - 9, 9, 9); R_(c, '#3a3a4a', x - 3, y - h - 8, 7, 7); R_(c, '#ffd880', x - 2, y - h - 7, 5, 5); R_(c, '#fff4c0', x - 1, y - h - 6, 3, 3); R_(c, '#3a3a4a', x, y - h - 8, 1, 7); R_(c, '#14101f', x - 2, y - h - 10, 5, 1); },
  rockfall: function (c, x, y) {
    for (var yy = 0; yy < 46; yy++) { var hw = Math.round(40 * Math.pow(1 - yy / 48, 0.75)), py = y - yy - 1;
      R_(c, '#14101f', x - hw - 1, py, hw * 2 + 3, 1);
      for (var xx = -hw; xx <= hw; xx += 2) { var hv = hash(xx + x, yy, 91), col = hv < 0.25 ? '#5a4650' : hv < 0.6 ? '#76606a' : hv < 0.85 ? '#8c7480' : '#4a3a46'; R_(c, col, x + xx, py, 2, 1); } }
    for (var i = 0; i < 9; i++) { var bx = x - 36 + hash(i, 3, 92) * 72, bw = 5 + (hash(i, 4, 92) * 8 | 0), by = y - 4 - hash(i, 5, 92) * 26; outlineBox(c, bx, by, bw, bw - 1, '#8a7480', '#b09aa6', '#4a3a46'); }
    R_(c, '#14101f', x - 16, y - 30, 16, 3); R_(c, '#7a5538', x - 15, y - 29, 14, 1); R_(c, '#14101f', x + 8, y - 40, 3, 22); R_(c, '#7a5538', x + 9, y - 39, 1, 20);
    PROP.warn(c, x - 46, y, 'SIN PASO'); },
  warn: function (c, x, y, txt) { var w = textW(txt) + 7; R_(c, '#14101f', x - 1, y - 18, 3, 18); R_(c, '#6a4630', x, y - 18, 1, 18); outlineBox(c, x - (w >> 1), y - 29, w, 11, '#d8c070', '#f0e0a0', '#8a7430'); R_(c, '#14101f', x - (w >> 1), y - 29, w, 1);
    drawText(c, txt, x - (w >> 1) + 3, y - 26, '#3a1a10'); R_(c, '#c04a3a', x - (w >> 1) + 1, y - 27, 1, 7); R_(c, '#c04a3a', x + (w >> 1) - 1, y - 27, 1, 7); },
  door: function (c, x, y) {
    outlineBox(c, x - 18, y - 46, 36, 46, '#4a4a5e', '#8a8aa6', '#2a2a3a'); outlineBox(c, x - 14, y - 42, 28, 42, '#5a5a70', '#9a9ab8', '#34344a');
    for (var i = 0; i < 4; i++) { R_(c, '#34344a', x - 14, y - 36 + i * 10, 28, 1); R_(c, '#d8cdb8', x - 12, y - 39 + i * 10, 1, 1); R_(c, '#d8cdb8', x + 11, y - 39 + i * 10, 1, 1); }
    for (var k = 0; k < 28; k++) { R_(c, '#14101f', x - 14 + k, y - 30 + Math.round(k * 0.5), 1, 3); R_(c, '#a0a0b8', x - 14 + k, y - 30 + Math.round(k * 0.5), 1, 1); }
    outlineBox(c, x - 3, y - 22, 7, 7, '#c9a03a', '#f0d070', '#7a5a1a'); R_(c, '#14101f', x - 1, y - 20, 3, 3);
    PROP.warn(c, x - 40, y, 'CERRADO'); },
  cutrope: function (c, x, y) {
    for (var yy = y - 66; yy < y - 24; yy += 2) { R_(c, '#14101f', x - 1 + (yy % 4 ? 0 : 1), yy, 3, 2); R_(c, (yy >> 2) & 1 ? '#c9a064' : '#a67c48', x + (yy % 4 ? 0 : 1), yy, 1, 2); }
    R_(c, '#a67c48', x - 2, y - 24, 1, 3); R_(c, '#a67c48', x + 2, y - 23, 1, 3); R_(c, '#d8c8a8', x, y - 22, 1, 2);
    R_(c, '#14101f', x - 26, y - 6, 22, 7); R_(c, '#8a5a3a', x - 25, y - 5, 20, 5); R_(c, '#b57c4a', x - 25, y - 5, 20, 1); R_(c, '#3d2620', x - 15, y - 4, 1, 4);
    R_(c, '#14101f', x + 6, y - 9, 18, 10); R_(c, '#8a7480', x + 7, y - 8, 16, 8); R_(c, '#b09aa6', x + 7, y - 8, 16, 1);
    PROP.warn(c, x + 36, y, 'CUERDA CORTADA'); }
};
var BIOME = [
  { veg: [96, 160, 74], veg2: [200, 220, 90], flow: [255, 200, 90], fly: '255,235,120' },
  { veg: [120, 200, 190], veg2: [210, 250, 250], flow: [200, 250, 255], fly: '150,255,240' },
  { veg: [170, 130, 230], veg2: [230, 200, 255], flow: [255, 160, 240], fly: '230,160,255' },
  { veg: [60, 160, 150], veg2: [120, 220, 200], flow: [140, 210, 255], fly: '130,220,255' },
  { veg: [160, 175, 80], veg2: [255, 220, 120], flow: [255, 120, 110], fly: '255,210,140' }
];
function buildDeco(Wd, dc, m, dU, dD, dL, dR, tc) {
  var x, y, i, R = rng(4242);
  // hierba / liquen / flores en superficies superiores; raices y goteras bajo los techos; enredaderas en paredes
  for (x = 3; x < PW - 3; x++) for (y = 3; y < PH - 2; y++) {
    i = y * PW + x; if (!m[i]) continue;
    var sec = Math.min(NS - 1, Math.floor(x / SPW)), B = BIOME[sec];
    if (dU[i] === 1 && R() < 0.3) { // brizna en lo alto
      var h = 1 + (R() * 3 | 0), cc = mix(B.veg, [255, 255, 255], R() * 0.35);
      for (var q = 0; q < h; q++) R_(dc, rgb(mix(cc, DARK, q === h - 1 ? 0 : 0.15)), x + (q > 1 ? (R() < 0.5 ? 1 : -1) : 0), y - 1 - q, 1, 1);
      if (R() < 0.05) { R_(dc, rgb(B.flow), x, y - 2 - h, 1, 1); R_(dc, rgb(B.veg2), x, y - 1 - h, 1, 1); }
    }
    if (dD[i] === 1 && R() < 0.035) { // raiz / liana colgante
      var len = 5 + (R() * 20 | 0), ph = R() * 6, root = R() < 0.6;
      for (var j = 1; j <= len; j++) R_(dc, root ? (j % 5 ? '#4a3228' : '#6a4a38') : rgb(mix(B.veg, DARK, 0.45 + j / len * 0.3)), x + Math.round(Math.sin(j * 0.3 + ph) * 1.3), y + j, 1, 1);
      if (!root) for (j = 3; j < len; j += 4) R_(dc, rgb(B.veg), x + Math.round(Math.sin(j * 0.3 + ph) * 1.3) + 1, y + j, 1, 1);
    }
    if ((dR[i] === 1 || dL[i] === 1) && R() < 0.012 && dU[i] > 3) { // enredadera lateral
      var dir = dR[i] === 1 ? 1 : -1, ln = 4 + (R() * 10 | 0);
      for (j = 1; j <= ln; j++) R_(dc, rgb(mix(B.veg, DARK, 0.35)), x + dir * (1 + (j % 3 === 0 ? 1 : 0)), y + Math.round(j * 0.8), 1, 1);
    }
  }
  // grietas y vetas minerales (sobre la roca)
  for (var n = 0; n < 420; n++) {
    var cx0 = 8 + (R() * (PW - 16) | 0), cy0 = 20 + (R() * (PH - 60) | 0); if (!m[cy0 * PW + cx0] || dU[cy0 * PW + cx0] < 4 || dD[cy0 * PW + cx0] < 4) continue;
    var sx = cx0, sy = cy0, vein = R() < 0.3, vc = vein ? rgb(mix(THEMES[Math.min(NS - 1, Math.floor(cx0 / SPW))].crystal, [30, 20, 40], 0.35)) : '#1a1224';
    for (var s2 = 0; s2 < 6 + (R() * 12 | 0); s2++) { if (!m[sy * PW + sx]) break; R_(dc, vc, sx, sy, 1, 1); sx += R() < 0.5 ? 1 : 0; sy += R() < 0.7 ? 1 : (R() < 0.5 ? -1 : 0); if (vein && R() < 0.08) R_(dc, rgb(THEMES[Math.min(NS - 1, Math.floor(cx0 / SPW))].crystal), sx, sy, 1, 1); }
  }
  // props ya colocados sobre suelo real (Wd.pl): dibujo + animados
  Wd.anim = [];
  Wd.pl.forEach(function (q) {
    var t = q.t, th = THEMES[q.s], x0 = q.cx * T + 8, y0 = q.row * T, f = PROP[t];
    if (t === 'torchmark') return;
    if (t === 'rails') { f(dc, q.c0 * T, q.c1 * T, y0); return; }
    if (t === 'chain') { var cy0 = (q.row + 1) * T - 1; f(dc, x0, cy0, cy0 + 3 * T - 6); return; }
    if (t === 'hcrystal') { var cy2 = (q.row + 1) * T; f(dc, x0, cy2, q.a3, th.crystal); Wd.anim.push({ t: 'glow', x: x0, y: cy2 + q.a3 * 0.6, r: 26, c: th.crystal, s: q.s, ph: q.cx }); return; }
    if (t === 'bigcrystal') { f(dc, x0, y0, q.a3, th.crystal); Wd.anim.push({ t: 'glow', x: x0, y: y0 - q.a3 * 0.6, r: 34 + q.a3, c: th.crystal, s: q.s, ph: q.cx }); return; }
    if (t === 'frame') { f(dc, q.cx * T, y0, q.a3, q.a4); Wd.anim.push({ t: 'lantern', x: q.cx * T + (q.a3 >> 1) + 0.5, y: y0 - q.a4 + 12, s: q.s, ph: q.cx, gx: q.cx * T + (q.a3 >> 1), gy: y0 - q.a4 + 9 }); return; }
    if (t === 'lamp') { f(dc, x0, y0, q.a3); Wd.anim.push({ t: 'lantern', x: x0 + 0.5, y: y0 - q.a3 - 5, s: q.s, ph: q.cx, gx: x0, gy: y0 - q.a3 - 7 }); return; }
    if (t === 'fire') { f(dc, x0, y0); Wd.anim.push({ t: 'fire', x: x0, y: y0 - 4, s: q.s }); return; }
    if (t === 'candle') { f(dc, x0, y0); Wd.anim.push({ t: 'candle', x: x0, y: y0 - 8, s: q.s, ph: q.cx }); return; }
    if (t === 'altar') { f(dc, x0, y0); Wd.anim.push({ t: 'glow', x: x0, y: y0 - 12, r: 26, c: [210, 150, 255], s: q.s, ph: q.cx }); return; }
    if (t === 'rockfall' || t === 'door') { Wd.blocks.push({ s: q.s, x: x0, y: y0, t: t }); }
    if (t === 'rockfall' && q.s === 3) Wd.anim.push({ t: 'glow', x: x0, y: y0 - 20, r: 36, c: [255, 220, 170], s: q.s, ph: 3 });
    f(dc, x0, y0, q.a3, q.a4);
  });
  Wd.falls.forEach(function (a) { Wd.anim.push({ t: 'fall', x: a.x, y: a.y, yb: a.yb, w: a.w, s: a.s }); });
  // luciernagas en celdas de aire reales
  Wd.flies = []; for (var s = 0; s < NS; s++) for (var q2 = 0; q2 < 26; q2++) { var fc = 3 + (R() * 54 | 0), fr = 3 + (R() * (LH - 6) | 0); if (Wd.g[fr * LW + s * SECW + fc] === 0 && Wd.g[(fr + 1) * LW + s * SECW + fc] === 0) Wd.flies.push({ x: (s * SECW + fc) * T + 8, y: fr * T + 8, ph: R() * 6, sp: 0.4 + R() * 0.8, s: s }); }
  // haces de luz extra y niebla del suelo
  var mist = canvasOf(160, 28), mc = mist.getContext('2d');
  for (i = 0; i < 7; i++) { var gx = 12 + i * 22, gy = 12 + (i % 3) * 3, g = mc.createRadialGradient(gx, gy, 0, gx, gy, 26); g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); mc.fillStyle = g; mc.save(); mc.translate(gx, gy); mc.scale(1.6, 0.45); mc.translate(-gx, -gy); mc.fillRect(gx - 30, gy - 30, 60, 60); mc.restore(); }
  Wd.mist = mist;
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
        else { c.fillStyle = col; c.fillRect(x, BGH - h, 1, h); c.fillStyle = rim; c.fillRect(x, BGH - h, 1, 1); }
      }
    }
    var far = canvasOf(P, BGH), fc = far.getContext('2d');
    var cFar = rgb(mix([30, 26, 56], th.amb, 0.25)), rFar = rgb(mix([54, 48, 90], th.rim, 0.12));
    ridge(fc, cFar, rFar, true, 18, 56, 128, 160, 20, true);
    ridge(fc, cFar, rFar, false, 22, 46, 160, 80, 55, true);
    // luciernagas / liquen lejano
    for (var q = 0; q < 46; q++) { fc.fillStyle = rgb(th.crystal, 0.35 + R() * 0.4); fc.fillRect(R() * P | 0, 40 + R() * 150 | 0, 1, 1); }
    var mid = canvasOf(P, BGH), mc = mid.getContext('2d');
    var cMid = rgb(mix([42, 36, 74], th.amb, 0.3)), rMid = rgb(mix([78, 68, 116], th.rim, 0.2));
    // pilares
    var pil = 5;
    for (q = 0; q < pil; q++) {
      var px = q * (P / pil) + (R() * 30 | 0), pw = 16 + (R() * 18 | 0), bulge = 4 + (R() * 6 | 0);
      for (var y = 0; y < BGH; y++) {
        var wv = pw + Math.round(Math.sin(y * 0.07 + q) * 3 + bulge * Math.pow(Math.abs(y - BGH / 2) / (BGH / 2), 2));
        mc.fillStyle = cMid; mc.fillRect(px - (wv >> 1), y, wv, 1);
        mc.fillStyle = rMid; mc.fillRect(px - (wv >> 1), y, 2, 1);
        mc.fillStyle = rgb(mix([20, 16, 40], th.amb, 0.5)); mc.fillRect(px + (wv >> 1) - 2, y, 2, 1);
      }
    }
    ridge(mc, cMid, rMid, true, 10, 46, 80, 64, 10, true);
    ridge(mc, cMid, rMid, false, 14, 36, 64, 128, 40, true);
    for (q = 0; q < 30; q++) { var cx0 = R() * P | 0, cy0 = 150 + R() * 100 | 0; mc.fillStyle = rgb(th.crystal, 0.9); mc.fillRect(cx0, cy0, 1, 3); mc.fillRect(cx0 + 1, cy0 + 1, 1, 2); }
    var near = canvasOf(P, BGH), nc = near.getContext('2d');
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
function waterY(level) { return PH + 4 - level * 3.6; }   // 10%: justo bajo el fondo de los fosos; 23%: cubre el suelo bajo (TA); 100%: casi la galeria alta (TD queda seca)
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
  var SIM = false, active = ROLES.indexOf(opts.localRole) >= 0 ? opts.localRole : ROLES.indexOf(opts.localId) >= 0 ? opts.localId : 'guia';
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
  ['player_guia', 'player_medica', 'player_ing', 'lia', 'props', 'poi_icons', 'icons'].forEach(loadImg);
  function sheet(name) { var im = imgs[name]; return im && im.ok && assets.meta && assets.meta[name] ? im : null; }

  function st() { return opts.getState ? opts.getState() : null; }
  function spawnOf(s, k) { return { x: s * SPW + 5 * T + 8 + (k || 0) * 16, y: TA * T }; }

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
  function sfx(n, b) { if (!SIM && opts.onSfx) opts.onSfx(n, b ? b.id : null); }
  function physStep(b, inp, dir, jp, inW, onG) {
    var wy = waterY(wlCur);
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
        var nearTop = (b.y - HH) - wy < 10;
        b.vy = nearTop ? -5.2 : -2.4; b.swimCd = 10; addRipple(b.x, 1.4); bubbles(b.x, b.y - 8, 3); sfx('swim', b);
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
  }
  function tickBody(b) {
    var inp = b.bot ? botBrain(b) : (inputs[b.id] || NOINP); b.inp = inp;
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
    physStep(b, inp, dir, jp, inW, onG);
    if (b.y > PH + 40 || b.x < 0 || b.x > PW) { b.x = b.safeX; b.y = b.safeY; b.vx = b.vy = 0; }
    // interaccion
    if (b.interT > 0) b.interT--;
    var pn = poiNear(b); if (ip && pn && !b.bot) usePoi(b, pn);
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
  function setCells(gt, v) { navDirty(); for (var c = gt.c0; c <= gt.c1; c++) for (var r = gt.r0; r <= gt.r1; r++) dyn[r * LW + c] = v; }
  function shatter(gt) { addShake(4); for (var i = 0; i < 40; i++) addP({ k: 'spark', x: (gt.c0 + rr() * (gt.c1 - gt.c0 + 1)) * T, y: (gt.r0 + rr() * (gt.r1 - gt.r0 + 1)) * T, vx: (rr() - 0.5) * 2, vy: -rr() * 2, g: 0.08, life: 40, sz: 2, c: '130,230,255', glow: 1 }); }
  function closedGateBetween(x0, x1) {
    var lo = Math.min(x0, x1), hi = Math.max(x0, x1);
    return (!gate.wall3 && (wd.gates[0].c0 * T > lo && wd.gates[0].c0 * T < hi)) || (!gate.barrier4 && (wd.gates[2].c0 * T > lo && wd.gates[2].c0 * T < hi)) || (!gate.bridge2 && wd.gates[1].c0 * T > lo && wd.gates[1].c0 * T < hi);
  }
  function resetGates(round) {
    if (round) {                                    // solo el obstaculo del tramo indicado (1..5)
      var gi = round === 3 ? 0 : round === 2 ? 1 : round === 4 ? 2 : -1, gt = wd.gates[gi]; if (!gt) return;
      if (gi === 1) { gate.bridge2 = 0; bridgeN = 0; for (var c = gt.c0; c <= gt.c1; c++) dyn[gt.row * LW + c] = 0; navDirty(); }
      else { if (gi === 0) gate.wall3 = 0; else gate.barrier4 = 0; setCells(gt, 1); }
      return;
    }
    gate.wall3 = gate.bridge2 = gate.barrier4 = 0; bridgeN = 0; dyn.fill(0); initGates();
  }
  function initGates() { setCells(wd.gates[0], 1); setCells(wd.gates[2], 1); }
  initGates();
  function gateTick() {
    var g0 = wd.gates[0], b = bodies.guia;
    if (!gate.wall3 && b && b.grounded && b.x > g0.c0 * T + 4 && b.x < (g0.c1 + 1) * T - 4 && b.y <= g0.r0 * T + 1) {   // la guia llega arriba: ancla la cuerda y baja la pared
      gate.wall3 = 1; navDirty(); for (var c = g0.c0; c <= g0.c1; c++) for (var r = g0.r0; r < g0.keep; r++) dyn[r * LW + c] = 0;
      shatter({ c0: g0.c0, c1: g0.c1, r0: g0.r0, r1: g0.keep - 1 }); sfx('rumble'); if (opts.onInteract) opts.onInteract('guia', 'wall3');
    }
    var gb = wd.gates[1];
    if (gate.bridge2 && bridgeN <= gb.c1 - gb.c0) {
      if (tick % 4 === 0) { var cc = gb.c0 + bridgeN; dyn[gb.row * LW + cc] = 2; puff(cc * T + 8, gb.row * T, 3, 0); sfx('plank'); bridgeN++; if (bridgeN > gb.c1 - gb.c0) { addShake(2); navDirty(); } }
    }
  }
  function zoneNear(b) {
    var best = null, bd = 1e9;
    wd.zones.forEach(function (z) { var d = Math.abs(b.x - z.x) + Math.abs(b.y - z.y) * 0.8; if (Math.abs(b.x - z.x) < z.r && Math.abs(b.y - z.y) < 22 && d < bd) { bd = d; best = z; } });
    return best;
  }

  /* =====================================================================
     NAVEGACION: grafo de saltos simulados con la fisica real (physStep)
     nodo = celda de pie (apoyo solido/tablon + celda libre encima). Aristas:
     w andar, o caer del borde, j salto (corre/parado, pulsacion corta/media/larga), d bajar por tablon.
     Cada salto se verifica con 3 offsets de despegue (+-1.2 px) para ser robusto.
     ===================================================================== */
  var nav = { out: {}, built: {}, fields: {}, rev: null, ms: 0, sims: 0 };
  var HOLDS = [6, 12, 60];
  function nid(c, r) { return r * LW + c; }
  function isNode(c, r) { if (c < 2 || c >= LW - 2 || r < 3 || r > LH - 2) return false; var sp = tileAt(c, r); return (sp === 1 || sp === 2) && tileAt(c, r - 1) === 0; }
  var SB = { id: 'sim', role: 'ing', x: 0, y: 0, vx: 0, vy: 0, face: 1, grounded: true, coyote: 6, buf: 0, jumping: false, drop: 0, sx: 1, sy: 1, climb: null, safeX: 0, safeY: 0, wasW: false, swimCd: 0, ph: 0 };
  var SINP = { left: false, right: false, jump: false, down: false, up: false, interact: false };
  function simEdge(c, r, d, jump, hold, run, ox, down) {
    var b = SB; nav.sims++;
    b.x = c * T + 8 + ox; b.y = r * T; b.vx = run ? d * 1.7 : 0; b.vy = 0; b.face = d || 1; b.grounded = true; b.coyote = 6; b.buf = 0; b.jumping = false; b.drop = 0; b.safeX = b.x; b.safeY = b.y;
    SINP.left = d < 0; SINP.right = d > 0;
    var air = false; SIM = true;
    for (var f = 0; f < 150; f++) {
      var jp = jump && f === 0; SINP.jump = jump && f < hold; SINP.down = !!down && f === 0;
      if (jp) b.buf = 6; else if (b.buf > 0) b.buf--;
      if (b.drop > 0) b.drop--;
      physStep(b, SINP, d, jp, false, b.grounded);
      if (!b.grounded) air = true;
      else if (air) { SIM = false; var lc = Math.floor(b.x / T), lr = Math.round(b.y / T); return isNode(lc, lr) ? { c: lc, r: lr, f: f + 1 } : null; }
      if (b.y > PH) break;
    }
    SIM = false; return null;
  }
  function buildNav(s) {
    var t0 = performance.now(), c0 = Math.max(2, s * SECW - 6), c1 = Math.min(LW - 3, s * SECW + SECW + 5), r, c, d;
    for (r = 3; r <= LH - 2; r++) for (c = c0; c <= c1; c++) delete nav.out[nid(c, r)];
    for (r = 3; r <= LH - 2; r++) for (c = c0; c <= c1; c++) {
      if (!isNode(c, r)) continue;
      var es = nav.out[nid(c, r)] = [], seen = {}, me = nid(c, r);
      for (d = -1; d <= 1; d += 2) {
        if (isNode(c + d, r)) es.push({ to: nid(c + d, r), cost: 10, d: d, k: 'w' });
        else { var o = simEdge(c, r, d, false, 0, true, 0, 0); if (o && nid(o.c, o.r) !== me) es.push({ to: nid(o.c, o.r), cost: o.f, d: d, k: 'o' }); }
      }
      for (d = -1; d <= 1; d++) for (var run = d ? 1 : 0; run >= 0; run--) {
        if (run && !isNode(c - d, r)) continue;
        for (var hi = 0; hi < HOLDS.length; hi++) {
          var hd = HOLDS[hi], o0 = simEdge(c, r, d, true, hd, !!run, 0, 0);
          if (!o0) continue; var to = nid(o0.c, o0.r); if (to === me || seen[to + ':' + d]) continue;
          var ok = true;
          for (var oi = 0; oi < 2 && ok; oi++) { var o1 = simEdge(c, r, d, true, hd, !!run, oi ? 1.2 : -1.2, 0); if (!o1 || o1.c !== o0.c || o1.r !== o0.r) ok = false; }
          if (!ok) continue; seen[to + ':' + d] = 1;
          es.push({ to: to, cost: o0.f + 8, d: d, k: 'j', hold: hd, run: !!run });
        }
      }
      if (tileAt(c, r) === 2) { var od = simEdge(c, r, 0, false, 0, false, 0, 1); if (od && nid(od.c, od.r) !== me) es.push({ to: nid(od.c, od.r), cost: od.f + 4, d: 0, k: 'd' }); }
    }
    nav.built[s] = 1; nav.rev = null; nav.fields = {}; nav.ms += performance.now() - t0;
  }
  function ensureNav(x) { var s = clamp(Math.floor(x / SPW), 0, NS - 1); [s - 1, s, s + 1].forEach(function (q) { if (q >= 0 && q < NS && !nav.built[q]) buildNav(q); }); }
  function navDirty() { if (!nav) return; nav.built = {}; nav.out = {}; nav.fields = {}; nav.rev = null; }
  function killEdge(e) { e.dead = tick + 1500; stats.killed.push(e.k + e.d + (e.run ? 'r' : '') + (e.hold || '') + '->' + (e.to % LW) + ',' + ((e.to / LW) | 0) + '@' + tick); nav.rev = null; nav.fields = {}; }
  function alive(e) { return !(e.dead > tick); }
  function fieldFor(goal) {
    var f = nav.fields[goal]; if (f) return f;
    if (!nav.rev) { nav.rev = {}; Object.keys(nav.out).forEach(function (k) { nav.out[k].forEach(function (e) { if (alive(e)) (nav.rev[e.to] = nav.rev[e.to] || []).push({ from: +k, e: e }); }); }); }
    f = nav.fields[goal] = {}; f[goal] = 0; var q = [goal], qi = 0, inq = {};
    while (qi < q.length) {
      var n = q[qi++]; inq[n] = 0; var rv = nav.rev[n]; if (!rv) continue; var dn = f[n];
      for (var i = 0; i < rv.length; i++) { var fr = rv[i].from, nd = dn + rv[i].e.cost; if (f[fr] === undefined || nd < f[fr]) { f[fr] = nd; if (!inq[fr]) { inq[fr] = 1; q.push(fr); } } }
    }
    return f;
  }
  function curNode(b) {
    var c = Math.floor(b.x / T), r = Math.round(b.y / T);
    if (nav.out[nid(c, r)]) return nid(c, r);
    var o = b.x - (c * T + 8); c += o > 0 ? 1 : -1; if (nav.out[nid(c, r)]) return nid(c, r);
    return -1;
  }
  function nodeNear(x, y, b) {
    var c0 = Math.floor(x / T), best = -1, bd = 1e9;
    for (var dc = 0; dc <= 1; dc++) for (var sg = -1; sg <= 1; sg += 2) {
      var c = c0 + sg * dc; if (dc === 0 && sg === 1) continue;
      for (var r = 3; r <= LH - 2; r++) if (nav.out[nid(c, r)]) { var dd = Math.abs(r * T - (y === undefined ? b.y : y)) + dc * 20; if (dd < bd) { bd = dd; best = nid(c, r); } }
      if (best >= 0) break;
    }
    return best;
  }
  var NOI = function () { return { left: 0, right: 0, jump: 0, interact: 0, up: 0, down: 0 }; };
  function macro(b, inp) {
    var m = b.mac, e = m.e; m.f++;
    if ((m.f > 3 && b.grounded) || m.f > 170) {
      var cn = curNode(b), gf = b.goal ? fieldFor(b.goal.node) : null, okm = cn === e.to || (gf && cn >= 0 && gf[cn] !== undefined && gf[cn] < m.d0 - 1);
      if (!okm) { e.miss = (e.miss || 0) + 1; if (e.miss >= 3) killEdge(e); } else e.miss = 0;
      b.mac = null; b.pe = null; return inp;
    }
    b.ad = e.d; if (e.d) inp[e.d > 0 ? 'right' : 'left'] = 1;
    inp.jump = (m.f - 1) < e.hold ? 1 : 0;
    return inp;
  }
  function botBrain(b) {
    var inp = NOI();
    if (!nav.built[clamp(Math.floor(b.x / SPW), 0, NS - 1)]) ensureNav(b.x);
    if (b.warp) { b.warp.t++; if (b.warp.t === 22) doWarp(b); if (b.warp.t > 44) b.warp = null; return inp; }
    if (b.busy > 0) { b.busy--; return inp; }
    if ((b.y - 5) > waterY(wlCur)) {                // en el agua: braza hacia la salida seca mas util (la navegacion simulada es en seco)
      var gw = b.goal; b.mac = null; b.pe = null;
      if (!(gw && curNode(b) === gw.node && Math.abs(gw.x - b.x) < 3)) {
        var sw = gw ? swimNext(b, gw) : null;
        if (sw) {     // nado siguiendo el camino del grafo (nodo a nodo), subiendo por encima del borde antes de avanzar
          var sdx = sw.x - b.x, up = sw.y < b.y - 6, aimY = up ? (Math.abs(sdx) > 5 ? sw.y - 12 : sw.y) : 1e9;
          if (Math.abs(sdx) > 2) { inp[sdx > 0 ? 'right' : 'left'] = 1; b.ad = sdx > 0 ? 1 : -1; }
          if (b.y > aimY + 2) { inp.jump = (tick % 12 < 11) ? 1 : 0; b.swimHold = tick + 40; }
          return inp;
        }
        if (!b.exitT || tick - b.exitT > 20) { b.exitT = tick; b.exit = findExit(b); }
        var wyb2 = waterY(wlCur), subm = gw && ((gw.node / LW) | 0) * T > wyb2 + 2, ex = subm ? null : b.exit;
        var tx = ex ? ex.x : gw ? gw.x : b.x, ty = ex ? ex.y : gw ? ((gw.node / LW) | 0) * T : b.y - 30;
        if (subm) { if (Math.abs(tx - b.x) > 2) inp[tx > b.x ? 'right' : 'left'] = 1; if (b.y > ty + 4) inp.jump = (tick % 14 < 4) ? 1 : 0; b.ad = tx > b.x ? 1 : -1; return inp; }
        if (Math.abs(tx - b.x) > 2) inp[tx > b.x ? 'right' : 'left'] = 1;
        if (b.y > ty + 2 || !ex) inp.jump = (tick % 14 < 4) ? 1 : 0;
        b.ad = tx > b.x ? 1 : -1; return inp;
      }
    }
    if (b.mac) return macro(b, inp);
    if (!b.grounded) { if (b.ad) inp[b.ad > 0 ? 'right' : 'left'] = 1; if (b.swimHold > tick) inp.jump = 1; return inp; }   // salida del agua: mantiene el salto (altura completa)
    var g = b.goal;
    if (!g) {
      if (!b.idleT) b.idleT = 50 + (rr() * 200 | 0);
      if (--b.idleT <= 0) { b.idleT = 0; wander(b); }
      return inp;
    }
    var cur = curNode(b);
    if (cur < 0) return inp;
    if (cur === g.node) {
      var dx = g.x - b.x;
      if (Math.abs(dx) > 2.5) { inp[dx > 0 ? 'right' : 'left'] = 1; b.ad = Math.sign(dx); return inp; }
      b.goal = null; b.vx *= 0.3;
      if (g.poi) { b.face = g.poi.x > b.x ? 1 : -1; b.busy = 28; if (!usePoi(b, g.poi)) b.busy = 6; }
      else if (g.wander && rr() < 0.4) { b.busy = 40; b.interT = 36; spark(b.x + b.face * 6, b.y - 8, 2); }
      if (g.cb) { var cb = g.cb; setTimeout(function () { cb(true); }, 0); }
      return inp;
    }
    var f = fieldFor(g.node), es = nav.out[cur], best = null, bc = 1e9;
    if (f[cur] === undefined) { if (tick - g.t0 > 30) { b.goal = null; if (g.cb) { var cb2 = g.cb; setTimeout(function () { cb2(false); }, 0); } } return inp; }
    for (var i = 0; i < es.length; i++) { var e = es[i]; if (!alive(e) || f[e.to] === undefined) continue; var tt = e.cost + f[e.to]; if (tt < bc) { bc = tt; best = e; } }
    if (f[cur] < b.bestDv - 0.5) { b.bestDv = f[cur]; b.progT = tick; }
    if (tick - b.progT > 400) {                         // sin progreso 6.5 s: descarta la arista usada; si persiste, fundido
      b.progT = tick; b.stuckN = (b.stuckN || 0) + 1;
      if (b.lastE && b.stuckN < 3) killEdge(b.lastE); else if (b.stuckN >= 3) { b.warp = { t: 0 }; b.stuckN = 0; stats.warps++; return inp; }
    }
    if (b.pe && (tick - b.pe.t > 300 || !alive(b.pe.e) || Math.round(b.y / T) !== ((b.pe.src / LW) | 0) || Math.abs(cur % LW - b.pe.src % LW) > 8)) b.pe = null;
    if (!b.pe && best && best.k === 'j') b.pe = { e: best, src: cur, t: tick, back: false };
    if (b.pe) best = b.pe.e;
    if (!best) return inp;
    b.lastE = best;
    var e2 = best, src = b.pe ? b.pe.src : cur, cx = (src % LW) * T + 8;
    if (e2.k === 'w' || e2.k === 'o') { inp[e2.d > 0 ? 'right' : 'left'] = 1; b.ad = e2.d; return inp; }
    if (e2.k === 'd') { inp.down = 1; b.ad = 0; return inp; }
    var ox = b.x - cx, mk = function () { b.mac = { e: e2, f: 0, d0: f[cur] === undefined ? 1e9 : f[cur] }; return macro(b, inp); };
    if (!e2.d) { if (Math.abs(ox) > 1.2) { inp[ox > 0 ? 'left' : 'right'] = Math.abs(ox) > 2.5 ? 1 : 0; } else if (Math.abs(b.vx) < 0.4) return mk(); return inp; }
    var u = ox * e2.d;
    if (e2.run) {
      var pe = b.pe; if (u > 0.9) pe.back = true; else if (u < -12 || (pe.back && Math.abs(b.vx) < 0.05 && tick - pe.bt > 20)) pe.back = false;
      if (pe.back) { if (!pe.bt || Math.abs(b.vx) > 0.05) pe.bt = tick; inp[e2.d > 0 ? 'left' : 'right'] = 1; return inp; }
      if (u >= -0.9 && u <= 0.9 && b.vx * e2.d >= 1.45) return mk();
      inp[e2.d > 0 ? 'right' : 'left'] = 1; return inp;
    }
    if (Math.abs(ox) > 1.2) { inp[ox > 0 ? 'left' : 'right'] = Math.abs(ox) > 2.5 ? 1 : 0; return inp; }
    if (Math.abs(b.vx) < 0.4) return mk();
    return inp;
  }
  function swimNext(b, gw) {
    var cn = nodeNear(b.x, b.y, b); if (cn < 0 || Math.abs((cn / LW | 0) * T - b.y) > 44) return null;
    if (cn === gw.node) return { x: gw.x, y: (cn / LW | 0) * T };
    var f = fieldFor(gw.node); if (f[cn] === undefined) return null;
    var es = nav.out[cn] || [], best = null, bc = 1e9;
    for (var i = 0; i < es.length; i++) { var e = es[i]; if (!alive(e) || f[e.to] === undefined) continue; var tt = e.cost + f[e.to]; if (tt < bc) { bc = tt; best = e; } }
    return best ? { x: (best.to % LW) * T + 8, y: (best.to / LW | 0) * T } : null;
  }
  function findExit(b) {
    var wyb = waterY(wlCur), g = b.goal, f = g ? fieldFor(g.node) : null, c0 = Math.floor(b.x / T), best = null, bs = 1e9;
    for (var c = c0 - 12; c <= c0 + 12; c++) for (var r = 3; r <= LH - 2; r++) {
      var id = nid(c, r); if (!nav.out[id]) continue; var fy = r * T; if (fy > wyb - 2 || fy < wyb - 34) continue;
      if (f && f[id] === undefined) continue; var sc3 = (f ? f[id] : 0) + Math.abs(c * T + 8 - b.x) * 0.8 + Math.abs(fy - b.y) * 0.3;
      if (sc3 < bs) { bs = sc3; best = { x: c * T + 8, y: fy }; }
    }
    return best;
  }
  function doWarp(b) {          // ultimo recurso: se disuelve y reaparece en el nodo alcanzable mas cercano al objetivo
    var g = b.goal, best = -1, bd = 1e9; puff(b.x, b.y, 8, 0); spark(b.x, b.y - 8, 6);
    if (g) { var f = fieldFor(g.node); Object.keys(f).forEach(function (k) { var c = k % LW, r = (k / LW) | 0, d = Math.abs(c * T + 8 - b.x) + Math.abs(r * T - b.y); if (d < 200 && f[k] < (f[curNode(b)] === undefined ? 1e9 : f[curNode(b)]) && d < bd) { bd = d; best = +k; } }); }
    if (best >= 0) { b.x = (best % LW) * T + 8; b.y = ((best / LW) | 0) * T; b.vx = b.vy = 0; b.mac = null; puff(b.x, b.y, 8, 0); spark(b.x, b.y - 8, 6); }
    else { b.x = b.safeX; b.y = b.safeY; b.vx = b.vy = 0; }
  }
  function wander(b) {
    var cur = curNode(b); if (cur < 0) return;
    var c = cur % LW, r = (cur / LW) | 0, k = ((rr() * 11) | 0) - 5, nc = c + k;
    if (!nav.out[nid(nc, r)] || Math.abs(k) < 2) { if (rr() < 0.5) b.face = -b.face; b.idleT = 40 + (rr() * 60 | 0); return; }
    b.goal = { x: nc * T + 8, node: nid(nc, r), wander: true, t0: tick }; b.bestDv = 1e9; b.progT = tick; b.stuckN = 0;
  }
  function botGoto(role, target, cb) {
    var b = bodies[role]; if (!b || !target) return false;
    var x, y, poi = null;
    if (typeof target === 'string') { poi = pois[target]; if (!poi) return false; x = poi.x; y = poi.y; } else { x = target.x; y = target.y; }
    ensureNav(x); ensureNav(b.x);
    var node = poi ? nid(Math.floor(poi.x / T), Math.round(poi.y / T)) : nodeNear(x, y, b);
    if (node < 0 || !nav.out[node]) { if (global.console) console.warn('botGoto: sin nodo para', target); return false; }
    var cur = curNode(b);
    if (cur >= 0 && fieldFor(node)[cur] === undefined) { if (global.console) console.warn('botGoto: inalcanzable', role, target); return false; }
    b.goal = { x: x, node: node, poi: poi, cb: cb, t0: tick }; b.bestDv = 1e9; b.progT = tick; b.stuckN = 0; b.idleT = 0; b.busy = 0;
    return true;
  }

  /* =====================================================================
     POI, burbujas, interaccion con E, agua continua con avisos
     ===================================================================== */
  var pois = {}, poiRound = 0, bub = {}, stats = { warps: 0, interacts: 0, killed: [], snuffed: 0 };
  var waterRate = 0, banner = null, warnPulse = 0, lastWarn = -9999, lastBand = -1;
  function setPois(round, list) {
    var nr = clamp(round | 0, 1, NS); if (nr !== poiRound) resetGates(nr); poiRound = nr; pois = {}; self.pois = pois; 
    var sl = wd.slots[poiRound - 1];
    (list || []).forEach(function (p, i) {
      var slot = p.slot !== undefined ? p.slot : i, pos = sl[slot]; if (!pos) return;
      pois[p.id] = { id: p.id, slot: slot, label: p.label || '', icon: p.icon || '', kind: p.kind || 'info', used: !!p.used, by: p.by || null, seen: p.seen || [], x: pos.x, y: pos.y, disc: p.kind !== 'secreto' || !!p.used, pulse: 0, ph: slot * 1.7, cd: 0 };
    });
    ensureNav((poiRound - 1) * SPW + 100);
  }
  function markPoi(id, o) {
    var p = pois[id]; if (!p) return; o = o || {};
    if (o.used !== undefined) { var was = p.used; p.used = !!o.used; if (p.used && !was) { p.disc = true; p.pulse = 1; for (var i = 0; i < 10; i++) addP({ k: 'spark', x: p.x + (rr() - 0.5) * 8, y: p.y - 14, vx: (rr() - 0.5) * 1.4, vy: -rr() * 1.4 - 0.3, g: 0.04, life: 34, sz: 1, c: '255,235,150', glow: 1 }); sfx('confirm'); } }
    if (o.by !== undefined) p.by = o.by;
    if (o.seen) p.seen = o.seen;
  }
  function poiNear(b) {
    var best = null, bd = 1e9;
    for (var k in pois) { var p = pois[k], dx = Math.abs(b.x - p.x), dy = Math.abs(b.y - p.y); if (dx < 15 && dy < 26 && dx + dy < bd) { bd = dx + dy; best = p; } }
    return best;
  }
  function apOf(role) { var s = st(), p = s && s.players && s.players[role]; return p && p.ap !== undefined && p.ap !== null ? p.ap : 99; }
  function poiBlocked(b, p) { return p.used ? 'USADO' : p.seen.indexOf(b.role) >= 0 ? 'YA VISTO' : (p.kind === 'secreto' && !p.disc) ? '?' : apOf(b.role) <= 0 ? 'SIN AP' : null; }
  function usePoi(b, p) {
    if (p.cd > tick) return false; p.cd = tick + 30;
    if (poiBlocked(b, p)) { sfx('error', b); if (apOf(b.role) <= 0 && !p.used) say(b.role, '!', { ms: 1200 }); return false; }
    b.interT = 36; b.face = p.x > b.x ? 1 : -1; sfx('interact', b); spark(p.x, p.y - 12, 8); p.pulse = 1; stats.interacts++;
    if (opts.onInteract) opts.onInteract(b.role, p.id); return true;
  }
  function say(role, text, o) {
    if (!bodies[role]) return; o = o || {}; text = String(text == null ? '' : text); if (!text) { delete bub[role]; return; }
    var ms = o.ms || Math.min(6500, 2800 + text.length * 40);
    bub[role] = { text: text, t: 0, max: Math.round(ms * 0.06), think: o.think || text === '...' };
  }
  function setWaterRate(r) { waterRate = Math.max(0, +r || 0); }
  function warnWater(text, strong) {
    if (tick - lastWarn < 240 && !strong) return; lastWarn = tick;
    banner = { text: text, t: 0, max: 150 }; warnPulse = 1; sfx('water_warn'); addShake(strong ? 3 : 1.5); if (strong) sfx('rumble');
  }
  function waterTick() {
    if (waterRate > 0 && authority) wlTarget = Math.min(100, wlTarget + waterRate / 60);
    var wy = waterY(wlCur), gap = 1e9;
    ROLES.forEach(function (r) { var b = bodies[r]; if (b) gap = Math.min(gap, wy - b.y); });
    var band = Math.floor(wlCur / 10);
    if (lastBand < 0) lastBand = band;
    if (band > lastBand) { lastBand = band; warnWater(band >= 8 ? 'EL AGUA SE DESBORDA!' : band >= 5 ? 'EL AGUA SUBE RAPIDO' : 'EL AGUA SUBE', band >= 5); }
    else if (gap < 26 && gap > -20 && wlCur !== wlTarget) warnWater('CUIDADO: AGUA CERCA');
    if (warnPulse > 0) warnPulse = Math.max(0, warnPulse - 0.012);
    if (banner && ++banner.t > banner.max) banner = null;
    if (wlCur < wlTarget - 0.01 && tick % 90 === 0) sfx('drip');
  }
  function poiTick() {
    var k, p, b, i;
    for (k in pois) {
      p = pois[k]; if (p.pulse > 0) p.pulse = Math.max(0, p.pulse - 0.03);
      if (!SIM && p.y - 12 > waterY(wlCur) && (tick + p.slot * 11) % 38 === 0 && Math.abs(p.x - cam.x - W / 2) < W) bubbles(p.x, p.y - 14, 1);
      if (!p.disc) for (i = 0; i < ROLES.length; i++) { b = bodies[ROLES[i]]; if (Math.abs(b.x - p.x) < 40 && Math.abs(b.y - p.y) < 30) { p.disc = true; p.pulse = 1; for (var j = 0; j < 12; j++) addP({ k: 'spark', x: p.x, y: p.y - 12, vx: (rr() - 0.5) * 1.6, vy: -rr() * 1.6, g: 0.03, life: 40, sz: 1, c: '210,150,255', glow: 1 }); sfx('select'); break; } }
    }
    for (k in bub) if (++bub[k].t > bub[k].max) delete bub[k];
  }

  /* ---------- fuego bajo el agua: se apaga (humo, burbujas, chisporroteo) y vuelve a prenderse al secarse ---------- */
  var outF = new Map();
  function fireTick() {
    var wy = waterY(wlCur), vx0 = cam.x - 40, vx1 = cam.x + W + 40, vy0 = cam.y - 60, vy1 = cam.y + H + 60;
    function chk(o, fy, idx) {
      var sub = fy > wy, was = outF.get(o) === 1;
      if (sub && !was) {
        outF.set(o, 1); stats.snuffed++; if (o.x > vx0 && o.x < vx1) { spawnFx('smoke', o.x, fy); bubbles(o.x, fy, 5); for (var i = 0; i < 6; i++) addP({ k: 'spark', x: o.x, y: fy, vx: (rr() - 0.5) * 1.2, vy: -rr() * 1.2, g: 0.04, life: 16 + rr() * 10, sz: 1, c: '230,245,255' }); sfx('splash'); }
      } else if (was && fy < wy - 14) { outF.set(o, 0); spark(o.x, fy, 5); }
      else if (was && sub && o.x > vx0 && o.x < vx1 && o.y > vy0 && o.y < vy1 && (tick + idx) % 50 === 0) bubbles(o.x, fy - 2, 1);
    }
    wd.torches.forEach(function (t, i) { chk(t, t.y - 12, i); });
    wd.anim.forEach(function (a, i) { if (a.t === 'fire' || a.t === 'candle' || a.t === 'lantern') chk(a, a.t === 'lantern' ? a.y : a.y - 2, i); });
  }

  /* ---------- particulas ---------- */
  function addP(p) { if (SIM) return; if (parts.length > 500) parts.shift(); p.max = p.life; parts.push(p); }
  function puff(x, y, n, dirx) { for (var i = 0; i < n; i++) addP({ k: 'dust', x: x + (rr() - 0.5) * 6, y: y - 1, vx: (rr() - 0.5) * 0.8 + (dirx || 0) * 0.5, vy: -rr() * 0.4, g: -0.005, life: 16 + rr() * 12, sz: 1 + (rr() * 2 | 0), c: '190,175,170' }); }
  function spark(x, y, n) { for (var i = 0; i < n; i++) addP({ k: 'spark', x: x, y: y, vx: (rr() - 0.5) * 1.6, vy: -rr() * 1.6 - 0.3, g: 0.05, life: 22 + rr() * 20, sz: 1, c: rr() < 0.5 ? '255,200,90' : '255,240,180', glow: 1 }); }
  function splash(x, y, n, vy) { for (var i = 0; i < n; i++) addP({ k: 'drop', x: x + (rr() - 0.5) * 6, y: y, vx: (rr() - 0.5) * 1.8, vy: -rr() * 2.4 - 0.8, g: 0.14, life: 40, sz: 1, c: '170,225,255', die: 'water' }); }
  function bubbles(x, y, n) { for (var i = 0; i < n; i++) addP({ k: 'bub', x: x + (rr() - 0.5) * 8, y: y, vx: 0, vy: -0.35 - rr() * 0.4, g: 0, life: 140, sz: 1 + (rr() * 2 | 0), c: '200,240,255', ph: rr() * 6 }); }
  function drip(x, y) { addP({ k: 'drop', x: x, y: y, vx: 0, vy: 0.2, g: 0.12, life: 200, sz: 1, c: '150,210,255', die: 'any' }); }
  function confetti(x, y, n) { var cs = ['255,120,90', '255,220,90', '120,230,200', '150,160,255', '255,150,220']; for (var i = 0; i < n; i++) addP({ k: 'conf', x: x + (rr() - 0.5) * 10, y: y, vx: (rr() - 0.5) * 3, vy: -rr() * 3.5 - 1, g: 0.07, life: 90 + rr() * 60, sz: 2, c: cs[i % cs.length], ph: rr() * 6 }); }
  function debris(n) { for (var i = 0; i < n; i++) addP({ k: 'dust', x: cam.x + rr() * W, y: cam.y + 6, vx: (rr() - 0.5) * 0.3, vy: 0.4 + rr() * 1.2, g: 0.08, life: 60, sz: 1 + (rr() * 2 | 0), c: '150,135,140' }); }
  function addRipple(x, amp) { if (SIM) return; ripples.push({ x: x, a: amp, t: 0 }); if (ripples.length > 14) ripples.shift(); }
  function addShake(a) { if (!SIM) shake = Math.max(shake, a); }
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
    wd.stals.forEach(function (s) { if (s.drip && s.y > cam.y - 20 && s.y < cam.y + H && s.x > vx0 && s.x < vx1 && (tick + s.ph) % 240 === 0) drip(s.x, s.y + s.len); });
    wd.anim.forEach(function (an) { if (an.t === 'drip' && an.x > vx0 && an.x < vx1 && (tick + (an.x | 0)) % 110 === 0) drip(an.x, an.y); });
    if (tick % 6 === 0) addP({ k: 'mote', x: cam.x + rr() * W, y: cam.y + rr() * H, vx: (rr() - 0.5) * 0.15, vy: -0.05 - rr() * 0.1, g: 0, life: 160, sz: 1, c: '255,235,200' });
    wd.shrooms.forEach(function (s) { if (s.x > vx0 && s.x < vx1 && tick % 50 === (s.seed % 50)) addP({ k: 'mote', x: s.x, y: s.y - 6, vx: (rr() - 0.5) * 0.2, vy: -0.2, g: 0, life: 90, sz: 1, c: rgb(THEMES[s.s].crystal).slice(4, -1), glow: 1 }); });
    wd.torches.forEach(function (t) { if (t.x > vx0 && t.x < vx1 && t.y > cam.y - 20 && t.y < cam.y + H + 20 && outF.get(t) !== 1 && tick % 7 === 0 && rr() < 0.7) addP({ k: 'spark', x: t.x + (rr() - 0.5) * 3, y: t.y - 17, vx: (rr() - 0.5) * 0.3, vy: -0.5 - rr() * 0.4, g: -0.005, life: 30, sz: 1, c: '255,190,90', glow: 1 }); });
    updParts(); if (authority) waterTick(); poiTick(); if (tick % 4 === 0) fireTick(); if (tick % 300 === 0) { nav.rev = null; nav.fields = {}; }
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

  /* ---------- camara (limitada al tramo; centra en el recuadro VISIBLE) ---------- */
  var VIS = { x0: 0, y0: 0, x1: W, y1: H }, insets = { left: 0, right: 0, top: 0, bottom: 0 }, visT = -999;
  function recalcVis() {
    visT = tick; var v = { x0: 0, y0: 0, x1: W, y1: H };
    try {
      var par = canvas.parentElement, pr = par ? par.getBoundingClientRect() : { left: 0, top: 0, right: global.innerWidth, bottom: global.innerHeight }, cr = canvas.getBoundingClientRect();
      if (cr.width > 10 && cr.height > 10) {
        var k = cr.width / W, L = pr.left + insets.left, Rr = pr.right - insets.right, Tp = pr.top + insets.top, Bt = pr.bottom - insets.bottom;
        v = { x0: clamp((L - cr.left) / k, 0, W), x1: clamp((Rr - cr.left) / k, 0, W), y0: clamp((Tp - cr.top) / k, 0, H), y1: clamp((Bt - cr.top) / k, 0, H) };
        if (v.x1 - v.x0 < 120 || v.y1 - v.y0 < 70) v = { x0: 0, y0: 0, x1: W, y1: H };
      }
    } catch (e) { }
    VIS = v;
  }
  function setViewInsets(o) { o = o || {}; insets = { left: +o.left || 0, right: +o.right || 0, top: +o.top || 0, bottom: +o.bottom || 0 }; recalcVis(); snapCam(); }
  function secOfX(x) { return clamp(Math.floor(x / SPW), 0, NS - 1); }
  function followBody() { return bodies[active]; }
  function camGoal() {
    var vcx = (VIS.x0 + VIS.x1) / 2, vcy = (VIS.y0 + VIS.y1) / 2 + 14, tx, ty, f = followBody();
    if (cam.focus) { tx = cam.focus.x - vcx; ty = cam.focus.y - vcy + 14; }
    else if (cam.panT > 0) { tx = cam.panX - vcx; ty = f ? f.y - vcy - 10 : cam.y; }
    else if (cam.mode === 'fixed') { tx = cam.fx; ty = cam.fy; }
    else if (f) { tx = f.x - vcx + f.face * 22 * (VIS.x1 - VIS.x0 > 200 ? 1 : 0.4); ty = f.y - vcy; }
    else { tx = cam.x; ty = cam.y; }
    var ref = cam.focus ? cam.focus.x : cam.panT > 0 ? cam.panX : f ? f.x : tx + W / 2, sc2 = secOfX(ref);
    tx = clamp(tx, sc2 * SPW - VIS.x0, (sc2 + 1) * SPW - VIS.x1);          // nunca se ve fuera del tramo actual
    ty = clamp(ty, 0, PH - H);
    return { x: tx, y: ty };
  }
  function snapCam() { var g2 = camGoal(); cam.x = g2.x; cam.y = g2.y; }
  function updCam() {
    if (tick - visT > 45) recalcVis();
    if (cam.focus && --cam.focus.t <= 0) cam.focus = null;
    var g2 = camGoal(), k = cam.focus ? 0.07 : cam.panT > 0 ? 0.045 : cam.trans > 0 ? 0.05 : 0.09;
    if (cam.panT > 0) cam.panT--; if (cam.trans > 0) cam.trans--;
    cam.x += (g2.x - cam.x) * k; cam.y += (g2.y - cam.y) * (k + 0.02);
  }
  function focus(x, y, o) { o = o || {}; if (x === null || x === undefined) { cam.focus = null; return; } var ms = o.ms === undefined ? 2200 : o.ms; cam.focus = { x: +x, y: +y, t: Math.max(1, Math.round(ms * 0.06)) }; }
  function pan(round) {
    var r = clamp((round | 0) || 1, 1, NS) - 1; cam.panX = r * SPW + SPW / 2; cam.panT = 170;
  }
  function gather(round) {
    var s = clamp((round | 0) || 1, 1, NS) - 1, k = 0;
    Object.keys(bodies).forEach(function (id) { var b = bodies[id], sp = spawnOf(s, k++); b.x = b.tx = sp.x; b.y = b.ty = sp.y; b.vx = b.vy = 0; b.climb = null; b.goal = null; b.mac = null; b.warp = null; b.busy = 0; puff(b.x, b.y, 6, 0); });
    cam.focus = null; recalcVis(); snapCam();
  }

  /* =================== RENDER =================== */
  function themeBlend(px) { // devuelve {i,j,w}
    var f = clamp(px / SPW, 0, NS - 0.001), i = Math.floor(f), w = smooth((f - i - 0.7) / 0.3);
    return { i: i, j: Math.min(NS - 1, i + 1), w: i >= NS - 1 ? 0 : w };
  }
  function drawLayer(idx, factor, ycoef, tb, cx, cy) {
    var yo = -Math.round(cy * ycoef), P = 640, xo = -(((Math.round(cx * factor) % P) + P) % P);
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
  function drawTorch(t, tick2, off) {
    var x = Math.round(t.x), y = Math.round(t.y), fl = Math.sin(tick2 * 0.4 + t.ph) * 0.5 + 0.5, h = 5 + Math.round(fl * 2 + rrh(tick2, t.ph) * 1.5);
    if (off) {   // apagada: palo y copa oscura, sin llama
      sc.fillStyle = '#1a1424'; sc.fillRect(x - 3, y - 10, 7, 3); sc.fillRect(x - 2, y - 8, 5, 9); sc.fillStyle = '#5a3a2a'; sc.fillRect(x - 1, y - 8, 3, 8); sc.fillStyle = '#2a2a34'; sc.fillRect(x - 2, y - 10, 5, 2); sc.fillStyle = '#14101f'; sc.fillRect(x - 1, y - 11, 3, 1); return;
    }
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
  function addLight(L, x, y, r, col, a, fire) { if (y > waterY(wlCur)) { if (fire) return; a *= 0.45; r *= 0.7; } L.push({ x: x - cam.x, y: y - cam.y, r: r, c: col, a: a }); }

  function render() {
    var t = tick, cx0 = cam.x, cy0 = cam.y;
    var sh = shake ? [Math.round((rr() - 0.5) * 2 * shake), Math.round((rr() - 0.5) * 2 * shake)] : [0, 0];
    cam.rx = cam.x; cam.ry = cam.y;
    var cxr = Math.round(cam.x) + sh[0], cyr = clamp(Math.round(cam.y) + sh[1], 0, PH - H);
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
      var x = s.x - cxr; if (x < -80 || x > W + 80) return;
      var a = (s.strong ? 0.16 : 0.09) + 0.03 * Math.sin(t * 0.02 + s.ph), top = s.y - cyr, th = THEMES[s.s].torch; if (top > H || top < -200) return;
      var lg = sc.createLinearGradient(0, top, 0, top + 170); lg.addColorStop(0, rgb(th, a)); lg.addColorStop(1, rgb(th, 0));
      sc.fillStyle = lg; sc.beginPath(); sc.moveTo(x, top); sc.lineTo(x + s.w, top); sc.lineTo(x + s.w + 46, top + 170); sc.lineTo(x + 22, top + 170); sc.closePath(); sc.fill();
    });
    sc.globalCompositeOperation = 'source-over';
    drawLayer(1, 0.3, 0.35, tb, cxr, cyr);
    sc.fillStyle = rgb(mix([20, 16, 40], amb, 0.8), 0.22); sc.fillRect(0, 0, W, H);   // niebla de profundidad entre capas
    drawLayer(2, 0.55, 0.6, tb, cxr, cyr);
    // roca + decoracion estatica
    var bsx = Math.max(0, cxr), bex = Math.min(PW, cxr + W);
    if (bex > bsx) { sc.drawImage(wd.tiles, bsx, cyr, bex - bsx, H, bsx - cxr, 0, bex - bsx, H); sc.drawImage(wd.decor, bsx, cyr, bex - bsx, H, bsx - cxr, 0, bex - bsx, H); }
    var secV = secOfX(cxr + (VIS.x0 + VIS.x1) / 2), mL = secV * SPW - cxr, mR = (secV + 1) * SPW - cxr;
    sc.fillStyle = '#0a0712'; if (mL > 0) sc.fillRect(0, 0, mL, H); if (mR < W) sc.fillRect(mR, 0, W - mR, H);   // fuera del tramo actual: roca opaca
    var L = [], sparkle, wyL = waterY(wlCur);
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
      if (tc.x < cxr - 60 || tc.x > cxr + W + 60 || tc.y < cyr - 40 || tc.y > cyr + H + 40) return;
      var off = outF.get(tc) === 1;
      sc.save(); sc.translate(-cxr, -cyr); drawTorch(tc, t, off); sc.restore();
      if (off) return;
      var fl = 0.85 + 0.15 * Math.sin(t * 0.37 + tc.ph) + (rrh(t, tc.ph) - 0.5) * 0.15;
      addLight(L, tc.x, tc.y - 16, 84 * fl, THEMES[tc.s].torch, 0.95 * fl, true);
    });
    // animados del escenario: fuego, faroles, velas, brillos, cascadas, luciernagas
    var wyS = waterY(wlCur);
    wd.anim.forEach(function (a) {
      if (a.t === 'fall') { if (a.x < cxr - 20 || a.x > cxr + W + 20) return; var yb = Math.min(wyS, a.yb), x0 = Math.round(a.x - cxr); if (a.y > cyr + H + 4 || a.yb < cyr - 4) return;
        for (var yy = a.y; yy < yb; yy += 2) { var sy3 = Math.round(yy - cyr); if (sy3 < -2 || sy3 > H) continue; var fw = Math.sin(yy * 0.3 - t * 0.5 + a.x) > 0 ? a.w : a.w - 1, off = Math.round(Math.sin(yy * 0.05 + t * 0.03) * 0.8);
          sc.fillStyle = 'rgba(150,215,255,0.5)'; sc.fillRect(x0 - (fw >> 1) + off, sy3, fw, 2); sc.fillStyle = 'rgba(235,250,255,0.75)'; sc.fillRect(x0 - (fw >> 1) + off + ((yy + t) % 5 | 0) % fw, sy3, 1, 2); }
        var by2 = Math.round(yb - cyr); if (by2 > 0 && by2 < H + 8) { for (var q = 0; q < 5; q++) { sc.fillStyle = 'rgba(220,245,255,' + (0.5 - q * 0.08) + ')'; sc.fillRect(x0 - 6 - q + ((t >> 2) + q) % 3, by2 - 1 - (q % 2) * 2, 12 + q * 2, 1); } }
        addLight(L, a.x, Math.min(yb, cyr + H) - 20, 40, [120, 190, 255], 0.35); return; }
      if (a.x < cxr - 60 || a.x > cxr + W + 60 || a.y < cyr - 60 || a.y > cyr + H + 60) return;
      var ax = Math.round(a.x - cxr), ay = Math.round(a.y - cyr), fl, aoff = outF.get(a) === 1;
      if (aoff && (a.t === 'fire' || a.t === 'candle' || a.t === 'lantern')) { if (a.t === 'lantern') { sc.fillStyle = '#3a3a46'; sc.fillRect(Math.round(a.gx - cxr) - 2, Math.round(a.gy - cyr) - 1, 5, 6); sc.fillStyle = '#26262f'; sc.fillRect(Math.round(a.gx - cxr) - 1, Math.round(a.gy - cyr), 3, 4); } return; }
      if (a.t === 'fire') { fl = Math.sin(t * 0.37) * 0.5 + 0.5; var fh = 7 + Math.round(fl * 3 + rrh(t, 3) * 2);
        sc.fillStyle = '#14101f'; sc.fillRect(ax - 4, ay - fh - 1, 9, fh + 2); sc.fillStyle = '#e0501e'; sc.fillRect(ax - 3, ay - fh + 2, 7, fh - 1); sc.fillRect(ax - 2, ay - fh, 5, 3); sc.fillStyle = '#ffa030'; sc.fillRect(ax - 2, ay - fh + 4, 5, fh - 4); sc.fillStyle = '#ffe890'; sc.fillRect(ax - 1, ay - fh + 6, 3, Math.max(1, fh - 7));
        addLight(L, a.x, a.y - 8, 100 * (0.9 + fl * 0.15), [255, 150, 70], 1.0, true); if (t % 5 === 0) addP({ k: 'spark', x: a.x + (rr() - 0.5) * 4, y: a.y - 12, vx: (rr() - 0.5) * 0.4, vy: -0.6 - rr() * 0.5, g: -0.004, life: 40, sz: 1, c: '255,190,90', glow: 1 }); }
      else if (a.t === 'lantern') { fl = 0.85 + 0.15 * Math.sin(t * 0.21 + a.ph * 3) + (rrh(t, a.ph) - 0.5) * 0.12; sc.fillStyle = 'rgba(255,236,170,' + (0.55 + 0.3 * fl) + ')'; sc.fillRect(Math.round(a.gx - cxr) - 1, Math.round(a.gy - cyr), 3, 3); addLight(L, a.x, a.y, 58 * fl, [255, 200, 120], 0.85 * fl, true); }
      else if (a.t === 'candle') { fl = 0.8 + 0.2 * Math.sin(t * 0.5 + a.ph) + (rrh(t, a.ph) - 0.5) * 0.2; sc.fillStyle = '#ff9a30'; sc.fillRect(ax, ay - 2, 1, 3); sc.fillStyle = '#ffe890'; sc.fillRect(ax, ay - 1, 1, 1); addLight(L, a.x, a.y - 2, 44 * fl, [255, 190, 110], 0.8 * fl, true); }
      else if (a.t === 'glow') { fl = 0.7 + 0.3 * Math.sin(t * 0.04 + a.ph); addLight(L, a.x, a.y, a.r, a.c, 0.55 * fl); if ((t + a.ph * 17) % 120 < 3) { sc.fillStyle = '#fff'; sc.fillRect(ax - 1 + (a.ph % 5), ay - 4, 1, 3); sc.fillRect(ax - 2 + (a.ph % 5), ay - 3, 3, 1); } }
    });
    BIOME.length; wd.flies.forEach(function (fy) {
      var fx = fy.x + Math.sin(t * 0.011 * fy.sp + fy.ph) * 18, fyy = fy.y + Math.cos(t * 0.017 * fy.sp + fy.ph * 2) * 9;
      if (fx < cxr - 6 || fx > cxr + W + 6 || fyy < cyr - 6 || fyy > cyr + H + 6 || fyy > wyS - 2) return;
      var bl = 0.5 + 0.5 * Math.sin(t * 0.07 * fy.sp + fy.ph * 3); if (bl < 0.15) return; var col = BIOME[fy.s].fly;
      sc.fillStyle = 'rgba(' + col + ',' + bl + ')'; sc.fillRect(Math.round(fx - cxr), Math.round(fyy - cyr), 1, 1); sc.fillStyle = 'rgba(' + col + ',' + bl * 0.4 + ')'; sc.fillRect(Math.round(fx - cxr) - 1, Math.round(fyy - cyr), 3, 1);
      L.push({ x: fx - cxr, y: fyy - cyr, r: 11, c: col.split(',').map(Number), a: 0.45 * bl });
    });
    // zonas
    var s0 = st(), round = s0 ? s0.round : 1, lb = bodies[active], nearZ = lb ? zoneNear(lb) : null;
    wd.zones.forEach(function (z) {
      if (z.x < cxr - 40 || z.x > cxr + W + 40) return;
      var act = z.id === 'zone' + round || (z.lia && round >= 5);
      drawZone(z, t, act, nearZ === z);
      addLight(L, z.x, z.y - 10, z.lia ? 60 : 30, z.lia ? [255, 235, 200] : (act ? [140, 255, 190] : [255, 110, 90]), act || z.lia ? 0.6 : 0.3);
      if (z.lia) { sc.save(); sc.translate(-cxr, -cyr); drawLia(z, t); sc.restore(); }
    });
    // niebla baja en el suelo (deriva lenta) de la galeria donde esta el jugador
    var lbm = bodies[active], mistY = lbm ? lbm.y + 1 : TA * T;
    sc.globalAlpha = 0.5; sc.globalCompositeOperation = 'lighter';
    for (var mx = -(((Math.round(cxr * 1.1 + t * 0.12) % 160) + 160) % 160) - 160; mx < W; mx += 160) for (var my = 0; my < 3; my++) { var myy = Math.round(mistY - cyr - 14 + my * 22 - Math.min(my * 4, 8)); if (myy > -30 && myy < H) { sc.globalAlpha = 0.16 - my * 0.03; sc.drawImage(wd.mist, mx + my * 53, myy); } }
    sc.globalAlpha = 1; sc.globalCompositeOperation = 'source-over';
    // jugadores
    var order = Object.keys(bodies).sort(function (a, b) { return bodies[a].y - bodies[b].y; });
    order.forEach(function (id) {
      var b = bodies[id]; if (b.x < cxr - 30 || b.x > cxr + W + 30) return;
      if (b.grounded) { sc.fillStyle = 'rgba(8,4,16,0.45)'; sc.fillRect(Math.round(b.x - cxr) - 4, Math.round(b.y - cyr) - 1, 9, 2); sc.fillRect(Math.round(b.x - cxr) - 3, Math.round(b.y - cyr) - 2, 7, 1); }
      var wf = b.warp ? 1 - Math.abs(b.warp.t - 22) / 22 : 1; sc.globalAlpha = b.warp ? 0.25 + 0.5 * Math.abs(Math.sin(b.warp.t * 0.6)) * wf : 1;
      sc.save(); sc.translate(-cxr, -cyr); drawBody(b); sc.restore(); sc.globalAlpha = 1;
      if (b.y - 12 > wyL) addLight(L, b.x, b.y - 12, 26, [150, 210, 255], 0.4); else addLight(L, b.x, b.y - 12, 54, b.role === 'ing' ? [255, 240, 190] : [255, 220, 170], 0.7, true);   // sumergido: la linterna se apaga
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
      for (y = yStart; y < Math.min(H, yStart + 56); y += 2) {   // reflejo especular de lo que hay sobre la superficie
        var srcY = Math.round(2 * sy - y - 2); if (srcY < 0 || srcY > H - 2) continue;
        out.globalAlpha = 0.3 * (1 - (y - sy) / 58); out.drawImage(scv, 0, srcY, W, 2, Math.round(Math.sin(y * 0.5 + t * 0.07) * 1.5), y, W, 2);
      }
      out.globalAlpha = 1;
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
    var fgx = -(((Math.round(cxr * 1.35) % 640) + 640) % 640), fgy = PH - cyr - 30;
    out.globalAlpha = 0.9;
    for (x = fgx; x < W; x += 640) if (fgy < H) out.drawImage(wd.fg, x, fgy);
    out.globalAlpha = 1;
    out.drawImage(wd.vig, 0, 0);
    if (flash > 0) { out.fillStyle = 'rgba(' + flashCol + ',' + flash * 0.6 + ')'; out.fillRect(0, 0, W, H); }
    drawOverlay(cxr, cyr, t, order);
    cam.x = cam.rx; cam.y = cam.ry;
  }

  /* ---------- overlay: POI, prompt E, burbujas, avisos ---------- */
  var KEY_COL = { info: '#ffd24a', recurso: '#5ad2c8', secreto: '#c07aff' };
  function pill(x, y, w, h, fill, border) {
    out.fillStyle = '#10081c'; out.fillRect(x + 1, y - 1, w - 2, h + 2); out.fillRect(x - 1, y + 1, w + 2, h - 2);
    out.fillStyle = border; out.fillRect(x + 1, y, w - 2, h); out.fillRect(x, y + 1, w, h - 2);
    out.fillStyle = fill; out.fillRect(x + 1, y + 1, w - 2, h - 2);
  }
  function keycap(x, y, down, on) {
    out.fillStyle = '#10081c'; out.fillRect(x, y, 9, 10);
    out.fillStyle = on ? '#6a6070' : '#8a7040'; out.fillRect(x + 1, y + 2 + (down ? 1 : 0), 7, 7 - (down ? 1 : 0));
    out.fillStyle = on ? '#cfc8d8' : '#fff2c0'; out.fillRect(x + 1, y + 1 + (down ? 2 : 0), 7, 6 - (down ? 1 : 0));
    drawText(out, 'E', x + 3, y + 2 + (down ? 2 : 0), '#3a1a10');
  }
  function iconDraw(name, kind, cx, cy, alpha) {
    var im = null, m = null, idx = -1;
    ['poi_icons', 'icons'].forEach(function (sn) { if (idx >= 0) return; var i2 = sheet(sn), m2 = i2 && assets.meta[sn]; if (!m2) return; var k = m2.names ? m2.names.indexOf(name) : (m2.index && m2.index[name] !== undefined ? m2.index[name] : -1); if (k >= 0) { im = i2; m = m2; idx = k; } });
    out.globalAlpha = alpha;
    if (im && idx >= 0) { var fw = m.fw || 16, fh = m.fh || 16, cols = m.cols || Math.floor(im.width / fw); out.drawImage(im, (idx % cols) * fw, Math.floor(idx / cols) * fh, fw, fh, Math.round(cx - fw / 2), Math.round(cy - fh / 2), fw, fh); }
    else {
      var bm = ICONS[name] || ICONS[kind === 'secreto' ? 'secreto' : kind === 'recurso' ? 'caja' : 'info'];
      for (var y = 0; y < 9; y++) for (var x = 0; x < 9; x++) { var ch = bm[y][x]; if (ch !== '.') { out.fillStyle = ICOL[ch]; out.fillRect(Math.round(cx) - 4 + x, Math.round(cy) - 4 + y, 1, 1); } }
    }
    out.globalAlpha = 1;
  }
  function drawPoi(p, cxr, cyr, t, lb, shown) {
    var x = Math.round(p.x - cxr), y = Math.round(p.y - cyr);
    if (x < -30 || x > W + 30) return;
    var col = KEY_COL[p.kind] || KEY_COL.info, near = lb && Math.abs(lb.x - p.x) < 15 && Math.abs(lb.y - p.y) < 26, blocked = lb && poiBlocked(lb, p);
    if (p.kind === 'secreto' && !p.disc) {
      if ((t + p.slot * 13) % 70 < 14) { out.fillStyle = '#e8c8ff'; out.fillRect(x, y - 10, 1, 1); out.fillRect(x - 1, y - 9, 3, 1); out.fillRect(x, y - 8, 1, 1); }
      return;
    }
    var sub = p.y - 12 > waterY(wlCur), bob = Math.round(Math.sin(t * 0.08 + p.ph) * (sub ? 2.5 : 1.5)), py = y - 24 + bob - Math.round(p.pulse * 5);
    // anillo en el suelo
    var rp = (t * 0.03 + p.ph) % 1;
    if (!p.used) { out.strokeStyle = 'rgba(' + hexRGB(col) + ',' + (0.55 * (1 - rp)) + ')'; out.lineWidth = 1; out.beginPath(); out.ellipse(x, y, 4 + rp * 10, 1.5 + rp * 3, 0, 0, TAU); out.stroke(); }
    pill(x - 7, py - 7, 15, 15, p.used ? '#2a2638' : '#241a3a', p.used ? '#5a5870' : sub ? '#4aa8e8' : col);
    iconDraw(p.icon, p.kind, x, py, p.used ? 0.4 : 1);
    if (sub) { out.fillStyle = 'rgba(30,120,190,0.5)'; out.fillRect(x - 6, py - 6, 13, 13); out.fillStyle = 'rgba(190,235,255,0.8)'; out.fillRect(x - 5 + ((t >> 3) & 3), py - 5 + ((t >> 2) & 1), 1, 1); out.fillRect(x + 2, py + 3 - ((t >> 3) & 3), 1, 1); }
    if (p.used) { out.fillStyle = '#7dffb0'; out.fillRect(x + 5, py - 9, 1, 3); out.fillRect(x + 4, py - 7, 1, 1); out.fillRect(x + 6, py - 10, 1, 1); }
    out.fillStyle = p.used ? '#5a5870' : col; out.fillRect(x, py + 9, 1, 1); out.fillRect(x - 1, py + 8, 3, 1);
    if (near && shown) {
      var lab = String(p.label || 'Examinar').slice(0, 26) + (blocked ? ' - ' + blocked : sub ? ' - BAJO EL AGUA' : ''), w = 13 + textW(lab) + 6, bx = clamp(Math.round(x - w / 2), 2, W - w - 2), by = py - 26 - Math.round(Math.sin(t * 0.12) * 1);
      pill(bx, by, w, 13, '#1a1228', blocked ? '#5a5870' : sub ? '#4aa8e8' : col);
      keycap(bx + 2, by + 1, !!(lb && lb.interT > 0), !!blocked);
      drawText(out, lab, bx + 13, by + 4, blocked ? '#8a86a0' : sub ? '#bfeaff' : '#fff2d0');
    }
  }
  function hexRGB(h) { var c = hex(h); return c[0] + ',' + c[1] + ',' + c[2]; }
  function wrap(s, n) { var words = s.split(' '), lines = [], cur = ''; words.forEach(function (w) { if ((cur + ' ' + w).trim().length > n && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }); if (cur) lines.push(cur); return lines; }
  function drawBubble(role, b, cxr, cyr, t, hy) {
    var bb = bub[role]; if (!bb) return; var x = Math.round(b.x - cxr), fade = bb.max - bb.t < 14 ? (bb.max - bb.t) / 14 : 1, C = ROLE_COL[b.role] || ROLE_COL.guia;
    var pic = EMO[bb.text.trim()] || null, thk = bb.think || (!pic && /^[^\x00-\x7F]{1,4}$/.test(bb.text.trim()));
    out.globalAlpha = fade;
    if (thk || pic) {
      var w = 15, h = 13, bx = x - 7, by = hy - h - 4 - Math.round(Math.sin(t * 0.1) * 1);
      pill(bx, by, w, h, '#f4ecdc', C.coat); out.fillStyle = '#10081c'; out.fillRect(x - 1, by + h, 3, 2); out.fillRect(x, by + h + 2, 1, 1); out.fillStyle = '#f4ecdc'; out.fillRect(x, by + h, 1, 1);
      if (thk) { for (var i = 0; i < 3; i++) { var up = Math.round(Math.sin(t * 0.2 - i * 0.9) * 1.5); out.fillStyle = '#2a1e2c'; out.fillRect(bx + 3 + i * 4, by + 6 + up, 2, 2); } }
      else for (var yy = 0; yy < 7; yy++) for (var xx = 0; xx < 7; xx++) { var ch = pic[yy][xx]; if (ch !== '.') { out.fillStyle = ICOL[ch]; out.fillRect(bx + 4 + xx, by + 3 + yy, 1, 1); } }
    } else {
      var shownN = Math.min(bb.text.length, Math.floor(bb.t / 1.5) + 1), full = wrap(bb.text, 20).slice(0, 3), lines = wrap(bb.text.slice(0, shownN), 20).slice(0, 3), mw = 0;
      full.forEach(function (l) { mw = Math.max(mw, textW(l)); });
      var w2 = mw + 8, h2 = full.length * 7 + 5, bx2 = clamp(x - Math.round(w2 / 2), 2, W - w2 - 2), by2 = hy - h2 - 5;
      pill(bx2, by2, w2, h2, '#f4ecdc', C.coat);
      out.fillStyle = '#10081c'; out.fillRect(x - 1, by2 + h2, 3, 2); out.fillRect(x, by2 + h2 + 2, 1, 1); out.fillStyle = '#f4ecdc'; out.fillRect(x, by2 + h2, 1, 1);
      lines.forEach(function (l, i) { drawText(out, l, bx2 + 4, by2 + 3 + i * 7, '#2a1e2c'); });
    }
    out.globalAlpha = 1;
  }
  function drawOverlay(cxr, cyr, t, order) {
    var lb = bodies[active], k, p;
    // POI
    var near = null; for (k in pois) { p = pois[k]; if (lb && Math.abs(lb.x - p.x) < 15 && Math.abs(lb.y - p.y) < 26 && (!near || Math.abs(lb.x - p.x) < Math.abs(lb.x - near.x))) near = p; }
    for (k in pois) { p = pois[k]; drawPoi(p, cxr, cyr, t, lb, p === near); }
    drawGuide(cxr, cyr, t);
    if (hintText) { var hw2 = textW(hintText) + 10, hx = Math.round((VIS.x0 + VIS.x1 - hw2) / 2); pill(hx, VIS.y0 + 4, hw2, 12, '#1a1228', '#ffd24a'); drawText(out, hintText, hx + 5, VIS.y0 + 8, '#fff2d0'); }
    // zonas de habilidad (puente / estacion medica) con prompt
    wd.zones.forEach(function (z) {
      if (!z.role || z.id === 'lia' || !lb || lb.role !== z.role) return;
      if (Math.abs(lb.x - z.x) < z.r && Math.abs(lb.y - z.y) < 22 && !((z.id === 'bridge2' && gate.bridge2) || (z.id === 'med4' && gate.barrier4))) {
        var lab = z.id === 'bridge2' ? 'Construir puente' : 'Disolver barrera (mantener)', w = 13 + textW(lab) + 6, bx = clamp(Math.round(z.x - cxr - w / 2), 2, W - w - 2), by = Math.round(z.y - cyr) - 44;
        pill(bx, by, w, 13, '#1a1228', '#5ad2c8'); keycap(bx + 2, by + 1, lb.interT > 0 || lb.holdT > 0, false); drawText(out, lab, bx + 13, by + 4, '#fff2d0');
      }
    });
    // nombres y marcador local
    order.forEach(function (id) {
      var b = bodies[id], x = Math.round(b.x - cxr), y = Math.round(b.y - cyr);
      if (x < -20 || x > W + 20) return;
      var nm = String(b.name || id).slice(0, 8), C = ROLE_COL[b.role] || ROLE_COL.guia;
      drawText(out, nm, x - Math.floor(textW(nm) / 2), y - 25, C.name, '#10081c');
      if (id === active) { out.fillStyle = '#10081c'; out.fillRect(x - 2, y - 30, 5, 3); out.fillStyle = '#fff'; out.fillRect(x - 1, y - 30, 3, 1); out.fillRect(x, y - 29, 1, 1); }
      drawBubble(id, b, cxr, cyr, t, y - 28);
    });
    var mb = bodies.medica;
    if (mb && mb.holdT > 0) { var hx = Math.round(mb.x - cxr), hy = Math.round(mb.y - cyr) - 34, pr = mb.holdT / 90; out.fillStyle = '#10081c'; out.fillRect(hx - 12, hy, 25, 5); out.fillStyle = '#2a4a3a'; out.fillRect(hx - 11, hy + 1, 23, 3); out.fillStyle = '#7dffb0'; out.fillRect(hx - 11, hy + 1, Math.round(23 * pr), 3); }
    // aviso de agua
    var wsy = waterY(wlCur) - cyr;
    if (warnPulse > 0) { out.fillStyle = 'rgba(255,60,60,' + (0.18 * warnPulse * (0.6 + 0.4 * Math.sin(t * 0.4))) + ')'; out.fillRect(0, 0, W, 5); out.fillRect(0, H - 5, W, 5); out.fillRect(0, 0, 4, H); out.fillRect(W - 4, 0, 4, H); }
    if (wsy > H && wsy < H + 90) { out.fillStyle = 'rgba(90,190,255,' + (0.5 + 0.3 * Math.sin(t * 0.15)) + ')'; out.fillRect(W / 2 - 24, H - 2, 48, 2); drawText(out, 'AGUA ^', W / 2 - 12, H - 9, '#9fe0ff', '#10081c'); }
    if (banner) { var a = Math.min(1, banner.t / 8, (banner.max - banner.t) / 14), tw = textW(banner.text) * 2, bx3 = Math.round((W - tw) / 2); out.globalAlpha = a;
      out.fillStyle = 'rgba(40,6,12,0.8)'; out.fillRect(bx3 - 6, 12, tw + 12, 16); out.fillStyle = (t >> 3) & 1 ? '#ff6a5a' : '#ffd0c0'; out.fillRect(bx3 - 6, 12, tw + 12, 1); out.fillRect(bx3 - 6, 27, tw + 12, 1);
      drawText(out, banner.text, bx3, 16, '#fff0e0', '#40101a', 2); out.globalAlpha = 1; }
  }

  /* =====================================================================
     GUIA (flecha), RUTA sobre el grafo de saltos, MINIMAPA
     ===================================================================== */
  var hintText = null, guideT = null, guideOpt = {}, gcache = { t: -99, key: '', r: null }, arrowC = {};
  function targetPos(id) {      // posicion de mundo (pies) de un POI / 'lia' / {x,y}
    if (id && typeof id === 'object') return { x: +id.x, y: +id.y };
    if (pois[id]) return { x: pois[id].x, y: pois[id].y, poi: pois[id] };
    if (id === 'lia' && poiRound >= 5) return { x: wd.lia.x, y: wd.lia.y, node: true };
    return null;
  }
  function routeFrom(b, tp) {
    if (!b || !tp) return null;
    var direct = Math.hypot(tp.x - b.x, tp.y - b.y) / T, res = { ok: false, dist: direct, direct: true, wp: null, straight: direct };
    ensureNav(b.x); ensureNav(tp.x);
    var goal = tp.poi || tp.node ? nid(Math.floor(tp.x / T), Math.round(tp.y / T)) : nodeNear(tp.x, tp.y, { y: tp.y });
    if (goal < 0 || !nav.out[goal]) return res;
    var f = fieldFor(goal), cur = curNode(b); if (cur >= 0) b.lastNode = cur; else cur = b.lastNode === undefined ? -1 : b.lastNode;
    if (cur < 0 || f[cur] === undefined) return res;
    var n = cur, len = 0, steps = 0, wp = null, px = b.x, py = b.y;
    while (n !== goal && steps++ < 600) {
      var es = nav.out[n] || [], best = null, bc = 1e9;
      for (var i = 0; i < es.length; i++) { var e = es[i]; if (!alive(e) || f[e.to] === undefined) continue; var tt = e.cost + f[e.to]; if (tt < bc) { bc = tt; best = e; } }
      if (!best) break;
      var nx = (best.to % LW) * T + 8, ny = ((best.to / LW) | 0) * T, dr = Math.abs(ny - ((n / LW | 0) * T)), dc = Math.abs(nx - ((n % LW) * T + 8));
      len += Math.hypot(nx - px, ny - py); px = nx; py = ny;
      if (!wp && best.k !== 'w' && (dr >= T || dc >= 3 * T) && Math.hypot(nx - b.x, ny - b.y) > 30) wp = { x: nx, y: ny };
      n = best.to;
    }
    res.ok = true; res.dist = len / T; res.direct = len / T <= direct * 1.3 + 4 && Math.abs(tp.y - b.y) < 3 * T; res.wp = wp || { x: tp.x, y: tp.y };
    return res;
  }
  function setGuide(target, o) { guideT = target === undefined ? null : target; guideOpt = o || {}; gcache.t = -99; }
  function getPoiPos(id) { var p = targetPos(id); return p ? { x: p.x, y: p.y } : null; }
  function getRoute(id) {
    var tp = targetPos(id), b = bodies[active], r = routeFrom(b, tp); if (!r) return null;
    return { dist: Math.round(r.dist), meters: Math.round(r.dist), reachable: r.ok, straight: Math.round(r.straight), direct: r.direct, waypoint: r.wp ? { x: r.wp.x, y: r.wp.y } : null };
  }
  function arrowSprite(ai) {
    if (arrowC[ai]) return arrowC[ai];
    var S = 35, c = canvasOf(S, S), x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data, ang = ai / 16 * TAU, ca = Math.cos(ang), sa = Math.sin(ang), m = new Uint8Array(S * S), vv = new Float32Array(S * S), uu = new Float32Array(S * S), i, j, k;
    for (j = 0; j < S; j++) for (i = 0; i < S; i++) {
      var dx = i - 17, dy = j - 17, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
      if ((u >= -10 && u <= 2 && Math.abs(v) <= 3.1) || (u > 2 && u <= 12 && Math.abs(v) <= (12 - u) * 0.86 + 0.3)) { m[j * S + i] = 1; vv[j * S + i] = v; uu[j * S + i] = u; }
    }
    for (j = 1; j < S - 1; j++) for (i = 1; i < S - 1; i++) {
      k = j * S + i; var o4 = k * 4;
      if (m[k]) { var v2 = vv[k], col = v2 < -1.5 ? [255, 246, 170] : v2 > 1.8 ? [232, 140, 50] : uu[k] > 2 ? [255, 214, 70] : [255, 200, 60]; d[o4] = col[0]; d[o4 + 1] = col[1]; d[o4 + 2] = col[2]; d[o4 + 3] = 255; }
      else { var nb = 0; for (var q = -2; q <= 2; q++) for (var r2 = -2; r2 <= 2; r2++) { var kk = (j + q) * S + i + r2; if (kk >= 0 && kk < S * S && m[kk] && Math.abs(q) + Math.abs(r2) <= 3) nb = 1; } if (nb) { d[o4] = 16; d[o4 + 1] = 8; d[o4 + 2] = 28; d[o4 + 3] = 255; } }
    }
    x.putImageData(img, 0, 0); arrowC[ai] = c; return c;
  }
  function drawArrow(x, y, ang, t, col) {
    var ai = ((Math.round(ang / TAU * 16) % 16) + 16) % 16, a = 0.35 + 0.15 * Math.sin(t * 0.15);
    out.globalCompositeOperation = 'lighter';
    var gg = out.createRadialGradient(x, y, 0, x, y, 22); gg.addColorStop(0, 'rgba(' + col + ',' + a + ')'); gg.addColorStop(1, 'rgba(' + col + ',0)');
    out.fillStyle = gg; out.fillRect(x - 22, y - 22, 44, 44); out.globalCompositeOperation = 'source-over';
    out.drawImage(arrowSprite(ai), Math.round(x) - 17, Math.round(y) - 17);
  }
  function guideLabel(text, cx2, y2, col) {
    var w = textW(text) + 8, bx = clamp(Math.round(cx2 - w / 2), VIS.x0 + 2, VIS.x1 - w - 2), by = clamp(Math.round(y2), VIS.y0 + 2, VIS.y1 - 14);
    pill(bx, by, w, 11, '#1a1228', col); drawText(out, text, bx + 4, by + 3, '#fff2d0');
  }
  function drawGuide(cxr, cyr, t) {
    var tp = guideT === null ? null : targetPos(guideT), b = bodies[active]; if (!tp || !b) return;
    if (guideT === 'lia' && poiRound < 5) return;
    if (tp.poi && Math.hypot(tp.x - b.x, tp.y - b.y) < 36) return;   // ya estas encima: manda el prompt de E
    if (tick - gcache.t > 8) { gcache.t = tick; gcache.r = routeFrom(b, tp); }
    var r = gcache.r || { ok: false, dist: Math.hypot(tp.x - b.x, tp.y - b.y) / T, direct: true, wp: null }, m = Math.max(1, Math.round(r.dist));
    var tx = tp.x - cxr, ty = tp.y - cyr, onS = tx > VIS.x0 + 8 && tx < VIS.x1 - 8 && ty > VIS.y0 + 14 && ty < VIS.y1 - 4;
    var useWp = r.ok && !r.direct && r.wp, col = '255,214,90', lab = (guideOpt.label ? String(guideOpt.label).slice(0, 22) + ' ' : '') + m + ' M';
    var bob = Math.abs(Math.sin(t * 0.13)) * 5, rp = (t * 0.025) % 1;
    if (onS) {   // anillo pulsante en el objetivo
      out.strokeStyle = 'rgba(255,230,140,' + (0.9 * (1 - rp)) + ')'; out.lineWidth = 1; out.beginPath(); out.ellipse(tx, ty - 12, 6 + rp * 14, 8 + rp * 14, 0, 0, TAU); out.stroke();
      out.strokeStyle = 'rgba(255,230,140,' + (0.8 * (1 - ((rp + 0.5) % 1))) + ')'; out.beginPath(); out.ellipse(tx, ty - 12, 6 + ((rp + 0.5) % 1) * 14, 8 + ((rp + 0.5) % 1) * 14, 0, 0, TAU); out.stroke();
    }
    var ax, ay, aim = null;
    if (!useWp) { if (onS) { ax = tx; ay = ty - 52 - bob; drawArrow(ax, ay, TAU / 4, t, col); guideLabel(lab, ax, ay - 30, '#ffd24a'); return; } aim = { x: tx, y: ty }; }
    else {
      var wx = r.wp.x - cxr, wy = r.wp.y - cyr;
      if (onS) guideLabel(lab, tx, ty - 40, '#ffd24a');
      if (wx > VIS.x0 + 8 && wx < VIS.x1 - 8 && wy > VIS.y0 + 14 && wy < VIS.y1 - 4) { drawArrow(wx, wy - 26 - bob, TAU / 4, t, col); if (!onS) guideLabel(lab, wx, wy - 58 - bob, '#ffd24a'); return; }
      aim = { x: wx, y: wy };
    }
    var vcx = (VIS.x0 + VIS.x1) / 2, vcy = (VIS.y0 + VIS.y1) / 2, dx = aim.x - vcx, dy = aim.y - vcy, hw = (VIS.x1 - VIS.x0) / 2 - 22, hh = (VIS.y1 - VIS.y0) / 2 - 22;
    var kk = Math.min(Math.abs(dx) > 0.01 ? hw / Math.abs(dx) : 1e9, Math.abs(dy) > 0.01 ? hh / Math.abs(dy) : 1e9), ln = Math.hypot(dx, dy) || 1;
    var ex = vcx + dx * kk + dx / ln * bob * 0.8, ey = vcy + dy * kk + dy / ln * bob * 0.8;
    drawArrow(ex, ey, Math.atan2(dy, dx), t, col);
    guideLabel(lab, ex - dx / ln * 30, ey - dy / ln * 22 - 6, '#ffd24a');
  }
  var mmC = {};
  function mmSil(sec) {
    if (mmC[sec]) return mmC[sec];
    var c = canvasOf(SECW, LH), x = c.getContext('2d'), img = x.createImageData(SECW, LH), d = img.data;
    for (var r = 0; r < LH; r++) for (var cc = 0; cc < SECW; cc++) { var v = wd.g[r * LW + sec * SECW + cc], o = (r * SECW + cc) * 4; if (v === 1) { d[o] = 70; d[o + 1] = 62; d[o + 2] = 96; d[o + 3] = 255; } else if (v === 2) { d[o] = 200; d[o + 1] = 150; d[o + 2] = 90; d[o + 3] = 255; } else { d[o] = 14; d[o + 1] = 10; d[o + 2] = 26; d[o + 3] = 255; } }
    x.putImageData(img, 0, 0); return (mmC[sec] = c);
  }
  function drawMinimap(ctx, w, h) {
    if (!ctx || !w || !h) return false;
    var b = bodies[active], sec = b ? secOfX(b.x) : clamp(poiRound - 1, 0, NS - 1), sc3 = Math.min(w / SECW, h / LH), dw = SECW * sc3, dh = LH * sc3, ox = (w - dw) / 2, oy = (h - dh) / 2, k;
    ctx.save(); ctx.fillStyle = '#0a0712'; ctx.fillRect(0, 0, w, h); ctx.imageSmoothingEnabled = false; ctx.drawImage(mmSil(sec), ox, oy, dw, dh);
    var wyT = (waterY(wlCur) / T) * sc3 + oy; if (wyT < oy + dh) { ctx.fillStyle = 'rgba(70,170,230,0.45)'; ctx.fillRect(ox, Math.max(oy, wyT), dw, oy + dh - Math.max(oy, wyT)); }
    function pt(wx2, wy2) { return [ox + (wx2 / T - sec * SECW) * sc3, oy + (wy2 / T) * sc3]; }
    function dot(wx2, wy2, rad, col, ring) { var q = pt(wx2, wy2); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(q[0], q[1], rad, 0, TAU); ctx.fill(); if (ring) { ctx.strokeStyle = ring; ctx.lineWidth = 1; ctx.stroke(); } }
    for (k in pois) { var p = pois[k]; if (secOfX(p.x) !== sec || (p.kind === 'secreto' && !p.disc && !p.used)) continue; dot(p.x, p.y - 8, Math.max(1.5, sc3 * 0.9), p.used ? '#6a6880' : KEY_COL[p.kind] || '#ffd24a'); }
    var gp = guideT === null ? null : targetPos(guideT);
    if (gp && secOfX(gp.x) === sec) { var q2 = pt(gp.x, gp.y - 8), pu = 2 + Math.abs(Math.sin(tick * 0.1)) * 3; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(q2[0], q2[1], Math.max(2.5, sc3) + pu, 0, TAU); ctx.stroke(); }
    ROLES.forEach(function (r) { var bb = bodies[r]; if (!bb || secOfX(bb.x) !== sec) return; dot(bb.x, bb.y - 6, Math.max(1.6, sc3 * 0.8) + (r === active ? 0.8 : 0), (ROLE_COL[r] || ROLE_COL.guia).coat, r === active ? '#fff' : '#10081c'); });
    ctx.restore(); return true;
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
  // un humano = un rol. setLocal fija cual; el resto son companeros IA (setBot). setActive/setFollow quedan como alias inofensivos.
  function setLocal(role) {
    if (!bodies[role]) return; active = role; localId = role; cam.trans = 40;
    ROLES.forEach(function (r) { bodies[r].bot = r !== role; if (r === role) { bodies[r].goal = null; bodies[r].mac = null; } });
  }
  function setBot(role, on) { var b = bodies[role]; if (!b) return; b.bot = !!on; if (!on) { b.goal = null; b.mac = null; b.warp = null; } }
  ROLES.forEach(function (r) { bodies[r].bot = r !== active; });
  function setActive(role) { setLocal(role); }
  function setFollow(role, on) { setBot(role, on); }
  function fit(maxW, maxH) {
    maxW = maxW || global.innerWidth; maxH = maxH || global.innerHeight;
    var s = Math.max(1, Math.floor(Math.min(maxW / W, maxH / H)));
    canvas.style.width = W * s + 'px'; canvas.style.height = H * s + 'px'; return s;
  }

  Object.assign(self, {
    start: start, stop: stop, step: step, render: render, setInput: setInput, setLocal: setLocal, setBot: setBot, setActive: setActive, setFollow: setFollow, resetGates: resetGates, gate: gate, snapshot: snapshot, applySnapshot: applySnapshot,
    setWater: setWater, setWaterRate: setWaterRate, spawnFx: spawnFx, fx: spawnFx, camShake: function (a) { addShake(clamp(+a || 3, 0.5, 10)); }, pan: pan, gather: gather, fit: fit,
    setPois: setPois, markPoi: markPoi, botGoto: botGoto, say: say, pois: pois, stats: stats, nav: nav, curNode: curNode, poiPos: function (id) { var p = pois[id]; return p ? { x: p.x, y: p.y } : null; },
    slotPos: function (round, slot) { var q = wd.slots[clamp(round | 0, 1, NS) - 1][slot]; return q ? { x: q.x, y: q.y } : null; },
    botInput: function () { return NOI(); }, brain: botBrain, sim: simEdge, isNode: isNode,
    addPlayer: function (id, role, name) { var b = addBody(id, role, name, Object.keys(bodies).length); b.manual = true; return b; },
    setCameraFixed: function (x, y) { cam.mode = 'fixed'; cam.fx = x; cam.fy = y; }, setCameraFollow: function () { cam.mode = 'follow'; },
    setGuide: setGuide, getPoiPos: getPoiPos, getRoute: getRoute, focus: focus, setViewInsets: setViewInsets, drawMinimap: drawMinimap, setHint: function (t) { hintText = t ? String(t) : null; },
    bodies: bodies, cam: cam, zones: wd.zones, world: wd, tileAt: tileAt
  });
  Object.defineProperties(self, { water: { get: function () { return wlCur; } }, poiMap: { get: function () { return pois; } }, waterRate: { get: function () { return waterRate; } }, tick: { get: function () { return tick; } }, active: { get: function () { return active; } } });
  // camara inicial
  syncBodies(); snapCam();
  if (!opts.noCurrent) global.Engine.current = self;
  return self;
}

/* ---------- demo para menu: 3 companeros IA exploran los POI de cada tramo; el agua sube ---------- */
function demoLoop(canvas, opts) {
  opts = opts || {};
  var inst = create(canvas, { assets: opts.assets || global.ASSETS, localRole: 'guia', authority: true, water: 10 });
  var ids = ['guia', 'medica', 'ing'], round = 0, running = true, raf = 0, last = performance.now(), acc = 0, tk = 0, phase = 0;
  ids.forEach(function (r) { inst.setBot(r, true); });
  function nextRound() {
    round = round % 5 + 1; inst.gather(round); inst.setWater(8 + round * 6); inst.setWaterRate(0.25);
    inst.setPois(round, [0, 1, 2, 3].map(function (i) { return { id: 'd' + i, slot: i, label: 'Examinar', icon: ['mapa', 'caja', 'radio', 'secreto'][i], kind: i === 3 ? 'secreto' : 'info' }; }));
    phase = 0; tk = 0;
  }
  function assign() { ids.forEach(function (r, i) { inst.botGoto(r, 'd' + ((i + phase) % 4), function () { inst.markPoi('d' + ((i + phase) % 4), { used: true, by: r }); }); }); phase++; }
  nextRound(); assign();
  function frame(ts) {
    if (!running) return; raf = requestAnimationFrame(frame);
    acc += Math.min(0.1, (ts - last) / 1000); last = ts;
    while (acc >= 1 / 60) { acc -= 1 / 60; tk++; inst.step(); if (tk % 900 === 0) { if (phase >= 4) nextRound(); assign(); } }
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
  setBot: function (r, on) { if (this.current) this.current.setBot(r, on); },
  setPois: function (r, l) { if (this.current) this.current.setPois(r, l); },
  markPoi: function (id, o) { if (this.current) this.current.markPoi(id, o); },
  botGoto: function (r, t, cb) { return this.current ? this.current.botGoto(r, t, cb) : false; },
  say: function (r, t, o) { if (this.current) this.current.say(r, t, o); },
  setWater: function (l) { if (this.current) this.current.setWater(l); },
  setWaterRate: function (v) { if (this.current) this.current.setWaterRate(v); },
  gather: function (r) { if (this.current) this.current.gather(r); },
  pan: function (r) { if (this.current) this.current.pan(r); },
  fx: function (t, x, y) { if (this.current) this.current.fx(t, x, y); },
  camShake: function (a) { if (this.current) this.current.camShake(a); },
  sectionOf: function (x) { return clamp(Math.floor(x / SPW), 0, NS - 1) + 1; }, version: '4.0',
  setGuide: function (t, o) { if (this.current) this.current.setGuide(t, o); },
  getPoiPos: function (id) { return this.current ? this.current.getPoiPos(id) : null; },
  getRoute: function (id) { return this.current ? this.current.getRoute(id) : null; },
  focus: function (x, y, o) { if (this.current) this.current.focus(x, y, o); },
  setViewInsets: function (o) { if (this.current) this.current.setViewInsets(o); },
  drawMinimap: function (c, w, h) { return this.current ? this.current.drawMinimap(c, w, h) : false; } };
})(window);
