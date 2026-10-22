module.exports = async ({ pg, shot, ev, hold, pos, tapT, has }) => {
  for (let i = 0; i < 6 && await ev('document.body.classList.contains("rc-dlg")'); i++) { await pg.touchscreen.tap(400, 330); await pg.waitForTimeout(700); }
  await pg.touchscreen.tap(1600/2-0, 130); // CONVOCAR (derecha)
  await pg.waitForTimeout(500);
  await ev('RC.advance()'); await pg.waitForTimeout(2500);
  await shot('19_tras_convocar'); console.log(await ev('document.querySelector(".hud").className'), await ev('document.querySelector(".h-bot") && document.querySelector(".h-bot").innerText'));
  let n = 0; const seen = {};
  for (let i = 0; i < 60; i++) {
    const ph = await ev('document.querySelector(".h-pn") ? document.querySelector(".h-pn").className : (document.body.classList.contains("rc-dlg")?"dlg":"-")');
    const key = ph.slice(0, 20); if (!seen[key]) { seen[key] = 1; await shot('20_' + (++n) + '_' + key.replace(/\W+/g, '_')); console.log(n, ph); }
    // acciones tactiles
    const tryTap = async sel => { const l = pg.locator(sel).locator('visible=true'); if (await l.count()) { await l.first().tap({ timeout: 2000 }).catch(e => console.log('tapfail', sel)); return true; } return false; };
    if (await tryTap('.h-pn [data-act=vote]:not([disabled])')) { await pg.waitForTimeout(600); }
    else if (await tryTap('.h-pn [data-act=secret]:not([disabled])')) {}
    else if (await tryTap('.h-pn [data-act=cont]:not([disabled])')) {}
    else if (await tryTap('.h-pn .h-opt')) {}
    else if (await tryTap('.h-pn .h-so')) {}
    else if (await tryTap('.h-dlg')) {}
    await pg.waitForTimeout(700);
    if (await ev('Story && 0') ) break;
  }
};
