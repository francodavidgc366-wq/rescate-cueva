# NOTES-net10 (ICE, reintentos, estado)
- `Net.config.iceServers`: 4 STUN (google x3, cloudflare) + twilio/nextcloud + TURN Open Relay de Metered (turn:80, turn:443, turns:443, user/pass `openrelayproject`, publicos, sin clave privada).
- `?relay=1` en la URL => `iceTransportPolicy:'relay'`.
- `Net.status` + evento `'status'`: `conectando` | `conectado directo` | `conectado por relay` (getStats del par elegido, candidateType relay) | `falló`.
- host() y join() reintentan 3 veces (backoff 1s/2s/4s, `Net.config.retries/retryBaseMs`) los fallos de red/timeout/broker. Agotados: status `falló` y error «No se pudo conectar. Intenta de nuevo o cambia de red.» Los errores definitivos (sala inexistente, llena, iniciada) no se reintentan y conservan su mensaje.
- El host muestra `conectando` hasta que entra el primer cliente (entonces se calcula directo/relay).
## Probado
Dos contextos Playwright en la misma maquina (tools/net-run10.js): host+join OK (`conectado directo`), reconexion tras `Net.debugDrop()` OK, sala inexistente -> `falló` con su mensaje.
## NO probado / honesto
- NAT real, 4G, redes corporativas: no hay forma de simularlo aqui.
- TURN: en este sandbox `openrelay.metered.ca` resuelve a `100::1` (bloqueado), asi que con `?relay=1` la conexion falla y se ve el flujo de fallo+reintentos, pero NO se verifico que el relay funcione. Ese servicio gratuito puede estar saturado, limitado o retirado; para produccion usa un TURN propio (`Net.addTurn`).
- 'conectado por relay' nunca se observo en vivo.
- El broker de PeerJS (0.peerjs.com) sigue siendo punto unico de fallo (el sandbox si llego a el).
