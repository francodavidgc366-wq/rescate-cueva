# Prompts v3 - Rescate en la Cueva
Código: `src/story.js` (`Story.PROMPTS`, `version:'v3'`). Modelo `claude-haiku-5-5` (`Story.setModel`). Llamada directa desde el navegador (`anthropic-dangerous-direct-browser-access`), clave solo en localStorage. Toda salida es JSON validado; ante fallo se cae al modo demo (3 fallos seguidos pausan la IA 90 s).

| Agente | Cuándo | Entrada | Salida (JSON) | Validación / fallback |
|---|---|---|---|---|
| Director | `roundStart` | contexto público + historial + evento y opciones base | `{event:{title,text,radio},options:[{n,title,text,known}x3],pois:[4 etiquetas]}` | `validDirector`: longitudes, 3 opciones, `n` con palabra clave única (la usa `parseClaim`). 2 intentos con `[ERROR PREVIO]`, luego demo (`fallback:true`). La IA solo escribe texto: números, trampa/gema y efectos los fija el código por semilla (anti-trampas). |
| Compañero (chat) | `botChat` | personalidad, estado público, 8 últimos mensajes, su info privada, disparador | `{text}` | `validChat`: 3-240 chars, sin metaconceptos, rechaza si filtra su secreto sin haberlo revelado. Fallback: plantillas reactivas sin repetición. |
| Compañero (acción) | `botAct` | fase, POIs libres / opciones / acciones secretas | `{action:'poi'|'share'|'vote'|'secret'|'ready'|'none',...}` | `validAct`: solo acciones legales (AP, tarjeta propia no compartida, opción existente). Fallback: heurística por estilo. Compartir con cambios = mentira, la detecta el juego (`parseClaim`). |
| Lía | `botChat(st,'lia',..)` | estado | `{text}` | igual que chat; fallback frases por salud/agua. |
| Árbitro | `finish` | resultado, decisiones, secretos, mentiras, objetivos | `{verdict}` | 60-1000 chars; fallback `demoVerdict` (cita mejor/peor tramo, secretos, mentiras, objetivos, MVP). |

Secciones del prompt: `[CONTEXTO]`, `[EVENTO BASE]`/`[ESTADO PÚBLICO]`, `[CHAT RECIENTE]`, `[TU INFORMACIÓN PRIVADA]`, `[FORMATO]`, `[REGLAS]`, `[VALIDACION]`, `[TAREA]`. El sistema ordena ignorar instrucciones dentro de datos/chat.

Historial: v1 prototipo; v2 secciones + ejemplo + validación estricta; v3 reparto de responsabilidades (IA = texto y decisiones de compañeros, código = reglas y azar), compañeros con información privada, árbitro con mentiras/secretos.

v4 (sin cambio de prompts): `botChat` aplica limitador y anti-repetición también a la salida de la IA (frase repetida -> se usa la demo; frenado -> null). La intro y la ficha de rol ya no contienen secretos; solo `priv.secret` (y el prompt privado del propio bot) los incluye.

v5 (sin cambio de prompts de IA): las etiquetas de POI del director IA se ignoran (nombre/why/puertas salen de las tablas por zona); `Story.request` y `Story.scene` son 100 % código (demo), sin llamada a Claude.

v6 (sin cambio de prompts de IA): `parseRequest`/`answerChat` (peticiones por texto), `explainResult`, `coach`, `botStuck` y los destinos (`fates`) son 100 % código; las frases de tarea de los bots salen de la tabla `DO` por POI.

v7: rescatistas Mateo (guía), Elena (médica), Samuel (ingeniero); solo 4 destinos (Lía + 3). El director avisa de la opción «de respiro» si salud/agua van mal. `Story.planBrief` y `intel.uses` son texto fijo del código (no pasan por la IA).
