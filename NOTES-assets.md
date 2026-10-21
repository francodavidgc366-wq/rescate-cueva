# NOTES-assets
Regenerar: `.venv/bin/python tools/gen-sprites.py && python3 tools/pack-assets.py` (venv con Pillow creado con uv). `ASSETS.meta[name]` repite todo esto. Todo es 100% procedural/original (ver assets/LICENSES.md). src/assets.js ~54 KB.

Todas las hojas: celdas en rejilla, frame i de fila r en (i*fw, r*fh). Personajes miran a la DERECHA (espejar para izquierda); pies en y=22 de la celda 24x24 (1px de margen).

- `player_guia|medica|ing` 144x120, fw=fh=24, 6 cols. Filas: 0 idle(4f, 6fps), 1 run(6f, 12fps), 2 jump(2f, subida/pico), 3 fall(2f), 4 interact(4f, brazo extendido, 8fps). Meta `anims` lo trae.
- `lia` 96x24, 4 frames 24x24 (respiración, ~2fps), sentada herida, cara a la derecha.
- `tiles` 128x64, celda 16, 8 cols. Idx = fila*8+col. 0..15 = roca sólida autotile por máscara de lados EXPUESTOS al aire: N=1,E=2,S=4,W=8 (0 interior, 15 aislado); con N expuesto lleva capa de nieve. 16/17 fondo pared, 18 fondo con veta, 19 bloque cristal (sólido), 20 plataforma tablón (one-way, 6px superiores), 21 estalactita (colgar de techo), 22 estalagmita (apoyar), 23 nieve sólida, 24 racimo cristal deco, 25 musgo (colgar), 26 cadena, 27 escombros.
- `water_tile` 64x32, celda 16, 4 frames (5fps). Fila 0 superficie (ola, semitransparente), fila 1 cuerpo tileable.
- `props` 64x96, celda 16, 4 cols. Fila 0 antorcha 4f (llama; luz en ~(8,4)), 1 cristal luminoso 4f, 2 radio 4f (0-1 espera, 2-3 recibiendo), 3 cuerda: [segmento vertical tileable, gancho superior, rollo], 4 caja: [cerrada, abierta], 5 marcador "!" 4f.
- `cablecar` 384x72, 4 frames de 96x72 (balanceo pendular, 2fps), pivote/polea en (48,5), cable en y=3..4 (se puede dibujar el cable aparte a lo ancho).
- `sky_layers` 320x900 = 5 capas de 320x180 apiladas (fh=180), todas TILEABLES en X: 0 cielo (opaco, sol en x≈232,y≈112), 1 montañas lejanas, 2 montañas medias, 3 cresta + pinos, 4 nieve primer plano con copos (alfa). Parallax sugerido [0,.1,.25,.45,.8]. Las capas 1-4 son transparentes arriba.
- `ui_frame` 24x24, 9-slice con esquinas de 8px (`meta.slice=8`), borde naranja, interior violeta oscuro.

Carencias: sin packs de terceros; sin sprites de UI extra (iconos, barras); sin tiles de agua con espuma lateral.
