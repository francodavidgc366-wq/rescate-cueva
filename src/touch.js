/* touch.js: controles tactiles (overlay) que emiten KeyboardEvent reales; solo con body.rc-touch. Ver NOTES-touch18.md */
(function () {
  'use strict';
  var D = document, W = window, B = D.body;
  var on = (W.matchMedia && W.matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in W || /[?&]touch=1/.test(location.search);
  if (!on) return;
  B.classList.add('rc-touch');
  var KEYS = { left: ['ArrowLeft', 'ArrowLeft'], right: ['ArrowRight', 'ArrowRight'], jump: [' ', 'Space'], e: ['e', 'KeyE'], q: ['q', 'KeyQ'], run: ['Shift', 'ShiftLeft'], tab: ['Tab', 'Tab'], j: ['j', 'KeyJ'], t: ['t', 'KeyT'], r: ['r', 'KeyR'], esc: ['Escape', 'Escape'], enter: ['Enter', 'Enter'] }, down = {};
  function fire(type, k) { var d = KEYS[k]; D.body.dispatchEvent(new KeyboardEvent(type, { key: d[0], code: d[1], bubbles: true, cancelable: true })); }
  function press(k) { if (!down[k]) { down[k] = 1; fire('keydown', k); } }
  function rel(k) { if (down[k]) { down[k] = 0; fire('keyup', k); } }
  function tap(k) { fire('keydown', k); fire('keyup', k); }
  function releaseAll() { Object.keys(down).forEach(rel); var r = D.querySelector('#rc-tc [data-k=run]'); r && r.classList.remove('dn'); }

  var css = D.createElement('style');
  css.textContent = [
    'html,body{overscroll-behavior:none}body.rc-touch{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}',
    'body.rc-touch #rcgame,body.rc-touch #rc-tc{touch-action:none}body.rc-touch #rcgame .h-chat input,body.rc-touch #rcgame .h-log{-webkit-user-select:text;user-select:text}',
    '#rc-tc{position:fixed;inset:0;z-index:40;pointer-events:none;display:none;--p:max(10px,env(safe-area-inset-left));font-family:"Press Start 2P",ui-monospace,monospace}',
    '#rc-tc.on{display:block}#rc-tc button,#rc-tc .pad{pointer-events:auto;position:absolute;border:3px solid #07040f;background:#2b2150cc;color:#ffe08a;font:inherit;font-size:12px;padding:0;margin:0;border-radius:10px;box-shadow:0 3px 0 #07040f;opacity:.62;touch-action:none;display:grid;place-items:center;line-height:1}',
    '#rc-tc button.dn,#rc-tc .pad .dn{opacity:1;background:#f2a93b;color:#2a1606}',
    '#rc-tc .pad{left:var(--p);bottom:max(12px,env(safe-area-inset-bottom));width:min(34vw,200px);height:72px;border:0;box-shadow:none;background:none;display:flex;gap:8px;opacity:1}',
    '#rc-tc .pad b{flex:1;display:grid;place-items:center;border:3px solid #07040f;border-radius:10px;background:#2b2150cc;color:#ffe08a;font-size:24px;opacity:.62;box-shadow:0 3px 0 #07040f}',
    '#rc-tc .pad b.dn{opacity:1;background:#f2a93b;color:#2a1606}',
    '#rc-tc [data-k=run]{left:calc(var(--p) + min(34vw,200px) + 8px);bottom:max(12px,env(safe-area-inset-bottom));width:64px;height:48px;font-size:8px}',
    '#rc-tc [data-k=e]{right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));width:88px;height:88px;border-radius:50%;font-size:28px;background:#1f6f66d9;color:#b4fff4}',
    '#rc-tc [data-k=jump]{right:calc(max(12px,env(safe-area-inset-right)) + 100px);bottom:max(16px,env(safe-area-inset-bottom));width:72px;height:72px;border-radius:50%;font-size:10px}',
    '#rc-tc [data-k=q]{right:calc(max(12px,env(safe-area-inset-right)) + 12px);bottom:calc(max(12px,env(safe-area-inset-bottom)) + 100px);width:56px;height:56px;border-radius:50%;font-size:20px;background:#4a2f7acc}',
    '#rc-tc .top button{width:64px;height:48px;font-size:7px;top:var(--y);margin:0}#rc-tc .top [data-t=tab]{left:var(--p)}#rc-tc .top [data-t=j]{left:var(--p)}#rc-tc .top [data-t=t]{left:var(--p)}#rc-tc .top [data-t=r],#rc-tc .top [data-t=esc]{right:max(12px,env(safe-area-inset-right))}',
    '#rc-tc .skip{display:none;right:max(12px,env(safe-area-inset-right));top:56px;width:96px;height:48px;font-size:9px}#rc-tc.cs>*{display:none!important}#rc-tc.cs>.skip{display:grid!important}',
    '#rc-tc [data-t=tab]{--y:56px}#rc-tc [data-t=j]{--y:108px}#rc-tc [data-t=t]{--y:160px}#rc-tc [data-t=esc]{--y:56px}#rc-tc [data-t=r]{--y:108px}',
    '',
    '#rc-rot{position:fixed;inset:0;z-index:9999;background:#0d0b16;color:#ffe08a;display:none;flex-direction:column;align-items:center;justify-content:center;gap:18px;font:14px "Press Start 2P",ui-monospace,monospace;text-align:center}',
    '#rc-rot i{display:block;width:48px;height:80px;border:6px solid #ffe08a;border-radius:8px;box-shadow:0 0 0 3px #07040f;animation:rcrot 1.6s steps(6) infinite}@keyframes rcrot{0%,20%{transform:rotate(0)}70%,100%{transform:rotate(-90deg)}}',
    '@media (orientation:portrait){body.rc-touch #rc-rot{display:flex}}',
    // HUD compacto en movil
    'body.rc-touch #rcgame{box-sizing:border-box;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}body.rc-touch #rcgame .hud{box-sizing:border-box;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}',
    'body.rc-touch .h-mg{touch-action:none}body.rc-touch #rcv3 kbd,body.rc-touch #rcgame kbd,body.rc-touch #rcv3 .k{display:none!important}',
    // HUD compacto en movil horizontal
    'body.rc-touch #rcgame .h-top{margin:2px 4px 0;padding:2px 8px;gap:2px 8px;flex-wrap:nowrap;border-width:2px;border-radius:8px}',
    'body.rc-touch #rcgame .h-ph,body.rc-touch #rcgame .h-evt,body.rc-touch #rcgame .h-rlab,body.rc-touch #rcgame .h-dock,body.rc-touch #rcgame .h-mini,body.rc-touch #rcgame .h-bot,body.rc-touch #rcgame .h-chat:not(.open),body.rc-touch #rcgame .h-mid .h-mz,body.rc-touch #rcgame .h-lee,body.rc-touch #rcgame .h-tabh{display:none!important}',
    'body.rc-touch #rcgame .h-rnd{zoom:.6;flex:none}',
    'body.rc-touch #rcgame .h-sts{flex:1 1 auto;max-width:none;gap:6px;margin-left:0}body.rc-touch #rcgame .h-st .l{font-size:11px;gap:3px}body.rc-touch #rcgame .h-st .l svg,body.rc-touch #rcgame .h-st .l canvas,body.rc-touch #rcgame .h-st .l img{width:16px;height:16px}body.rc-touch #rcgame .h-st .l b{font-size:12px;margin-left:2px}body.rc-touch #rcgame .h-bar{height:6px}',
    'body.rc-touch #rcgame .h-tm{min-width:52px}body.rc-touch #rcgame .h-time{font-size:15px}body.rc-touch #rcgame .h-tbar{margin-top:1px;height:4px}',
    'body.rc-touch #rcgame .h-gd{padding-top:4px;gap:3px}',
    'body.rc-touch #rcgame .h-coach{padding:4px 16px 5px;border-width:3px;margin-bottom:0!important;max-width:min(520px,100%)}body.rc-touch #rcgame .h-coach .tx{font-size:15px}body.rc-touch #rcgame .h-coach .st{font-size:7px}body.rc-touch #rcgame .h-coach .ar{display:none}',
    'body.rc-touch #rcgame .h-now{padding:3px 10px;gap:8px;border-width:2px;max-width:min(520px,100%)}body.rc-touch #rcgame .h-now .t{font-size:10px}body.rc-touch #rcgame .h-now .w{font-size:11px}body.rc-touch #rcgame .h-now .s,body.rc-touch #rcgame .h-now .k{display:none}',
    'body.rc-touch #rcgame .hud.modal .h-left,body.rc-touch #rcgame .h-left{display:none!important}body.rc-touch #rcgame .h-stage{top:0;bottom:0}',
    'body.rc-touch #rcgame .h-pn{max-height:100%;width:min(780px,100%)}body.rc-touch #rcgame .h-pn[data-p] .h-ph1{padding:4px 44px 4px 10px;gap:2px}body.rc-touch #rcgame .h-ph1 .q{font-size:15px}body.rc-touch #rcgame .h-ph1 .hv{font-size:11px}body.rc-touch #rcgame .h-ph1 h2{font-size:10px}',
    'body.rc-touch #rcgame .h-pn[data-p=plan] .h-opt,body.rc-touch #rcgame .h-pn[data-p=secret] .h-so{padding:7px 9px 8px;gap:4px;min-height:48px}body.rc-touch #rcgame .h-pn[data-p=plan] .h-opt h3{font-size:14px}body.rc-touch #rcgame .h-pn[data-p] .h-opt p,body.rc-touch #rcgame .h-pn[data-p] .h-so p{font-size:11.5px;line-height:1.3}',
    'body.rc-touch #rcgame .h-pn[data-p] .h-opt canvas,body.rc-touch #rcgame .h-pn[data-p] .h-so canvas,body.rc-touch #rcgame .h-pn[data-p] .h-opt svg.ic{width:36px!important;height:36px!important}body.rc-touch #rcgame .h-pn[data-p] .h-pb{padding:6px 8px}body.rc-touch #rcgame .h-pn[data-p] .h-foot{padding:4px 10px 6px}',
    'body.rc-touch #rcgame .h-act{padding-bottom:0}',
    // chat: panel superpuesto compacto arriba a la derecha, solo al pulsar CHAT
    'body.rc-touch #rcgame .h-chat.open{display:flex;left:auto;right:6px;top:4px;bottom:auto;width:min(420px,56vw);height:calc(100% - 8px);max-height:none;z-index:70;pointer-events:auto}',
    'body.rc-touch #rcgame .h-chat.open .h-chips{max-height:64px}body.rc-touch #rcgame .h-chat.open .h-in input{min-height:40px;font-size:16px}body.rc-touch #rcgame .h-chat.open .h-in button,body.rc-touch #rcgame .h-chips button{min-height:40px}',
    'body.rc-touch #rcgame .h-pn,body.rc-touch #rcgame .h-dos,body.rc-touch #rcgame .h-jr{overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y}',
    'body.rc-touch #rcgame button,body.rc-touch #rcgame .h-btn{min-height:44px}',
  ].join('\n');
  D.head.appendChild(css);

  var rot = D.createElement('div'); rot.id = 'rc-rot'; rot.innerHTML = '<i></i><span>GIRA EL MÓVIL</span>'; B.appendChild(rot);
  var tc = D.createElement('div'); tc.id = 'rc-tc';
  tc.innerHTML = '<div class="pad"><b data-s="left">◀</b><b data-s="right">▶</b></div><button data-k="run">CORRER</button>' +
    '<div class="top"><button data-t="tab">MAPA</button><button data-t="j">CUADERNO</button><button data-t="t">CHAT</button><button data-t="r">CONVOCAR</button><button data-t="esc">PAUSA</button></div>' +
    '<button data-t="enter" class="skip">SALTAR »</button><button data-k="jump">SALTAR</button><button data-k="q">Q</button><button data-k="e">E</button>';
  B.appendChild(tc);
  W.addEventListener('contextmenu', function (e) { if (B.classList.contains('rc-touch') && !/INPUT|TEXTAREA/.test(e.target.tagName)) e.preventDefault(); });
  D.addEventListener('dblclick', function (e) { e.preventDefault(); });

  // botones de mantener (saltar, E, Q, correr = toggle)
  tc.querySelectorAll('button[data-k]').forEach(function (b) {
    var k = b.dataset.k;
    if (k === 'run') { b.addEventListener('pointerdown', function (e) { e.preventDefault(); down.run ? rel('run') : press('run'); b.classList.toggle('dn', !!down.run); }); return; }
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add('dn'); press(k); });
    var up = function () { b.classList.remove('dn'); rel(k); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  });
  tc.querySelectorAll('button[data-t]').forEach(function (b) { b.addEventListener('pointerdown', function (e) { e.preventDefault(); tap(b.dataset.t); }); });
  // cruceta: un solo pad; el dedo puede deslizar de ◀ a ▶; doble toque = correr mientras se mantiene
  var pad = tc.querySelector('.pad'), bl = pad.children[0], br = pad.children[1], side = null, lastDn = 0, dbl = false;
  function setSide(s) {
    if (s === side) return; if (side) rel(side); side = s; bl.classList.toggle('dn', s === 'left'); br.classList.toggle('dn', s === 'right'); if (s) press(s);
  }
  function sideAt(x) { var r = pad.getBoundingClientRect(); return x < r.left + r.width / 2 ? 'left' : 'right'; }
  pad.addEventListener('pointerdown', function (e) { e.preventDefault(); pad.setPointerCapture(e.pointerId); var n = Date.now(); dbl = n - lastDn < 300; lastDn = n; if (dbl) press('run'); setSide(sideAt(e.clientX)); });
  pad.addEventListener('pointermove', function (e) { if (pad.hasPointerCapture(e.pointerId)) setSide(sideAt(e.clientX)); });
  var padUp = function () { setSide(null); if (dbl && !tc.querySelector('[data-k=run]').classList.contains('dn')) rel('run'); dbl = false; };
  pad.addEventListener('pointerup', padUp); pad.addEventListener('pointercancel', padUp);

  // visibilidad segun lo que haya en pantalla
  var q = function (s) { return D.querySelector(s); };
  function vis() {
    var g = q('#rcgame'), game = g && g.style.display !== 'none', ui = q('#rcv3 .scr.on, #rcv3 .mod'), hud = q('#rcgame .hud');
    var full = !game || ui || B.classList.contains('rc-dlg') || q('#rcgame .h-mg, #rcgame .h-jr, #rcgame .h-pn, #rcgame .h-big, #rcgame .h-dos.open, #rcgame .h-pause.open, #rcgame .h-hb') || (hud && /\b(modal|dlg)\b/.test(hud.className));
    var chat = q('#rcgame .h-chat.open'), cs = !!(game && !ui && W.Engine && Engine.isCutscene && Engine.isCutscene()), show = !!game && !ui && !full && !chat;
    tc.classList.toggle('cs', cs); tc.classList.toggle('on', show || cs); if (!show) releaseAll();
  }
  setInterval(vis, 150);
  W.addEventListener('blur', releaseAll); W.matchMedia && W.matchMedia('(orientation:portrait)').addEventListener && W.matchMedia('(orientation:portrait)').addEventListener('change', releaseAll);
  W.RCTouch = { vis: vis };
})();
