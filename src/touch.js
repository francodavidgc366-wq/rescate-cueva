/* touch.js: controles tactiles (overlay) que emiten KeyboardEvent reales; solo con body.rc-touch. Ver NOTES-touch18.md */
(function () {
  'use strict';
  var D = document, W = window, B = D.body;
  var on = (W.matchMedia && W.matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in W || /[?&]touch=1/.test(location.search);
  if (!on) return;
  B.classList.add('rc-touch');
  var KEYS = { left: ['ArrowLeft', 'ArrowLeft'], right: ['ArrowRight', 'ArrowRight'], jump: [' ', 'Space'], jumpj: [' ', 'Space'], up: ['ArrowUp', 'ArrowUp'], down: ['ArrowDown', 'ArrowDown'], e: ['e', 'KeyE'], q: ['q', 'KeyQ'], run: ['Shift', 'ShiftLeft'], tab: ['Tab', 'Tab'], j: ['j', 'KeyJ'], t: ['t', 'KeyT'], r: ['r', 'KeyR'], esc: ['Escape', 'Escape'], enter: ['Enter', 'Enter'] }, down = {};
  function fire(type, k) { var d = KEYS[k]; D.body.dispatchEvent(new KeyboardEvent(type, { key: d[0], code: d[1], bubbles: true, cancelable: true })); }
  function press(k) { if (!down[k]) { down[k] = 1; fire('keydown', k); } }
  function rel(k) { if (down[k]) { down[k] = 0; fire('keyup', k); } }
  function tap(k) { fire('keydown', k); fire('keyup', k); }
  function releaseAll() { if (W.RCTouch && W.RCTouch.js) W.RCTouch.js(); Object.keys(down).forEach(rel); }

  var css = D.createElement('style');
  css.textContent = [
    'html,body{overscroll-behavior:none}body.rc-touch{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}',
    'body.rc-touch #rcgame,body.rc-touch #rc-tc{touch-action:none}body.rc-touch #rcgame .h-chat input,body.rc-touch #rcgame .h-log{-webkit-user-select:text;user-select:text}',
    '#rc-tc{position:fixed;inset:0;z-index:40;pointer-events:none;display:none;--p:max(10px,env(safe-area-inset-left));font-family:"Press Start 2P",ui-monospace,monospace}',
    '#rc-tc.on{display:block}#rc-tc button,#rc-tc .pad{pointer-events:auto;position:absolute;border:3px solid #07040f;background:#2b2150cc;color:#ffe08a;font:inherit;font-size:12px;padding:0;margin:0;border-radius:10px;box-shadow:0 3px 0 #07040f;opacity:.62;touch-action:none;display:grid;place-items:center;line-height:1}',
    '#rc-tc button.dn,#rc-tc .pad .dn{opacity:1;background:#f2a93b;color:#2a1606}',
    '#rc-js{pointer-events:auto;position:absolute;left:0;bottom:0;width:50%;height:56%;touch-action:none}#rc-js .jb{position:absolute;width:124px;height:124px;margin:-62px 0 0 -62px;border-radius:50%;border:4px solid #07040f;background:#2b2150a6;box-shadow:0 3px 0 #07040f,inset 0 0 0 3px #ffe08a33;opacity:.5;pointer-events:none}#rc-js.dn .jb{opacity:.95}#rc-js.run .jb{border-color:#f2a93b;box-shadow:0 0 14px #f2a93b,0 3px 0 #07040f}',
    '#rc-js .jb i{position:absolute;font-style:normal;color:#ffe08a;font-size:14px;opacity:.45;line-height:1}#rc-js .jb i.a{opacity:1;color:#f2a93b;text-shadow:0 0 6px #f2a93b}#rc-js .jb i[data-d=up]{left:50%;top:5px;transform:translateX(-50%)}#rc-js .jb i[data-d=down]{left:50%;bottom:5px;transform:translateX(-50%)}#rc-js .jb i[data-d=left]{left:7px;top:50%;transform:translateY(-50%)}#rc-js .jb i[data-d=right]{right:7px;top:50%;transform:translateY(-50%)}',
    '#rc-js .jk{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;border:3px solid #07040f;background:#ffe08a;opacity:.8}#rc-js.dn .jk{background:#f2a93b;opacity:1}',
    '#rc-fs{pointer-events:auto;position:absolute;left:50%;bottom:6px;transform:translateX(-50%);width:40px!important;height:40px!important;opacity:.4!important;display:none!important}#rc-tc.fs #rc-fs{display:grid!important}',
    '.rc-fsi{display:inline-block;width:14px;height:14px;vertical-align:-2px;margin-right:6px;background:linear-gradient(currentColor,currentColor) 0 0/5px 3px no-repeat,linear-gradient(currentColor,currentColor) 0 0/3px 5px no-repeat,linear-gradient(currentColor,currentColor) 100% 0/5px 3px no-repeat,linear-gradient(currentColor,currentColor) 100% 0/3px 5px no-repeat,linear-gradient(currentColor,currentColor) 0 100%/5px 3px no-repeat,linear-gradient(currentColor,currentColor) 0 100%/3px 5px no-repeat,linear-gradient(currentColor,currentColor) 100% 100%/5px 3px no-repeat,linear-gradient(currentColor,currentColor) 100% 100%/3px 5px no-repeat}#rc-fs .rc-fsi{margin:0;width:18px;height:18px}',
    '#rc-ios{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:9998;max-width:min(560px,92vw);padding:10px 14px;background:#251d44;color:#ffe08a;border:3px solid #ffe08a;border-radius:8px;font:11px/1.5 "Press Start 2P",ui-monospace,monospace;text-align:center}',
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
    // ===== touch20: escala proporcionada en pantallas bajas (ver NOTES-touch20.md) =====
    '@media (max-height:440px){' + [
      // ---- escala global: textos px*--h-fs; --u = min(h/390,w/850) (JS)
      '§.hud{--h-fs:calc(.78*var(--u,1))}§.hud.big{--h-fs:calc(.95*var(--u,1))}',
      // barra superior delgada de una fila
      '§.h-top{margin:1px 3px 0;padding:0 8px;height:calc(30px*var(--u,1));min-height:0;align-items:center;gap:0 10px;border-radius:6px}',
      '§.h-rnd{zoom:.46}§.h-tm{min-width:46px}§.h-time{font-size:13px;line-height:1}§.h-tbar{display:none}',
      '§.h-sts{gap:8px;align-items:center}§.h-st .l{font-size:10px}§.h-st .l svg,§.h-st .l canvas,§.h-st .l img,§.h-st .l .h-ic{width:16px!important;height:16px!important;background-size:contain}§.h-st .l b{font-size:12px}§.h-bar{height:4px;margin-top:1px}',
      '§.h-gd{padding:2px 0 3px!important;gap:2px}§.h-now .w{display:none}',
      // coach / mision: una linea
      '§.h-coach{padding:2px 12px;border-width:2px;min-height:0;gap:6px;max-width:min(480px,92%)}§.h-coach .tx{font-size:11px;line-height:1.2}§.h-coach .st{display:none}§.h-coach .h-por,§.h-coach .h-ic,§.h-coach svg,§.h-coach canvas{width:18px!important;height:18px!important}',
      '§.h-now{padding:2px 10px;min-height:0;gap:6px;max-width:min(480px,92%)}§.h-now .t{font-size:9px;line-height:1.3}§.h-now .w{font-size:10px}§.h-now .pg{width:44px;font-size:7px}',
      '§.h-stp{padding:1px 6px 1px 3px;font-size:10px}',
      // ---- dialogo compacto
      '§.h-dlg{left:6px;right:6px;bottom:4px}§.dl-wrap{max-width:none}§.dl-box{gap:8px;padding:5px 12px 5px 5px;max-height:30vh;border-width:2px}',
      '§.dl-box{background:#0a071a}§.dl-fr{border-width:2px}§.dl-tx{gap:2px;min-height:0}§.dl-name b{font-size:9px}§.dl-name i{font-size:10px}',
      '§.dl-text{font-size:14px!important;line-height:1.3;min-height:0;max-height:calc(30vh - 34px)}§.dl-foot{right:8px;bottom:2px;gap:8px;font-size:10px}§.dl-foot .arr{font-size:12px}§.dl-foot .sk{font-size:10px;min-height:0!important;padding:0 2px}',
      // ---- tarjeta de viaje: arriba, una fila, opaca; sustituye al cartel
      '§.h-trv{top:calc(34px*var(--u,1));height:30px;padding:0 10px;gap:8px;border-width:2px;border-radius:8px;background:#120e26;box-shadow:0 2px 0 #07040f;max-width:94%;z-index:60}§.h-trv .ri,§.h-trv .ri svg,§.h-trv .ri canvas{width:20px!important;height:20px!important}§.h-trv .rn,§.h-trv .ft{font-size:9px}§.h-trv .h-mb,§.h-trv .h-pbh{width:90px;min-width:0;zoom:.75}',
      '.hud:has(.h-trv) .h-gd{display:none}',
      // ---- paneles de decision (plan/secreta/resultado/resumen/evento): cabecera + cuerpo con scroll + pie propio
      '§.h-stage{top:0;bottom:0;padding:2px 0}§.h-stage .h-pn{max-height:100%}§.hud.modal:not(.pmin) .h-gd{display:none}',
      '§.h-pn[data-p]{display:flex;flex-direction:column;overflow:hidden;width:min(820px,calc(100% - 8px));border-width:2px;border-radius:8px;box-shadow:0 0 0 2px #000,0 0 24px #000c}',
      '§.h-pn[data-p]>.h-ph1{flex:none;padding:3px 40px 3px 10px;gap:8px;flex-direction:row!important;align-items:baseline!important;justify-content:flex-start!important}§.h-pn[data-p] .h-ph1 .q{font-size:15px;line-height:1.2}§.h-pn[data-p] .h-ph1 .hv{font-size:12px;white-space:nowrap}§.h-pn[data-p] .h-ph1 h2{font-size:9px}§.h-pn[data-p] .h-ph1 .sub{display:none}§.h-pn[data-p] .h-ph1>.h-ic,§.h-pn[data-p] .h-ph1>svg{zoom:.6}',
      '§.h-pn[data-p]>.h-pb{flex:1 1 auto;min-height:0;overflow-y:auto;padding:5px 8px;-webkit-overflow-scrolling:touch}',
      '§.h-pn[data-p]>.h-foot{flex:none;position:static;padding:3px 8px;gap:8px;min-height:0;background:#120d26;border-top:2px solid var(--h-line)}§.h-pn[data-p]>.h-foot .l{font-size:11px}§.h-pn[data-p]>.h-foot .h-btn{font-size:9px;padding:4px 14px;min-height:40px}§.h-pn[data-p]>.h-foot kbd{display:none}',
      '§.h-mn{width:32px;height:26px;min-height:0!important;right:4px;top:3px}',
      // plan / secreta: 3 columnas compactas
      '§.h-pn[data-p] .h-opts,§.h-pn[data-p] .h-sopts{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding-top:2px}§.h-pn[data-p=plan] .h-opts{padding-top:10px}',
      '§.h-pn[data-p] .h-opt,§.h-pn[data-p] .h-so{padding:4px 5px 5px;gap:2px;min-height:0;border-width:2px;border-radius:6px}§.h-pn[data-p] .h-opt:hover,§.h-pn[data-p] .h-so:hover{transform:none}',
      '§.h-pn[data-p] .h-opt .top{gap:6px}§.h-pn[data-p] .h-opt .num{font-size:12px;padding:2px 6px;border-width:2px;border-radius:5px}§.h-pn[data-p] .h-so .num{display:none}',
      '§.h-pn[data-p] .h-px,§.h-pn[data-p] .h-opt canvas,§.h-pn[data-p] .h-so canvas{width:32px!important;height:32px!important}',
      '§.h-pn[data-p=plan] .h-opt h3{font-size:13px;min-height:0;line-height:1.15}§.h-opt .wh{font-size:11px!important;line-height:1.2;max-height:2.4em}§.h-pn[data-p] .h-opt .ind{gap:8px;min-height:0}§.h-pn[data-p] .h-opt .rowc,§.h-pn[data-p] .h-so .chs{gap:3px}',
      '§.h-pn[data-p] .h-so .vb{font-size:13px}§.h-pn[data-p] .h-so .tt{font-size:11px!important;line-height:1.2}§.h-pn[data-p] .h-opt .vbtn{font-size:9px;padding:2px 8px}§.h-pn[data-p] .h-votes{min-height:0;padding-top:0;border:0;position:absolute;top:-9px;left:4px}',
      '§.h-pn[data-p] .h-when{font-size:10px;margin-top:3px}§.h-pn[data-p] .h-mine,§.h-pn[data-p] .h-brief1{display:none}',
      // resultado / resumen / evento
      '§.h-xh{font-size:15px;margin:0 0 4px}§.h-xl{gap:4px}§.h-xr{padding:3px 8px;gap:8px;border-width:1px}§.h-xr .tx{font-size:12px;line-height:1.25}§.h-xr .dl{font-size:13px;min-width:44px}§.h-xr>:first-child{zoom:.62}§.h-xw{margin:6px 0 0;font-size:12px}§.h-xw li{padding:2px 0 2px 14px}',
      '§.h-narr{font-size:13px;min-height:0;padding:0 0 4px}§.h-roll{padding:3px 8px;gap:8px}§.h-die{width:30px;height:30px;font-size:11px}§.h-rev{padding:4px 8px;gap:8px}§.h-rev .tx{font-size:12px}§.h-deltas{gap:5px;margin-top:6px}§.h-dl{padding:3px 2px}§.h-dl b{font-size:12px;margin-top:2px}§.h-ptsbig{font-size:11px;margin-top:5px}',
      '§.h-rows{gap:4px}§.h-row{padding:3px 8px;gap:8px;grid-template-columns:24px 1fr auto}§.h-row .nm{font-size:8px}§.h-row .nt{font-size:11px;margin-top:1px}§.h-row .v{font-size:13px;min-width:44px}§.h-total{margin-top:6px;padding:4px 10px}§.h-total .nm{font-size:8px}§.h-total .v{font-size:16px}§.h-notes{font-size:12px;margin-top:6px}',
      '§.h-art{height:60px}§.h-evt1{font-size:11px;margin:0 0 3px}§.h-evtx{font-size:12px;line-height:1.3}§.h-radio .q,§.h-expect{font-size:12px}§.h-expect{margin-top:5px;padding:3px 8px}',
      // ---- diario: hoja proporcionada, cuerpo con scroll, pie fijo propio
      '§.h-jr{padding:3px}§.h-jp{--jl:21px;font-size:17px;width:min(900px,100%);height:100%;border-radius:3px 8px 8px 3px}',
      '§.h-jb{padding:6px 14px 6px 44px;background-position:-34px 0,0 0}§.h-jh{gap:10px;min-height:calc(var(--jl)*1.3)}§.h-jh .t{font-size:26px;letter-spacing:1px}§.h-jh svg{height:26px}§.h-jh .dy{font-size:14px}§.h-jt{font-size:19px;margin:calc(var(--jl)*.2) 0 calc(var(--jl)*.5);text-underline-offset:3px}',
      '§.h-je{grid-template-columns:1fr 44px;gap:8px}§.stk{width:40px;height:40px;padding:4px;margin-top:2px}§.plus{font-size:22px;margin-left:4px}§.h-jd .lab,§.h-js .lab{font-size:18px}§.h-jd .bx,§.h-js .bx{font-size:18px;padding:0 10px;border-width:2px}§.stamp{font-size:20px;margin:4px 0 0 8px;padding:0 8px;border-width:3px}§.stamp.sm{font-size:16px}§.h-fx2 .dl{font-size:19px;min-width:40px}§.h-fx2 .stk{width:28px;height:28px}§.h-js .ef{font-size:17px}§.h-jpt{font-size:16px}§.h-jpt .ac{font-size:13px}§.h-jn{font-size:16px;padding:2px 10px}',
      '§.h-jf{flex:none;padding:4px 12px 5px;gap:10px;min-height:0;font-size:15px;background:#d8c38f;border-top:2px solid #a0805099}§.h-jf .jbar{font-size:15px;gap:8px}§.h-jf .h-mb{width:96px}§.h-jf button{font-size:20px;padding:2px 14px;min-height:40px;border-width:2px;box-shadow:0 3px 0 #2a2540}',
      '§.h-note{font-size:9px}§.h-xw h4{font-size:9px}§.h-sep{font-size:9px}§.h-acts .h-btn{font-size:9px}',
      // ---- chat
      '§.h-chat.open{--h-fs:.9;width:min(380px,52vw);top:calc(32px*var(--u,1));height:calc(100% - 36px*var(--u,1))}§.h-chat.open .h-ch{padding:3px 8px;font-size:8px}§.h-chat.open .h-m .tx{font-size:12.5px}§.h-chat.open .h-chips button{font-size:11px;padding:2px 8px;min-height:32px}§.h-chat.open .h-in{padding:4px}§.h-chat.open .h-g .av,§.h-chat.open .h-m .av{width:34px}',
      // ---- cuaderno (J), pausa, mapa, tarjeta ENCONTRASTE, minijuegos
      '§.h-dos{top:0;bottom:2px;left:3px;width:min(560px,100%)}§.h-dh{padding:4px 10px;font-size:9px}§.h-tabs{padding:4px 6px 0}§.h-tabs button{padding:4px 2px;font-size:9px;min-height:36px}§.h-db{padding:6px;gap:6px}§.h-ic1 .t{font-size:12px}§.h-ic1 .x{font-size:12px;margin:2px 0 4px}§.h-empty{padding:12px;font-size:12px}',
      '§.h-pm{width:min(440px,96%);padding:6px 10px;display:grid;grid-template-columns:1fr 1fr;gap:4px 8px;align-items:center;border-width:2px}§.h-pm>*{margin:0}§.h-pm .h-btn,§.h-pm button{padding:4px 6px;font-size:9px;min-height:38px}§.h-pm h2,§.h-pm .t{grid-column:1/-1;font-size:11px;text-align:center}',
      '§.h-fcard{left:50%;transform:translateX(-50%);bottom:auto;top:calc(36px*var(--u,1));width:min(320px,94%);padding:5px 12px}§.h-fcard .k{font-size:8px}§.h-fcard .t{font-size:13px;margin:1px 0}§.h-fcard .x{font-size:11px}§.h-fcard .u{margin-top:2px;font-size:10px}',
      '§.h-big{top:calc(50% + 15px);max-width:calc(100% - 12px);padding:4px}§.h-big canvas{max-height:calc(100vh - 124px);width:auto!important;max-width:100%;margin:0 auto}§.h-big .bt span{font-size:11px!important}§.h-big .bt button{min-height:34px!important;width:34px;padding:0}§.h-big .mpz span{padding:2px;font-size:10px}§.h-big .mpr{font-size:10px}',
      '§.h-mg{top:calc(50% + 14px);width:min(340px,92%);min-height:0;padding:5px 10px 5px;border-width:2px;border-radius:8px}§.h-mg .mh b{font-size:12px}§.h-mg .tm{font-size:15px}§.h-mg .mb{min-height:0;gap:4px}§.h-mg .bar{height:22px}§.h-mg .bar.big{height:24px}§.h-mg svg{width:72px;height:72px}§.h-mg .hi{font-size:18px}§.h-mg .hi kbd{width:28px;height:28px}§.h-mg .big2{font-size:14px}§.h-mg .ar{width:40px;height:40px;line-height:40px;font-size:22px}§.h-mg .sq{gap:6px}§.h-mg .dp button{height:30px}§.h-mg .mf{font-size:10px}§.h-mg .vd{font-size:18px}§.h-mg .vd.perfect{font-size:26px}',
      '§.h-tst{position:absolute!important;top:34px;right:6px;left:auto;width:auto;height:auto}§.h-ach{width:auto;max-width:240px;padding:3px 8px;gap:6px;zoom:.62}§.h-ach .ds{display:none}',    ].join('\n').replace(/§/g, 'body.rc-touch #rcgame ') + '}',
    // pantallas de menu/rol/lobby/final (ui.js): mas compactas en alturas bajas
    '@media (max-height:440px){' + [
      '§.chip{font-size:10px}§.lab{font-size:9px}§.rc canvas{width:44px!important;height:44px!important}§.rc>span:not(.mut):not(.tag){display:none}§.rc{padding:.3em .4em;gap:.15em}§.cards{margin-top:.2em!important}§.lobby>.panel,§.lobby.scr>.panel{padding:.5em .8em}§.diff{margin:0}',
      '§.rcard{gap:.35em;width:min(580px,100%)}§.rcard canvas.big{width:56px!important;height:56px!important}§.rcard h1{font-size:clamp(18px,6vh,28px);margin:0}§.rcard .lab{font-size:9px}§.rcard .mut{font-size:12px}§.sbox{padding:.35em .7em}§.sbox .t{font-size:12px;line-height:1.35}§.sbox .lab{font-size:9px;margin-bottom:.2em}§.rcard .btn{min-height:40px}',
      '§.corner .btn{min-height:32px;font-size:9px;padding:.3em .6em}',
      '§.final{gap:.4em}§.grade{font-size:clamp(36px,12vh,56px)}§.fhero .pt,§.fhero .pt canvas{width:72px!important;height:72px!important}§.fhead{font-size:clamp(20px,6vh,30px)!important}§.fhero .mut{font-size:12px!important;margin:.1em 0 .3em!important}§.fates{grid-template-columns:repeat(4,minmax(0,1fr));gap:.4em}§.fate{padding:.3em;gap:.2em;font-size:11px}§.fate .pt canvas{width:56px!important;height:56px!important}§.final .panel{padding:.5em .8em}§.final .row .btn{min-height:40px}',
    ].join('\n').replace(/§/g, 'body.rc-touch #rcv3 ') + '}',
    // botones tactiles del juego (no usan §): sin solaparse entre si ni con la rueda a ~270 px
    '@media (max-height:320px){#rc-tc .top button{width:64px;height:30px;font-size:8px}#rc-tc [data-t=tab],#rc-tc [data-t=esc]{--y:32px}#rc-tc [data-t=j],#rc-tc [data-t=r]{--y:66px}#rc-tc [data-t=t]{--y:100px}#rc-tc [data-k=e]{width:72px;height:72px;font-size:24px}#rc-tc [data-k=jump]{width:58px;height:58px;right:calc(max(12px,env(safe-area-inset-right)) + 84px)}#rc-tc [data-k=q]{width:44px;height:44px;font-size:16px;bottom:calc(max(12px,env(safe-area-inset-bottom)) + 80px);right:calc(max(12px,env(safe-area-inset-right)) + 14px)}#rc-tc .skip{top:34px}}',
    '@media (max-height:320px){' + [
      '§.rcard>.lab,§.rcard>.sbox~.mut{display:none}§.rcard canvas.big{width:44px!important;height:44px!important}§.rcard h1{font-size:18px}§.rcard{gap:.25em}§.sbox{padding:.25em .6em}§.lobby{gap:.3em!important;padding:6px 10px!important}§.lobby h2{font-size:14px}§.lobby>.panel>.mut{display:none}§.lobby .btn,§.lobby .chip{min-height:38px}§.mlist .btn{min-height:40px}§.mod label{margin:.1em 0}§.mod .panel{padding:.3em .9em}§.mod h2{font-size:14px}§.lobby>.panel .lab{display:none}§.rc canvas{width:36px!important;height:36px!important}',
    ].join('\n').replace(/§/g, 'body.rc-touch #rcv3 ') + '}',
    // aun mas bajo (barra de URL visible, ~270 px): las 3 tarjetas caben sin scroll
    '@media (max-height:320px){' + [
      '§.h-pn[data-p] .h-px,§.h-pn[data-p] .h-opt canvas,§.h-pn[data-p] .h-so canvas{width:22px!important;height:22px!important}§.h-pn[data-p] .h-opt .vbtn{display:none}§.h-pn[data-p] .h-opt .wh{-webkit-line-clamp:1;max-height:1.3em}§.h-pn[data-p] .h-opt h3{font-size:12px}§.h-pn[data-p] .h-opts{padding-top:8px}',
      '§.h-pn[data-p] .h-opt .ind,§.h-pn[data-p] .h-so .h-dt{zoom:.75}§.h-pn[data-p]>.h-foot .h-btn{min-height:36px;padding:2px 12px}§.h-pn[data-p] .h-so .vb{font-size:12px}',
      '§.h-pn[data-p] .h-opt,§.h-pn[data-p] .h-so{justify-content:center}§.h-pn[data-p]>.h-pb{padding:3px 6px}',
      '§.h-dlg{bottom:2px}§.dl-box{padding:3px 10px 3px 3px}',
    ].join('\n').replace(/§/g, 'body.rc-touch #rcgame ') + '}',
  ].join('\n');
  D.head.appendChild(css);
  function setU() { D.documentElement.style.setProperty('--u', Math.max(.8, Math.min(1, W.innerHeight / 390, W.innerWidth / 850)).toFixed(3)); } setU(); W.addEventListener('resize', setU);

  var rot = D.createElement('div'); rot.id = 'rc-rot'; rot.innerHTML = '<i></i><span>GIRA EL MÓVIL</span>'; B.appendChild(rot);
  var tc = D.createElement('div'); tc.id = 'rc-tc';
  tc.innerHTML = '<div id="rc-js"><div class="jb"><i data-d="up">▲</i><i data-d="down">▼</i><i data-d="left">◀</i><i data-d="right">▶</i><div class="jk"></div></div></div>' +
    '<div class="top"><button data-t="tab">MAPA</button><button data-t="j">CUADERNO</button><button data-t="t">CHAT</button><button data-t="r">CONVOCAR</button><button data-t="esc">PAUSA</button></div>' +
    '<button data-t="enter" class="skip">SALTAR »</button><button data-k="jump">SALTAR</button><button data-k="q">Q</button><button data-k="e">E</button><button id="rc-fs" aria-label="Pantalla completa"><span class="rc-fsi"></span></button>';
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
  // ruedita flotante: el dedo empieza en cualquier punto de la mitad izquierda inferior; 8 direcciones + zona muerta; borde = correr
  var jz = tc.querySelector('#rc-js'), jb = jz.firstChild, jk = jb.lastChild, jid = null, ox = 0, oy = 0, R = 46, cur = {}, upT = 0;
  function jrest() { var r = jz.getBoundingClientRect(); jb.style.left = Math.max(70, r.width * .16) + 'px'; jb.style.top = (r.height - 80) + 'px'; jk.style.transform = ''; }
  function jset(d, on) {
    if (!!cur[d] === on) return; cur[d] = on; jb.querySelector('[data-d=' + d + ']').classList.toggle('a', on);
    if (d !== 'up') { on ? press(d) : rel(d); return; }
    clearTimeout(upT); if (!on) { rel('up'); rel('jumpj'); return; }
    press('up'); // salto con retraso de 40 ms: si Mateo agarra una cuerda, subir no debe soltarla de un salto
    upT = setTimeout(function () { var E = W.Engine && Engine.current, b = E && E.bodies && E.bodies[E.active]; if (cur.up && !(b && b.climb)) press('jumpj'); }, 40);
  }
  function jmove(x, y) {
    var dx = x - ox, dy = y - oy, d = Math.hypot(dx, dy), k = d > R ? R / d : 1;
    jk.style.transform = 'translate(' + dx * k + 'px,' + dy * k + 'px)';
    var on = d > R * .3, h = on && Math.abs(dx) > d * .38, v = on && Math.abs(dy) > d * .38;
    jset('left', h && dx < 0); jset('right', h && dx > 0); jset('up', v && dy < 0); jset('down', v && dy > 0);
    var run = h && d >= R * .9; run ? press('run') : rel('run'); jz.classList.toggle('run', run);
  }
  function jstop() { jid = null; jz.classList.remove('dn', 'run'); ['left', 'right', 'up', 'down'].forEach(function (d) { jset(d, false); }); rel('run'); jrest(); }
  jz.addEventListener('pointerdown', function (e) {
    if (jid !== null) return; e.preventDefault(); jid = e.pointerId; jz.setPointerCapture(jid);
    var r = jz.getBoundingClientRect(); ox = Math.min(Math.max(e.clientX, r.left + 62), r.right - 62); oy = Math.min(Math.max(e.clientY, r.top + 62), r.bottom - 62);
    jb.style.left = ox - r.left + 'px'; jb.style.top = oy - r.top + 'px'; jz.classList.add('dn'); jmove(e.clientX, e.clientY);
  });
  jz.addEventListener('pointermove', function (e) { if (e.pointerId === jid) jmove(e.clientX, e.clientY); });
  jz.addEventListener('pointerup', function (e) { if (e.pointerId === jid) jstop(); }); jz.addEventListener('pointercancel', function (e) { if (e.pointerId === jid) jstop(); });

  // pantalla completa + horizontal (solo tactil). Android/Chrome: requestFullscreen + orientation.lock; iOS iPhone: sin API, ayuda una vez.
  var de = D.documentElement, rfs = de.requestFullscreen || de.webkitRequestFullscreen || de.mozRequestFullScreen || de.msRequestFullscreen;
  var isFs = function () { return !!(D.fullscreenElement || D.webkitFullscreenElement || D.mozFullScreenElement || D.msFullscreenElement); };
  var ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (/Mac/.test(navigator.userAgent) && navigator.maxTouchPoints > 1), tries = 0;
  function fs() {
    if (isFs()) return;
    if (!rfs) { if (ios) iosHelp(true); return; }
    try {
      var p = rfs.call(de, { navigationUI: 'hide' });
      Promise.resolve(p).then(function () { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(function () { }); } catch (e) { } }, function () { });
    } catch (e) { }
  }
  function iosHelp(force) {
    var seen; try { seen = localStorage.getItem('rc_ios_fs'); } catch (e) { }
    if ((seen && !force) || D.getElementById('rc-ios') || navigator.standalone) return;
    try { localStorage.setItem('rc_ios_fs', '1'); } catch (e) { }
    var h = D.createElement('div'); h.id = 'rc-ios'; h.textContent = 'Toca Compartir → Añadir a pantalla de inicio para verlo a pantalla completa'; B.appendChild(h); setTimeout(function () { h.remove(); }, 7000);
  }
  // el primer gesto del usuario entra en pantalla completa (hasta 3 intentos si el navegador lo rechaza)
  D.addEventListener('pointerup', function (e) { if (tries < 3 && !isFs() && e.isTrusted) { tries++; if (rfs) fs(); else if (ios) iosHelp(); else tries = 3; } }, true);
  tc.querySelector('#rc-fs').addEventListener('pointerup', function (e) { e.stopPropagation(); fs(); });
  D.addEventListener('fullscreenchange', function () { if (!isFs()) releaseAll(); });
  function fsBtn(host, cls) { // boton 'PANTALLA COMPLETA' para menu / pausa (ui.js y la poll de pausa)
    var b = D.createElement('button'); b.className = cls; b.dataset.fs = 1; b.innerHTML = '<span class="rc-fsi"></span>PANTALLA COMPLETA'; b.onclick = function (e) { e.stopPropagation(); fs(); }; host.appendChild(b); return b;
  }

  // visibilidad segun lo que haya en pantalla
  var q = function (s) { return D.querySelector(s); };
  function vis() {
    var g = q('#rcgame'), game = g && g.style.display !== 'none', ui = q('#rcv3 .scr.on, #rcv3 .mod'), hud = q('#rcgame .hud');
    var full = !game || ui || B.classList.contains('rc-dlg') || q('#rcgame .h-mg, #rcgame .h-jr, #rcgame .h-pn, #rcgame .h-big, #rcgame .h-dos.open, #rcgame .h-pause.open, #rcgame .h-hb') || (hud && /\b(modal|dlg)\b/.test(hud.className));
    var chat = q('#rcgame .h-chat.open'), cs = !!(game && !ui && W.Engine && Engine.isCutscene && Engine.isCutscene() && !(W.Net && Net.role === 'client')), show = !!game && !ui && !full && !chat;
    tc.classList.toggle('fs', show && !isFs() && (!!rfs || ios)); D.querySelectorAll('[data-fs]').forEach(function (x) { isFs() && x.remove(); }); var cn = q('#rcv3 .menu .corner'); if (cn && !isFs() && (rfs || ios) && !cn.querySelector('[data-fs]')) fsBtn(cn, 'btn sec'); var pm = q('#rcgame .h-pause.open .h-pm'); if (pm && !pm.querySelector('[data-fs]') && !isFs() && (rfs || ios)) fsBtn(pm, 'h-btn alt'); tc.classList.toggle('cs', cs); if (show && !tc.classList.contains('on')) { tc.classList.add('on'); jrest(); } tc.classList.toggle('on', show || cs); if (!show) releaseAll();
  }
  setInterval(vis, 150);
  W.addEventListener('blur', releaseAll); W.addEventListener('resize', function () { jid === null && jrest(); }); W.matchMedia && W.matchMedia('(orientation:portrait)').addEventListener && W.matchMedia('(orientation:portrait)').addEventListener('change', releaseAll);
  W.RCTouch = { js: function () { jid !== null && jstop(); }, vis: vis, fs: fs, fsBtn: fsBtn, isFs: isFs };
  jrest();
})();
