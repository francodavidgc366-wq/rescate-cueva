// Uso: node tools/touch19-lobby.js <puerto> <WxH> <dir>  (mide abrir lobby -> codigo; captura skeleton y QR)
const { chromium } = require('/home/davidgc/.npm/_npx/705bc6b22212b352/node_modules/playwright-core');
(async () => {
  const [port, wh, out] = process.argv.slice(2), [w, h] = wh.split('x').map(Number);
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const cx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const pg = await cx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:' + port + '/index.html?_=' + Date.now()); await pg.waitForTimeout(1500);
  await pg.getByText('Crear sala').locator('visible=true').first().tap(); await pg.waitForTimeout(1200);
  await pg.evaluate(() => { window.__t0 = performance.now(); new MutationObserver((_, o) => { const c = document.querySelector('#rcv3 .lcode .code'); if (c && /^[A-Z0-9]{5}$/.test(c.textContent.trim()) && !window.__t1) { window.__t1 = performance.now(); } }).observe(document.body, { subtree: true, childList: true, characterData: true }); });
  await pg.getByRole('button', { name: 'Entrar' }).tap(); await pg.waitForTimeout(500);
  const t0 = Date.now(); await pg.evaluate(() => { window.__t0 = performance.now(); });
  const ys = pg.getByText(/Ya s. jugar/); if (await ys.count()) { await ys.first().tap(); await pg.waitForTimeout(0); }

  await pg.waitForTimeout(150); console.log((await pg.evaluate(() => document.querySelector('#rcv3').innerText)).slice(0,300)); await pg.screenshot({ path: `${out}/lobby_skel_${wh}.png` });
  await pg.waitForFunction(() => window.__t1, null, { timeout: 20000 });
  console.log('abrir-lobby -> codigo ms:', Date.now() - t0, 'obs', await pg.evaluate(() => Math.round(window.__t1 - window.__t0)));
  await pg.waitForTimeout(500); await pg.screenshot({ path: `${out}/lobby_qr_${wh}.png` });
  console.log('qr rect', await pg.evaluate(() => { const r = document.querySelector('#rcv3 .qr canvas').getBoundingClientRect(); return [r.top, r.bottom, innerHeight]; }), errs);
  await b.close();
})();
