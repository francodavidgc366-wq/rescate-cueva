# SPEC — Rescate en la Cueva v2 (pixel art, tiempo real, multijugador)

Objetivo: juego 2D pixel art estilo Celeste / Enter the Gungeon (paleta rica, parallax, luces, partículas), jugable en tiempo real (mover, saltar, interactuar), con cinemática de intro, hasta 3 jugadores por enlace (WebRTC/PeerJS, host autoritativo), IA como director de partida con modo demo pregrabado. **Entregable final: un único `index.html` autocontenido** (generado por `build.sh` inlinando `src/*`), que funcione abriéndolo y también publicado en GitHub Pages. Idioma de la UI: español. Todo debe funcionar SIN red salvo (a) multijugador (PeerJS broker público) y (b) la IA real (opcional).

## Reglas para todos los agentes
- Cada agente escribe SOLO sus archivos. No editéis los de otros. No hagáis `git commit`/`push`.
- Sin dependencias de runtime externas salvo PeerJS (se inlina). Nada de frameworks.
- Nadie puede preguntar al usuario (duerme). Decidid con criterio y dejad notas en `NOTES-<agente>.md`.
- Scripts globales clásicos (no ES modules): cada archivo define un único objeto en `window`.
- Verificad lo que hagáis (Playwright MCP no abre `file:`; sirve con `python3 -m http.server <puerto-único>` y recordad cerrarlo con `kill <pid>`, NUNCA `pkill -f`).
- Orden de carga en el build: `peerjs.min.js, assets.js, story.js, engine.js, net.js, ui.js, main.js`.

## Estado compartido (forma exacta)
```js
state = {
  phase: 'lobby'|'cinematic'|'play'|'decide'|'resolve'|'final',
  round: 1,                       // 1..5
  s: {agua:10, salud:70, material:60, confianza:60},   // 0..100
  players: { [id]: {id, name, role:'guia'|'medica'|'ing', x, y, vx, vy, face:1|-1, anim:'idle'|'run'|'jump'|'fall'|'interact', bot:false, ready:false} },
  roundData: null | {scene, private:{guia,medica,ing}, options:{guia:[{text,effects:{agua,salud,material,confianza},req?}x3], medica:[...], ing:[...]}},
  picks: { guia?:idx, medica?:idx, ing?:idx },   // opción elegida por rol
  log: [{r, scene, picks:[{role,text,score}], delta}],
  verdict: null|string, saved: null|bool, note:''
}
```
Roles: `guia` (Nico), `medica` (Dra. Ona), `ing` (Iván). Lía (víctima) es un NPC fijo en el fondo del nivel. Constantes de roles/stats/objetivos: en `story.js` (`Story.ROLES`, `Story.STATS`).

## Módulos y contratos

### `src/assets.js` (agente ASSETS)
`window.ASSETS = { images:{name:dataURL}, meta:{name:{w,h,frames?,fw?,fh?}}, credits:[...] }`. Generado por `tools/pack-assets.py` desde `assets/raw/` (packs CC0: Kenney, OpenGameArt…; guardar LICENSES en `assets/LICENSES.md` y citarlos en `credits`). Necesarios (nombres exactos; si falta alguno, dibujadlo procedural en `tools/gen-sprites.py`): `tiles` (tileset cueva/roca/cristal, celdas 16x16), `player_guia`, `player_medica`, `player_ing` (hoja de sprites 16x16 o 24x24: idle, run, jump, fall, interact), `lia` (herida sentada), `water_tile`, `props` (antorcha, cuerda, radio, caja de material, cristal luminoso), `cablecar` (teleférico para la cinemática), `sky_layers` (capas parallax atardecer/montaña/nieve), `ui_frame` (marco 9-slice). Total < 3 MB. Documentar tamaño de celda/frames en `meta`.

### `src/story.js` (agente STORY) — `window.Story`
- `Story.ROLES`, `Story.STATS`, `Story.ROUNDS=5`, `Story.PROMPTS` (versionados v2), `Story.LIM=25`.
- `Story.demoRound(r)` → roundData (5 rondas pregrabadas, ricas, adaptativas: el texto de escena y las opciones cambian según `state.s` y `state.log`; mínimo 3 opciones por rol, alguna con `req`).
- `Story.askRound(state)` → Promise<roundData> (IA con `Story.setKey(k)`; validación `validRound`, 2 intentos, si falla cae a `demoRound` y devuelve `{...rd, _fallback:true}`).
- `Story.resolve(state)` → muta `state.s` y `state.log` aplicando picks + deriva base (agua +18, salud −4 por ronda; los bots eligen con `Story.botPick(role, state)`), devuelve `delta`.
- `Story.isOver(state)` → bool; `Story.verdict(state)` → Promise<string> (IA o plantilla demo); `Story.objectives(state)` → [{role, ok, text}].
- `Story.dialogue(round)` → líneas cortas de radio/diálogo por ronda para el HUD y la cinemática de transición, y `Story.intro` (guion de 6-8 viñetas de la cinemática de apertura).

### `src/engine.js` (agente ENGINE) — `window.Engine`
Plataformas de caverna 2D en tiempo real, canvas 320x180 lógico escalado entero con `image-rendering:pixelated`.
- `Engine.create(canvas, {assets: ASSETS, getState, onInteract(playerId, zoneId), localId})` → instancia con `{start(), stop(), step(dt), setInput(playerId,{left,right,jump,interact}), snapshot(), applySnapshot(s), setWater(level0to100), spawnFx(type,x,y), pan(round)}`.
- Nivel: mapa de tiles por tira de texto, 5 secciones (una por ronda) en un nivel ancho con scroll de cámara suave. Física tipo Celeste: coyote time, jump buffer, velocidad ajustable, colisión AABB con tiles. Zonas interactivas `zone1..zone5` (terminal de radio/cuerda) y NPC Lía.
- Agua que sube de verdad (cubre tiles, ondas, tinte, burbujas); iluminación (antorchas, linternas con radial gradient + oscuridad), partículas (polvo, gotas, chispas), parallax, screen-shake, sprites animados con los assets reales de `ASSETS`.
- Modo `Engine.demoLoop(canvas)` para fondos de menú. Rendimiento ≥ 60 fps; física determinista a paso fijo 1/60.
- Física/lógica autoritativa solo en el host; clientes envían input y reciben `snapshot` (posiciones+agua).

### `src/net.js` (agente NET) — `window.Net`
PeerJS (host autoritativo). `Net.host() → Promise<{roomCode, link}>` (link = `location.origin+location.pathname+'#sala='+roomCode`); `Net.join(code)`; eventos `Net.on('players'|'input'|'pick'|'state'|'snapshot'|'chat'|'ready'|'leave', fn)`; `Net.send(type,payload)` (cliente→host) y `Net.broadcast(type,payload)` (host→todos). Heartbeat, reconexión simple, tolerancia a que un jugador se vaya (pasa a bot). Máx. 3 jugadores. Códigos de sala cortos legibles. Si PeerJS no carga, `Net.available=false` y el juego sigue en solitario. Incluir `tools/net-test.html` (2 pestañas / Playwright) y probar host+join en local.

### `src/ui.js` (agente UI) — `window.UI`
Todo el DOM/canvas fuera del mundo: pantalla de título (con `Engine.demoLoop` de fondo), lobby (crear sala / unirse con código o enlace #sala=, elegir rol, copiar enlace, estado de jugadores, botón "Empezar"), **cinemática de apertura** estilo Celeste (teleférico al atardecer, parallax, letterbox, texto tipo máquina de escribir sobre `Story.intro`, saltable con tecla), cinemáticas cortas de transición entre rondas, panel de decisión (muestra SOLO la info privada del rol local; opciones con teclas 1-3 y ratón; opciones con `req` deshabilitadas), HUD (barras agua/salud/material/confianza, ronda, caja de diálogo de radio), pantalla final (resultado, objetivos individuales, veredicto, reiniciar), ajustes (pegar clave API, silencio). Estética: marco 9-slice de `ASSETS.ui_frame`, fuente pixel (Press Start 2P con fallback monospace), paleta cálida coherente con la referencia. **Audio**: WebAudio chiptune generado por código (música ambiente por sección + sfx salto/agua/decisión), con mute. `UI.api = {showTitle, showLobby, playCinematic(id), showDecision(roleData, onPick), updateHud(state), showFinal(state), toast(msg)}`.

### `src/main.js` (lo escribe el orquestador, NO los agentes)
Máquina de estados, bucle host/cliente, bots, conexión de módulos.

## Build
`build.sh` (orquestador) concatena en `index.html` con `<script>` inline; PeerJS inlinado desde `vendor/peerjs.min.js`.

## ADENDA (requisito del usuario): los 3 personajes son controlables
- Los 3 personajes (`guia`, `medica`, `ing`) existen SIEMPRE en el nivel. Se identifican por rol: `state.players` está indexado por rol; cada entrada tiene además `owner` (id de peer humano o `null`).
- Un humano controla su personaje y puede **cambiar de personaje** con `Tab` / `Q` / `E` o haciendo clic en los retratos del HUD (retratos pixel de los 3, el activo resaltado). Puede cambiar a cualquier personaje que no tenga otro humano. En solitario controla a los tres alternando.
- Los personajes sin humano activo NO se quedan parados: siguen al activo con una IA simple (seguir a distancia, saltar obstáculos/huecos, esperar en las zonas). Cuando el humano cambia de personaje, la cámara hace una transición suave al nuevo.
- Cada personaje tiene una **habilidad propia** que justifique cambiar (Celeste/Lost Vikings): `guia` = escalada con cuerda/salto extra de pared, `medica` = puede curar a Lía/estabilizar (interact largo en zonas médicas), `ing` = coloca/usa apoyos (puentes, anclajes) para abrir camino. Algunas rutas del nivel exigen un personaje concreto.
- Las decisiones de cada ronda las toma cada rol por su personaje: si un humano controla varios, el panel de decisión pasa de uno a otro (muestra SOLO la info privada del personaje activo).
- API: `Engine.setInput(role, input)`, `Engine.setActive(role)`, `Engine.setFollow(role, bool)` (true = IA de seguimiento), `snapshot()` incluye los 3 personajes. `UI.api.updateHud(state)` pinta los 3 retratos y permite `UI.onSwitch(cb)`.
