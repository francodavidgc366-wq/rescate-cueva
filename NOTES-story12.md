# NOTES-story12 (STORY v12). Test: `node tools/story-test.js [N]`. Aditivo sobre NOTES-story6/7/9.

## 1. Sin bloqueos
Regla: una puerta protege el POI **común** (extra/recurso) o el POI **propio de quien la abre** (autopuerta); nunca la tarea propia de otro. `GATES.poi`: z1_anclaje→2, z2_puente→1(propio ing), z2_anclaje→3, z3_reptadero→2, z3_valvula→3(propio ing), z4_anclaje→1(propio guía), z4_valvula→3, z5_puente→1(propio ing), z5_reptadero→3.
Con todas las puertas cerradas cada rol tiene >=2 POIs libres por zona y su primera tarea nunca depende de otro (`tasks` ordena `help` al final). LÍMITE: en zonas con 2 puertas (z2-z5) el rol con autopuerta no tiene "propio libre + común libre" estricto (solo 4 POIs/zona y el motor no admite un 5º); le quedan 2 POIs ajenos libres.

## 2. Meta de equipo
- `Story.teamInfo(st, role)` -> `{goal:'Entre los tres: conseguir …', roles:{guia|medica|ing:{done, part, poiId}}, mine:{done,text}, needs:[{role,text:'Necesitas la ruta y el anclaje de Mateo: pídesela por el chat'}]}`.
- Aportación de un rol = investigó su POI propio (o su recurso propio lo cogió otro).
- `crisisReady(st)` -> `{ready, reason:'hito'|'tiempo'|null, progress:{done,total,need,goal,roles,missing:[roles]}}`; `hito` exige >=3 POIs **y** `missing` vacío; por tiempo sigue valiendo.
- `mission(st, role)` en explore añade `team` (teamInfo) y anexa meta + primera necesidad a `now.hint`. Sin tareas: pide el aporte que falta, o «Convoca la reunión (o comparte tu tarjeta en el chat)»; con tarea `ayuda` trae `now.alt`.

## 3. La IA no bloquea
`request`/`answerChat`: si la puerta desbloquea un POI aún no visto por un humano (o pide un humano) la IA acepta SIEMPRE: `{accept:true, delay 2500-5500, line:'Voy, tardo unos segundos, Elena.'}`. Si ese bot acaba de aceptar OTRA puerta (`hd.busy[role]`, se limpia en `openGate`): `{queued:true, delay:15000, line:'Termino esta y voy: 15 s, X.'}`. Sin humanos conserva la probabilidad antigua. `botAct` abre primero (sin tirada) sus puertas que bloquean a un humano.

## 4. Viaje
Cada `plan.options[i].travel = {kind, caption, lines:[{who,mood,text}] (2-3), bad:{caption, lines}}` (kinds: galeria, pozo, balsa, paso, puntales, corredor, cuerda, ventilador, sifon, cornisa, bombeo, repisa, compuerta).
`Story.travelScene(st)` -> `{kind, caption, lines, toZone, outcome:'bien'|'mal'}` del último tramo resuelto (`mal`: caption y líneas de `bad`: resbalón, agua, herido). Llamar tras `resolve` (antes o después de `advance`). `toZone` 6 = salida.

## Balance (N=500) ver salida del test; sin cambios sensibles.
