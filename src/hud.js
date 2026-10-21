/* hud.js -> window.Hud : UI DENTRO de la partida (overlay DOM sobre el canvas).
   Sin dependencias. Usa window.Sound / window.ASSETS / window.Story si existen (todo con guardas). Ver NOTES-hud.md */
(function () {
  'use strict';
  var W = window, D = document;

  /* ---------- datos base ---------- */
  var ROLES = {
    guia: { name: 'Nico', title: 'Guía', color: '#f2a93b', emoji: '🧭' },
    medica: { name: 'Ona', title: 'Médica', color: '#3fd0c0', emoji: '⚕️' },
    ing: { name: 'Iván', title: 'Ingeniero', color: '#b58cff', emoji: '🔧' },
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
    explore: { n: 'EXPLORA', i: 'Busca información: pulsa E junto a los iconos brillantes', c: '#3fd0c0', e: '🔍' },
    plan: { n: 'PLAN', i: 'Debatid en el chat y votad el plan (1 · 2 · 3)', c: '#b58cff', e: '🗳️' },
    secret: { n: 'ACCIÓN SECRETA', i: 'Elige en privado. Se revela al final del tramo', c: '#f2a93b', e: '🔒' },
    resolve: { n: 'RESOLUCIÓN', i: 'Mira qué ha pasado', c: '#ff6b6b', e: '🎲' },
    summary: { n: 'RESUMEN', i: 'Tus notas del tramo', c: '#5fe39a', e: '📊' },
    final: { n: 'FINAL', i: '', c: '#f2a93b', e: '🏁' }
  };
  var HELP = {
    briefing: ['Nuevo tramo', 'Lee el evento: marca el ambiente del tramo. Lía te habla por radio. En unos segundos empieza la exploración.'],
    explore: ['Explora y recoge información', 'Camina con WASD o flechas y pulsa E junto a un icono brillante: gasta 1 acción (los puntos de arriba a la izquierda) y te da una tarjeta de Intel PRIVADA. Tus compañeros no la ven si no se la cuentas. Habla en el chat (T) y comparte lo que sepas desde el cuaderno (J). Cuando termines, pulsa LISTO.'],
    plan: ['Elegid el plan del equipo', 'Cada opción tiene información parcial. Lo que tú sabes en privado está resaltado. Convence a los demás en el chat y vota con 1, 2 o 3. Gana la mayoría.'],
    secret: ['Tu acción secreta', 'Elige una de las 3: una ayuda al equipo, otra a tu objetivo secreto y otra es arriesgada. Nadie ve tu elección hasta la resolución. Pulsa la misma tecla otra vez, o SELLAR, para confirmar.'],
    resolve: ['Resolución', 'Se tiran los dados del riesgo según el plan, la información compartida y las acciones secretas. Los secretos y las mentiras salen a la luz.'],
    summary: ['Resumen del tramo', 'Puntos por trabajo en equipo, información compartida, honestidad y riesgo bien calculado.']
  };
  var CHIPS = {
    explore: ['Os cuento lo que he visto', '¿Qué habéis encontrado?', 'No me fío de eso', 'Necesito material'],
    plan: ['Propongo la ruta {A}', 'Necesito material', 'No me fío de eso', 'Votemos'],
    _: ['Os cuento lo que he visto', 'Propongo la ruta B', 'No me fío de eso', 'Necesito material', 'Votemos']
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
  function portrait(role, expr, size) {
    size = size || 40;
    var b = ROLES[role] || ROLES.sys, src = img('portrait_' + role), m = meta('portrait_' + role);
    var col = b.color;
    if (src && m) {
      var fw = m.fw || m.cell || 48, fh = m.fh || fw, cols = m.cols || Math.max(1, Math.floor(m.w / fw));
      var ei = Math.max(0, EXPR.indexOf(expr || 'neutral')), s = size / fw;
      var x = (ei % cols) * fw, y = Math.floor(ei / cols) * fh;
      return '<i class="h-por" style="width:' + size + 'px;height:' + size + 'px;border-color:' + col + ';background:url(' + src + ') ' + (-x * s) + 'px ' + (-y * s) + 'px/' + (m.w * s) + 'px ' + (m.h * s) + 'px"></i>';
    }
    return '<i class="h-por fb" style="width:' + size + 'px;height:' + size + 'px;border-color:' + col + ';background:' + col + '22;font-size:' + Math.round(size * .55) + 'px;line-height:' + (size - 4) + 'px">' + b.emoji + '</i>';
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
  var cb = { chat: null, share: null, vote: null, secret: null, ready: null, exit: null, settings: null, pause: null, fx: null, focus: null, typing: null };
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
    /* móvil */
    '@media (max-width:820px),(max-height:520px){',
    ':root{--h-chatw:100%}',
    '.h-top{left:4px;right:4px;top:4px;gap:6px 8px;padding:6px 8px;grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:"r p t" "s s s"}',
    '.h-rnd{grid-area:r;min-width:0}.h-ph{grid-area:p}.h-tm{grid-area:t;min-width:64px}.h-sts{grid-area:s;grid-template-columns:repeat(4,1fr);gap:7px}.h-sc{display:none}',
    '.h-pips{display:none}.h-rlab{font-size:9px}.h-phn{font-size:9px}.h-phi{font-size:11px;white-space:normal;max-height:3em;line-height:1.25;margin-top:3px}.h-evt{display:none}.h-time{font-size:18px}.h-tbar{margin-top:4px}',
    '.h-st .l{font-size:6px}.h-st .l b{font-size:9px}.h-bar{height:9px}',
    '.h-stage{left:4px;right:4px;top:92px;bottom:96px;padding:0}.h-pn{width:100%}',
    '.h-opts,.h-sopts{grid-template-columns:1fr}.h-opt,.h-so{min-height:0}.h-deltas{grid-template-columns:repeat(2,1fr)}',
    '.h-art{height:clamp(90px,20vh,160px)}.h-ph1{padding:9px 11px}.h-pb{padding:10px 11px}.h-foot{padding:0 11px 11px}.h-evt1{font-size:13px}.h-evtx{font-size:14px}',
    '.h-chat{left:4px;right:4px;top:auto;bottom:4px;width:auto;height:44px;transition:height .3s cubic-bezier(.2,1,.3,1)}.h-chat.min{transform:none}.h-chat.open{height:min(52vh,420px)}',
    '.h-chat:not(.open) .h-log,.h-chat:not(.open) .h-in,.h-chat:not(.open) .h-chips,.h-chat:not(.open) .h-typ{visibility:hidden}.h-chat.min .h-log,.h-chat.min .h-in{visibility:visible}',
    '.h-chat .h-ch .cv:before{content:"▲"}.h-chat.open .h-ch .cv:before{content:"▼"}',
    '.h-dock{left:4px;right:4px;bottom:54px;justify-content:center}.h-dock .h-btn kbd{display:none}.h-dock .h-btn{padding:7px 9px}',
    '.h-bot{left:4px;right:4px;bottom:92px}.h-hint{font-size:12px}.hud.chatopen .h-bot,.hud.chatopen .h-dock{display:none}',
    '.h-left{left:4px;right:4px;width:auto;bottom:96px;max-height:50vh;transform:translateY(130%);opacity:0;pointer-events:none}.h-left.mob{transform:none;opacity:1;pointer-events:auto}.h-lh{display:none}.h-lb{max-height:46vh}.hud.modal .h-left{transform:translateY(130%)}',
    '.h-dos{left:4px;right:4px;width:auto;top:92px;bottom:96px}.h-help{left:4px;right:4px;bottom:132px}.h-hb{max-width:none}.h-tst{top:92px}',
    '.hud.chatopen .h-stage{bottom:calc(min(52vh,420px) + 8px)}',
    '.h-ph1 h2{font-size:10px}.h-ph1 .tm{font-size:12px}.h-pn.fr{border-width:8px;border-image-width:8px}.h-mine{margin-bottom:8px}.h-opt .k,.h-so .k{display:none}',
    '}'
  ].join('\n');

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
      return '<div class="h-st" data-k="' + s.k + '" style="--c:' + s.color + '"><div class="l">' + icon(s.k, 14) + s.label + '<b>0</b></div><div class="h-bar"><i class="ghost"></i><i class="fill"></i></div></div>';
    }).join('');
    root.innerHTML =
      '<div class="h-top"><div class="h-rnd"><div class="h-rlab">TRAMO <b class="rn">1/5</b></div><div class="h-pips">' + pips + '</div></div>' +
      '<div class="h-ph"><div class="h-phn"></div><div class="h-phi"></div><div class="h-evt"></div></div>' +
      '<div class="h-tm"><div class="h-time">0:00</div><div class="h-tbar"><i></i></div></div>' +
      '<div class="h-sts">' + stats + '</div>' +
      '<div class="h-sc"><div class="l">PUNTOS</div><b>0</b></div></div>' +
      '<div class="h-left"><div class="h-lh" data-act="leftmin">' + icon('mapa', 14) + ' OBJETIVOS<span class="x">▾</span></div><div class="h-lb"></div></div>' +
      '<div class="h-stage"></div>' +
      '<div class="h-bot"></div><div class="h-help"></div>' +
      '<div class="h-dock">' +
        '<button class="h-btn alt" data-act="dossier" title="Cuaderno de Intel (J)">' + icon('ojo', 14) + ' CUADERNO <kbd>J</kbd><span class="h-badge" style="display:none"></span></button>' +
        '<button class="h-btn alt mobonly" data-act="goals" title="Objetivos">' + icon('mapa', 14) + ' OBJETIVOS</button>' +
        '<button class="h-btn alt" data-act="help" title="Ayuda (H)">? AYUDA <kbd>H</kbd></button>' +
        '<button class="h-btn alt" data-act="pause" title="Pausa (Esc)">II <kbd>ESC</kbd></button></div>' +
      '<div class="h-chat"><div class="h-ch" data-act="chatmin">' + icon('chat', 14) + ' CHAT DEL EQUIPO<span class="tg"><kbd>T</kbd><span class="cv"></span><span class="h-badge" style="display:none;position:static"></span></span></div>' +
        '<div class="h-log" role="log" aria-live="polite"></div><div class="h-typ"></div><div class="h-chips"></div>' +
        '<form class="h-in" autocomplete="off"><input type="text" maxlength="220" placeholder="Escribe al equipo… (Enter envía)" aria-label="Mensaje al equipo"><button class="h-btn teal" type="submit">ENVIAR</button></form></div>' +
      '<div class="h-dos"></div><div class="h-tst"></div><div class="h-fx"></div><div class="h-pause"></div>';
    host.appendChild(root);
    var fr = img('ui_frame'); if (fr) root.style.setProperty('--h-frame', 'url(' + fr + ')');
    var q = function (s) { return root.querySelector(s); };
    el = { top: q('.h-top'), rn: q('.rn'), pips: root.querySelectorAll('.h-pip'), phn: q('.h-phn'), phi: q('.h-phi'), evt: q('.h-evt'), time: q('.h-time'), tbar: q('.h-tbar'), score: q('.h-sc b'),
      left: q('.h-left'), lb: q('.h-lb'), stage: q('.h-stage'), bot: q('.h-bot'), help: q('.h-help'), dock: q('.h-dock'), chat: q('.h-chat'), log: q('.h-log'), typ: q('.h-typ'), chips: q('.h-chips'),
      form: q('.h-in'), input: q('.h-in input'), dos: q('.h-dos'), tst: q('.h-tst'), fx: q('.h-fx'), pause: q('.h-pause'), dbadge: q('.h-dock .h-badge'), cbadge: q('.h-ch .h-badge') };
    el.sts = {}; STATS.forEach(function (s) { el.sts[s.k] = q('.h-st[data-k=' + s.k + ']'); });
    var mb = root.querySelector('.mobonly'); mb.style.display = 'none';
    root.addEventListener('click', onClick);
    el.form.addEventListener('submit', function (e) { e.preventDefault(); sendChat(el.input.value); el.input.value = ''; });
    el.input.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Escape') el.input.blur(); noteTyping(); });
    el.input.addEventListener('keyup', function (e) { e.stopPropagation(); });
    el.input.addEventListener('keypress', function (e) { e.stopPropagation(); });
    el.input.addEventListener('focus', function () { setChat(true); if (cb.focus) cb.focus(true); });
    el.input.addEventListener('blur', function () { if (cb.focus) cb.focus(false); });
    el.log.addEventListener('scroll', function () { pinned = nearBottom(); if (pinned) { unread = 0; badge(); showNew(false); } });
    W.addEventListener('keydown', onKey);
    W.addEventListener('resize', layout); layout();
    applyOpts(); mounted = true;
    if (!rafOn) { rafOn = true; requestAnimationFrame(loop); }
    setInterval(clockTick, 200);
    renderChips(); setChat(!isMobile());
    return root;
  }
  function isMobile() { return W.matchMedia && W.matchMedia('(max-width:820px),(max-height:520px)').matches; }
  function layout() {
    if (!el.chat) return;
    var mob = isMobile(); el.dock.querySelector('.mobonly').style.display = mob ? '' : 'none';
    if (!mob) { el.chat.classList.remove('open'); root.classList.remove('chatopen'); el.left.classList.remove('mob'); }
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
    el.score.textContent = Math.round(disp.score);
  }
  function clockTick() {
    if (!mounted || !P) return;
    var left = Math.max(0, clock.left - (performance.now() - clock.at) / 1000), sh = Math.ceil(left - 0.001);
    if (sh === clock.lastShown) return; clock.lastShown = sh;
    var timed = ['explore', 'plan', 'secret', 'briefing'].indexOf(P.phase) >= 0;
    el.time.textContent = timed || P.phase === 'resolve' ? mmss(sh) : '--';
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
    paintBottom();
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
    if (ph === 'explore') instr = (ap === 0 ? 'Sin acciones: habla con el equipo y pulsa LISTO' : 'Pulsa E junto a un icono brillante · te quedan ' + (ap == null ? '?' : ap) + ' acciones');
    if (ph === 'plan' && localVote) instr = 'Has votado ' + optLetter(localVote) + '. Puedes cambiar hasta que acabe el tiempo';
    if (ph === 'secret' && secretSealed) instr = 'Decisión sellada. Espera a la resolución';
    el.phi.textContent = instr; el.phi.title = instr;
    el.evt.textContent = P.event && P.event.title && ph !== 'briefing' ? '📍 ' + P.event.title : '';
    el.top.style.borderColor = ph === 'explore' && P.s && P.s.agua >= 80 ? 'var(--h-red)' : '';
  }
  function optLetter(id) {
    var o = P && P.plan && P.plan.options || [], i = o.findIndex(function (x) { return x.id === id; });
    return i >= 0 ? 'ruta ' + 'ABC'[i] : String(id);
  }
  function paintLeft() {
    if (!R) return;
    var b = roleInfo(R), me = (P.players && P.players[R]) || {}, ap = V && V.ap != null ? V.ap : (me.ap != null ? me.ap : 0);
    var apH = ''; for (var i = 0; i < 3; i++) apH += '<i class="' + (i < ap ? '' : 'off') + '"></i>';
    var goal = V && V.goal, gh = '';
    if (goal) {
      var cur2 = goal.stat && P.s ? P.s[goal.stat] : null, ok = false, pct = 0;
      if (cur2 != null && goal.min != null) { ok = goal.stat === 'agua' ? cur2 <= goal.min : cur2 >= goal.min; pct = clamp(goal.stat === 'agua' ? (100 - cur2) / Math.max(1, 100 - goal.min) * 100 : cur2 / Math.max(1, goal.min) * 100, 0, 100); }
      gh = '<div class="h-sec me">' + icon('candado', 12) + ' TU OBJETIVO SECRETO <span style="margin-left:auto;color:var(--h-amber2)">' + (goal.points ? '+' + goal.points + ' pts' : '') + '</span></div><div class="h-txt">' + esc(goal.text) + '</div>' +
        (cur2 != null && goal.min != null ? '<div class="h-goalbar ' + (ok ? 'ok' : '') + '"><i style="width:' + pct + '%"></i></div><div style="font-size:11px;color:var(--h-dim);margin-top:3px">' + (GOAL_STATS[goal.stat] || goal.stat) + ' ' + Math.round(cur2) + ' / ' + (goal.stat === 'agua' ? '≤' : '≥') + goal.min + (ok ? ' ✔ ahora mismo' : '') + '</div>' : '');
    }
    var pois = (P.pois || []).map(function (p) {
      var used = p.used, mine = p.by === R, ic = p.kind === 'secreto' && !used ? icon('alerta', 14) : poiIcon(p.icon || p.kind, 14);
      return '<span class="h-poi ' + (used ? 'used ' : '') + (mine ? 'mine' : '') + '" title="' + (used ? 'Visitado por ' + esc(p.by ? roleInfo(p.by).name : '?') : 'Pendiente') + '">' + ic + esc(p.kind === 'secreto' && !used ? '???' : p.label) + '</span>';
    }).join('');
    var used = (P.pois || []).filter(function (p) { return p.used; }).length;
    var team = PLAYER_ROLES.map(function (r) {
      var p = (P.players && P.players[r]) || {}, i = roleInfo(r);
      return '<div class="h-tm1 ' + (r === R ? 'me ' : '') + (p.connected === false ? 'off' : '') + '">' + (p.ready ? '<span class="ok">✓</span>' : '') + portrait(r, 'neutral', 30) + '<b>' + esc(i.name) + '</b><em>' + (r === R ? 'TÚ' : p.ai ? 'IA' : 'HUMANO') + '</em></div>';
    }).join('');
    el.lb.innerHTML =
      '<div class="h-me">' + portrait(R, 'neutral', 46) + '<div><div class="n" style="color:' + b.color + '">' + esc(b.name) + '</div><div class="r">' + esc(b.title) + '</div></div><div class="h-ap">ACCIONES<div title="Acciones restantes">' + apH + '</div></div></div>' +
      '<div><div class="h-sec">' + icon('estrella', 12) + ' MISIÓN DEL EQUIPO</div><div class="h-txt">' + esc(P.mission || 'Sacad a Lía con vida antes de que el agua llegue a 100.') + '</div></div>' +
      (gh ? '<div>' + gh + '</div>' : '') +
      ((P.pois && P.pois.length) ? '<div><div class="h-sec">' + icon('mapa', 12) + ' PUNTOS DE INTERÉS ' + used + '/' + P.pois.length + '</div><div class="h-pois">' + pois + '</div></div>' : '') +
      '<div><div class="h-sec">EQUIPO</div><div class="h-team">' + team + '</div></div>';
  }
  function paintBottom() {
    var ph = P.phase, me = P.players && P.players[R], ready = (me && me.ready) || localReady;
    if (!(me && me.ready) && !localReady) ready = false;
    if (ph !== 'explore') { el.bot.innerHTML = ''; return; }
    var left = PLAYER_ROLES.filter(function (r) { return r !== R && P.players && P.players[r] && !P.players[r].ready; }).map(function (r) { return roleInfo(r).name; });
    var ap = V && V.ap != null ? V.ap : me && me.ap;
    var key = 'e' + ready + ap + left.join(',');
    if (el.bot.dataset.k === key) return; el.bot.dataset.k = key;
    el.bot.innerHTML = '<div class="h-hint"><kbd>E</kbd> examinar <span style="opacity:.4">|</span> <kbd>J</kbd> cuaderno <span style="opacity:.4">|</span> <kbd>T</kbd> chat' + (ap === 0 ? ' <span style="opacity:.4">|</span> <b>sin acciones</b>' : '') + '</div>' +
      (ready ? '<div class="h-hint"><b>✔ LISTO</b> ' + (left.length ? 'esperando a ' + esc(left.join(', ')) : 'todos listos') + '</div>' : '<button class="h-btn teal ' + (ap === 0 ? 'pulse' : '') + '" data-act="ready">✔ LISTO <kbd>R</kbd></button>');
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
    if (ph === 'briefing') openEvent(data);
    else if (ph === 'plan') openPlan(data);
    else if (ph === 'secret') openSecret(data);
    if (PHASES[ph] && ph !== 'final') { snd(ph === 'briefing' ? 'round_start' : 'open'); }
    if (ph === 'final') { hideAllPanels(); }
    helpFor(ph, true);
    paintTop(); paintBottom(); renderChips();
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

  function openPanel(name, html, cls) {
    closePanel(true);
    var d = D.createElement('div'); d.className = 'h-pn ' + (img('ui_frame') && name !== 'event' ? 'fr ' : '') + (cls || ''); d.dataset.p = name; d.innerHTML = html;
    el.stage.appendChild(d); panel = d; panelName = name; root.classList.add('modal');
    return d;
  }
  function closePanel(now) {
    if (!panel) { root.classList.remove('modal'); return; }
    var p = panel; panel = null; panelName = null; root.classList.remove('modal'); if (p._abort) p._abort();
    if (now) p.remove(); else { p.classList.add('out'); setTimeout(function () { p.remove(); }, 260); }
  }

  /* evento / briefing */
  function openEvent(data) {
    var ev = Object.assign({}, P.event || {}, data && data.event || {});
    var src = ev.art && img(ev.art);
    var key = String(ev.id || ev.art || '').replace(/^event_/, ''), em = EVENT_EMOJI[key] || '⚠️';
    var art = '<div class="h-art"><span class="tag">⚠ EVENTO · TRAMO ' + (P.round || 1) + '</span>' + (src ? '<img alt="" src="' + src + '">' : '<span class="em">' + em + '</span>') + '</div>';
    var rad = ev.radio ? '<div class="h-radio">' + portrait('lia', 'preocupado', 44) + '<div><div class="w">📻 LÍA · RADIO</div><div class="q" data-type="' + esc('«' + ev.radio + '»') + '"></div></div></div>' : '';
    var exp = (data && data.expect) || ev.expect || 'Explora, reúne información y compártela. Después votaréis el plan.';
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
  function openPlan(data) {
    var plan = P.plan || { options: [] }, opts_ = plan.options || [];
    var intel = (V && V.intel || []).filter(function (c) { return c.round === P.round; });
    var mine = intel.length ? '<div class="h-mine"><div class="t">🔒 LO QUE SABES TÚ ESTE TRAMO (privado)</div><div class="h-mc">' + intel.map(function (c) {
      return '<button data-act="dossier" title="' + esc(c.text) + '">' + esc(c.title) + ' · ' + relInfo(c.reliability).v + '%</button>'; }).join('') + '</div></div>'
      : '<div class="h-mine"><div class="t">🔒 NO HAS RECOGIDO INTEL ESTE TRAMO</div><div style="font-size:13px;color:var(--h-dim)">Fíate de lo que cuenten los demás… o pregúntales en el chat.</div></div>';
    var cards = opts_.map(function (o, i) {
      var hint = (V && V.planHints && V.planHints[o.id]) || '';
      var rel = intel.filter(function (c) { return c.about && [].concat(c.about).indexOf(o.id) >= 0; }).map(function (c) { return c.title + ' (' + relInfo(c.reliability).v + '%)'; }).join(' · ');
      return '<button class="h-opt" data-act="vote" data-id="' + esc(o.id) + '"><span class="k"><kbd>' + (i + 1) + '</kbd></span><h3>' + 'ABC'[i] + ' · ' + esc(o.title) + '</h3><p>' + esc(o.text) + '</p>' +
        (o.known ? '<div class="kn"><b>SE SABE:</b> ' + esc(o.known) + '</div>' : '') +
        (hint || rel ? '<div class="pv"><b>TÚ SABES:</b> ' + esc(hint || rel) + '</div>' : '') +
        '<div class="h-votes"><span class="c"></span></div></button>';
    }).join('');
    openPanel('plan', '<div class="h-ph1"><span style="font-size:26px">🗳️</span><div><h2>ELEGID EL PLAN DEL EQUIPO</h2><div class="sub">Hablad en el chat y votad. Gana la mayoría' + (P.plan && P.plan.tiebreakNote ? '' : '; en empate decide el guía') + '.</div></div><div class="tm">0:00</div></div>' +
      '<div class="h-pb">' + mine + '<div class="h-opts">' + cards + '</div></div><div class="h-foot"><span class="l h-pstat"></span><button class="h-btn alt" data-act="chatfocus">💬 DISCUTIR EN EL CHAT <kbd>T</kbd></button></div>');
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
    var st = panel.querySelector('.h-pstat'); if (st) st.innerHTML = falta.length ? 'Faltan por votar: <b style="color:var(--h-amber2)">' + esc(falta.join(', ')) + '</b>' : '<b style="color:var(--h-green)">Todos han votado</b>';
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
    openPanel('secret', '<div class="h-ph1"><span style="font-size:26px">🔒</span><div><h2>ACCIÓN SECRETA</h2><div class="sub">Solo tú ves esto. Tu decisión se revela al final del tramo.</div></div><div class="tm">0:00</div></div>' +
      '<div class="h-pb"><div class="h-sopts">' + cards + '</div></div><div class="h-foot"><span class="l h-sstat">Pulsa 1-3 para elegir; la misma tecla otra vez (o SELLAR) confirma.</span><button class="h-btn red" data-act="seal" disabled>🔒 SELLAR DECISIÓN</button></div>');
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
    return new Promise(function (done) {
      var skip = false, finished = false;
      var p = openPanel('resolve', '<div class="h-ph1"><span style="font-size:26px">🎲</span><div><h2>RESOLUCIÓN DEL TRAMO ' + (P && P.round || '') + '</h2><div class="sub">Haz clic para acelerar</div></div></div><div class="h-pb"><div class="h-narr"></div><div class="h-rolls"></div><div class="h-reveals"></div><div class="h-deltas"></div><div class="h-ptsbig"></div></div><div class="h-foot"><span class="l"></span><button class="h-btn" data-act="skiprs">SALTAR ▶▶</button></div>');
      p.addEventListener('click', function (e) { if (!e.target.closest('[data-act=cont]')) skip = true; });
      var S = function (ms) { return skip ? Promise.resolve() : sleep(ms); };
      var sc = function () { p.scrollTo({ top: p.scrollHeight, behavior: skip ? 'auto' : 'smooth' }); };
      var narr = p.querySelector('.h-narr'), rolls = p.querySelector('.h-rolls'), revs = p.querySelector('.h-reveals'), dl = p.querySelector('.h-deltas'), pts = p.querySelector('.h-ptsbig');
      var btn = p.querySelector('.h-foot .h-btn');
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
        btn.className = 'h-btn teal pulse'; btn.dataset.act = 'cont'; btn.textContent = 'CONTINUAR ▶';
        p.querySelector('.h-ph1 .sub').textContent = 'Resultado del tramo';
        var auto = setTimeout(function () { end(); }, 7000);
        function end() { clearTimeout(auto); if (p._done) return; p._done = true; resolving = false; closePanel(); done(); }
        p._end = end;
      })();
      // cualquier fase siguiente cierra el panel y resuelve
      p._abort = function () { resolving = false; if (!p._done) { p._done = true; done(); } };
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
      p.addEventListener('click', function () { skip = true; });
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
  function msgKey(m) { return m.id != null ? 'i' + m.id : m.from + '|' + m.t + '|' + (m.text || '').slice(0, 30); }
  function nearBottom() { return el.log.scrollHeight - el.log.scrollTop - el.log.clientHeight < 60; }
  function chatAdd(m, fromState) {
    if (!mounted) mount(); if (!m) return;
    var key = msgKey(m); if (seenChat[key]) return; seenChat[key] = 1;
    addRoundSep();
    var kind = m.kind || 'chat', from = m.from || 'sys', b = roleInfo(from), me = from === R && (kind === 'chat' || kind === 'share');
    var stick = pinned, first = chatCount === 0;
    var cont = kind !== 'radio' && from === lastChatFrom && (kind === 'chat' || kind === 'share') && !el.log.lastChild.classList.contains('h-sep') && el.log.lastChild.dataset.k === kind && (!m.t || !lastChatT || Math.abs(m.t - lastChatT) < 30000);
    var d = D.createElement('div'); d.dataset.k = kind;
    d.className = 'h-m ' + kind + (me ? ' me' : '') + (cont ? ' cont' : '');
    var body;
    if (kind === 'radio') body = '<div class="bd"><div class="hd">📻 LÍA · RADIO</div><div class="tx">' + esc(m.text) + '</div></div>';
    else if (kind === 'sys' || kind === 'vote') body = '<div class="tx">' + esc(m.text) + '</div>';
    else if (kind === 'event') body = '<div class="tx">⚠ ' + esc(m.text) + '</div>';
    else {
      var card = m.card ? '<div class="h-card"><div class="t">' + icon('ojo', 12) + ' INTEL · ' + esc(m.card.title || '') + '</div><div class="x">' + esc(m.card.text || '') + '</div>' + (m.card.reliability != null ? relHtml(m.card.reliability) : '') + '</div>' : '';
      body = '<div class="av">' + portrait(from, 'neutral', 38) + '</div><div class="bd"><div class="hd" style="color:' + b.color + '">' + esc(b.name) + '<i>' + esc(b.title) + (P && P.players && P.players[from] && P.players[from].ai ? ' · IA' : '') + '</i></div><div class="tx">' + (m.text ? esc(m.text) : '') + (kind === 'share' && !m.text ? '📎 ha compartido una tarjeta' : '') + card + (m.altered && me ? '<div style="font-size:11px;color:#ffb0a8;margin-top:5px">✏️ Alterada: solo tú lo sabes</div>' : '') + '</div></div>';
    }
    d.innerHTML = body; el.log.appendChild(d); chatCount++; lastChatFrom = (kind === 'chat' || kind === 'share') ? from : null; lastChatT = m.t || 0;
    while (el.log.children.length > 260) el.log.removeChild(el.log.firstChild);
    if (typingTimers[from]) { clearTimeout(typingTimers[from]); typing(from, false); }
    if (stick || me) { el.log.scrollTop = el.log.scrollHeight; requestAnimationFrame(function () { el.log.scrollTop = el.log.scrollHeight; }); } else { unread++; badge(); showNew(true); }
    if (!first || !fromState) {
      if (!me) { snd(kind === 'radio' ? 'radio_on' : kind === 'share' ? 'share' : kind === 'chat' ? 'chat_recv' : kind === 'event' ? 'toast' : 'click'); if (isMobile() && !el.chat.classList.contains('open') && (kind === 'chat' || kind === 'share' || kind === 'radio')) { unread += (stick ? 1 : 0); badge(); } }
    }
    if (isMobile() && !el.chat.classList.contains('open') && !me) {
      var pv = el.chat.querySelector('.h-ch'); pv.dataset.pv = (b.name + ': ' + (m.text || '')).slice(0, 60);
    }
  }
  function addRoundSep() {
    if (!P || !P.round || P.round === lastChatRound || !el.log) return;
    lastChatRound = P.round; var d = D.createElement('div'); d.className = 'h-sep'; d.textContent = 'TRAMO ' + P.round; el.log.appendChild(d); lastChatFrom = null;
  }
  function typing(role, on) {
    if (!mounted) mount(); typingTimers[role] && clearTimeout(typingTimers[role]); delete typingTimers[role];
    if (on) { typingTimers[role] = setTimeout(function () { typing(role, false); }, 5000); typingState[role] = 1; } else delete typingState[role];
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
  function showNew(on) {
    var n = el.log.querySelector('.h-newmsg');
    if (!n) { n = D.createElement('div'); n.className = 'h-newmsg'; n.textContent = '↓ mensajes nuevos'; n.onclick = function () { el.log.scrollTop = el.log.scrollHeight; }; el.log.appendChild(n); }
    n.style.display = on ? 'block' : 'none'; if (on) el.log.appendChild(n);
  }
  function setChat(open) {
    if (isMobile()) { el.chat.classList.toggle('open', open); el.chat.classList.remove('min'); root.classList.toggle('chatopen', open); }
    else { el.chat.classList.toggle('min', !open); el.chat.classList.remove('open'); }
    if (open) { unread = 0; requestAnimationFrame(function () { el.log.scrollTop = el.log.scrollHeight; }); }
    badge();
  }
  function chatOpen() { return isMobile() ? el.chat.classList.contains('open') : !el.chat.classList.contains('min'); }
  function renderChips() {
    var list = customChips || (P && CHIPS[P.phase]) || CHIPS._, opt = P && P.plan && P.plan.options || [];
    list = list.map(function (t) { return t.replace('{A}', 'A').replace('ruta B', opt.length ? 'ruta ' + 'ABC'[Math.min(1, opt.length - 1)] : 'ruta B'); });
    var key = list.join('|'); if (el.chips.dataset.k === key) return; el.chips.dataset.k = key;
    el.chips.innerHTML = list.map(function (t) { return '<button type="button" data-act="chip">' + esc(t) + '</button>'; }).join('');
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
      if (!intel.length) body = '<div class="h-empty">Todavía no tienes tarjetas.<br>Pulsa <kbd>E</kbd> junto a un icono brillante para conseguir información.</div>';
      else {
        var rounds = {}; intel.forEach(function (c) { (rounds[c.round] = rounds[c.round] || []).push(c); });
        Object.keys(rounds).sort(function (a, b) { return b - a; }).forEach(function (r) {
          body += '<div class="h-gh">TRAMO ' + r + '</div>';
          rounds[r].forEach(function (c) {
            var ri = relInfo(c.reliability), isEd = editing === c.id;
            body += '<div class="h-ic1 ' + ri.cls + '">' + (c.shared ? '<span class="sh">COMPARTIDA</span>' : '') + '<div class="t">' + poiIcon(c.icon || 'info', 18) + esc(c.title) + '</div><div class="x">' + esc(c.text) + '</div>' + relHtml(c.reliability) +
              '<div class="h-acts" style="margin-top:8px"><button class="h-btn" data-act="share" data-id="' + esc(c.id) + '">📢 Compartir</button><button class="h-btn alt" data-act="edit" data-id="' + esc(c.id) + '">✏️ Compartir con cambios</button></div>' +
              (isEd ? '<div class="h-edit"><textarea data-ta="' + esc(c.id) + '" maxlength="300">' + esc(c.text) + '</textarea><div class="w">⚠ Cambiar el texto es MENTIR. Si el equipo lo descubre, perderás confianza (pero puedes ganar si cuela).</div><div class="h-acts"><button class="h-btn red" data-act="sendlie" data-id="' + esc(c.id) + '">🤥 Enviar versión alterada</button><button class="h-btn alt" data-act="canceledit">Cancelar</button></div></div>' : '') + '</div>';
          });
        });
      }
    } else if (dossierTab === 'secreto') {
      var sc = V && V.secret;
      body = sc ? '<div class="h-sc1"><div class="lock">🔒</div><div class="t">' + esc(sc.text) + '</div><div class="n">' + (sc.revealed ? '⚠ Este secreto ya se ha revelado.' : 'Nadie más lo sabe. Decide si lo confiesas o lo ocultas: puede salir a la luz en la resolución.') + '</div></div>' : '<div class="h-empty">Sin secreto.</div>';
    } else if (dossierTab === 'objetivo') {
      var g = V && V.goal; body = g ? '<div class="h-sc1" style="border-color:var(--h-amber)"><div class="lock">🎯</div><div class="t">' + esc(g.text) + '</div><div class="n">' + (g.points ? 'Recompensa: +' + g.points + ' puntos al final. ' : '') + 'Se evalúa al terminar la partida. Es privado: tu equipo no sabe cuál es.</div></div>' : '<div class="h-empty">Sin objetivo.</div>';
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
    if (cb.share) cb.share(id, asIs ? { asIs: true } : { asIs: false, text: text });
    renderDossier(); toastNote(asIs ? 'Tarjeta compartida con el equipo' : 'Has compartido una versión alterada');
  }

  /* ---------- ayuda y pausa ---------- */
  function helpFor(ph, auto) {
    el.help.innerHTML = '';
    var h = HELP[ph]; if (!h) return;
    if (auto) { if (!opts.help || helpSeen[ph] || ph === 'resolve' || ph === 'summary' || ph === 'briefing') return; helpSeen[ph] = 1; lsSet('rcv3_hudhelp', helpSeen); }
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
    else if (lk === 'r' && P && P.phase === 'explore') doReady();
    else if (k === '1' || k === '2' || k === '3') {
      var i = +k - 1;
      if (P && P.phase === 'plan' && P.plan && P.plan.options[i]) doVote(P.plan.options[i].id);
      else if (P && P.phase === 'secret') selectSecret(i);
    }
  }
  function doReady() {
    if (!P || P.phase !== 'explore' || localReady) return; localReady = true; snd('confirm'); el.bot.dataset.k = ''; paintBottom();
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
      case 'chip': sendChat(t.textContent); break;
      case 'chatmin': setChat(!chatOpen()); break;
      case 'chatfocus': setChat(true); el.input.focus(); break;
      case 'help': toggleHelp(); break;
      case 'closehelp': t.closest('.h-hb').remove(); break;
      case 'pause': openPause(); break;
      case 'resume': closePause(); break;
      case 'helpfull': closePause(); helpFor(cur.phase || 'explore', false); break;
      case 'mute': try { if (W.Sound && W.Sound.toggle) W.Sound.toggle(); } catch (x) { } openPause(); break;
      case 'settings': closePause(); if (cb.settings) cb.settings(); break;
      case 'textsize': setOptions({ big: !opts.big }); openPause(); break;
      case 'exit': if (cb.exit) cb.exit(); closePause(); break;
      case 'goals': el.left.classList.toggle('mob'); break;
      case 'leftmin': el.left.classList.toggle('min'); break;
    }
  }

  /* ---------- efectos ---------- */
  function floatText(txt, type, where) {
    if (!mounted) mount(); var n = D.createElement('div'); n.className = 'h-fl ' + (type || 'info') + (/PTS|PUNTOS|¡/.test(txt) ? ' big' : '');
    n.textContent = txt; var rr = root.getBoundingClientRect(), x = rr.width / 2, y = rr.height * .4;
    if (where && typeof where === 'object') { x = where.x; y = where.y; }
    else if (where === 'score') { var b = el.score.getBoundingClientRect(); x = b.left - rr.left + b.width / 2; y = b.bottom - rr.top + 18; }
    else if (where && el.sts[where]) { var b2 = el.sts[where].getBoundingClientRect(); x = b2.left - rr.left + b2.width / 2; y = b2.bottom - rr.top + 20; }
    else { x += (Math.random() - .5) * 120; }
    n.style.left = x + 'px'; n.style.top = y + 'px'; el.fx.appendChild(n); setTimeout(function () { n.remove(); }, 1700);
  }
  function sparks(fx, fy, n) {
    if (opts.noflash) return; var rr = root.getBoundingClientRect(), cols = ['#f2a93b', '#ffd27a', '#3fd0c0', '#b58cff', '#5fe39a'];
    n = n || 18;
    for (var i = 0; i < n; i++) {
      var p = D.createElement('i'); p.className = 'h-par'; p.style.left = rr.width * fx + 'px'; p.style.top = rr.height * fy + 'px'; p.style.background = cols[i % cols.length];
      var a = Math.random() * 6.28, d = 60 + Math.random() * 160; p.style.setProperty('--dx', Math.cos(a) * d + 'px'); p.style.setProperty('--dy', Math.sin(a) * d - 40 + 'px'); p.style.setProperty('--r', Math.random() * 720 + 'deg');
      el.fx.appendChild(p); setTimeout(function (q) { q.remove(); }.bind(null, p), 1200);
    }
  }
  function flash(c) { var f = D.createElement('div'); f.className = 'h-flash'; f.style.setProperty('--fc', c || '#fff'); el.fx.appendChild(f); setTimeout(function () { f.remove(); }, 600); }
  function shake(i) {
    if (opts.noflash) return; root.classList.remove('shake'); void root.offsetWidth; root.classList.add('shake'); setTimeout(function () { root.classList.remove('shake'); }, 480);
    if (cb.fx) cb.fx('shake', i == null ? 1 : i);
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
    hide: function () { hidden = true; if (root) { root.classList.add('off'); } },
    show: function () { hidden = false; if (root) root.classList.remove('off'); },
    chat: { add: function (m) { chatAdd(m); }, typing: typing, clear: function () { if (el.log) el.log.innerHTML = ''; seenChat = {}; chatCount = 0; lastChatRound = 0; lastChatFrom = null; unread = 0; badge(); }, focus: function () { setChat(true); el.input.focus(); } },
    setChips: function (l) { customChips = l; if (el.chips) { el.chips.dataset.k = ''; renderChips(); } },
    openDossier: openDossier, closeDossier: closeDossier, help: function () { helpFor(cur.phase, false); }, shake: shake, flash: flash, sparks: sparks, note: note,
    openPause: function () { if (!paused) openPause(); }, closePause: closePause,
    closePanel: function () { closePanel(true); }, isTyping: typingNow, resetHelp: function () { helpSeen = {}; lsSet('rcv3_hudhelp', helpSeen); },
    reset: function () { this.chat.clear(); closePanel(true); closeDossier(); cur = { phase: null, round: 0 }; dispInit = false; waterLevelHit = 0; lastIntelLen = 0; intelSeen = 0; localReady = false; localVote = null; secretSel = null; secretSealed = false; P = null; V = null; },
    onChat: function (f) { cb.chat = f; }, onShare: function (f) { cb.share = f; }, onVote: function (f) { cb.vote = f; }, onSecret: function (f) { cb.secret = f; },
    onReady: function (f) { cb.ready = f; }, onExit: function (f) { cb.exit = f; }, onSettings: function (f) { cb.settings = f; }, onPause: function (f) { cb.pause = f; },
    onFx: function (f) { cb.fx = f; }, onChatFocus: function (f) { cb.focus = f; }, onTyping: function (f) { cb.typing = f; },
    _dbg: function () { return { P: P, V: V, R: R, panel: panelName }; }
  };
  W.Hud = Hud;
})();
