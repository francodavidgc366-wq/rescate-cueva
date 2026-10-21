// Uso: NODE_PATH=<dir con playwright> node tools/engine-run.js <puerto> '<js a evaluar en la pagina>' [captura.png]
// Abre tools/engine-test.html servido por python3 -m http.server <puerto>, evalua el JS (puede ser async) y muestra el JSON; imprime errores de consola.
const { chromium } = require('playwright');
(async () => {
  const [port, code, shot] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox', '--use-gl=swiftshader'] }); const pg = await b.newPage({ viewport: { width: 960, height: 600 } });
  const errs = []; pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); }); pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('http://localhost:' + port + '/tools/engine-test.html'); await pg.waitForTimeout(800);
  const r = await pg.evaluate(code); console.log(typeof r === 'string' ? r : JSON.stringify(r));
  if (shot) await pg.screenshot({ path: shot });
  console.log('CONSOLE', JSON.stringify(errs.slice(0, 15))); await b.close();
})();
