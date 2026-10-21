# NOTES-art6 (agente ART v6)
Regenerar: `.venv/bin/python tools/gen-sprites.py && python3 tools/pack-assets.py` (src/assets.js ~683 KB). Modulo nuevo: tools/art_portraits6.py (se ejecuta DESPUES de art_portraits4 y sobrescribe los retratos). Preview: assets/preview_cast6.png (x3). Estilo: dibujado a 8x y reducido con promedio (outline oscuro, cel-shading, ojos grandes con brillo; bordes suaves, no pixel-foto).

## Supervivientes (nuevos)
- Hoja `pers_marta|leo|hugo|sara`: 256x64, fw=fh=64, cols=4, `expressions` = [neutral, preocupado, asustado (llora), feliz]; x=i*64.
- Sueltas 64x64: `pers_<id>_hurt` (ojos ">  <", mueca, moraton+tirita), `pers_<id>_dead` (azul frio/gris, ojos cerrados, sin brillo).
- Marta: guia mayor, pelo canoso en mono, chal magenta, gafas de leer. Leo: nino, casco rojo enorme con estrella, pecas, linterna de juguete. Hugo: barba pelirroja, gorro azul, mochila turquesa enorme. Sara: trenzas turquesa, cortavientos rosa, auriculares.
## Rescatistas + Lia (mismos nombres, rehechos)
- `portrait_guia|medica|ing|lia`: 256x64 fw=64, orden [neutral, preocupado, enfadado, feliz]. Sueltas `_alert`, `_hurt`, `_talk` y NUEVA `_dead` (64x64).
- Colores ahora distintos: guia = chaqueta naranja + frontal sin casco; medica = bata blanca/verde + pelo rizado y cinta violeta; ing = casco amarillo + mono azul + barba gris; lia = manta dorada, pelo azul mojado.
- Fondo transparente en todos. Final: usar `*_dead` para quien murio.
## Marcos 9-slice
- `dlg_frame` 24x24, slice=10 (esquinas 10x10 con filigrana dorada y 3 px transparentes; bordes 4px estirables; centro 4x4 violeta oscuro liso). Tamano minimo recomendado >= 24x24.
- `dlg_portrait_frame` 16x16, slice=6 (borde 4px: tinta/claro/violeta/sombra, esquinas redondeadas, centro TRANSPARENTE: retrato detras). Sirve para marcar retrato 48-64 px.
## NPC mini
- `npc_marta|leo|hugo|sara`: 32x24, fw=16 fh=24 cols=2 frames=2 fps=2 (respiracion). meta anchorX=8, anchorY=23, baseY=23 (base en ULTIMA fila). Hay 1px de contorno arriba (fila 0 casi vacia).
