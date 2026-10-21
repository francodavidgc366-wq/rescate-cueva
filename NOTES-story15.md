# NOTES-story15 (STORY v15). Aditivo sobre v14. Test: `node tools/story-test.js [N]`.

## plan.options[i]
`{id, n, title ≤18, long (título largo antiguo), what ≤35, kind, speed 1..3 (3 rápido), risk 1..3, risk_known, effects:[{k,d}], hints, gain (texto), riskTxt (texto; antes `risk`), travel, ...}`
- kind: pozo|balsa|galeria|cuerda|puente|tunel|compuerta (= `travel.kind`). sima→pozo, repisa/desvío/corredor/ventilación/bombeo/galería alta→galeria, cornisa/maderos→puente, sifón/paso estrecho→tunel.
- effects: `d` ±1..3 con el signo real del número del motor (agua + = SUBE = malo). Máx. 3, ordenados por magnitud.
- risk: sin ninguna pista (compartida o privada) → 2 y `risk_known:false`; con pistas = riesgo base de la opción ±1 según pistas a favor/en contra. No revela trampa/gema.
- hints = nº de tarjetas COMPARTIDAS favorables a esa opción. `plan.brief` ≤55 (una frase: «Pista fuerte: B es más segura» / «Pistas mezcladas: hablen en el chat» / «Sin pistas: pregunten qué vio cada uno»). `plan.ask` ≤35.
- `refreshPlan(st, role?)` recalcula hints/risk/brief; la llaman `publicState` (sin secretos) y `privOf`.
- `privOf(st, role)` añade `pv.planOpts` (copia de las opciones con `clue` ≤40 = tu pista privada de esa opción, y risk que cuenta tus pistas) y `pv.secretNote`.
- CAMBIO DE CONTRATO: `option.risk` ahora es número (el texto es `riskTxt`); el HUD que hacía effHtml(o.risk) debe usar `riskTxt`.

## secretOptions[i]
`{id, kind:'equipo'|'objetivo'|'riesgo', verb:'AYUDAR'|'PARA MÍ'|'ARRIESGAR', title ≤28, text, tag, effects:[{k,d}], risk 0..3, p (probabilidad 0..1), fx (vector real {agua,salud,material,confianza}), fail, hint}`. `effects` ya NO es el vector (usar `fx`); `risk` ya no es probabilidad (usar `p`). `pv.secretNote = 'Se aplica al final del tramo'`. Log/reveals/picks usan `title` en vez de `text`.
(El HUD usa `k==='risk'` para kind; ahora llega 'riesgo'/'equipo'/'objetivo'.)

## travelScene(st)
`{kind (7 tipos), anim (kind antiguo de la escena), caption, lines (≤2, ≤45), toZone, outcome}`. Textos por kind en `KT` (balsa «Navegan en balsa» / «Remen despacio.», pozo «Bajan por el pozo», galeria «Caminan por la galería», cuerda «Suben con cuerdas», puente «Cruzan el puente», tunel «Gatean por el túnel», compuerta «Cruzan la compuerta»); versión mal = caption/líneas propias del kind (balsa vuelca, resbalan, anclaje cede…).

## Dieta
now.text ≤40, now.why ≤45, poi.name ≤22, intel text ≤60, diario ≤60, explainResult ≤55, escenas ≤55, travel ≤45. Chat de bots se queda en ≤57 (decisión del coordinador).
