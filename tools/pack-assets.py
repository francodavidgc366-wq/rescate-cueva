#!/usr/bin/env python3
"""assets/gen/*.png + meta.json -> src/assets.js (dataURL base64). Uso: python3 tools/pack-assets.py (sin Pillow)"""
import base64, glob, json, os
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
meta = json.load(open(f'{R}/assets/gen/meta.json'))
images = {}
for n in meta:
    images[n] = 'data:image/png;base64,' + base64.b64encode(open(f'{R}/assets/gen/{n}.png', 'rb').read()).decode()
credits = ['Todos los sprites, tilesets y fondos: generados por código (tools/gen-sprites.py), originales del proyecto, dedicados a CC0 1.0.',
           'Fuente UI: Press Start 2P (CodeMan38, SIL OFL 1.1) si está disponible; sin ella, monospace del sistema.']
js = 'window.ASSETS = ' + json.dumps(dict(images=images, meta=meta, credits=credits), separators=(',', ':')) + ';\n'
assert len(js) < 3_000_000, len(js)
open(f'{R}/src/assets.js', 'w').write(js); print('src/assets.js', len(js) // 1024, 'KB')
