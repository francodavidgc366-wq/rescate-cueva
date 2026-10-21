// Uso: node tools/ui10-ui.js <puerto> <WxH> <salida-dir>  (pantallas de ui.js sobre ui-test.html?real=1)
const { chromium } = require('playwright-core');
(async () => {
  const [port, wh, out] = process.argv.slice(2), [w, h] = wh.split('x').map(Number);
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] });
  const S = [['menu', 'T.menu()'], ['lobby', 'T.lobby()'], ['lobbyhost', 'T.lobbyhost()'], ['role', 'T.role()', 2500], ['final', 'T.final()', 3500], ['finalD', 'T.finalD()', 3500], ['ach', 'T.ach()'], ['settings', 'T.settings()'], ['credits', 'UI.showCredits&&UI.showCredits()'], ['intro', 'T.intro()', 3000], ['rescate', 'T.rescate()', 3000],
    ...[0, 1, 2, 3, 4, 5, 6, 7].map(n => ['tut' + n, 'T.tutorial()', 1500, n])];
  for (const [n, js, wait, keys] of S) {
    const pg = await b.newPage({ viewport: { width: w, height: h } }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('http://localhost:' + port + '/tools/ui-test.html?real=1&dev0=1&go=none'); await pg.waitForTimeout(600);
    await pg.evaluate('(function(){' + js + ';})()'); await pg.waitForTimeout(500);
    for (let k = 0; k < (keys || 0); k++) { await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(150); }
    await pg.waitForTimeout(wait || 1000); await pg.screenshot({ path: out + '/ui_' + n + '_' + wh + '.png' }); if (errs.length) console.log(n, 'ERR', errs[0]); await pg.close();
  }
  await b.close();
})();
