# NOTES-story13 (STORY v13). Test: `node tools/story-test.js [N]`. Aditivo sobre NOTES-story12.

## 1. Textos simples
Títulos de tarjetas, logros (Explorador, Mentira perfecta, Por los pelos, Riesgo bien medido), acciones secretas, pistas de POI y puertas reescritos sin jerga (p. ej. «Temblor de manos» -> «Manos temblorosas del equipo: están agotados»). Opción «el apuntalamiento» -> «el refuerzo con maderos». Términos que quedan (anclaje, reptadero, sifón) llevan explicación entre paréntesis. `card.uses` de pistas: «Sirve para elegir entre «A», «B» o «C» en la votación: apunta a que …».

## 2. Diario
`Story.journal(st, round?)` -> `{day, title, intro, entries:[{icon:'ojo'|'material'|'estrella'|'llave'|'alerta'|'secreto', title, text, use}], decision:{title, text, outcome:'bien'|'mal', effects:[{icon:'agua'|'salud'|'material'|'confianza', text, delta}]}, note}`; `null` si el tramo no está resuelto. Sin `round` usa `st.round` (llamar tras `resolve`, antes de `advance`; con `round` vale siempre).
Ejemplo `use`: «Nos sirvió para elegir bien.» / «Nos sirvió para evitar un camino peligroso.» / «No la compartimos a tiempo y lo pagamos.» / «Avisaba de este camino y no le hicimos caso.» / «Era una pista dudosa y nos despistó.»
`Story.recap(st)` -> `{title, saved|null, liaStatus, days:[journal], entries:[{day, …entry}], note}`.

## 3. Finales y estado de Lía
`Story.endingPanels(st)` -> `{saved, panels:[{img, text<=110, who, mood}]}` 7 paneles. Rescate: `end_good_1..3` (1.º: «¡Encontramos a Lía!», epílogo con heridos/salud). Pérdida: `end_bad_1..3` (1.º: «No encontramos a Lía a tiempo…» o «Supimos dónde estaba, pero no logramos llegar»; radio débil, linterna que se apaga, cierre sobrio).
`Story.liaStatus(st)` -> `'no_encontrada'` | `'encontrada'` (tras investigar el POI `r5_0`, Cámara de Lía, zona 5) | `'rescatada'` | `'perdida'` (partida terminada).

## 4. Pedir ayuda
`Story.request(st, from, to, {gateId})` escribe antes de la respuesta el mensaje del solicitante («Samuel, ¿puedes montar el puente? …», `from`, mood `talk`). Devuelve `ask` y `msgs=[ask, respuesta]`. Con `{typed:true}` (texto ya escrito por el jugador; lo usa `answerChat`) no duplica. Si el destino es humano, `ask === msg`.
