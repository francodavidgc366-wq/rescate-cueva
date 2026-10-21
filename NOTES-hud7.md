# NOTES-hud7 (agente UI v7) - src/hud.js / src/ui.js
API anterior intacta. Prueba: tools/hud5-test.html (Hud) y UI.showFinal desde consola.

## Nuevo
- `Hud.floatCard({title, text, uses})`: tarjeta flotante abajo-izquierda, «HAS ENCONTRADO / titulo / texto / Sirve para: ...», 5 s, no bloquea (pointer-events:none), una a la vez. main: llamarla con `out.explain` / `card.uses` tras cada hallazgo.
- `plan.brief` (string o array, 1-3 frases): bloque «Lo que sabéis / lo que no» bajo la pregunta del plan.
- Cuaderno: cada tarjeta muestra «Sirve para: ...» si `card.uses` (o `use`) existe en `priv.intel[i]`; boton principal «Contárselo al equipo» (mismo `onShare`); «Cambiar y contar» (mentir) queda secundario.

## Cambios
- Flashes: `Hud.flash` = solo un borde fino (box-shadow inset, opacidad .12, 140 ms), nada de relleno; no corre con `noflash` ni `prefers-reduced-motion`. `Hud.shake` es no-op y ya NO llama a `cb.fx('shake')` (main no recibe sacudidas). Viñeta de aire: borde fino. ui.js: `flashEl` igual y sin `rshake` en la pantalla final. Se mantienen los relampagos de las cinematicas (ver abajo).
- Menos opciones: panel izquierdo oculto (O lo muestra) y minimapa oculto (M), chips max 2; una sola accion visible en la barra: pedir ayuda (solo 1 boton, el primero habilitado) > habilidad lista (Q) > «HABLAR CON EL EQUIPO Y DECIDIR».
- Nombres: Mateo (guia), Elena (medica), Samuel (ingeniero) en hud.js, ui.js y tools/hud5-test.html.
- Final: solo 4 fates (lia, guia, medica, ing; se ignoran otros ids), 4 tarjetas en fila (2 en <=640px), retrato hasta 150 px con `meta.fw/fh` reales (lienzo 96x96).
- Estilo Blasphemous: fondo casi negro con degradado rojizo, marcos oro envejecido con esquinas SVG inline, titulos en mayusculas espaciadas (Cinzel via Google Fonts, fallback Palatino/Georgia) en dorado palido; botones, dialogos (`.dl-box`), `Hud.say`, paneles, cuaderno, chat y pantallas de ui.js. Es un bloque de overrides al final del CSS de cada archivo.

## No verificado
Dialogo/say/plan/secreto con los nuevos estilos solo visto parcialmente (cuaderno, floatCard, barra y final con fallback de retratos de 64px); movil; relampagos de cinematicas siguen con flash a pantalla completa (solo si no se activa «reducir flashes»); retratos 96x96 reales; integracion con main (`out.explain`, `plan.brief`); menus/lobby/ajustes de ui.js con el nuevo lavado (no revisados uno a uno); pedir-ayuda con varios companeros (ahora solo se ofrece uno).
