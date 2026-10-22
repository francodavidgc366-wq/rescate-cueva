# NOTES-touch18: jugar entero desde movil/tablet

## Que hay
- `src/touch.js` (nuevo, ultimo en `build.sh`): detecta `(pointer:coarse)` / `ontouchstart` / `?touch=1` -> `body.rc-touch`. Solo entonces crea:
  - `#rc-tc` overlay (z 40): cruceta ◀ ▶ (un solo pad, el dedo puede deslizar de un lado a otro; doble toque = Shift mientras se mantiene), CORRER (toggle Shift), SALTAR (Espacio), E (grande), Q; columna izquierda MAPA(Tab) / CUADERNO(J) / CHAT(T), derecha CONVOCAR(R) / PAUSA(Esc); boton SALTAR » (Enter) durante cinematicas de viaje del motor.
  - Todo son `KeyboardEvent` keydown/keyup reales sobre `document.body` (bubbles) con la misma `key` que ya lee main.js/hud.js/engine.js. Pointer events + `setPointerCapture`, `touch-action:none`, sin retardo. Multitactil real (cada control su pointer).
  - Visibilidad (poll 150 ms): oculto con menu/pantallas UI, dialogo (`rc-dlg`), minijuego, paneles plan/secreto/resultado/diario, cuaderno, mapa grande, pausa, chat abierto. Al ocultarse suelta todas las teclas.
  - Aviso `GIRA EL MOVIL` (icono pixel animado) a pantalla completa en vertical (CSS `orientation:portrait`, z 9999). Solo TAPA: el reloj de la partida sigue corriendo (no se pausa).
  - Sin zoom doble toque / rebote (`overscroll-behavior`, `touch-action:none` solo en `#rcgame`/overlay; menus siguen con pinch), `user-select:none`, `contextmenu` desactivado (salvo inputs).
- Layout: `engine.fit` llena la pantalla con escala fraccional si `rc-touch`; `main.js fitG()` descuenta `env(safe-area-inset-*)` (padding de `#rcgame`; el HUD lleva su propio padding safe-area). `viewport-fit=cover` en build.sh.
- HUD compacto (CSS en touch.js, solo `rc-touch`): barra superior de una fila (zoom .6 en el camino, 4 stats con icono+numero+barra fina), coach/mision mas bajos, sin minimapa/dock/boton convocar/ayuda de Tab/panel "TU" (sustituidos por los botones tactiles), chat colapsado por defecto y, con CHAT, panel superpuesto arriba a la derecha (input 16px, chips >=40 px). Paneles plan/secreto compactados y con scroll interno.
- `hud.js`: `tch()` cambia textos de teclado en movil (coach «Muévete con ◀ ▶», «Toca E…», pie del minijuego «TOCA AL ACERTAR» etc.); minijuego: `pointercancel` suelta el "hold".
- `ui.js`: bloque `css18` para alturas <=520 px (menu en 2 columnas con scroll, modales y tutorial compactos, botones >=44 px). Escritorio (>520 px de alto) intacto.
- `tools/touch18-run.js` + `docs/touch18/p*.js`: recorrido Playwright (`node tools/touch18-run.js <puerto> 844x390 <dir> [script-etapa]`; usa `RC.advance()` para saltar fases).

## Verificado (Playwright/Chromium emulado, hasTouch+isMobile, dpr 2)
Capturas en `docs/touch18/` (sufijo = viewport): 01menu, 02ajustes (scroll interno), 03 "Primera vez", 04_Empezar (rol), 04_Revelarmisecreto/Entendido, 04_Saltar (intro con Saltar »), 05juego, 06explore, 08/09 POI + minijuego timing resuelto tocando la caja, 12/12b chat abierto con chip, 13mapa (X para cerrar), 21plan/22 voto (tocando tarjeta), 23/24 secreto + SELLAR, 25/26 resolucion + CONTINUAR, 27/30 diario con SIGUIENTE TRAMO (scroll por swipe), 32 cuaderno, 40 cinematica + SALTAR », 41 vertical (aviso).
- ▶ mantenido mueve a Mateo (x 136 -> 255 en 1.2 s), SALTAR cambia y; E junto al POI abre el minijuego; tocar avanza el dialogo.
- 844x390, 740x360 y 667x375: sin scroll horizontal (scrollWidth==innerWidth); menu, juego, plan y secreto sin cortes ni solapes (el plan hace scroll interno: las tarjetas altas pasan bajo el pie fijo).
- Escritorio 1280x720 sin touch: captura antes/despues (`desk__before_*` vs `desk_index_*`): mismo layout; no hay `#rc-tc`, canvas 1280x720.
- `./build.sh` y `node tools/story-test.js` = OK.

## NO verificado
- Dispositivos reales (iOS Safari/Android Chrome): teclado virtual sobre el input del chat, safe-area real con notch, latencia, `setPointerCapture` en Safari antiguos.
- Multijugador (host/cliente) con controles tactiles; el flujo de final/creditos y lobby no se recorrio en movil (solo reglas css18 genericas).
- Hold del minijuego con dedo mantenido: solo logica pointerdown/up/cancel revisada, no probado con gesto largo; mash/sequence no ejecutados con toques (solo timing).
- Pausa real con el aviso vertical (solo tapa).
- Textos del story.js que mencionan teclas (p.ej. mision/ayuda) siguen diciendo "E/T/J" fuera del coach; story.js no se toco.
