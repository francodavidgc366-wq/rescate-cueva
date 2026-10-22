# NOTES-touch21: chat, minijuegos, cuaderno, fin de tramo y controles (Android real, horizontal)

Origen: capturas del usuario (chat ocupa media pantalla; el teclado virtual tapa el chat) y 5 pedidos. Archivos: `src/touch.js`, `src/hud.js`, `src/main.js` (story.js y ui.js NO tocados). Todo el CSS nuevo va bajo `body.rc-touch` (escritorio igual).

## 1) Chat
- Panel mas estrecho (330 px / 44 vw), sin avatares, texto 13.5, chips grandes a todo el ancho (42 px, 34 a <=320 de alto), campo + ENVIAR (44 px) siempre abajo.
- Cabecera con X roja grande (`.h-cx`, boton nuevo en hud.js; `display:none` en escritorio). Tocar fuera del chat lo cierra (touch.js, pointerdown en captura, `Hud.closeChat()` nuevo).
- El boton CHAT de la izquierda sigue visible con el chat abierto y pasa a "X CERRAR" (`#rc-tc.chatop`; solo ese boton). La tecla T en tactil abre/cierra (hud.js) y YA NO enfoca el campo al abrir (antes sacaba el teclado solo). Se oculta ese boton si el cuaderno esta abierto (el cuaderno tapa esa columna).
- Teclado virtual: `kbd()` en touch.js. Con el input del chat enfocado y `min(visualViewport.height, innerHeight) < 80 %` del alto base -> `body.rc-kb`, y `--vvt/--vvh` (visualViewport.offsetTop/height; eventos resize/scroll). CSS: el panel pasa a `position:fixed` ocupando solo el viewport visual (cabecera 30 px + ultimos 1-2 mensajes + barra de escribir), sin chips, y los controles tactiles se ocultan. Al cerrarse el teclado vuelve a lo normal.

## 2) Minijuegos
- Con `rc-touch`, `Hud.minigame` crea una capa `.h-mgcap` (fixed, pantalla completa, z 59, bajo la tarjeta): pointerdown = Espacio/E (`press`), pointerup/cancel = soltar (hold = mantener el dedo en cualquier sitio; mash = cada toque; timing = un toque). Sequence: la capa no cuenta; flechas grandes (56 px, 44 a <=320) y los toques fuera no interfieren. Se retira al acabar. Los primeros 120 ms no cuentan (igual que el teclado).
- Cancelar: boton X en la cabecera de la tarjeta (`.mgx`, solo tactil) -> "Cancelado". Textos de ayuda tactiles ("TOCA EN CUALQUIER PARTE", "MANTEN EL DEDO EN LA PANTALLA").

## 3) Cuaderno (J / CUADERNO)
- Pestaña INTEL -> PISTAS. Tarjetas: titulo, sello NUEVA (rojo) y sello "CONTADA" (verde, inclinado), barra + etiqueta de fiabilidad (FIABLE/PROBABLE/DUDOSA), texto (2 lineas en tactil), "Sirve para:" (1 linea), boton grande "CONTAR AL EQUIPO" (reutiliza `share`; si ya estaba contada: "CONTAR OTRA VEZ" en tono apagado) y "con cambios" discreto (reutiliza `edit` -> `sendlie`, intacto). X de cierre roja 44 px. Al contar se abre el chat y el cuaderno se estrecha para no taparse.
- Escritorio: misma estructura de tarjeta (cambio coherente minimo: sellos en linea, boton grande); sin CSS tactil.

## 4) Fin de tramo
- Clientes: `Hud.showSummary({wait:true})` -> boton desactivado "Esperando al anfitrion…", `_end` ignorado (clic, Espacio y Enter no avanzan). El diario (host/solo) no cambia.
- El host, al pulsar SIGUIENTE TRAMO, envia `Net.broadcast('phase',{travel:1})` justo tras `Story.advance` (el viaje dura 8-11 s antes del siguiente `push`): los clientes cierran el resumen y ven "Viajan a la siguiente zona". Luego el flujo normal (state del nuevo tramo). Solo: sin cambios. "El anfitrion se ha ido" sin cambios.

## 5) Controles tactiles
- La rueda ya no manda salto: arriba = `ArrowUp` (trepar cuerdas/pared) sin Espacio. Salto solo en SALTAR.
- E: 104 px (82 a <=320), esquina inferior derecha (10 px de margen). SALTAR 60 px (50) a su izquierda, Q 56 px (44) encima de E. Medido a 850x390: E x736-840 y276-380, SALTAR x664-724 y318-378, Q x760-816 y208-264 (huecos de 12 px, sin solape con PAUSA/CONVOCAR ni la rueda).

## Verificado (Playwright/Chromium, isMobile+hasTouch, dpr 2, 850x390 y 850x270; guiones en el scratchpad)
- Chat: abrir con CHAT, el boton pasa a CERRAR, cerrar con ese boton / con la X / tocando fuera; teclado simulado con `page.setViewportSize` (altura 45 %) tras tocar el input: `rc-kb` activo, input visible (bottom 169 de 176 y 115 de 122), escribir + Enter, volver a normal.
- Minijuegos disparados con `Hud.minigame` y tocados con CDP `Input.dispatchTouchEvent` en puntos arbitrarios: hold (clase `hld` mientras dura el dedo), mash (perfect), timing (ok), sequence (toque fuera no cuenta), cancelar con X.
- Cuaderno con tarjetas reales + falsas (NUEVA / CONTADA), CONTAR AL EQUIPO publica la tarjeta en el chat.
- Multijugador real: host + cliente (PeerJS real, dos contextos): cliente ve "Esperando al anfitrion…" desactivado, clic/Espacio/Enter no avanzan; el host avanza con Espacio y ambos llegan al tramo 2.
- Escritorio 1280x720 sin touch: sin `rc-touch`, `.h-cx` oculto, cuaderno y chat se pintan.
- `./build.sh` + `node tools/story-test.js` = OK.

## NO verificado
- Teclado virtual real de Android (solo simulado cambiando el viewport; `visualViewport.offsetTop` != 0 y modo "resizes-content" no probados), dispositivo real, multitoque real (rueda + E + minijuego a la vez), que la rueda hacia arriba no salte (solo por lectura de codigo: ya no hay `jumpj`).
- Capturas 850x270 del cuaderno muestran 1 tarjeta a la vez (scroll); la X de cierre del chat en 270 no se probo con muchas lineas.
