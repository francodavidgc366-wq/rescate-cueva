# NOTES-engine15 (`Engine.version === '15.0'`)
## Viaje (playTravel)
- La cinematica ya NO usa la fisica real de los cuerpos (causa de «Remen» con gente corriendo y de la camara en roca/negra): es una escena propia `csScene` (opaca, iluminada, zoom 1.2, camara que sigue al grupo con travelling) por kind: balsa (tablones+barriles sobre lamina de agua siempre dibujada, 3 sentados remando con anim interact, balanceo, salpicaduras), pozo (cuerda+arnes, cuerpos colgando, bajan lento, polvo/gotas), galeria (caminan con antorcha, run a ritmo normal), cuerda (trepan), puente (fila sobre tablones), tunel (a gatas, rotados), compuerta (empujan, sube, pasan). Sprites disponibles solo idle/run/jump/fall/interact: remar/trepar/gatear son reutilizaciones.
- Duracion/planos/onShot/onDone igual que v13. Los cuerpos reales se colocan al empezar el ultimo fundido (20 ticks, crossfade escena -> mundo, sin negro). Saltar = crossfade inmediato. Los clientes ven la escena (solo depende de kind/t/ft).
- Rotulos: tunel «A GATAS POR EL TUNEL», compuerta «EMPUJANDO LA COMPUERTA». El texto «Recorren el camino»/«Remen» no sale del engine (main.js/HUD).
- `eng.csScr()` -> {scr:[[x,y]x3], ft, vis, bh} para tests.
## Puertas
- `botOpenGate(role,id,cb)` siempre acaba abriendo: sin ruta, fallo de la IA, o >25 s (1500 ticks) => `forceOpenGate(id)`; `cb(true)` siempre (false solo si id/rol invalido).
- `eng.forceOpenGate(id)` (host): si el dueno es IA aparece junto a la puerta con puffs, camara a la puerta 2.2 s, abre con la animacion normal; si el dueno es el jugador NO se mueve su cuerpo. Tambien en `Engine.forceOpenGate`.
## Visual
- Nombres: el anti-solape usa la x ya recortada al borde (antes ELENA/MATEO acababan en el mismo punto). Margen derecho de carteles de puerta/guia 8 px (antes 2).
## Tests (tools/engine-test.html)
- `T.cine15(kinds, waters, step, caps)`: 4 transiciones x kinds x agua; por fotograma: 3 cuerpos dentro del recuadro y luminosidad > 35. Resultado: 7 kinds x agua 10/50/90 = 1932 fotogramas, 0 fallos, luminosidad minima 61.
- `T.gates15(70)`: zona 5 agua 70, 2 puertas (reptadero medica, puente ing) x 5 posiciones: todas abren (1.6-24.8 s, < 40 s); con ambas abiertas guia/medica/ing llegan a Lia (~14 s).
## No verificado
Integracion en main.js (rotulo, llamar forceOpenGate tras 25 s); el cartel «PIDE AYUDA: ...» no lo dibuja engine.js (guideLabel se limito a 8 px de margen, no reproducido el corte); nombres apilados sin captura; posiciones de partida de gates15 no estan garantizadas como nodos validos; la escena parece menos «ruta real» que antes; cliente en red; 'mal' (resbalon) ya no se dibuja.
