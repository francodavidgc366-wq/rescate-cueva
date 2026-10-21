# NOTES-story14 (STORY v14). Test: `node tools/story-test.js [N]`. Aditivo sobre NOTES-story13.

## 1. Dieta de texto
Todo el texto visible recortado (límites verificados en el test, sección «dieta de texto»): `mission.now.text` ≤55, `now.why` ≤65, `now.hint` ≤70 (ahora «Equipo 1/3 · 2 acciones · Pide a Elena: estado de Lía»), `now.short` ≤28; `poi.name/label` ≤28, `give/act` ≤70, `why` ≤65; tarjetas `text` ≤85, `title` ≤28, `uses` ≤70, `explain` ≤70; chat de bots ≤55 (con {opt}/{poi} de 20); `Story.scene` ≤70; `travel` ≤60; opciones: `title` ≤28, `what` ≤60, `gain/risk` ≤35, `text` ≤60; evento `text` ≤90 (base ≤60 + 1 frase de contexto, antes hasta 2); `journal` entradas ≤80, `use` ≤50; `endingPanels` ≤90; `explainResult` ≤70.
Cambios de contrato: `mission.desc` es solo el objetivo (sin explicación); `needs[].text` = «Pide a Elena: estado de Lía»; `step.text` = «Ve a «X» (E)» (la acción concreta sigue en `poi.todo`); `planBrief.lines` = una línea por opción con pistas («A: Elena segura, Mateo peligrosa») + «Sin pistas: C.» + conclusión («Mejor pista: A («…»).»); `known[]` mantiene ««n» (A): …», `text` ya no empieza con «Hay 3 caminos». El mensaje de director al entrar en plan es solo la conclusión. `event.lines[0]` = caption (sin título). `explainResult.why[0]` = «Voto: «X» (2/3: …)». `Story.scene('plan')` usa la pregunta del tramo. Opción gain/risk: «mucho material y riesgo alto», «pide 20 de material». Etiquetas de POI renombradas (p. ej. «Grieta alta», «Compuerta», «Cuerda nueva», «Líneas de crecida»); puertas con `label` ≤28.
Prompts v4 (docs/prompts.md): respuestas cortas; `validDirector`/`validChat`/veredicto con límites más estrictos (si la IA se pasa, cae a demo).

## 2. Recompensas de minijuego
`Story.poiInteract(st, role, poiId, {quality})`, quality ∈ 'perfect'|'ok'|'fail' (por defecto 'ok'; los bots usan 'ok'). Devuelve además `out.reward = {streak, bonus:[{icon,text}], quality}`.
- perfect: +20 puntos «info» (precisión), +3 confianza personal (pTrust), tarjeta con fiabilidad +0,15 (tope .99; afecta de verdad a si la pista es cierta), bonus +3 material (pista/hallazgo) o +3 salud (recurso); racha +1.
- fail: tarjeta con fiabilidad −0,15 (mín .4), gasta la acción igual, racha a 0.
`Story.openGate(st, role, gateId, {helpFor, quality})` devuelve `reward` igual: perfect = +10 puntos de equipo y +1 confianza extra; fail = abre igual pero material −3 («Herramienta dañada»). La racha cuenta también las puertas.
`Story.streak(st, role)` = racha actual (`st.hid.streak[role]`). Estadísticas ocultas: `hid.stat.perfect[role]`, `bestStreak[role]`, `mg[role][ronda] = {n, f}` (solo cuentan llamadas con `quality`, para que los bots no ganen logros).

## 3. Logros nuevos (rol)
«Racha x3» (`racha3`: 3 perfectos seguidos), «Manos de oro» (`manos_oro`: 5 perfectos), «Sin fallos» (`sin_fallos`: un tramo con ≥3 minijuegos y ningún fail), «Primero en llegar» (`primero`: quien investiga primero la cámara de Lía, `r5_0`; lo cuenta también si juega un bot). Salen en `resolve().achievements`.
