// etapa de touch18-run.js: prueba la ruedita con toques CDP reales
module.exports = async ({ pg, cx, ev, shot }) => {
  for (let i = 0; i < 8 && (await ev("document.body.classList.contains('rc-dlg')")); i++) { await pg.touchscreen.tap(400, 330); await pg.waitForTimeout(700); }
  await pg.waitForTimeout(500); await shot('j0');
  const c = await cx.newCDPSession(pg);
  const T = (type, pts) => c.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const sleep = ms => pg.waitForTimeout(ms);
  const keys = () => ev('window.__k');
  await ev(`window.__k=[];['keydown','keyup'].forEach(t=>document.addEventListener(t,e=>window.__k.push(t[3]=='d'?'+'+e.key:'-'+e.key),true))`);
  const st = () => ev('(()=>{const b=Engine.current.bodies.guia;return {x:Math.round(b.x),y:Math.round(b.y),g:b.grounded,vy:+b.vy.toFixed(1)}})()');
  const zone = await ev(`(()=>{const r=document.querySelector('#rc-js').getBoundingClientRect();return {l:r.left,t:r.top,w:r.width,h:r.height}})()`);
  console.log('zone', zone, 'vis', await ev(`document.querySelector('#rc-tc').className`));
  const sx = zone.l + 120, sy = zone.t + zone.h - 90; // un punto cualquiera de la zona
  const drag = async (dx, dy, ms, id = 1) => { await T('touchStart', [{ x: sx, y: sy, id }]); await T('touchMove', [{ x: sx + dx, y: sy + dy, id }]); await sleep(ms); };
  const rel = async (id = 1) => { await T('touchEnd', []); await sleep(200); };
  // izquierda/derecha
  let a = await st(); await drag(35, 0, 800); let b = await st(); console.log('derecha(35px)', a.x, '->', b.x, 'keys', JSON.stringify(await keys())); await shot('j_right');
  await ev('window.__k.length=0'); await rel(); let c2 = await st(); await sleep(300); let c3 = await st(); console.log('soltar: x', c2.x, c3.x, 'keys', JSON.stringify(await keys()));
  await ev('window.__k.length=0'); await drag(-60, 0, 800); let d = await st(); console.log('izq borde(correr)', c3.x, '->', d.x, JSON.stringify(await keys())); await shot('j_leftrun'); await rel();
  // arriba = salto
  await ev('window.__k.length=0'); a = await st(); await T('touchStart', [{ x: sx, y: sy, id: 1 }]); await T('touchMove', [{ x: sx, y: sy - 40, id: 1 }]); let ymin = a.y; for (let i = 0; i < 8; i++) { await sleep(60); ymin = Math.min(ymin, (await st()).y); } console.log('arriba: y', a.y, 'min', ymin, JSON.stringify(await keys())); await shot('j_up'); await rel();
  // diagonal arriba+derecha
  await sleep(600); await ev('window.__k.length=0'); a = await st(); await T('touchStart', [{ x: sx, y: sy, id: 1 }]); await T('touchMove', [{ x: sx + 30, y: sy - 30, id: 1 }]); await sleep(300); b = await st(); console.log('diag: ', a, b, JSON.stringify(await keys())); await rel();
  console.log('teclas tras soltar todo', JSON.stringify(await ev('Object.keys(RCTouch).length&&0||window.__k.slice(-4)')));
  // abajo: plataforma de una via (tile 2) con aire debajo
  const f = await ev(`(()=>{const E=Engine.current,w=E.world;const W=w.w||w.W||w.width,H=w.h||w.H||w.height;for(let ty=2;ty<(H||200);ty++)for(let tx=2;tx<(W||600);tx++){if(E.tileAt(tx,ty)===2&&E.tileAt(tx,ty-1)===0&&E.tileAt(tx,ty+1)===0&&E.tileAt(tx,ty+2)===0)return {tx,ty}}return null})()`);
  console.log('plataforma', f);
  if (f) {
    await ev(`(()=>{const E=Engine.current,b=E.bodies.guia;E.setBot('guia',false);b.x=${f.tx}*16+8;b.y=${f.ty}*16-1;b.vx=b.vy=0})()`); await sleep(700);
    a = await st(); console.log('sobre plataforma', a, 'ty*16', f.ty * 8);
    await ev('window.__k.length=0'); await T('touchStart', [{ x: sx, y: sy, id: 1 }]); await T('touchMove', [{ x: sx, y: sy + 40, id: 1 }]); await sleep(700); b = await st(); console.log('abajo: y', a.y, '->', b.y, JSON.stringify(await keys())); await shot('j_down'); await rel();
  }
  // multitactil: rueda + SALTAR a la vez
  const jb = await ev(`(()=>{const r=document.querySelector('#rc-tc [data-k=jump]').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()`);
  await ev('window.__k.length=0'); await T('touchStart', [{ x: sx, y: sy, id: 1 }, { x: jb[0], y: jb[1], id: 2 }]); await T('touchMove', [{ x: sx + 40, y: sy, id: 1 }, { x: jb[0], y: jb[1], id: 2 }]); await sleep(300); console.log('multitouch keys', JSON.stringify(await keys())); await T('touchEnd', []); await sleep(200);
  console.log('keys final', JSON.stringify(await keys()), 'pegadas:', await ev(`document.querySelector('#rc-js').className`));
};
