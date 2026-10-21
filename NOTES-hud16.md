# NOTES-hud16 (UI v16) - src/hud.js, src/ui.js
- Plan: tarjeta = titulo + `opt.what` (<=45 car., 2 lineas) + velocidad/riesgo/chips de efectos. Sin brief, bombilla ni pistas (solo cuaderno/chat).
- `Hud.floatCard({title,text,uses})`: centro (38 % alto), pop, 4 s, max 2 apiladas, chip "Guardado en el CUADERNO (J)".
- Cuaderno: boton grande con libro, CUADERNO + J, badge rojo (intel nuevas = V.intel.length - vistas; se alimenta solo en update), latido al subir, flecha "Leelas" mientras haya. Al abrir, tarjetas nuevas con "NUEVO". `Hud.noteNew(n)` fuerza que las ultimas n cuenten como no leidas.
- `Hud.minigame({kind, theme, level, title})`: theme (anula kind): escaner(timing), anclaje(timing, 3 golpes, 2 fallos = pierde), cavar(mash), valvula(mash), puente(sequence), reptadero|estabilizar(hold). Sin theme: diseno anterior. Escena canvas 160x64 con tiles de ASSETS (bg_a/b/vein, rubble) + polvo/chispas. Mash: ~25 % menos pulsaciones y barra cae ~30 % mas lento (todos los mash).
- Evento `start` (ui.js): `{role, host, solo, difficulty, quick}`; `quick` = conmutador de menu "Partida rapida (video)", guardado en rcv3_set (localStorage). Los eventos `solo`/`host` NO llevan quick (main.js debe leer S/ el start).
## No verificado
Plan en pantalla, menu ui.js, movil, resto de themes visualmente (solo valvula + floatCard + dock en pagina de prueba), que main.js consuma `quick` ni pase `theme`/`what`.
