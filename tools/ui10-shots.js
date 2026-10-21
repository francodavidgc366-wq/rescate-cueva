// Uso: node tools/ui10-shots.js <puerto> <WxH> <salida-dir> [filtro]  (HUD real sobre hud-test.html?real=1)
const { chromium } = require('playwright-core');
(async () => {
  const [port, wh, out, only] = process.argv.slice(2), [w, h] = wh.split('x').map(Number);
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] });
  const S = [
    ['explore', 'T.explore()'], ['urgent', 'T.explore_urgent()'], ['briefing', 'T.briefing()'], ['plan', 'T.plan()'], ['plan_chosen', 'T.plan_chosen()'], ['secret', 'T.secret()'],
    ['resolve', 'T.resolve()', 6500], ['summary', 'T.summary()', 2500], ['dossier', 'T.dossier()'], ['lie', 'T.lie()'], ['secreto', 'T.secreto()'], ['ach', 'T.ach()'], ['float', 'T.float()', 400],
    ['pause', 'T.pause()'], ['help', 'T.help()'],
    ['dlg', 'T.explore();Hud.dialogue([{who:"director",text:"Atención, equipo. La cueva se inunda poco a poco y el tiempo corre, debemos movernos ya o Lía no lo logrará."}])', 3500],
    ['say', 'T.explore();Hud.say({who:"guia",text:"He encontrado una grieta al norte que parece transitable, vamos."},{ms:9000});Hud.say({who:"director",text:"El agua sube."},{ms:9000})', 800],
    ['floatcard', 'T.explore();Hud.floatCard({title:"Mapa viejo",text:"Una grieta al norte.",icon:"mapa",reliability:.8})', 800],
    ['coach', 'T.explore();Hud.setCoach({text:"Camina hasta un icono brillante y presiona E.",step:2,total:5})'],
    ['bigmap', 'T.explore();Hud.setMinimapSource(function(g,w,h){g.fillStyle="#223";g.fillRect(0,0,w,h);g.fillStyle="#6cf";g.fillRect(10,10,w/2,h/3);return true});document.querySelector("[data-act=bigmap]").click()'],
    ['chatopen', 'T.explore();Hud.chat.focus()'],
  ].filter(s => !only || s[0] === only);
  for (const [n, js, wait] of S) {
    const pg = await b.newPage({ viewport: { width: w, height: h } }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('http://localhost:' + port + '/tools/hud-test.html?real=1&dev0=1'); await pg.waitForTimeout(500);
    await pg.evaluate('(function(){Hud.setMinimapSource(function(g,w,h){g.fillStyle="#223";g.fillRect(0,0,w,h);g.fillStyle="#6cf";g.fillRect(10,10,w/2,h/3);return true});' + js + ';})()'); await pg.waitForTimeout(wait || 1200);
    await pg.screenshot({ path: out + '/' + n + '_' + wh + '.png' }); if (errs.length) console.log(n, 'ERR', errs[0]); await pg.close();
  }
  await b.close();
})();
