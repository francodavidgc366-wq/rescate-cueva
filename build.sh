#!/bin/sh
# Genera index.html autocontenido: PeerJS + src/*.js inlinados.
set -e
cd "$(dirname "$0")"
python3 - <<'PY'
files = ['vendor/peerjs.min.js','vendor/qrcode.js','src/assets.js','src/audio.js','src/story.js','src/engine.js','src/net.js','src/ui.js','src/hud.js','src/main.js','src/touch.js']
js = ''.join('<script>\n' + open(f, encoding='utf-8').read().replace('</script', '<\\/script') + '\n</script>\n' for f in files)
open('index.html', 'w', encoding='utf-8').write(
 '<!doctype html>\n<html lang="es"><head><meta charset="utf-8">\n'
 '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
 '<title>Rescate en la Cueva</title>\n'
 '<style>html,body{margin:0;height:100%;background:#0d0b16;overflow:hidden;overscroll-behavior:none}</style></head>\n<body>\n' + js + '</body></html>\n')
PY
ls -l index.html
