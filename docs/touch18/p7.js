module.exports = async ({ pg, cx, b, shot, ev }) => {
  for (let i = 0; i < 6 && await ev('document.body.classList.contains("rc-dlg")'); i++) { await pg.touchscreen.tap(400, 330); await pg.waitForTimeout(700); }
  await ev('Engine.current.playTravel({toZone:2,ms:11500,kind:"generico"},function(){window.__csend=1})'); await pg.waitForTimeout(2500);
  console.log('cs', await ev('Engine.isCutscene()'), await ev('document.querySelector("#rc-tc").className')); await shot('40cutscene');
  const r = await pg.locator('#rc-tc .skip').boundingBox(); await pg.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await pg.waitForTimeout(1500);
  console.log('cs after skip', await ev('Engine.isCutscene()'), await ev('window.__csend'));
  // vertical
  await pg.setViewportSize({ width: 390, height: 844 }); await pg.waitForTimeout(500); await shot('41vertical');
  console.log('rot display', await ev('getComputedStyle(document.querySelector("#rc-rot")).display'));
  await pg.setViewportSize({ width: 844, height: 390 }); await pg.waitForTimeout(500);
  console.log('overflow', await ev('[document.documentElement.scrollWidth, innerWidth, document.documentElement.scrollHeight, innerHeight]'));
};
