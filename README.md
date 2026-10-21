# Rescate en la Cueva

Role play cooperativo en pixel art, en tiempo real, para hasta 3 jugadores por enlace. Una espeleóloga (Lía) está atrapada en una cueva que se inunda. Tres rescatadores —Nico (guía), Ona (médica) e Iván (ingeniero)— con información privada y objetivos propios tienen 5 rondas para sacarla.

**Jugar:** https://francodavidgc366-wq.github.io/roleplay-ia-agentica/ — o abre `index.html` (un único archivo autocontenido).

## Cómo se juega
- Mover: flechas/WASD · Saltar: Espacio · Interactuar: F (mantener para curar) · Cambiar de personaje: Tab/Q/E o clic en el retrato.
- Los 3 personajes son controlables y cada uno tiene habilidad propia: el guía escala paredes, la médica cura y disuelve la barrera, el ingeniero construye puentes. Los que no controlas te siguen.
- Cada ronda llegas a una consola de radio y cada personaje decide con su información privada. Las decisiones cambian el agua, la salud de Lía, el material y la confianza, y condicionan las rondas siguientes.
- **Multijugador:** "Crear sala" y comparte el enlace (`#sala=CODIGO`). Hasta 3 jugadores (WebRTC con PeerJS; el anfitrión es la autoridad). Los huecos libres los lleva la IA. Sin servidor TURN, algunas redes (4G/CGNAT) pueden no conectar.

## IA y prompts
- **Con IA:** en Ajustes pega tu clave de Anthropic. Solo se guarda en tu navegador (`localStorage`); nunca va en el repo. La IA actúa como director de partida (genera escena, pistas privadas y opciones), NPC (Lía por radio) y árbitro final.
- **Modo demo (sin red ni clave):** 5 rondas pregrabadas con ramificación según estado y decisiones previas. Es también el plan B si falla la IA o la red.
- Prompts versionados (v2) y validación estricta del JSON de salida: ver `docs/prompts.md`.

## Estructura
`src/` módulos (`story.js` lógica+IA, `engine.js` motor, `net.js` multijugador, `ui.js` interfaz/cinemáticas/audio, `main.js` máquina de estados) · `build.sh` genera `index.html` · `tools/` pruebas y generadores de assets · `docs/` prompts y prototipo v1 · `SPEC.md` diseño técnico.
Reconstruir: `./build.sh`. Pruebas de lógica: `node tools/story-test.js`.

## Créditos y uso de IA
Código, arte pixel (generado por código, sin packs externos) y música (WebAudio) creados con ayuda de Claude (Anthropic) y revisados/probados por el equipo. PeerJS (MIT). Fuente Press Start 2P (OFL, Google Fonts).
