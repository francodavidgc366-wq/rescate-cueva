# NOTES-story7 (STORY v7). Test: `node tools/story-test.js [N]`. Aditivo sobre NOTES-story6.md.

## Cambios
1. **4 personajes**: `Story.SURVIVORS` = solo Lía. Eliminados Sara/Marta/Leo/Hugo (POIs, `out.survivor`, líneas de `Story.scene`, `scene(st,'survivor')`). Los POIs/puertas conservan estructura. `st.final = {fates (4: lia, guia, medica, ing), saved_count (0..4), total_count: 4, ...}`; fate `{id,name,portrait:'portrait_<id>',status,why}`. `why` enlaza causa->efecto (puertas del rol sin abrir, tramos torcidos, agua, secreto confesado). Rescatista: muerto si agua 100; herido si ganáis con agua>=85 o (perdéis con >=2 puertas suyas sin abrir).
2. **Nombres**: guía Mateo, médica Elena, ingeniero Samuel (roles internos `guia|medica|ing`). `parseRequest/answerChat` reconocen mateo/elena/samuel y alias antiguos nico/ona/ivan. `Story.NAMES` = {guia:'Mateo',medica:'Elena',ing:'Samuel',lia:'Lía'}.
3. **Balance** (ver tabla). DIF facil: `rate .88` (agua más lenta), `loss .6` (pérdidas por fallo/trampa), `radd .09`, start algo más holgado; normal `risk 1.15, radd .08`. Red de seguridad (`dif.grace`, solo Fácil/Normal): si un tramo (zonas 1-4) dejaría agua>=100 o salud<=0 y el tramo anterior NO fue «malo» (`hd.bad[r-1]`), se queda en agua 92 / salud 12 (reveal `{type:'rescue'}`); derrota = 2 tramos malos seguidos o fallo en zona 5. Tramo malo = agua>=88, salud<=20 o trampa fallida. `tickWater` no pasa de 99 antes de zona 5 con grace. Respiro (`dif.respiro` {agua,salud}: facil 50/55, normal 70/40): tras un tramo con agua>= o salud<=, `hd.respiroNext = r+1`; en `roundStart` la opción de menor riesgo base lleva `option.respiro:true` (gain «Respiro: ...», `st.event.respiro = id`), efecto [-8,7,0,3] y -0.10 riesgo si se vota; si no se vota igual hay alivio [-4,4,0,1]; el director lo avisa con un mensaje (también en el `msgs` devuelto por roundStart). No revela trampa/gema.
4. **Entender el porqué**:
 - `intel.uses` (+ `intel.use:'votacion'|'equipo'`): «Sirve para decidir en la votación: apunta a que «X» (opción B) es la más segura; si otro compañero coincide, vótala.» También en recurso y hallazgo.
 - `poiInteract(...).explain` (+ `.use`): «Has encontrado «T» → te dice que «X» (B) parece peligrosa → úsalo en: la votación, y cuéntaselo al equipo para contrastarlo.» Recurso/hallazgo igual. `openGate(...)` también devuelve `explain`/`use:'puerta'`.
 - `Story.mission(st,role).now.why` en explore: «Si encuentras esto, tendrás una pista privada para la votación: …» / «Si la abres, llegaréis a «P» …» / «Si lo cuentas, el equipo sabrá …».
 - `Story.planBrief(st)` -> `{text, lines[1..3], best:'A'|'B'|'C'|null, known[], unknown[]}`: «Hay 3 caminos… Lo que sabéis: … ; lo que no: … Vuestra pista más fiable apunta a B». Usa solo `hd.shares` de la ronda (afirmaciones públicas, incluidas mentiras no descubiertas; no la verdad oculta). `setPhase(st,'plan')` lo publica una vez por ronda como mensaje del director (`hd.briefed`).

## Balance (N=300, bots demo; coop=sigue pistas, random=descuidado)
| dif | coop | ego | random | persona |
|---|---|---|---|---|
| Fácil | 92.0 | 59.7 | 42.3 | 76.3 |
| Normal | 74.3 | 27.0 | 17.0 | 47.0 |
| Everest | 37.0 | 3.0 | 2.7 | 14.0 |
Rangos del test: facil coop .84-.95 / random .36-.55; normal coop .64-.78, ego .18-.32; everest coop .28-.42, ego <.09.
