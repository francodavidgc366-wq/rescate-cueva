# NOTES-art13 (agente ART v13) - ilustraciones de final
Regenerar solo estas: `.venv/bin/python tools/art_ends13.py [nombre..]` (escribe assets/gen/end_*.png y actualiza meta.json) y luego `python3 tools/pack-assets.py`. gen-sprites.py las incluye (art_ends13.gen()).
## Contrato
- 6 imagenes RGB sin alfa 480x270 (mas anchas que 16:9, para paneo/zoom Ken Burns), en ASSETS.images con meta {w:480,h:270,note}: `end_good_1` (haz de linternas encuentra a Lia en la repisa), `end_good_2` (los cuatro hacia la grieta de luz, Samuel sostiene a Lia), `end_good_3` (salida al amanecer, silueta abrazados, teleferico), `end_bad_1` (camara inundada, linterna de Lia flotando/apagandose), `end_bad_2` (equipo ante el agua, lado derecho oscuro, luz debil al fondo), `end_bad_3` (una linterna sobre agua negra).
- Zonas seguras para encuadre: el sujeto esta en el tercio inferior/centro; cuidado con recortar bordes en bad_3 (todo es oscuro salvo la linterna en ~(292,172)).
## Diseno
- tools/art_ends13.py: funcion `person()` (personas procedurales con las paletas de player_*/lia: chaqueta marron + panuelo rojo, chaleco blanco con cruz y mono, mono azul + casco amarillo, pelo largo negro + manta dorada), vistas back/side/front, siluetas con `sil`, rim light; `lia_sit()`; roca/agua/reflejo/conos de luz reutilizando artlib y art_scenes. 128 colores (quantize mediancut).
