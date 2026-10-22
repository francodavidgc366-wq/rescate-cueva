# NOTES-touch20: responsive en pantallas bajas (alto <= 440 px)

Origen: prueba real en Android/Brave horizontal (~850x390 a pantalla completa, ~850x270 con barra de URL). "Muchas cosas muy grandes, no se aprecia ni se entiende".

## Donde esta
- Todo el CSS nuevo vive en `src/touch.js` (array `css`, bloques `@media (max-height:440px)` y `(max-height:320px)`), siempre bajo `body.rc-touch` -> el escritorio no cambia (sin touch no se aplica nada).
- `--u` = clamp(.8, min(h/390, w/850), 1) puesto por JS en `<html>` (`setU`, en resize). El HUD usa `--h-fs: .78*--u` (todo lo que ya era `calc(Npx*var(--h-fs))` baja solo); "Texto grande" del menu de pausa sigue funcionando (`.hud.big` -> .95).
- `src/hud.js`: solo `dlgScale()` (retrato del dialogo = 60 px si alto <= 440 y `rc-touch`; antes 96-192).
- `ui.js` y `story.js`/`engine.js` NO tocados. Las reglas de menu/rol/lobby/final (#rcv3) tambien estan en touch.js.

## Que se corrigio (por estado)
- Barra HUD: 30 px (24 a 270), una fila; cartel de mision/coach de una linea (sin `.w`); `.h-gd` sin el padding de 22 px: la escena queda entre 80 % (270) y 84 % (390) del alto (medido con `Hud.getInsets()`).
- Dialogo: retrato 60, texto 14, max 30 % del alto, caja opaca (antes se transparentaba el rotulo del motor "DESCENDIENDO POR EL POZO"), esquinas con safe-area (el HUD ya las lleva). Los controles tactiles estan ocultos durante el dialogo (verificado, `#rc-tc` display none).
- Tarjeta de viaje: sube arriba (bajo la barra), una fila de 30 px, opaca; el cartel `.h-now` se oculta mientras hay `.h-trv` (`:has`). Ya no puede quedar bajo el dialogo.
- Diario: hoja a todo el alto, texto manuscrito 17 px (antes 26), `--jl` 21, cuerpo con scroll propio y pie fijo (`.h-jf`, flex:none) con barra de camino + "Faltan N tramos" + SIGUIENTE TRAMO (40 px). El texto termina encima del pie.
- Plan / secreta / resultado / resumen / evento: panel = columna flex (cabecera de una fila + cuerpo con scroll + pie propio). 3 tarjetas en 3 columnas (titulo, frase, puntos de velocidad/riesgo, chips); a <= 320 px se ocultan los "VOTAR" internos y las tarjetas caben sin scroll. Pie con VOTAR/SELLAR/CONTINUAR/CHAT (>= 36-40 px) sin solapar. Con panel modal se oculta `.h-gd`. Toast de logro compacto (zoom .62) arriba a la derecha.
- Chat abierto: 380 px de ancho, bajo la barra, texto 12.5, chips 32 px. Mapa (TAB): centrado bajo la barra, canvas con max-height proporcional (no se corta a 270). Cuaderno (J), pausa (2 columnas), tarjeta ENCONTRASTE (arriba, 1 bloque), minijuegos (timing/mash/hold/sequence, tarjeta 340 px max).
- Menu/rol/lobby/final (ui.js, via touch.js): tarjetas de rol con retrato 44 y sin la linea de habilidad, "ERES X" con retrato 56 y cajas compactas, final con portadas de 72/56 px, nota 36-56 px, 4 columnas de destinos, botones esquina del menu 32 px.
- Botones tactiles a <= 320 px: MAPA/CUADERNO/CHAT y PAUSA/CONVOCAR mas bajos y pequenos, E 72, SALTAR 58, Q 44: no se pisan entre si ni con la rueda.
- Tamano minimo: etiquetas de fuente pixel (Press Start) auxiliares 9-10 px; textos de lectura >= 11 px. (Auditoria automatica en `run.js`; quedan solo etiquetas pixel de 8-9 px y elementos ocultos.)

## Verificado (Playwright/Chromium, isMobile+hasTouch, dpr 2; guiones en el scratchpad de la sesion, no en el repo)
Tamanos 850x390, 850x270, 740x360, 667x375. Estados: menu, ajustes, logros, "Crear sala" (pide nombre), tutorial, rol solo, "ERES X" (antes/despues de revelar), juego, dialogo, chat abierto, mapa, cuaderno, pausa, ENCONTRASTE, 4 minijuegos, plan, secreta (con tarjeta marcada), resolucion, diario (mecanografiandose / completo / scroll al final), viaje real (`RC.advance`) con y sin dialogo, cinematica de final (`UI.playEnding`) y `UI.showFinal` (TU CAMINO / DECISION FINAL, destinos, nota, estadisticas).
- Escritorio 1280x720 sin touch, antes/despues: menu identico al pixel (0.00 %), "primera vez" y diario <= 0.6 % (fondo animado y texto aleatorio del diario); en juego/dialogo/plan/secreta/resolucion solo cambia el contenido aleatorio (chat, orden de tarjetas, mundo); mismo layout.
- `./build.sh` + `node tools/story-test.js` = OK.

## NO verificado
- Dispositivo real (Brave/Android): safe-area real, la barra de URL cambiando el alto en vivo, teclado virtual con el chat, rendimiento de `zoom` y `:has`.
- Minijuegos jugados con dedo (solo se pintan; mash/hold/sequence no se ejecutaron con toques). Multijugador (host/cliente) y lobby con QR real (solo el modal de nombre).
- Escritorio con ventana baja sin touch (alto <= 440): no se toca (las reglas son solo `rc-touch`).
- Texto "Texto grande" en movil solo por lectura de CSS.
