module.exports = async ({ pg, cx, shot, ev }) => {
  const ph = () => ev('RC.st().phase');
  for (let i = 0; i < 6 && await ev('document.body.classList.contains("rc-dlg")'); i++) { await pg.touchscreen.tap(400, 330); await pg.waitForTimeout(700); }
  for (let i = 0; i < 40 && (await ph()) !== 'summary'; i++) { await ev('RC.advance()'); await pg.waitForTimeout(1200); if (await pg.locator('.h-so').count()) { await pg.locator('.h-so').first().tap(); await pg.waitForTimeout(300); await pg.locator('.h-pn .h-btn.red').tap().catch(()=>{}); } }
  await pg.waitForTimeout(4500);
  const sc = await ev('(function(){var e=document.querySelector(".h-jr");var s=[e,...e.querySelectorAll("*")].filter(x=>x.scrollHeight>x.clientHeight+4&&/auto|scroll/.test(getComputedStyle(x).overflowY));return s.map(x=>x.className+":"+x.scrollTop+"/"+x.scrollHeight+"/"+x.clientHeight).join("|")})()');
  console.log('scrollables', sc);
  const c = await cx.newCDPSession(pg);
  await c.send('Input.synthesizeScrollGesture', { x: 400, y: 250, yDistance: 150, gestureSourceType: 'touch', speed: 800 }); await pg.waitForTimeout(500);
  console.log('after swipe', await ev('(function(){var e=document.querySelector(".h-jr");var s=[e,...e.querySelectorAll("*")].filter(x=>x.scrollHeight>x.clientHeight+4&&/auto|scroll/.test(getComputedStyle(x).overflowY));return s.map(x=>x.className+":"+x.scrollTop).join("|")})()'));
  await shot('30diario');
  const b = pg.locator('.h-jr .rdy, .h-jr [data-act=cont]').first(); const r = await b.boundingBox(); await pg.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await pg.waitForTimeout(3000);
  console.log('phase', await ph()); 
  for (let i = 0; i < 6 && await ev('document.body.classList.contains("rc-dlg")'); i++) { await pg.touchscreen.tap(400, 330); await pg.waitForTimeout(700); }
  await pg.waitForTimeout(1500); await shot('31ronda2');
  await pg.touchscreen.tap(40, 135); await pg.waitForTimeout(1200); await shot('32cuaderno');
  console.log('dos open', await ev('!!document.querySelector(".h-dos.open")'), await ev('document.querySelector("#rc-tc").className'));
  console.log(await ev('[...document.querySelectorAll(".h-dos button")].map(b=>b.className+":"+b.innerText.slice(0,12)+":"+Math.round(b.getBoundingClientRect().height)).join("|")'));
};
