# NOTES-engine
`src/engine.js` (~1200 lineas, sin dependencias) + `tools/engine-test.html` (servir con `python3 -m http.server`, abrir `/tools/engine-test.html`).

## API
`Engine.create(canvas, {assets, getState, onInteract(role, zoneId), onSfx(name, role), localId, authority=true, water})` -> instancia:
`start() stop() step(dt?) render() setInput(role,{left,right,jump,interact,up,down}) setActive(role) setFollow(role,bool) snapshot() applySnapshot(s) setWater(0..100) spawnFx(type,x,y) pan(round) gather(round) botInput(role,targetX) resetGates() fit(maxW,maxH)` y propiedades `water, tick, active, bodies, zones, gate, cam`.
- `Engine.setInput/setActive/setFollow` estaticos delegan en la ultima instancia creada (`Engine.current`).
- `Engine.demoLoop(canvas)` -> `{engine, stop()}`: 3 bots recorren el nivel, el agua sube por secciones.
- canvas 320x180 logico; `fit()` fija un escalado entero con CSS (la UI puede hacerlo ella).
- Los 3 personajes (`guia`,`medica`,`ing`) existen siempre; bodies indexados por rol. Si hay `getState`, el host escribe `state.players[role]` = {x,y,vx,vy,face,anim} cada tick. `anim` solo usa idle|run|jump|fall|interact.
- Control: `setActive(role)` cambia el personaje con camara suave (60 frames). Los demas siguen al activo (IA: `setFollow(role,false)` para controlarlos manualmente; por defecto siguen todos menos el activo). La IA espera a distancia, salta huecos/paredes, retrocede si se atasca y se teletransporta al activo si se pierde (salvo que haya una puerta cerrada entre ambos).
- Cliente (`authority:false`): solo interpola `applySnapshot`; snapshot v2 = `{v,t,w,wc,a,g:[pared,puente,barrera,nPlanks],p:{role:[x,y,vx,vy,face,anim,climb,role,name]}}`.
- `spawnFx` tipos: dust splash spark drip bubble confetti rescue debris shake(y=amplitud) flash smoke.
- `onSfx` nombres: jump land step splash swim interact heal plank rumble switch warp.
- `onInteract(role, id)`: `zone1..zone5` (consola de radio, interact corto, cualquiera), `lia`, `lia_heal` (medica, mantener 1.5 s junto a Lia), `med4` (medica, abre barrera), `bridge2` (ing construye puente), `wall3` (guia abre la pared). Zona activa = `zone<state.round>` con flecha y luz verde.
- Teclas que debe mapear la UI: up (W/flecha arriba) = trepar cuerda/pared, down, jump, interact mantenido (curar).

## Habilidades y rutas obligadas
- guia: escalada de pared (up junto a una pared, stamina 150) + salto de pared. Pared de la seccion 3 (cols 151-152, 5 tiles de alto): al llegar arriba se "ancla la cuerda" y la pared baja a escalon. Mas rapida en cuerdas.
- ing: ancla `bridge2` (seccion 2): construye un puente de 13 tablones sobre un foso que nadie puede cruzar sin el.
- medica: estacion `med4` (seccion 4) y Lia; accion larga (90 frames) disuelve la barrera de cristal (seccion 4).
- Las cuerdas (5, del techo) las usan todos con `up`. Los 3 huecos estan en `Engine.current.world.gates`.

## Fisica (Celeste)
60 Hz fijo; coyote 6f, buffer 6f; salto -5.8 (con gravedad 0.3, mitad en el pico, 0.55 + corte x0.5 al soltar: altura 14..60 px = 0.9..3.7 tiles); accel suelo 0.26 / aire 0.17, giro x2.2, friccion 0.32; maxima 1.7; corner correction (vertical +-4 px, horizontal ledge-hop 4 px); one-way con caida (down); squash/stretch. Agua: sin salto normal, nado (jump = brazada, cerca de superficie salta fuera), gravedad baja.

## Nivel / render
300x16 tiles (4800x256 px), 5 secciones de 60 cols, cada una con tema de color propio (ambar, hielo, violeta, azul, rojo). Ruta principal por seccion + ramas altas/bajas, escaleras de regreso (repisas de tablon) para no quedarse atascado, cuerdas, antorchas, cristales luminosos, setas, charcos, estalactitas con goteo, rayos de luz. Agua: `waterY(level)=250-level*1.75`; sube suave a `setWater`; ondas + refraccion por franjas + causticas + burbujas + espuma. Iluminacion: capa de oscuridad en canvas con `destination-out` + glow aditivo `lighter` por luz. Parallax de 3 capas (mezcla de temas) + primer plano + vineta.
Roca: mascara a nivel de pixel con bordes organicos (autotile procedural), pre-renderizada una vez (~0.3 s al primer `create`).
## Assets
Usa `player_*` (anims por meta), `lia`, y `props` (antorcha, radio, caja). Todo lo demas es procedural (fallback completo si no hay ASSETS; probado con ASSETS presente). No usa `tiles/water_tile/sky_layers` (el procedural encaja mejor con el nivel).
## Limites conocidos
- Bots (`botInput`) son sencillos: no usan cuerdas ni escalan paredes; no sortean todas las repisas bajo salientes (hay retroceso y teletransporte).
- Tras abrirse la pared/barrera/puente no se resetea solo: llamar `resetGates()` al reiniciar partida.
- Sin audio propio: solo `onSfx`.
