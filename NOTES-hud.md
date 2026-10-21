# NOTES-hud (agente UI-B) - src/hud.js -> `window.Hud`
Prueba: `python3 -m http.server P` y `tools/hud-test.html?go=explore|explore_urgent|briefing|plan|plan_chosen|secret|resolve|summary|dossier|lie|secreto|ach|float|pause|help|waterup&dev0=1` (`&real=1` carga assets.js). Sin dependencias; usa `Sound.sfx`, `ASSETS`, `Story.achievementsList` si existen. Verificado 1280x720 y 390x780. CSS inyectado (variables `--h-*` en :root, `--h-fs` escala de texto).

## Integracion minima (main.js)
```js
Hud.mount(document.getElementById('game'));          // contenedor position:relative; el HUD es pointer-events:none salvo sus controles
Hud.onChat(text=>...); Hud.onShare((cardId,{asIs,text})=>...); Hud.onVote(optId=>...); Hud.onSecret(idx=>...); Hud.onReady(()=>...);
Hud.onExit(()=>menu); Hud.onSettings(()=>UI.openSettings()); Hud.onPause(open=>..); Hud.onFx((t,i)=>Engine.camShake(i)); // 'shake'
Hud.onChatFocus(b=>{ if(b) Engine.setInput(role,{}) });  // al escribir en el chat suelta teclas de movimiento
Hud.onTyping(()=>Net.send('typing'))                     // el local empieza a escribir (max cada 2.5 s)
Hud.update(pubState, myPriv, myRole);  // en CADA cambio de estado (y ~1/s con tleft). Detecta cambios de fase/tramo solo
```
`update` hace todo lo persistente: barra superior (tween de recursos con easing, destellos, numeros flotantes, aviso+shake al cruzar agua 50/75/90), reloj local suave (tick/tick_urgent los ultimos 10 s), objetivos, equipo, POIs, abre/cierra paneles segun `phase` (briefing->tarjeta de evento, plan, secret), sincroniza `pub.chat` (dedup por `id`; `Hud.chat.add` es opcional), ayuda contextual la 1a vez de cada fase. NO hay eco optimista del chat: el mensaje aparece cuando llega por estado/`chat.add`. `showPhase(phase,data)` fuerza una transicion manual (data: `{tleft, event, expect}`).
resolve/summary se abren con `showResolve/showSummary` (llamalos al entrar en esas fases; si el panel ya esta abierto `update` no lo cierra). Actualiza el estado (nuevos recursos) justo al empezar la resolucion para que las barras se muevan a la vez.

## Entradas
```js
pub = {phase,round,tleft,s:{agua,salud,material,confianza},score:{total,...},event:{id,title,text,art:'event_derrumbe',radio},
  pois:[{id,label,icon,kind,used,by}], plan:{options:[{id,title,text,known}],votes:{guia:'B'},chosen:null,tiebreak?:'texto'},
  players:{guia:{name,ready,ap,connected,ai}}, chat:[{id,t,from,kind,text,card?:{title,text,reliability}}], hallazgos:2, mission?:'texto'}
priv = {goal:{text,stat,min,points}, secret:{text,revealed}, ap, intel:[{id,round,title,text,reliability(0-1|0-100),shared,icon?,about?:[optId]}],
  secretOptions:[{title?,text,kind:'team'|'goal'|'risk',risk:1-3|'bajo|medio|alto',reward?,hint?}], secretPick:null|idx, planHints?:{optId:'lo que sabes tu'}}
Hud.showResolve({narrative, rolls:[{label,roll,need,ok?,detail?}] (0-1 o 0-100), reveals:[{kind:'lie'|'secret'|'good',role,text}],
  delta:{agua:12,salud:-8,..}, scoreDelta:number|{equipo,info,..}, achievements:['id'|{id,title,text}]}) -> Promise (boton CONTINUAR o auto 7 s)
Hud.showSummary({round, score:{equipo,info,honestidad,riesgo} | cats:[{label,pts,note,icon}], notes2:{equipo:'..'}, roundTotal?, total, notes:[..], achievements, last}) -> Promise
Hud.achievement(a|id)  Hud.floatText(txt,'good|bad|score|info', 'agua'|'score'|{x,y})  Hud.chat.add(msg)  Hud.chat.typing(role,bool)  Hud.chat.clear()
```
Extras: `show/hide/reset`, `setChips([...])` (chips de respuesta rapida; por defecto segun fase), `openDossier(tab)/closeDossier`, `help()`, `shake/flash/sparks/note`, `openPause/closePause`, `setOptions({big,contrast,noflash,help})` (persisten `rcv3_hudopt`), `resetHelp()`, `isTyping()`.

## Teclas (no chocan con el juego; se ignoran si escribes en un input)
`T`/Enter chat, `J` cuaderno, `H` ayuda, `Esc` cierra cuaderno/ayuda o abre pausa, `1-3` votar plan / elegir accion secreta (repetir = sellar), `R` LISTO en explore. WASD/flechas/Espacio/E no se tocan.

## Notas / limites
- Iconos/retratos/trofeos/event art de `ASSETS` con fallback emoji (en el sandbox sin fuente emoji se ven cuadrados; en navegador real bien). Formato esperado de hojas: `icons` (meta.names[] u `index{}`, cell/cols), `portrait_<rol>` (fw, 4 expresiones horizontales neutral/preocupado/enfadado/feliz), `trophies` (names/index por id de logro), `poi_icons`. Si ART usa otro layout, ajustar `icon()/portrait()/trophy()`.
- Movil (<=820px): chat = hoja inferior colapsable, objetivos tras boton OBJETIVOS.
- Pausa NO detiene el juego (multijugador); main decide via `onPause`.
- Sin escuchar el audio; sin probar con story.js v3 real (aun no existe): campos de `priv/pub` segun SPEC-v3.
