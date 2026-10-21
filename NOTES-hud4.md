# NOTES-hud4 (agente UI v4) - src/hud.js / src/ui.js
Layout: `.hud` = CSS grid a pantalla completa (areas top / left-mid-chat / bar). Barra superior flex-wrap (<=1100px oculta etiquetas de barras), zona central `.h-mid` (banner + pasos + toasts bajo la barra + escenario de modales + cuaderno + minimapa 160x64 abajo-izq), chat a la derecha `clamp(272px,24vw,340px)` (minimizable a 48px), panel de objetivos a la izquierda (compacto por defecto; clic en cabecera = expandir; tecla/boton `O` = ocultar), barra inferior con boton principal + dock. Nada con ancho fijo que desborde. Movil (<=820px o <=520px alto): una columna, chat y objetivos como hojas.

## Contratos nuevos (llamar DESPUES de Hud.update en cada render)
```js
Hud.setNow({text, sub, kind, progress:{done,total}} | null)   // banner grande QUE HACER AHORA. kind: explore|go|plan|wait|danger|done|urgent|info|secret. Pulsa al cambiar `text`. null = frase automatica por fase.
Hud.setMission({title, steps:[{text, done}]} | null)           // chips con casilla bajo el banner. null = en explore se derivan de pub.pois (sustituye la lista 0/4)
Hud.setReady({label, tip, after, pulse, disabled} | null)      // boton principal de la fase explore (defecto: «Terminar exploración → ir al plan», tip y `after`="Cuando todos terminen, pasamos al plan"). Late solo si pulse o si ap===0. Solo se muestra en explore.
Hud.getInsets() -> {left,right,top,bottom}                     // px CSS tapados por paneles (objetivos, chat, top+banner, barra inferior); modales NO cuentan
Hud.onInsets(fn(insets))                                       // opcional: se llama al cambiar layout (resize, colapsar chat/objetivos) -> eng.setViewInsets(i)
Hud.setMinimapSource((ctx,w,h)=>bool)                          // 160x64; false oculta. Si no se llama, usa RC.eng().drawMinimap(ctx,w,h) si existe (poll 250ms)
```
Cuando ap===0 en explore el banner se fuerza a «Terminar exploración → ir al plan» y el boton late (sobrescribe setNow). Resto de callbacks y API v3 intactos.
Modales: boton ▁ minimiza cualquier panel a una pastilla (resolve no se autocierra mientras esta minimizado). Plan/secreto: max 70vh, anclados abajo, chat visible. Toasts/logros: pila bajo el banner.
Chat: grupos por autor+hora, INTEL una sola vez (texto + etiqueta fiabilidad), max 80 nodos, "Mensajes nuevos ↓", chips en una fila con scroll. Retratos: marco con gradiente por rol, 56px, usa meta w/h/fw/fh reales (cualquier resolucion), badge TU/IA/HUMANO, puntos "escribiendo" en la tarjeta de equipo.

## Secretos (punto 6)
Fuga encontrada: `Story.intro` (cinematica que ven TODOS) contenia los secretos de los 3 roles (lineas «Nico... se salió de la ruta», «Ona...», «Iván...»). Arreglo en ui.js `buildShots`: filtra las lineas que empiezan por Nico/Ona/Iván (si quedan <3 usa INTRO_DEF). Recomendado a STORY: quitar esas lineas de `Story.intro`. La ficha (UI.showRole) es local/privada, secreto borroso hasta pulsar, no va al chat.
