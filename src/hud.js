/* hud.js -> window.Hud : UI DENTRO de la partida (overlay DOM sobre el canvas).
   Sin dependencias. Usa window.Sound / window.ASSETS / window.Story si existen (todo con guardas). Ver NOTES-hud.md */
(function () {
  'use strict';
  var W = window, D = document;

  /* ---------- datos base ---------- */
  var ROLES = {
    guia: { name: 'Mateo', title: 'Guía', color: '#f2a93b', emoji: '🧭' },
    medica: { name: 'Elena', title: 'Médica', color: '#3fd0c0', emoji: '⚕️' },
    ing: { name: 'Samuel', title: 'Ingeniero', color: '#b58cff', emoji: '🔧' },
    lia: { name: 'Lía', title: 'Radio', color: '#7bf0a0', emoji: '📻' },
    director: { name: 'Director', title: 'Narrador', color: '#ff8a5c', emoji: '🎬' },
    sys: { name: 'Sistema', title: '', color: '#9aa5b1', emoji: 'ℹ️' }
  };
  var PLAYER_ROLES = ['guia', 'medica', 'ing'];
  var STATS = [
    { k: 'agua', label: 'AGUA', color: '#3aa0ff', bad: true },
    { k: 'salud', label: 'SALUD', color: '#5fe39a' },
    { k: 'material', label: 'MATERIAL', color: '#f2a93b' },
    { k: 'confianza', label: 'CONFIANZA', color: '#b58cff' }
  ];
  var PHASES = {
    briefing: { n: 'BRIEFING', i: 'Lee el evento del tramo', c: '#ff8a5c', e: '📜' },
    explore: { n: 'EXPLORA', i: 'Camina por la cueva y presiona E junto a los iconos brillantes', c: '#3fd0c0', e: '🔍' },
    plan: { n: 'PLAN', i: 'Debatan en el chat y voten el plan (1 · 2 · 3)', c: '#b58cff', e: '🗳️' },
    secret: { n: 'ACCIÓN SECRETA', i: 'Elige en privado. Se revela al final del tramo', c: '#f2a93b', e: '🔒' },
    resolve: { n: 'RESOLUCIÓN', i: 'Mira qué pasó', c: '#ff6b6b', e: '🎲' },
    summary: { n: 'RESUMEN', i: 'Tus notas del tramo', c: '#5fe39a', e: '📊' },
    final: { n: 'FINAL', i: '', c: '#f2a93b', e: '🏁' }
  };
  var HELP = {
    briefing: ['Nuevo tramo', 'Lee el evento: marca el ambiente del tramo. Lía te habla por radio. En unos segundos empieza la exploración.'],
    explore: ['Explora y recoge información', 'Camina con WASD o flechas y presiona E junto a un icono brillante: te da una tarjeta de información PRIVADA. Tus compañeros no la ven si no se la cuentas. Habla en el chat (T) y comparte lo que sepas desde el cuaderno (J). Cuando estés listo, presiona «Hablar con el equipo y decidir» (R). CONTROLES: A D / flechas = mover · Espacio = saltar · Shift = correr · E = examinar · Q = habilidad · T = chat · M = mapa.'],
    plan: ['Elegid el plan del equipo', 'Cada opción tiene información parcial. Lo que tú sabes en privado está resaltado. Convence a los demás en el chat y vota con 1, 2 o 3. Gana la mayoría.'],
    secret: ['Tu acción secreta', 'Elige una de las 3: una ayuda al equipo, otra a tu objetivo secreto y otra es arriesgada. Nadie ve tu elección hasta la resolución. Presiona la misma tecla otra vez, o SELLAR, para confirmar.'],
    resolve: ['Resolución', 'Se tiran los dados del riesgo según el plan, la información compartida y las acciones secretas. Los secretos y las mentiras salen a la luz.'],
    summary: ['Resumen del tramo', 'Aquí sí se cuentan los puntos: por trabajo en equipo, información compartida, honestidad y riesgo bien calculado.']
  };
  var CHIPS = {
    explore: ['Les cuento lo que vi', '¿Qué encontraron?', 'No me fío de eso', 'Necesito material'],
    plan: ['Propongo la ruta {A}', 'Necesito material', 'No me fío de eso', 'Votemos'],
    _: ['Les cuento lo que vi', 'Propongo la ruta B', 'No me fío de eso', 'Necesito material', 'Votemos']
  };
  var EMOJI = { agua: '💧', salud: '❤️', material: '🧰', confianza: '🤝', cuerda: '🪢', bateria: '🔋', radio: '📻', mapa: '🗺️', botiquin: '🩹', llave: '🔑', ojo: '👁️', candado: '🔒', trofeo: '🏆', estrella: '⭐', reloj: '⏱️', chat: '💬', voto: '🗳️', alerta: '⚠️', secreto: '🕵️', ap: '◆', info: '📄', recurso: '📦' };
  var ICON_ORDER = ['agua', 'salud', 'material', 'confianza', 'cuerda', 'bateria', 'radio', 'mapa', 'botiquin', 'llave', 'ojo', 'candado', 'trofeo', 'estrella', 'reloj', 'chat', 'voto', 'alerta', 'secreto', 'ap'];
  var EXPR = ['neutral', 'preocupado', 'enfadado', 'feliz'];
  var EVENT_EMOJI = { derrumbe: '🪨', inundacion: '🌊', gas: '☣️', grieta: '🕳️', tormenta: '⛈️', linterna: '🔦', hipotermia: '🥶', murcielagos: '🦇', eco: '🔊' };
  var GOAL_STATS = { agua: 'Agua', salud: 'Salud', material: 'Material', confianza: 'Confianza' };

  /* ---------- utilidades ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function snd(n, o) { try { if (W.Sound && W.Sound.sfx) W.Sound.sfx(n, o); } catch (e) { } }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function A() { return W.ASSETS || { images: {}, meta: {} }; }
  function img(n) { var a = A(); return a.images && a.images[n]; }
  function meta(n) { var a = A(); return a.meta && a.meta[n]; }
  function roleInfo(r) {
    var b = ROLES[r] || { name: r || '?', title: '', color: '#9aa5b1', emoji: '•' };
    var p = P && P.players && P.players[r];
    return p && p.name ? Object.assign({}, b, { name: p.name }) : b;
  }
  function mmss(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function relInfo(r) { // fiabilidad 0..1 o 0..100
    var v = r > 1 ? r : r * 100; v = Math.round(clamp(v || 0, 0, 100));
    return { v: v, label: v >= 80 ? 'FIABLE' : v >= 65 ? 'PROBABLE' : 'DUDOSA', cls: v >= 80 ? 'hi' : v >= 65 ? 'mid' : 'lo' };
  }
  function relTag(r) { var i = relInfo(r); return '<span class="h-rt ' + i.cls + '" title="Fiabilidad estimada">' + i.label + ' ' + i.v + '%</span>'; }
  function relHtml(r) {
    var i = relInfo(r);
    return '<span class="h-rel ' + i.cls + '" title="Fiabilidad estimada"><span class="h-relbar"><i style="width:' + i.v + '%"></i></span><b>' + i.v + '%</b> ' + i.label + '</span>';
  }

  /* sprites con fallback */
  function iconIdx(name) {
    var m = meta('icons') || {}, n = String(name).toLowerCase();
    if (Array.isArray(m.names)) return m.names.indexOf(n);
    if (m.index && typeof m.index === 'object' && m.index[n] != null) return m.index[n];
    if (m.names && typeof m.names === 'object' && m.names[n] != null) return m.names[n];
    return ICON_ORDER.indexOf(n);
  }
  function icon(name, size) {
    size = size || 16;
    var src = img('icons'), m = meta('icons'), idx = src && m ? iconIdx(name) : -1;
    if (idx >= 0) {
      var cell = m.cell || m.fw || 16, cols = m.cols || Math.floor(m.w / cell) || 1, s = size / cell;
      return '<i class="h-ic" style="width:' + size + 'px;height:' + size + 'px;background:url(' + src + ') ' + (-(idx % cols) * cell * s) + 'px ' + (-Math.floor(idx / cols) * cell * s) + 'px/' + (m.w * s) + 'px ' + (m.h * s) + 'px"></i>';
    }
    return '<span class="h-ic em" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * .85) + 'px;line-height:' + size + 'px">' + (EMOJI[name] || '•') + '</span>';
  }
  function poiIcon(name, size) {
    var src = img('poi_icons'), m = meta('poi_icons');
    if (src && m && m.names) { var i = Array.isArray(m.names) ? m.names.indexOf(name) : m.names[name]; if (i >= 0) {
      var cell = m.cell || m.fw || 16, cols = m.cols || Math.floor(m.w / cell) || 1, s = size / cell;
      return '<i class="h-ic" style="width:' + size + 'px;height:' + size + 'px;background:url(' + src + ') ' + (-(i % cols) * cell * s) + 'px ' + (-Math.floor(i / cols) * cell * s) + 'px/' + (m.w * s) + 'px ' + (m.h * s) + 'px"></i>'; } }
    return icon(EMOJI[name] ? name : 'info', size);
  }
  /* mood -> imagen. Hoja portrait_<rol> (fw=64): 0 neutral,1 preocupado,2 enfadado,3 feliz; sueltas _alert/_hurt/_talk (si faltan, cae a la hoja).
     Moods de Story: neutral|alert|hurt|angry|happy|talk. Se aceptan también los nombres de la hoja (preocupado/enfadado/feliz). */
  var MOODIDX = { neutral: 0, calma: 0, talk: 0, preocupado: 1, worried: 1, alert: 1, tension: 1, hurt: 1, sad: 1, surprised: 1, enfadado: 2, angry: 2, feliz: 3, happy: 3 };
  var MOODSUF = { alert: '_alert', hurt: '_hurt', talk: '_talk' };
  /* hoja face_<id> (fw=fh=48, 4 col x 6 filas): fila = expresión, columna = 0 cerrada,1/2 hablando,3 parpadeo */
  var FACEROW = { neutral: 0, calma: 0, talk: 0, happy: 1, feliz: 1, worried: 2, alert: 2, preocupado: 2, tension: 2, angry: 3, enfadado: 3, surprised: 4, hurt: 5, sad: 5 };
  function faceInfo(role, mood, col) {
    mood = mood || 'neutral';
    var fn = 'face_' + role, fs = img(fn), fm = fs && meta(fn);
    if (fs && fm) {
      var gw = fm.fw || 48, gh = fm.fh || gw, gc = fm.cols || 4, gr = fm.rows || 6;
      return { src: fs, fw: gw, fh: gh, W: fm.w || gc * gw, H: fm.h || gr * gh, x: ((col | 0) % gc) * gw, y: Math.min(FACEROW[mood] | 0, gr - 1) * gh, anim: true };
    }
    var suf = MOODSUF[mood], n = 'portrait_' + role + (suf || ''), src = suf && img(n);
    if (src) { var m1 = meta(n) || {}; return { src: src, fw: m1.fw || m1.w || 64, fh: m1.fh || m1.h || 64, W: m1.w || 64, H: m1.h || 64, x: 0, y: 0 }; }
    src = img('portrait_' + role); var m = meta('portrait_' + role); if (!src || !m) return null;
    var fw = m.fw || m.cell || 48, fh = m.fh || fw, cols = m.cols || Math.max(1, Math.floor((m.w || fw * 4) / fw)), ei = MOODIDX[mood] || 0;
    return { src: src, fw: fw, fh: fh, W: m.w || cols * fw, H: m.h || fh, x: (ei % cols) * fw, y: Math.floor(ei / cols) * fh };
  }
  function faceCss(f, scale) { return 'width:' + Math.round(f.fw * scale) + 'px;height:' + Math.round(f.fh * scale) + 'px;background:url(' + f.src + ') ' + (-f.x * scale) + 'px ' + (-f.y * scale) + 'px/' + (f.W * scale) + 'px ' + (f.H * scale) + 'px no-repeat'; }
  function portrait(role, expr, size) { // marco con gradiente por rol; usa meta real -> vale cualquier resolucion de hoja
    size = size || 56;
    var b = ROLES[role] || ROLES.sys, f = faceInfo(role, expr), col = b.color;
    var grad = 'linear-gradient(160deg,' + col + '66,#120e26 85%)';
    if (f) {
      var s_ = size / f.fw, hh = Math.round(size * f.fh / f.fw);
      return '<i class="h-por" style="width:' + size + 'px;height:' + hh + 'px;border-color:' + col + ';background:url(' + f.src + ') ' + (-f.x * s_) + 'px ' + (-f.y * s_) + 'px/' + (f.W * s_) + 'px ' + (f.H * s_) + 'px no-repeat,' + grad + '"></i>';
    }
    return '<i class="h-por fb" style="width:' + size + 'px;height:' + size + 'px;border-color:' + col + ';background:' + grad + ';font-size:' + Math.round(size * .55) + 'px;line-height:' + (size - 6) + 'px">' + b.emoji + '</i>';
  }
  /* retrato grande SIN marco (diálogo / «hablando ahora»); scale = factor sobre el tamaño nativo (entero en el diálogo) */
  function bigFace(role, mood, scale) {
    var f = faceInfo(role, mood), b = ROLES[role] || ROLES.sys;
    if (!f) return '<i class="h-big fb" style="width:' + Math.round(64 * scale) + 'px;height:' + Math.round(64 * scale) + 'px;font-size:' + Math.round(40 * scale) + 'px;line-height:' + Math.round(64 * scale) + 'px">' + b.emoji + '</i>';
    return '<i class="h-big" style="' + faceCss(f, scale) + '"></i>';
  }
  /* retrato animado: boca 1<->2 al hablar (8 fps, cerrada en pausas), parpadeo cada 2-4 s en reposo. Sin face_<id> cae al portrait estático. */
  function faceCtl(host, role, mood, scale) {
    var e = D.createElement('i'), st = { role: role, mood: mood, scale: scale, talk: false, closed: false, mouth: 0, blink: 0, nb: Date.now() + 1500 + Math.random() * 2000, last: '' }, tmr;
    host.appendChild(e);
    function paint() {
      var m = st.mood, col = 0, f = faceInfo(st.role, m, 0), an = f && f.anim;
      if (st.talk && !st.closed) { if (an) col = st.mouth ? 2 : 1; else if (st.mouth && (m === 'neutral' || m === 'talk')) m = 'talk'; }
      else if (!st.talk && an && Date.now() < st.blink) col = 3;
      f = faceInfo(st.role, m, col);
      var k = f ? faceCss(f, st.scale) : 'fb' + st.role + st.scale; if (k === st.last) return; st.last = k;
      if (f) { e.className = 'h-big'; e.style.cssText = k; e.textContent = ''; }
      else { var b = ROLES[st.role] || ROLES.sys; e.className = 'h-big fb'; e.style.cssText = 'width:' + 64 * st.scale + 'px;height:' + 64 * st.scale + 'px;font-size:' + 40 * st.scale + 'px;line-height:' + 64 * st.scale + 'px'; e.textContent = b.emoji; }
    }
    function tick() {
      if (!e.isConnected) return clearInterval(tmr);
      var now = Date.now(); if (st.talk) st.mouth ^= 1;
      else if (now >= st.nb) { st.blink = now + 140; st.nb = now + 2000 + Math.random() * 2000; }
      paint();
    }
    tmr = setInterval(tick, 125); paint();
    return { set: function (m) { st.mood = m || 'neutral'; paint(); }, who: function (r, sc) { st.role = r; if (sc) st.scale = sc; paint(); },
      talk: function (on) { st.talk = on; if (!on) st.closed = false; paint(); }, closed: function (c) { st.closed = c; }, stop: function () { clearInterval(tmr); } };
  }
  /* texto con nombres de personajes y *palabras clave* resaltados -> [{t, c}] (c = color o 'S' = color del hablante) */
  function hlParts(text) {
    var names = {}; Object.keys(ROLES).forEach(function (k) { if (k === 'sys' || k === 'director') return; var n = roleInfo(k).name; if (n && n.length > 2) names[n.toLowerCase()] = ROLES[k].color; });
    names['lia'] = ROLES.lia.color;
    var re = new RegExp('\\*([^*\\n]+)\\*|(' + Object.keys(names).map(function (n) { return n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'gi'), out = [], i = 0, m;
    while ((m = re.exec(text))) { if (m.index > i) out.push({ t: text.slice(i, m.index) }); out.push(m[1] ? { t: m[1], c: 'S' } : { t: m[2], c: names[m[2].toLowerCase()] }); i = re.lastIndex; }
    if (i < text.length) out.push({ t: text.slice(i) });
    return out;
  }
  function hlHtml(parts, n, sc) { // primeros n caracteres con resaltado
    var h = ''; parts.forEach(function (p) { if (n <= 0) return; var t = p.t.slice(0, n); n -= p.t.length; h += p.c ? '<span class="k" style="color:' + (p.c === 'S' ? sc : p.c) + '">' + esc(t) + '</span>' : esc(t); });
    return h;
  }
  function trophy(id, size) {
    var src = img('trophies'), m = meta('trophies'), idx = -1;
    if (src && m) { idx = Array.isArray(m.names) ? m.names.indexOf(id) : (m.index && m.index[id] != null ? m.index[id] : (m.names && m.names[id] != null ? m.names[id] : -1)); }
    if (idx >= 0) {
      var cell = m.cell || m.fw || 32, cols = m.cols || Math.floor(m.w / cell) || 1, s = size / cell;
      return '<i class="h-ic" style="width:' + size + 'px;height:' + size + 'px;background:url(' + src + ') ' + (-(idx % cols) * cell * s) + 'px ' + (-Math.floor(idx / cols) * cell * s) + 'px/' + (m.w * s) + 'px ' + (m.h * s) + 'px"></i>';
    }
    return '<span class="h-ic em" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * .8) + 'px;line-height:' + size + 'px">🏆</span>';
  }

  /* ---------- estado interno ---------- */
  var pinned = true, P = null, V = null, R = null;           // público, privado, mi rol
  var root = null, el = {}, mounted = false, hidden = false;
  var cb = { ability: null, ask: null, dialogue: null, chat: null, share: null, vote: null, secret: null, ready: null, exit: null, settings: null, pause: null, fx: null, focus: null, typing: null, insets: null };
  var disp = { agua: 0, salud: 0, material: 0, confianza: 0, score: 0 }, tgt = { agua: 0, salud: 0, material: 0, confianza: 0, score: 0 }, dispInit = false;
  var cur = { phase: null, round: 0 }, phaseMax = 1;
  var clock = { left: 0, at: 0, lastShown: -1 };
  var seenChat = {}, chatCount = 0, lastChatRound = 0, unread = 0, lastChatFrom = null, lastChatT = 0;
  var typingTimers = {}, myTypingAt = 0;
  var panel = null, panelName = null;          // panel de escenario abierto
  var opts = lsGet('rcv3_hudopt', { big: false, contrast: false, noflash: false, help: true });
  var helpSeen = lsGet('rcv3_hudhelp', {});
  var localReady = false, localVote = null, localSecret = null, secretSel = null, secretSealed = false;
  var intelSeen = 0, lastIntelLen = 0, waterLevelHit = 0, chosenShown = null, lastResult = null;
  var customChips = null, dossierTab = 'intel', editing = null, paused = false;
  var toastQ = [], toastBusy = false, resolving = false, rafOn = false;
  var airV = null, airWarned = false, abilO = null, helpO = null, quickO = null, dlgQ = null, dlgOpen = false;
  var coachO = null, coachPrev = null, miniUser = true, sayQ = [], shareWait = null, nowOv = null, misOv = null, readyOv = null, nowKey = '', miniFn = null, miniTimer = 0, ro = null;

  /* ---------- CSS ---------- */
  var CSS = [
    ':root{--h-bg:#0b1a22;--h-bg2:#10242e;--h-panel:#1a1530;--h-panel2:#241c40;--h-line:#3b2f66;--h-amber:#f2a93b;--h-amber2:#ffd27a;--h-violet:#b58cff;--h-teal:#3fd0c0;--h-red:#ff5d5d;--h-green:#5fe39a;--h-water:#3aa0ff;--h-ink:#f6ecd6;--h-dim:#a89fc4;--h-radio:#7bf0a0;',
    "--h-px:'Press Start 2P',ui-monospace,Menlo,Consolas,monospace;--h-ui:'Trebuchet MS','Segoe UI',system-ui,-apple-system,Roboto,sans-serif;--h-fs:1;--h-chatw:340px}",
    '.hud{position:absolute;inset:0;pointer-events:none;z-index:50;font-family:var(--h-ui);color:var(--h-ink);font-size:calc(14px*var(--h-fs));line-height:1.35;-webkit-font-smoothing:antialiased;overflow:hidden;user-select:none}',
    '.hud.big{--h-fs:1.22}.hud.hc{--h-panel:#07050f;--h-panel2:#120d24;--h-dim:#d8d0ee;--h-line:#8c7bd0}',
    '.hud *{box-sizing:border-box}.hud.off{display:none}',
    '.hud button{font-family:inherit;color:inherit;cursor:pointer}.hud .px{font-family:var(--h-px)}',
    '.hud .h-ic{display:inline-block;image-rendering:pixelated;background-repeat:no-repeat;vertical-align:middle;flex:none;text-align:center}.hud .h-ic.em{font-style:normal}',
    '.hud .h-por{display:inline-block;image-rendering:pixelated;border:2px solid;border-radius:6px;flex:none;vertical-align:middle;background-repeat:no-repeat;text-align:center;font-style:normal;overflow:hidden}',
    /* botones pixel */
    '.hud .h-btn{pointer-events:auto;font-family:var(--h-px);font-size:calc(10px*var(--h-fs));letter-spacing:.5px;padding:10px 14px;background:var(--h-amber);color:#2a1606;border:0;border-radius:4px;box-shadow:0 4px 0 #9b5a12,inset 0 2px 0 #ffe0a0;text-transform:uppercase;transition:transform .08s,filter .15s}',
    '.hud .h-btn:hover{filter:brightness(1.12);transform:translateY(-1px)}.hud .h-btn:active{transform:translateY(3px);box-shadow:0 1px 0 #9b5a12,inset 0 2px 0 #ffe0a0}',
    '.hud .h-btn.alt{background:var(--h-panel2);color:var(--h-ink);box-shadow:0 4px 0 #0c0818,inset 0 0 0 2px var(--h-line)}',
    '.hud .h-btn.teal{background:var(--h-teal);box-shadow:0 4px 0 #17756c,inset 0 2px 0 #b4fff4;color:#06302c}',
    '.hud .h-btn.red{background:#ff6b6b;box-shadow:0 4px 0 #8f2323,inset 0 2px 0 #ffc2c2;color:#3a0808}',
    '.hud .h-btn[disabled]{opacity:.45;filter:grayscale(.6);cursor:not-allowed;transform:none}',
    '.hud .h-btn.pulse{animation:h-btnpulse 1.1s ease-in-out infinite}',
    '@keyframes h-btnpulse{50%{transform:scale(1.06);filter:brightness(1.2)}}',
    '.hud kbd{font-family:var(--h-px);font-size:.62em;padding:3px 5px 2px;background:#2d2250;border:2px solid var(--h-line);border-bottom-width:4px;border-radius:4px;color:var(--h-amber2);display:inline-block;line-height:1}',
    /* barra superior */
    '.h-top{position:absolute;left:8px;right:8px;top:8px;display:grid;grid-template-columns:auto minmax(0,1fr) auto auto auto;gap:14px;align-items:center;padding:8px 14px;background:linear-gradient(#1d1738f2,#120e26f2);border:2px solid var(--h-line);border-radius:8px;box-shadow:0 4px 0 #07040f,0 0 0 2px #000a;pointer-events:auto}',
    '.h-rnd{display:flex;flex-direction:column;gap:5px;min-width:130px}.h-rlab{font-family:var(--h-px);font-size:calc(9px*var(--h-fs));color:var(--h-dim)}.h-rlab b{color:var(--h-amber2)}',
    '.h-pips{display:flex;align-items:center}.h-pip{width:18px;height:18px;border-radius:50%;border:2px solid var(--h-line);background:#0e0a1c;font-family:var(--h-px);font-size:7px;display:grid;place-items:center;color:var(--h-dim);position:relative;flex:none}',
    '.h-pip+.h-pip{margin-left:12px}.h-pip+.h-pip:before{content:"";position:absolute;left:-14px;top:6px;width:12px;height:2px;background:var(--h-line)}',
    '.h-pip.done{background:var(--h-teal);border-color:#b4fff4;color:#06302c}.h-pip.done+.h-pip:before,.h-pip.now+.h-pip:before{background:var(--h-line)}.h-pip.done:before{background:var(--h-teal)}',
    '.h-pip.now{border-color:var(--h-amber);background:#3b2a0a;color:var(--h-amber2);box-shadow:0 0 0 3px #f2a93b44,0 0 12px #f2a93b;animation:h-glow 1.6s ease-in-out infinite}',
    '@keyframes h-glow{50%{box-shadow:0 0 0 5px #f2a93b22,0 0 18px #f2a93b}}',
    '.h-ph{min-width:0}.h-phn{font-family:var(--h-px);font-size:calc(12px*var(--h-fs));letter-spacing:1px;display:flex;align-items:center;gap:8px;text-shadow:0 2px 0 #000a}',
    '.h-phn .t{padding:3px 7px 2px;border-radius:3px;color:#1a0f2a;background:currentColor;position:relative}.h-phn .t span{color:#150c24;position:relative}',
    '.h-phi{font-size:calc(14px*var(--h-fs));color:var(--h-ink);margin-top:5px;line-height:1.25;max-height:2.6em;overflow:hidden}',
    '.h-evt{color:var(--h-dim);font-size:calc(12px*var(--h-fs));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.h-tm{min-width:118px;text-align:center}.h-time{font-family:var(--h-px);font-size:calc(26px*var(--h-fs));text-shadow:0 3px 0 #000;letter-spacing:1px;transition:color .2s}',
    '.h-time.warn{color:var(--h-amber)}.h-time.urgent{color:var(--h-red);animation:h-urg .5s steps(2) infinite}',
    '@keyframes h-urg{50%{transform:scale(1.14)}}',
    '.h-tbar{height:6px;background:#0a0716;border-radius:3px;margin-top:6px;overflow:hidden;border:1px solid var(--h-line)}.h-tbar i{display:block;height:100%;background:var(--h-teal);transition:width .25s linear,background .2s}',
    '.h-tbar.warn i{background:var(--h-amber)}.h-tbar.urgent i{background:var(--h-red)}',
    '.h-sts{display:grid;grid-template-columns:repeat(4,112px);gap:10px}',
    '.h-st{position:relative}.h-st .l{display:flex;align-items:center;gap:5px;font-family:var(--h-px);font-size:calc(7px*var(--h-fs));color:var(--h-dim)}.h-st .l b{margin-left:auto;font-size:calc(11px*var(--h-fs));color:var(--h-ink);font-weight:400;text-shadow:0 2px 0 #000}',
    '.h-bar{height:12px;margin-top:4px;background:#0a0716;border:2px solid #000;border-radius:3px;position:relative;overflow:hidden;box-shadow:0 0 0 1px var(--h-line)}',
    '.h-bar i{position:absolute;left:0;top:0;bottom:0;background:var(--c);border-radius:1px;box-shadow:inset 0 3px 0 #ffffff40,inset 0 -3px 0 #00000033}',
    '.h-bar .ghost{background:#fff;opacity:.55;transition:width .9s .3s ease-out}',
    '.h-st.crit .h-bar{animation:h-crit .7s steps(2) infinite}.h-st.crit .l b{color:var(--h-red)}',
    '@keyframes h-crit{50%{box-shadow:0 0 0 2px var(--h-red),0 0 10px var(--h-red)}}',
    '.h-st.flash-g .h-bar{box-shadow:0 0 0 2px var(--h-green),0 0 12px var(--h-green)}.h-st.flash-b .h-bar{box-shadow:0 0 0 2px var(--h-red),0 0 12px var(--h-red)}',
    '.h-sc{text-align:right;min-width:72px}.h-sc .l{font-family:var(--h-px);font-size:calc(7px*var(--h-fs));color:var(--h-dim)}.h-sc b{font-family:var(--h-px);font-size:calc(16px*var(--h-fs));font-weight:400;color:var(--h-amber2);text-shadow:0 3px 0 #000;display:block;margin-top:4px}',
    /* panel izquierdo */
    '.h-left{position:absolute;left:8px;bottom:56px;width:296px;background:linear-gradient(#1a1530ee,#120e26ee);border:2px solid var(--h-line);border-radius:8px;box-shadow:0 4px 0 #07040f;pointer-events:auto;transition:transform .3s,opacity .3s}',
    '.hud.modal .h-left{transform:translateX(-120%);opacity:0;pointer-events:none}',
    '.h-lh{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:2px solid var(--h-line);cursor:pointer;font-family:var(--h-px);font-size:calc(8px*var(--h-fs));color:var(--h-amber2)}.h-lh span.x{margin-left:auto;color:var(--h-dim)}',
    '.h-lb{padding:9px 10px;display:flex;flex-direction:column;gap:9px;max-height:calc(100vh - 190px);overflow:auto;scrollbar-width:thin;scrollbar-color:var(--h-line) transparent}.h-left.min .h-lb{display:none}',
    '.h-me{display:flex;align-items:center;gap:9px}.h-me .n{font-weight:700;font-size:calc(15px*var(--h-fs))}.h-me .r{font-size:calc(12px*var(--h-fs));color:var(--h-dim)}',
    '.h-ap{margin-left:auto;text-align:right;font-family:var(--h-px);font-size:calc(7px*var(--h-fs));color:var(--h-dim)}.h-ap div{display:flex;gap:4px;justify-content:flex-end;margin-top:5px}.h-ap i{width:13px;height:13px;border-radius:3px;background:var(--h-amber);border:2px solid #ffe0a0;box-shadow:0 2px 0 #7a4308;display:block}.h-ap i.off{background:#150f28;border-color:var(--h-line);box-shadow:none}',
    '.h-sec{font-family:var(--h-px);font-size:calc(7px*var(--h-fs));color:var(--h-dim);margin-bottom:4px;display:flex;align-items:center;gap:5px}',
    '.h-sec.me{color:var(--h-amber2)}.h-txt{font-size:calc(13px*var(--h-fs))}',
    '.h-goalbar{height:8px;background:#0a0716;border-radius:2px;margin-top:5px;overflow:hidden;border:1px solid var(--h-line)}.h-goalbar i{display:block;height:100%;background:var(--h-amber)}.h-goalbar.ok i{background:var(--h-green)}',
    '.h-pois{display:flex;flex-wrap:wrap;gap:5px}.h-poi{display:flex;align-items:center;gap:5px;padding:3px 7px 3px 4px;border-radius:12px;background:#0d0a1d;border:1px solid var(--h-line);font-size:calc(11px*var(--h-fs))}',
    '.h-poi.used{opacity:.5;text-decoration:line-through}.h-poi.mine{border-color:var(--h-teal)}',
    '.h-team{display:flex;gap:6px}.h-tm1{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 2px;border-radius:6px;background:#0d0a1d;border:2px solid transparent;font-size:calc(11px*var(--h-fs));position:relative}',
    '.h-tm1.me{border-color:var(--h-amber)}.h-tm1 em{font-style:normal;font-size:calc(9px*var(--h-fs));color:var(--h-dim)}.h-tm1 .ok{position:absolute;top:-6px;right:-4px;background:var(--h-green);color:#06301a;border-radius:50%;width:16px;height:16px;font-size:10px;display:grid;place-items:center;font-weight:700}',
    '.h-tm1.off{opacity:.45}',
    /* dock */
    '.h-dock{position:absolute;left:8px;bottom:8px;display:flex;gap:8px;pointer-events:none}.h-dock .h-btn{padding:8px 10px;font-size:calc(8px*var(--h-fs));display:flex;align-items:center;gap:7px;position:relative}.h-dock kbd{font-size:7px}',
    '.h-badge{position:absolute;top:-8px;right:-8px;min-width:20px;height:20px;border-radius:10px;background:var(--h-red);color:#fff;font-family:var(--h-px);font-size:8px;display:grid;place-items:center;padding:0 4px;border:2px solid #fff;animation:h-pop .35s}',
    '@keyframes h-pop{0%{transform:scale(0)}70%{transform:scale(1.3)}100%{transform:scale(1)}}',
    /* hint inferior */
    '.h-bot{position:absolute;left:316px;right:calc(var(--h-chatw) + 20px);bottom:8px;display:flex;justify-content:center;align-items:center;gap:12px;pointer-events:none}',
    '.h-hint{pointer-events:auto;background:#120e26e8;border:2px solid var(--h-line);border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:10px;font-size:calc(13px*var(--h-fs));box-shadow:0 4px 0 #07040f;flex-wrap:wrap;justify-content:center}',
    '.h-hint b{color:var(--h-amber2)}.h-bot .h-btn{padding:12px 18px;font-size:calc(11px*var(--h-fs))}',
    /* escenario */
    '.h-stage{position:absolute;left:8px;right:calc(var(--h-chatw) + 20px);top:84px;bottom:56px;display:flex;align-items:center;justify-content:center;pointer-events:none;padding:4px}',
    '.hud.modal .h-stage:before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at center,#060310aa,#060310d9);animation:h-fade .3s;pointer-events:none}',
    '.h-pn{position:relative;pointer-events:auto;width:min(820px,100%);max-height:100%;overflow:auto;background:linear-gradient(#251d44,#17112e);border:3px solid var(--h-amber);border-radius:10px;box-shadow:0 0 0 3px #000,0 8px 0 #07040f,0 0 40px #000c;animation:h-in .35s cubic-bezier(.2,1.3,.4,1);scrollbar-width:thin}',
    '.h-pn.out{animation:h-out .25s forwards}',
    '@keyframes h-in{from{opacity:0;transform:translateY(24px) scale(.94)}}@keyframes h-out{to{opacity:0;transform:translateY(16px) scale(.96)}}@keyframes h-fade{from{opacity:0}}',
    '.h-pn.fr{border:12px solid transparent;border-image:var(--h-frame) 8 fill/12px stretch;box-shadow:0 8px 0 #07040f,0 0 40px #000c;border-radius:0}',
    '.h-ph1{padding:12px 16px;display:flex;align-items:center;gap:12px;border-bottom:2px solid var(--h-line);background:#0e0a1d80}.h-ph1 h2{margin:0;font-family:var(--h-px);font-weight:400;font-size:calc(13px*var(--h-fs));letter-spacing:1px;line-height:1.5}.h-ph1 .sub{color:var(--h-dim);font-size:calc(13px*var(--h-fs));margin-top:4px}',
    '.h-ph1 .tm{margin-left:auto;font-family:var(--h-px);font-size:calc(16px*var(--h-fs));color:var(--h-amber2)}',
    '.h-pb{padding:14px 16px}',
    /* evento */
    '.h-art{position:relative;height:clamp(110px,27vh,230px);background:linear-gradient(135deg,#1b3c4a,#2b1a52 60%,#3b2a0a);overflow:hidden;border-bottom:3px solid #000}',
    '.h-art img{width:100%;height:100%;object-fit:cover;image-rendering:pixelated;display:block;animation:h-ken 14s ease-out forwards}@keyframes h-ken{from{transform:scale(1.02)}to{transform:scale(1.14) translate(-1.5%,-1%)}}',
    '.h-art .em{position:absolute;inset:0;display:grid;place-items:center;font-size:86px;filter:drop-shadow(0 6px 0 #0008)}.h-art:after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 50%,#000b),repeating-linear-gradient(0deg,#0000 0 3px,#0000001a 3px 4px);pointer-events:none}',
    '.h-art .tag{position:absolute;left:12px;top:12px;z-index:2;font-family:var(--h-px);font-size:calc(9px*var(--h-fs));background:var(--h-red);color:#fff;padding:5px 8px 4px;border-radius:3px;box-shadow:0 3px 0 #6b1414}',
    '.h-evt1{font-family:var(--h-px);font-size:calc(15px*var(--h-fs));line-height:1.5;color:var(--h-amber2);text-shadow:0 3px 0 #000;margin:0 0 8px}',
    '.h-evtx{font-size:calc(16px*var(--h-fs));line-height:1.5}',
    '.h-radio{margin-top:12px;display:flex;gap:12px;align-items:flex-start;padding:10px 12px;background:#06140f;border:2px solid #2c7a52;border-radius:6px;color:var(--h-radio);position:relative;overflow:hidden}',
    '.h-radio:after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,#0000 0 2px,#00000030 2px 3px);pointer-events:none}',
    '.h-radio .w{font-family:var(--h-px);font-size:calc(8px*var(--h-fs));opacity:.8;margin-bottom:5px}.h-radio .q{font-size:calc(15px*var(--h-fs));font-style:italic;font-family:ui-monospace,Menlo,Consolas,monospace}',
    '.h-expect{margin-top:12px;font-size:calc(14px*var(--h-fs));color:var(--h-ink);padding:9px 12px;border-left:4px solid var(--h-teal);background:#0e1f26}.h-expect b{color:var(--h-teal)}',
    '.h-cdown{height:6px;background:#0a0716;border-radius:3px;overflow:hidden;margin-top:14px}.h-cdown i{display:block;height:100%;background:var(--h-amber);transition:width .25s linear}',
    '.h-pn .h-foot{position:sticky;bottom:0;background:linear-gradient(#17112e00,#17112e 35%);padding-top:14px}',
    '.h-foot{display:flex;justify-content:flex-end;align-items:center;gap:10px;padding:0 16px 14px}.h-foot .l{margin-right:auto;color:var(--h-dim);font-size:calc(13px*var(--h-fs))}',
    /* plan */
    '.h-mine{margin-bottom:12px;padding:9px 11px;background:#0e1f26;border:2px dashed var(--h-teal);border-radius:6px}.h-mine .t{font-family:var(--h-px);font-size:calc(8px*var(--h-fs));color:var(--h-teal);margin-bottom:7px}',
    '.h-mc{display:flex;flex-wrap:wrap;gap:6px}.h-mc button{pointer-events:auto;background:#162d36;border:1px solid var(--h-teal);border-radius:12px;padding:3px 10px;font-size:calc(12px*var(--h-fs));color:var(--h-ink)}',
    '.h-opts{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}',
    '.h-opt{position:relative;text-align:left;pointer-events:auto;background:linear-gradient(#2c2352,#1d1640);border:3px solid var(--h-line);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:9px;min-height:220px;box-shadow:0 5px 0 #0a0616;transition:transform .12s,border-color .12s,box-shadow .12s}',
    '.h-opt:hover{transform:translateY(-3px);border-color:var(--h-violet)}.h-opt.sel{border-color:var(--h-amber);box-shadow:0 5px 0 #7a4308,0 0 22px #f2a93b66;transform:translateY(-3px)}',
    '.h-opt.win{border-color:var(--h-green);box-shadow:0 5px 0 #1b6b3f,0 0 30px #5fe39a88}.h-opt.lose{opacity:.45;filter:grayscale(.5)}',
    '.h-opt .k{position:absolute;right:10px;top:10px}.h-opt h3{margin:0;font-family:var(--h-px);font-weight:400;font-size:calc(11px*var(--h-fs));line-height:1.6;color:var(--h-amber2);padding-right:34px}',
    '.h-opt p{margin:0;font-size:calc(14px*var(--h-fs));line-height:1.45}.h-opt .kn{font-size:calc(12px*var(--h-fs));color:var(--h-dim);padding:7px 9px;background:#0d0a1d;border-radius:5px;border-left:3px solid var(--h-violet)}.h-opt .kn b{color:var(--h-violet)}',
    '.h-opt .pv{font-size:calc(12px*var(--h-fs));padding:7px 9px;border-radius:5px;background:#0f2a2d;border:1px solid var(--h-teal);color:#c8fff7;animation:h-pvp 1.8s ease-in-out infinite}.h-opt .pv b{color:var(--h-teal)}',
    '@keyframes h-pvp{50%{box-shadow:0 0 12px #3fd0c066}}',
    '.h-votes{margin-top:auto;display:flex;align-items:center;gap:5px;min-height:34px;padding-top:6px;border-top:2px dotted var(--h-line)}.h-votes .c{font-family:var(--h-px);font-size:calc(8px*var(--h-fs));color:var(--h-dim);margin-left:auto}',
    '.h-votes .h-por{animation:h-pop .4s}',
    '.h-chosen{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;z-index:5;background:#060310b0;animation:h-fade .3s}.h-chosen div{text-align:center;transform:rotate(-3deg);animation:h-stamp .6s cubic-bezier(.2,1.6,.4,1)}.h-chosen .a{font-family:var(--h-px);font-size:calc(10px*var(--h-fs));color:var(--h-green)}.h-chosen .b{font-family:var(--h-px);font-size:calc(18px*var(--h-fs));line-height:1.5;color:var(--h-amber2);text-shadow:0 4px 0 #000;margin:10px 0;max-width:600px}.h-chosen .c{font-size:calc(14px*var(--h-fs));color:var(--h-ink)}',
    '@keyframes h-stamp{from{transform:scale(3) rotate(-12deg);opacity:0}}',
    /* secreta */
    '.h-sopts{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}',
    '.h-so{position:relative;text-align:left;pointer-events:auto;background:linear-gradient(#2a1f1a,#1a1230);border:3px solid var(--h-line);border-radius:8px;padding:12px;min-height:190px;display:flex;flex-direction:column;gap:9px;box-shadow:0 5px 0 #0a0616;transition:transform .12s,border-color .12s}',
    '.h-so:hover{transform:translateY(-3px);border-color:var(--h-amber)}.h-so.sel{border-color:var(--h-amber);box-shadow:0 5px 0 #7a4308,0 0 24px #f2a93b77;transform:translateY(-3px)}.h-so.dim{opacity:.4;filter:grayscale(.7)}',
    '.h-so .k{position:absolute;right:10px;top:10px}.h-so p{margin:0;font-size:calc(14px*var(--h-fs));line-height:1.45}',
    '.h-kind{align-self:flex-start;font-family:var(--h-px);font-size:calc(7px*var(--h-fs));padding:5px 7px 4px;border-radius:3px;color:#10091f}.h-kind.team{background:var(--h-teal)}.h-kind.goal{background:var(--h-amber)}.h-kind.risk{background:var(--h-red);color:#fff}',
    '.h-risk{margin-top:auto;display:flex;align-items:center;gap:7px;font-size:calc(12px*var(--h-fs));color:var(--h-dim)}.h-risk .p{display:flex;gap:3px}.h-risk .p i{width:14px;height:8px;background:#0a0716;border:1px solid var(--h-line);display:block}.h-risk .p i.on{background:var(--h-amber);border-color:#ffe0a0}.h-risk .p.r3 i.on{background:var(--h-red);border-color:#ffb0b0}',
    '.h-seal{position:absolute;inset:0;z-index:5;display:grid;place-items:center;background:#060310d0;animation:h-fade .3s;text-align:center;padding:20px}.h-seal .s{font-size:64px;animation:h-stamp .6s cubic-bezier(.2,1.6,.4,1)}.h-seal .a{font-family:var(--h-px);font-size:calc(12px*var(--h-fs));color:var(--h-amber2);margin:14px 0 8px;line-height:1.6}.h-seal .b{color:var(--h-dim);font-size:calc(14px*var(--h-fs))}',
    /* resolución */
    '.h-narr{font-size:calc(16px*var(--h-fs));line-height:1.55;min-height:50px;padding:4px 2px 10px}',
    '.h-rolls{display:flex;flex-direction:column;gap:8px}.h-roll{display:flex;align-items:center;gap:12px;padding:9px 12px;background:#0e0a1d;border:2px solid var(--h-line);border-radius:6px;animation:h-slide .3s}',
    '@keyframes h-slide{from{opacity:0;transform:translateX(-20px)}}',
    '.h-die{width:54px;height:54px;flex:none;display:grid;place-items:center;font-family:var(--h-px);font-size:calc(15px*var(--h-fs));background:linear-gradient(#fff,#d7ceb8);color:#2a1606;border-radius:9px;box-shadow:0 4px 0 #7a6d4a,inset 0 -4px 0 #0002;border:2px solid #000}.h-die.rolling{animation:h-roll .12s linear infinite}.h-die.ok{background:linear-gradient(#b8ffd8,#5fe39a)}.h-die.ko{background:linear-gradient(#ffc4c4,#ff6b6b)}',
    '@keyframes h-roll{25%{transform:rotate(14deg) translateY(-3px)}75%{transform:rotate(-14deg)}}',
    '.h-roll .lb{flex:1;font-size:calc(14px*var(--h-fs))}.h-roll .lb small{display:block;color:var(--h-dim);font-size:calc(12px*var(--h-fs))}.h-roll .res{font-family:var(--h-px);font-size:calc(9px*var(--h-fs))}.h-roll .res.ok{color:var(--h-green)}.h-roll .res.ko{color:var(--h-red)}',
    '.h-reveals{display:flex;flex-direction:column;gap:10px;margin-top:12px}.h-rev{display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:8px;border:3px solid var(--h-violet);background:linear-gradient(90deg,#2e1b5c,#150f2d);animation:h-revin .6s cubic-bezier(.2,1.4,.4,1)}',
    '.h-rev.lie{border-color:var(--h-red);background:linear-gradient(90deg,#4a1220,#150f2d)}.h-rev.good{border-color:var(--h-green);background:linear-gradient(90deg,#103a2a,#150f2d)}',
    '@keyframes h-revin{0%{opacity:0;transform:scale(1.25) rotate(-2deg);filter:brightness(3)}100%{opacity:1}}',
    '.h-rev .tt{font-family:var(--h-px);font-size:calc(8px*var(--h-fs));color:var(--h-violet);margin-bottom:5px}.h-rev.lie .tt{color:var(--h-red)}.h-rev.good .tt{color:var(--h-green)}.h-rev .tx{font-size:calc(15px*var(--h-fs))}',
    '.h-deltas{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px}.h-dl{text-align:center;padding:10px 4px;background:#0e0a1d;border:2px solid var(--h-line);border-radius:6px;animation:h-pop .4s}.h-dl .l{font-family:var(--h-px);font-size:calc(7px*var(--h-fs));color:var(--h-dim);display:flex;gap:5px;justify-content:center;align-items:center}.h-dl b{display:block;font-family:var(--h-px);font-weight:400;font-size:calc(18px*var(--h-fs));margin-top:8px}.h-dl.up b{color:var(--h-green)}.h-dl.dn b{color:var(--h-red)}.h-dl.z b{color:var(--h-dim)}.h-dl.bad-up b{color:var(--h-red)}.h-dl.bad-dn b{color:var(--h-green)}',
    '.h-ptsbig{margin-top:14px;text-align:center;font-family:var(--h-px);font-size:calc(14px*var(--h-fs));color:var(--h-amber2);animation:h-pop .5s}',
    /* resumen */
    '.h-rows{display:flex;flex-direction:column;gap:9px}.h-row{display:grid;grid-template-columns:34px 1fr auto;gap:12px;align-items:center;padding:10px 12px;background:#0e0a1d;border:2px solid var(--h-line);border-radius:6px;animation:h-slide .35s}.h-row .nm{font-family:var(--h-px);font-size:calc(9px*var(--h-fs));color:var(--h-amber2);line-height:1.5}.h-row .nt{font-size:calc(13px*var(--h-fs));color:var(--h-dim);margin-top:3px}.h-row .v{font-family:var(--h-px);font-size:calc(18px*var(--h-fs));color:var(--h-green);min-width:70px;text-align:right}.h-row .v.z{color:var(--h-dim)}.h-row .v.n{color:var(--h-red)}',
    '.h-total{display:flex;align-items:center;gap:14px;margin-top:14px;padding:12px 14px;background:linear-gradient(90deg,#3b2a0a,#150f2d);border:3px solid var(--h-amber);border-radius:8px}.h-total .nm{font-family:var(--h-px);font-size:calc(10px*var(--h-fs));flex:1}.h-total .v{font-family:var(--h-px);font-size:calc(26px*var(--h-fs));color:var(--h-amber2);text-shadow:0 4px 0 #000}',
    '.h-notes{margin:12px 0 0;padding:0;list-style:none;font-size:calc(14px*var(--h-fs));color:var(--h-dim)}.h-notes li{padding:3px 0 3px 18px;position:relative}.h-notes li:before{content:"▸";position:absolute;left:0;color:var(--h-amber)}',
    /* chat */
    '.h-chat{position:absolute;right:8px;top:84px;bottom:8px;width:var(--h-chatw);display:flex;flex-direction:column;background:linear-gradient(#150f2aF2,#0e0a1fF2);border:2px solid var(--h-line);border-radius:8px;box-shadow:0 4px 0 #07040f;pointer-events:auto;transition:transform .3s}',
    '.h-ch{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:2px solid var(--h-line);font-family:var(--h-px);font-size:calc(9px*var(--h-fs));color:var(--h-amber2);cursor:pointer;flex:none}.h-ch .tg{margin-left:auto;display:flex;gap:6px;align-items:center;color:var(--h-dim)}',
    '.h-log{flex:1;min-height:0;overflow-y:auto;padding:10px 8px;display:flex;flex-direction:column;gap:3px;user-select:text;scrollbar-width:thin;scrollbar-color:var(--h-line) transparent;position:relative}',
    '.h-log>*{flex:none}',
    '.h-m{display:flex;gap:8px;animation:h-mi .22s ease-out;align-items:flex-start}@keyframes h-mi{from{opacity:0;transform:translateY(8px)}}',
    '.h-m .av{width:38px;flex:none}.h-m.cont .av *{visibility:hidden}.h-m.cont .av{height:0}.h-m .bd{min-width:0;max-width:calc(100% - 46px)}',
    '.h-m .hd{font-size:calc(12px*var(--h-fs));font-weight:700;margin:6px 0 2px;display:flex;gap:6px;align-items:baseline}.h-m.cont .hd{display:none}.h-m .hd i{font-style:normal;font-weight:400;color:var(--h-dim);font-size:.9em}',
    '.h-m .tx{background:#241c46;border-radius:2px 10px 10px 10px;padding:7px 10px;font-size:calc(14.5px*var(--h-fs));line-height:1.42;word-wrap:break-word;overflow-wrap:anywhere;border:1px solid #3b2f66}',
    '.h-m.me{flex-direction:row-reverse}.h-m.me .hd{justify-content:flex-end}.h-m.me .tx{background:#3d2b0f;border-color:#8a5a14;border-radius:10px 2px 10px 10px}.h-m.me .bd{margin-left:auto}',
    '.h-m.share .tx{padding:7px 9px}.h-card{margin-top:6px;border:2px solid var(--h-teal);background:#0c2229;border-radius:6px;padding:7px 9px}.h-card .t{font-family:var(--h-px);font-size:calc(8px*var(--h-fs));color:var(--h-teal);margin-bottom:5px;line-height:1.5}.h-card .x{font-size:calc(13.5px*var(--h-fs))}.h-card .h-rel{margin-top:6px}',
    '.h-m.radio{background:#06140f;border:2px solid #2c7a52;border-radius:6px;padding:7px 9px;color:var(--h-radio);position:relative;overflow:hidden;margin:5px 0}.h-m.radio:after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,#0000 0 2px,#00000030 2px 3px);pointer-events:none}',
    '.h-m.radio .tx{background:none;border:0;padding:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-style:italic;color:var(--h-radio)}.h-m.radio .hd{margin:0 0 3px;color:var(--h-radio)}.h-m.radio{animation:h-radioin .5s}',
    '@keyframes h-radioin{0%{filter:brightness(2.4) blur(1px);transform:translateX(-5px)}20%{transform:translateX(5px)}40%{transform:translateX(-3px)}100%{filter:none;transform:none}}',
    '.h-m.event,.h-m.sys,.h-m.vote{justify-content:center}.h-m.event .tx{background:linear-gradient(90deg,#0000,#ff8a5c33,#0000);border:0;text-align:center;color:#ffc6ab;font-weight:700;border-radius:0;width:100%}',
    '.h-m.sys .tx,.h-m.vote .tx{background:none;border:0;color:var(--h-dim);font-style:italic;font-size:calc(12.5px*var(--h-fs));padding:2px 6px;text-align:center}.h-m.vote .tx{color:var(--h-violet);font-style:normal}',
    '.h-sep{align-self:stretch;text-align:center;font-family:var(--h-px);font-size:calc(8px*var(--h-fs));color:var(--h-amber);margin:10px 0 6px;display:flex;gap:8px;align-items:center}.h-sep:before,.h-sep:after{content:"";flex:1;height:2px;background:var(--h-line)}',
    '.h-typ{min-height:20px;padding:0 12px;font-size:calc(12px*var(--h-fs));color:var(--h-dim);font-style:italic;flex:none}.h-typ .d{display:inline-flex;gap:2px;margin-left:4px}.h-typ .d i{width:4px;height:4px;background:var(--h-dim);border-radius:50%;animation:h-dot 1s infinite}.h-typ .d i:nth-child(2){animation-delay:.15s}.h-typ .d i:nth-child(3){animation-delay:.3s}@keyframes h-dot{50%{transform:translateY(-4px);background:var(--h-amber)}}',
    '.h-chips{display:flex;flex-wrap:wrap;gap:5px;padding:6px 8px;flex:none;max-height:66px;overflow:hidden}.h-chips button{flex:none;white-space:nowrap;background:#241c46;border:1px solid var(--h-violet);border-radius:14px;padding:5px 10px;font-size:calc(12.5px*var(--h-fs));color:var(--h-ink);transition:background .1s,transform .1s}.h-chips button:hover{background:#3b2f66;transform:translateY(-1px)}',
    '.h-in{display:flex;gap:6px;padding:8px;border-top:2px solid var(--h-line);flex:none}.h-in input{flex:1;min-width:0;background:#0a0716;border:2px solid var(--h-line);border-radius:6px;padding:9px 10px;color:var(--h-ink);font-family:var(--h-ui);font-size:calc(15px*var(--h-fs));outline:0;user-select:text}.h-in input:focus{border-color:var(--h-amber);box-shadow:0 0 0 3px #f2a93b33}.h-in .h-btn{padding:0 12px}',
    '.h-newmsg{position:sticky;bottom:0;align-self:center;background:var(--h-amber);color:#2a1606;font-size:12px;font-weight:700;padding:4px 12px;border-radius:12px;cursor:pointer;box-shadow:0 3px 0 #7a4308;display:none}',
    '.h-chat.min{transform:translateX(calc(100% - 44px))}.h-chat.min .h-log,.h-chat.min .h-in,.h-chat.min .h-chips,.h-chat.min .h-typ{visibility:hidden}.h-chat.min .h-ch .tg{display:none}',
    /* cuaderno */
    '.h-dos{position:absolute;left:8px;top:84px;bottom:8px;width:min(420px,calc(100% - var(--h-chatw) - 24px));display:flex;flex-direction:column;background:linear-gradient(#2a2038,#1a1330);border:3px solid var(--h-amber);border-radius:8px;box-shadow:0 0 0 3px #000,0 8px 0 #07040f,0 0 50px #000c;pointer-events:auto;transform:translateX(-120%);transition:transform .35s cubic-bezier(.2,1,.3,1);z-index:6}.h-dos.open{transform:none}',
    '.h-dh{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:2px solid var(--h-line);font-family:var(--h-px);font-size:calc(11px*var(--h-fs));color:var(--h-amber2)}.h-dh .x{margin-left:auto;background:none;border:0;font-size:20px;padding:2px 8px}',
    '.h-tabs{display:flex;gap:4px;padding:8px 10px 0;border-bottom:2px solid var(--h-line)}.h-tabs button{flex:1;background:#150f28;border:2px solid var(--h-line);border-bottom:0;border-radius:6px 6px 0 0;padding:7px 2px;font-family:var(--h-px);font-size:calc(7px*var(--h-fs));color:var(--h-dim)}.h-tabs button.on{background:var(--h-panel2);color:var(--h-amber2);border-color:var(--h-amber)}',
    '.h-db{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px}.h-gh{font-family:var(--h-px);font-size:calc(8px*var(--h-fs));color:var(--h-violet);margin-top:4px}',
    '.h-ic1{background:#f4e9c8;color:#2a1c0a;border-radius:3px 8px 3px 8px;padding:10px 12px;box-shadow:0 4px 0 #0a0616;position:relative;border-left:6px solid var(--h-teal)}.h-ic1.hi{border-left-color:#2fa86b}.h-ic1.mid{border-left-color:#d79a1f}.h-ic1.lo{border-left-color:#c9453d}',
    '.h-ic1 .t{font-weight:700;font-size:calc(14.5px*var(--h-fs));display:flex;gap:7px;align-items:center}.h-ic1 .x{font-size:calc(14px*var(--h-fs));margin:5px 0 7px;line-height:1.45}.h-ic1 .sh{position:absolute;right:8px;top:7px;font-family:var(--h-px);font-size:7px;background:#2fa86b;color:#fff;padding:3px 5px;border-radius:3px}',
    '.h-rel{display:inline-flex;align-items:center;gap:6px;font-size:calc(11px*var(--h-fs));font-weight:700;letter-spacing:.3px}.h-relbar{width:54px;height:8px;background:#0003;border-radius:4px;overflow:hidden;display:inline-block;border:1px solid #0006}.h-relbar i{display:block;height:100%}.h-rel.hi{color:#1c7a4a}.h-rel.hi i{background:#2fa86b}.h-rel.mid{color:#9a6a0b}.h-rel.mid i{background:#d79a1f}.h-rel.lo{color:#b0332b}.h-rel.lo i{background:#c9453d}',
    '.h-card .h-rel.hi{color:#7bf0a0}.h-card .h-rel.mid{color:#ffd27a}.h-card .h-rel.lo{color:#ff9a94}',
    '.h-acts{display:flex;gap:6px;flex-wrap:wrap}.h-acts .h-btn{padding:7px 9px;font-size:calc(7.5px*var(--h-fs));box-shadow:0 3px 0 #9b5a12,inset 0 2px 0 #ffe0a0}.h-acts .h-btn.alt{background:#e6d6aa;color:#2a1c0a;box-shadow:0 3px 0 #8a7544}',
    '.h-edit{margin-top:6px;background:#fff7e0;border:2px solid #c9453d;border-radius:6px;padding:8px}.h-edit textarea{width:100%;min-height:70px;resize:vertical;border:1px solid #0003;background:#fffdf4;border-radius:4px;padding:7px;font-family:var(--h-ui);font-size:calc(14px*var(--h-fs));color:#2a1c0a;user-select:text}.h-edit .w{font-size:calc(12px*var(--h-fs));color:#a3261e;font-weight:700;margin:6px 0}',
    '.h-sc1{background:#1b0f2a;border:2px dashed var(--h-violet);border-radius:8px;padding:14px;position:relative}.h-sc1 .lock{font-size:30px}.h-sc1 .t{font-size:calc(15px*var(--h-fs));line-height:1.5;margin-top:6px}.h-sc1 .n{margin-top:10px;color:var(--h-dim);font-size:calc(12px*var(--h-fs))}',
    '.h-empty{color:var(--h-dim);text-align:center;padding:30px 10px;font-size:calc(14px*var(--h-fs))}.h-hl{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.h-hl div{aspect-ratio:1;display:grid;place-items:center;border-radius:8px;background:#0d0a1d;border:2px solid var(--h-line);font-size:26px;opacity:.5;filter:grayscale(1)}.h-hl div.on{opacity:1;filter:none;border-color:var(--h-amber);box-shadow:0 0 12px #f2a93b66}',
    /* fx, toasts, ayuda, pausa */
    '.h-fx{position:absolute;inset:0;pointer-events:none;z-index:20;overflow:hidden}.h-fl{position:absolute;font-family:var(--h-px);font-size:calc(16px*var(--h-fs));text-shadow:0 3px 0 #000,0 0 10px #000;white-space:nowrap;animation:h-fl 1.6s ease-out forwards;transform:translate(-50%,-50%)}',
    '@keyframes h-fl{0%{opacity:0;transform:translate(-50%,0) scale(.4)}12%{opacity:1;transform:translate(-50%,-14px) scale(1.35)}30%{transform:translate(-50%,-30px) scale(1)}100%{opacity:0;transform:translate(-50%,-110px) scale(1)}}',
    '.h-fl.good{color:var(--h-green)}.h-fl.bad{color:var(--h-red)}.h-fl.score{color:var(--h-amber2)}.h-fl.info{color:var(--h-violet)}.h-fl.big{font-size:calc(24px*var(--h-fs))}',
    '.h-par{position:absolute;width:8px;height:8px;border-radius:2px;animation:h-par 1.1s cubic-bezier(.2,.8,.3,1) forwards}@keyframes h-par{to{transform:translate(var(--dx),var(--dy)) rotate(var(--r));opacity:0}}',
    '.h-flash{position:absolute;inset:0;z-index:30;pointer-events:none;background:var(--fc,#fff);animation:h-fl2 .5s forwards}@keyframes h-fl2{from{opacity:.55}to{opacity:0}}',
    '.hud.noflash .h-flash{display:none}.hud.noflash *{animation-duration:0s!important}',
    '.hud.shake>.h-top,.hud.shake>.h-stage,.hud.shake>.h-chat{animation:h-shake .45s}@keyframes h-shake{10%{transform:translate(-7px,3px)}30%{transform:translate(6px,-4px)}50%{transform:translate(-4px,-2px)}70%{transform:translate(3px,3px)}90%{transform:translate(-1px,1px)}}',
    '.h-tst{position:absolute;left:50%;top:84px;transform:translateX(-50%);z-index:25;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;width:min(440px,calc(100% - 16px))}',
    '.h-ach{display:flex;gap:12px;align-items:center;padding:10px 14px;width:100%;background:linear-gradient(90deg,#4a3208,#241c46 55%);border:3px solid var(--h-amber2);border-radius:8px;box-shadow:0 0 0 3px #000,0 0 30px #f2a93baa;animation:h-ach .6s cubic-bezier(.2,1.4,.4,1);position:relative;overflow:hidden}',
    '.h-ach:after{content:"";position:absolute;top:0;bottom:0;width:40px;background:linear-gradient(90deg,#0000,#fff6,#0000);transform:skewX(-20deg);animation:h-shine 1.4s .5s}',
    '@keyframes h-ach{from{opacity:0;transform:translateY(-40px) scale(.8)}}@keyframes h-shine{from{left:-60px}to{left:110%}}',
    '.h-ach .tp{font-size:11px;font-family:var(--h-px);color:var(--h-amber2)}.h-ach .nm{font-weight:700;font-size:calc(16px*var(--h-fs));margin:3px 0}.h-ach .ds{font-size:calc(13px*var(--h-fs));color:var(--h-dim)}.h-ach.out{animation:h-out .4s forwards}.h-ach .h-ic{animation:h-trophy 1s ease-in-out infinite alternate}@keyframes h-trophy{to{transform:rotate(8deg) scale(1.1)}}',
    '.h-note{background:#120e26f0;border:2px solid var(--h-red);border-radius:8px;padding:8px 14px;font-family:var(--h-px);font-size:calc(9px*var(--h-fs));color:var(--h-red);animation:h-ach .5s}',
    '.h-help{position:absolute;left:316px;right:calc(var(--h-chatw) + 20px);bottom:62px;display:flex;justify-content:center;z-index:12;pointer-events:none}',
    '.h-hb{pointer-events:auto;max-width:560px;background:#f6ecd6;color:#2a1606;border:3px solid #000;border-radius:10px;padding:12px 14px 12px 14px;box-shadow:0 5px 0 #0008;position:relative;animation:h-in .4s cubic-bezier(.2,1.4,.4,1)}',
    '.h-hb:after{content:"";position:absolute;left:50%;bottom:-14px;border:8px solid transparent;border-top-color:#f6ecd6;border-bottom:0;margin-left:-8px;filter:drop-shadow(0 3px 0 #000)}',
    '.h-hb h4{margin:0 0 6px;font-family:var(--h-px);font-weight:400;font-size:calc(10px*var(--h-fs));color:#8a3d0a;line-height:1.5}.h-hb p{margin:0;font-size:calc(14px*var(--h-fs));line-height:1.45}.h-hb .r{display:flex;gap:8px;margin-top:10px;justify-content:flex-end;align-items:center;font-size:12px;color:#6b4a2a}.h-hb .h-btn{padding:7px 10px;font-size:8px}',
    '.h-hb.inl{max-width:none;margin-bottom:12px;box-shadow:none;animation:h-fade .4s}.h-hb.inl:after{display:none}',
    '.h-pause{position:absolute;inset:0;z-index:40;display:none;place-items:center;background:#060310d8;pointer-events:auto}.h-pause.open{display:grid}.h-pm{width:min(360px,calc(100% - 24px));padding:18px;background:linear-gradient(#251d44,#17112e);border:3px solid var(--h-amber);border-radius:10px;box-shadow:0 0 0 3px #000,0 8px 0 #07040f;display:flex;flex-direction:column;gap:12px;animation:h-in .3s}.h-pm h2{margin:0 0 4px;font-family:var(--h-px);font-weight:400;font-size:14px;text-align:center;color:var(--h-amber2)}.h-pm .h-btn{pointer-events:auto;width:100%;padding:13px}.h-pm small{display:block;text-align:center;color:var(--h-dim);font-size:12px}',
    /* v4: layout grid */
    ":root{--h-chatw:clamp(272px,24vw,340px)}",
    ".hud{position:absolute;inset:0;width:100%;height:100%;display:grid;grid-template-columns:auto minmax(0,1fr) var(--h-chatw);grid-template-rows:auto minmax(0,1fr) auto;grid-template-areas:\"top top top\" \"left mid chat\" \"left bar chat\"}",
    ".hud.chatmin{--h-chatw:48px}",
    ".hud>*{min-width:0}",
    ".hud>.h-fx,.hud>.h-pause{position:absolute}",
    ".h-top{grid-area:top;position:relative;inset:auto;margin:8px 8px 0;display:flex;flex-wrap:wrap;align-items:center;gap:6px 16px;padding:6px 12px}",
    ".h-rnd{min-width:0;flex:none}.h-ph{flex:1 1 130px;min-width:0}.h-phi{display:none}.h-tm{flex:none;min-width:92px}.h-sc{flex:none;min-width:60px}",
    ".h-sts{flex:2 1 280px;min-width:0;max-width:520px;margin-left:auto;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}",
    ".h-st{min-width:0}.h-st .l{min-width:0}.h-st .lt{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}",
    "@media (max-width:1100px){.h-st .lt{display:none}.h-pips{display:none}.h-st .l b{margin-left:4px}}",
    "@media (max-height:720px){.h-top{padding:4px 10px}.h-time{font-size:20px}.h-evt{display:none}.h-tbar{margin-top:3px}}",
    ".h-left{grid-area:left;position:relative;inset:auto;align-self:start;margin:8px 0 8px 8px;width:clamp(200px,17vw,232px);max-height:calc(100vh - 150px);display:flex;flex-direction:column;transition:none}",
    ".h-left.exp{width:clamp(224px,19vw,262px)}.h-left.gone{display:none}",
    ".hud.modal .h-left{transform:none;opacity:1;pointer-events:auto}",
    ".h-lb{max-height:none;min-height:0;overflow:auto}",
    ".h-left:not(.exp) .h-more{display:none}",
    ".h-gt{font-size:calc(12.5px*var(--h-fs));display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}.h-left.exp .h-gt{display:block;-webkit-line-clamp:unset;font-size:calc(13px*var(--h-fs))}",
    ".h-me .nm{min-width:0}.h-me .n,.h-me .r{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".h-mid{grid-area:mid;position:relative;overflow:hidden;display:flex;flex-direction:column;min-height:0;min-width:0;margin:0 8px;pointer-events:none}",
    ".h-gd{flex:none;display:flex;flex-direction:column;align-items:center;gap:5px;padding-top:8px;pointer-events:none}",
    ".h-now{display:flex;align-items:center;gap:12px;max-width:min(640px,100%);padding:8px 16px;background:linear-gradient(#2b2150f2,#17112ef2);border:3px solid var(--h-amber);border-radius:12px;box-shadow:0 0 0 3px #000,0 6px 0 #07040f,0 0 24px #f2a93b44}",
    ".h-now .ic{flex:none;display:grid;place-items:center}.h-now .tx{min-width:0;display:flex;flex-direction:column;gap:3px}",
    ".h-now .t{font-family:var(--h-px);font-size:calc(14px*var(--h-fs));line-height:1.4;color:var(--h-amber2);text-shadow:0 2px 0 #000;text-transform:uppercase}",
    ".h-now .s{font-size:calc(13.5px*var(--h-fs));color:var(--h-ink);line-height:1.3}",
    ".h-now .pg{flex:none;width:64px;text-align:center;font-family:var(--h-px);font-size:calc(9px*var(--h-fs));color:var(--h-amber2)}.h-now .pg span{display:block;height:7px;margin-top:5px;background:#0a0716;border:1px solid var(--h-line);border-radius:4px;overflow:hidden}.h-now .pg i{display:block;height:100%;background:var(--h-amber)}",
    ".h-now.chg{animation:h-nowchg 1.5s ease-out}",
    "@keyframes h-nowchg{0%{transform:scale(1.14);box-shadow:0 0 0 3px #000,0 0 60px 14px #f2a93b}35%{transform:scale(1.03)}100%{transform:none}}",
    ".h-now.urgent{border-color:var(--h-teal);animation:h-nowurg 1s ease-in-out infinite}.h-now.urgent .t{color:#b4fff4}",
    "@keyframes h-nowurg{50%{box-shadow:0 0 0 3px #000,0 0 34px 8px #3fd0c0aa;transform:scale(1.025)}}",
    ".h-now.wait{border-color:var(--h-line)}.h-now.danger{border-color:var(--h-red)}",
    ".h-mis{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 6px;max-width:min(640px,100%)}.h-mis .ttl{width:100%;text-align:center;font-family:var(--h-px);font-size:8px;color:var(--h-ink);text-shadow:0 1px 3px #000}",
    ".h-stp{display:inline-flex;align-items:center;gap:5px;padding:3px 9px 3px 5px;border-radius:12px;background:#120e26ea;border:1px solid var(--h-line);font-size:calc(12px*var(--h-fs))}",
    ".h-stp i{width:16px;height:16px;border-radius:4px;border:2px solid var(--h-amber);display:grid;place-items:center;font-style:normal;font-size:11px;color:transparent;flex:none}",
    ".h-stp.done{border-color:#2fa86b;color:var(--h-dim)}.h-stp.done i{background:var(--h-green);border-color:var(--h-green);color:#06301a}",
    "@media (max-height:720px){.h-now{padding:5px 12px}.h-now .t{font-size:calc(12px*var(--h-fs))}.h-now .s{font-size:calc(12px*var(--h-fs))}.h-mis .ttl{display:none}.h-stp{padding:2px 8px 2px 4px}}",
    ".h-tst{position:relative;inset:auto;left:auto;top:auto;transform:none;width:100%;height:0;overflow:visible;z-index:25;align-items:center;padding-top:8px}",
    ".h-tst>*{max-width:min(420px,100%)}.h-ach{width:min(420px,100%)}",
    ".h-stage{position:relative;inset:auto;flex:1;min-height:0;padding:6px 0}",
    ".h-stage[data-p=plan],.h-stage[data-p=secret]{align-items:flex-end}",
    ".hud.modal .h-stage:before{background:#060310 ;opacity:.38;animation:none}.hud.modal .h-stage[data-p=resolve]:before,.hud.modal .h-stage[data-p=summary]:before{opacity:.62}.hud.pmin .h-stage:before{display:none}",
    ".h-pn{width:min(760px,100%);max-height:min(100%,70vh)}",
    ".h-stage[data-p=resolve] .h-pn,.h-stage[data-p=summary] .h-pn,.h-stage[data-p=event] .h-pn{max-height:100%}",
    ".h-stage[data-p=plan] .h-pn{width:min(820px,100%)}",
    ".h-ph1{padding-right:46px}",
    ".h-mn{position:absolute;right:6px;top:6px;z-index:4;width:32px;height:28px;padding:0;border:2px solid var(--h-line);border-radius:6px;background:#0e0a1d;color:var(--h-amber2);font-size:14px;line-height:1;pointer-events:auto}.h-mn:hover{border-color:var(--h-amber)}",
    ".h-pn.min{width:auto;max-width:100%;overflow:visible;border-radius:18px;max-height:none;animation:none}.h-pn.min>*:not(.h-mn){display:none}",
    ".h-pn.min:before{content:attr(data-title);display:block;font-family:var(--h-px);font-size:10px;color:var(--h-amber2);padding:11px 50px 11px 14px;white-space:nowrap}",
    ".h-pn[data-p=plan] .h-ph1,.h-pn[data-p=secret] .h-ph1{padding:6px 46px 6px 12px}.h-pn[data-p=plan] .h-ph1 .sub,.h-pn[data-p=secret] .h-ph1 .sub{display:none}",
    ".h-pn[data-p=plan] .h-pb,.h-pn[data-p=secret] .h-pb{padding:8px 10px}.h-pn[data-p=plan] .h-foot,.h-pn[data-p=secret] .h-foot{padding-bottom:8px}",
    ".h-pn[data-p=plan] .h-mine{margin-bottom:8px;padding:6px 8px}.h-pn[data-p=plan] .h-opts,.h-pn[data-p=secret] .h-sopts{gap:8px}",
    ".h-pn[data-p=plan] .h-opt,.h-pn[data-p=secret] .h-so{min-height:0;padding:8px 9px;gap:5px}",
    ".h-pn[data-p=plan] .h-opt p,.h-pn[data-p=secret] .h-so p{font-size:calc(12.5px*var(--h-fs));line-height:1.35}",
    ".h-pn[data-p=plan] .h-opt .kn,.h-pn[data-p=plan] .h-opt .pv{font-size:calc(11.5px*var(--h-fs));padding:4px 7px}.h-pn[data-p=plan] .h-opt h3{font-size:calc(9.5px*var(--h-fs));line-height:1.5}",
    ".h-pn[data-p=plan] .h-votes{min-height:0;padding-top:4px}\n@media (max-height:850px){.h-hb.inl{display:none}}",
    ".h-pn .h-opts,.h-pn .h-sopts{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}",
    ".h-dos{position:absolute;left:0;top:0;bottom:0;width:min(420px,100%);z-index:6}",
    ".h-help{position:absolute;left:0;right:0;bottom:76px;top:auto;display:flex;justify-content:center}.h-hb{max-width:min(560px,100%)}",
    ".h-big{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:30;background:#0a0716f2;border:3px solid var(--h-line);box-shadow:0 0 0 2px #07040f,0 8px 0 #07040f;padding:6px;pointer-events:auto}.h-big canvas{display:block;image-rendering:pixelated}.h-big .bt{display:flex;justify-content:space-between;align-items:center;font:bold 10px 'Press Start 2P',monospace;margin-bottom:6px;color:var(--h-line)}.h-big button{cursor:pointer}",
    ".h-mini{position:absolute;left:0;bottom:6px;width:240px;height:110px;border:3px solid var(--h-line);border-radius:0;box-shadow:0 0 0 2px #07040f;cursor:pointer;background:#0a0716cc;image-rendering:pixelated;pointer-events:auto;z-index:0;display:none}.h-mini.on{display:block}",
    ".h-act{grid-area:bar;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px 12px;margin:0 8px 8px;min-height:44px;pointer-events:none}",
    ".h-bot{position:relative;inset:auto;flex:1 1 auto;display:flex;justify-content:center;align-items:center;gap:12px}",
    ".h-dock{position:relative;inset:auto;flex:none;display:flex;gap:6px}.h-dock .h-btn{pointer-events:auto}",
    ".h-bot .h-btn{white-space:normal;line-height:1.4;max-width:100%}",
    ".h-rdy{display:flex;flex-direction:column;align-items:center;gap:5px;max-width:100%}.h-rdy small{color:var(--h-ink);font-size:calc(12px*var(--h-fs));text-shadow:0 1px 3px #000,0 0 6px #000;text-align:center}",
    ".hud .h-btn.glow{animation:h-btnpulse 1s ease-in-out infinite,h-glowb 1s ease-in-out infinite}",
    "@keyframes h-glowb{50%{box-shadow:0 4px 0 #17756c,0 0 28px 8px #3fd0c0aa,inset 0 2px 0 #b4fff4}}",
    "@media (max-height:720px){.h-act{min-height:0;margin-bottom:6px}.h-bot .h-btn{padding:8px 14px}.h-dock .h-btn{padding:6px 8px}}",
    ".h-chat{grid-area:chat;position:relative;inset:auto;margin:8px 8px 8px 0;width:auto;overflow:hidden;transform:none!important}",
    ".h-ch .ttl{white-space:nowrap}",
    ".hud.chatmin .h-ch{flex-direction:column;padding:8px 0;justify-content:center}.hud.chatmin .h-ch .ttl,.hud.chatmin .h-ch kbd,.hud.chatmin .h-ch .cv{display:none}.hud.chatmin .h-ch .tg{display:flex;margin:0}",
    ".h-logw{flex:1;min-height:0;position:relative;display:flex;flex-direction:column}.h-logw .h-log{flex:1;padding-top:2px}",
    ".h-newmsg{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);z-index:2;display:none;border:0;background:var(--h-amber);color:#2a1606;font-size:12px;font-weight:700;padding:5px 12px;border-radius:14px;cursor:pointer;box-shadow:0 3px 0 #7a4308;white-space:nowrap}",
    ".h-g{display:flex;gap:7px;align-items:flex-start;margin-top:8px;animation:h-mi .22s ease-out}.h-g.me{flex-direction:row-reverse}.h-g .av{flex:none}",
    ".h-g .bd{min-width:0;max-width:calc(100% - 64px);display:flex;flex-direction:column;gap:2px}.h-g.me .bd{align-items:flex-end}",
    ".h-g .hd{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;font-size:calc(12.5px*var(--h-fs));font-weight:700}.h-g .hd i{font-style:normal;font-weight:400;color:var(--h-dim);font-size:.88em}.h-g .hd time{font-weight:400;color:var(--h-dim);font-size:11px}",
    ".h-g .bs{display:flex;flex-direction:column;gap:3px;align-items:flex-start;max-width:100%}.h-g.me .bs{align-items:flex-end}",
    ".h-b{background:#241c46;border:1px solid #3b2f66;border-radius:10px;padding:5px 9px;font-size:calc(13.5px*var(--h-fs));line-height:1.4;overflow-wrap:anywhere;max-width:100%}.h-g.me .h-b{background:#3d2b0f;border-color:#8a5a14}",
    ".h-b.card{padding:0;background:none;border:0}.h-b .pre{margin-bottom:4px}",
    ".h-card{margin-top:0;padding:5px 8px}.h-card .t{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;margin-bottom:3px;font-size:calc(7.5px*var(--h-fs))}.h-card .x{font-size:calc(13px*var(--h-fs));line-height:1.35}",
    ".h-rt{font-family:var(--h-ui);font-size:10px;font-weight:700;padding:1px 6px;border-radius:8px;background:#0005;letter-spacing:.2px}.h-rt.hi{color:#7bf0a0}.h-rt.mid{color:#ffd27a}.h-rt.lo{color:#ff9a94}",
    ".h-chips{flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;max-height:none;scrollbar-width:thin;scrollbar-color:var(--h-line) transparent}",
    ".hud.shake>.h-top,.hud.shake>.h-mid,.hud.shake>.h-chat{animation:h-shake .45s}",
    ".hud .h-por{border-width:3px;border-radius:9px;box-shadow:0 0 0 2px #000,inset 0 0 0 1px #ffffff26,0 3px 0 #07040f}",
    ".h-team{gap:6px}.h-tc{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:1px;padding:5px 2px 4px;border-radius:8px;background:#0d0a1d;border:2px solid transparent;font-size:calc(12px*var(--h-fs))}",
    ".h-tc.me{border-color:var(--h-amber)}.h-tc.off{opacity:.45}.h-tc b{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.h-tc em{font-style:normal;font-size:calc(10.5px*var(--h-fs));color:var(--h-dim)}",
    ".h-tc u{text-decoration:none;font-family:var(--h-px);font-size:6px;padding:3px 5px 2px;border-radius:3px;background:#2d2250;margin-top:2px}.h-tc u.ai{background:#1d3a52;color:#8fd0ff}.h-tc u.hu{background:#1d4a30;color:#9affc0}",
    ".h-tc .pc{position:relative}.h-tc .ok{position:absolute;top:-6px;right:-6px;background:var(--h-green);color:#06301a;border-radius:50%;width:16px;height:16px;font-size:10px;display:grid;place-items:center;font-weight:700}",
    ".h-tc .td{position:absolute;left:50%;bottom:-3px;transform:translateX(-50%);display:none;gap:2px;background:#0e0a1df0;padding:4px 6px;border-radius:8px;border:1px solid var(--h-line)}.h-tc.typ .td{display:flex}.h-tc .td i{width:4px;height:4px;background:var(--h-amber);border-radius:50%;animation:h-dot 1s infinite}.h-tc .td i:nth-child(2){animation-delay:.15s}.h-tc .td i:nth-child(3){animation-delay:.3s}",
    `/* ===== v5 ===== */
.h-top{z-index:30}.h-sc{display:none!important}
.h-st{cursor:help;outline:0}.h-st .tip{display:none;position:absolute;top:100%;left:0;margin-top:9px;width:max-content;max-width:min(250px,80vw);z-index:60;padding:9px 11px;background:#0e0a1d;border:2px solid var(--h-amber);border-radius:6px;box-shadow:0 5px 0 #07040f,0 0 20px #000c;font-size:calc(13px*var(--h-fs));line-height:1.4;color:var(--h-ink);pointer-events:none;text-align:left}
.h-st .tip b{display:block;font-family:var(--h-px);font-weight:400;font-size:calc(9px*var(--h-fs));color:var(--c);margin-bottom:5px}
.h-st:hover .tip,.h-st:focus .tip{display:block}.h-st:nth-child(n+3) .tip{left:auto;right:0}
.h-now{max-width:min(720px,100%)}.h-now .t{font-size:calc(13px*var(--h-fs));overflow-wrap:anywhere;text-transform:none}
.h-now .k{font-family:var(--h-px);font-size:calc(7px*var(--h-fs));color:var(--h-teal);letter-spacing:1px}
.h-now .w{font-size:calc(14px*var(--h-fs));color:#d9f5ff;line-height:1.35}.h-now .w b{color:var(--h-teal)}.h-now .s{color:var(--h-dim);font-size:calc(12.5px*var(--h-fs))}
.h-air{display:none;align-items:center;gap:8px;padding:5px 14px;background:#0e1a2cf2;border:2px solid var(--h-water);border-radius:20px;box-shadow:0 3px 0 #07040f;pointer-events:auto;max-width:100%}
.h-air .l{display:flex;align-items:center;gap:5px;font-family:var(--h-px);font-size:calc(8px*var(--h-fs));color:#bfe3ff}.h-air .b{width:clamp(90px,14vw,160px);height:12px;background:#0a0716;border:2px solid #000;border-radius:3px;overflow:hidden;position:relative;box-shadow:0 0 0 1px var(--h-line)}
.h-air .b i{position:absolute;left:0;top:0;bottom:0;background:var(--h-water);box-shadow:inset 0 3px 0 #ffffff40;transition:width .2s}.h-air b{font-family:var(--h-px);font-weight:400;font-size:calc(11px*var(--h-fs))}
.h-air em{display:none;font-style:normal;font-weight:700;font-size:calc(12px*var(--h-fs));color:#ffd0d0}
.h-air.low{border-color:var(--h-red);animation:h-nowurg .8s ease-in-out infinite}.h-air.low .b i{background:var(--h-red)}.h-air.low em{display:inline}.h-air.low b{color:var(--h-red)}
.h-abil{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;pointer-events:none}.h-abil:empty{display:none}
.h-ab{display:flex;flex-direction:column;align-items:flex-start;gap:3px}.h-ab small{font-size:calc(12px*var(--h-fs));color:var(--h-ink);text-shadow:0 1px 3px #000,0 0 6px #000;max-width:240px}
.h-ab .h-btn{display:flex;align-items:center;gap:8px;white-space:normal;text-align:left;line-height:1.4}.h-ab .h-btn.alt{opacity:.75}
.h-ask{display:flex;flex-wrap:wrap;align-items:center;gap:6px}.h-ask .l{font-family:var(--h-px);font-size:calc(7px*var(--h-fs));color:var(--h-ink);text-shadow:0 1px 3px #000,0 0 6px #000}
.h-ask .h-btn{text-transform:none;font-family:var(--h-ui);font-weight:700;font-size:calc(13px*var(--h-fs));letter-spacing:0;padding:7px 11px;border-left:5px solid var(--rc,var(--h-line));white-space:normal;text-align:left}
.h-say{display:none;flex:none;gap:10px;align-items:center;padding:8px 10px;border-bottom:2px solid var(--h-line);background:linear-gradient(90deg,#241c46,#150f2a)}
.h-say .fc{flex:none;border:3px solid var(--c,var(--h-line));border-radius:8px;overflow:hidden;line-height:0;background:radial-gradient(circle at 50% 100%,#ffffff22,#120e26 75%);box-shadow:0 0 0 2px #000}
.h-say.pop .fc{animation:h-pop .3s}.h-big{display:block;image-rendering:pixelated;background-repeat:no-repeat;text-align:center;font-style:normal}
.h-say .sb{min-width:0;flex:1;align-self:stretch;display:flex;flex-direction:column;gap:4px}.h-say .nm{font-weight:700;font-size:calc(14px*var(--h-fs));display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 7px}.h-say .nm i{font-style:normal;font-weight:400;color:var(--h-dim);font-size:.85em}
.h-say .nm span{font-family:var(--h-px);font-weight:400;font-size:6px;color:var(--h-teal);margin-left:auto}.h-say .sx{font-size:calc(14px*var(--h-fs));line-height:1.4;max-height:6.4em;overflow:auto;overflow-wrap:anywhere;scrollbar-width:thin;user-select:text}
.h-say.on{display:flex}.h-chat.min .h-say{visibility:hidden}@media (max-width:820px),(max-height:520px){.h-chat:not(.open) .h-say{display:none}}
@media (max-height:720px){.h-say{padding:5px 8px}.h-say .sx{max-height:5.6em}}
.h-g .av,.h-m .av{width:48px;flex:none}.h-g .bd{max-width:calc(100% - 58px)}.h-m.radio{display:flex;gap:8px;align-items:flex-start}.h-m.radio .bd{min-width:0;flex:1}.h-m.radio .tx{overflow-wrap:anywhere}
.h-chips{flex-wrap:wrap;overflow-x:hidden;overflow-y:auto;max-height:116px}.h-chips button{white-space:normal;text-align:left;max-width:100%;line-height:1.25}
.h-mlist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}.h-mlist li{display:flex;gap:8px;align-items:flex-start;font-size:calc(14px*var(--h-fs));line-height:1.4;padding:6px 9px;background:#0e0a1d;border:1px solid var(--h-line);border-radius:6px}
.h-mlist li i{flex:none;width:18px;height:18px;border:2px solid var(--h-amber);border-radius:4px;display:grid;place-items:center;font-style:normal;font-size:12px;color:transparent;margin-top:1px}.h-mlist li.done{color:var(--h-dim)}.h-mlist li.done i{background:var(--h-green);border-color:var(--h-green);color:#06301a}
.hud.dlg .h-act{visibility:hidden}
`,
    "@media (max-width:820px),(max-height:520px){",
    ":root{--h-chatw:0px}",
    ".hud{grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr) auto;grid-template-areas:\"top\" \"mid\" \"bar\"}",
    ".h-sts{flex-basis:100%;max-width:none}.h-sc{display:none}.h-pips{display:none}",
    ".h-chat{position:absolute;left:4px;right:4px;bottom:4px;top:auto;margin:0;width:auto;height:44px;transition:height .3s cubic-bezier(.2,1,.3,1)}.h-chat.open{height:min(52vh,420px)}",
    ".h-chat:not(.open) .h-logw,.h-chat:not(.open) .h-in,.h-chat:not(.open) .h-chips,.h-chat:not(.open) .h-typ{visibility:hidden}",
    ".h-chat .h-ch .cv:before{content:\"▲\"}.h-chat.open .h-ch .cv:before{content:\"▼\"}",
    ".h-act{padding-bottom:52px;margin:0 4px}.hud.chatopen .h-act{display:none}.h-dock .h-btn kbd{display:none}",
    ".h-left{position:absolute;left:4px;right:4px;top:auto;bottom:100px;width:auto;margin:0;max-height:50vh;transform:translateY(130%);opacity:0;pointer-events:none;z-index:8}.h-left.mob{transform:none;opacity:1;pointer-events:auto}.h-left.gone{display:flex}",
    ".h-mid{margin:0 4px}.h-dos{width:100%}",
    ".h-mini{bottom:2px}.h-pn.fr{border-width:8px}.h-opt .k,.h-so .k{display:none}",
    "}",
    `/* ===== v6 ===== */
/* dialogo estilo Celeste: caja ancha y baja, retrato cuadrado a la izquierda, texto grande, ▼ parpadeando */
.h-dlg{position:absolute;left:12px;right:calc(var(--h-chatw) + 16px);bottom:10px;z-index:36;display:none;pointer-events:auto;cursor:pointer}
.h-dlg.on{display:block;animation:dl-up .25s ease-out}.h-dlg.out{animation:dl-down .2s forwards}
@keyframes dl-up{from{opacity:0;transform:translateY(40px)}}@keyframes dl-down{to{opacity:0;transform:translateY(30px)}}
.dl-wrap{position:relative;max-width:1040px;margin:0 auto;--c:#f2a93b}
.dl-box{position:relative;display:flex;align-items:center;gap:22px;padding:14px 30px 14px 14px;background:rgba(10,7,26,.9);border:2px solid #d9d0f5;border-radius:0;box-shadow:0 0 0 2px #000,0 10px 28px #000a;color:#fff;font-family:var(--h-ui)}
.dl-fr{flex:none;position:relative;line-height:0;border:3px solid var(--c);background:color-mix(in srgb,var(--c) 55%,#140c2c);box-shadow:0 0 0 2px #000;--bob:3px}
.dl-por{line-height:0;overflow:hidden;image-rendering:pixelated}.dl-por .h-big{image-rendering:pixelated}
.dl-fr.pop{animation:dl-pop .3s cubic-bezier(.2,1.6,.4,1)}.dl-fr.talk .h-big,.h-sp .fc.talk .h-big{animation:dl-bob .166s steps(1) infinite}
@keyframes dl-pop{0%{transform:scale(.6) translateY(16px);opacity:.2}100%{opacity:1}}@keyframes dl-bob{50%{transform:translateY(var(--bob,3px))}}
@media (prefers-reduced-motion:reduce){.dl-fr.talk .h-big,.h-sp .fc.talk .h-big,.dl-fr.pop{animation:none}}
.dl-tx{flex:1;min-width:0;align-self:stretch;display:flex;flex-direction:column;gap:8px;justify-content:center}
.dl-name{display:flex;align-items:baseline;gap:10px}.dl-name b{font-family:var(--h-px);font-weight:400;font-size:clamp(11px,1.7vh,15px);color:var(--c);text-shadow:0 2px 0 #000}.dl-name i{font-style:normal;font-size:clamp(12px,1.6vh,15px);color:#a89fc4}
.dl-text{position:relative;font-size:calc(clamp(20px,3.1vh,31px)*var(--h-fs));line-height:1.45;min-height:2.9em;max-height:44vh;overflow:auto;color:#fff;text-shadow:0 2px 0 #000;overflow-wrap:anywhere}.dl-text .b{visibility:hidden}.dl-text .k{font-weight:700}
.dl-foot{position:absolute;right:16px;bottom:6px;z-index:3;display:flex;align-items:center;gap:14px;font-size:12px;color:#a89fc4}.dl-foot .arr{font-size:20px;color:var(--c);animation:dl-bl .8s steps(2) infinite}@keyframes dl-bl{50%{opacity:.15}}
.dl-foot .sk{background:none;border:0;color:#a89fc4;font-size:12px;cursor:pointer;padding:2px 4px}.dl-foot .sk:hover{color:#fff}
.h-dlg.radio .dl-box{background:rgba(5,24,17,.92);border-color:#a5f0c4}.h-dlg.radio .dl-text{color:var(--h-radio);font-family:ui-monospace,Menlo,Consolas,monospace}
@media (max-width:820px),(max-height:520px){.h-dlg{left:4px;right:4px;bottom:4px}.dl-box{padding:10px 18px 10px 10px;gap:12px}.dl-foot .sk kbd{display:none}.dl-text{font-size:calc(17px*var(--h-fs))}}
/* popup de chat (Hud.say): versión compacta del mismo estilo */
.h-sy{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);width:min(560px,calc(100% - 340px));min-width:260px;display:flex;flex-direction:column;gap:6px;z-index:9;pointer-events:none}
.hud.modal .h-sy{bottom:auto;top:var(--sy-top,110px)}
.h-sp{display:flex;gap:12px;align-items:center;padding:6px 16px 6px 6px;background:rgba(10,7,26,.9);border:2px solid #d9d0f5;border-radius:0;box-shadow:0 0 0 2px #000,0 6px 18px #000a;animation:sy-in .3s cubic-bezier(.2,1.5,.4,1)}.h-sp.out{animation:sy-out .3s forwards}
@keyframes sy-in{from{opacity:0;transform:translateY(24px) scale(.9)}}@keyframes sy-out{to{opacity:0;transform:translateY(10px)}}
.h-sp .fc{flex:none;line-height:0;overflow:hidden;border:3px solid var(--c);background:color-mix(in srgb,var(--c) 55%,#140c2c);box-shadow:0 0 0 2px #000;--bob:2px}.h-sp .fc .h-big{image-rendering:pixelated}
.h-sp .sb{min-width:0;display:flex;flex-direction:column;gap:2px}.h-sp .nm{font-family:var(--h-px);font-size:calc(10px*var(--h-fs));color:var(--c);margin-bottom:3px}.h-sp .sx{font-size:calc(17px*var(--h-fs));line-height:1.35;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere;color:#fff}.h-sp .sx .k{font-weight:700}
/* chat discreto: compacto (historial) por defecto, T para ampliar */
.hud.chatmin{--h-chatw:clamp(188px,15vw,232px)}
.h-chat.min .h-log,.h-chat.min .h-logw{visibility:visible}.h-chat.min .h-in,.h-chat.min .h-chips,.h-chat.min .h-typ{display:none}
.hud.chatmin .h-ch{flex-direction:row;padding:7px 9px;justify-content:flex-start}.hud.chatmin .h-ch .ttl{display:inline}.hud.chatmin .h-ch kbd{display:inline-block}.hud.chatmin .h-ch .cv{display:inline}.h-chat.min .h-ch .tg{display:flex}
.h-chat .cv:before{content:"⤡"}.h-chat.min .cv:before{content:"⤢"}
.h-chat.min .h-g .av .h-por{border-width:2px}.h-chat.min .h-g .bd{max-width:calc(100% - 36px)}.h-chat.min .h-g .hd i,.h-chat.min .h-g .hd time{display:none}.h-chat.min .h-b{font-size:12px;padding:3px 7px}.h-chat.min .h-card .x{font-size:12px}.h-chat.min .h-m.radio{font-size:12px}
.h-chat:not(.min) .h-chips{max-height:none}
.h-b.hl,.h-b.hl .h-card{animation:h-hl 1.8s ease-out}@keyframes h-hl{0%,40%{box-shadow:0 0 0 3px var(--h-amber),0 0 22px var(--h-amber)}}
/* menos ruido */
.h-pips,.h-phn,.h-phi{display:none}
.h-rlab{font-size:calc(10px*var(--h-fs))}.h-rlab b{font-size:1.5em}
.h-st .l{font-size:calc(8px*var(--h-fs))}.h-st .l b{font-size:calc(16px*var(--h-fs))}.h-st .l .h-ic{flex:none}
.h-evt{font-size:calc(14px*var(--h-fs));color:var(--h-ink)}
.h-left:not(.exp){width:clamp(150px,12vw,176px)}.h-left:not(.exp) .h-lb>:not(.h-me){display:none}.h-left:not(.exp) .h-me{flex-wrap:wrap;gap:6px}.h-left:not(.exp) .h-me .r{display:none}.h-left:not(.exp) .h-ap{margin-left:0;text-align:left;width:100%}.h-left:not(.exp) .h-ap div{justify-content:flex-start}
.h-dock .h-btn.ic{padding:8px 11px;font-size:calc(11px*var(--h-fs))}
.h-vig{position:absolute;inset:0;z-index:19;pointer-events:none;opacity:0;box-shadow:inset 0 0 140px 36px #ff2a2aaa;transition:opacity .3s}.h-vig.on{opacity:1;animation:h-vig .9s ease-in-out infinite}@keyframes h-vig{50%{opacity:.35}}
.hud.noflash .h-vig.on{animation:none;opacity:.6}
.h-air{padding:8px 20px;gap:12px;border-width:3px;background:#0a1830f5;box-shadow:0 4px 0 #07040f,0 0 20px #3aa0ff55}.h-air .l{font-size:calc(14px*var(--h-fs));color:#d6ecff}.h-air .b{width:clamp(150px,20vw,260px);height:20px}.h-air b{font-size:calc(16px*var(--h-fs))}.h-air em{font-size:calc(16px*var(--h-fs))}.h-air.low{box-shadow:0 4px 0 #07040f,0 0 26px #ff5d5daa}
/* coach: paso actual de la primera zona */
.h-coach{display:none;flex-direction:column;align-items:center;gap:2px;max-width:min(760px,100%);padding:10px 26px 12px;background:linear-gradient(#ffd27a,#f2a93b);color:#2a1606;border:4px solid #fff3c9;border-radius:16px;box-shadow:0 0 0 3px #000,0 8px 0 #7a4308,0 0 36px #ffd27acc;animation:h-coach 1.3s ease-in-out infinite;position:relative}
.h-coach.on{display:flex;margin-bottom:26px}.h-coach .st{font-family:var(--h-px);font-size:calc(11px*var(--h-fs));color:#7a3d06}.h-coach .tx{font-size:calc(24px*var(--h-fs));font-weight:800;line-height:1.2;text-align:center;overflow-wrap:anywhere}
.h-coach .ar{position:absolute;left:50%;bottom:-30px;transform:translateX(-50%);font-size:26px;color:#ffd27a;text-shadow:0 3px 0 #000,0 0 0 #000;animation:h-arrow .7s ease-in-out infinite alternate;line-height:1}
@keyframes h-coach{50%{transform:scale(1.035);box-shadow:0 0 0 3px #000,0 8px 0 #7a4308,0 0 54px #ffd27a}}@keyframes h-arrow{to{transform:translate(-50%,8px)}}
.h-coach.done{animation:h-nowchg 1s ease-out}
.h-gd{padding-bottom:22px}
/* textos flotantes apilados bajo el banner */
.h-tst{gap:6px}.h-fl2{font-family:var(--h-px);font-size:calc(14px*var(--h-fs));padding:6px 14px;background:#120e26ee;border:2px solid currentColor;border-radius:8px;text-shadow:0 2px 0 #000;white-space:nowrap;animation:h-fl2 2s ease-out forwards;box-shadow:0 3px 0 #07040f}
@keyframes h-fl2{0%{opacity:0;transform:translateY(-10px) scale(.8)}12%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0}}
.h-fl2.good{color:var(--h-green)}.h-fl2.bad{color:var(--h-red)}.h-fl2.score{color:var(--h-amber2)}.h-fl2.info{color:var(--h-violet)}
/* decision de historia */
.h-pn[data-p=plan] .h-ph1,.h-pn[data-p=secret] .h-ph1{padding:12px 46px 10px 16px;flex-direction:column;align-items:flex-start;gap:4px}
.h-ph1 .q{margin:0;font-family:var(--h-ui);font-weight:800;font-size:calc(24px*var(--h-fs));line-height:1.25;color:var(--h-amber2)}
.h-ph1 .hv{font-size:calc(16px*var(--h-fs));color:var(--h-ink)}.h-ph1 .hv b{color:var(--h-teal)}
.h-pn[data-p=plan] .h-pb,.h-pn[data-p=secret] .h-pb{padding:12px 14px}
.h-pn[data-p=plan] .h-opts,.h-pn[data-p=secret] .h-sopts{grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}
.h-pn[data-p=plan] .h-opt,.h-pn[data-p=secret] .h-so{padding:14px 14px 12px;gap:9px}
.h-pn[data-p=plan] .h-opt h3{font-family:var(--h-ui);font-weight:800;font-size:calc(20px*var(--h-fs));line-height:1.2;color:var(--h-amber2)}
.h-pn[data-p=plan] .h-opt p,.h-pn[data-p=secret] .h-so p{font-size:calc(16px*var(--h-fs));line-height:1.4}
.h-eff{display:flex;flex-direction:column;gap:4px}.h-eff div{display:flex;align-items:center;gap:7px;font-size:calc(15px*var(--h-fs));line-height:1.3}.h-eff .u{color:var(--h-green);font-weight:900;font-size:1.3em}.h-eff .d{color:var(--h-red);font-weight:900;font-size:1.3em}
.h-pn[data-p=plan] .h-opt .kn{font-size:calc(14px*var(--h-fs));padding:6px 9px}.h-pn[data-p=plan] .h-opt .pv{font-size:calc(15px*var(--h-fs));padding:8px 10px;border-width:2px;background:#0f3a3d;color:#fff}.h-pn[data-p=plan] .h-opt .pv b{color:#6ff0df;font-size:1.05em}
.h-stage[data-p=plan] .h-pn,.h-stage[data-p=secret] .h-pn{max-height:100%}@media (max-height:760px){.h-pn[data-p=plan] .h-pb,.h-pn[data-p=secret] .h-pb{padding:8px 12px}.h-pn[data-p=plan] .h-opt,.h-pn[data-p=secret] .h-so{padding:10px 12px;gap:6px}.h-ph1 .hv{font-size:calc(14px*var(--h-fs))}}
.h-pn[data-p=secret] .h-so b{font-size:calc(18px*var(--h-fs))}
@media (max-height:760px){.h-ph1 .q{font-size:calc(20px*var(--h-fs))}.h-pn[data-p=plan] .h-opt h3{font-size:calc(17px*var(--h-fs))}.h-pn[data-p=plan] .h-opt p{font-size:calc(14px*var(--h-fs))}.h-eff div{font-size:calc(13.5px*var(--h-fs))}}
/* resultado claro */
.h-xh{margin:0 0 12px;font-family:var(--h-ui);font-weight:800;font-size:calc(28px*var(--h-fs));line-height:1.2;color:var(--h-amber2);text-shadow:0 3px 0 #000}
.h-xl{display:flex;flex-direction:column;gap:8px}.h-xr{display:flex;align-items:center;gap:12px;padding:10px 14px;background:#0e0a1d;border:2px solid var(--h-line);border-radius:8px;animation:h-slide .35s both}
.h-xr .tx{flex:1;font-size:calc(18px*var(--h-fs));line-height:1.35}.h-xr .dl{font-family:var(--h-px);font-size:calc(20px*var(--h-fs));min-width:84px;text-align:right}.h-xr .dl.g{color:var(--h-green)}.h-xr .dl.b{color:var(--h-red)}.h-xr .dl.z{color:var(--h-dim)}
.h-xw{margin:14px 0 0;padding:0;list-style:none;font-size:calc(16px*var(--h-fs));color:var(--h-ink)}.h-xw li{padding:4px 0 4px 20px;position:relative}.h-xw li:before{content:"▸";position:absolute;left:0;color:var(--h-amber)}.h-xw h4{margin:0 0 4px;font-family:var(--h-px);font-weight:400;font-size:calc(9px*var(--h-fs));color:var(--h-violet)}
.h-pn[data-p=resolve] .h-foot .h-btn{font-size:calc(14px*var(--h-fs));padding:14px 22px}
`,

  /* ===== v8: sin flashes, menos opciones, tarjeta flotante, brief (look v6: pixel art azul/morado + naranja) ===== */
`
/* sin flashes: borde fino, <150 ms, opacidad <=.12 */
.h-flash{background:none;box-shadow:inset 0 0 0 3px var(--fc,#ffd27a);animation:h-fl3 .14s ease-out forwards}@keyframes h-fl3{from{opacity:.12}to{opacity:0}}
.h-vig{background:none;box-shadow:inset 0 0 0 3px #ff5d5d,inset 0 0 18px #ff5d5d55}.h-vig.on{opacity:.55;animation:h-vig2 1.6s ease-in-out infinite}@keyframes h-vig2{50%{opacity:.25}}
.hud.noflash .h-vig.on{animation:none;opacity:.4}@media (prefers-reduced-motion:reduce){.h-flash{display:none}.h-vig.on{animation:none}}
.h-st.flash-g .h-bar,.h-st.flash-b .h-bar{box-shadow:0 0 0 1px var(--h-line)}
/* menos opciones: una sola acción visible */
.hud.hasask .h-ab,.hud.hasask .h-bot,.hud.hasab .h-bot{display:none}.h-act:has(.h-bot .h-btn) .h-ab:not(.rdy){display:none}
/* tarjeta flotante de hallazgo, brief del plan, «sirve para» */
.h-fcard{position:absolute;left:12px;bottom:92px;z-index:12;width:min(320px,calc(100% - 24px));padding:12px 16px;pointer-events:none;animation:sy-in .3s both;background:linear-gradient(#35266ef2,#1b1040f5);border:2px solid var(--h-amber);border-radius:8px;box-shadow:inset 0 0 0 3px #1a0f38,0 0 0 2px #000,0 6px 18px #000a}.h-fcard.out{animation:sy-out .4s forwards}
.h-fcard .k{font-family:var(--h-px);font-size:calc(9px*var(--h-fs));color:var(--h-amber)}.h-fcard .t{font-weight:800;font-size:calc(17px*var(--h-fs));color:var(--h-amber2);margin:4px 0 2px}.h-fcard .x{font-size:calc(14px*var(--h-fs));color:var(--h-ink)}.h-fcard .u{margin-top:6px;font-size:calc(14px*var(--h-fs));color:var(--h-ink);border-top:2px solid var(--h-line);padding-top:6px}.h-fcard .u b{color:var(--h-amber2)}
.h-brief{margin:10px 14px 0;padding:8px 12px;border-left:4px solid var(--h-amber);background:#0e0a1d;font-size:calc(15px*var(--h-fs));line-height:1.4}.h-brief b{display:block;font-family:var(--h-px);font-weight:400;font-size:calc(9px*var(--h-fs));color:var(--h-amber2);margin-bottom:4px}
.h-ic1 .us{margin-top:6px;font-size:calc(14px*var(--h-fs));font-weight:700;color:#5a3a08}.h-ic1 .us b{color:#9b3a12}
`
  ].join('\n');

  var STAT_TIPS = {
    agua: 'Nivel del agua en la cueva. Sube con el tiempo. Si llega a 100, la cueva se inunda y pierden.',
    salud: 'Salud de Lía y del equipo. Si llega a 0, el rescate fracasa. Ahogarse o equivocarse la baja.',
    material: 'Cuerdas, baterías y botiquín del equipo. Cada plan gasta algo. Con 0 no pueden hacer nada que lo necesite.',
    confianza: 'La confianza que se tienen entre ustedes. Mentir y callar la bajan; compartir bien la sube. A 0 nadie colabora.'
  };
  function statTip(s) {
    var L = null; try { L = W.Story && W.Story.statusLabels && W.Story.statusLabels[s.k]; } catch (e) { }
    var t = L && typeof L === 'object' ? (L.tip || L.desc || L.text || L.help) : L;
    return typeof t === 'string' && t.length > 25 ? t : STAT_TIPS[s.k];
  }

  /* ---------- montaje ---------- */
  function mount(host) {
    if (mounted) { if (host && root.parentNode !== host) host.appendChild(root); return root; }
    host = host || D.body;
    if (!D.getElementById('hud-css')) {
      var st = D.createElement('style'); st.id = 'hud-css'; st.textContent = CSS; D.head.appendChild(st);
      if (!D.querySelector('link[href*="Press+Start+2P"]')) { var lk = D.createElement('link'); lk.rel = 'stylesheet'; lk.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'; D.head.appendChild(lk); }
    }
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    root = D.createElement('div'); root.className = 'hud'; root.id = 'hud';
    var pips = ''; for (var i = 1; i <= 5; i++) pips += '<div class="h-pip" data-r="' + i + '">' + i + '</div>';
    var stats = STATS.map(function (s) {
      var tp = statTip(s);
      return '<div class="h-st" data-k="' + s.k + '" style="--c:' + s.color + '" tabindex="0" title="' + esc(s.label + ': ' + tp) + '"><div class="l">' + icon(s.k, 26) + '<span class="lt">' + s.label + '</span><b>0</b></div><div class="h-bar"><i class="ghost"></i><i class="fill"></i></div><div class="tip"><b>' + s.label + '</b>' + esc(tp) + '</div></div>';
    }).join('');
    root.innerHTML =
      '<div class="h-top"><div class="h-rnd"><div class="h-rlab">ZONA <b class="rn">1/5</b></div><div class="h-pips">' + pips + '</div></div>' +
      '<div class="h-ph"><div class="h-phn"></div><div class="h-phi"></div><div class="h-evt"></div></div>' +
      '<div class="h-tm"><div class="h-time">0:00</div><div class="h-tbar"><i></i></div></div>' +
      '<div class="h-sts">' + stats + '</div></div>' +
      '<div class="h-left gone"><div class="h-lh" data-act="leftmin">' + icon('mapa', 14) + ' TÚ<span class="x">▾</span></div><div class="h-lb"></div></div>' +
      '<div class="h-mid"><div class="h-gd"><div class="h-coach"></div><div class="h-now"></div><div class="h-air"></div></div><div class="h-tst"></div><div class="h-stage"></div>' +
        '<div class="h-help"></div><div class="h-sy"></div><div class="h-dos"></div><canvas class="h-mini" width="240" height="110" data-act="bigmap" title="Mapa (M)"></canvas></div>' +
      '<div class="h-act"><div class="h-abil"></div><div class="h-bot"></div><div class="h-dock">' +
        '<button class="h-btn alt" data-act="dossier" title="Cuaderno de Intel (J)">' + icon('ojo', 14) + ' CUADERNO <kbd>J</kbd><span class="h-badge" style="display:none"></span></button>' +
        '<button class="h-btn alt ic" data-act="mini" title="Mapa (M)">M</button><button class="h-btn alt ic" data-act="help" title="Ayuda (H)">?</button>' +
        '<button class="h-btn alt ic" data-act="pause" title="Pausa (Esc)">II</button></div></div>' +
      '<div class="h-chat"><div class="h-ch" data-act="chatmin">' + icon('chat', 14) + '<span class="ttl"> CHAT DEL EQUIPO</span><span class="tg"><kbd>T</kbd><span class="cv"></span><span class="h-badge" style="display:none;position:static"></span></span></div>' +
        '<div class="h-logw"><div class="h-log" role="log" aria-live="polite"></div><button type="button" class="h-newmsg" data-act="newmsg">Mensajes nuevos ↓</button></div><div class="h-typ"></div><div class="h-chips"></div>' +
        '<form class="h-in" autocomplete="off"><input type="text" maxlength="220" placeholder="Escribe al equipo…" aria-label="Mensaje al equipo"><button class="h-btn teal" type="submit">ENVIAR</button></form></div>' +
      '<div class="h-fx"></div><div class="h-vig"></div><div class="h-dlg"></div><div class="h-pause"></div>';
    host.appendChild(root);
    var fr = img('ui_frame'); if (fr) root.style.setProperty('--h-frame', 'url(' + fr + ')');
    var q = function (s) { return root.querySelector(s); };
    el = { top: q('.h-top'), rn: q('.rn'), pips: root.querySelectorAll('.h-pip'), phn: q('.h-phn'), phi: q('.h-phi'), evt: q('.h-evt'), time: q('.h-time'), tbar: q('.h-tbar'),
      left: q('.h-left'), lb: q('.h-lb'), stage: q('.h-stage'), bot: q('.h-bot'), help: q('.h-help'), dock: q('.h-dock'), now: q('.h-now'), air: q('.h-air'), abil: q('.h-abil'), coach: q('.h-coach'), sy: q('.h-sy'), vig: q('.h-vig'), dlg: q('.h-dlg'), gd: q('.h-gd'), mid: q('.h-mid'), bar: q('.h-act'), mini: q('.h-mini'), newmsg: q('.h-newmsg'), chat: q('.h-chat'), log: q('.h-log'), typ: q('.h-typ'), chips: q('.h-chips'),
      form: q('.h-in'), input: q('.h-in input'), dos: q('.h-dos'), tst: q('.h-tst'), fx: q('.h-fx'), pause: q('.h-pause'), dbadge: q('.h-dock .h-badge'), cbadge: q('.h-ch .h-badge') };
    el.sts = {}; STATS.forEach(function (s) { el.sts[s.k] = q('.h-st[data-k=' + s.k + ']'); });
    root.addEventListener('click', onClick);
    el.form.addEventListener('submit', function (e) { e.preventDefault(); sendChat(el.input.value); el.input.value = ''; });
    el.input.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Escape') el.input.blur(); noteTyping(); });
    el.input.addEventListener('keyup', function (e) { e.stopPropagation(); });
    el.input.addEventListener('keypress', function (e) { e.stopPropagation(); });
    el.input.addEventListener('focus', function () { setChat(true); if (cb.focus) cb.focus(true); });
    el.input.addEventListener('blur', function () { if (cb.focus) cb.focus(false); });
    el.log.addEventListener('scroll', function () { pinned = nearBottom(); if (pinned) { unread = 0; badge(); showNew(false); } });
    el.newmsg.addEventListener('click', function () { el.log.scrollTop = el.log.scrollHeight; });
    W.addEventListener('keydown', onKeyCap, true); W.addEventListener('keydown', onKey);
    W.addEventListener('resize', layout); layout();
    if (W.ResizeObserver) { ro = new ResizeObserver(function () { if (cb.insets) cb.insets(getInsets()); }); [el.top, el.left, el.chat, el.bar, el.gd].forEach(function (n) { ro.observe(n); }); }
    miniTimer = setInterval(drawMini, 250);
    applyOpts(); mounted = true;
    if (!rafOn) { rafOn = true; requestAnimationFrame(loop); }
    setInterval(clockTick, 200);
    renderChips(); setChat(false); setAir(airV); paintAbil();
    return root;
  }
  function isMobile() { return W.matchMedia && W.matchMedia('(max-width:820px),(max-height:520px)').matches; }
  function layout() {
    if (!el.chat) return;
    var mob = isMobile();
    if (!mob) { el.chat.classList.remove('open'); root.classList.remove('chatopen'); el.left.classList.remove('mob'); }
    if (cb.insets) cb.insets(getInsets());
  }
  function applyOpts() { root.classList.toggle('big', !!opts.big); root.classList.toggle('hc', !!opts.contrast); root.classList.toggle('noflash', !!opts.noflash); }
  function setOptions(o) { Object.assign(opts, o || {}); lsSet('rcv3_hudopt', opts); if (root) applyOpts(); }

  /* ---------- bucle de animación / reloj ---------- */
  function loop() {
    var changed = false;
    for (var k in tgt) {
      var d = tgt[k] - disp[k];
      if (Math.abs(d) > 0.05) { disp[k] += d * 0.14; changed = true; } else disp[k] = tgt[k];
    }
    if (changed) paintStats();
    requestAnimationFrame(loop);
  }
  function paintStats() {
    STATS.forEach(function (s) {
      var n = el.sts[s.k], v = clamp(disp[s.k], 0, 100), t = clamp(tgt[s.k], 0, 100);
      n.querySelector('b').textContent = Math.round(disp[s.k]);
      var f = n.querySelector('.fill'), g = n.querySelector('.ghost');
      f.style.width = v + '%'; g.style.width = Math.max(v, t > v ? t : v) + '%';
      var crit = s.bad ? t >= 80 : t <= 20;
      n.classList.toggle('crit', crit);
      var c = s.color; if (s.bad) c = t >= 80 ? '#ff5d5d' : t >= 55 ? '#f2a93b' : s.color;
      n.style.setProperty('--c', c);
    });
  }
  function clockTick() {
    if (!mounted || !P) return;
    var left = Math.max(0, clock.left - (performance.now() - clock.at) / 1000), sh = Math.ceil(left - 0.001);
    if (sh === clock.lastShown) return; clock.lastShown = sh;
    var timed = ['explore', 'plan', 'secret', 'briefing'].indexOf(P.phase) >= 0;
    el.time.textContent = timed ? mmss(sh) : '--';
    var urgent = timed && sh <= 10 && sh > 0, warn = timed && sh <= 30 && !urgent;
    el.time.classList.toggle('urgent', urgent); el.time.classList.toggle('warn', warn);
    el.tbar.classList.toggle('urgent', urgent); el.tbar.classList.toggle('warn', warn);
    el.tbar.firstChild.style.width = clamp(left / Math.max(1, phaseMax), 0, 1) * 100 + '%';
    if (urgent && !paused) snd(sh <= 3 ? 'tick_urgent' : 'tick');
    // cuenta atrás de tarjetas
    var cd = root.querySelector('.h-cdown i'); if (cd) cd.style.width = clamp(left / Math.max(1, phaseMax), 0, 1) * 100 + '%';
    var tm = root.querySelector('.h-ph1 .tm'); if (tm) tm.textContent = mmss(sh);
  }

  /* ---------- update ---------- */
  function update(pub, priv, role) {
    if (!mounted) mount();
    var oldP = P; P = pub || P || {}; if (priv) V = priv; if (role) R = role;
    if (!P) return;
    var s = P.s || {};
    STATS.forEach(function (st) {
      var nv = s[st.k]; if (nv == null) return;
      var old = tgt[st.k];
      if (!dispInit) disp[st.k] = nv;
      else if (nv !== old) statChanged(st, old, nv);
      tgt[st.k] = nv;
    });
    var sc = P.score && (P.score.total != null ? P.score.total : P.score);
    if (typeof sc === 'number') { if (!dispInit) disp.score = sc; tgt.score = sc; }
    dispInit = true; paintStats();
    // reloj
    if (P.tleft != null) { clock.left = P.tleft; clock.at = performance.now(); clock.lastShown = -1; }
    var ph = P.phase, newPh = ph !== cur.phase || P.round !== cur.round;
    if (newPh) { phaseMax = Math.max(1, P.tleft || 1); }
    else if (P.tleft > phaseMax) phaseMax = P.tleft;
    clockTick();
    paintTop();
    syncChat();
    paintLeft();
    if (V && V.intel) { if (V.intel.length > lastIntelLen && dispInit && lastIntelLen >= 0 && oldP) { snd('intel'); floatText('+ INTEL', 'info'); } lastIntelLen = V.intel.length; badge(); if (el.dos.classList.contains('open')) { var prev = el.db ? el.db.scrollTop : 0; if (!editing) renderDossier(); if (el.db) el.db.scrollTop = prev; } }
    if (newPh) { cur.phase = ph; cur.round = P.round; onPhase(ph, null); }
    else livePanels();
    if (P.players && P.players[R]) { if (localReady && !P.players[R].ready && P.phase === 'explore') { /* servidor lo ignoró: mantiene local */ } }
    paintBottom(); paintNow();
    // cuaderno: eventos de dificultad de agua
    waterWarn();
  }
  function statChanged(st, old, nv) {
    var d = nv - old;
    var small = P && P.phase === 'explore' && Math.abs(d) < 3;
    var good = st.bad ? d < 0 : d > 0;
    var node = el.sts[st.k];
    node.classList.remove('flash-g', 'flash-b'); void node.offsetWidth;
    if (!small) {
      node.classList.add(good ? 'flash-g' : 'flash-b'); setTimeout(function () { node.classList.remove('flash-g', 'flash-b'); }, 900);
      if (!resolving) floatText((d > 0 ? '+' : '') + Math.round(d) + ' ' + st.label, good ? 'good' : 'bad', st.k);
    }
  }
  function waterWarn() {
    var a = (P.s && P.s.agua) || 0, lv = a >= 90 ? 3 : a >= 75 ? 2 : a >= 50 ? 1 : 0;
    if (lv > waterLevelHit) { waterLevelHit = lv; snd('water_warn'); note(lv === 3 ? '¡EL AGUA ESTÁ A PUNTO DE ALCANZAROS!' : lv === 2 ? '¡EL AGUA SUBE PELIGROSAMENTE!' : 'El agua ya llega a la mitad'); shake(lv === 3 ? 1 : .5); }
    if (lv < waterLevelHit) waterLevelHit = lv;
  }
  function paintTop() {
    var ph = P.phase, info = PHASES[ph] || { n: String(ph || '').toUpperCase(), i: '', c: '#fff', e: '' }, r = P.round || 1;
    el.rn.textContent = r + '/5';
    el.pips.forEach(function (p, i) { p.className = 'h-pip' + (i + 1 < r ? ' done' : i + 1 === r ? ' now' : ''); p.textContent = i + 1 < r ? '✓' : (i + 1); });
    el.phn.innerHTML = '<span class="t" style="color:' + info.c + '"><span>' + info.e + ' ' + esc(info.n) + '</span></span>';
    var me = P.players && P.players[R], ap = V && V.ap != null ? V.ap : me && me.ap;
    var instr = info.i;
    if (ph === 'explore') instr = 'Explora y habla con el equipo; decidan cuando estés listo';
    if (ph === 'plan' && localVote) instr = 'Votaste ' + optLetter(localVote) + '. Puedes cambiar hasta que acabe el tiempo';
    if (ph === 'secret' && secretSealed) instr = 'Decisión sellada. Espera a la resolución';
    el.phi.textContent = instr; el.phi.title = instr;
    el.evt.textContent = P.event && P.event.title && ph !== 'briefing' ? '📍 ' + P.event.title : '';
    el.top.style.borderColor = ph === 'explore' && P.s && P.s.agua >= 80 ? 'var(--h-red)' : '';
  }
  function optLetter(id) {
    var o = P && P.plan && P.plan.options || [], i = o.findIndex(function (x) { return x.id === id; });
    return i >= 0 ? 'ruta ' + 'ABC'[i] : String(id);
  }
  function teamCard(r) {
    var p = (P.players && P.players[r]) || {}, i = roleInfo(r);
    return '<div class="h-tc ' + (r === R ? 'me ' : '') + (p.connected === false ? 'off ' : '') + (typingState[r] ? 'typ' : '') + '" data-r="' + r + '"><div class="pc">' + portrait(r, 'neutral', 56) + (p.ready ? '<span class="ok">✓</span>' : '') + '<span class="td"><i></i><i></i><i></i></span></div><b style="color:' + i.color + '">' + esc(i.name) + '</b><em>' + esc(i.title) + '</em><u class="' + (p.ai ? 'ai' : 'hu') + '">' + (r === R ? 'TÚ' : p.ai ? 'IA' : 'HUMANO') + '</u></div>';
  }
  function paintLeft() {
    if (!R) return;
    var b = roleInfo(R), me = (P.players && P.players[R]) || {}, ap = V && V.ap != null ? V.ap : me.ap;
    var apH = ''; for (var i = 0; i < 3; i++) apH += '<i class="' + (i < ap ? '' : 'off') + '"></i>';
    var goal = V && V.goal, gh = '', gbar = '';
    if (goal) {
      var cur2 = goal.stat && P.s ? P.s[goal.stat] : null, ok = false, pct = 0;
      if (cur2 != null && goal.min != null) { ok = goal.stat === 'agua' ? cur2 <= goal.min : cur2 >= goal.min; pct = clamp(goal.stat === 'agua' ? (100 - cur2) / Math.max(1, 100 - goal.min) * 100 : cur2 / Math.max(1, goal.min) * 100, 0, 100); }
      gh = '<div class="h-sec me">' + icon('candado', 12) + ' TU OBJETIVO <span style="margin-left:auto;color:var(--h-amber2)">' + (goal.points ? '+' + goal.points + ' pts' : '') + '</span></div><div class="h-gt" title="' + esc(goal.text) + '">' + esc(goal.text) + '</div>';
      gbar = cur2 != null && goal.min != null ? '<div class="h-goalbar ' + (ok ? 'ok' : '') + '"><i style="width:' + pct + '%"></i></div><div style="font-size:11px;color:var(--h-dim);margin-top:3px">' + (GOAL_STATS[goal.stat] || goal.stat) + ' ' + Math.round(cur2) + ' / ' + (goal.stat === 'agua' ? '≤' : '≥') + goal.min + (ok ? ' ✔ ahora mismo' : '') + '</div>' : '';
    }
    var team = PLAYER_ROLES.map(teamCard).join('');
    el.lb.innerHTML =
      '<div class="h-me">' + portrait(R, P.s && P.s.salud < 30 ? 'hurt' : 'neutral', 56) + '<div class="nm"><div class="n" style="color:' + b.color + '">' + esc(b.name) + '</div><div class="r">' + esc(b.title) + '</div></div>' + (ap != null ? '<div class="h-ap">ACCIONES<div title="Acciones restantes">' + apH + '</div></div>' : '') + '</div>' +
      (gh ? '<div>' + gh + '</div>' : '') +
      '<div class="h-more">' + gbar +
      '<div><div class="h-sec">' + icon('estrella', 12) + ' MISIÓN DEL EQUIPO</div><div class="h-txt">' + esc(P.mission || 'Saquen a Lía con vida antes de que el agua llegue a 100.') + '</div></div>' +
      '<div><div class="h-sec">EQUIPO</div><div class="h-team">' + team + '</div></div></div>';
  }
  function curAp() { var me = P && P.players && P.players[R]; return V && V.ap != null ? V.ap : me && me.ap; }
  function readyCfg() {
    var d = { label: 'HABLAR CON EL EQUIPO Y DECIDIR', tip: 'Cuando estés listo, el equipo se reúne para votar el plan', after: '', pulse: false, disabled: false };
    if (readyOv) Object.keys(readyOv).forEach(function (k) { if (readyOv[k] != null) d[k] = readyOv[k]; });
    return d;
  }
  function paintBottom() {
    var ph = P.phase, me = P.players && P.players[R], ready = !!((me && me.ready) || localReady);
    if (ph !== 'explore') { el.bot.innerHTML = ''; el.bot.dataset.k = ''; return; }
    var done = PLAYER_ROLES.filter(function (r) { return r !== R && P.players && P.players[r] && P.players[r].ready; }).map(function (r) { return roleInfo(r).name; });
    var c = readyCfg(), key = JSON.stringify(c) + ready + done.join(',');
    if (el.bot.dataset.k === key) return; el.bot.dataset.k = key;
    el.bot.innerHTML = ready ? '<div class="h-hint"><b>✔ Listo.</b> ' + (done.length ? 'También quieren decidir: ' + esc(done.join(', ')) + '. ' : '') + 'Sigue explorando hasta que arranque.</div>'
      : '<div class="h-rdy"><button class="h-btn ' + (c.pulse ? 'teal pulse glow' : 'alt') + '" data-act="ready" title="' + esc(c.tip) + '"' + (c.disabled ? ' disabled' : '') + '>📣 ' + esc(c.label) + ' <kbd>R</kbd></button>' + (c.after ? '<small>' + esc(c.after) + '</small>' : '') + '</div>';
  }

  /* ---------- guiado: UN solo objetivo (con su porqué) ---------- */
  var NOW_IC = { explore: 'ojo', go: 'mapa', plan: 'voto', wait: 'reloj', danger: 'alerta', done: 'estrella', urgent: 'reloj', info: 'chat', secret: 'candado' };
  function nowAuto(ph) {
    var o = {
      briefing: ['Escucha lo que pasa', 'Marca el ambiente; enseguida sigues explorando.', 'info'],
      explore: ['Explora la cueva', 'Camina hasta un icono brillante y presiona E.', 'explore'],
      plan: ['Voten el plan', 'Debate en el chat y vota con 1 · 2 · 3. Gana la mayoría.', 'plan'],
      secret: ['Elige tu acción secreta', 'Nadie la ve hasta la resolución. 1-3 elige, otra vez sella.', 'secret'],
      summary: ['Revisa tus puntos', 'Cuando quieras, sigue adelante.', 'done']
    }[ph];
    return o ? { text: o[0], sub: o[1], kind: o[2] } : null;
  }
  function paintNow() {
    if (!el.now || !P) return;
    var ph = P.phase, n = nowOv || nowAuto(ph);
    if (!n || ph === 'final' || coachO || (ph === 'resolve' && panelName !== 'resolve') || panelName === 'plan' || panelName === 'secret') { el.now.style.display = 'none'; nowKey = ''; return; }
    el.now.style.display = '';
    var pr = n.progress, why = n.why || '', sub = n.sub || n.hint || '', key = [n.text, why, sub, n.kind, pr && pr.done, pr && pr.total].join('|');
    if (key === nowKey) return;
    var changed = nowKey !== '' && n.text !== nowKey.split('|')[0]; nowKey = key;
    var k = NOW_IC[n.kind] ? n.kind : 'go';
    el.now.className = 'h-now ' + (n.kind === 'urgent' || n.kind === 'wait' || n.kind === 'danger' ? n.kind : '');
    el.now.innerHTML = '<div class="ic">' + icon(NOW_IC[k], 36) + '</div><div class="tx"><div class="k">AHORA</div><div class="t">' + esc(n.text) + '</div>' + (why ? '<div class="w"><b>Por qué:</b> ' + esc(why) + '</div>' : '') + (sub ? '<div class="s">' + esc(sub) + '</div>' : '') + '</div>' +
      (pr && pr.total ? '<div class="pg">' + (pr.done | 0) + '/' + (pr.total | 0) + '<span><i style="width:' + clamp((pr.done | 0) / pr.total * 100, 0, 100) + '%"></i></span></div>' : '');
    if (changed) { void el.now.offsetWidth; el.now.classList.add('chg'); snd('toast'); }
  }
  function setNow(o) { nowOv = o && o.text ? o : null; if (mounted && P) paintNow(); }
  function setMission(o) { misOv = o || null; if (mounted && el.dos && el.dos.classList.contains('open') && !editing) { var prev = el.db ? el.db.scrollTop : 0; renderDossier(); if (el.db) el.db.scrollTop = prev; } }
  function setReady(o) { readyOv = o || null; if (mounted && P) { el.bot.dataset.k = ''; paintBottom(); } }

  /* aire (0..100 | null) */
  function setAir(v) {
    airV = v == null || isNaN(+v) ? null : clamp(+v, 0, 100);
    if (!mounted) return; var a = el.air;
    if (airV == null) { a.style.display = 'none'; a.innerHTML = ''; a.classList.remove('low'); if (el.vig) el.vig.classList.remove('on'); airWarned = false; return; }
    var low = airV < 25;
    if (!a.firstChild) a.innerHTML = '<span class="l">' + icon('agua', 22) + ' AIRE</span><span class="b"><i></i></span><b></b><em>¡SIN AIRE! Sal del agua</em>';
    a.style.display = 'flex'; a.classList.toggle('low', low); if (el.vig) el.vig.classList.toggle('on', low);
    a.querySelector('.b i').style.width = airV + '%'; a.querySelector('b').textContent = Math.round(airV);
    a.title = 'Aire: bajo el agua se gasta rápido. A 0 te ahogas y el equipo pierde salud. Sal a respirar o busca una bolsa de aire.';
    if (low && !airWarned) { airWarned = true; snd('water_warn'); } if (!low) airWarned = false;
  }
  /* habilidad del rol (tecla Q) y fila «Pedir ayuda» */
  function paintAbil() {
    if (!el.abil) return; var ab = abilO, hp = helpO, h = '';
    if (ab && (ab.ready !== false || ab.hint)) h += '<div class="h-ab' + (ab.ready ? ' rdy' : '') + '"><button class="h-btn ' + (ab.ready ? 'teal glow' : 'alt') + '" data-act="ability" title="' + esc(ab.hint || '') + '"' + (ab.ready ? '' : ' aria-disabled="true"') + '><kbd>' + esc(ab.key || 'Q') + '</kbd> ' + esc(ab.label || 'Habilidad') + '</button>' + (ab.hint ? '<small>' + esc(ab.hint) + '</small>' : '') + '</div>';
    if (hp && hp.length) h += '<div class="h-ask"><span class="l">PEDIR AYUDA</span>' + hp.map(function (x, i) { return [x, i]; }).sort(function (a, b) { return (a[0].enabled === false) - (b[0].enabled === false); }).slice(0, 1).map(function (xi) {
      var x = xi[0], i = xi[1], b = roleInfo(x.role);
      return '<button class="h-btn alt" data-act="ask" data-i="' + i + '" style="--rc:' + b.color + '" title="' + esc(x.hint || '') + '"' + (x.enabled === false ? ' disabled' : '') + '>' + esc(x.label || ('Pedir a ' + b.name)) + '</button>'; }).join('') + '</div>';
    root.classList.toggle('hasab', !!(ab && ab.ready)); root.classList.toggle('hasask', !!(hp && hp.length));
    var key = h; if (el.abil.dataset.k === key) return; el.abil.dataset.k = key; el.abil.innerHTML = h; el.abil.style.display = h ? '' : 'none';
  }
  function setAbilities(o) { abilO = o && typeof o === 'object' ? o : null; if (mounted) paintAbil(); }
  function setHelp(l) { helpO = Array.isArray(l) ? l : null; if (mounted) paintAbil(); }
  function setQuick(l) { quickO = Array.isArray(l) ? l.filter(function (x) { return x && (x.label || x.text); }) : null; if (mounted) { el.chips.dataset.k = ''; renderChips(); } }
  function getInsets() {
    var z = { left: 0, right: 0, top: 0, bottom: 0 }; if (!root || !mounted || hidden) return z;
    var rr = root.getBoundingClientRect(), mob = isMobile();
    function shown(n) { return n && n.getClientRects().length > 0 && getComputedStyle(n).display !== 'none'; }
    var top = el.top.getBoundingClientRect().bottom;
    if (shown(el.now) || shown(el.air) || shown(el.coach)) top = Math.max(top, el.gd.getBoundingClientRect().bottom);
    z.top = top - rr.top + 4;
    if (shown(el.left) && (!mob || el.left.classList.contains('mob'))) z.left = el.left.getBoundingClientRect().right - rr.left + 4;
    if (!mob && shown(el.chat)) z.right = rr.right - el.chat.getBoundingClientRect().left + 4;
    var bt = el.bar.getBoundingClientRect(); z.bottom = rr.bottom - (shown(el.bar) ? bt.top : rr.bottom);
    if (mob && el.chat.classList.contains('open')) z.bottom = Math.max(z.bottom, rr.bottom - el.chat.getBoundingClientRect().top);
    ['left', 'right', 'top', 'bottom'].forEach(function (k) { z[k] = Math.max(0, Math.round(z[k])); });
    return z;
  }
  function drawMini() {
    if (!el.mini || hidden || !P) return;
    var zn = 0; try { var e0 = W.RC && W.RC.eng && W.RC.eng(); zn = e0 && e0.getZone ? e0.getZone() : 0; } catch (e1) { }
    if (!(miniUser != null ? miniUser : zn >= 2)) { el.mini.classList.remove('on'); return; }
    var fn = miniFn; if (!fn) { var e = W.RC && W.RC.eng && W.RC.eng(); if (e && e.drawMinimap) fn = function (c, w, h) { return e.drawMinimap(c, w, h); }; }
    var ok = false;
    if (fn) { try { var c = el.mini.getContext('2d'); c.clearRect(0, 0, 240, 110); ok = fn(c, 240, 110) !== false; if (ok) { c.font = 'bold 9px monospace'; c.fillStyle = '#0a0716cc'; c.fillRect(2, 2, 34, 12); c.fillStyle = '#ffd24a'; c.fillText('MAPA', 5, 11); } } catch (e2) { ok = false; } }
    el.mini.classList.toggle('on', ok);
    if (big) { if (!ok) closeBig(); else { try { var bc = big.querySelector('canvas'), bg = bc.getContext('2d'); bg.clearRect(0, 0, bc.width, bc.height); if (fn(bg, bc.width, bc.height) === false) closeBig(); } catch (e3) { closeBig(); } } }
  }
  var big = null;
  function closeBig() { if (big) { big.remove(); big = null; } }
  function toggleBig() { // mapa grande superpuesto, no pausa el juego ni bloquea teclas de movimiento
    if (big) return closeBig();
    if (!el.mini.classList.contains('on')) return;
    var w = Math.max(240, Math.min(640, Math.floor(root.clientWidth * .6))), h = Math.round(w * 300 / 640);
    big = D.createElement('div'); big.className = 'h-big';
    big.innerHTML = '<div class="bt"><span>MAPA</span><button class="h-btn alt sm" data-act="bigmap" title="Cerrar (M / Esc)">✕</button></div><canvas width="' + w + '" height="' + h + '" style="width:' + w + 'px;height:' + h + 'px"></canvas>';
    root.appendChild(big); drawMini();
  }

  /* ---------- fases ---------- */
  function onPhase(ph, data) {
    root.classList.remove('shake');
    if (ph !== 'explore') localReady = false;
    if (ph === 'briefing' || ph === 'explore') { localVote = null; localSecret = null; secretSel = null; secretSealed = false; chosenShown = null; }
    el.bot.dataset.k = '';
    if (ph === 'plan') localVote = null;
    var keep = (ph === 'resolve' && panelName === 'resolve') || (ph === 'summary' && panelName === 'summary');
    if (!keep) closePanel(true);
    if (ph === 'briefing' && !window.RC_NOCARD) openEvent(data);
    else if (ph === 'plan') openPlan(data);
    else if (ph === 'secret') openSecret(data);
    if (PHASES[ph] && ph !== 'final') { snd(ph === 'briefing' ? 'round_start' : 'open'); }
    if (ph === 'final') { hideAllPanels(); }
    helpFor(ph, true);
    paintTop(); paintBottom(); paintNow(); renderChips();
    addRoundSep();
  }
  function showPhase(phase, data) {
    if (!mounted) mount();
    if (P) P.phase = phase;
    cur.phase = phase; if (P) cur.round = P.round;
    if (data && data.tleft != null) { clock.left = data.tleft; clock.at = performance.now(); phaseMax = data.tleft; }
    onPhase(phase, data || null);
  }
  function livePanels() {
    if (panelName === 'plan') updatePlan();
    else if (panelName === 'secret') updateSecret();
    else if (panelName === 'event') { /* nada */ }
    if (panelName === 'plan' && P.plan && P.plan.chosen && chosenShown !== P.plan.chosen) showChosen();
  }
  function hideAllPanels() { closePanel(true); }

  var PTITLE = { event: 'EVENTO DEL TRAMO', plan: 'PLAN DEL EQUIPO', secret: 'ACCIÓN SECRETA', resolve: 'RESOLUCIÓN', summary: 'RESUMEN' };
  function openPanel(name, html, cls) {
    closePanel(true);
    var d = D.createElement('div'); d.className = 'h-pn ' + (img('ui_frame') && name !== 'event' ? 'fr ' : '') + (cls || ''); d.dataset.p = name; d.dataset.title = PTITLE[name] || name; d.innerHTML = html + '<button class="h-mn" data-act="minpanel" title="Minimizar para ver el mundo">▁</button>'; el.stage.dataset.p = name;
    el.stage.appendChild(d); panel = d; panelName = name; root.classList.add('modal');
    return d;
  }
  function closePanel(now) {
    if (!panel) { root.classList.remove('modal', 'pmin'); return; }
    var p = panel; panel = null; panelName = null; root.classList.remove('modal', 'pmin'); el.stage.dataset.p = ''; if (p._abort) p._abort();
    if (now) p.remove(); else { p.classList.add('out'); setTimeout(function () { p.remove(); }, 260); }
  }

  /* evento / briefing */
  function openEvent(data) {
    var ev = Object.assign({}, P.event || {}, data && data.event || {});
    var src = ev.art && img(ev.art);
    var key = String(ev.id || ev.art || '').replace(/^event_/, ''), em = EVENT_EMOJI[key] || '⚠️';
    var art = '<div class="h-art"><span class="tag">⚠ EVENTO · TRAMO ' + (P.round || 1) + '</span>' + (src ? '<img alt="" src="' + src + '">' : '<span class="em">' + em + '</span>') + '</div>';
    var rad = ev.radio ? '<div class="h-radio">' + portrait('lia', 'preocupado', 44) + '<div><div class="w">📻 LÍA · RADIO</div><div class="q" data-type="' + esc('«' + ev.radio + '»') + '"></div></div></div>' : '';
    var exp = (data && data.expect) || ev.expect || 'Explora, reúne información y compártela. Después votarán el plan.';
    var p = openPanel('event', art + '<div class="h-pb"><h3 class="h-evt1">' + esc(ev.title || 'Nuevo tramo') + '</h3><div class="h-evtx">' + esc(ev.text || '') + '</div>' + rad +
      '<div class="h-expect"><b>QUÉ SE ESPERA:</b> ' + esc(exp) + '</div><div class="h-cdown"><i style="width:100%"></i></div></div>' +
      '<div class="h-foot"><span class="l">Empieza la exploración en unos segundos…</span><button class="h-btn" data-act="closeevt">ENTENDIDO ▶</button></div>');
    var q = p.querySelector('.q'); if (q) typeInto(q, q.dataset.type, 22, function () { snd('radio_static'); });
    snd('radio_on'); snd('open');
  }
  function typeInto(node, text, ms, each) {
    var i = 0, stop = false;
    (function step() { if (stop || !node.isConnected) return; node.textContent = text.slice(0, ++i); if (i < text.length) setTimeout(step, ms); })();
    return function () { stop = true; node.textContent = text; };
  }

  /* plan */
  function effHtml(v, up) { // gain/risk/effects: string | [string|{icon,text}] | {stat:n}
    var items = Array.isArray(v) ? v : typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.keys(v).map(function (k) { return { stat: k, n: v[k] }; }) : [];
    return items.map(function (x) {
      var st = null, txt = '', ic = '', u = up, good = null;
      if (typeof x === 'string') txt = x;
      else if (x && typeof x === 'object') {
        st = STATS.filter(function (z) { return z.k === (x.stat || x.icon); })[0]; ic = x.icon || x.stat || '';
        if (typeof x.n === 'number') { if (up == null) u = x.n > 0; good = st && st.bad ? x.n < 0 : x.n > 0; txt = (st ? st.label : x.stat) + ' ' + (x.n > 0 ? '+' : '') + x.n; } else txt = x.text || '';
      }
      if (!txt) return '';
      if (u == null) u = true;
      if (good == null) good = u;
      return '<div>' + (ic ? icon(ic, 22) : '') + '<span class="' + (good ? 'u' : 'd') + '">' + (u ? '↑' : '↓') + '</span><span>' + esc(txt) + '</span></div>';
    }).join('');
  }
  function openPlan(data) {
    var plan = P.plan || { options: [] }, opts_ = plan.options || [];
    var intel = (V && V.intel || []).filter(function (c) { return c.round === P.round; });
    var cards = opts_.map(function (o, i) {
      var hint = (V && V.planHints && V.planHints[o.id]) || '';
      var rel = intel.filter(function (c) { return c.about && [].concat(c.about).indexOf(o.id) >= 0; }).map(function (c) { return c.title + ' (' + relInfo(c.reliability).v + '%)'; }).join(' · ');
      var eff = (o.gain || o.risk) ? effHtml(o.gain, true) + effHtml(o.risk, false) : effHtml(o.effects || o.known_effects, null);
      return '<button class="h-opt" data-act="vote" data-id="' + esc(o.id) + '"><span class="k"><kbd>' + (i + 1) + '</kbd></span><h3>' + esc(o.title) + '</h3><p>' + esc(o.what || o.text || '') + '</p>' +
        (eff ? '<div class="h-eff">' + eff + '</div>' : '') +
        (o.known ? '<div class="kn"><b>Se sabe:</b> ' + esc(o.known) + '</div>' : '') +
        (hint || rel ? '<div class="pv"><b>Tú sabes:</b> ' + esc(hint || rel) + '</div>' : '') +
        '<div class="h-votes"><span class="c"></span></div></button>';
    }).join('');
    openPanel('plan', '<div class="h-ph1"><div class="q">' + esc(plan.ask || '¿Qué hacemos ahora?') + '</div><div class="hv">Vota con <b>1</b>, <b>2</b> o <b>3</b>. Gana la mayoría.</div></div>' +
      (plan.brief ? '<div class="h-brief"><b>Lo que saben / lo que no</b>' + esc(Array.isArray(plan.brief) ? plan.brief.join(' ') : plan.brief) + '</div>' : '') +
      '<div class="h-pb"><div class="h-opts">' + cards + '</div></div><div class="h-foot"><span class="l h-pstat"></span><button class="h-btn alt" data-act="chatfocus">💬 HABLAR EN EL CHAT <kbd>T</kbd></button></div>');
    updatePlan(); clockTick(); if (P.plan && P.plan.chosen) showChosen();
  }
  function updatePlan() {
    if (!panel || panelName !== 'plan') return;
    var plan = P.plan || {}, votes = Object.assign({}, plan.votes || {});
    if (localVote && !votes[R] && P.phase === 'plan') votes[R] = localVote;
    var by = {}; Object.keys(votes).forEach(function (r) { (by[votes[r]] = by[votes[r]] || []).push(r); });
    panel.querySelectorAll('.h-opt').forEach(function (n) {
      var id = n.dataset.id, vs = by[id] || [], box = n.querySelector('.h-votes');
      var sig = vs.join(',') + (votes[R] === id ? 'm' : '');
      n.classList.toggle('sel', votes[R] === id);
      if (box.dataset.s !== sig) { box.dataset.s = sig; if (vs.length > (box.dataset.n | 0)) snd('vote'); box.dataset.n = vs.length;
        box.innerHTML = vs.map(function (r) { return portrait(r, 'neutral', 30); }).join('') + '<span class="c">' + (vs.length ? vs.length + (vs.length > 1 ? ' VOTOS' : ' VOTO') : 'SIN VOTOS') + '</span>'; }
      if (plan.chosen) { n.classList.toggle('win', plan.chosen === id); n.classList.toggle('lose', plan.chosen !== id); }
    });
    var falta = PLAYER_ROLES.filter(function (r) { return !votes[r]; }).map(function (r) { return roleInfo(r).name; });
    var st = panel.querySelector('.h-pstat'); if (st) st.innerHTML = falta.length ? 'Faltan por votar: <b style="color:var(--h-amber2)">' + esc(falta.join(', ')) + '</b>' : '<b style="color:var(--h-green)">Todos votaron</b>';
  }
  function showChosen() {
    if (!panel || panelName !== 'plan') return;
    var plan = P.plan, o = (plan.options || []).filter(function (x) { return x.id === plan.chosen; })[0];
    chosenShown = plan.chosen; snd('vote_pass'); flash('#5fe39a'); sparks(.5, .5);
    var d = D.createElement('div'); d.className = 'h-chosen';
    var cnt = {}; Object.keys(plan.votes || {}).forEach(function (r) { cnt[plan.votes[r]] = (cnt[plan.votes[r]] || 0) + 1; });
    d.innerHTML = '<div><div class="a">★ PLAN ELEGIDO ★</div><div class="b">' + esc(o ? o.title : plan.chosen) + '</div><div class="c">' + (cnt[plan.chosen] || 0) + ' de 3 votos' + (plan.tiebreak ? ' · ' + esc(plan.tiebreak) : '') + '</div></div>';
    panel.appendChild(d);
  }
  function doVote(id) {
    if (!id || P.phase !== 'plan') return;
    localVote = id; snd('select'); updatePlan(); paintTop();
    if (cb.vote) cb.vote(id);
  }

  /* secreta */
  function openSecret() {
    var opts2 = (V && V.secretOptions) || [];
    var pick = V && V.secretPick != null ? V.secretPick : null; if (pick != null) { secretSealed = true; secretSel = pick; }
    var kinds = ['team', 'goal', 'risk'], kname = { team: 'PRO-EQUIPO', goal: 'PRO-OBJETIVO', risk: 'ARRIESGADA' };
    var cards = opts2.map(function (o, i) {
      var k = o.kind || kinds[i] || 'team', risk = typeof o.risk === 'number' ? o.risk : ({ bajo: 1, medio: 2, alto: 3 }[o.risk] || (k === 'risk' ? 3 : k === 'goal' ? 2 : 1));
      var pips = ''; for (var j = 1; j <= 3; j++) pips += '<i class="' + (j <= risk ? 'on' : '') + '"></i>';
      return '<button class="h-so" data-act="secret" data-i="' + i + '"><span class="k"><kbd>' + (i + 1) + '</kbd></span><span class="h-kind ' + k + '">' + kname[k] + '</span>' +
        (o.title ? '<b style="font-size:15px">' + esc(o.title) + '</b>' : '') + '<p>' + esc(o.text) + '</p>' + (o.hint ? '<p style="font-size:12px;color:var(--h-dim)">' + esc(o.hint) + '</p>' : '') +
        '<div class="h-risk">RIESGO <span class="p r' + risk + '">' + pips + '</span>' + (o.reward ? '<span style="margin-left:auto;color:var(--h-green)">' + esc(o.reward) + '</span>' : '') + '</div></button>';
    }).join('') || '<div class="h-empty">Esperando tus opciones…</div>';
    openPanel('secret', '<div class="h-ph1"><div class="q">Ahora decide en secreto qué haces tú.</div><div class="hv">Nadie lo verá hasta el final.</div></div>' +
      '<div class="h-pb"><div class="h-sopts">' + cards + '</div></div><div class="h-foot"><span class="l h-sstat">Elige con 1, 2 o 3 y presiona SELLAR.</span><button class="h-btn red" data-act="seal" disabled>🔒 SELLAR DECISIÓN</button></div>');
    updateSecret(); clockTick();
  }
  function updateSecret() {
    if (!panel || panelName !== 'secret') return;
    if (V && V.secretPick != null && !secretSealed) { secretSealed = true; secretSel = V.secretPick; }
    panel.querySelectorAll('.h-so').forEach(function (n) { var i = +n.dataset.i; n.classList.toggle('sel', secretSel === i); n.classList.toggle('dim', secretSealed && secretSel !== i); });
    var b = panel.querySelector('[data-act=seal]'); if (b) b.disabled = secretSel == null || secretSealed;
    if (secretSealed && !panel.querySelector('.h-seal')) {
      var o = ((V && V.secretOptions) || [])[secretSel]; var d = D.createElement('div'); d.className = 'h-seal';
      d.innerHTML = '<div><div class="s">🔏</div><div class="a">DECISIÓN SELLADA</div><div class="b">' + (o ? esc(o.title || o.text) : '') + '<br>Nadie la verá hasta la resolución.</div></div>';
      panel.appendChild(d);
    }
  }
  function selectSecret(i, confirm) {
    if (P.phase !== 'secret' || secretSealed) return;
    var o = V && V.secretOptions && V.secretOptions[i]; if (!o) return;
    if (secretSel === i && confirm !== false) return sealSecret();
    secretSel = i; snd('select'); updateSecret();
  }
  function sealSecret() {
    if (secretSel == null || secretSealed) return;
    secretSealed = true; localSecret = secretSel; snd('confirm'); updateSecret(); paintTop();
    if (cb.secret) cb.secret(secretSel);
  }

  /* ---------- resolución ---------- */
  function showResolve(res) {
    if (!mounted) mount(); res = res || {}; lastResult = res; resolving = true;
    if (res.explain) return showExplain(res);
    return new Promise(function (done) {
      var skip = false, finished = false;
      var p = openPanel('resolve', '<div class="h-ph1"><span style="font-size:26px">🎲</span><div><h2>RESULTADO</h2></div></div><div class="h-pb"><div class="h-narr"></div><div class="h-rolls"></div><div class="h-reveals"></div><div class="h-deltas"></div><div class="h-ptsbig"></div></div><div class="h-foot"><span class="l"></span><button class="h-btn teal pulse" data-act="cont">CONTINUAR ▶ <kbd>Espacio</kbd></button></div>');
      p.addEventListener('click', function (e) { if (!e.target.closest('[data-act=cont],.h-mn')) skip = true; });
      p._end = function () { if (p._done) return; p._done = true; skip = true; resolving = false; closePanel(); done(); };
      var S = function (ms) { return skip ? Promise.resolve() : sleep(ms); };
      var sc = function () { p.scrollTo({ top: p.scrollHeight, behavior: skip ? 'auto' : 'smooth' }); };
      var narr = p.querySelector('.h-narr'), rolls = p.querySelector('.h-rolls'), revs = p.querySelector('.h-reveals'), dl = p.querySelector('.h-deltas'), pts = p.querySelector('.h-ptsbig');
      (async function () {
        try {
          snd('resolve'); shake(.3);
          if (res.narrative) { var stop = typeInto(narr, res.narrative, 14); await S(Math.min(2600, res.narrative.length * 14)); stop(); }
          // dados
          var rl = res.rolls || [];
          for (var i = 0; i < rl.length; i++) {
            var r = rl[i], pct = r.roll != null && r.roll <= 1 ? Math.round(r.roll * 100) : Math.round(r.roll);
            var need = r.need != null ? (r.need <= 1 ? Math.round(r.need * 100) : Math.round(r.need)) : null;
            var ok = r.ok != null ? r.ok : (need != null ? pct <= need : true);
            var row = D.createElement('div'); row.className = 'h-roll';
            row.innerHTML = '<div class="h-die rolling">??</div><div class="lb">' + esc(r.label || 'Tirada') + (r.detail || need != null ? '<small>' + esc(r.detail || ('Necesitaba ' + need + ' o menos')) + '</small>' : '') + '</div><div class="res"></div>';
            rolls.appendChild(row); sc(); var die = row.firstChild, t0 = performance.now();
            snd('dice');
            while (!skip && performance.now() - t0 < 750) { die.textContent = 1 + Math.floor(Math.random() * 99); await sleep(55); }
            die.classList.remove('rolling'); die.classList.add(ok ? 'ok' : 'ko'); die.textContent = pct;
            row.querySelector('.res').className = 'res ' + (ok ? 'ok' : 'ko'); row.querySelector('.res').textContent = ok ? '✔ ÉXITO' : '✘ FALLO';
            snd(ok ? 'resolve_good' : 'resolve_bad'); if (!ok) shake(.5); else sparks(.5, .4, 6);
            await S(500);
          }
          // revelaciones
          var rv = res.reveals || [];
          for (var j = 0; j < rv.length; j++) {
            var v = rv[j], isLie = v.kind === 'lie' || v.type === 'lie', good = v.kind === 'good' || v.type === 'good';
            var who = v.role ? roleInfo(v.role).name : '';
            var d = D.createElement('div'); d.className = 'h-rev ' + (isLie ? 'lie' : good ? 'good' : '');
            d.innerHTML = (v.role ? portrait(v.role, isLie ? 'enfadado' : 'neutral', 52) : '<span style="font-size:36px">🕵️</span>') +
              '<div><div class="tt">' + (isLie ? '🤥 MENTIRA DESCUBIERTA' : good ? '✨ ACTO REVELADO' : '🔓 SECRETO REVELADO') + (who ? ' · ' + esc(who.toUpperCase()) : '') + '</div><div class="tx">' + esc(v.text || v.title || '') + '</div></div>';
            revs.appendChild(d); snd(isLie ? 'lie' : 'secret_reveal'); flash(isLie ? '#ff5d5d' : '#b58cff'); shake(isLie ? .8 : .4);
            sc();
            await S(1200);
          }
          // efectos
          var de = res.delta || {};
          STATS.forEach(function (s) {
            var v2 = de[s.k]; if (v2 == null) return;
            var n = D.createElement('div'); var up = v2 > 0, good = s.bad ? !up : up;
            n.className = 'h-dl ' + (v2 === 0 ? 'z' : (s.bad ? (up ? 'bad-up' : 'bad-dn') : (up ? 'up' : 'dn')));
            n.innerHTML = '<div class="l">' + icon(s.k, 14) + s.label + '</div><b>0</b>'; dl.appendChild(n);
            countTo(n.querySelector('b'), v2, 700, true);
            if (v2 !== 0) floatText((up ? '+' : '') + v2 + ' ' + s.label, good ? 'good' : 'bad', s.k);
          });
          if (Object.keys(de).length) { var anyBad = STATS.some(function (s) { var v3 = de[s.k]; return v3 && (s.bad ? v3 > 0 : v3 < 0); }); snd(anyBad ? 'resolve_bad' : 'resolve_good'); if (anyBad) { shake(.7); flash('#ff5d5d'); } else { flash('#5fe39a'); sparks(.5, .5, 10); } }
          sc(); await S(900); sc();
          var sd = res.scoreDelta, total = typeof sd === 'number' ? sd : sd && (sd.total != null ? sd.total : Object.keys(sd).reduce(function (a, k) { return a + (+sd[k] || 0); }, 0));
          if (total) { pts.textContent = (total > 0 ? '+' : '') + total + ' PUNTOS'; snd('tick'); floatText((total > 0 ? '+' : '') + total + ' PTS', 'score', 'score'); }
          (res.achievements || []).forEach(function (a, k) { setTimeout(function () { achievement(a); }, 600 + k * 900); });
          await S(400);
        } catch (e) { if (W.console) console.warn('[Hud.resolve]', e); }
        finished = true; resolving = false;
      })();
      // cualquier fase siguiente cierra el panel y resuelve
      p._abort = function () { resolving = false; if (!p._done) { p._done = true; done(); } };
    });
  }
  /* resultado claro: titular + causa->efecto + CONTINUAR siempre visible (sin esperas ni auto-cierre) */
  function showExplain(res) {
    var ex = res.explain || {}, tms = [], bad = 0;
    var lines = (ex.lines || []).map(function (l) {
      var st = STATS.filter(function (z) { return z.k === l.icon || z.k === l.stat; })[0], d = l.delta, num = typeof d === 'number' || (typeof d === 'string' && /^[+-]?\d+$/.test(d)), n = num ? +d : 0;
      var good = num ? (st && st.bad ? n < 0 : n > 0) : null; if (num && n !== 0 && !good) bad++;
      return { l: l, n: n, num: num, cls: !num ? 'z' : n === 0 ? 'z' : good ? 'g' : 'b' };
    });
    var rows = lines.map(function (r, i) {
      return '<div class="h-xr" style="animation-delay:' + (.25 + i * .4) + 's">' + poiIcon(r.l.icon || 'info', 36) + '<div class="tx">' + esc(r.l.text || '') + '</div>' + (r.l.delta != null ? '<div class="dl ' + r.cls + '">' + (r.num ? '0' : esc(r.l.delta)) + '</div>' : '') + '</div>';
    }).join('');
    var why = (ex.why || []).map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('');
    return new Promise(function (done) {
      var p = openPanel('resolve', '<div class="h-pb"><div class="h-xh">' + esc(ex.headline || res.narrative || 'Resultado') + '</div><div class="h-xl">' + rows + '</div>' + (why ? '<ul class="h-xw"><h4>POR QUÉ</h4>' + why + '</ul>' : '') + '</div>' +
        '<div class="h-foot"><span class="l"></span><button class="h-btn teal pulse" data-act="cont">CONTINUAR ▶ <kbd>Espacio</kbd></button></div>');
      function stop() { tms.forEach(clearTimeout); resolving = false; }
      p._end = function () { if (p._done) return; p._done = true; stop(); closePanel(); done(); };
      p._abort = function () { if (!p._done) { p._done = true; stop(); done(); } };
      snd('resolve'); if (bad) { shake(.4); flash('#ff5d5d'); } else { flash('#5fe39a'); sparks(.5, .4, 8); }
      lines.forEach(function (r, i) { if (!r.num) return; var nd = p.querySelectorAll('.h-xr')[i].querySelector('.dl'); tms.push(setTimeout(function () { countTo(nd, r.n, 600, true); snd('tick'); }, 300 + i * 400)); });
      (res.achievements || []).forEach(function (a, k) { tms.push(setTimeout(function () { achievement(a); }, 600 + lines.length * 400 + k * 900)); });
      var b = p.querySelector('[data-act=cont]'); if (b) b.focus({ preventScroll: true });
    });
  }
  function countTo(node, to, ms, signed) {
    var t0 = performance.now();
    (function s() { var t = clamp((performance.now() - t0) / ms, 0, 1), v = Math.round(to * ease(t)); node.textContent = (signed && v > 0 ? '+' : '') + v; if (t < 1) requestAnimationFrame(s); })();
  }

  /* ---------- resumen ---------- */
  function showSummary(data) {
    if (!mounted) mount(); data = data || {};
    return new Promise(function (done) {
      var cats = data.cats || data.categories;
      if (!cats) {
        var sc = data.score || {}, nm = { equipo: ['Trabajo en equipo', 'estrella'], info: ['Información compartida', 'chat'], honestidad: ['Honestidad', 'ojo'], riesgo: ['Riesgo bien calculado', 'alerta'] };
        cats = Object.keys(nm).map(function (k) { return { key: k, label: nm[k][0], icon: nm[k][1], pts: sc[k] || 0, note: (data.notes2 || {})[k] || '' }; });
      }
      var last = data.last || (P && P.round >= 5);
      var p = openPanel('summary', '<div class="h-ph1"><span style="font-size:26px">📊</span><div><h2>' + esc(data.title || ('RESUMEN DEL TRAMO ' + (data.round || (P && P.round) || ''))) + '</h2><div class="sub">' + esc(data.subtitle || 'Así ha ido el tramo') + '</div></div></div>' +
        '<div class="h-pb"><div class="h-rows"></div><div class="h-total" style="visibility:hidden"><span class="nm">PUNTOS DEL TRAMO</span><span class="v">0</span></div><ul class="h-notes"></ul></div>' +
        '<div class="h-foot"><span class="l"></span><button class="h-btn" data-act="cont" disabled>' + (last ? 'VER FINAL ▶' : 'SIGUIENTE TRAMO ▶') + '</button></div>');
      var rows = p.querySelector('.h-rows'), tot = 0, skip = false;
      p.addEventListener('click', function (e) { if (!e.target.closest('.h-mn')) skip = true; });
      var S = function (ms) { return skip ? Promise.resolve() : sleep(ms); };
      (async function () {
        for (var i = 0; i < cats.length; i++) {
          var c = cats[i], v = Math.round(+c.pts || 0); tot += v;
          var r = D.createElement('div'); r.className = 'h-row';
          r.innerHTML = icon(c.icon || 'estrella', 30) + '<div><div class="nm">' + esc(c.label) + '</div>' + (c.note ? '<div class="nt">' + esc(c.note) + '</div>' : '') + '</div><div class="v ' + (v === 0 ? 'z' : v < 0 ? 'n' : '') + '">0</div>';
          rows.appendChild(r); snd('tick'); countTo(r.querySelector('.v'), v, 500, true);
          if (v) floatText((v > 0 ? '+' : '') + v, v > 0 ? 'score' : 'bad');
          await S(520);
        }
        var T = p.querySelector('.h-total'); T.style.visibility = 'visible'; T.style.animation = 'h-pop .5s';
        var total = data.roundTotal != null ? data.roundTotal : tot; countTo(T.querySelector('.v'), total, 700, true); snd('confirm');
        if (data.total != null) T.querySelector('.nm').innerHTML = 'PUNTOS DEL TRAMO <span style="color:var(--h-dim)">· TOTAL ' + data.total + '</span>';
        sparks(.5, .55, 12);
        var ul = p.querySelector('.h-notes'); (data.notes || []).forEach(function (n) { var li = D.createElement('li'); li.textContent = n; ul.appendChild(li); });
        (data.achievements || []).forEach(function (a, k) { setTimeout(function () { achievement(a); }, 400 + k * 900); });
        var b = p.querySelector('[data-act=cont]'); b.disabled = false; b.classList.add('pulse');
      })();
      p._abort = function () { if (!p._done) { p._done = true; done(); } };
      p._end = function () { if (p._done) return; p._done = true; closePanel(); done(); };
    });
  }

  /* ---------- chat ---------- */
  function syncChat() { if (P && P.chat) P.chat.forEach(function (m) { chatAdd(m, true); }); }
  function msgKey(m) { if (m.kind === 'share') { var c0 = m.card && m.card.text || m.text || ''; return 'share|' + m.from + '|' + c0.slice(0, 60); } return m.id != null ? 'i' + m.id : m.from + '|' + m.t + '|' + (m.text || '').slice(0, 30); }
  function nearBottom() { return el.log.scrollHeight - el.log.scrollTop - el.log.clientHeight < 60; }
  function fmtTime(t) { if (!t || t < 1e11) return ''; var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function chatAdd(m, fromState) {
    if (!mounted) mount(); if (!m) return;
    var key = msgKey(m); if (seenChat[key]) return; seenChat[key] = 1;
    addRoundSep();
    var kind = m.kind || 'chat', from = m.from || 'sys', b = roleInfo(from), me = from === R && (kind === 'chat' || kind === 'share');
    var stick = pinned || me, first = chatCount === 0, grouped = kind === 'chat' || kind === 'share', tx = String(m.text || '');
    var mood = m.mood || (kind === 'radio' ? 'alert' : 'talk');
    if (grouped) {
      var card = m.card || (kind === 'share' && tx ? { title: 'Información compartida', text: tx } : null), same = card && (tx === card.text || tx.indexOf(card.text) >= 0 || card.text.indexOf(tx) >= 0);
      var pre = card ? (tx && !same ? '<div class="pre">' + esc(tx) + '</div>' : '') : esc(tx || '📎 compartió una tarjeta');
      var inner = card ? pre + '<div class="h-card"><div class="t">' + icon('ojo', 12) + ' ' + (me ? 'COMPARTISTE' : 'COMPARTE') + ' · ' + esc(card.title || 'Intel') + (card.reliability != null ? relTag(card.reliability) : '') + '</div><div class="x">' + esc(card.text || '') + '</div></div>' : pre;
      inner += m.altered && me ? '<div style="font-size:11px;color:#ffb0a8;margin-top:5px">✏️ Alterada: solo tú lo sabes</div>' : '';
      var last = el.log.lastElementChild, g;
      if (last && last.classList.contains('h-g') && last.dataset.from === from && last.dataset.mood === mood && (!m.t || !lastChatT || m.t - lastChatT < 90000)) g = last;
      else {
        g = D.createElement('div'); g.className = 'h-g' + (me ? ' me' : ''); g.dataset.from = from; g.dataset.mood = mood;
        g.innerHTML = '<div class="av">' + portrait(from, mood, 40) + '</div><div class="bd"><div class="hd" style="color:' + b.color + '">' + esc(b.name) + '<i>' + esc(b.title) + (me ? ' · TÚ' : P && P.players && P.players[from] && P.players[from].ai ? ' · IA' : '') + '</i><time>' + fmtTime(m.t) + '</time></div><div class="bs"></div></div>';
        el.log.appendChild(g);
      }
      var bb = D.createElement('div'); bb.className = 'h-b' + (card ? ' card' : ''); bb.innerHTML = inner; g.querySelector('.bs').appendChild(bb);
      if (kind === 'share' && me) { bb.classList.add('hl'); setTimeout(function () { try { bb.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { } }, 60); }
    } else {
      var d = D.createElement('div'); d.className = 'h-m ' + kind;
      d.innerHTML = kind === 'radio' ? '<div class="av">' + portrait(from === "sys" ? "lia" : from, mood, 40) + '</div><div class="bd"><div class="hd">📻 ' + esc(b.name.toUpperCase()) + ' · RADIO</div><div class="tx">' + esc(tx) + '</div></div>' : '<div class="tx">' + (kind === 'event' ? '⚠ ' : '') + esc(tx) + '</div>';
      el.log.appendChild(d);
    }
    chatCount++; lastChatT = m.t || 0;
    while (el.log.children.length > 80) el.log.removeChild(el.log.firstChild);
    if (typingTimers[from]) { clearTimeout(typingTimers[from]); typing(from, false); }
    if (stick) { el.log.scrollTop = el.log.scrollHeight; requestAnimationFrame(function () { el.log.scrollTop = el.log.scrollHeight; }); } else { unread++; badge(); showNew(true); }
    if (!first || !fromState) {
      if (!me) snd(kind === 'radio' ? 'radio_on' : kind === 'share' ? 'share' : kind === 'chat' ? 'chat_recv' : kind === 'event' ? 'toast' : 'click');
    }
    if (isMobile() && !el.chat.classList.contains('open') && !me) { var pv = el.chat.querySelector('.h-ch'); pv.dataset.pv = (b.name + ': ' + tx).slice(0, 60); }
  }
  function addRoundSep() {
    if (!P || !P.round || P.round === lastChatRound || !el.log) return;
    lastChatRound = P.round; var d = D.createElement('div'); d.className = 'h-sep'; d.textContent = 'TRAMO ' + P.round; el.log.appendChild(d);
  }
  function typing(role, on) {
    if (!mounted) mount(); typingTimers[role] && clearTimeout(typingTimers[role]); delete typingTimers[role];
    if (on) { typingTimers[role] = setTimeout(function () { typing(role, false); }, 5000); typingState[role] = 1; } else delete typingState[role];
    root.querySelectorAll('.h-tc[data-r="' + role + '"]').forEach(function (n) { n.classList.toggle('typ', !!on && role !== R); });
    var names = Object.keys(typingState).filter(function (r) { return r !== R; }).map(function (r) { return roleInfo(r).name; });
    el.typ.innerHTML = names.length ? esc(names.join(' y ')) + (names.length > 1 ? ' están escribiendo' : ' está escribiendo') + '<span class="d"><i></i><i></i><i></i></span>' : '';
  }
  var typingState = {};
  function noteTyping() { var n = Date.now(); if (cb.typing && n - myTypingAt > 2500) { myTypingAt = n; cb.typing(true); } }
  function sendChat(text) {
    text = String(text || '').trim(); if (!text) return;
    snd('chat_send'); if (cb.chat) cb.chat(text.slice(0, 220));
    if (el.input && !isMobile()) { /* mantiene foco para seguir escribiendo */ }
  }
  function badge() {
    var n = V && V.intel ? V.intel.length - intelSeen : 0; n = Math.max(0, n);
    el.dbadge.style.display = n > 0 && !el.dos.classList.contains('open') ? '' : 'none'; el.dbadge.textContent = n;
    el.cbadge.style.display = unread > 0 && (!el.chat.classList.contains('open') && isMobile() || el.chat.classList.contains('min')) ? '' : 'none'; el.cbadge.textContent = unread;
  }
  function showNew(on) { el.newmsg.style.display = on ? 'block' : 'none'; if (on) el.newmsg.textContent = 'Mensajes nuevos ↓' + (unread > 1 ? ' (' + unread + ')' : ''); }
  function setChat(open) {
    if (isMobile()) { el.chat.classList.toggle('open', open); el.chat.classList.remove('min'); root.classList.remove('chatmin'); root.classList.toggle('chatopen', open); }
    else { el.chat.classList.toggle('min', !open); el.chat.classList.remove('open'); root.classList.toggle('chatmin', !open); if (cb.insets) setTimeout(function () { cb.insets(getInsets()); }, 0); }
    if (open) { unread = 0; requestAnimationFrame(function () { el.log.scrollTop = el.log.scrollHeight; }); }
    badge();
  }
  function chatOpen() { return isMobile() ? el.chat.classList.contains('open') : !el.chat.classList.contains('min'); }
  function renderChips() {
    var list, opt = P && P.plan && P.plan.options || [];
    if (quickO && quickO.length) list = quickO.slice(0, 2).map(function (x) { return { label: x.label || x.text, text: x.text || x.label }; });
    else list = (customChips || (P && CHIPS[P.phase]) || CHIPS._).map(function (t) { t = t.replace('{A}', 'A').replace('ruta B', opt.length ? 'ruta ' + 'ABC'[Math.min(1, opt.length - 1)] : 'ruta B'); return { label: t, text: t }; });
    list = list.slice(0, 2); var key = JSON.stringify(list); if (el.chips.dataset.k === key) return; el.chips.dataset.k = key;
    el.chips.innerHTML = list.map(function (c) { return '<button type="button" data-act="chip" data-text="' + esc(c.text) + '" title="' + esc(c.text) + '">' + esc(c.label) + '</button>'; }).join('');
  }

  /* ---------- cuaderno ---------- */
  function openDossier(tab) {
    var hb = root.querySelector('.h-hb'); if (hb) hb.remove();
    if (tab) dossierTab = tab; renderDossier(); el.dos.classList.add('open'); intelSeen = V && V.intel ? V.intel.length : 0; badge(); snd('open');
  }
  function closeDossier() { if (!el.dos.classList.contains('open')) return; el.dos.classList.remove('open'); editing = null; snd('close'); }
  function renderDossier() {
    var intel = (V && V.intel) || [], tabs = [['intel', 'INTEL'], ['secreto', 'SECRETO'], ['objetivo', 'OBJETIVO'], ['hallazgos', 'HALLAZGOS']];
    var body = '';
    if (dossierTab === 'intel') {
      if (!intel.length) body = '<div class="h-empty">Todavía no tienes tarjetas.<br>Presiona <kbd>E</kbd> junto a un icono brillante para conseguir información.</div>';
      else {
        var rounds = {}; intel.forEach(function (c) { (rounds[c.round] = rounds[c.round] || []).push(c); });
        Object.keys(rounds).sort(function (a, b) { return b - a; }).forEach(function (r) {
          body += '<div class="h-gh">TRAMO ' + r + '</div>';
          rounds[r].forEach(function (c) {
            var ri = relInfo(c.reliability), isEd = editing === c.id;
            body += '<div class="h-ic1 ' + ri.cls + '">' + (c.shared ? '<span class="sh">COMPARTIDA</span>' : '') + '<div class="t">' + poiIcon(c.icon || 'info', 18) + esc(c.title) + '</div><div class="x">' + esc(c.text) + '</div>' + ((c.uses || c.use) ? '<div class="us"><b>Sirve para:</b> ' + esc(c.uses || c.use) + '</div>' : '') + relHtml(c.reliability) +
              '<div class="h-acts" style="margin-top:8px"><button class="h-btn" data-act="share" data-id="' + esc(c.id) + '">📢 Contárselo al equipo</button><button class="h-btn alt sm" data-act="edit" data-id="' + esc(c.id) + '">✏️ Cambiar y contar</button></div>' +
              (isEd ? '<div class="h-edit"><textarea data-ta="' + esc(c.id) + '" maxlength="300">' + esc(c.text) + '</textarea><div class="w">⚠ Cambiar el texto es MENTIR. Si el equipo lo descubre, perderás confianza (pero puedes ganar si cuela).</div><div class="h-acts"><button class="h-btn red" data-act="sendlie" data-id="' + esc(c.id) + '">🤥 Enviar versión alterada</button><button class="h-btn alt" data-act="canceledit">Cancelar</button></div></div>' : '') + '</div>';
          });
        });
      }
    } else if (dossierTab === 'secreto') {
      var sc = V && V.secret;
      body = sc ? '<div class="h-sc1"><div class="lock">🔒</div><div class="t">' + esc(sc.text) + '</div><div class="n">' + (sc.revealed ? '⚠ Este secreto ya se reveló.' : 'Nadie más lo sabe. Decide si lo confiesas o lo ocultas: puede salir a la luz en la resolución.') + '</div></div>' : '<div class="h-empty">Sin secreto.</div>';
    } else if (dossierTab === 'objetivo') {
      var mh = '';
      if (misOv && misOv.steps && misOv.steps.length) mh = '<div class="h-gh">' + esc(misOv.title || 'MISIÓN') + '</div><ul class="h-mlist">' + misOv.steps.map(function (x) { return '<li class="' + (x.done ? 'done' : '') + '"><i>' + (x.done ? '✔' : '') + '</i><span>' + esc(x.text) + '</span></li>'; }).join('') + '</ul>';
      var g = V && V.goal; body = mh + (g ? '<div class="h-sc1" style="border-color:var(--h-amber)"><div class="lock">🎯</div><div class="t">' + esc(g.text) + '</div><div class="n">' + (g.points ? 'Recompensa: +' + g.points + ' puntos al final. ' : '') + 'Se evalúa al terminar la partida. Es privado: tu equipo no sabe cuál es.</div></div>' : '<div class="h-empty">Sin objetivo.</div>');
    } else {
      var n = (P && P.hallazgos) || 0, cells = ''; for (var i = 0; i < 5; i++) cells += '<div class="' + (i < n ? 'on' : '') + '">' + (i < n ? '📜' : '?') + '</div>';
      body = '<div class="h-gh">LORE DE LA CUEVA · ' + n + '/5</div><div class="h-hl">' + cells + '</div><div class="h-empty">Los POI secretos (brillo tenue) guardan hallazgos coleccionables.</div>';
    }
    el.dos.innerHTML = '<div class="h-dh">' + icon('ojo', 18) + ' CUADERNO <button class="x" data-act="closedos" aria-label="Cerrar">✕</button></div><div class="h-tabs">' + tabs.map(function (t) { return '<button data-act="tab" data-t="' + t[0] + '" class="' + (t[0] === dossierTab ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div><div class="h-db">' + body + '</div>';
    el.db = el.dos.querySelector('.h-db');
  }
  function doShare(id, asIs, text) {
    var c = ((V && V.intel) || []).filter(function (x) { return x.id === id; })[0]; if (!c) return;
    c.shared = true; editing = null; snd(asIs ? 'share' : 'lie');
    setChat(true); pinned = true;
    if (cb.share) cb.share(id, asIs ? { asIs: true } : { asIs: false, text: text });
    renderDossier(); toastNote(asIs ? 'Compartida: mira el chat' : 'Compartiste una versión alterada: mira el chat');
    // si main no ha devuelto el mensaje de chat, lo mostramos nosotros (misma clave -> sin duplicar)
    var sh = asIs ? c.text : text; setTimeout(function () { chatAdd({ from: R, kind: 'share', text: sh, mood: 'happy', t: Date.now(), card: { title: c.title, text: sh, reliability: c.reliability } }); if (el.log) { el.log.scrollTop = el.log.scrollHeight; } }, 450);
  }

  /* ---------- diálogo estilo Castlevania: SotN ---------- */
  function dlgScale(who, mood) { // escala ENTERA según el alto/ancho de pantalla
    var f = faceInfo(who, mood), fw = f ? f.fw : 64, vh = W.innerHeight || 700, bw = (el.dlg && el.dlg.clientWidth) || (W.innerWidth || 1000);
    var px = Math.min(.21 * vh, .22 * bw, 224);
    return Math.max(2, Math.min(4, Math.floor(px / fw)));
  }
  function dialogue(lines, o) {
    if (!mounted) mount();
    o = o || {};
    lines = (Array.isArray(lines) ? lines : [lines]).map(function (l) {
      if (typeof l === 'string') l = { text: l };
      l = l || {}; return { who: l.who || l.role || l.from || 'director', mood: l.mood || 'neutral', text: String(l.text == null ? '' : l.text), name: l.name, title: l.title, radio: l.radio };
    }).filter(function (l) { return l.text; });
    if (!lines.length) return Promise.resolve();
    var go = function () { return runDialogue(lines, o); };
    var pr = (dlgQ || Promise.resolve()).then(go, go); dlgQ = pr; return pr;
  }
  function runDialogue(lines, o) {
    return new Promise(function (done) {
      var box = el.dlg, i = -1, typed = 0, text = '', parts = [], ctl = null, tm = 0, talkTm = 0, line = null, fin = false, autoTm = 0, speed = o.speed || 26, ended = false, swap = false, b0 = null;
      if (D.activeElement && D.activeElement.blur && typingNow()) D.activeElement.blur();
      box.innerHTML = '<div class="dl-wrap"><div class="dl-box"><div class="dl-fr"><div class="dl-por"></div></div><div class="dl-tx"><div class="dl-name"><b></b><i></i></div><div class="dl-text"><span class="a"></span><span class="b"></span></div></div><div class="dl-foot"><span class="pg"></span><span class="arr">▼</span><button type="button" class="sk" data-act="dlgskip">Saltar <kbd>Esc</kbd></button></div></div></div>';
      var dbox = box.querySelector('.dl-box'), fr = box.querySelector('.dl-fr'), por = box.querySelector('.dl-por'), nm = box.querySelector('.dl-name'), ta = box.querySelector('.a'), tb = box.querySelector('.b'), wrap = box.querySelector('.dl-wrap'), pg = box.querySelector('.pg'), arr = box.querySelector('.arr');
      box.classList.add('on'); root.classList.add('dlg'); dlgOpen = true; snd('dialogue_open'); if (cb.dialogue) cb.dialogue(true);
      function next() {
        clearTimeout(tm); clearTimeout(talkTm); clearTimeout(autoTm); i++;
        if (i >= lines.length) return end();
        line = lines[i]; parts = hlParts(line.text); text = parts.map(function (p) { return p.t; }).join(''); typed = 0; fin = false; swap = false;
        var b = b0 = roleInfo(line.who); wrap.style.setProperty('--c', b.color); wrap.style.setProperty('--cg', b.color + '55'); box.classList.toggle('radio', line.who === 'lia' || !!line.radio);
        nm.querySelector('b').textContent = line.name || b.name; nm.querySelector('i').textContent = line.title != null ? line.title : b.title; nm.style.display = (line.name || b.name) ? '' : 'none';
        var sc = dlgScale(line.who, line.mood); fr.style.setProperty('--bob', sc + 'px');
        if (!ctl) ctl = faceCtl(por, line.who, line.mood, sc); else { ctl.who(line.who, sc); ctl.set(line.mood); }
        ctl.closed(false); ctl.talk(true); fr.classList.remove('pop'); void fr.offsetWidth; fr.classList.add('pop'); fr.classList.add('talk');
        ta.innerHTML = ''; tb.textContent = text; arr.style.visibility = 'hidden'; pg.textContent = lines.length > 1 ? (i + 1) + '/' + lines.length : '';
        if (o.onLine) { try { o.onLine(line, i); } catch (e) { } }
        step();
      }
      function step() {
        if (fin || ended) return;
        typed++; ta.innerHTML = hlHtml(parts, typed, b0.color); tb.textContent = text.slice(typed);
        var ch = text.charAt(typed - 1); ctl.closed(/[\s.,;:!?…—]/.test(ch));
        if (ch && ch !== ' ' && typed % 2 === 0) { try { if (W.Sound && W.Sound.talk) W.Sound.talk(line.who, line.mood); else if (typed % 4 === 0) snd('typing'); } catch (e) { } }
        if (typed >= text.length) return finish();
        tm = setTimeout(step, speed * (/[.!?…]/.test(ch) ? 9 : /[,;:]/.test(ch) ? 4 : 1));
      }
      function finish() {
        fin = true; clearTimeout(tm); clearTimeout(talkTm); typed = text.length; ta.innerHTML = hlHtml(parts, text.length, b0.color); tb.textContent = '';
        ctl.talk(false); fr.classList.remove('talk'); arr.style.visibility = 'visible';
        if (o.auto) autoTm = setTimeout(next, o.auto);
      }
      function advance() { if (ended) return; if (!fin) finish(); else { snd('click'); next(); } }
      function end() {
        if (ended) return; ended = true; clearTimeout(tm); clearTimeout(talkTm); clearTimeout(autoTm); if (ctl) ctl.stop();
        W.removeEventListener('keydown', onK, true); box.removeEventListener('click', onC);
        box.classList.add('out'); root.classList.remove('dlg'); dlgOpen = false;
        setTimeout(function () { if (!dlgOpen) { box.classList.remove('on', 'out', 'radio'); box.innerHTML = ''; } if (cb.dialogue && !dlgOpen) cb.dialogue(false); }, 220);
        dlgCur = null; done();
      }
      function onK(e) {
        if (e.ctrlKey || e.metaKey || e.altKey || /^F\d+$/.test(e.key) || e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt') return;
        e.stopImmediatePropagation(); e.preventDefault();
        if (e.key === 'Escape') { if (o.skippable !== false) end(); else advance(); }
        else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'e' || e.key === 'E') { if (!e.repeat) advance(); }
      }
      function onC(e) { if (e.target.closest('[data-act=dlgskip]')) { if (o.skippable !== false) end(); return; } advance(); }
      W.addEventListener('keydown', onK, true); box.addEventListener('click', onC);
      dlgCur = { end: end }; next();
    });
  }
  var dlgCur = null;

  /* ---------- ayuda y pausa ---------- */
  function helpFor(ph, auto) {
    el.help.innerHTML = '';
    var h = HELP[ph]; if (!h) return;
    if (auto) { return; /* v6: sin ayudas automáticas (H la abre) */ if (!opts.help || helpSeen[ph] || ph === 'resolve' || ph === 'summary' || ph === 'briefing' || ph === 'plan' || ph === 'secret') return; helpSeen[ph] = 1; lsSet('rcv3_hudhelp', helpSeen); }
    var d = D.createElement('div'); d.className = 'h-hb';
    d.innerHTML = '<h4>💡 ' + esc(h[0]) + '</h4><p>' + esc(h[1]) + '</p><div class="r"><span>H para volver a verla</span><button class="h-btn" data-act="closehelp">ENTENDIDO</button></div>';
    var run = function () {
      if (!(cur.phase === ph || !auto)) return; snd('toast');
      if (panel && (panelName === 'plan' || panelName === 'secret')) { d.classList.add('inl'); var pb = panel.querySelector('.h-pb'); pb.insertBefore(d, pb.firstChild); }
      else { el.help.innerHTML = ''; el.help.appendChild(d); }
    };
    if (auto) setTimeout(run, ph === 'plan' || ph === 'secret' ? 1200 : 700); else run();
  }
  function toggleHelp() { var x = root.querySelector('.h-hb'); if (x) x.remove(); else helpFor(cur.phase, false); }
  function openPause() {
    paused = true; var snd_ = W.Sound && W.Sound.state ? W.Sound.state() : null, mute = snd_ && snd_.muted;
    el.pause.innerHTML = '<div class="h-pm"><h2>PAUSA</h2><button class="h-btn teal" data-act="resume">▶ Reanudar</button><button class="h-btn alt" data-act="helpfull">? Cómo se juega</button><button class="h-btn alt" data-act="mute">' + (mute ? '🔇 Sonido: NO' : '🔊 Sonido: SÍ') + '</button><button class="h-btn alt" data-act="settings">⚙ Ajustes</button><button class="h-btn alt" data-act="textsize">Aa Texto grande: ' + (opts.big ? 'SÍ' : 'NO') + '</button><button class="h-btn red" data-act="exit">⏏ Salir al menú</button><small>En partidas con más humanos el juego NO se detiene.</small></div>';
    el.pause.classList.add('open'); snd('open'); if (cb.pause) cb.pause(true);
  }
  function closePause() { paused = false; el.pause.classList.remove('open'); if (cb.pause) cb.pause(false); }

  /* ---------- teclado y clics ---------- */
  function typingNow() { return D.activeElement && /^(INPUT|TEXTAREA)$/.test(D.activeElement.tagName); }
  function onKey(e) {
    if (!mounted || hidden || e.ctrlKey || e.altKey || e.metaKey) return;
    var k = e.key;
    if (big && (k === 'Escape' || k.toLowerCase() === 'm') && !typingNow()) { e.preventDefault(); closeBig(); return; }
    if (typingNow()) { if (k === 'Escape') D.activeElement.blur(); return; }
    if (k === 'Escape') {
      if (paused) return closePause();
      if (el.dos.classList.contains('open')) return closeDossier();
      var hb = root.querySelector('.h-hb'); if (hb) { hb.remove(); return; }
      return openPause();
    }
    if (paused) return;
    var lk = k.toLowerCase();
    if (lk === 't' || k === 'Enter') { e.preventDefault(); setChat(true); el.input.focus(); }
    else if (lk === 'j') { el.dos.classList.contains('open') ? closeDossier() : openDossier(); }
    else if (lk === 'h') toggleHelp();
    else if (lk === 'o') toggleGoals();
    else if (lk === 'm') { if (!miniUser) { miniUser = true; drawMini(); } else toggleBig(); }
    else if (lk === 'r' && P && P.phase === 'explore') doReady();
    else if (k === '1' || k === '2' || k === '3') {
      var i = +k - 1;
      if (P && P.phase === 'plan' && P.plan && P.plan.options[i]) doVote(P.plan.options[i].id);
      else if (P && P.phase === 'secret') selectSecret(i);
    }
  }
  function onKeyCap(e) { // Espacio/Enter = CONTINUAR en la pantalla de resultado
    if (!mounted || hidden || dlgOpen || paused || e.ctrlKey || e.altKey || e.metaKey || typingNow()) return;
    if (panelName === 'resolve' && panel && !panel.classList.contains('min') && (e.key === ' ' || e.key === 'Enter') && panel._end) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) panel._end(); }
  }
  function toggleGoals() { if (isMobile()) el.left.classList.toggle('mob'); else el.left.classList.toggle('gone'); if (cb.insets) cb.insets(getInsets()); }
  function doReady() {
    if (!P || P.phase !== 'explore' || localReady || (readyOv && readyOv.disabled)) return; localReady = true; snd('confirm'); el.bot.dataset.k = ''; paintBottom();
    if (cb.ready) cb.ready();
  }
  function onClick(e) {
    var t = e.target.closest('[data-act]'); if (!t) return; var a = t.dataset.act;
    if (a !== 'vote' && a !== 'secret' && a !== 'ready') snd('click');
    switch (a) {
      case 'ready': doReady(); break;
      case 'dossier': el.dos.classList.contains('open') ? closeDossier() : openDossier(); break;
      case 'closedos': closeDossier(); break;
      case 'tab': dossierTab = t.dataset.t; editing = null; renderDossier(); break;
      case 'share': doShare(t.dataset.id, true); break;
      case 'edit': editing = t.dataset.id; renderDossier(); var ta = el.dos.querySelector('textarea'); if (ta) { ta.addEventListener('keydown', function (ev) { ev.stopPropagation(); }); ta.addEventListener('keyup', function (ev) { ev.stopPropagation(); }); ta.focus(); } break;
      case 'canceledit': editing = null; renderDossier(); break;
      case 'sendlie': var ta2 = el.dos.querySelector('textarea[data-ta="' + t.dataset.id + '"]'), orig = ((V && V.intel) || []).filter(function (x) { return x.id === t.dataset.id; })[0], txt = ta2 ? ta2.value.trim() : '';
        if (!txt) break; doShare(t.dataset.id, !orig || txt === orig.text, txt); break;
      case 'vote': doVote(t.dataset.id); break;
      case 'secret': selectSecret(+t.dataset.i, false); break;
      case 'seal': sealSecret(); break;
      case 'closeevt': closePanel(); break;
      case 'skiprs': break;
      case 'cont': if (panel && panel._end) panel._end(); break;
      case 'chip': sendChat(t.dataset.text || t.textContent); break;
      case 'ability': if (abilO && abilO.ready === false) { snd('error'); } if (cb.ability) cb.ability(); break;
      case 'ask': var hx = helpO && helpO[+t.dataset.i]; if (hx && hx.enabled !== false && cb.ask) cb.ask(hx.role, hx.gateId); break;
      case 'chatmin': setChat(!chatOpen()); break;
      case 'chatfocus': setChat(true); el.input.focus(); break;
      case 'help': toggleHelp(); break;
      case 'mini': miniUser = !el.mini.classList.contains('on'); if (!miniUser) closeBig(); drawMini(); break;
      case 'bigmap': toggleBig(); break;
      case 'closehelp': t.closest('.h-hb').remove(); break;
      case 'pause': openPause(); break;
      case 'resume': closePause(); break;
      case 'helpfull': closePause(); helpFor(cur.phase || 'explore', false); break;
      case 'mute': try { if (W.Sound && W.Sound.toggle) W.Sound.toggle(); } catch (x) { } openPause(); break;
      case 'settings': closePause(); if (cb.settings) cb.settings(); break;
      case 'textsize': setOptions({ big: !opts.big }); openPause(); break;
      case 'exit': if (cb.exit) cb.exit(); closePause(); break;
      case 'goals': toggleGoals(); break;
      case 'leftmin': el.left.classList.toggle('exp'); if (cb.insets) cb.insets(getInsets()); break;
      case 'minpanel': if (panel) { var mn = panel.classList.toggle('min'); root.classList.toggle('pmin', mn); t.textContent = mn ? '▢' : '▁'; t.title = mn ? 'Volver a abrir' : 'Minimizar para ver el mundo'; } break;
      case 'newmsg': break;
    }
  }

  /* ---------- efectos ---------- */
  function floatText(txt, type, where) { // apilado bajo el banner (junto a toasts); con {x,y} flota libre
    if (!mounted) mount(); var n = D.createElement('div');
    if (where && typeof where === 'object') {
      n.className = 'h-fl ' + (type || 'info') + (/PTS|PUNTOS|¡/.test(txt) ? ' big' : ''); n.textContent = txt; n.style.left = where.x + 'px'; n.style.top = where.y + 'px'; el.fx.appendChild(n); setTimeout(function () { n.remove(); }, 1700); return;
    }
    n.className = 'h-fl2 ' + (type || 'info'); n.textContent = txt; el.tst.appendChild(n);
    var all = el.tst.querySelectorAll('.h-fl2'); if (all.length > 3) all[0].remove();
    setTimeout(function () { n.remove(); }, 2000);
  }
  /* popup de un compañero que habla (retrato + 1-2 líneas), abajo-centro; máx 2 a la vez */
  function say(o, opt) {
    if (!mounted) mount(); if (!o || !o.text || o.who === 'sys' || dlgOpen || paused) return;
    var ms = (opt && opt.ms) || 4500, who = o.who || o.from || 'director', mood = o.mood || 'talk', b = roleInfo(who), txt = String(o.text);
    var n = D.createElement('div'); n.className = 'h-sp'; n.style.setProperty('--c', b.color);
    var sc = Math.max(1, Math.round(72 / ((faceInfo(who, mood) || { fw: 64 }).fw))), shown = txt.length > 150 ? txt.slice(0, 147) + '…' : txt, parts = hlParts(shown);
    n.innerHTML = '<div class="fc talk" style="--bob:' + sc + 'px"></div><div class="sb"><div class="nm">' + esc(b.name) + '</div><div class="sx">' + hlHtml(parts, 999, b.color) + '</div></div>';
    while (el.sy.children.length >= 2) el.sy.firstChild.remove();
    el.sy.style.setProperty('--sy-top', (el.gd.getBoundingClientRect().bottom - el.mid.getBoundingClientRect().top + 40) + 'px');
    el.sy.appendChild(n);
    var fc = n.querySelector('.fc'), ctl = faceCtl(fc, who, mood, sc); ctl.talk(true);
    setTimeout(function () { ctl.talk(false); fc.classList.remove('talk'); }, Math.min(ms - 400, 700 + shown.length * 35));
    setTimeout(function () { ctl.stop(); n.classList.add('out'); setTimeout(function () { n.remove(); }, 320); }, ms);
  }
  function paintCoach() {
    if (!el.coach) return; var c = coachO, pv = coachPrev; coachPrev = c;
    if (!c) { el.coach.className = 'h-coach'; el.coach.innerHTML = ''; if (pv && pv.total && pv.step >= pv.total) celebrate(); if (mounted && P) paintNow(); return; }
    var step = c.step | 0, total = c.total | 0;
    el.coach.innerHTML = (total ? '<div class="st">PASO ' + step + ' DE ' + total + '</div>' : '') + '<div class="tx">' + esc(c.text) + '</div><div class="ar">▼</div>';
    el.coach.className = 'h-coach on';
    if (pv && pv.step !== c.step) { celebrate(); void el.coach.offsetWidth; el.coach.classList.add('done'); }
    if (mounted && P) paintNow();
  }
  function celebrate() { flash('#ffd27a'); sparks(.5, .15, 16); snd('confirm'); }
  function setCoach(o) { coachO = o && o.text ? o : null; if (mounted) paintCoach(); }
  function sparks(fx, fy, n) {
    if (opts.noflash) return; var rr = root.getBoundingClientRect(), cols = ['#f2a93b', '#ffd27a', '#3fd0c0', '#b58cff', '#5fe39a'];
    n = n || 18;
    for (var i = 0; i < n; i++) {
      var p = D.createElement('i'); p.className = 'h-par'; p.style.left = rr.width * fx + 'px'; p.style.top = rr.height * fy + 'px'; p.style.background = cols[i % cols.length];
      var a = Math.random() * 6.28, d = 60 + Math.random() * 160; p.style.setProperty('--dx', Math.cos(a) * d + 'px'); p.style.setProperty('--dy', Math.sin(a) * d - 40 + 'px'); p.style.setProperty('--r', Math.random() * 720 + 'deg');
      el.fx.appendChild(p); setTimeout(function (q) { q.remove(); }.bind(null, p), 1200);
    }
  }
  function flash(c) { if (opts.noflash || (W.matchMedia && W.matchMedia('(prefers-reduced-motion:reduce)').matches)) return; var f = D.createElement('div'); f.className = 'h-flash'; f.style.setProperty('--fc', c || '#fff'); el.fx.appendChild(f); setTimeout(function () { f.remove(); }, 300); }
  function shake() { /* v7: sin sacudidas (API mantenida, no hace nada) */ }
  function floatCard(o) {
    if (!mounted || !o || !(o.title || o.text)) return;
    var old = root.querySelector('.h-fcard'); if (old) old.remove();
    var c = D.createElement('div'); c.className = 'h-fcard';
    c.innerHTML = '<div class="k">Encontraste</div><div class="t">' + esc(o.title || o.text) + '</div>' + (o.title && o.text ? '<div class="x">' + esc(o.text) + '</div>' : '') + (o.uses ? '<div class="u"><b>Sirve para:</b> ' + esc(o.uses) + '</div>' : '');
    root.appendChild(c); snd('toast'); setTimeout(function () { c.classList.add('out'); setTimeout(function () { c.remove(); }, 400); }, 5000);
  }
  function note(txt) { var n = D.createElement('div'); n.className = 'h-note'; n.textContent = '⚠ ' + txt; el.tst.appendChild(n); setTimeout(function () { n.style.opacity = 0; n.style.transition = 'opacity .4s'; setTimeout(function () { n.remove(); }, 450); }, 3200); }
  function toastNote(txt) { var n = D.createElement('div'); n.className = 'h-note'; n.style.color = 'var(--h-teal)'; n.style.borderColor = 'var(--h-teal)'; n.textContent = txt; el.tst.appendChild(n); setTimeout(function () { n.remove(); }, 2400); }
  function achievement(a) {
    if (!mounted) mount();
    if (typeof a === 'string') {
      var f = null; try { f = (W.Story && W.Story.achievementsList ? W.Story.achievementsList() : []).filter(function (x) { return x.id === a; })[0]; } catch (e) { }
      a = f || { id: a, title: a.replace(/[_-]/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }), text: '' };
    }
    toastQ.push(a); if (!toastBusy) nextToast();
  }
  function nextToast() {
    var a = toastQ.shift(); if (!a) { toastBusy = false; return; } toastBusy = true;
    var d = D.createElement('div'); d.className = 'h-ach';
    d.innerHTML = trophy(a.id, 48) + '<div><div class="tp">¡LOGRO DESBLOQUEADO!</div><div class="nm">' + esc(a.title || a.name || a.id) + '</div><div class="ds">' + esc(a.text || a.desc || a.description || '') + '</div></div>';
    el.tst.appendChild(d); snd('achievement'); sparks(.5, .15, 22);
    setTimeout(function () { d.classList.add('out'); setTimeout(function () { d.remove(); nextToast(); }, 400); }, 3600);
  }

  /* ---------- API ---------- */
  var Hud = {
    mount: mount, update: update, showPhase: showPhase, showResolve: showResolve, showSummary: showSummary,
    achievement: achievement, floatText: floatText, setOptions: setOptions,
    setNow: setNow, setMission: setMission, setReady: setReady, setAir: setAir, setAbilities: setAbilities, setHelp: setHelp, setQuick: setQuick, dialogue: dialogue, isDialogue: function () { return dlgOpen; }, skipDialogue: function () { if (dlgCur) dlgCur.end(); }, getInsets: getInsets, setMinimapSource: function (f) { miniFn = typeof f === 'function' ? f : null; drawMini(); }, onInsets: function (f) { cb.insets = f; },
    hide: function () { hidden = true; if (root) { root.classList.add('off'); } },
    show: function () { hidden = false; if (root) root.classList.remove('off'); },
    chat: { add: function (m) { chatAdd(m); }, typing: typing, clear: function () { if (el.log) el.log.innerHTML = ''; seenChat = {}; chatCount = 0; lastChatRound = 0; lastChatFrom = null; unread = 0; badge(); }, focus: function () { setChat(true); el.input.focus(); } },
    setChips: function (l) { customChips = l; if (el.chips) { el.chips.dataset.k = ''; renderChips(); } },
    openDossier: openDossier, closeDossier: closeDossier, help: function () { helpFor(cur.phase, false); }, shake: shake, flash: flash, floatCard: floatCard, sparks: sparks, note: note,
    openPause: function () { if (!paused) openPause(); }, closePause: closePause,
    closePanel: function () { closePanel(true); }, isTyping: typingNow, resetHelp: function () { helpSeen = {}; lsSet('rcv3_hudhelp', helpSeen); },
    reset: function () { this.chat.clear(); closePanel(true); closeDossier(); cur = { phase: null, round: 0 }; dispInit = false; waterLevelHit = 0; lastIntelLen = 0; intelSeen = 0; localReady = false; localVote = null; secretSel = null; secretSealed = false; P = null; V = null; nowOv = misOv = readyOv = null; nowKey = ''; airV = null; abilO = helpO = quickO = null; if (this.skipDialogue) this.skipDialogue(); setAir(null); paintAbil(); coachO = null; miniUser = true; sayQ = []; if (el.sy) el.sy.innerHTML = ''; paintCoach(); },
    say: say, setCoach: setCoach,
    onChat: function (f) { cb.chat = f; }, onShare: function (f) { cb.share = f; }, onVote: function (f) { cb.vote = f; }, onSecret: function (f) { cb.secret = f; },
    onReady: function (f) { cb.ready = f; }, onExit: function (f) { cb.exit = f; }, onSettings: function (f) { cb.settings = f; }, onPause: function (f) { cb.pause = f; },
    onAbility: function (f) { cb.ability = f; }, onAsk: function (f) { cb.ask = f; }, onDialogue: function (f) { cb.dialogue = f; },
    onFx: function (f) { cb.fx = f; }, onChatFocus: function (f) { cb.focus = f; }, onTyping: function (f) { cb.typing = f; },
    _dbg: function () { return { P: P, V: V, R: R, panel: panelName }; }
  };
  W.Hud = Hud;
})();
