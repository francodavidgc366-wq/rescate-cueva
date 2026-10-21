# NOTES-audio - src/audio.js -> `window.Sound` (sin cambios de nombres respecto al SPEC-v3)

## API
`Sound.unlock()` (Promise<bool running>), `sfx(name,{vol,pitch})` -> bool, `music(track|null)`, `setIntensity(0..1)`, `mute(b)` / `toggle()` (devuelven muted), `setVol('music'|'sfx'|'voice',0..1)`, `speak(text,{who:'guia|medica|ing|lia|director',rate,pitch})` -> bool, `stopSpeak()`,
`state()` -> `{running,ctxState,muted,music,want,intensity,vols,speaking,voice}`. Extras: `Sound.tracks`, `Sound.sfxNames`, `Sound.level()` (RMS de la salida real, util para un VU), `Sound.render(kind,name,opts)` (OfflineAudioContext, tests).
Persistencia `rcv3_audio` = `{muted,vols}` (try/catch). Defaults: music .6, sfx .8, voice 1; master NUNCA parte en 0.
Pistas: menu tutorial briefing explore plan secret resolve summary win lose (las 47 SFX del SPEC, comprobado por script). `explore` y `plan` son adaptativas (`setIntensity`): pad siempre; bajo >0.08; arpegio >0.22 (16avos >0.7); percusion+sidechain >0.4; capa de tension (cluster disonante con tremolo + latido) >0.62. El resto de pistas usan una intensidad fija propia. `music()` hace crossfade (~2 s) y es idempotente; si el contexto aun esta suspendido guarda la pista y arranca al desbloquear.

## Integracion
- No hace falta llamar a `unlock()` a mano: el modulo ya escucha pointerdown/up, mousedown/up, click, touch, keydown/up desde la carga y se reanuda solo (se desengancha al estar `running`). `Sound.sfx` antes del gesto devuelve false (no hay cola).
- Al llamar `speak()` la musica baja a 30 % mientras dura la voz (ducking); si el navegador no tiene voz es-* o no dispara `onstart`, el ducking se anula solo (fallback silencioso). Elige la mejor voz es (es-ES > otras es; prefiere Natural/Neural/Online/Google/Microsoft; evita compact/espeak).
- `UI` debe borrar su `Aud` v2 y llamar a `Sound.*`. Claves viejas `rcv2_mute/rcv2_vol` quedan ignoradas.

## Por que la v2 no sonaba (diagnostico por lectura de src/ui.js, no reproducido en navegador)
1. El unico desbloqueo global era `pointerdown` (capture). En Chrome un pointerdown de raton no es un gesto de activacion que permita `resume()`; solo click/pointerup/keydown/touchend. Con teclado o si el primer gesto era otro evento, el contexto seguia `suspended`.
2. `sfx()` hacia `return` silencioso si `ac.state!=='running'` y el scheduler (`tick`) tambien, asi que todo se perdia sin error ni cola.
3. `setTrack()` antes del desbloqueo solo llamaba a `resume()` (sin gesto, rechazado) y `want` dependia de que `unlock().then` se ejecutara; `muted` persistido en `rcv2_mute` tambien silencia todo. Los volumenes eran bajos (arp .04, pad .05, master .7, compresor sin makeup): aun sonando, era muy flojo.
v3: hook multi-evento desde la carga, reanudacion en `statechange`/`visibilitychange`/`interrupted`, pista pendiente (`want`), master 0.9 con saturador tanh final (jamas supera 0.9) y niveles medidos (RMS musica -18..-25 dBFS).

## Verificacion (tools/audio-test.html + tools/audio-run.js)
Ejecutar: `NODE_PATH=<dir con playwright-core> CHROME=<chrome> node tools/audio-run.js [dirWav]` (lanza su propio Chromium; el test tambien abre a mano en el navegador: boton "Render offline").
- (a) OfflineAudioContext, 10 pistas (20 s) + 47 SFX: RMS, pico, clipping (0), DC, bandas, planitud espectral (musica 0.0005-0.003 vs ruido blanco 0.56), croma (85-96 % de la energia en la escala de cada pista), periodicidad ritmica (autocorrelacion en el compas >> control no multiplo), explore/plan suben ~6-8 dB de intensidad 0 a 1. 0 fallos.
- (b) Chromium con politica `document-user-activation-required`: se fuerza `suspended`, un click real (que NO llama a unlock) lo reanuda via hook y arranca `explore`; `Sound.level()` ~0.2 con musica+sfx y ~1e-5 con mute.
- (c) WAV volcados en `audio-out/` (o el dir pasado) y analizados aparte con numpy: tonales (planitud ~0.001), pulso estable (pico de autocorrelacion de onsets a 2 o 4 beats exactos), notas dominantes dentro de la escala, espectrograma con energia en todas las bandas hasta 8 kHz.
NO verificado: no puedo oirlo; el balance/gusto musical es de oido. La mezcla es oscura (centroide ~200-500 Hz): si en altavoces de portatil falta brillo, subir `LAYERS.arp/mel` o `pad lp`. La voz speechSynthesis no se pudo probar (el Chromium headless no trae voces es; `speak` devuelve true y no falla).
