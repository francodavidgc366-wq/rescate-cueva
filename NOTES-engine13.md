# NOTES-engine13 (engine.js, `Engine.version === '13.0'`)
## 1) Minimapa: `drawMinimap(ctx, w, h, opts)` (opts opcional; `Engine.drawMinimap(c,w,h,o)` lo reenvia)
- `opts = {zoom: 1..3, panX, panY}`. El zoom se centra en el jugador; panX/panY en tiles desplazan ese centro (solo tiene efecto si la rejilla ampliada no cabe).
- Rejilla de 2 columnas, zonas apiladas hacia ARRIBA: 1 abajo-izq, 2 abajo-der, 3 encima-izq, 4 encima-der, 5 arriba centrada. Solo las zonas desbloqueadas. Cada zona es un cuadro con borde (dorado = zona actual, «AQUI») y rotulo `n Nombre` DENTRO del cuadro.
- Grande (w>=400 y h>=200, p.ej. 640x300): escala entera por cuadro (2 px/tile = 200x80 por zona; antes ~1.28 en una tira de 5). Flechas discontinuas animadas n -> n+1 (recta en la misma fila, codo hacia arriba entre filas), leyenda vertical a la izquierda y «EL AGUA SUBE».
- Compacto (240x110): zona actual ampliada (escala fraccionaria a pasos de 1/4, p.ej. 1.75) + columna de miniaturas (0.3 px/tile) apiladas hacia arriba con flechita de subida; con zoom la zona actual se amplia y se centra en el jugador.
- Agua: nivel real de cada zona (pendiente propia por zona: zona 1 `TA`, resto `TB`), mascara de aire. Niebla, puertas, puntos, destino de guia, Lia, jugadores: se mapean a las coordenadas locales de SU cuadro (en miniaturas son puntos de 2-3 px).
- Cache: un offscreen por (zona, escala), maximo 18 entradas.
## 2) `playTravel` (cinematica fluida; API v12 + `opts.onShot`)
- `eng.playTravel({toZone, kind, outcome, ms, onShot(i, nombre)}, onDone)`. `ms` 10000..13000 (defecto 11500); dura exactamente `ms`.
- Planos: 0 `salida` (0 .. 20 %: el grupo quieto, zoom 1.45 -> 1.0 suave; a partir del 11 % empiezan a andar), 1 `recorrido` (hasta que llegan los 3 + 0.4 s, limitado a 50..80 %: travelling continuo siguiendo al grupo con adelanto), 2 `llegada` (zoom 1.07 -> 1.0, los 3 quietos mirando adelante). `onShot` se llama una vez por plano (host); al saltar se llama con 2 si no se habia hecho.
- El recorrido es REAL: `botGoto` de los 3 al punto de entrada; la fisica de los cuerpos se avanza 3 sub-pasos por tick (4 si pasado el 60 % no han llegado) = ~3x la velocidad normal, con las animaciones normales de correr/saltar/trepar. Sin `warp`, sin fundido ni teletransporte.
- Fundido + colocacion SOLO como ultimo recurso: al 82 % si no han llegado, al 50 % si algun `botGoto` es inalcanzable, o si el usuario salta (Espacio/Enter/Esc o `skipCutscene()`).
- Al terminar: `onDone` 1 vez, bots restaurados, entrada del jugador devuelta; la camara NO se corta (suaviza hacia el jugador; snap solo si queda a >90 px).
- Efectos por kind: pozo (cuerda con vaiven por cuerpo, gotas con eco 'drip' a +16 y +34 ticks), balsa (balanceo de camara x1.5, salpicaduras cada 6 ticks y sfx), galeria/cuerda/puente/tunel/compuerta como v12.
- Snapshot `cs = [kind, outcome, t, n, ft, shot, zoom*100]`; el cliente aplica zoom/plano (no llama `onShot`).
## Herramientas / medido
- `tools/engine-test.html`: `T.travel13(kind, outcome, ms, caps, agua)` (muestrea cada tick: salto maximo del cuerpo del jugador, saltos de camara, plano, fundidos). `tools/engine-travel.js` (fotogramas), `tools/engine-mm.js` (minimapas a PNG x3).
- Medido (agua 5/40/70, pozo/balsa/puente/tunel, 4 transiciones): 3 llegan a <=7 px, `onDone` 1 vez, 0 fundidos, salto maximo del jugador 17.5 px (caida; <40), camara <=6 px/tick. Planos a 0 / ~2.3 / ~7.0 s. Con agua 100 hay transiciones donde los bots nadadores no llegan al 82 % y se usa el fundido (ultimo recurso).
## No verificado
Integracion en main.js (onShot, ocultar HUD, pasar opts al minimapa/UI de zoom); cliente en red real; sonidos reales; rutas desde posiciones lejanas dentro de la zona; minimapa con 2 o 4 zonas en compacto (solo 5/1 capturadas en compacto, 5/3/1 en grande).
