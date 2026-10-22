# hud17b
- hud.js: barra de camino (5 estaciones + cara de Lia + '¡Faltan N tramos para Lia!') sustituye ZONA 1/5 en .h-top. Tablas ZN (zonas/colores) y RT (rutas: nombre+emoji) en hud.js; `Hud.routeInfo(kind)`.
- `Hud.showTravel({from,to,kind})` / `Hud.hideTravel()`: tarjeta 'Elegiste: EL POZO' + barra con ficha que avanza (main.js la llama en advance()/summary y la quita en fin()).
- showSummary: bloque 'TU DECISION SECRETA' (data.secret) con icono por verbo, chips de stat con ▲/▼ y sello.
- Mapa grande: borde/titulo con color de la zona, fila de zonas 1-5 y fila 'TU CAMINO' (usa P.path = st.path, sin setPath). Minimapa rotulado con nombre de zona coloreado.
- ui.js: `pathRow(path)` -> 'TU CAMINO' + 'DECISION FINAL' en showFinal (state.path) y playEnding (o.path, main.js lo pasa).
- Los iconos de ruta/zona son emoji (en el headless sin fuente de emoji salen como cuadros).
- Update: sin emoji. Zonas/rutas/verbos usan `jIcon` (hojas icons/poi_icons): rutas balsa=agua, pozo=pozo, galeria=linterna, cuerda=cuerda, puente=huellas, tunel=tuberia, compuerta=puerta; zonas mapa/material/cristal/agua/estrella; verbos salud/material/alerta. Ficha del viaje = cara de Mateo (portrait guia). ✓ y ▲▼ son SVG de pixeles (CHK, arrow()). `Hud.routeInfo(k).icon` devuelve HTML de icono. (El texto 'Las ruta ›' usa el glifo ASCII-ish ›.)
