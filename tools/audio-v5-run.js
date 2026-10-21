/* Verificacion numerica v5. Uso: NODE_PATH=<dir con playwright-core> node tools/audio-v5-run.js */
const fs = require('fs'), path = require('path'); const { chromium } = require('playwright-core');
(async () => {
  const br = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' }); const pg = await br.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.route('http://t.test/', r => r.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' })); await pg.goto('http://t.test/'); await pg.addScriptTag({ content: fs.readFileSync(path.join(__dirname, '../src/audio.js'), 'utf8') });
  const R = await pg.evaluate(async () => {
    const db = x => 20 * Math.log10(Math.max(x, 1e-9));
    function an(buf) { const n = buf.length, ch = [buf.getChannelData(0), buf.getChannelData(1)], sr = buf.sampleRate; let pk = 0, ss = 0, clip = 0, jump = 0; const W = Math.floor(sr * .5), wr = [];
      for (let c = 0; c < 2; c++) { const d = ch[c]; let ws = 0, wn = 0; for (let i = 0; i < n; i++) { const v = d[i], a = Math.abs(v); if (a > pk) pk = a; if (a >= .99) clip++; ss += v * v; if (i) jump = Math.max(jump, Math.abs(v - d[i - 1])); ws += v * v; if (++wn === W) { wr.push(Math.sqrt(ws / wn)); ws = 0; wn = 0; } } }
      return { peak: +db(pk).toFixed(1), rms: +db(Math.sqrt(ss / (2 * n))).toFixed(1), clip, jump: +jump.toFixed(3), silentWin: wr.filter(x => db(x) < -75).length, wins: wr.length, nan: ch[0].some(Number.isNaN) }; }
    const out = { music: {}, sfx: {}, burst: {}, talk: {} };
    for (const m of [.4, 1]) { out.music[m] = {};
      for (const t of Sound.tracks) for (const x of (t === 'explore' || t === 'plan' ? [0, 1] : [null])) out.music[m][t + (x == null ? '' : '@' + x)] = an(await Sound.render('music', t, { seconds: 16, intensity: x == null ? undefined : x, master: m })); }
    for (const n of Sound.sfxNames) out.sfx[n] = an(await Sound.render('sfx', n, { seconds: 4, master: 1 }));
    const names = Sound.sfxNames, pick = k => Array.from({ length: k }, (_, i) => [names[(i * 7) % names.length], 1 + i * .02]);
    for (const m of [.4, 1]) { out.burst[m] = { sfx12: an(await Sound.render('sfx', 'x', { seconds: 5, master: m, burst: pick(12) })), all: an(await Sound.render('sfx', 'x', { seconds: 6, master: m, burst: names.map((n, i) => [n, 1 + (i % 10) * .05]) })),
      musicPlusBurst: an(await Sound.render('music', 'explore', { seconds: 8, intensity: 1, master: m, burst: pick(10) })) }; }
    for (const r of ['guia', 'medica', 'ing', 'lia', 'director', 'otro']) for (const mood of ['neutral', 'alegre', 'tenso', 'triste']) out.talk[r + '/' + mood] = an(await Sound.render('talk', r, { seconds: .3, mood, master: 1 }));
    // API
    Sound.setVolume(.7); out.api = { vol: Sound.getVolume(), saved: (localStorage.getItem('rcv3_audio')), names: Sound.sfxNames.length, talkBeforeUnlock: Sound.talk('guia', 'neutral') };
    return out; });
  const f = (o) => `pk ${o.peak} rms ${o.rms} clip ${o.clip} jump ${o.jump} sil ${o.silentWin}/${o.wins}`; let fails = [];
  const chk = (n, o, opt = {}) => { if (o.nan || o.peak >= -3 || o.clip) fails.push(n + ' pico/clip ' + f(o)); if (!opt.noSil && (o.silentWin > o.wins * .5 || o.rms < -80)) fails.push(n + ' silencio ' + f(o)); if (o.jump > .5) fails.push(n + ' salto ' + f(o)); };
  for (const m in R.music) for (const k in R.music[m]) { console.log('music m' + m, k.padEnd(11), f(R.music[m][k])); chk('music ' + m + ' ' + k, R.music[m][k]); }
  for (const k in R.sfx) { chk('sfx ' + k, R.sfx[k], { noSil: 1 }); if (R.sfx[k].rms < -80) fails.push('sfx ' + k + ' mudo'); }
  const sp = Object.entries(R.sfx).sort((a, b) => b[1].peak - a[1].peak); console.log('SFX individuales (m=1) pico max:', sp.slice(0, 3).map(e => e[0] + ' ' + e[1].peak).join(', '), '| rms rango', Math.min(...sp.map(e => e[1].rms)), Math.max(...sp.map(e => e[1].rms)));
  for (const m in R.burst) for (const k in R.burst[m]) { console.log('burst m' + m, k.padEnd(15), f(R.burst[m][k])); chk('burst ' + m + ' ' + k, R.burst[m][k], { noSil: 1 }); }
  for (const k in R.talk) { const o = R.talk[k]; if (o.rms < -80 || o.peak > -20) fails.push('talk ' + k + ' ' + f(o)); } console.log('talk pico max', Math.max(...Object.values(R.talk).map(o => o.peak)), 'rms min', Math.min(...Object.values(R.talk).map(o => o.rms)));
  console.log('api', JSON.stringify(R.api), errs.length ? errs : ''); console.log(fails.length ? 'FALLOS:\n' + fails.join('\n') : 'OK sin fallos'); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
