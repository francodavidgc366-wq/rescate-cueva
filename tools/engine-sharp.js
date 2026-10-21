// Uso: NODE_PATH=<dir playwright> node tools/engine-sharp.js <puerto> [dir-salida]
// Para cada tamano de ventana y DPR: fit(), comprueba que el canvas mide un multiplo ENTERO de 320x180 en pixeles fisicos y guarda captura ampliada del cartel.
const { chromium } = require('playwright');
(async () => {
  const [port, out = '/tmp/sharp'] = process.argv.slice(2); require('fs').mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox', '--use-gl=swiftshader'] });
  for (const dpr of [1, 1.25, 1.5]) for (const [w, h] of [[1366, 768], [1920, 1080], [1280, 650], [1536, 864], [1440, 900]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr }), pg = await ctx.newPage();
    await pg.goto('http://localhost:' + port + '/tools/engine-test.html'); await pg.waitForTimeout(500);
    const r = await pg.evaluate(() => {
      const i = T.inst, g = i.getGates()[0]; T.round(g.zone); i.stop(); i.setLocal(g.role); const b = i.bodies[g.role]; b.x = g.x - 70; b.y = g.y; i.setGuide(g.id, { label: 'ANCLAJE EN LOS E' });
      for (let k = 0; k < 90; k++) i.step(); i.render(); i.fit(innerWidth, innerHeight - 30); i.render();
      const c = document.getElementById('c').getBoundingClientRect(), d = devicePixelRatio;
      return { w: c.width * d, h: c.height * d, x: c.left * d, y: c.top * d, s: c.width * d / 320 };
    });
    await pg.waitForTimeout(100);
    const ok = Math.abs(r.s - Math.round(r.s)) < 0.02;
    console.log(`${w}x${h}@${dpr}`, 'escala fisica', r.s.toFixed(3), ok ? 'ENTERA' : 'NO ENTERA', 'x,y fis', r.x.toFixed(2), r.y.toFixed(2));
    await pg.screenshot({ path: `${out}/s_${w}x${h}_${dpr}.png` }); await ctx.close();
  }
  await b.close();
})();
