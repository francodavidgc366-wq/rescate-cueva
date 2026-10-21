# NOTES-story5 (STORY v5) - cambios sobre NOTES-story.md / NOTES-story4.md. Test: `node tools/story-test.js [N]`
La máquina de fases (briefing/explore/plan/secret/resolve/summary) sigue igual; la "crisis" = paso explore -> plan. Todo lo nuevo es aditivo.

## Tiempos y crisis
- `Story.TIMES.explore` = `{facil:300, normal:240, everest:180}` (el agua total por tramo no cambia: `waterRate` escala por `OLDX/explore`).
- `Story.tickWater(st, dt)` acumula `hid.expT` (s de exploración) solo en fase explore. main debe seguir llamándola cada s.
- `Story.crisisReady(st)` -> `{ready, reason:'hito'|'tiempo'|null, progress:{done,total,need}}`; hito = >= 3 de los 4 POIs de la zona investigados por alguien (IA incluida); tiempo = `expT >= TIMES.explore[dif]` o `tleft<=0`. Fuera de explore: ready=false.
- `Story.convene(st, role)` -> `{ok, allConvened}` | `{ok:false, reason:'nada'|'rol'}` ('nada' = aún no has investigado nada y no hay crisis). `Story.allConvened(st)`. Equivalen a `ready/allReady` (los bots siguen devolviendo `{type:'ready'}`). Etiqueta: `Story.readyLabel('explore')` = «Convocar reunión».
- Flujo main: cada s `if (Story.crisisReady(st).ready || Story.allConvened(st)) -> escena 'event' -> setPhase('plan') ...`.

## Zonas y puertas (`st.gates`, `st.gatesOpen`)
Zona = `st.round` (1..5): 1 La entrada y el campamento, 2 La mina vieja del derrumbe, 3 La sala de cristales y gas, 4 La galería helada, 5 La cámara de Lía (`Story.ZONES`). `st.gates` = `[{id, zone, role, kind, label, poi:índice 0..3, why, open}]`; `st.gatesOpen[id]=true` persistente (no se resetea al avanzar). `Story.GATES` = copia estática.
| id | rol | label | bloquea POI |
|---|---|---|---|
| z1_anclaje | guia | Anclaje en la pared de la grieta | r1_3 Grieta de la pared |
| z2_puente | ing | Puente sobre el foso del derrumbe | r2_1 Pared del derrumbe |
| z2_anclaje | guia | Anclaje en los escombros altos | r2_3 Escombros del derrumbe |
| z3_reptadero | medica | Reptadero con gas | r3_3 Cristal que canta |
| z3_valvula | ing | Válvula del pozo de ventilación | r3_1 Pozo de ventilación |
| z4_anclaje | guia | Anclaje en la cornisa | r4_1 Cruces blancas de Lía |
| z4_valvula | ing | Válvula del desagüe | r4_3 Líneas de crecida pintadas |
| z5_puente | ing | Puente hasta la compuerta | r5_1 Compuerta de la cámara |
| z5_reptadero | medica | Reptadero junto a la cámara | r5_3 Rendija junto a la cámara |
El motor debe usar estos ids (`z<zona>_<kind>`); si define otros, main los enlaza. Cada gate lógico apunta a un POI; el motor puede colocarlo cerca del marcador de ese POI.
- `Story.openGate(st, role, gateId, {helpFor?})` -> `{ok, gateId, kind, unlocks:poiId, msgs}` | `{ok:false, reason:'puerta'|'rol'|'zona'|'abierta'}`. Llamar al terminar `eng.useAbility` / `onGate` (jugador) o en el `cb(ok)` de `eng.botOpenGate` (IA). `helpFor` = rol que lo pidió: confianza +1. Suma 6 pts "equipo" y confianza oculta del que ayuda.
- `poiInteract` sobre un POI con puerta cerrada: `{ok:false, reason:'puerta', gateId, role}` (no gasta AP). Los bots (`botAct`) abren primero sus puertas (`{type:'gate', gateId, label}`; `exec` lo ejecuta) con probabilidad `.35+.65*share` del estilo, y evitan POIs bloqueados.

## POIs
Cada `st.pois[i]` añade `why` (por qué ir), `hintRole` (rol que ve algo especial), `zone`, `gate` (id de la puerta que lo bloquea o null). Nombres coherentes con la zona (p. ej. «Arroyo de la entrada», «Caseta con el mapa de la mina», «Pozo de ventilación», «Cruces blancas de Lía», «Compuerta de la cámara»). Las etiquetas de la IA-director para POIs se ignoran (para no romper why/puertas).
- Info solo del rol: `poiInteract(...).special` (texto) cuando `poi.hintRole===role`; también en `priv[role].notes`. `Story.poiHints(st, role)` -> `{poiId:{icon:'ojo', text}}` (para `eng.setPoiHints`; ids de POI de la zona).

## Misión
`Story.mission(st, role, {slot?})` -> `{title, desc, steps:[...], now:{text, why, short, target, gate?, hint}}`. UN objetivo: orden de prioridad en explore: convocar (si `crisisReady`) > abrir tu puerta (`now.gate`, Q) > POI más cercano libre > pedir ayuda a otro rol (`now.gate`) > compartir tarjeta > hablar. Ejemplo: `{text:'Ve a «Arroyo de la entrada» y pulsa E', why:'El barro y las huellas marcan por dónde baja el agua y por dónde pasó Lía.', target:'r1_1'}`. Sin «Esperando al equipo…» muerto.

## Chat
- Todos los mensajes llevan `mood` (neutral|alert|hurt|angry|happy|talk): sys=neutral, event=alert, agua>=75 alert, salud<30 (Lía/Ona) hurt, acusaciones angry, hallazgos happy; `share` según lo que afirma la tarjeta (no revela la verdad).
- `Story.chatSuggest(st, role)` -> `[{label, text, cardId?, gateId?, toRole?}]` (máx. 5): «Os cuento lo que he visto» (texto real de la última tarjeta propia sin compartir; main debe llamar `Story.share(st,role,cardId)` si hay `cardId`), «Voy a abrir…», «Pedir a Iván: puente» (`gateId`,`toRole`), «Preguntar a Nico» (qué vio en un POI concreto), agua, convocar.
- `Story.share` ya añade al chat un mensaje `kind:'share'` con `card:{title,text,reliability}` y `text` = texto de la tarjeta.

## Ayuda entre roles
```
const q = Story.request(st, 'guia', 'ing', {gateId:'z2_puente'})
// IA: {ok:true, accept:bool, delay:ms, line, lie?:true, msg, msgs, gateId}  (la línea ya está en st.chat con msg.delay y mood)
// accept -> tras q.delay: eng.botOpenGate('ing','z2_puente', ok => ok && Story.openGate(st,'ing','z2_puente',{helpFor:'guia'}))
// lie:true = el compañero dice «voy» pero NO abre (accept=false); cuenta como mentira (stat.lieCount)
// humano destino: {ok:true, human:true, accept:null, msg} (solo escribe la petición en el chat; decide la persona)
// error: {ok:false, reason:'datos'|'rol'|'abierta'|'zona'}
```
Probabilidad: estilo (coop .92, ego .35, random .55, persona = traits.coop) + confianza hacia quien pide + dificultad − (Iván con poco material pidiendo puente) + agua alta. `Story.botRequest(st)` -> `{from, to, text, gateId, msg}` | null: una IA pide al jugador humano abrir su puerta de la zona (máx. 1 cada 45 s por puerta; llamar cada ~5 s en explore).

## Escenas Castlevania
`Story.scene(st, kind)` kind `event|plan|resolve|lia|final` -> 1..4 `{who:'director'|'lia'|rol, mood, text<=110}`. `resolve` requiere haber llamado `Story.resolve` (si no, 1 línea neutra). Ejemplo event: `[{who:'director',mood:'alert',text:'El río sube y baña la entrada.'},{who:'lia',mood:'alert',text:'Oigo un rugido... '}]`.

## Otros
`Story.statusLabels` = `{agua|salud|material|confianza:{name,tip}}`. `Story.intro` (7) ya NO explica controles; `roleBrief().steps` actualizado a v5. Balance (500 partidas, Normal): coop 75.8 %, ego 25.4 %, random 13.0 %; Everest 37.8 / 4.2 / 2.4 %. Aserciones nuevas en `tools/story-test.js` (sección `v5`).
