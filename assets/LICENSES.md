# Licencias de assets

Todos los assets de `src/assets.js` son **originales**, generados por código con `tools/gen-sprites.py` (Pillow) y dedicados al dominio público (CC0 1.0). No se incluye material de terceros.

Evaluado y descartado: Kenney "Pixel Platformer" (https://kenney.nl/assets/pixel-platformer, Kenney, CC0). Descargado y revisado, pero su estilo (cartoon claro, 18x18) no encaja con la estética de cueva/atardecer; no se usa ni se redistribuye.

Fuente (no incluida, referenciada por la UI): Press Start 2P, CodeMan38, SIL OFL 1.1, https://fonts.google.com/specimen/Press+Start+2P


V4 (retratos 64x64, marcos, iconos rehechos, lamp_hang/lantern_floor/lamp_chain): 100% procedural y propio (tools/art_portraits4.py, tools/art_icons4.py), sin material de terceros, CC0 1.0.

V6 (reparto dibujado: pers_*, portrait_*_dead, retratos rehechos, dlg_frame, dlg_portrait_frame, npc_*): 100% procedural y propio (tools/art_portraits6.py), sin material de terceros, CC0 1.0. Hades/Hollow Knight solo como referencia de estilo, sin copiar nada.

V7 (retratos 96x96 gotico, sprites de cuerpo rehechos): 100% procedural y propio (tools/art_portraits7.py, tools/gen-sprites.py), CC0 1.0. Blasphemous solo como referencia de estilo, sin copiar nada.

## v8 (ART): face_*, face_frame, sprites de cuerpo
- `face_<guia|medica|ing|lia>`, `face_<id>_dead`, `face_frame`: pixel art dibujado a mano en rejilla ASCII (tools/art_faces8.py), originales del proyecto, CC0 1.0. Estilo inspirado (no copiado) en los dialogos de Celeste.
- `player_guia|medica|ing`, `lia`: rehechos en tools/gen-sprites.py (cabezas chibi ASCII), originales, CC0 1.0.
