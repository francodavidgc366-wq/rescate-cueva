# NOTES-art8 (agente ART v8) - retratos estilo Celeste
Regenerar: `.venv/bin/python tools/gen-sprites.py && python3 tools/pack-assets.py`. Solo retratos (rapido): `python3 tools/art_faces8.py` (Pillow) -> assets/gen/face_*.png + assets/preview_cast8.png (4 hojas x4). Tras eso, `meta.json` solo se actualiza con gen-sprites.py completo.
## Contrato
- `face_<id>`, id in guia|medica|ing|lia: PNG 192x288 RGBA, fondo transparente. fw=fh=48, cols=4, rows=6.
- Filas (expresion): 0 neutral, 1 feliz, 2 preocupado, 3 enfadado, 4 sorprendido, 5 triste. meta.expressions = esos nombres en espanol: ['neutral','feliz','preocupado','enfadado','sorprendido','triste'].
- Columnas (animacion): 0 closed (boca cerrada), 1 talk1 (hablando pequena), 2 talk2 (hablando grande; cabeza 1px mas abajo = cabeceo), 3 blink (ojos cerrados, boca cerrada). meta.frames = ['closed','talk1','talk2','blink'].
- Animar hablando: alternar cols 0/1/2 (~8 fps, p.ej. patron 0,1,2,1), parpadeo: col 3 durante ~120 ms cada 2-4 s.
- `face_<id>_dead`: 48x48, gris frio, ojos cerrados.
- `face_frame`: 16x16 9-slice (meta.slice=5): 2px oscuro, 2px claro, filete lila; centro TRANSPARENTE.
- meta de cada `face_<id>`: {w,h,fw,fh,cols:4,rows:6,expressions,frames,bg,name,note}; `bg` = color de recuadro sugerido (guia #3d4f73, medica #5a7a6a, ing #9a6a3a, lia #4a5a82).
- Los `portrait_*` (v7) NO se tocan; el engine aun no usa `face_*` (hay que cablearlo en src/ui.js / hud.js).
## Diseno
- tools/art_faces8.py: cabeza base compartida dibujada en ASCII (mitad izq., se espeja), capas por personaje (pelo, ropa, accesorios, ASCII con paleta por letras) y capas de expresion (ojos x7, cejas x6, bocas 18) compuestas por codigo. Sombreado de piel procedural bajo el pelo y borde derecho. Barba de 3 dias de Mateo = puntos procedurales.
## Sprites de cuerpo (rehechos)
- `player_guia|medica|ing`, `lia`: nombres, celda 24x24, frames, filas de animacion y feet_y=22 intactos. Cabezas chibi 10x8 ASCII (HEADS en tools/gen-sprites.py), paletas mas claras (Mateo aclarado: piel #e0a674, chaqueta #b8702e).
