// Uso: NODE_PATH=<dir con playwright> node tools/hud5-run.js <puerto> <WxH> <pagina en tools/> '<js>' [captura.png]
const { chromium } = require('playwright');
(async () => {
  const [port, wh, page, code, shot] = process.argv.slice(2), [w, h] = wh.split('x').map(Number);
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] }); const pg = await b.newPage({ viewport: { width: w, height: h } });
  const errs = []; pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); }); pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('http://localhost:' + port + '/tools/' + page); await pg.waitForTimeout(700);
  const r = await pg.evaluate(code); console.log(typeof r === 'string' ? r : JSON.stringify(r));
  if (shot) { await pg.waitForTimeout(300); await pg.screenshot({ path: shot }); }
  console.log('CONSOLE', JSON.stringify(errs.filter(e => !/fonts.googleapis|ERR_/.test(e)).slice(0, 15))); await b.close();
})();
