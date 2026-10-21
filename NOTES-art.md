# NOTES-art (agente ART v3)
Regenerar: `.venv/bin/python tools/gen-sprites.py && python3 tools/pack-assets.py` (Pillow+numpy en .venv). Módulos: tools/artlib.py (ruido fbm, rampas+dither Bayer, sombreado por volumen, glow, niebla), art_scenes.py (cielo, montañas, pinos, cueva en "costillas" con perspectiva, agua con reflejo, cristales, haces), art_stills/events/portraits/icons/ui.py. Todo generado por código, CC0. src/assets.js ~420 KB (assets/gen ~0.4 MB).

Formato de hojas: `ASSETS.images[name]` (dataURL) + `ASSETS.meta[name]` con `w,h`, y para hojas `fw,fh` (=cell), `cols`, y **`names`** (array: índice k -> x=(k%cols)*fw, y=floor(k/cols)*fh) e `index` (nombre->k). Los v2 siguen igual (tiles, player_*, lia, water_tile, props, cablecar, sky_layers).
- `still_valle|cabina|tormenta|entrada|radio|mapa|inundada|rescate|derrota` 320x180, sin alfa.
- `event_derrumbe|inundacion|gas|grieta|tormenta|linterna|hipotermia|murcielagos|eco` 160x90.
- `portrait_guia|medica|ing|lia|director` 192x48, fw=48, 4 expresiones HORIZONTALES: neutral, preocupado, enfadado, feliz (meta.expressions; x=i*48). Fondo transparente.
- `icons` 160x32, 16x16, cols=10, names: agua salud material confianza cuerda bateria radio mapa botiquin llave ojo candado trofeo estrella reloj chat voto alerta secreto ap (ap = punto de acción).
- `poi_icons` 160x32, 16x16, cols=10, names: mapa agua alerta botiquin cuerda material secreto ojo llave radio cristal linterna huellas caja libreta brujula tuberia puerta pozo bateria.
- `trophies` 256x64, 32x32, cols=8; names = ids de logros de Story (confesion cero_bajas cartografo lengua_plata detective al_borde todos_cumplen sin_pausas everest cartas_arriba riesgo_calculado hombro manos_limpias cada_uno unanimes sin_secretos) = ACH.trophy.
- `ui_frame` 24x24 9-slice (slice=8). `ui_buttons` 96x48: cols=4 estados (normal,hover,pressed,disabled) x 3 filas (primary ámbar, secondary violeta, danger); celda 24x16, slice=6.
Pendiente de pulir: tiles/personajes/sky_layers v2 (aún sin rehacer), roca de still_entrada, figuras humanas de los stills (simples).
