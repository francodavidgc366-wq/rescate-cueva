# NOTES-net20: rendimiento del cliente, dialogos no sincronizados, guia en el invitado

## C) Guia/indicaciones en el invitado (causa y arreglo)
- Causa: `guide()` solo corria en el tick del host y `Story.mission/coach/chatSuggest/poiHints` necesitan estado oculto (`st.hid`, `st.priv`, no enumerables: no viajan en `state`). El motor del cliente ademas no tenia los POI del tramo (`setPois` solo en `startRound` del host) -> sin flecha, anillos ni cartel de distancia.
- Arreglo (main.js): el host anade a cada `priv` un bloque `gd` por rol remoto (`gdFor`): mision, `crisisReady`, chips de chat, ojitos de POI y 8 variantes de coach (flags moved/near/notebook, que son locales del cliente). El cliente corre `guide()` + `clientSync()` (render y cada 250 ms) con `gd`, y llama `eng.setUnlocked/setPois` al cambiar el tramo. `priv` solo se reenvia si cambia (JSON).
- Comprobado (host + cliente movil emulado, PeerJS real): posiciones de POI identicas en ambos motores; el cliente muestra flecha, cartel 'GRIETA ALTA 107 M', coach 'Muévete con ◀ ▶.', 'PEDIR AYUDA' y mision. Capturas: scratchpad/shots/g_host.png, g_client.png. NO probado: actualizacion tras interactuar con un punto / abrir una puerta (la ruta es la misma: `push()` -> `priv.gd`).

## B) Dialogos
- La barrera 'Esperando a los demas' solo cubre intro + rol (no cambia). Multijugador: el dialogo del Director/lia del briefing es `compact` (hud.js `runDialogue`): no modal (no `dlgOpen`, no captura teclas, no oculta controles tactiles), caja pequena abajo-centro (touch.js lo coloca entre joystick y botones), cada linea se cierra sola a los 2,4-6,5 s o al tocar; el host pasa de briefing a explorar a los 1,2 s sin esperarlo. La escena se dispara por tramo (`ev<round>`) en briefing o explore. Solo: igual que antes (modal).
- Probado: host y cliente en explore a la vez con el dialogo compacto abierto en ambos (cada uno en una linea distinta), el cliente se mueve con el dialogo abierto (152->270), el host tambien, controles tactiles visibles (`#rc-tc` display block, sin `rc-dlg`).

## A) Rendimiento del cliente (Chrome headless, movil 850x390 dpr 2.6 + CPU throttling, PeerJS real, host 1000x600)
Metodo: rAF durante 10 s moviendo al cliente, CDP Profiler (500 us), conteo de bytes de `Net.on` (JSON).
| CPU | antes fps / p95 | despues fps / p95 |
|---|---|---|
| 4x | 55-57 / 16.8 ms | 55 / 16.8 ms |
| 6x | 32 / 50 ms | 36-41 / 33-50 ms |
| 8x | 16.6 / 100 ms | 23.5 / 67 ms |
- Costes (perfil a 6x, ~12 s): `(program)` (raster/composicion del navegador) ~50 %, `fillRect`+`drawImage` del canvas ~25 %, `render` JS ~3 %. El cliente NO simula IA/pathfinding (solo interpola snapshots). Ocultar `.hud` entero daba +12 fps (45 vs 32): ningun hijo concreto domina (prueba por hijos, ruido +-5 fps).
- Cambios: (1) tope ~30 fps de dibujo en cliente tactil (engine.js loop; simulacion/interpolacion a 60); (2) `drawMini` no dibuja si el minimapa esta oculto (movil); (3) `priv` solo se envia si cambia; (4) chat del `state` limitado a 80 lineas.
- Red del cliente (por segundo): snapshot ~6,3 KB (21 msg/s, ~295 B), state ~11,6 KB (1,5 msg/s, ~7,7 KB), priv 5,4 KB -> 0,65 KB. No se toco la frecuencia de snapshot (20 Hz) ni se hizo delta.
- NO medido: GPU/raster de un movil real (headless usa software), RTT real; el 'se traba' en red lenta puede venir de la falta de prediccion del propio cuerpo del cliente (sigue el snapshot con 0,35/tick), no tocado.
