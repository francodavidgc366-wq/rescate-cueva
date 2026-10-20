# Rescate en la Cueva

Role play cooperativo de 3 jugadores (un solo dispositivo) en pixel art. 5 rondas, información privada por rol y objetivos individuales. La IA hace de director de partida y de árbitro final.

## Jugar
Abre `index.html` en el navegador. No hay que instalar nada.
- **Modo demo:** sin red ni clave (plan B para la defensa).
- **Con IA:** pega tu clave de Anthropic en la pantalla inicial. Solo se guarda en tu navegador (`localStorage`); nunca va en el repo.

## IA y prompts
Prompts versionados en `PROMPTS` (`v1`): sistema, reglas, formato, estado, historial y roles. La salida JSON se valida (`validRound`), los efectos se limitan a ±25 y, si falla dos veces, esa ronda cae al modo demo.

## Hecho con IA
El código lo ha generado Claude y se ha revisado y probado jugando una partida completa en modo demo.
