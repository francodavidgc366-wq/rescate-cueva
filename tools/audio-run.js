/* Ejecuta tools/audio-test.html con Playwright (chromium propio, no el navegador compartido), imprime el resumen y vuelca WAV.
   Uso: NODE_PATH=<dir con node_modules/playwright-core> node tools/audio-run.js [dirSalidaWav]   (CHROME=ruta opcional al ejecutable) */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');
const ROOT = path.resolve(__dirname, '..'), OUT = path.resolve(process.argv[2] || path.join(ROOT, 'audio-out'));
fs.mkdirSync(OUT, { recursive: true });
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (q.method === 'PUT') { const ch = []; q.on('data', c => ch.push(c)); q.on('end', () => { fs.writeFileSync(path.join(OUT, path.basename(u)), Buffer.concat(ch)); r.end('ok'); }); return; }
  const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); }
  r.setHeader('Content-Type', f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream'); r.end(fs.readFileSync(f));
});
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port;
  const exe = process.env.CHROME || undefined;
  const br = await chromium.launch({ executablePath: exe, ignoreDefaultArgs: ['--autoplay-policy=no-user-gesture-required'], args: ['--autoplay-policy=document-user-activation-required'] }); // politica de produccion: exige gesto
  const pg = await br.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto(base + '/tools/audio-test.html');
  // (b) navegador real: forzamos 'suspended' (lo que hace la politica de autoplay), un click REAL en la pagina (no en #go) debe reanudar via el hook
  //     automatico y arrancar la pista pendiente sin que nadie llame a Sound.unlock(); luego el flujo normal con #go
  const before = await pg.evaluate(async () => { Sound.music('explore'); await Sound._ctx().suspend(); return Sound.state(); });
  await pg.mouse.click(5, 300); await pg.waitForFunction(() => Sound.state().running && Sound.state().music === 'explore', null, { timeout: 5000 }); const hooked = await pg.evaluate(() => Sound.state());
  await pg.click('#go'); await pg.waitForFunction(() => window.__BROWSER, null, { timeout: 15000 }); const b = await pg.evaluate(() => window.__BROWSER);
  // (a) offline
  await pg.click('#run'); await pg.waitForFunction(() => window.__AUDIO_RESULTS, null, { timeout: 280000 }); const r = await pg.evaluate(() => window.__AUDIO_RESULTS);
  // (c) WAV
  const wavs = [['music', 'explore', { seconds: 16, intensity: .9 }, 'explore_hi.wav'], ['music', 'explore', { seconds: 16, intensity: .1 }, 'explore_lo.wav'], ['music', 'menu', { seconds: 20 }, 'menu.wav'], ['music', 'win', { seconds: 14 }, 'win.wav'],
    ['sfx', 'achievement', { seconds: 3 }, 'sfx_achievement.wav'], ['sfx', 'thunder', { seconds: 4 }, 'sfx_thunder.wav'], ['sfx', 'error', { seconds: 2 }, 'sfx_error.wav'], ['sfx', 'radio_static', { seconds: 2 }, 'sfx_radio_static.wav']];
  for (const w of wavs) await pg.evaluate(a => saveWav(...a), w);
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ before, b, r }, null, 1));
  console.log('suspendido antes del gesto:', before.ctxState, '| tras click de raton (hook auto):', hooked.ctxState, 'pista', hooked.music);
  console.log('tras click:', JSON.stringify({ running: b.s2.running, ctxState: b.s2.ctxState, music: b.s2.music, maxLevel: b.maxLevel, levelWhenMuted: b.levelWhenMuted, voice: b.s2.voice }));
  console.log('offline: pistas', Object.keys(r.music).length, 'sfx', Object.keys(r.sfx).length, 'ref ruido blanco planitud', r.noiseRef, '| FALLOS', r.fails.length); r.fails.forEach(f => console.log('  FAIL', f));
  for (const n in r.music) { const a = r.music[n]; console.log(n.padEnd(9), 'rms', a.rmsDb, 'pico', a.peak, 'clip', a.clip, 'enEscala', a.inScale, 'acBar/Ctl', a.acBar + '/' + a.acCtl, 'plan', a.flatness); }
  console.log('adaptivo (rms dB baja->alta):', JSON.stringify(Object.fromEntries(Object.entries(r.adaptive).map(([k, v]) => [k, v.lo + '->' + v.hi]))));
  if (errs.length) console.log('errores de pagina:', errs.slice(0, 5));
  await br.close(); srv.close(); process.exit(r.ok && b.s2.running && before.ctxState === 'suspended' && hooked.running ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
