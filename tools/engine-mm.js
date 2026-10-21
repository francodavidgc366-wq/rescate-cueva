// Uso: NODE_PATH=<dir> node tools/engine-mm.js <puerto> <dir salida>   -> PNGs del minimapa (compacto, grande, zoom) ampliados x3
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [port, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] }), pg = await b.newPage({ viewport: { width: 960, height: 600 } });
  const errs = []; pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('http://localhost:' + port + '/tools/engine-test.html'); await pg.waitForTimeout(800);
  const cases = [['big5', 640, 300, 5, 3, {}], ['big5z2', 640, 300, 5, 3, { zoom: 2 }], ['big5z3pan', 640, 300, 5, 3, { zoom: 3, panX: 20, panY: -5 }], ['big3', 640, 300, 3, 2, {}], ['big1', 640, 300, 1, 1, {}], ['cmp4', 240, 110, 5, 4, {}], ['cmp4z2', 240, 110, 5, 4, { zoom: 2 }], ['cmp1', 240, 110, 1, 1, {}]];
  for (const [nm, w, h, nz, az, o] of cases) {
    const url = await pg.evaluate(([w, h, nz, az, o]) => { const i = window.T.inst; i.stop(); i.setUnlocked(nz); i.gather(az); i.setWater(az === 4 ? 40 : 55); i.setWaterRate(0); for (let k = 0; k < 400; k++) i.step();
      const c = document.createElement('canvas'); c.width = w; c.height = h; const r = i.drawMinimap(c.getContext('2d'), w, h, o); const z = document.createElement('canvas'); z.width = w * 3; z.height = h * 3; const x = z.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, w * 3, h * 3); i.start(); return r ? z.toDataURL() : 'FAIL'; }, [w, h, nz, az, o]);
    fs.writeFileSync(out + '/' + nm + '.png', Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log('ok', JSON.stringify(errs)); await b.close();
})();
