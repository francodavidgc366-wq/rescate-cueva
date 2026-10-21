// Uso: node tools/engine-crop.js <png> <x> <y> <w> <h> <salida> [k=2]  recorte de una captura de pantalla (pixeles fisicos), ampliado k veces sin suavizado
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [f, x, y, w, h, o, k = 2] = process.argv.slice(2), b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] }), pg = await b.newPage({ viewport: { width: w * k, height: h * k } });
  const u = 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  await pg.setContent(`<body style="margin:0"><div style="width:${w * k}px;height:${h * k}px;overflow:hidden"><img src="${u}" style="image-rendering:pixelated;transform-origin:0 0;transform:scale(${k});margin:-${y * k}px 0 0 -${x * k}px"></div>`);
  await pg.screenshot({ path: o }); await b.close();
})();
