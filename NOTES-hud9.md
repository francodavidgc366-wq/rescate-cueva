# NOTES-hud9 (agente UI v9) - src/hud.js / src/ui.js
- Minimapa restaurado: visible por defecto desde la zona 1 (`miniUser=true`), canvas 240x110 abajo-izquierda, marco pixel 3px y rótulo «MAPA» dibujado en el canvas. Si la fuente (`Hud.setMinimapSource` o `RC.eng().drawMinimap(ctx,w,h)`) devuelve false se oculta. Botón «M» en el dock = mostrar/ocultar el minimapa pequeño.
- Mapa grande: tecla M o clic en el minimapa abre un overlay centrado (`.h-big`, ancho min(640, 60% del HUD), alto = ancho*300/640, canvas 1:1 sin escalar) que llama a la misma fuente con ese tamaño y se repinta con el minimapa. Cierra con M, Esc o ✕. No pausa ni captura teclas de movimiento (WASD/flechas pasan al juego; interpretación mía).
- Español neutro: tuteo/«ustedes», pretérito simple (Votaste, Encontraste, Compartiste, Todos votaron), Pulsa→Presiona, Salvaron, «Les cuento lo que vi», «¿Qué encontraron?», Apúrense, etc. en hud.js y ui.js. Solo texto visible.
- Pantalla final (ui.js): cabecera con foto de Lía (fila feliz/`vivo`, `herido` fila triste, `muerto` -> `face_lia_dead`) a 144px y titular grande: `state.final.ending.title/sub/saved` si existe; si no «LÍA ESTÁ A SALVO» / «NO LLEGAMOS A TIEMPO». Debajo los 4 destinos.
- Nota: story.js (otro agente) aún tiene «Os/vosotros/habéis» en sus cadenas; no es mío.
## No verificado
Nada probado en navegador (solo `node --check`); dibujo real del minimapa y mapa grande con el motor, clic en el canvas, final con ending real, resto de cadenas de ui.js sin acentos (no tocadas).
