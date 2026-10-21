# NOTES-hud8 (agente UI v8) - src/hud.js / src/ui.js
## Quitado
Todo el bloque «Blasphemous» de v7 (hud.js y ui.js: fondos rojizos, filigrana SVG, Cinzel, títulos en mayúsculas espaciadas). Vuelve el look v6 (azul marino/morado, borde naranja, esquinas pixel). Se conservan: sin flashes (borde fino), una sola acción, 4 destinos, floatCard (`.h-fcard`, reestilada v6), plan.brief, nombres Mateo/Elena/Samuel.

## Diálogos estilo Celeste
- `Hud.dialogue`: caja ancha y baja, fondo `rgba(10,7,26,.9)` con borde fino claro, retrato cuadrado SIEMPRE a la izquierda (marco 3px + fondo del color del personaje), texto grande blanco, nombre en color del personaje, ▼ parpadeando a la derecha. Nombres de personajes (Mateo/Elena/Samuel/Lía) y `*palabras*` salen resaltados (los asteriscos no se muestran; `hlParts`/`hlHtml`).
- `Hud.say`: misma estética compacta (retrato ×1/×2, nombre, 2 líneas). Chat: avatares `portrait()` usan `face_<id>` fila = mood del mensaje (sin animación).
- Escala del retrato entera, 2..4 (`dlgScale`), `image-rendering:pixelated`.

## Animación (`faceCtl` en hud.js)
Hoja `face_<id>` 48x48, 4 col x 6 filas. Mood->fila: neutral/talk 0, happy 1, worried/alert 2, angry 3, surprised 4, hurt/sad 5. Al hablar alterna col 1<->2 a 8 fps (boca cerrada col 0 en espacios y puntuación = pausas del typewriter), cabeceo `translateY(1 px de sprite)` a 6 Hz (CSS `dl-bob`), pop al cambiar de línea/personaje, parpadeo (col 3) cada 2-4 s al azar en reposo. Cambia de fila al cambiar el mood de la línea. Sin `face_<id>` cae al `portrait_<id>` como antes (alterna `_talk`/neutral). Respeta `prefers-reduced-motion` (sin bob/pop).

## Final (ui.js)
`fateFace`: `face_<id>` fila 1 (vivo) / 5 (herido); muerto `face_<id>_dead` fila 0 col 0. Lienzo 48x48 mostrado a 144px (×3; 96px en <=640px). `portrait()` de ui.js (menús/lobby) también prefiere `face_<id>`.

## No verificado
Con los `face_*` REALES (probado con hojas falsas de /tmp; el layout de `face_<id>_dead` se asume igual 4x6, se usa fila 0 col 0); móvil; red; menús/lobby/ajustes de ui.js uno a uno; la integración en main.js; chat con avatar expresivo y plan/secreto/cuaderno tras quitar v7 solo se vieron de pasada.
