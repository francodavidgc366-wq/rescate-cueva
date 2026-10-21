# NOTES-art7 (agente ART v7)
Regenerar: `.venv/bin/python tools/gen-sprites.py && python3 tools/pack-assets.py` (~1 min). Retratos: tools/art_portraits7.py (se ejecuta tras art_portraits6 y sobrescribe `portrait_*`). Preview x3: assets/preview_cast7.png. Solo retratos: `ONLY=ing .venv/bin/python tools/art_portraits7.py` (desde tools/).
- Reparto: guia=Mateo (cuero marron, panuelo rojo, frontal, barba, cicatriz), medica=Elena (mono, bata+chaleco naranja, cruz roja), ing=Samuel (casco amarillo abollado, gafas en el casco, barba canosa, mono azul), lia=Lia (pelo negro mojado, manta dorada, labios azulados).
- Hoja `portrait_<id>`: 384x96, fw=fh=96, cols=4 [neutral, preocupado, enfadado, feliz]; sueltas 96x96 `_alert/_hurt/_talk/_dead` (gris frio). Fondo transparente, silueta sin antialias.
- Tecnica: mascaras a 4x, sombreado por volumen + luz calida de linterna a la izquierda, rim rojo a la derecha, hebras de pelo por campo de flujo, pliegues; zoom 1.14 del diseno.
- Sprites de cuerpo (`player_guia|medica|ing`, `lia`) recoloreados en tools/gen-sprites.py (draw_char/draw_lia) con la misma ropa/tez/pelo; nombres, celdas 24x24, frames y feet_y intactos.
- Supervivientes pers_* y marcos: sin tocar (sin usar).
- Aviso: src/ui.js:443 (`tface`) lee la hoja con 64 fijo (`i*64,0,64,64`): con 96 mostraria recortes; deberia usar meta.fw.
