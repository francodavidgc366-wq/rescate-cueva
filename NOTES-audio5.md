# NOTES-audio5 - cambios v5 en src/audio.js ("el sonido aturde")

## Cadena master
buses -> mute -> compresor (thr -20, 3.5:1) -> limitador (thr -6, knee 0, 20:1, att 2 ms) -> lowpass 9 kHz -> tanh*0.8 (techo duro 0.64 = -3.9 dBFS) -> volumen maestro (def 0.4) -> salida.
Musica -8 dB (x0.398) y SFX -4 dB (x0.631) respecto a la v4, SFX ademas con lowpass 6 kHz. Envolventes: ataque minimo 6 ms en todas las voces (sin clics).
Como el techo duro va ANTES del volumen maestro (<=1), el pico nunca supera -3.9 dBFS a ningun volumen.

## API nueva
- `Sound.setVolume(v)` (0..1, devuelve v) / `Sound.getVolume()`. Persistido en `rcv3_audio.master` (try/catch). Default 0.4.
- `Sound.talk(role, mood)`: blip de 45 ms, sine/triangle con lowpass 1.8 kHz, vol 0.05, max 1 cada 60 ms; devuelve false si no hay audio/mute/throttle. Tono por rol: guia 200, medica 330, ing 150, lia 400, director 120 Hz; rol desconocido -> tono estable por hash del nombre. Mood: neutral, alegre/feliz (+18 %), tenso, miedo, triste, enfadado, serio; otro -> neutral.
- SFX nuevos: `gasp drown ability gate_open help dialogue_open` (`splash` ya existia; se mantiene). Total 53 nombres (`Sound.sfxNames`).
- `speak()`: volumen TTS = voice * (0.3 + 0.7*master) (0.58 en el default). `state()` incluye `master`.
- `Sound.render(kind, name, {master, burst:[[sfx,at],...]})`; kind `'talk'` (name = rol, `mood`) para tests.

## Verificacion: `NODE_PATH=<playwright-core> CHROME=<chrome> node tools/audio-v5-run.js` (OfflineAudioContext, 44.1 kHz, estereo)
Resultado: OK sin fallos (pico < -3 dBFS, 0 muestras >= 0.99, sin NaN, sin saltos > 0.5, sin ventanas de 0.5 s silenciosas en musica).
- Musica 16 s, 10 pistas (explore/plan a intensidad 0 y 1), master 0.4: pico -15.7..-23.3 dBFS, RMS -30..-38 dBFS. Master 1.0: pico -7.7..-15.3, RMS -22..-30.
- 53 SFX sueltos (master 1): pico max -5 dBFS (achievement, grade_s, secret_reveal), todos con energia.
- Rafagas: 12 SFX simultaneos, los 53 casi a la vez, y explore@1 + 10 SFX: master 1 pico -4.5..-4.9 dBFS, RMS -17..-20; master 0.4 pico -12.5..-12.9, RMS -25..-28. 0 clip.
- talk: pico max -41.7 dBFS (muy suave, por diseno), 24 combinaciones rol/mood con senal.
- setVolume persiste en localStorage y getVolume lo devuelve; `talk` antes del desbloqueo -> false.

## NO verificado
Nada se ha oido: el equilibrio, si la musica ahora queda demasiado baja (RMS -31..-38 dBFS con master 0.4; si falta cuerpo, subir el master por defecto a 0.5 o `musicIn` a 0.5), si los blips de talk resultan agradables/distinguibles, y el caracter de los 6 SFX nuevos. El volumen del TTS (speechSynthesis no pasa por WebAudio) no se pudo medir ni probar (sin voces es en headless). `talk`/`setVolume` en tiempo real solo probados offline y por API; no el UI ni el typewriter. Limitador sin lookahead: un transitorio rapido lo coge el tanh final (tope duro), no el compresor.
