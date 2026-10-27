# TRUCO: LA REVANCHA 🃏🇦🇷

Truco argentino para PC y celulares: reglamento completo, bots que piensan, personajes con voz y gestos, señas entre compañeros, modo historia por la Argentina, torneos, tutorial interactivo y partidas online reales con amigos.

```bash
npm install
npm run dev        # juego en http://localhost:5173
npm run server     # servidor multijugador en http://localhost:3001 (opcional)
npm test           # pruebas del reglamento, bots, señas, voz y servidor
npm run build      # versión de producción en dist/
```

Para jugar online con amigos en una misma red o en un servidor propio:

```bash
npm run build
npm run server     # sirve el juego y el multijugador en el mismo puerto
# abrir http://IP-DEL-SERVIDOR:3001 en cada dispositivo
```

Variables del servidor: `PORT` (3001), `DATA_FILE` (`server/data/datos.json`), `CORS_ORIGIN`.
Si el cliente se publica aparte, `VITE_SERVER_URL` indica dónde está el servidor.

## Qué trae

### Reglamento (motor independiente, `src/engine`)
- Baraja española de 40 cartas y la jerarquía oficial completa (ancho de espada, ancho de basto, sietes bravos, tres, dos, anchos falsos, figuras, sietes falsos, 6, 5, 4).
- Bazas, pardas (todas las combinaciones) y quién es mano; partidas a 15 y a 30 con malas y buenas.
- Truco, retruco y vale cuatro con el "quiero" (solo sube quien lo tiene) y los puntos correctos, querido o no querido.
- Envido, envido-envido, real envido, falta envido y sus combinaciones; "el envido está primero"; declaración de tantos desde la mano y "son buenas".
- Flor opcional (desactivada por defecto): obligatoria, anula el envido, contraflor, contraflor al resto y "con flor me achico".
- Irse al mazo, abandono y fin de partida automático.
- Todas las acciones se validan contra la lista de acciones legales: no se puede jugar fuera de turno, repetir cartas, cantar algo ilegal ni responder dos veces.

### Bots (`src/ai`)
- Solo reciben la vista del jugador (`PlayerView`): nunca ven cartas ocultas. Hay una prueba automática que lo verifica.
- Estiman probabilidades generando repartos coherentes con lo visto (cartas jugadas, tantos declarados, flor obligatoria, cantos, señas que vieron) y resuelven cada reparto con minimax.
- Tres dificultades y cinco personalidades (agresivo, conservador, mentiroso, equilibrado, experto). Los difíciles recuerdan tus faroles y cuánto te achicás, y ajustan el riesgo según el marcador.

### Señas
- En 2 contra 2 y 3 contra 3 le podés hacer señas a tu compañero (cejas = ancho de espada, guiño = ancho de basto, boca torcida = sietes, labio = tres, beso = dos, bostezo = ancho falso, ojos cerrados = nada, cachetes = flor, lengua = buen envido).
- Tu compañero siempre las ve; cada rival tiene una chance de pescarlas (y te avisa). Podés mentir.
- Los bots también se hacen señas: vos podés pescar las de los rivales y las de tu compañero te aparecen al lado de su avatar.

### Voz y micrófono
- Los personajes dicen los cantos, las respuestas, todos los tantos ("veintisiete", "treinta y tres son mejores", "son buenas") y frases según la situación, con la mejor voz en español del dispositivo (prioriza voces argentinas; se elige en Configuración).
- **Jugar con el micrófono** (Chrome, Edge, Safari): "truco", "quiero retruco", "no quiero", "envido", "real envido", "me voy al mazo", "tiro el ancho de espada", "la más alta"… Botón de micrófono o tecla **V**.
- **Lenguaje fuerte (+18)** opcional y apagado por defecto: los personajes a veces putean al perder o ganar.
- Listo para grabaciones profesionales: ver `public/voices/LEEME.md`.

### Modos
- **Jugar ahora** (1 contra 1) y **partida personalizada** (1v1, 2v2, 3v3, a 15 o 30, con o sin flor, dificultad y rivales).
- **Modo historia**: diez etapas desde un bar de Villa Crespo hasta la final contra El Campeón, con escenas y premios.
- **Torneos** de 8 o 16 jugadores por eliminación directa; los cruces entre bots se juegan de verdad con el motor.
- **Tutorial interactivo** de diez lecciones con práctica en la mesa.
- **Multijugador online**: partida rápida con matchmaking, mesas privadas con código (`TRUCO-1234`) y enlace de invitación, mesas públicas, espectadores, temporizador por turno, reconexión, bots que completan o reemplazan a quien se va, chat moderado (mensajes rápidos, emoticones, texto, chat de equipo), silenciar y denunciar, y ranking global, semanal y mensual calculado por el servidor.

### Progresión y personalización
- Perfil local con nivel, experiencia, rangos (de Aprendiz a Campeón Nacional), insignias, historial, rachas y estadísticas contra cada personaje.
- Monedas virtuales (solo cosméticas, sin dinero real) para mesas, paños, reversos, barajas, marcos, festejos, mensajes y personajes.

### Presentación
- Cartas, figuras, reversos, personajes, insignias y escenarios dibujados en SVG propio; espadas y bastos entrecruzados como en la baraja española tradicional. Sin imágenes externas.
- Reparto animado, cartas con resortes, arrastrar o tocar para jugar, abanico, cámara que reacciona a los cantos, partículas y festejos.
- Música de milonga generada en tiempo real, efectos y ambiente de bar sintetizados, con volúmenes separados.
- Pantallas adaptadas a celular (vertical y horizontal) y PC; instalable como aplicación (PWA) y jugable sin conexión contra la computadora; baja los efectos sola en equipos lentos.

## Baraja real escaneada

El juego no incluye imágenes de barajas de terceros. Si tenés una baraja española que puedas distribuir (por ejemplo, la clásica de dominio público), copiala en `public/cartas/` siguiendo `public/cartas/LEEME.md` y aparece la opción en Configuración.

## Arquitectura

```
src/engine     reglas puras: cartas, estado, acciones legales, vistas por jugador
src/ai         bots: análisis probabilístico, memoria del rival, personalidades
src/game       personajes, frases, señas, historia, torneos, progresión, cosméticos, drivers
src/audio      motor de audio, efectos, música, ambiente, voces y comandos de voz
src/store      estado de la interfaz (Zustand): partida, perfil, ajustes, navegación
src/net        protocolo y cliente multijugador
src/ui         pantallas, mesa, cartas y arte SVG
server         servidor Socket.IO autoritativo, moderación y persistencia
tests          pruebas automáticas (Vitest)
```

## Limitaciones conocidas

- Las voces dependen de las voces en español que tenga instaladas el dispositivo (en Windows, Edge trae voces argentinas naturales; en Mac/iPhone, "Diego"). No se incluyen grabaciones profesionales.
- Las cuentas online son de invitado (un token guardado en el navegador); no hay registro con contraseña.
- El servidor guarda ranking y denuncias en un archivo JSON; para mucha gente conviene reemplazarlo por una base de datos con la misma interfaz (`server/store.ts`).
- La variante pica-pica para seis jugadores todavía no está implementada.
- Los torneos son contra la computadora; los torneos online no están implementados.
