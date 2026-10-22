// Uso: node tools/touch19-fs.js <puerto> <dir>  (fullscreen, boton menu/pausa, iOS, skeleton con broker bloqueado)
const { chromium } = require('/home/davidgc/.npm/_npx/705bc6b22212b352/node_modules/playwright-core');
(async () => {
  const [port, out] = process.argv.slice(2); const b = await chromium.launch({ args: ['--no-sandbox'] });
  const U = 'http://localhost:' + port + '/index.html?_=' + Date.now();
  { // Android-like
    const cx = await b.newContext({ viewport: { width: 850, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const pg = await cx.newPage();
    await pg.goto(U); await pg.waitForTimeout(1500);
    console.log('menu fsbtn', await pg.locator('#rcv3 [data-fs]').count(), 'fs antes', await pg.evaluate('!!document.fullscreenElement'));
    await pg.evaluate(`window.__L=[];screen.orientation&&(screen.orientation.lock=function(o){window.__L.push(o);return Promise.resolve()})`);
    await pg.touchscreen.tap(60, 60); await pg.waitForTimeout(600);
    console.log('tras 1er toque: fs', await pg.evaluate('!!document.fullscreenElement'), 'lock', await pg.evaluate('window.__L'));
    await pg.evaluate('document.exitFullscreen()'); await pg.waitForTimeout(300);
    await pg.locator('#rcv3 [data-fs]').tap(); await pg.waitForTimeout(500); console.log('boton menu -> fs', await pg.evaluate('!!document.fullscreenElement'));
    await pg.screenshot({ path: out + '/fs_menu.png' }); await cx.close();
  }
  { // iPhone UA sin Fullscreen API
    const cx = await b.newContext({ viewport: { width: 850, height: 390 }, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' }); const pg = await cx.newPage();
    await pg.addInitScript(() => { for (const k of ['requestFullscreen', 'webkitRequestFullscreen']) Element.prototype[k] = undefined; });
    await pg.goto(U); await pg.waitForTimeout(1500); await pg.touchscreen.tap(60, 60); await pg.waitForTimeout(500);
    console.log('iOS ayuda:', await pg.locator('#rc-ios').count(), await pg.locator('#rc-ios').innerText().catch(() => ''));
    await pg.screenshot({ path: out + '/fs_ios.png' }); await cx.close();
  }
  { // skeleton: broker bloqueado
    const cx = await b.newContext({ viewport: { width: 850, height: 280 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const pg = await cx.newPage();
    await pg.route(/peerjs\.com/, r => r.abort()); await pg.goto(U); await pg.waitForTimeout(1500);
    await pg.getByText('Crear sala').locator('visible=true').first().tap(); await pg.waitForTimeout(800);
    await pg.getByRole('button', { name: 'Entrar' }).tap(); await pg.waitForTimeout(500); await pg.getByText(/Ya s. jugar/).first().tap(); await pg.waitForTimeout(700);
    await pg.screenshot({ path: out + '/lobby_skel2.png' }); await cx.close();
  }
  await b.close();
})();
