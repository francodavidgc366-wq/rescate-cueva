# NOTES-art4 (agente ART v4)
Regenerar: `.venv/bin/python tools/gen-sprites.py && python3 tools/pack-assets.py` (src/assets.js ~503 KB). Nuevos modulos: tools/art_portraits4.py, tools/art_icons4.py. Previews: assets/preview_portraits4.png, assets/preview_art4.png.

## Retratos 64x64 (CAMBIO DE TAMAÑO: antes 48x48)
- `portrait_guia|medica|ing|lia`: HOJA 256x64, meta fw=64 fh=64 cols=4, `expressions`=[neutral, preocupado, enfadado, feliz], x=i*64 (mismo orden que antes; ui.js/hud.js ya leen meta.fw, sin cambios de nombres). Fondo transparente.
- Sueltas 64x64 (sin hoja): `portrait_<rol>_alert` (ojos abiertos, ceja alzada, boca "o"), `portrait_<rol>_hurt` (ojos entornados, mueca con dientes), `portrait_<rol>_talk` (boca abierta; alternar con neutral para hablar).
- `portrait_director` sigue 192x48 (fw=48) sin tocar.
- Luz calida de linterna a la izquierda + relleno frio a la derecha ya horneados; el busto llega al borde inferior (recortar con overflow hidden / borde).

## Marcos de retrato (9-slice)
`portrait_frame` (naranja), `portrait_frame_turq`, `portrait_frame_violet`: 16x16, meta slice=6, centro TRANSPARENTE (poner el retrato detras, borde de 5px).

## Iconos
Rehechos (mismos nombres/indices): icons.cuerda, icons.confianza; poi_icons: cristal, linterna, pozo, huellas, tuberia, puerta, cuerda. Mismo tamaño 16x16 (sin cambios para el engine).

## Props de luz (nuevos, el engine debe integrarlos)
- `lamp_hang`: hoja 64x28, fw=16 fh=28, 4 frames parpadeo (fps 7). Colgar con el pixel (anchorX=8, anchorY=0) = anilla/gancho sobre la viga. Foco de luz en (lightX=8, lightY=18) dentro del frame. Cadena mas larga: repetir `lamp_chain` bajo el gancho.
- `lamp_chain`: 8x8, tileable vertical, anchorX=4.
- `lantern_floor`: hoja 64x16, fw=16, 4 frames; base en la ULTIMA fila (anchorX=8, anchorY=baseY=15); foco en (8,8).
- `props` (16x16, SIN cambio de tamaño): se anade a cada fila `baseY`, `anchorX`=8, `anchorY`, `padBottom`. torch y marker tienen baseY=14 (padBottom 1 px transparente abajo: asentar con y+1); crystal/radio/rope/box baseY=15.
- tienda/mesa/hoguera/lampara de pie NO son sprites: el engine las dibuja por codigo (engine.js PROP), no hay nada que recortar.

## Sin cambios de tamaño que rompan el engine salvo los retratos (48->64).
