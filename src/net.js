/* Net: multijugador PeerJS, host autoritativo. Ver NOTES-net.md. Script clásico, define window.Net. */
(function () {
  'use strict';
  var PREFIX = 'rce2-';
  var ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin O/0/I/1
  var ROLES = ['guia', 'medica', 'ing'];
  var MAX = 3;

  var Net = {
    available: typeof window.Peer === 'function' && typeof window.RTCPeerConnection === 'function',
    // Broker/ICE configurables ANTES de host()/join(). brokers se prueban en orden (fallback si el primero cae).
    config: {
      brokers: [
        {}, // broker público por defecto de PeerJS (0.peerjs.com:443)
        // Ejemplo de fallback propio: { host: 'mi-broker.example.com', port: 443, secure: true, path: '/' }
      ],
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        // TURN opcional: { urls: 'turn:host:3478', username: 'u', credential: 'p' }
      ],
      snapshotHz: 20, heartbeatMs: 2000, timeoutMs: 8000, connectTimeoutMs: 12000, graceMs: 30000, debug: false
    },
    role: null,       // 'host' | 'client' | null
    localId: null,    // 'p0' (host), 'p1', 'p2'
    roomCode: null, link: null,
    players: [],      // [{id,name,role,bot,ready,host,connected}] (copia del roster del host)
    rtt: 0, locked: false
  };

  var handlers = {}, peer = null, brokerIdx = 0;
  var conns = {};           // host: id -> {r, u, last, token}; client: {host:{r,u}}
  var seq = 0, lastSeq = -1, lastSnapT = 0, hbTimer = null, name = 'Jugador', leaving = false;
  var token = (function () { try { var t = sessionStorage.getItem('rce2tok'); if (!t) { t = Math.random().toString(36).slice(2); sessionStorage.setItem('rce2tok', t); } return t; } catch (e) { return Math.random().toString(36).slice(2); } })();
  var hostConn = null, hostCode = null, retries = 0;

  function log() { if (Net.config.debug) console.log.apply(console, ['[Net]'].concat([].slice.call(arguments))); }
  Net.on = function (t, fn) { (handlers[t] = handlers[t] || []).push(fn); return Net; };
  Net.off = function (t, fn) { handlers[t] = (handlers[t] || []).filter(function (f) { return f !== fn; }); return Net; };
  function emit(t, d, from) { (handlers[t] || []).slice().forEach(function (f) { try { f(d, from); } catch (e) { console.error(e); } }); }
  function fail(msg) { emit('error', msg); return new Error(msg); }

  Net.parseCode = function (s) { // acepta código o enlace con #sala=; descarta caracteres fuera del alfabeto (O/0/I/1)
    s = String(s || '').trim(); var m = s.match(/sala=([^&\s]+)/i); if (m) s = m[1];
    return s.toUpperCase().split('').filter(function (ch) { return ALPHA.indexOf(ch) >= 0; }).join('').slice(0, 5);
  };
  Net.codeFromHash = function () { var c = Net.parseCode(location.hash); return c.length === 5 ? c : null; };
  function newCode() { var c = ''; for (var i = 0; i < 5; i++) c += ALPHA[Math.floor(Math.random() * ALPHA.length)]; return c; }

  function makePeer(id) {
    var b = Net.config.brokers[brokerIdx] || {};
    var o = { config: { iceServers: Net.config.iceServers }, debug: Net.config.debug ? 2 : 0 };
    for (var k in b) o[k] = b[k];
    return id ? new window.Peer(id, o) : new window.Peer(o);
  }

  // Abre un Peer probando brokers en orden. Resuelve con el peer abierto.
  function openPeer(wantedId, onCollision) {
    return new Promise(function (resolve, reject) {
      (function attempt() {
        var p = makePeer(wantedId), done = false;
        var t = setTimeout(function () { bad({ type: 'network' }); }, 8000);
        function bad(e) {
          if (done) return; done = true; clearTimeout(t); try { p.destroy(); } catch (x) {}
          if (e.type === 'unavailable-id' && onCollision) { wantedId = onCollision(); return attempt(); }
          if (brokerIdx + 1 < Net.config.brokers.length) { brokerIdx++; log('broker fallback', brokerIdx); return attempt(); }
          reject(fail('No se pudo contactar con el servidor de salas (' + (e.type || 'error') + '). Puedes jugar en solitario.'));
        }
        p.on('open', function (id) { if (done) return; done = true; clearTimeout(t); resolve(p); });
        p.on('error', bad);
      })();
    });
  }

  function send1(c, m) { try { if (c && c.open) { c.send(m); return true; } } catch (e) { log('send fail', e); } return false; }
  function roster() { return Net.players.map(function (p) { return { id: p.id, name: p.name, role: p.role, bot: p.bot, ready: p.ready, host: p.host, connected: p.connected }; }); }
  function pushPlayers() { var r = roster(); Net.players = r.map(function (p) { return p; }); bcast('players', r); emit('players', r); }
  function bcast(t, d, unreliable) {
    var m = { t: t, d: d }, ids = Object.keys(conns);
    ids.forEach(function (id) { var c = conns[id]; send1(unreliable && c.u && c.u.open ? c.u : c.r, m); });
  }

  // ---------- HOST ----------
  Net.host = function (opts) {
    opts = opts || {};
    if (!Net.available) return Promise.reject(fail('El multijugador no está disponible (PeerJS/WebRTC no se cargó). Juegas en solitario.'));
    Net.leave(); leaving = false; brokerIdx = 0;
    var code = newCode();
    return openPeer(PREFIX + code, function () { code = newCode(); return PREFIX + code; }).then(function (p) {
      peer = p; Net.role = 'host'; Net.localId = 'p0'; Net.roomCode = code; conns = {}; Net.locked = false;
      Net.link = location.origin + location.pathname + '#sala=' + code;
      Net.players = [{ id: 'p0', name: opts.name || name, role: ROLES[0], bot: false, ready: false, host: true, connected: true, token: token }];
      p.on('connection', onIncoming);
      p.on('disconnected', function () { if (!leaving && peer === p) { log('broker caído, reconectando'); setTimeout(function () { try { p.reconnect(); } catch (e) {} }, 1500); } });
      p.on('error', function (e) { if (e.type === 'peer-unavailable') return; log('peer error', e.type); });
      startHb(); emit('players', roster());
      return { roomCode: code, link: Net.link };
    });
  };

  function freeRole() { var used = {}; Net.players.forEach(function (p) { used[p.role] = 1; }); return ROLES.filter(function (r) { return !used[r]; })[0]; }

  function onIncoming(c) {
    var kind = c.metadata && c.metadata.k, pid = c.metadata && c.metadata.id, tok = c.metadata && c.metadata.tok;
    if (kind === 'u') { // canal no fiable del cliente ya admitido
      var e = conns[pid]; if (e && e.token === tok) { e.u = c; c.on('close', function () { if (e.u === c) e.u = null; }); } else c.close(); return;
    }
    c.on('open', function () {
      var pl = Net.players.filter(function (p) { return p.token === tok; })[0];
      if (!pl) {
        if (Net.locked) { send1(c, { t: 'reject', d: 'La partida ya ha empezado.' }); return setTimeout(function () { c.close(); }, 300); }
        var humans = Net.players.filter(function (p) { return !p.bot && p.connected; }).length;
        if (Net.players.length >= MAX || humans >= MAX || !freeRole()) { send1(c, { t: 'reject', d: 'La sala está llena (máx. 3 jugadores).' }); return setTimeout(function () { c.close(); }, 300); }
        var n = 1; while (Net.players.some(function (p) { return p.id === 'p' + n; })) n++;
        pl = { id: 'p' + n, name: (c.metadata.name || 'Jugador').slice(0, 16), role: freeRole(), bot: false, ready: false, host: false, connected: true, token: tok };
        Net.players.push(pl);
      } else { // reconexión: recupera su hueco
        if (conns[pl.id] && conns[pl.id].r !== c) try { conns[pl.id].r.close(); } catch (x) {}
        pl.bot = false; pl.connected = true; delete pl.leftAt;
      }
      var ent = conns[pl.id] = { r: c, u: null, last: Date.now(), token: tok };
      send1(c, { t: 'welcome', d: { id: pl.id, role: pl.role, room: Net.roomCode } });
      pushPlayers();
      c.on('data', function (m) { ent.last = Date.now(); hostRecv(pl.id, m); });
      c.on('close', function () { if (conns[pl.id] === ent) dropPlayer(pl.id, 'se desconectó'); });
      c.on('error', function () { if (conns[pl.id] === ent) dropPlayer(pl.id, 'error'); });
    });
  }

  function hostRecv(id, m) {
    if (!m || typeof m.t !== 'string') return;
    var ent = conns[id], pl = Net.players.filter(function (p) { return p.id === id; })[0];
    if (m.t === 'ping') return send1(ent.r, { t: 'pong', d: m.d });
    if (m.t === 'pong') return;
    if (m.t === 'bye') return dropPlayer(id, 'salió');
    if (m.t === 'hello') { if (pl && m.d && m.d.name) { pl.name = String(m.d.name).slice(0, 16); pushPlayers(); } return; }
    if (m.t === 'setrole') return Net.setRole(m.d, id);
    if (m.t === 'ready' && pl) { pl.ready = !!(m.d && m.d.ready); pushPlayers(); }
    if (m.t === 'input' && m.d) { m.d.id = id; }
    if (m.t === 'chat' && m.d) { m.d.from = id; bcast('chat', m.d); }
    emit(m.t, m.d, id);
  }

  function dropPlayer(id, why) {
    var ent = conns[id]; if (!ent) return; delete conns[id];
    try { ent.r.close(); if (ent.u) ent.u.close(); } catch (e) {}
    var pl = Net.players.filter(function (p) { return p.id === id; })[0]; if (!pl) return;
    pl.bot = true; pl.connected = false; pl.ready = true; pl.leftAt = Date.now();
    log('jugador fuera', id, why);
    emit('leave', { id: id, bot: true, name: pl.name, role: pl.role, why: why }, id);
    bcast('leave', { id: id, bot: true, name: pl.name, role: pl.role });
    pushPlayers();
  }

  // Cambio de rol (host o cliente). Si el rol está ocupado por otro, lo intercambia solo si es un bot/desconectado; si no, lo rechaza.
  Net.setRole = function (role, who) {
    who = who || Net.localId;
    if (Net.role === 'client') return send1(hostConn && hostConn.r, { t: 'setrole', d: role });
    if (ROLES.indexOf(role) < 0) return false;
    var me = Net.players.filter(function (p) { return p.id === who; })[0], other = Net.players.filter(function (p) { return p.role === role; })[0];
    if (!me || (other && other !== me && !other.bot)) return false;
    if (other && other !== me) other.role = me.role;
    me.role = role; pushPlayers(); return true;
  };
  Net.setName = function (n) { name = String(n || 'Jugador').slice(0, 16); if (Net.role === 'host') { Net.players[0].name = name; pushPlayers(); } else if (hostConn) send1(hostConn.r, { t: 'hello', d: { name: name } }); };
  Net.lock = function (v) { Net.locked = !!v; }; // host: bloquea nuevas uniones (reconexiones con token siguen permitidas)

  // ---------- CLIENTE ----------
  Net.join = function (codeOrLink, opts) {
    opts = opts || {};
    if (!Net.available) return Promise.reject(fail('El multijugador no está disponible (PeerJS/WebRTC no se cargó). Juegas en solitario.'));
    var code = Net.parseCode(codeOrLink);
    if (code.length !== 5) return Promise.reject(fail('Código de sala no válido (5 caracteres).'));
    Net.leave(); leaving = false; brokerIdx = 0; hostCode = code; retries = 0;
    if (opts.name) name = String(opts.name).slice(0, 16);
    return connectToHost(code, false);
  };

  function connectToHost(code, isRetry) {
    return openPeer(null).then(function (p) {
      peer = p;
      return new Promise(function (resolve, reject) {
        var settled = false, tried = 0;
        function end(err, val) { if (settled) return; settled = true; clearTimeout(to); err ? reject(err) : resolve(val); }
        var to = setTimeout(function () { cleanup(); end(fail('No se encontró la sala ' + code + ' (el anfitrión no responde).')); }, Net.config.connectTimeoutMs);
        function cleanup() { try { p.destroy(); } catch (e) {} if (peer === p) peer = null; }
        function dial() {
          var c = p.connect(PREFIX + code, { reliable: true, serialization: 'json', metadata: { k: 'r', name: name, tok: token } });
          var open = false;
          c.on('open', function () { open = true; });
          c.on('data', function (m) {
            if (!m) return;
            if (m.t === 'welcome') {
              hostConn = { r: c, u: null, last: Date.now() }; Net.role = 'client'; Net.localId = m.d.id; Net.roomCode = code; Net.link = location.origin + location.pathname + '#sala=' + code; retries = 0;
              var u = p.connect(PREFIX + code, { reliable: false, serialization: 'json', metadata: { k: 'u', id: m.d.id, tok: token } });
              u.on('open', function () { hostConn.u = u; }); u.on('data', function (mm) { if (hostConn) hostConn.last = Date.now(); if (mm) clientRecv(mm); }); u.on('close', function () { if (hostConn && hostConn.u === u) hostConn.u = null; });
              startHb(); end(null, { id: m.d.id, role: m.d.role, roomCode: code }); return;
            }
            if (m.t === 'reject') { leaving = true; cleanup(); end(fail(m.d)); return; }
            if (hostConn) hostConn.last = Date.now();
            clientRecv(m);
          });
          c.on('close', function () { if (!settled) return; if (hostConn && hostConn.r === c) onHostLost(); });
          c.on('error', function () { if (!open && !settled && ++tried < 2) setTimeout(dial, 800); });
        }
        p.on('error', function (e) {
          if (settled) return;
          if (e.type === 'peer-unavailable') {
            if (isRetry) return;
            if (brokerIdx + 1 < Net.config.brokers.length) { // probar el siguiente broker
              brokerIdx++; clearTimeout(to); cleanup(); settled = true;
              return connectToHost(code, isRetry).then(resolve, reject);
            }
            cleanup(); end(fail('La sala ' + code + ' no existe o el anfitrión ya se fue.'));
          } else if (e.type === 'webrtc' || e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') {
            if (!settled) { cleanup(); end(fail('Error de red al conectar con la sala (' + e.type + '). Puedes jugar en solitario.')); }
          }
        });
        dial();
      });
    });
  }

  function clientRecv(m) {
    if (m.t === 'ping') return send1(hostConn.r, { t: 'pong', d: m.d });
    if (m.t === 'pong') { Net.rtt = Date.now() - m.d; return; }
    if (m.t === 'players') { Net.players = m.d; }
    if (m.t === 'snapshot') { if (m.s <= lastSeq && lastSeq - m.s < 1000) return; lastSeq = m.s; }
    emit(m.t, m.d, 'p0');
  }

  function onHostLost() {
    if (leaving) return; stopHb();
    if (retries >= 3) { Net.role = null; emit('leave', { id: 'p0', host: true }, 'p0'); return emit('error', 'Se perdió la conexión con el anfitrión.'); }
    var wait = 1000 * Math.pow(2, retries++); emit('reconnecting', { attempt: retries });
    setTimeout(function () {
      if (leaving) return;
      try { peer && peer.destroy(); } catch (e) {} peer = null;
      connectToHost(hostCode, true).then(function () { emit('reconnected', {}); }, function () { onHostLost(); });
    }, wait);
  }

  // ---------- COMÚN ----------
  function startHb() {
    stopHb();
    hbTimer = setInterval(function () {
      var now = Date.now(), T = Net.config.timeoutMs;
      if (Net.role === 'host') {
        Object.keys(conns).forEach(function (id) { var e = conns[id]; if (now - e.last > T) dropPlayer(id, 'sin respuesta'); else send1(e.r, { t: 'ping', d: now }); });
      } else if (hostConn) {
        if (now - hostConn.last > T) { try { hostConn.r.close(); } catch (e) {} onHostLost(); }
        else send1(hostConn.r, { t: 'ping', d: now });
      }
    }, Net.config.heartbeatMs);
  }
  function stopHb() { if (hbTimer) clearInterval(hbTimer); hbTimer = null; }

  // cliente -> host. En el host hace loopback local (emite el evento con from=localId) para unificar el código de main.js.
  Net.send = function (type, payload) {
    if (Net.role === 'host') { if (type === 'ready') { Net.players[0].ready = !!(payload && payload.ready); pushPlayers(); } emit(type, type === 'input' ? Object.assign({ id: 'p0' }, payload) : payload, 'p0'); return true; }
    if (Net.role !== 'client' || !hostConn) return false;
    var m = { t: type, d: payload };
    return send1(hostConn.r, m);
  };
  // host -> todos los clientes (sin loopback). 'snapshot' va por el canal no fiable y se limita a Net.config.snapshotHz.
  Net.broadcast = function (type, payload) {
    if (Net.role !== 'host') return false;
    if (type === 'snapshot') {
      var now = performance.now(); if (now - lastSnapT < 1000 / Net.config.snapshotHz - 1) return false; lastSnapT = now;
      var m = { t: 'snapshot', d: payload, s: ++seq };
      Object.keys(conns).forEach(function (id) { var c = conns[id]; send1(c.u && c.u.open ? c.u : c.r, m); });
      return true;
    }
    bcast(type, payload); return true;
  };
  Net.isHost = function () { return Net.role === 'host'; };
  Net.humanCount = function () { return Net.players.filter(function (p) { return !p.bot; }).length; };

  Net.leave = function () {
    leaving = true; stopHb();
    try { if (Net.role === 'client' && hostConn) send1(hostConn.r, { t: 'bye' }); } catch (e) {}
    var p = peer; setTimeout(function () { try { p && p.destroy(); } catch (e) {} }, 150); // deja salir 'bye'
    peer = null; hostConn = null; conns = {}; Net.role = null; Net.localId = null; Net.roomCode = null; Net.link = null; Net.players = []; seq = 0; lastSeq = -1;
  };
  window.addEventListener('beforeunload', function () { if (Net.role) Net.leave(); });

  window.Net = Net;
})();
