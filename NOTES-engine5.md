# NOTES-engine5 (engine.js v5, `Engine.version === '5.0'`)
Todo lo de NOTES-engine4 sigue valiendo salvo lo indicado (setPois/markPoi/setGuide/getRoute/getPoiPos/focus/setViewInsets/drawMinimap/setBot/botGoto/say/snapshot/applySnapshot/gather/pan/setWater...).

## Mundo
- 5 zonas de **100x40 tiles** (antes 60x30; 1.67x ancho, 1.33x alto): `LEVEL_W=8000`, `LEVEL_H=640`, zona = 1600 px. Un solo mapa continuo: el pasillo del nivel TB (fila 29) enlaza cada zona con la siguiente; el final de cada zona 1-4 esta **sellado** (derrumbe / puerta / derrumbe / cuerda cortada, cols 94-97) hasta `setUnlocked(n)`.
- 5 alturas de suelo (filas 35/29/23/17/11), >=10 salas/ramas por zona (caverna, galerias, camaras, pozos verticales con tablones en zigzag, escaleras de tablon, reptaderos de 2 tiles, fosos, camaras altas) y un **nicho secreto** por zona (reptadero de 2 tiles + camarita; slot 3). 6 slots de POI por zona (0..5).
- La escalada de pared de Nico (v4) **se quito**: las puertas no se pueden rodear.
- Agua: `waterY(level)=644-3.6*level` (igual que v4 contando desde abajo; la fila TE queda seca siempre).
- Camara: sigue al jugador entre zonas; no ve mas alla del sello de la ultima zona abierta (roca opaca).

## Zonas, sellos
- `setUnlocked(n)` (1..5): abre los sellos de las zonas < n (con efecto) y cierra los >= n (retroceso permitido; si n baja, los cuerpos que quedan fuera vuelven al spawn de la zona n). `getUnlocked()`. `setPois(round)` y `gather(round)` suben `unlocked` a >= round si estaba mas bajo (compat v4). `getZone(role?)` -> 1..5 segun la x del cuerpo (por defecto el local).
- `gather(round)` coloca a los tres en el spawn de la zona (zona 1: campamento, resto: inicio del pasillo TB).

## Puertas de habilidad (9, ids `z<zona>_<kind>`, igual que NOTES-story5)
| id | rol | kind | fisica | slot de POI detras |
|---|---|---|---|---|
| z1_anclaje | guia | anclaje | pozo de 6 filas sin tablones; al abrir aparecen cuerda + 3 tablones | 2 |
| z2_anclaje | guia | anclaje | idem, da a una galeria alta aislada | 0 |
| z2_puente | ing | puente | foso de 12x5, solo se cruza con el puente (se construye tablon a tablon, ~3 s) | 2 |
| z3_reptadero | medica | reptadero | reptadero de 2 tiles tapado por gas verde | 4 |
| z3_valvula | ing | valvula | compuerta de acero con volante; sube al abrir | 2 |
| z4_valvula | ing | valvula | idem | 2 |
| z4_anclaje | guia | anclaje | ver arriba | 4 |
| z5_puente | ing | puente | foso final (camara de Lia detras) | 2 |
| z5_reptadero | medica | reptadero | gas | 4 |
- Cada puerta tiene un **punto de activacion** (`spot`, a pie, accesible estando todas cerradas) y un cartel en el color del rol: «SOLO NICO: ANCLAJE», «SOLO ONA: REPTADERO», «SOLO IVAN: PUENTE / VALVULA». Al abrirse el cartel pasa a «ABIERTO» (verde) unos 4 s. Si el rol local esta en el `spot` aparece ademas el prompt «[Q] CLAVAR ANCLAJE / CONSTRUIR PUENTE / GIRAR VALVULA / ESTABILIZAR PASO» y la barra de progreso (~0.6 s).
- API (instancia y estaticas `Engine.x()`):
  - `getGates()` -> `[{id, zone, role:'guia'|'medica'|'ing', kind, x, y, open, label:'Solo Nico: anclaje', text:'SOLO NICO: ANCLAJE', slot, spot:{x,y}}]`.
  - `openGate(id, now?)` -> bool. Abre ya (sin esperar al personaje; llama a `onGate(role-de-la-puerta, id, kind)` y `onSfx('gate_open')`). `now:true` = instantaneo y sin `onGate` (tests/sincronizacion).
  - `nearGate(role?)` -> gate (objeto como arriba) o `null`: solo si es una puerta CERRADA **de ese rol** y el cuerpo esta en su `spot` (±34 px x, ±26 y). Sirve para activar `Hud.setAbilities({ready})`.
  - `useAbility(role)` -> `{ok, kind, gateId?, reason?}`. Solo host (cliente: `{ok:false,reason:'host'}`). En el `spot` de una puerta de tu rol: `{ok:true,kind,gateId}` y a los ~0.6 s se abre (`onGate`). Puerta de otro rol: `{ok:false,reason:'rol',gateId,kind}`. Ona sin puerta cerca y con un companero a <40 px con aire <70: `{ok:true,kind:'estabilizar',target}` (+50 aire). Si no: `{ok:false,reason:'sitio'}`. Tambien se activa con `setInput(role,{ability:true})` (o `q:true`, por flanco).
  - `botOpenGate(role, gateId, cb)`: el bot va al `spot` (rutas; evita agua) y abre; `cb(true)` cuando esta abierta, `cb(false)` si el rol no coincide / ruta imposible / se rinde (callbacks asincronos via setTimeout 0). Devuelve false si no puede empezar.
  - Opcion de motor `onGate(role, gateId, kind)`.
- **Mapeo POI -> puerta**: `setPois(round, list)`: si un POI trae `gate:'z2_puente'` (Story lo da en `st.pois[i].gate`) el motor lo coloca **en el slot detras de esa puerta** (y en la zona de la puerta); `kind:'secreto'` va al nicho (slot 3); el resto usa su `slot` si esta libre y no es un slot de puerta, si no el primer slot libre. `p.zone` opcional para colocar en otra zona. Resultado: `pois[id].slot/zone/gate`. Los POI detras de puertas cerradas dan `botGoto -> false` (inalcanzable) hasta abrir.
- `setPoiHints(h)`: `{poiId: rol}` | `{poiId:{role}}` | `[{id,role}]`: solo ese rol ve un ojito junto al marcador del POI.
- `resetGates()` cierra todo (y re-sella segun `unlocked`); `resetGates(zona)` solo esa zona. `setPois` ya NO resetea puertas al cambiar de ronda.

## Aire y natacion
- `getAir(role?)` 0..100 (por cuerpo, bots incluidos); `setAir(role,v)`. Bajo el agua (cabeza sumergida) -6/s; fuera +30/s; **bolsas de aire** (`world.pockets`, 3-4 por zona, cupula plateada bajo el techo solo visible cuando estan sumergidas): +42/s mientras la cabeza esta en ellas. A 0: cada segundo `onDrown(role)` (opcion de motor) + `onSfx('drown')`. `onSfx('splash')` al entrar/salir del agua, `'gasp'` al salir con aire <85 o entrar en una bolsa con <55, `'swim'` en cada brazada, `'ability'` al empezar una habilidad, `'gate_open'`, `'plank'`.
- Animacion de nado: sprite tumbado (rotado ~70°) con vaiven, burbujas de la boca. `snapshot()` (v:3) incluye `air:{rol:n}`, `u` (unlocked), `gs` (0/1 por puerta, orden de `getGates()`) y aire/nado por cuerpo (indices 9 y 10); `applySnapshot` los aplica (v2 se ignora sin romper).

## Bots
- Evitan el agua (penalizacion de coste en el campo de rutas por nodo sumergido; se recalcula cuando el agua sube ~8 px). En el agua: nadan siguiendo el camino con linea visible, con aire <40 van al nodo seco mas cercano o a una bolsa visible (`findDry`).
- Sin objetivo: 70 % siguen al jugador a 4-8 tiles de ruta, si no pasean (camino aleatorio de 2-5 aristas); idle maximo ~1.5 s. Separacion suave entre cuerpos quietos (sin solapamiento); nombres apilados si coinciden («IVANICO» arreglado).
- Anti-bucle: >=7 saltos en 5 s dentro de una caja de 2.5x2 tiles -> suelta el objetivo, mata la arista, descansa 2.5 s; la 2a vez en 30 s se "funde" (warp, ultimo recurso). Vigilante en el agua (6 s sin avanzar -> suelta objetivo).
- Arreglado un bloqueo de v4: ajuste fino cuando |ox| en (1.2, 2.5] px y vx~0 antes de un salto vertical (se quedaba parado).

## Marcadores
- Cada POI dibuja un pedestal en el suelo real con la gema del tipo + tallo punteado + marcador flotante (37 px). Los secretos sin descubrir solo muestran un brillo pegado al suelo (el «?» flotante de v4 ya no existe; el prompt dice «SIN DESCUBRIR»). Posiciones de slot validadas al construir el mundo (`world.bad` vacio).

## Tests (`tools/engine-test.html` + `tools/engine-run.js`; ver NOTES-engine4 para el runner)
`T.reach(maxSec, agua)` (todas las puertas abiertas, 3 roles x 5 zonas x 6 POI), `T.gatesTest()` (Promise: cada puerta cerrada: el POI de detras es inalcanzable, el rol equivocado no puede, el bot de su rol llega y abre, `cb(true)`, tras abrir se llega), `T.soak(min)` (3 bots, agua 10-70 %, puertas), `T.airTest()`, `T.rmap(zona)` (ASCII de lo alcanzable), `T.dump(zona)`, `T.shot(zona,rol,col,fila)`.
Resultados: reach 90/90 (max 22 s, 0 fundidos, tambien con agua 25 %); gatesTest 9/9 (abren en 5-20 s); soak 5 min x4: 0 fundidos, parada max 3-5 s, 0 bucles de salto (caja), 0-1 ahogos; consola sin errores/warnings salvo los `botGoto: inalcanzable` esperados del test de puertas.
