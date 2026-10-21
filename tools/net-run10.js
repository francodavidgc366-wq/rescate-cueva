// Uso: NODE_PATH=<playwright> node tools/net-run10.js <puerto> [query]   (query ej. ?relay=1)
const { chromium } = require('playwright');
(async () => {
  const [port, q = ''] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  const mk = async () => { const c = await b.newContext(), p = await c.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message)); await p.goto('http://localhost:' + port + '/tools/net-test.html' + q); await p.evaluate(() => { window.ST = []; Net.on('status', s => ST.push(s)); }); return p; };
  const A = await mk(), B = await mk();
  const h = await A.evaluate(async () => (await Net.host({ name: 'A' })).roomCode).catch(e => 'ERR ' + e.message); console.log('host', h);
  const j = await B.evaluate(async c => { try { const r = await Net.join(c, { name: 'B' }); return r; } catch (e) { return 'ERR ' + e.message; } }, h); console.log('join', JSON.stringify(j));
  await A.waitForTimeout(2500);
  console.log('A', await A.evaluate(() => [Net.status, ST, Net.players.length])); console.log('B', await B.evaluate(() => [Net.status, ST]));
  await B.evaluate(() => { window.RC = []; Net.on('reconnected', () => RC.push(1)); Net.debugDrop(); }); await B.waitForTimeout(6000);
  console.log('reconn', await B.evaluate(() => [RC.length, Net.status, Net.role, Net.players.length]));
  const bad = await B.evaluate(async () => { Net.config.retryBaseMs = 50; try { await Net.join('ZZZZZ'); } catch (e) { return e.message + ' | ' + Net.status; } }); console.log('inexistente', bad);
  await b.close();
})();
