// Uso: NODE_PATH=<pw>/node_modules node tools/ui10-run.js <puerto> <WxH> <pagina?query> '<js>' <captura.png>
const { chromium } = require('playwright-core');
(async () => {
  const [port, wh, page, code, shot] = process.argv.slice(2), [w, h] = wh.split('x').map(Number);
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] }); const pg = await b.newPage({ viewport: { width: w, height: h } });
  const errs = []; pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await pg.goto('http://localhost:' + port + '/tools/' + page); await pg.waitForTimeout(700);
  const r = await pg.evaluate(code); if (r !== undefined) console.log(typeof r === 'string' ? r : JSON.stringify(r));
  if (shot) { await pg.waitForTimeout(900); await pg.screenshot({ path: shot }); }
  console.log('ERR', JSON.stringify(errs.filter(e => !/fonts.g|ERR_/.test(e)).slice(0, 8))); await b.close();
})();
