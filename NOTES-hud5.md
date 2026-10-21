# NOTES-hud5 (agente UI v5) - src/hud.js / src/ui.js
Prueba: `tools/hud5-test.html` (Hud+UI con ASSETS reales y Sound stub) + `tools/hud5-run.js` (node/playwright: `node tools/hud5-run.js <puerto> WxH hud5-test.html '<js>' [png]`).

## Hud: firmas nuevas (todas se pueden llamar antes o despues de Hud.update)
- `Hud.dialogue(lines, opts) -> Promise<void>`. `lines`: `[{who:'lia'|'guia'|'medica'|'ing'|'director', mood, text, name?, title?, radio?}]` (o strings = director). `opts`: `{speed ms/char=26, auto ms (autoavance), skippable=true, onLine(line,i)}`. Se encola si ya hay uno abierto. Clic/Espacio/Enter/Flecha dcha/E avanzan (o completan el texto), Esc o «Saltar» cierra ese dialogo. Mientras esta abierto captura el teclado (capture, stopImmediatePropagation). Retrato 64px*escala entera (vh*0.30, max 320, min 1x) que sobresale por arriba; `Sound.talk(who,mood)` cada 2 letras (si no existe: sfx `typing`); `dialogue_open` al abrir. Lia = caja verde de radio.
- `Hud.isDialogue()`, `Hud.skipDialogue()`, `Hud.onDialogue(f(open:bool))` (para que main congele el mundo durante la escena).
- Mapa mood->imagen (`faceInfo`): `neutral|calma|talk`->hoja 0 (talk usa ademas `_talk` al escribir), `alert`->`portrait_<rol>_alert`, `hurt`->`_hurt`, `angry|enfadado`->hoja 2, `happy|feliz`->hoja 3, `worried|preocupado|tension`->hoja 1. Si falta la imagen suelta cae a la hoja (director solo tiene hoja fw=48). Mismo mapa en chat, panel «hablando ahora», panel izquierdo (Salud<30 -> hurt) y dialogo.
- Chat: cada mensaje con retrato 48px segun `msg.mood` (defecto `talk`; radio `alert`); grupo nuevo si cambia autor o mood. `kind:'share'` = tarjeta («HAS COMPARTIDO · titulo» + texto + fiabilidad); sin `card` usa `text`. Compartir desde el cuaderno abre el chat. Panel «hablando ahora» sobre el chat (retrato 128px, 96 si alto<760) con ultimo chat/share/radio.
- `Hud.setQuick([{label,text}])` (max 6 chips; clic envia `text`, `title`=text; null/[] vuelve a defecto). `Hud.setChips(strings)` sigue.
- `Hud.setNow({text, why, sub|hint, kind, progress})`: UN objetivo («AHORA», titulo, «Por que: why», sub). Ya no hay «Esperando al equipo» ni banner forzado por AP.
- `Hud.setMission({title, steps:[{text,done}]})`: SOLO cuaderno (pestana OBJETIVO). Sin chips de pasos.
- PUNTOS quitado de la barra superior. Tooltips (hover/foco + `title`) en AGUA/SALUD/MATERIAL/CONFIANZA: usan `Story.statusLabels[k].tip` si es texto >25 car., si no el texto por defecto (que pasa a 0).
- `Hud.setAir(v|null)`: pastilla bajo el banner (visible mientras v!=null); rojo pulsante + «¡SIN AIRE!» si <25 (sonido `water_warn` al cruzar).
- `Hud.setAbilities({key:'Q',label,hint,ready}|null)`, `Hud.onAbility(f())`. El Hud NO escucha la tecla Q (la lee main/motor); el boton solo llama al callback (ready:false lo deja atenuado y reproduce `error`).
- `Hud.setHelp([{role,label,enabled,hint,gateId}]|null)`, `Hud.onAsk(f(role, gateId))`: fila «PEDIR AYUDA».
- `Hud.setReady({label,tip,after,pulse,disabled})`: etiqueta defecto «Convocar reunión»; tras pulsar muestra «Reunion convocada. Sigue explorando» (no bloquea, R sigue valiendo).
- `Hud.reset()` limpia aire/habilidades/ayuda/quick/dialogo.

## UI (ui.js)
- Tutorial nuevo de 6 pasos (canvas 224x140 a 2x, sprites reales de ASSETS: player_*, tiles, props, poi_icons, portraits, water_tile): 1 mover/saltar (A D flechas Espacio), 2 E examinar con el cartel real y tarjeta, 3 objetivo+flecha+metros, 4 chat/radio con caras y compartir, 5 Q y «Pedir a Iván: puente», 6 agua/aire, Convocar reunion y voto.
- Intro: solo historia; se filtran lineas con controles/rol (si quedan <6 usa siete vinetas propias + titulo).
- Ajustes: slider «Volumen general» -> `Sound.setVolume` (guardado en `rcv3_set.vol.master`).

## No verificado
Integracion real con main.js (llamadas a Hud.dialogue/setQuick/etc. son del agente MAIN), audio real, movil real (solo captura 390x800: el banner largo se parte), dialogos con >4 lineas de texto, Hud.dialogue con partidas en red.
