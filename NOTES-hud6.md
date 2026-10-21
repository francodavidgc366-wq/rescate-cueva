# NOTES-hud6 (agente UI v6) - src/hud.js / src/ui.js
Toda la API v5 se mantiene. Prueba: `tools/hud5-test.html` (Hud) y `tools/ui-test.html?real=1&dev0=1` (UI.showFinal).

## Hud: firmas nuevas
- `Hud.say({who, mood, text}, {ms=4500})`: popup abajo-centro (retrato 64px enmarcado + nombre + max 2 lineas). Max 2 a la vez (el mas viejo se sustituye). Boca talk/neutral alterna ~1.2s. No sale con dialogo abierto ni en pausa. Con un panel modal (plan/secreto/resultado) sube bajo el banner. main debe llamarlo por cada mensaje nuevo de chat de IA/Lia (el chat YA NO muestra el panel grande «habla ahora»; se elimino).
- `Hud.setCoach({step,total,text}|null)`: cartel naranja grande (texto 24px, «PASO n DE total», pulso y flecha ▼) bajo la barra. Con coach activo se oculta el banner `setNow`. Al cambiar `step` (o al pasar a null tras el ultimo paso): destello + `Sound.sfx('confirm')`.
- `Hud.dialogue(lines, opts)`: misma API/teclas/typewriter. Caja morada con filigrana en esquinas, retrato en marco redondeado (pop en cada linea, rebote mientras escribe, `_talk`/neutral alternando si mood neutral/talk, expresion segun mood). Retrato a la izquierda si habla Lia/director/tu rol, a la derecha si no.
- `Hud.update`: `plan.ask` (pregunta) y `plan.options[i] = {id,title,what|text,gain,risk,effects,known}`. `gain`/`risk`: string | array de (string | {icon,text} | {stat,n}) | mapa {stat:n}. Si no hay gain/risk usa `effects` {stat:n} (flecha por signo, verde=bueno). «Tu info privada» sale como «Tú sabes:» (`priv.planHints[id]` o intel con `about`). Cabecera: pregunta + «Vota con 1, 2 o 3. Gana la mayoría.». Secreta: «Ahora decide en secreto qué haces tú. Nadie lo verá hasta el final.»
- `Hud.showResolve(res)`: si `res.explain = {headline, lines:[{icon,text,delta}], why:[...]}` -> pantalla de resultado (titular, linea causa->efecto con icono + delta animado, «POR QUÉ»). Boton CONTINUAR visible desde el primer instante; Espacio/Enter/clic avanzan (tambien en el camino sin explain). Sin temporizador ni auto-cierre; el reloj superior muestra «--» en resolucion; el banner no se muestra en `resolve` salvo con panel abierto ni mientras hay panel plan/secreto.
- `Hud.setAir(v|null)`: pastilla grande «AIRE» + barra bajo el banner; <25 rojo + viñeta roja pulsante en bordes.
- `Hud.floatText(txt,type,where)`: sin `where` objeto {x,y} se apila (max 3) en la pila de toasts bajo el banner, ya no solapa.
- `Hud.setAbilities(null)` o `{ready:false}` sin `hint` -> oculto. `Hud.setQuick` y chips: max 3.
- `Hud.setReady`: etiqueta defecto «HABLAR CON EL EQUIPO Y DECIDIR», tip «Cuando estés listo, el equipo se reúne para votar el plan»; solo se ilumina (teal+pulso) con `pulse:true`, si no queda apagado.
- Tecla M: mostrar/ocultar minimapa (auto: se muestra si `RC.eng().getZone()>=2`).

## Menos ruido
Barra superior: ZONA n/5, nombre del evento/zona, reloj, 4 recursos con icono 26px (se quitan pips y nombre de fase). Panel izquierdo mini («TÚ»: avatar + 3 acciones; clic en cabecera = expandir con objetivo/equipo). Dock: CUADERNO, ?, II (se quito OBJETIVOS; O sigue ocultando el panel). Chat: compacto (≈190-230px, solo historial con avatares 28px) por defecto; T, clic en cabecera o foco del input lo amplian (input + max 3 chips). Ayudas automaticas de fase desactivadas (H las abre; el texto de H incluye «Shift = correr»).

## Chat/compartir
`kind:'share'` propio siempre se pinta como tarjeta («HAS COMPARTIDO»). Clave de dedupe de shares = from+texto de la tarjeta. Al compartir desde el cuaderno se abre el chat, se hace scroll/resalte del mensaje y, si main no devuelve el mensaje en 450 ms, el Hud lo anade (sin duplicar si llega luego con el mismo texto).

## ui.js
Tutorial paso 1: «mantén Shift para correr más rápido». `UI.showFinal(result, state)`: titular grande («Lía está a salvo» / «No habéis llegado a tiempo»), «DESTINO DE LAS PERSONAS» con tarjetas que aparecen una a una (`sfx('tick')`) desde `state.final.fates` (o `result.fates`/`result.final.fates`) = `[{id,name,portrait?,status:'vivo'|'herido'|'muerto',why}]`, «Salvasteis a N de M» (N = vivos + heridos), luego nota, puntuacion, logros. Retrato: `<base>_dead` / `<base>_hurt` / hoja (vivo = ultima expresion, herido = preocupado); base = `f.portrait` o `portrait_<rol>` / `pers_<id>`; si falta imagen cae al generico o a la inicial. Muerto en gris con vela CSS, tono sobrio. La cabecera lia/lia-salvada se decide por el estado de `lia` (si no hay fates, por `result.saved`).

## No verificado
Integracion real con main.js (llamadas a say/setCoach/explain), audio (`confirm`/`tick` con Sound real), movil (<=820px), 1920x1080 y 1366x768 solo parcialmente (visto en 1280x650 y 1366x768/900), assets `pers_*`/`_dead` reales (probado solo con fallback), minimapa (M) con motor real, resolucion en el camino antiguo (sin explain) tras los cambios, partidas en red.
