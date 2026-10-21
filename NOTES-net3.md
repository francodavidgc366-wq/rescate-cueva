# NOTES-net3 (agente NET, v3)

Ampliación de `src/net.js` (compatible con NOTES-net.md). Prueba: `tools/net-test.html` (expone `ST.got[tipo]`).

## API nueva
- `Net.sendTo(peerId,type,payload)`: host -> UN cliente por su canal fiable; `sendTo('p0',..)` = loopback local; devuelve false si no existe/está caído. Es la ÚNICA vía para `priv`: `Net.broadcast('priv',..)` se rechaza (false) para no filtrar por error.
- `Net.sendHost(type,payload)` = alias de `Net.send`. `Net.addTurn(urls,user,cred)`. `Net.debugDrop()` (solo tests: cierra la conexión al host para probar reconexión).
- Tipos nuevos con `Net.on`: `priv chat vote poi secret ready phase typing`. Cliente->host: `chat vote poi secret ready typing` (más los de siempre). Host->clientes: `phase`, `priv` (sendTo), `chat`/`typing` (retransmitidos por el host con `d.from=id`, no falsificable). `vote/poi/secret` NO se retransmiten (solo los ve el host; él decide qué publicar).
- Validación en el host (cliente->host): tipo fuera de la lista blanca => descartado (un cliente no puede enviar `priv/phase/state/...`); tamaño máx. del JSON por tipo (chat 1500 B, input 400 B, vote/poi/secret 400 B...); rate-limit token-bucket por peer y tipo (chat: ráfaga 6, 1,5/s; input 90/s). Lo descartado se ignora en silencio (visible con `Net.config.debug`). `chat`/`typing` exigen payload objeto.
- Tokens de sesión: ya no aparecen en `Net.players` al serializar (propiedad no enumerable).

## Bug corregido (afectaba a v2)
La reconexión con token nunca funcionaba: `pushPlayers` sustituía `Net.players` por la copia sin token, así que el cliente que volvía era tratado como nuevo y recibía "sala llena". Ahora el host conserva el token (oculto) y el hueco se recupera.

## ICE / TURN
STUN por defecto: Google (x3), Cloudflare, Twilio, Nextcloud. `Net.config.iceTransportPolicy:'relay'` fuerza TURN (solo para probar).
**TURN público gratuito: ninguno utilizable verificado.** Probado en el sandbox con `RTCPeerConnection({iceTransportPolicy:'relay'})` contra: openrelay.metered.ca (user/pass `openrelayproject`; DNS resuelve a 100::1, sin candidatos), staticauth.openrelay.metered.ca (resuelve a una IP aparcada; error 701), numb.viagenie.ca (no existe), freestun.net (`free/free`, sin candidatos), relay1.expressturn.com (`efree/efree`: responde 401, credenciales no válidas), turn.anyfirewall.com (701). Ningún candidato `relay` obtenido; por tanto NO se incluye ninguno (credenciales públicas de este tipo suelen estar muertas o limitadas, y añadirlas daría falsa seguridad). Ojo: el sandbox puede bloquear UDP/DNS externos, así que "no responde aquí" no prueba que estén muertos en una red real; solo que no puedo garantizarlos.
Opciones reales (hueco ya configurable):
1. Metered.ca / Open Relay con cuenta gratuita (da API key y credenciales propias; plan gratis con cuota mensual limitada): `Net.addTurn(['turn:<tu-subdominio>.metered.live:80','turn:...:443?transport=tcp','turns:...:443?transport=tcp'],user,pass)`. No verificado.
2. Cloudflare Realtime TURN: el cliente necesita credenciales efímeras generadas en un servidor/Worker con tu API token; hay que obtenerlas antes de `host()/join()` y hacer `Net.config.iceServers.push({urls:['turn:turn.cloudflare.com:3478?transport=udp','turns:turn.cloudflare.com:5349?transport=tcp'],username,credential})`.
3. coturn propio (VPS pequeño): `apt install coturn`; en `/etc/turnserver.conf`: `listening-port=3478`, `tls-listening-port=5349`, `fingerprint`, `lt-cred-mech`, `user=juego:CLAVE`, `realm=tudominio`, `no-multicast-peers`, `total-quota=50` (+ certificados para `turns`); abrir 3478 udp/tcp, 5349 tcp y el rango de relay 49152-65535 udp. Luego `Net.addTurn('turn:IP:3478','juego','CLAVE')`. Una credencial estática en un cliente web es visible para cualquiera: usa cuota y rótala (o credenciales efímeras REST).
Host y cliente deben usar el mismo build/lista, aunque cada extremo solo necesita TURN propio para sus candidatos.

## Verificado (Playwright, 4 pestañas separadas: host + 2 clientes + 3er cliente; broker público 0.peerjs.com)
- Envío privado: `sendTo(p1,'priv')` lo recibe solo p1; p2 no recibe nada (`ST.got.priv` vacío); `sendTo('p0')` loopback; `broadcast('priv')` rechazado; `sendTo` a jugador caído => false.
- chat/typing (retransmitidos con `from` correcto, a todos), vote/poi/secret llegan al host y NO a otros clientes, `phase` por broadcast llega.
- Cliente que envía `priv/phase/foo` => descartado; spam de 41 chats => pasan 6 (ráfaga); chat de 5000 B => descartado.
- Desconexión (`leave()`): host marca bot + evento `leave`. Reconexión tras corte forzado: eventos `reconnecting/reconnected`, mismo id/rol/hueco, `sendTo` y snapshots funcionan después. 3er cliente => "La sala está llena (máx. 3 jugadores)".
## NO verificado
Conexión entre redes reales/NAT simétrico; cualquier TURN (el sandbox no obtiene candidatos relay); timeout por heartbeat sin cierre de socket (solo cierre explícito); límites de rate calibrados a ojo (ajustar `LIM` en net.js si main.js envía más); `Net.lock`; `Net.available=false`.
