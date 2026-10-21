# NOTES-ui (agente UI) - src/ui.js -> `window.UI`
Prueba: `tools/ui-test.html` (stubs; `?real=1` usa assets.js/story.js reales; `?go=title|lobby|intro|agua|relampago|linterna|decision|hud|win|lose|settings`; `dev0=1` oculta la barra de pruebas).
Escalado entero: `k=floor(min(w/320,h/180))`; fuentes/bordes en CSS con `--k/--p`. Fuente Press Start 2P (Google Fonts, fallback monospace). Todo el audio se genera por codigo.

## API (en `UI` y en `UI.api`)
- `showTitle()` (usa `Engine.demoLoop(UI.gameCanvas())` si existe; si no, panorama propio / `sky_layers`), `showLobby()`, `showFinal(state)`, `toast(msg)`, `openSettings()`.
- `playCinematic(id[,{text,who,round}])` -> Promise al terminar (Espacio/Enter/clic avanza, Esc salta). ids: `'intro'` (lee `Story.intro`, array de strings u objetos `{text,who}`; 1 vineta = 1 plano; anade plano de titulo), `'agua'|'relampago'|'linterna'` (~5 s, con una linea de `Story.dialogue`), `'ronda2'|'r3'|2` (mapea: 1 linterna, 2 agua, 3 relampago, 4 agua, 5 linterna).
- `gameCanvas()` -> `<canvas 320x180>` escalado y centrado: pasarlo a `Engine.create`. `updateHud(state)` lo muestra (modo juego) y pinta barras, ronda, 3 retratos, radio (rota `Story.dialogue(round)`). `showGame()`, `hideAll()`.
- Personajes: retratos clicables (Q/Tab/E tambien; Tab/E siguiente, Q anterior; no en el panel de decision). Activo resaltado; etiqueta TU / TUYO / nombre del otro humano / IA segun `state.players[rol].owner` vs `UI.setLocalId(id)` (por defecto `Net.localId`). `UI.onSwitch(cb(role))` se llama al cambiar; no se puede elegir uno con otro humano. `UI.setActive(role)`, `getActive()` (o `state.active` en updateHud).
- Decision: `showDecision({role,scene,private,options},onPick(idx,role),{state,keep})` - `private` string (o objeto por rol) y `options` array (o objeto por rol); SOLO muestra la info privada de `role`. Opciones con `req` no cumplido (vs `state.s`) deshabilitadas; teclas 1-3. `UI.decide(state,onPick(role,idx),onDone,[roles])` encadena el panel por cada personaje sin pick que controle este humano (todos en solitario). `hideDecision()`.
- `say(text,who)` caja de radio. `lobbyUpdate({players,code,link,mode})`.
- Eventos `UI.on(ev,fn)`: `play`, `role`(rol inicial), `start {role,host,solo}`, `ready`, `host`, `join`, `restart`, `menu`, `key`, `mute`. El lobby llama a `Net.host/join/setRole/leave/send('ready')` por si mismo y escucha `Net.on('players')`; main solo reacciona a `start`/`restart`.
- Audio: `UI.audio` / `UI.sfx(name)`: jump land water decision select click back error blip drip radio flick thunder win lose cable. `UI.audio.setTrack('title'|'intro'|'r1'..'r5'|'win'|'lose')` (updateHud lo hace por ronda), `setMute/toggle/setVol/wind`. Mute y volumen persisten en localStorage (`rcv2_mute`, `rcv2_vol`); clave en `rcv2_key` (+ `Story.setKey`). Se desbloquea en el primer gesto del usuario.
- Assets usados si existen: `cablecar` (planos cercanos), `sky_layers` (fondo del titulo), `ui_frame` solo como variable CSS `--frame` (clase `.box.fr`, no usada por defecto).

## Limites
Sin escuchar el audio (solo verificado que no da errores). Efectos de `req` no se muestran (info oculta). Cambio de personaje NO mueve camara: lo hace Engine.setActive (main conecta `onSwitch`).
