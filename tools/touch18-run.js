// Uso: node tools/touch18-run.js <puerto> <WxH> <dir-salida>  (recorrido tactil completo con capturas; ver NOTES-touch18.md)
const { chromium } = require('/home/davidgc/.npm/_npx/705bc6b22212b352/node_modules/playwright-core');
(async () => {
  const [port, wh, out] = process.argv.slice(2), [w, h] = wh.split('x').map(Number);
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const cx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const pg = await cx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const shot = async n => { await pg.screenshot({ path: `${out}/${n}_${wh}.png` }); console.log('shot', n); };
  const tapT = async (t, o) => { await pg.getByText(t, { exact: false }).locator('visible=true').first().tap({ timeout: 8000, ...(o || {}) }); await pg.waitForTimeout(500); };
  const has = async t => (await pg.getByText(t).locator('visible=true').count()) > 0;
  const ev = (x) => pg.evaluate(x);
  const hold = async (sel, ms) => { const r = await pg.locator(sel).first().boundingBox(); const x = r.x + r.width / 2, y = r.y + r.height / 2; const c = await cx.newCDPSession(pg); await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] }); await pg.waitForTimeout(ms); await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await c.detach(); };
  const pos = () => ev('Engine.current.snapshot().p.guia');
  await pg.goto('http://localhost:' + port + '/index.html?_=' + Date.now()); await pg.waitForTimeout(1500); await shot('01menu');
  console.log('overflow', await ev('[document.documentElement.scrollWidth, innerWidth, document.documentElement.scrollHeight, innerHeight]'));
  await tapT('Ajustes'); await shot('02ajustes'); await ev("document.querySelector('#rcv3 .mod')?.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))"); await pg.waitForTimeout(400);
  await tapT('Jugar en solitario'); await pg.waitForTimeout(600);
  if (await has('Ya se jugar')) await tapT('Ya se jugar'); await shot('03tras_jugar');
  for (let i = 0; i < 8; i++) { for (const t of ['Empezar', 'Revelar mi secreto', 'Entendido, a la cueva', 'Saltar »']) { if (await has(t)) { await shot('04_' + t.replace(/\W/g, '')); await tapT(t); } } await pg.waitForTimeout(500); if (await ev('!!document.querySelector("#rc-tc.on")')) break; }
  await pg.waitForTimeout(2500); await shot('05juego');
  console.log('errs', errs);
  globalThis.__x = { pg, cx, b, shot, tapT, has, ev, hold, pos, errs };
  if (process.argv[5]) await require(process.argv[5])(globalThis.__x);
  await b.close();
})();
