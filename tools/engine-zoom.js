// Uso: NODE_PATH=<playwright> node tools/engine-zoom.js <png320x180> <x> <y> <w> <h> <salida.png> [k=6]  -> recorte ampliado k veces sin suavizado
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [f, x, y, w, h, o, k = 6] = process.argv.slice(2), b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] }), pg = await b.newPage({ viewport: { width: w * k, height: h * k } });
  const u = 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  await pg.setContent(`<body style="margin:0;overflow:hidden"><div style="width:${w * k}px;height:${h * k}px;background:url(${u}) -${x * k}px -${y * k}px/${320 * k}px ${180 * k}px;image-rendering:pixelated"></div>`);
  await pg.screenshot({ path: o }); await b.close();
})();
