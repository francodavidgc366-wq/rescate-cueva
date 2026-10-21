# NOTES-engine6 (engine.js v6, `Engine.version === '6.0'`)
Todo NOTES-engine5 sigue valiendo salvo lo indicado. APIs v5 intactas.

## Agua (cambio importante)
- `waterY` de instancia ya no es `644-3.6*nivel`: la pendiente depende de la zona del cuerpo local para que el agua a 100 % **nunca cubra el suelo del spawn**: zona 1 (campamento, fila 35) sube de y=648 a 554; zonas 2-5 (spawn fila 29) de 648 a 458. Tabla (zonas 2-5): 10 %=629, 30 %=592, 50 %=555, 70 %=518, 100 %=462 (el suelo bajo TA, y=560, se inunda desde ~45 %). `Engine.waterY(l)` estatico conserva la formula v5 (solo referencia). La pendiente se suaviza al cambiar de zona (0.004/tick) y `gather()` la fija al instante.
- Los caminos principales (spawn, pasillo TB, escaleras) quedan secos; solo se inunda el nivel bajo TA y los fosos. Bolsas de aire nuevas (2-3 por zona en la galeria/cuarto de gas TA) para que nadar a 70-100 % no deje sin aire (aire minimo medido 33).
- Aire: -6/s con la cabeza sumergida (sin cambios), pero ahora: barra de aire sobre la cabeza (grande + texto AIRE / «SIN AIRE!» para el local; en companeros solo si aire<60), barra de color cian -> ambar (<55) -> rojo parpadeante (<30), borde de pantalla azul/rojo pulsante cuando el local tiene aire<60, sprite con tinte azul al nadar (`ctx.filter`, ignorado en navegadores sin soporte) y burbujas de la boca cada ~12 ticks (2 si aire<35).
- Salir del agua: mantener salto junto a la superficie repite el impulso de salida (antes habia que pulsar en el instante justo; los bots se quedaban en fosos con agua).

## `onUnreachable(role, poiId)` (opcion de motor nueva)
Un bot que no llega a un objetivo **no entra en bucle**: `botGoto` devuelve false si no hay ruta; al **2o fallo seguido** hacia el mismo objetivo (misma pareja rol+id) se llama `opts.onUnreachable(role, poiId)` (async, setTimeout 0) y el contador se pone a 0. Tambien cuenta como fallo (y suelta el objetivo, `cb(false)`): bucle de saltos, 6 s sin avanzar en el agua, sin ruta tras 30 ticks, y 3 viajes seguidos a por aire con el mismo objetivo. Llegar al objetivo resetea el contador. `stats.unreach` cuenta fallos. Objetivos `{x,y}` usan `target.id` o `'xy'`.

## Flecha guia (setGuide)
- Rotacion continua suavizada (32 sprites precalculados, angulo suavizado por el camino corto), siempre hacia el waypoint de la ruta (o el objetivo si es directo).
- Fuera de vista: pegada al borde del recuadro visible (`setViewInsets`) con la distancia («41 M»). A la vista pero lejos (>56 px): **orbita al jugador** apuntando al destino/waypoint (radio crece con la distancia). Casi encima: flecha clasica hacia abajo sobre el punto. Ya no queda fija arriba/abajo.
- `setGuide` acepta tambien un id de puerta (`'z2_puente'`) -> guia al `spot` y fuerza a mostrar su cartel.

## Correr
`setInput(role, {run:true})` (alias `shift`): x1.6 de velocidad maxima (1.7 -> 2.72 px/tick), algo mas de aceleracion, polvo; no en el agua. **main.js debe mapear Shift -> `run`.** Ademas **doble toque** de izquierda/derecha (<14 ticks entre soltar y volver a pulsar) corre mientras se mantiene. Solo cuerpos humanos (bots no corren; la navegacion no cambia).

## Menos ruido en el mundo
- Carteles de puerta: solo a <12 tiles del local, si son el objetivo de `setGuide`, o 4 s tras abrirse; mas pequenos (9 px de alto); nunca se dibujan encima del jugador (si el local esta en el spot solo se ve el prompt [Q]).
- Nombres: solo el local y companeros a <14 tiles.

## Tests nuevos (tools/engine-test.html; runner: `NODE_PATH=<playwright> CHROME=/usr/bin/google-chrome node tools/engine-run.js <puerto> '<js>' [png]`)
`T.reachRole(agua, maxSec)` (por rol, solo con sus puertas abiertas, POI + `lia`, mide nado continuo max y aire min), `T.unreachTest()`, `T.runTest()`, `T.airTest()` (ahora en zona 5). Resultados: `T.reach` 90/90 con agua 10/30/50/70/85/100 (max 22-30 s, 0 fundidos); `T.reachRole` 73/73 a 10/30/50/70 (nado max 10 s a 70 %, aire min 38; a 100 % 18.9 s, aire min 33); `gatesTest` 9/9; correr 102 -> 163 px/s.
