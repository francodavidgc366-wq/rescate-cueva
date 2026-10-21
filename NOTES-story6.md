# NOTES-story6 (STORY v6). Test: `node tools/story-test.js [N]`. Todo aditivo sobre NOTES-story5.md.

## 1. Tarea propia por rol y zona
Cada zona: 3 POIs "propios" (uno por rol, `poi.owner === poi.hintRole`, solo ese rol recibe `special`/`poiHints`) + 1 común (`owner:null, common:true, hintRole:null`). Cada POI trae `todo` ("medir cuánto sube el agua").
| zona | guia | ing | medica | común |
|---|---|---|---|---|
| 1 | r1_0 Mapa | r1_1 Arroyo | r1_3 Grieta (tras anclaje de Nico) | r1_2 Mochila (**Sara**) |
| 2 | r2_0 | r2_1 Pared (tras su puente) | r2_2 Botiquín | r2_3 Escombros (**Marta**) |
| 3 | r3_1 Pozo (tras válvula de Iván) | r3_3 Cristal (tras reptadero de Ona) | r3_0 Sala | r3_2 Bombona (**Leo**) |
| 4 | r4_1 Cruces (tras su anclaje) | r4_0 Marca | r4_2 Manta | r4_3 Líneas (**Hugo**) |
| 5 | r5_2 Cuerda | r5_1 Compuerta (tras su puente) | r5_0 Cámara | r5_3 Rendija |
- `Story.tasks(st, role)` -> `[{type:'gate'|'own'|'common'|'help'|'other', poiId, gateId?, text, why}]` (orden de prioridad). `Story.taskLine(st, role)` frase de la primera tarea.
- `Story.mission(st, role)`: `now.text` distinto por rol («Tu tarea: ve a «Arroyo de la entrada» a medir cuánto sube el agua (pulsa E)»), `now.task` = 'puerta'|'propia'|'comun'|'ayuda'|'otra'. Si tu POI está tras la puerta de otro: «Pide a Ona que abra «Reptadero…» (escríbeselo en el chat)».
- `botAct` (explore) devuelve `{type:'gate'|'poi', ..., say:'Voy a Pozo de ventilación a mirar cómo está la roca.'}`: cada bot va primero a SU puerta/POI (sin repetir el de otro). `botChat(st, role, 'poi', {poi: nombre|id|label de POI o puerta})` produce la misma frase concreta (también para puertas). `say` es opcional: usar uno u otro, no ambos.
- `Story.botStuck(st, role, poiId)` (llamar desde `onUnreachable`) -> `{ok, next:poiId|null, task, msg, msgs}`: el bot descarta ese POI, elige otra tarea y dice una vez «No llego a X; mejor voy a …» (`msg.delay=600`).

## 2. Texto libre al equipo
```
Story.parseRequest(st, 'guia', 'ivan haz el puente')
 -> {to:'ing', kind:'gate', gateId:'z2_puente', text}            // kind: gate|info|help|where
Story.parseRequest(st, 'guia', 'abrid la válvula') -> {to:'ing', kind:'gate', gateId:'z3_valvula'}   // sin nombre: elige al dueño
Story.parseRequest(st, 'guia', 'ona abre la valvula') -> {to:'medica', kind:'gate', redirect:'ing'}  // el nombrado no es el dueño
Story.parseRequest(st, 'guia', 'hola') -> null
```
Reconoce Nico/Ona/Iván con o sin tilde/mayúsculas, «la médica», «el ingeniero», «el guía»; flags `open:true` (ya abierta) y `gateId:null` (nada pendiente).
`Story.answerChat(st, fromRole, text)` -> `null` (no es para un compañero: llamar a `botsReact`) | `{ok, to, kind, accept, gateId, msgs, delay, text, lie?, human?}`.
- Responde SOLO el aludido (mood, `msg.delay`). Puerta: usa `request` (ahora +.12 si es texto escrito y +.12 en Fácil) -> `accept:true, gateId` => main hace `eng.botOpenGate(to, gateId, ok => ok && Story.openGate(st, to, gateId, {helpFor: fromRole}))` tras `delay`. Ya abierta: «Esa ya está abierta, X.»; ninguna pendiente: «Ahora mismo no veo ninguna que me toque, X.»; dueño distinto: «Eso le toca a Iván…».
- `info`: el aludido comparte su tarjeta (`Story.share`, msg `kind:'share'`) o dice que aún no vio nada; `where`/`help`: dicen su tarea actual. Si el aludido es humano: `{human:true, accept:null, msgs:[]}`.
- `botsReact(st,'chat',{from,text})` ya delega en `answerChat` (y deja `out.answer`); **no llames a ambos**. Cache de 2 s por (rol, texto).

## 3. Plan y resultado
- `st.plan.ask` y por opción `{ask, what, gain, risk}`: «¿Cómo pasamos el derrumbe?» / «Rodeáis el derrumbe por un camino más largo pero firme.» / gain «Algo más rápido» / risk «el material baja mucho». Mostrar `gain + ', pero ' + risk`.
- `Story.explainResult(st)` -> `{headline, lines:[{icon:'agua'|'salud'|'material'|'confianza'|'info', text, delta}], why:[…]}` del último tramo resuelto («El agua sube 8, por el camino elegido y el paso del tiempo.» / «Elegisteis «Descender por el pozo» (2 votos de 3: Nico, Iván).»). Basado en `res.parts` (desglose por causa), `isTrap/isGem`, mentiras y secretos.
- `Story.TIMES.resolve = 6`, `summary = 20`, `summaryManual:false` (el botón Continuar sigue pudiendo saltarlo).

## 4. Coach y dificultad
`Story.coach(st, role, {moved?, near?, notebook?})` -> `{step, total:8, text, target?}` solo en zona 1 (explore/plan), `null` si no/completado. Pasos: mover, ir al marcador, pulsar E, ver tarjeta (cuaderno), compartir, pedir ayuda por puerta de otro rol (o preguntar a un compañero), convocar, votar. Sin flags `moved/near`, los pasos 1-2 se muestran hasta pulsar E. `target`: poiId | 'cuaderno' | 'compartir' | gateId | 'chat' | 'convocar' | 'votar'.
`Story.defaultDifficulty()` -> 'facil' si no hay logros ni partidas previas (localStorage `rcv3_ga..`/`rcv3_games`), si no 'normal'; **main decide** y pasa `difficulty` a `newGame` (el valor por defecto de `newGame` sigue siendo normal). Fácil: agua `rate .65` y presión .6, bots comparten/abren más, mienten la mitad y aceptan más peticiones.

## 5. Compartir
`share` siempre añade `kind:'share'` (from, card, text, mood, id) a `st.chat`; `publicState` lo conserva. Para chips con `cardId` llama SOLO a `Story.share` (no además a `say`). Si ya estaba compartida: `{ok:false, reason:'ya_compartida', msg:<mensaje previo>}`. Test cubre `priv.intel` y `chatSuggest.cardId`.

## 6. Supervivientes y destinos
`Story.SURVIVORS` = Lía (`role:'lia'`, `portrait_lia`) + sara (z1, `pers_sara`, r1_2), marta (z2, r2_3), leo (z3, r3_2), hugo (z4, r4_3); campos `id,name,bio,zone,portrait`. Se «encuentran» al investigar su POI: `poiInteract(...).survivor = {id,name,portrait,bio,line}` + mensaje sys; `poi.survivor` marca el POI.
`Story.scene`: `event` y `plan` añaden una línea del superviviente de la zona (`who:'sara'…`, variada por personalidad y por agua alta); `scene(st,'survivor')` = todos los encontrados.
`Story.finish` fija `st.fates` y `st.final = {fates, saved_count, …}` (también en el valor devuelto): `fates:[{id,name,portrait,status:'vivo'|'herido'|'muerto',why}]` de Lía, 4 supervivientes y 3 rescatistas. `saved_count` = Lía + supervivientes no muertos (0..5). Superviviente: puntos = encontrado + su puerta clave abierta (z1_anclaje/z2_puente/z3_valvula/z4_valvula) + plan de su zona OK − camino trampa − agua≥85 al resolver; ≥3 vivo, 2 herido, si no muerto (`why`: «Leo no llegó: la válvula del pozo siguió cerrada y el agua inundó el pozo.»). Rescatistas: mueren solo si el agua llega a 100; heridos si ganáis con agua≥85; Lía es la condición de victoria. Los retratos `pers_*` hay que dibujarlos (assets).

## Balance (300 partidas Normal): coop 72 %, ego 23 %, random 11 %; Everest 37 / 3 / 2.7 %.
