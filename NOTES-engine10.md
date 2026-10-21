# NOTES-engine10
- Nitidez: `fit()` usa factor entero en pixeles FISICOS (dpr incluido), `image-rendering:pixelated`; verificado con tools/engine-sharp.js a 1366x768, 1920x1080, 1280x650, 1536x864, 1440x900 y dpr 1/1.25/1.5: escala siempre entera (3..8x). Solo <320x180 fisicos cae a fraccionario. Carteles/etiquetas/nombres usan coordenadas enteras y la fuente pixel 3x5 (drawText) en el canvas 320x180.
- Carteles (POI, puerta, prompt Q, etiqueta de flecha, nombres, burbujas) se mantienen dentro de VIS (`clampIn`, y tope superior VIS.y0+2).
- Burbujas de chat: ya no se solapan entre ellas (`bubY` las apila hacia arriba) y no salen del recuadro visible.
- Flecha guia: el cartel de puerta se oculta si cae sobre el jugador (ya existia); sin cambios nuevos.
## No verificado
- Solapamiento de personajes (los cuerpos pueden coincidir por diseno; solo los nombres se separan) y props flotando: no hice barrido sistematico de las 5 zonas. Flecha guia sobre carteles: solo vista en un caso (1366x768).
