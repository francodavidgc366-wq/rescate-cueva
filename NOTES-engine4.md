# NOTES-engine4 (engine.js v4, `Engine.version === '4.0'`)
Todo lo de NOTES-engine3 sigue valiendo salvo lo indicado. Nuevo/cambiado:

## Nivel: cueva-laberinto
- Mundo 300x30 tiles (`Engine.LEVEL_H` = 480 px). Cada tramo = 60 columnas SELLADAS (roca a izq./der.): no se puede pasar al siguiente tramo corriendo. Cuatro alturas de suelo por tramo (filas 25 / 19 / 13 / 7), unidas por escaleras de tablones (cada 2 filas, tambien salvables nadando), con ramas ciegas, fosos, reptaderos de 2 tiles de alto, camaras altas.
- El borde derecho de cada tramo es un callejon sin salida con cartel: 1 derrumbe "SIN PASO", 2 puerta de acero "CERRADO", 3 derrumbe, 4 "CUERDA CORTADA" (con brillo de Lia detras), 5 la camara de Lia. Camara limitada al tramo actual (fuera del tramo se pinta roca opaca). Lia (`'lia'`) solo existe en el tramo 5 (`getPoiPos('lia')`/`setGuide('lia')` devuelven null/ignoran antes de la ronda 5).
- Contrato POI intacto: `setPois(round,[{id,slot 0..3,...}])`, slot 3 = secreto. Posiciones (col local, fila de suelo): T1 [45,23] [33,19] [22,7] [55,12]; T2 [20,19] [52,25] [42,13] [34,28 fondo del foso]; T3 [22,25] [47,19] [54,13] [30,7]; T4 [12,19] [40,25 suele inundarse] [52,13] [22,7]; T5 [30,25] [14,19] [24,13] [54,19]. `slotPos(round,slot)`.
- Atajos de habilidad (nunca bloqueos): `bridge2` T2 (foso 14 tiles, ING con E en la zona; rodeo por galeria B), `wall3` T3 (pared de 6 tiles, la GUIA la trepa; el resto rodea por la galeria baja), `barrier4` T4 (cristal, la MEDICA mantiene E en `med4`; rodeo por la galeria baja). Ids de `onInteract` sin cambios (`bridge2`, `wall3`, `med4`, `lia_heal`).
- `resetGates()` resetea todo; **`resetGates(round)`** solo el obstaculo de ese tramo (2 puente, 3 pared, 4 barrera). `setPois(round)` llama a `resetGates(round)` automaticamente cuando la ronda CAMBIA (no si repites la misma ronda), asi cada tramo nuevo empieza con su obstaculo cerrado.
- Se quitaron las cuerdas de v3 (`world.ropes` vacio).
- Agua: `waterY(level)=484-3.6*level` px. 10% justo bajo el fondo de los fosos, ~23% cubre el suelo bajo (fila 25), ~50% la galeria B, ~77% la C; la galeria alta (fila 7) queda seca incluso al 100%.

## API nueva (instancia `eng`; tambien estaticas `Engine.x()` que delegan en `Engine.current`)
- `setGuide(target, {label}?)`: `target` = id de POI | `'lia'` | `{x,y}` (px de mundo, pies) | `null` (quita). Flecha grande con rebote, halo y etiqueta `"<label> <N> M"` (N = metros de RUTA, 1 tile = 1 m). Objetivo en pantalla y camino directo: flecha flotando encima + anillo pulsante. Objetivo fuera de pantalla o en otra rama/altura (ruta > 1.3x la distancia recta + 4, o >3 tiles de desnivel): flecha en el borde del recuadro visible apuntando al SIGUIENTE waypoint del camino real (destino del proximo salto/escalera/caida del grafo de navegacion), o flotando sobre el waypoint si esta en pantalla (el anillo marca el objetivo real). Si el jugador esta a <36 px de un POI la flecha se oculta (manda el prompt E). Se calcula para el rol local (`active`).
- `getPoiPos(id)` -> `{x,y}|null` (POI, `'lia'` en ronda 5, o eco de `{x,y}`).
- `getRoute(id)` -> `{dist, meters, reachable, straight, direct, waypoint:{x,y}|null}` desde el rol local (metros enteros; `reachable:false` si no hay camino). `id` como en setGuide.
- `setHint(text|null)`: pildora fija arriba del recuadro visible (opcional).
- `focus(x, y, {ms=2200}?)`: lleva la camara a (x,y) de mundo y vuelve sola al jugador; `focus(null)` cancela. Pensado para eventos (derrumbe, inundacion). La camara sigue limitada al tramo del punto.
- `setViewInsets({left,right,top,bottom})`: px CSS tapados por HUD/chat, relativos al **padre del canvas** (#rcgame, a pantalla completa). El motor convierte con `canvas.getBoundingClientRect()` y centra camara y jugador en el recuadro visible; la camara puede salirse del tramo por el lado tapado (se pinta roca). Llamar de nuevo cuando cambie el layout (se reevalua tambien cada ~0.75 s por si cambia el tamano del canvas). Insets absurdos (<120x70 canvas px visibles) se ignoran. Las flechas/etiquetas de guia y el hint usan el recuadro visible.
- `drawMinimap(ctx2d, w, h)` -> `true`: silueta del tramo en que esta el jugador local (roca / tablones), agua como banda azul, POI sin usar con su color de tipo (secretos sin descubrir ocultos), usados en gris, destino de guia con anillo pulsante, los 3 roles (el local con borde blanco). Pinta fondo opaco en todo `w x h`; escalado entero no necesario.

## Fuego y agua
Antorchas, hogueras, velas y faroles se APAGAN al quedar su llama bajo el agua (humo, burbujas, chispas, `sfx('splash')`, contador `stats.snuffed`); sin llama ni luz mientras esten sumergidos y se vuelven a encender si el agua baja 14 px por debajo. El resto de luces (cristales, setas) brillan al 45 %. Los personajes sumergidos pierden la linterna (solo un brillo azul tenue). POI sumergido: marco/tinte azul, burbujas, el prompt dice `... - BAJO EL AGUA`; E funciona igual.
Nado: al salir a la superficie el salto da -5.2 (antes -4.7) y la IA nada siguiendo el camino del grafo nodo a nodo (antes solo "salida mas cercana").

## Props y luces
Los props se colocan sobre el suelo real (busca tramo plano y hueco libre; si no cabe no se pone) y las antorchas se reparten automaticamente por suelo plano. El farol de las vigas de mina ahora CUELGA del centro de la viga (argolla + cadena + caja) y la luz sale de el; el `lamp` de pie tiene cabeza centrada en el poste.

## Tests (tools/)
- `tools/engine-test.html` (servir con `python3 -m http.server`): `T.reach(maxSec, fromFloor, water)` (water=`true` usa 5+6*ronda %), `T.conn()`, `T.soak(min)`, `T.dump(tramo)` (ASCII del laberinto).
- `tools/engine-run.js`: `NODE_PATH=<playwright> CHROME=<chrome> node tools/engine-run.js <puerto> '<js>' [captura.png]` ejecuta JS en engine-test y lista errores de consola.
- Resultados: `T.reach(60)` en seco 60/60, 0 fundidos (max 21.6 s); `T.reach(40,false,true)` con agua 11..35 % 60/60; `T.conn()` vacio; `T.soak(5)` 0 fundidos, parada max 8 s, 38 interacciones. ~2 ms/frame step+render (headless).
