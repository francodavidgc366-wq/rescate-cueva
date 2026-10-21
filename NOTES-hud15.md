# NOTES-hud15 (agente UI v15) - src/hud.js
## Plan (3 tarjetas, sin scroll)
Lee de `plan.options[i]`: `id`, `n`|`title` (titulo corto <=3 palabras, sin articulo), `travel.kind`|`kind` (pozo, balsa, galeria, cuerda, puente, tunel, compuerta; alias paso/sifon->tunel, puntales/cornisa/repisa->puente, corredor->galeria, bombeo/ventilador->compuerta), `speed` (1..3 | lento/normal/rapido), `risk` (1..3 | 0..1 | bajo/medio/alto | texto de Story), `effects`|`known_effects` ({agua:-2} | [{stat,n}]), `hints` ([string]) + `V.planHints[id]` + intel `about`. Sin `speed` se deriva de `gain` («Rapido», «Algo mas rapido»); sin `effects` se derivan de los textos gain/risk (material, sube el agua, Lia sufre, Cuida a Lia, Equipo tranquilo). Si no hay dato, ese indicador no se pinta (nada inventado). `plan.ask` <=40 car.; `plan.brief` = 1 chip <=60 car. (completo en tooltip). Bombilla con n pistas: «Tu pista» (<=60 car.) al pasar el cursor. Votos ajenos = retratos sobre la tarjeta.
## Accion secreta
`V.secretOptions[i]`: `kind`|`tag` (team/confess=AYUDAR verde, goal=PARA MI naranja, risky/risk=ARRIESGAR rojo; si falta, por indice), `title`|`text` (<=28), `effects` ({stat:n}), `risk` (0..1 | 1..3). «Se aplica al final del tramo» solo si alguna opcion trae effects/reward.
## Solapes
- Coach y banner AHORA ocultos con panel plan/secret/resolve (banner tambien summary).
- `Hud.dialogue(lines, {skipIfPanel})` y `Hud.say(o, {skipIfPanel})`: por defecto true. Con panel plan/secret abierto se encolan; al cerrarse salen si la fase sigue siendo la misma, si no se descartan (la promesa de dialogue se resuelve igualmente). `skipIfPanel:false` los muestra siempre.
- Con panel de decision abierto (clase `.dec`) se ocultan floatText, toasts, fcard, say. Los carteles del canvas del motor NO son del HUD.
## Pedir ayuda (`Hud.setBlocked`)
Pildora oscura, borde naranja, face_<rol> 32 px, una linea (<=36 car.) y flecha; centrada en el espacio a la derecha del minimapa/+−⌂.
## Dieta
Banner: titulo <=40, porque <=45. Frases de fase/instruccion de la barra superior recortadas.
## Para main.js
Sobran las lineas 22-25 (el `<style>` provisional): `.h-opt{overflow:hidden}` recortaria los retratos de votos y la pista.
## No verificado
Con main/engine reales y partida multijugador; 1366x768 del plan y 1920x1080 (solo 1280x650 plan, 1366x768 secreto, 1280x650 boton); chips de efectos del secreto con datos reales de Story; hover de pista; dialogue/say encolados y coach oculto (solo sintaxis); movil; texto de HELP/otros textos no tocados (no se auditaron todos a <=6 palabras); ui.js sin cambios.
