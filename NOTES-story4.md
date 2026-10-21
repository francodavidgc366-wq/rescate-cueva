# NOTES-story4 (STORY v4) - cambios sobre NOTES-story.md. Test: `node tools/story-test.js [N]`
Todo lo de NOTES-story.md sigue igual salvo lo indicado.

## Tiempos: `Story.TIMES`
`{briefing:20, explore:{facil:200,normal:150,everest:110}, plan:90, secret:30, resolve:25, summary:600, summaryManual:true}`. `Story.difficulty(name)` y `Story.setPhase` usan estos valores. `summary` = 600 s: tratar como MANUAL (main.js hoy avanza con `tleft<=0`; con 600 no salta solo; mostrar botón Continuar).
`Story.waterRate(st)` (agua/s): el total por fase de explore es el mismo que en v3 pero repartido en más tiempo (~40 % más lento por segundo). Balance medido (300 partidas): Normal coop 74 %, ego 27 %, random 14 %; Everest 36 / 5 / 3 %.

## Misión: `Story.mission(st, localRole, opts?)`
`opts.slot` (opcional) = slot del POI más cercano al jugador; se recomienda el POI no visitado más cercano (prioriza los 2 de pista + 1 extra del rol: guía -> hallazgo, médica/ing -> recurso).
```
-> {title, desc, steps:[{id,text,done,target?:poiId,kind:'poi'|'chat'|'ready'|'vote'|'secret'|'info'}],
    now:{text, short, target:poiId|null, hint}}
Story.mission(st,'ing',{slot:2}).now // {text:'Ve a «Mapa del campamento» y pulsa E: pista de ruta, puede fallar', short:'Ve a Mapa del campamento', target:'r1_0', hint:'Te quedan 3 de 3 acciones'}
```
Por fase: briefing («Lee la situación y pulsa «Empezar»»), explore (target recomendado; sin acciones: «Ya has usado tus 3 acciones: pulsa «Terminar exploración» o habla con el equipo»; tras Listo: «Esperando al equipo…»), plan («Habla en el chat y vota A, B o C: 1/2/3»; tras votar «Has votado X. Pulsa «Confirmar mi voto»…»), secret («Elige tu acción secreta» / «Pulsa «Confirmar acción»»), resolve, summary. `title` cambia por tramo (5 objetivos distintos); `desc` = texto largo del objetivo (en explore cita los 2 POIs de pista).

## `Story.readyLabel(phase)` -> `{label, tip}`
briefing «Empezar», explore «Terminar exploración → ir al plan», plan «Confirmar mi voto», secret «Confirmar acción», resolve/summary «Continuar».

## POIs (`st.pois[i]`) nuevos campos
`name` (nombre base, usar en chat/misión), `label` = `name + ' · ' + tipo` (`pista` | `material`/`salud`/... según el recurso | `hallazgo`), `give` (qué da, frase), `act` (texto de acción: «Pulsa E para investigar: pista privada, fiable o dudosa»). `botAct` devuelve `label` = `name`.

## Eventos: `st.event` nuevos campos
`caption` (frase corta), `focus:{poi:poiId, slot:n, x:null}` (mirar el slot con `eng.focus`), `lines:[ 'Título: caption', radio de Lía ]`. El mensaje `director` del chat es solo `lines[0]` y lleva `focus`. Mensajes `sys` de resolución más cortos (`res.msgs` usa el resumen corto; `res.narrative` = resumen + textos de `reveals` lie/secret).

## Limitador de chat: `Story.chatCadence`
`{minGapMs:6000, maxGapMs:9000, maxReplies:2, memory:12, replyDelayMs:[900,2200], spontDelayMs:[300,1200], idleAfterMs:25000}` (mutable; la usa Story).
- `botChat(st,role,trig,ctx)` -> `msg|null`. `null` = frenado o sin frase nueva (main ya tolera null; no reintentar en bucle). `msg.delay` (ms) = retraso objetivo para mostrarlo. Espontáneos (`brief,explore,poi,found,idle,water,secret,plan`): 1 cada 6-9 s en total (reloj `Story.now()`). Respuestas (`chat,share,vote`): máx. 2 seguidas hasta que un humano vuelva a hablar (`Story.say` de un rol no-IA reinicia). No repite las últimas 12 frases de un bot (ni las últimas 6 de cualquiera). Ampliadas las plantillas.
- `botsReact` devuelve msgs con `delay` (en `chat` es el de `replyDelayMs`).
- `botAct(...)` añade `a.delay` (ms; share 2.5-5 s, poi 0-2.5 s, resto 0) para que main espacie las acciones de bots.

## Intro y ficha de rol sin secretos
`Story.intro`/`introShots` (7) solo contexto público: quién es quién, objetivo común, 3 pasos. `roleBrief(...)`: `secret` es un texto genérico («Tienes un secreto. Solo lo verás tú…»; ui.js ya usa `priv.secret.text` primero); `persona` pública sin pistas; nuevo `steps:[3 strings]`. El texto real del secreto solo está en `Story.privOf(st,role).secret.text`.
