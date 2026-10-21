# NOTES-net (agente NET)

Archivos: `src/net.js` (window.Net), `vendor/peerjs.min.js` (PeerJS 1.5.4, publicado 2024-05, desde unpkg), `tools/net-test.html`.

## API
- `Net.available` (bool). Si false: `host()/join()` rechazan con mensaje en español y emiten `error`; el juego sigue en solitario.
- `Net.host({name}) -> Promise<{roomCode, link}>`; `Net.join(codigoOEnlace, {name}) -> Promise<{id, role, roomCode}>`; `Net.leave()`.
- `Net.parseCode(str)` (acepta enlace o código), `Net.codeFromHash()` (lee `#sala=`).
- `Net.on(tipo, fn(payload, fromId))` / `Net.off`. Tipos: `players input pick state snapshot chat ready leave error reconnecting reconnected`.
- `Net.send(tipo, payload)`: cliente -> host. En el HOST hace loopback local (emite el evento con from='p0'), para un solo código en main.js.
- `Net.broadcast(tipo, payload)`: host -> todos los clientes (sin loopback). `snapshot` va por canal no fiable y se limita a `Net.config.snapshotHz` (20): se puede llamar cada frame.
- `Net.setRole(rol)`, `Net.setName(n)`, `Net.lock(true)` (host: no admitir nuevas uniones al empezar; reconexiones con token siguen), `Net.isHost()`, `Net.humanCount()`.
- Estado: `Net.role` ('host'|'client'|null), `Net.localId` ('p0' host, 'p1','p2'), `Net.roomCode`, `Net.link`, `Net.players` `[{id,name,role,bot,ready,host,connected}]`, `Net.rtt` (ms, cliente).

## Protocolo (mensajes JSON `{t, d}`; snapshot lleva `s`=seq)
- Cliente abre 2 DataConnection a `rce2-CODIGO`: fiable (todo) y no fiable (solo snapshots host->cliente). Si la no fiable no está abierta, snapshots caen al canal fiable.
- cliente->host: `hello`, `setrole`, `ready {ready}`, `input {left,right,jump,interact}` (el host añade `id`), `pick {..}`, `chat`, `ping/pong`, `bye`.
- host->clientes: `welcome {id,role}`, `reject`, `players` (roster completo, ante cualquier cambio), `state`, `pick`, `chat`, `leave {id,bot:true}`, `snapshot`, `ping/pong`.
- Eventos de estado (`state`, `players`, `pick`, `leave`) = canal fiable ordenado. Snapshots: descarta seq antiguo.
- Roles: el host es 'guia'; los que entran reciben el primer rol libre (guia, medica, ing). `setRole` solo intercambia con un bot.
- Máx. 3 (host + 2 clientes; los 3 roles). Un 3er cliente recibe "La sala está llena".
- Heartbeat ping cada 2 s; sin tráfico 8 s = caído. Jugador caído/que sale -> `bot:true` (conserva su rol/hueco) + evento `leave`. Si vuelve con el mismo token (sessionStorage) recupera su hueco.
- Cliente: si pierde al host reintenta 3 veces (1,2,4 s) con el mismo token; luego emite `leave {host:true}` + `error`.
- Código de sala: 5 chars sin O/0/I/1; peer id `rce2-CODIGO`; colisión (`unavailable-id`) regenera.

## Broker / fallback
`Net.config.brokers` = lista probada en orden (`{}` = 0.peerjs.com:443). Añade tu propio PeerServer: `Net.config.brokers.push({host,port,secure,path})`. Host: usa el primero que abre. Cliente: si `peer-unavailable` prueba el siguiente broker. `Net.config.iceServers` admite TURN. Si todos fallan: `error` "No se pudo contactar con el servidor de salas..." y solitario. OJO: host y cliente deben compartir lista de brokers (mismo build).

## Límites conocidos
- Sin TURN, NAT simétrico (móvil 4G/CGNAT, algunas redes corporativas) en ambos extremos no conecta: llegará timeout 12 s "No se encontró la sala". Solo hay STUN. Mitigación: TURN propio en `iceServers`.
- El broker público es best-effort (sin SLA); ids `rce2-*` son públicos (el código es el "secreto").
- "No fiable" en PeerJS 1.5 = `ordered:false` pero con retransmisión: no hay pérdida real, solo sin orden (por eso el seq).
- Si el host se va, la sala muere (sin migración de host).
- Páginas https no pueden usar broker `ws://` propio (mixed content).

## Verificado (Playwright, broker público 0.peerjs.com realmente accesible desde el sandbox)
host crea sala; cliente se une por código; input cliente->host y snapshots host->cliente fluyen (~20 Hz), rtt; cambio de rol; salida del cliente => host lo marca bot + `leave`; 3er cliente rechazado; código inexistente => error en español; primer broker inválido => fallback al segundo; todos inválidos => error por callback y rechazo.
## NO verificado
Reconexión automática del cliente con token; timeout por heartbeat (corte de red sin `bye`); NAT real entre máquinas/redes distintas (solo 2 pestañas del mismo navegador); `Net.available=false` con PeerJS ausente (solo por lectura de código); `Net.lock`.
