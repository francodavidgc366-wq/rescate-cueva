module.exports = async ({ pg, shot, ev, hold, pos }) => {
  for (let i = 0; i < 6 && await ev('document.body.classList.contains("rc-dlg")'); i++) { await pg.touchscreen.tap(400, 330); await pg.waitForTimeout(700); }
  await pg.waitForTimeout(1500);
  const ids = await ev('JSON.stringify(Object.entries(Engine.current.pois).map(([k,p])=>[k,p.kind,p.x,p.y]))'); console.log(ids);
  const id = JSON.parse(ids)[0][0];
  await ev(`Engine.current.setBot('guia', true)`); await ev(`Engine.current.botGoto('guia','${id}',function(){window.__arr=1})`);
  for (let i = 0; i < 40 && !(await ev('window.__arr')); i++) await pg.waitForTimeout(500);
   await ev(`Engine.current.setBot('guia', false)`);
  await pg.waitForTimeout(600); await shot('08poi'); console.log(await pos());
  await hold('[data-k=e]', 120); await pg.waitForTimeout(900); await shot('09minijuego');
  console.log(await ev('document.querySelector(".h-mg") && document.querySelector(".h-mg").className'), await ev('document.querySelector("#rc-tc").className'));
};
