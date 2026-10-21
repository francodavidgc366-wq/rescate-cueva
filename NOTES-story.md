# NOTES-story (agente STORY) - `src/story.js` -> `window.Story` / `module.exports`
Sin DOM. Test: `node tools/story-test.js [N=500]` (balance, invariantes, determinismo, fallback IA). Prompts: `docs/prompts.md`.
Cambios vs SPEC: `priv` y el estado oculto (`hid`) son propiedades NO enumerables de `state` (JSON.stringify(state) nunca las filtra). `truth` de las tarjetas NO viaja en `priv` (host-only). Votos son en vivo (`plan.votes`).

## Convenciones
- Roles: `'guia'|'medica'|'ing'` (Nico, Ona, Iván). `Story.RK`, `Story.SK=['agua','salud','material','confianza']`, `Story.ROLES`, `Story.STATS`, `Story.NAMES`.
- Todo el azar es hash(seed, claves): mismo seed + mismas decisiones = mismo resultado (el orden de llamadas no importa). `Story.now` es sustituible (reloj de `msg.t`).
- Funciones que crean chat devuelven `msgs:[msg]` y TAMBIÉN los añaden a `state.chat`. `msg={id,t,from,kind,text,card?,art?,rnd?}`; `from` = rol | 'lia' | 'director' | 'sys'; `kind` = chat|share|radio|event|vote|sys. `botsReact` añade `msg.delay` (ms sugeridos para mostrarlos escalonados).
- Fallo = `{ok:false, reason}` (nunca lanza con entradas inválidas).

## Ciclo (qué hace main.js y cuándo; host)
```
const st = Story.newGame({seed, difficulty:'facil|normal|everest', humans:['ing'], style:'persona'|'coop'|'ego'|'random'|{guia:'coop',..}, demo:true|false})
// players[r].ai = !humans.includes(r); main pone owner/connected. demo por defecto = !Story.hasKey()
// UI.showRole: Story.roleBrief(st, role); intro: Story.introShots / Story.intro
por tramo (st.round = 1..5):
 1 await Story.roundStart(st)   -> {event,pois,plan,msgs,ai,fallback,error}; rellena st.event, st.pois, st.plan.options, priv[*].secretOptions/ap/secretPick, resetea ready/ap; phase='briefing', tleft. Con clave: director IA (2 intentos) -> si falla demo (fallback:true).
    Enviar: Net.broadcast('state', st) y a cada humano Net.sendTo(id,'priv', Story.privOf(st,role)). Engine.setPois(round, st.pois). Mostrar event + msgs. Luego: bots: await Story.botsReact(st,'brief').
 2 Story.setPhase(st,'explore') (tleft=duración). Cada segundo (o frame): Story.tickWater(st, dt) -> {agua, warn:null|50|70|85|100}; si warn -> Sound/Hud + botsReact(st,'water',{level:warn}). Engine.setWater(st.s.agua).
    Humano pulsa E -> Story.poiInteract(st,role,poiId) -> {ok,kind,card?,effects?,hallazgo?,ap,msgs} (reason: fase|poi|sin_ap|ya_visto|agotado). Tras éxito: Engine.markPoi(poiId,{used:poi.used,by}); reenviar priv. 'info' da tarjeta privada (priv.intel), 'recurso' aplica efecto al equipo (primero que llega), 'secreto' da Hallazgo (out.hallazgo.{id,n,title,text,first}).
    Humano comparte: Story.share(st,role,cardId,{asIs:true|false,text}) -> {ok,lie,edited,msgs,react,exposed?}. `lie` solo para el emisor (avisar). Luego: botsReact(st,out.react.trigger,out.react.ctx).
    Humano escribe en chat: Story.say(st,role,text,'chat') y botsReact(st,'chat',{from:role,text}). Chip "No me fío de eso": Story.accuse(st,role,targetRole) -> {ok,hit,msgs}.
    Bots (cada ~3-5 s por bot; solo roles con players[r].ai): a = await Story.botAct(st,role,'explore') -> {type:'poi',poiId,label}|{type:'share',cardId,asIs,text?}|{type:'hide',cardId,label}|{type:'ready'}|null. Para 'poi': Engine.botGoto(role,poiId) y AL LLEGAR Story.exec(st,role,a); resto: Story.exec(st,role,a) ya. Tras 'poi' encontrado: m = await Story.botChat(st,role,'found',{poi:label,hide:false}); tras 'share' ejecutado, botsReact('share',react.ctx). Avisar de la intención 'poi': botChat(st,role,'poi',{poi:label}).
    Fin de fase: tleft<=0 o Story.allReady(st) (Story.ready(st,role) para el botón Listo).
 3 Story.setPhase(st,'plan'); botsReact(st,'plan'); humano: Story.vote(st,role,'A|B|C') (-> msgs, react); bots: botAct(st,role,'plan') + exec. Al acabar: const t = Story.tally(st) -> {counts,winner,tie,tieBreak,unanimous,noVotes,votes,msgs,react}; botsReact(st,'tally',t.react.ctx).
 4 Story.setPhase(st,'secret'); humano Story.secretPick(st,role,idx 0..2) (priv.secretOptions[idx]={text,tag:'team'|'confess'|'goal'|'risky',effects,risk,fail,hint}); bots botAct(...,'secret')+exec.
 5 Story.setPhase(st,'resolve'); const res = Story.resolve(st)   (idempotente por tramo)
    res = {round,planId,plan,ok,delta:{agua,salud,material,confianza}(aplicado, ya en st.s),rolls:[{what:'plan'|'secret',role?,label,need,roll,ok}],reveals:[{type:'trap'|'secret_action'|'secret'|'lie'|'crisis',text,role?,how?,from?,detective?}],scoreDelta:{total,equipo,info,honestidad,riesgo},achievements:[{id,name,desc,role,trophy}] (nuevos),narrative,blame:{stat:role},picks:{role:{tag,text,ok}},votes,pointsByRole,msgs}
    Hud.showResolve(res); botsReact(st,'resolve',{result:res}) (acusaciones/defensas/Lía). Hud.achievement(a) por cada res.achievements.
 6 Story.setPhase(st,'summary') (mostrar res.scoreDelta + st.score). Si Story.isOver(st) -> fin; si no Story.advance(st) (round++) y vuelta a 1.
fin: const f = await Story.finish(st,{role:miRol}) -> {grade:'S|A|B|C|D',saved,objectives:[{role,ok,value,min,points,text}],mvp,achievements:[...todos, con role|null],verdict,stats,score,outro:{still,lines},points}
    Guarda en localStorage `rcv3_ach` ({id:timestamp}) los logros de equipo (role null) y los del rol `opts.role`. Story.achievementsList() -> [{id,name,desc,scope,trophy}] (17). Story.loadAchievements() -> mapa guardado. phase='final'.
```
Opcional: `Story.botsReact(st,'idle')` si el chat lleva >25 s en silencio; `Story.liaLine(st,'idle')`.
Triggers de `botsReact(st, trig, ctx)` -> msgs[]: brief, explore, share{from,opt,pol,cardId}, plan, vote{from,optId}, tally{winner,tie,tieBreak,unanimous}, secret, resolve{result}, chat{from,text}, water{level}, idle. `botChat(st,role,trig,ctx)` -> msg|null para un solo rol (también 'lia').

## Estado público (`st`)
Como SPEC: `{v:3,phase,round,tleft,difficulty,seed,demo,s,score,event:{id,title,text,art,radio,cat},pois:[{id,slot,label,icon,kind,used,by,seen:[roles]}],plan:{options:[{id:'A'|'B'|'C',n,title,text,known,req?}],votes,chosen},players:{role:{owner,name,ready,ap,connected,ai,style}},chat,log,achievements,achBy,hallazgos,verdict,saved}`. `poi.used` = agotado para todos; info/secreto los puede visitar cada rol una vez (`seen`), recurso solo el primero. Icons de POI son nombres de `ASSETS.icons`. Privado `Story.privOf(st,role)` = `{role,goal:{text,stat,min,points},secret:{text,revealed},intel:[{id,round,poi,title,text,reliability,shared}],secretOptions,secretPick,ap}`. `Story.publicState(st)` = clon JSON.
Dificultad `Story.difficulty(name)` -> `{name,label,briefing,explore,plan,secret,resolve,summary (s),rate,risk,rel,goal,start}`; `Story.waterRate(st)` = agua/seg en explore (sube si Iván oculta el caudal).

## Otros
`Story.parseClaim(st,text)`, `Story.dialogue(round,st)` y `Story.verdict(st)` (compat v2), `Story.intro` (7 strings) y `Story.introShots` ([{still,text,mood}]), `Story.outro(st)`, `Story.roleBrief(st,role)`, `Story.setKey/hasKey/setModel`. Con clave y `st.demo===false`: director, compañeros (botChat/botAct), Lía y árbitro usan Claude con JSON validado y caída a demo (tras 3 fallos seguidos pausa la IA 90 s). Las llamadas IA son async: main no debe bloquear la partida esperando a un bot.
Secretos: una acción secreta 'confess' (opción 0 en tramos 1-4 mientras no revelado) lo revela; si no, puede filtrarse con tarjetas de fuga (tramos 2 y 3) compartidas. Logros por rol (`role`) vs de equipo (`role:null`).
Balance (500 partidas, Normal): cooperativo ~75 %, egoísta ~28 %, aleatorio ~14 %; Everest: 38 / 7 / 2 %. Constantes en `PRESS`, `K`, `ASC`, `GR` (`Story._PRESS` etc. solo para tests).
