# NOTES story17

## Minijuego fallado (src/main.js)
- `play()` devuelve 'fail' -> el POI/puerta/estabilizar NO se consume; se muestra `Hud.floatText('¡Casi! Inténtalo otra vez','bad')` y se puede reintentar (E/Q) sin límite.
- Nivel del minijuego = nivel base - fallos seguidos en ese id (mín. 1); se reinicia al acertar (`failN`, `retryLevel`, `failed` en main.js).
- Racha/recompensas solo se calculan en éxito (poiInteract/openGate no se llaman en fallo). Failsafe de 25 s y bots sin cambios.

## Decisión secreta propia
- `Story.privOf(st, role).secretResult` (solo el propio; `st.priv` ya es oculto) = `{ round, verb:'AYUDAR'|'PARA MÍ'|'ARRIESGAR', title, effects:[{k,d}], outcome:'ok'|'mal'|null, line }`. Se rellena en `Story.resolve`.
- `Hud.showSummary(data)` recibe ahora `data.secret` (= secretResult del tramo actual o null). Ejemplo `line`: `Dar tu manta: +confianza -material`.
- Chat: línea `sys` "Tu decisión: <line>" con `m.only = role`, solo se añade al chat local del host humano; `Story.publicState` filtra los mensajes con `only` (clientes no la ven) y a clientes remotos se les manda `Net.sendTo(owner,'phase',{note})`. La UI de chat puede ignorar `only` (ya filtrado).
