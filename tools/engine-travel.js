// Uso: NODE_PATH=<dir> node tools/engine-travel.js <puerto> <dir salida> <kind> [outcome]  -> fotogramas de la cinematica 1->2 (y metricas de T.travel13)
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [port, out, kind, outcome] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox', '--use-gl=swiftshader'] }), pg = await b.newPage({ viewport: { width: 960, height: 600 } });
  const errs = []; pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('http://localhost:' + port + '/tools/engine-test.html'); await pg.waitForTimeout(800);
  const caps = [20, 100, 160, 240, 330, 420, 520, 640];
  const r = await pg.evaluate(([k, o, caps]) => { const r = T.travel13(k, o, 11500, caps, 5); return r; }, [kind, outcome || 'bien', caps]);
  const fr = await pg.evaluate(() => T.frames);
  for (const k of Object.keys(fr)) if (/_2_/.test(k)) fs.writeFileSync(out + '/' + k + '.png', Buffer.from(fr[k].split(',')[1], 'base64'));
  console.log(JSON.stringify(r.map(x => [x.to, x.s, x.maxStep, x.dist, x.shots]))); console.log('ERR', JSON.stringify(errs)); await b.close();
})();
