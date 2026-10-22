module.exports = async ({ pg, shot, ev, hold, pos, tapT, has }) => {
  for (let i = 0; i < 6 && await ev('document.body.classList.contains("rc-dlg")'); i++) { await pg.touchscreen.tap(400, 330); await pg.waitForTimeout(700); }
  await pg.waitForTimeout(1000);
  const id = JSON.parse(await ev('JSON.stringify(Object.keys(Engine.current.pois))'))[0];
  await ev(`Engine.current.setBot('guia', true)`); await ev(`Engine.current.botGoto('guia','${id}',function(){window.__arr=1})`);
  for (let i = 0; i < 40 && !(await ev('window.__arr')); i++) await pg.waitForTimeout(500);
  await ev(`Engine.current.setBot('guia', false)`); await pg.waitForTimeout(600);
  await hold('[data-k=e]', 120); await pg.waitForTimeout(900);
  // minijuego: tocar la caja
  const r = await pg.locator('.h-mg').boundingBox(); await pg.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await pg.waitForTimeout(300); await shot('10mg_tap');
  await pg.waitForTimeout(1500); console.log('mg gone', !(await ev('!!document.querySelector(".h-mg")')));
  await shot('11tras_mg');
  // chat
  await pg.touchscreen.tap(40, 190); await pg.waitForTimeout(700); await shot('12chat'); console.log('chat open', await ev('!!document.querySelector(".h-chat.open")'));
  const chips = pg.locator('.h-chips button').first(); if (await chips.count()) { await chips.tap(); await pg.waitForTimeout(600); await shot('12b_chat_chip'); }
  await pg.locator('.h-ch').first().tap(); await pg.waitForTimeout(600); console.log('chat closed', !(await ev('!!document.querySelector(".h-chat.open")')));
  // mapa
  await pg.touchscreen.tap(40, 80); await pg.waitForTimeout(700); await shot('13mapa'); console.log('big', await ev('!!document.querySelector(".h-big")'), await ev('document.querySelector("#rc-tc").className'));
  await ev('document.querySelector(".h-big") && document.querySelector(".h-big").outerHTML.slice(0,300)').then(console.log);
};
