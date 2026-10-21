// Uso: NODE_PATH=<dir playwright> CHROME=/usr/bin/google-chrome node tools/engine-signs.js <puerto> [dir]
// Capturas del cartel de puerta a escalas 3, 3.85 y 4 (canvas a tamano CSS fijo) + recorte x6 del canvas 320x180.
const { chromium } = require('playwright');
(async () => {
  const [port, out = '/tmp/signs'] = process.argv.slice(2); require('fs').mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox', '--use-gl=swiftshader'] });
  for (const s of [3, 3.85, 4]) {
    const pg = await b.newPage({ viewport: { width: Math.ceil(320 * s), height: Math.ceil(180 * s) + 40 } });
    await pg.goto('http://localhost:' + port + '/tools/engine-test.html'); await pg.waitForTimeout(500);
    const r = await pg.evaluate((s) => {
      const i = T.inst, g = i.getGates().filter(q => q.kind === 'anclaje')[0]; T.round(g.zone); i.stop(); i.setLocal(g.role);
      ['guia','medica','ing'].forEach(x => i.setBot(x, false)); const bd = i.bodies[g.role]; bd.x = g.x - 90; bd.y = g.y; i.setGuide(g.id); i.setViewInsets({ top: 37, bottom: 41 }); i.say(g.role, 'hola equipo');
      for (let k = 0; k < 90; k++) i.step(); i.render();
      const c = document.getElementById('c'); c.style.width = 320 * s + 'px'; c.style.height = 180 * s + 'px'; c.style.imageRendering = 'pixelated';
      document.getElementById('info') && (document.getElementById('info').style.display = 'none');
      return g;
    }, s);
    await pg.screenshot({ path: `${out}/full_${s}.png` });
    const data = await pg.evaluate(() => document.getElementById('c').toDataURL());
    require('fs').writeFileSync(`${out}/canvas_${s}.png`, Buffer.from(data.split(',')[1], 'base64'));
    console.log(s, JSON.stringify(r)); await pg.close();
  }
  await b.close();
})();
// ampliacion x6 de un recorte del canvas: node tools/engine-signs.js zoom <png> <x> <y> <w> <h> <salida>
