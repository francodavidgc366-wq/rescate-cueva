# NOTES-engine9 (minimapa)
`eng.drawMinimap(ctx,w,h)` sigue devolviendo true y vale para cualquier w x h. Solo cambia src/engine.js (bloque `mm*` antes del bucle).
- Muestra zonas 1..unlocked (una al lado de otra). Escala entera por tile si >=1 (si no, filtro de caja), centrado, `imageSmoothingEnabled=false` (solo la niebla se escala suavizada).
- Cache offscreen (`mmS`): fondo (roca en degradado, galerias claras con borde, tablones dorados, bolsas de aire plateadas) por clave n/escala/tamano; capa de agua (nivel real `waterY(wlCur)`, ondas, recortada a las galerias) cada 8 ticks; niebla 1 px/tile solo al cambiar `explored`.
- Niebla: `mmX` (por tile) se marca radio 8 alrededor de los 3 cuerpos (cada 6 ticks en `step` y en cada dibujo). Zonas anteriores a la ultima desbloqueada se ven completas. POI y puertas en zona sin explorar se ocultan; el destino de guia siempre.
- Iconos: tu = circulo del color del rol + aro blanco parpadeante + flecha de cara; companeros = circulo + inicial; POI pendiente = rombo dorado pulsante, usado = rombo gris con check; puertas = candado del color del rol (abierto verde); guia = anillo doble + flecha; camara de Lia = icono rosa en zona 5.
- Rotulos «1 Entrada»... (3x5, x2 si w>=400; se abrevian a «1» si no caben), separadores de zona punteados, marco redondeado con esquinas doradas, leyenda si w>=400.
- Medido: ~0.6 ms/frame a 640x300 (headless). Capturas: /tmp/mm/shot*.png (generadas con engine-run.js).
