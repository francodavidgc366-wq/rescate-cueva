module.exports = async ({ pg, shot, ev }) => {
  for (let i = 0; i < 6 && await ev('document.body.classList.contains("rc-dlg")'); i++) { await pg.touchscreen.tap(400, 330); await pg.waitForTimeout(700); }
  await ev('RC.advance()'); await pg.waitForTimeout(3000); await shot('21plan'); await pg.evaluate('window.scrollTo(0,0)');
  await pg.locator('.h-opt').nth(1).tap(); await pg.waitForTimeout(800); await shot('22plan_votado');
  console.log(await ev('RC.st().phase'));
  await pg.waitForTimeout(8000); console.log(await ev('RC.st().phase')); 
  for (let i=0;i<30 && (await ev('RC.st().phase'))!=='secret';i++){ await pg.waitForTimeout(1000); if (await ev('RC.st().phase')==='plan') await ev('RC.advance()'); }
  await pg.waitForTimeout(2500); await shot('23secreto');
  console.log(await ev('RC.st().phase'), await ev('[...document.querySelectorAll(".h-pn button")].map(b=>b.className+":"+b.innerText.slice(0,15)).join("|")'));
};
