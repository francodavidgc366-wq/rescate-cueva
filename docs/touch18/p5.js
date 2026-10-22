module.exports = async ({ pg, shot, ev }) => {
  const ph = () => ev('RC.st().phase');
  for (let i = 0; i < 6 && await ev('document.body.classList.contains("rc-dlg")'); i++) { await pg.touchscreen.tap(400, 330); await pg.waitForTimeout(700); }
  await ev('RC.advance()'); await pg.waitForTimeout(2500);
  await pg.locator('.h-opt').nth(1).tap(); await pg.waitForTimeout(500);
  for (let i=0;i<40 && (await ph())!=='secret';i++){ await pg.waitForTimeout(500); if (await ph()==='plan') await ev('RC.advance()'); }
  await pg.waitForTimeout(2500);
  await pg.locator('.h-so').nth(0).tap(); await pg.waitForTimeout(500); await shot('24secreto_sel');
  await pg.locator('.h-pn .h-btn.red').tap(); await pg.waitForTimeout(800); console.log('after seal', await ph());
  const seen = {};
  for (let i = 0; i < 60; i++) {
    const p = await ph(); if (!seen[p]) { seen[p] = 1; await pg.waitForTimeout(3500); await shot('25_' + p); console.log('phase', p); }
    const b = pg.locator('.h-pn [data-act=cont]:not([disabled])').locator('visible=true'); 
    if (await b.count()) { const t = await b.first().innerText(); console.log('cont', t.trim()); await shot('26_cont_' + p); { const r = await b.first().boundingBox(); await pg.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); } await pg.waitForTimeout(1500); if (p==='summary') break; }
    await pg.waitForTimeout(700);
    const tapSkip = pg.locator('.h-pn .h-btn:not([disabled])').locator('visible=true'); if (p==='resolve' && await tapSkip.count()) { console.log('resolve btn', (await tapSkip.first().innerText()).trim()); await tapSkip.first().tap().catch(()=>{}); }
  }
  console.log('final phase', await ph());
  await pg.waitForTimeout(3000); await shot('27_summary');
  console.log(await ev('[...document.querySelectorAll(".h-pn button,.h-jr button")].map(b=>b.className+":"+b.innerText.slice(0,18)).join("|")'));
};
