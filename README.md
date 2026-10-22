# Rescate en la Cueva

Simulación estratégica de equipo en pixel art (inspirada en las dinámicas de Everest V3 de Harvard: roles, información asimétrica, chat y decisiones bajo presión). Tres rescatadores —Nico (guía), Ona (médica) e Iván (ingeniero)— deben sacar a Lía de una cueva que se inunda en 5 tramos. Cada rol tiene información privada, un objetivo individual secreto y un secreto. Hasta 3 jugadores por enlace; los huecos los llevan compañeros IA que hablan, negocian y pueden mentir.

**Jugar:** https://francodavidgc366-wq.github.io/roleplay-ia-agentica/ — o abre `index.html` (un único archivo autocontenido).

## Cómo se juega (cada tramo)
1. **Briefing:** evento ilustrado y radio de Lía.
2. **Exploración (tiempo real):** muévete (WASD/flechas, Espacio salta) y pulsa **E** junto a un punto de interés. Tienes 3 acciones; cada hallazgo es información privada de tu cuaderno (J). El agua sube.
3. **Chat (T / Enter):** habla, **comparte** lo que sabes o **compártelo con cambios** (mentir). Cualquiera puede acusar.
4. **Plan:** votad entre 3 opciones (1-2-3). Cada una esconde una trampa o ventaja que alguien puede saber.
5. **Acción secreta:** eliges en privado; se revela al final (confesar, ayudar al equipo, tu objetivo o arriesgar).
6. **Resolución:** tiradas, secretos y mentiras al descubierto, puntos y logros. Nota final de S a D, 17 logros y 5 hallazgos. Dificultades Fácil / Normal / Everest.

## IA y prompts
- **Con IA:** en Ajustes pega tu clave de Anthropic (solo se guarda en tu navegador, nunca en el repo). La IA actúa como director de partida, compañeros (deciden qué ven, comparten, ocultan o falsean, y chatean), Lía por radio y árbitro final.
- **Modo demo (sin red ni clave):** contenido pregrabado y compañeros reactivos; también es el plan B si falla la IA.
- Prompts v4 versionados y salida validada: `docs/prompts.md`.

## Instalación y configuración
- **Jugar sin instalar:** abre la URL de arriba o el archivo `index.html` (autocontenido, sin dependencias).
- **Desarrollo:** `./build.sh` regenera `index.html` a partir de `src/` y `vendor/` (necesita Python 3). Pruebas de balance: `node tools/story-test.js` (Node 18+). Las pruebas de interfaz de `tools/` usan Playwright.
- **Configuración:** ver `.env.example`. No hay variables obligatorias; la clave de IA es opcional y se introduce en el juego (Ajustes), no en archivos. El repositorio no contiene claves.

## Multijugador
"Crear sala" y comparte el enlace (`#sala=CODIGO`). WebRTC con PeerJS; el anfitrión es la autoridad y cada jugador solo recibe su propia información privada. Sin servidor TURN algunas redes (4G/CGNAT) pueden no conectar (ver `NOTES-net3.md`).

## Estructura
`src/` módulos (`story` lógica+IA · `engine` mundo en tiempo real · `net` multijugador · `audio` música y efectos procedurales · `ui` menú/tutorial/cinemática/final · `hud` HUD, chat y paneles · `main` orquestador) · `build.sh` genera `index.html` · `tools/` pruebas y generadores de arte · `SPEC-v3.md` diseño técnico · `docs/` prompts y prototipo v1.
Reconstruir: `./build.sh`. Balance: `node tools/story-test.js`.

## Créditos y uso de IA
Código, arte pixel (generado por código, sin packs externos), música y efectos (WebAudio procedural) creados con ayuda de Claude (Anthropic) y revisados/probados por el equipo. PeerJS (MIT). Fuente Press Start 2P (OFL, Google Fonts).
