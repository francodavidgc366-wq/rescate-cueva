# SPEC v5 — de "tramos con espera" a cueva metroidvania guiada por la radio

Feedback del usuario sobre v4 (todo debe quedar resuelto):
1. Quiere diálogos estilo **Castlevania: Symphony of the Night** (retrato grande a la izquierda con EXPRESIONES que cambian, nombre, caja de texto a pantalla, texto máquina de escribir). Usarlo para eventos, radio de Lía, decisiones clave y mensajes importantes de compañeros. El chat también debe mostrar expresiones distintas según el estado (miedo, herido, enfadado, alegre, hablando).
2. El tutorial no se entiende (la imagen es rarísima). Rehacerlo con mini-demos reales (sprites reales del juego). La cinemática de intro es SOLO historia: no explicar controles ni "cómo se juega" ahí.
3. Las misiones deben tener sentido: «Ve a la orilla del río» sin explicar por qué no vale. Cada punto debe decir qué es y POR QUÉ ir ("el barro marca por dónde baja el agua").
4. Al pulsar Compartir debe salir en el chat (mensaje del jugador con la info). El botón «Os cuento lo que he visto» debe contar lo visto de verdad (texto real de la tarjeta). Respuestas rápidas contextuales.
5. El mapa es muy pequeño y se ve roto (personajes solapados «IVANICO», icono «?» flotante sin sentido). Hacerlo mucho más grande y variado.
6. No se puede respirar bajo el agua: oxígeno/aire, ahogamiento, nadar. Los compañeros IA no deben saltar sin parar en el agua ni quedarse quietos.
7. El sonido aturde: bajar volumen general, limitador/compresor, agudos suavizados, control de volumen.
8. La espera "Esperando al equipo" aburre: debe ser dinámico (dopamina). Nada de esperas muertas: el mundo sigue, siempre hay algo que hacer.
9. Estilo metroidvania: UN solo mapa continuo, misiones nuevas en el mismo mapa, volver atrás, puertas/obstáculos que requieren habilidad de un rol concreto. El jugador maneja SOLO a su personaje; a los otros los lleva la IA y se comunica con ellos por el chat/radio.
10. Cada personaje con sus propias habilidades y la comunicación es la mecánica clave: la información está repartida y se puede ocultar o mentir.
11. No guiar con una lista de pasos: mostrar UN solo objetivo actual (con su porqué); la lista completa va al cuaderno.
12. «Puntos» no se entiende: quitar PUNTOS de la barra superior. La puntuación solo aparece en el resumen y la pantalla final, explicada por categorías.

## Bucle de juego v5
- **Mundo**: un mapa continuo de 5 zonas conectadas. `eng.setUnlocked(n)`: se puede caminar por las zonas 1..n (volver atrás permitido); la zona n+1 está sellada hasta que el equipo resuelve la crisis n.
- **Exploración continua** (sin botón de espera): el jugador explora su zona en tiempo real. El agua sube lentamente (aire/ahogo = presión). Hay misión actual única (`mission.now`).
- **Crisis** (las "rondas"): cuando se cumple el hito de la zona (equipo con ≥N puntos de interés investigados, incluidos los de la IA) o vence el tiempo máximo (`Story.TIMES.explore` ≥ 240 s), arranca la **crisis**: escena de diálogo Castlevania (evento + radio de Lía) → plan (debate + voto A/B/C) → acción secreta → resolución → resumen corto. Es el único momento de "pausa": el mundo se congela solo durante esas escenas, que son cortas y con ritmo.
- **Botón «Convocar reunión»** (antes «Listo»): el jugador puede adelantar la crisis cuando ya ha investigado algo; no es obligatorio y no bloquea el juego (puede seguir explorando hasta que arranque). Los compañeros IA convocan cuando acaban sus acciones.
- **Habilidades por rol** (tecla Q = habilidad de TU rol, solo en el sitio adecuado):
  - Nico (guía): clava anclajes de cuerda en puntos de anclaje → abre rutas verticales/«CUERDA»; ve marcas de ruta ocultas.
  - Ona (médica): estabiliza/«respiración boca a boca»: recarga aire a quien esté sin aire y abre el reptadero/pasaje de gas tras estabilizar; ve las constantes de Lía.
  - Iván (ingeniero): construye puentes/apuntala derrumbes/abre válvulas (puertas «VÁLVULA»); ve estrés de la roca.
- **Puertas de habilidad** (`gates`): cada zona tiene 1–2 obstáculos que solo abre un rol concreto (anclaje/puente/válvula/reptadero) y bloquean POIs importantes. Si el jugador no es ese rol, debe **pedir ayuda por radio** (botón «Pedir a Iván: puente» o chat): el compañero IA acude y lo abre tras un retraso, **si decide colaborar** (puede negarse, mentir sobre lo que ve o esconder info según su objetivo secreto y la confianza).
- **Información asimétrica**: cada rol percibe distinto (marcas distintas visibles solo para su rol en los POIs: «solo Nico lee esta marca»). Compartir: mensaje en el chat con la tarjeta (con o sin cambios). Las mentiras se pueden descubrir.
- **Aire**: 0–100 solo para el rol local (y lo ven los demás en su HUD). Bajo el agua baja ~6/s; en aire fuera del agua sube rápido; bolsas de aire pequeñas en el mapa. A 0: −5 salud/s al equipo (`onDrown`). Ona puede recargar.

## Contratos nuevos (los agentes los implementan, main.js los enlaza)

### Engine (`src/engine.js`)
- `eng.setUnlocked(n)`; `eng.getZone()` (zona donde está el jugador local).
- `eng.getGates()` → `[{id, zone, role:'guia'|'medica'|'ing', kind:'anclaje'|'puente'|'valvula'|'reptadero', x, y, open:bool, label}]`; `eng.openGate(id)`; `eng.nearGate(role)` → gate o null (para activar prompt Q si es de tu rol).
- `eng.useAbility(role)` → `{ok, kind, gateId?, reason?}` ejecuta la habilidad del rol en el sitio donde está; host autoritativo. Opción de motor `onGate(role, gateId, kind)`.
- `eng.botOpenGate(role, gateId, cb)`: el bot del rol va (rutas, sin nadar si puede evitarlo) y abre; `cb(ok)`.
- `eng.getAir(role)` → 0..100; `onDrown(role)` (cada s con aire 0). Natación: salto/bracear, animación nadando, burbujas, voz de «glub» via `onSfx('splash'|'gasp')`. Bolsas de aire (`airpocket`) que recargan.
- Bots: evitan agua profunda salvo que sea necesaria, nunca saltan en bucle, no se quedan quietos (patrullan/siguen al jugador a 4–8 tiles o van a su POI/gate). Test de alcanzabilidad actualizado (con todas las gates abiertas y cada gate alcanzable por su rol).
- Mundo ≥ 1.6× el actual por zona, ≥ 8 salas/ramas, pozos verticales, nichos secretos; sin solapamiento de personajes/props; marcadores de POI siempre sobre el POI real (nunca flotando).
- `eng.setPoiHints(roleHints)` opcional: los POIs pueden mostrar un icono pequeño según el rol local que ve algo especial.
- Mantener: setPois/markPoi/setGuide/getRoute/focus/setViewInsets/drawMinimap/setBot/botGoto/say/snapshot/applySnapshot. snapshot incluye air y puertas.

### Story (`src/story.js`)
- `Story.TIMES.explore` = 240 (normal; facil 300, everest 180). Sin dependencias de «ready» para avanzar: `Story.crisisReady(st)` → `{ready:bool, reason, progress:{done,total}}` (hito de zona o tiempo). `Story.convene(st, role)` (botón «Convocar reunión») y `Story.allConvened(st)`.
- POIs con `name`, `why` (por qué ir, 1 frase concreta ligada a la historia), `give`, `act`, `hintRole` (qué rol ve algo especial), y nombres coherentes con la zona.
- `Story.mission(st, role)` devuelve SOLO objetivo actual: `{title, now:{text, why, short, target}, steps:[...]}` (steps para el cuaderno).
- Chat: todos los mensajes llevan `mood` ∈ `neutral|alert|hurt|angry|happy|talk` (alert si agua alta/evento, hurt si salud baja, angry en acusaciones/mentiras, happy en hallazgos, talk por defecto).
- `Story.chatSuggest(st, role)` → `[{label, text}]` contextuales (incluye contar lo visto con el texto real de la última tarjeta propia no compartida, preguntar a un compañero concreto algo sobre una zona, pedir ayuda para una puerta pendiente).
- `Story.share` genera un mensaje de chat del jugador con el texto de la tarjeta (ya lo hace; verificar que se ve y llevar `mood`).
- `Story.request(st, fromRole, toRole, {gateId, kind})` → `{accept:bool, delay:ms, line, lie?:bool}`; decide por objetivo secreto/confianza/dificultad; escribe la línea en el chat con delay; la IA puede pedir ayuda al jugador por chat (`Story.botRequest(st)` → opcional {from, text, gateId}).
- `Story.scene(st, kind)` kind ∈ `event|plan|resolve|lia|final` → `[{who:'lia'|role|'director', mood, text}]` (1–4 líneas cortas) para los diálogos Castlevania.
- `Story.statusLabels` para tooltips de recursos; la puntuación sigue existiendo pero no se muestra en la barra.
- Mantener compatibilidad con main.js v4 siempre que no contradiga lo anterior; documentar en NOTES-story5.md.

### Hud/UI (`src/hud.js`, `src/ui.js`)
- `Hud.dialogue(lines, opts)` → Promise<void> estilo Castlevania: franja inferior ancha (~30% alto, bordes dorados/azul marino semitransparente), retrato GRANDE (≥128 px, escalado entero pixelated) a la izquierda que sobresale por arriba, placa de nombre con color de rol y rango, texto máquina de escribir con voz opcional (`Sound.talk` si existe), ▼ parpadeando, avanzar con clic/Espacio/Enter, Esc salta todo. Expresiones: sheet `portrait_<rol>` (fw=64: 0 neutral,1 preocupado,2 enfadado,3 feliz) + `_alert`, `_hurt`, `_talk`; mapa mood→imagen. `Lía` y `director` también tienen retrato.
- Chat: cada mensaje con retrato pequeño (≥48 px) con la expresión de `msg.mood`; panel de «hablando ahora» sobre el chat con el retrato grande (≥96 px) del último que ha hablado y su frase; compartir aparece como tarjeta en el chat; chips de respuestas desde `Hud.setQuick([{label,text}])`.
- UN objetivo: banner con `now.text` + `now.why`; quitar chips de pasos; `Hud.setMission` solo alimenta el cuaderno (pestaña OBJETIVO con la lista completa).
- Quitar PUNTOS de la barra superior; tooltips en recursos (qué significa cada uno y qué pasa si llega a 0).
- `Hud.setAir(v|null)`: barra de aire junto al HUD del personaje (aparece solo bajo el agua o cuando <100) y alerta roja <25.
- `Hud.setAbilities({key:'Q', label, hint, ready})` botón de habilidad; `Hud.setHelp([{role,label,enabled,hint}])` fila «Pedir ayuda» + callbacks `Hud.onAbility(f)`, `Hud.onAsk(f(role, gateId))`.
- «Convocar reunión»: reemplaza «Terminar exploración/Listo» (`Hud.setReady` mismo contrato; solo tooltip y etiqueta cambian; ya no hay banner «Esperando al equipo»).
- Tutorial nuevo en `ui.js`: 6 pasos con mini-demos de canvas usando sprites reales de ASSETS (mover/saltar; E examinar con prompt real; objetivo+flecha; radio/chat y compartir; habilidad Q y pedir ayuda a un compañero; agua y aire / reunión y voto). Lenguaje llano. La cinemática de intro: solo historia (siete viñetas sin controles).
- Ajustes: slider de volumen (`Sound.setVolume`).

### Audio (`src/audio.js`)
- Volumen maestro por defecto 0.4, `DynamicsCompressor` + limitador, lowpass suave en master (~9 kHz), música −8 dB y SFX −4 dB respecto a ahora, sin picos; `Sound.setVolume(v)`, `Sound.getVolume()`, `Sound.talk(role, mood)` (blips cortos y suaves por personaje para el typewriter), `Sound.sfx('splash'|'gasp'|'drown'|'ability'|'gate_open'|'help'|'dialogue_open')`.
- Verificar con análisis numérico (pico < −3 dBFS, RMS razonable) y documentar.
