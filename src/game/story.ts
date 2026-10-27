import type { Difficulty } from '../ai/profiles';

export interface DialogueLine {
  /** 'yo' es el jugador, 'narrador' una voz en off, o el id de un personaje. */
  speaker: string;
  text: string;
}

export interface StoryStage {
  id: number;
  title: string;
  place: string;
  region: string;
  tableId: string;
  clothId: string;
  rivals: string[];
  partners: string[];
  numPlayers: 2 | 4;
  target: 15 | 30;
  difficulty: Difficulty;
  flor: boolean;
  intro: DialogueLine[];
  win: DialogueLine[];
  lose: DialogueLine[];
  reward: number;
  /** Posición en el mapa de la Argentina (coordenadas del SVG 60 x 100). */
  map: { x: number; y: number };
}

export const STORY: StoryStage[] = [
  {
    id: 1,
    title: 'El bar de la esquina',
    place: 'Bar El Truco',
    region: 'Villa Crespo, Buenos Aires',
    tableId: 'bodegon',
    clothId: 'verde',
    rivals: ['rulo'],
    partners: [],
    numPlayers: 2,
    target: 15,
    difficulty: 'facil',
    flor: false,
    intro: [
      { speaker: 'narrador', text: 'Todo truquero empieza en algún lado. El tuyo es un bar de esquina con olor a café y madera vieja.' },
      { speaker: 'rulo', text: '¡Bienvenido! Acá jugamos todas las tardes. ¿Sabés jugar o te tengo que enseñar?' },
      { speaker: 'yo', text: 'Algo sé. Dicen que el que no canta, no gana.' },
      { speaker: 'rulo', text: 'Jaja, ¡eso dicen! A quince, tranquilo. Si me ganás, te presento a la gente del club.' },
    ],
    win: [{ speaker: 'rulo', text: '¡Mirá vos! Tenés mano. El Profe del club te va a querer conocer.' }],
    lose: [{ speaker: 'rulo', text: 'Tranqui, a todos nos pasó. ¿Otra?' }],
    reward: 80,
    map: { x: 40.6, y: 37.3 },
  },
  {
    id: 2,
    title: 'El club del barrio',
    place: 'Club Social y Deportivo',
    region: 'Avellaneda, Buenos Aires',
    tableId: 'club',
    clothId: 'azul',
    rivals: ['profe'],
    partners: [],
    numPlayers: 2,
    target: 15,
    difficulty: 'facil',
    flor: false,
    intro: [
      { speaker: 'narrador', text: 'Banderines, trofeos de bochas y una mesa que vio pasar generaciones.' },
      { speaker: 'profe', text: 'Así que vos sos el que le ganó al Rulo. Yo anoto todo, ¿eh? Cada carta que sale.' },
      { speaker: 'yo', text: 'Anotá esta: hoy gano yo.' },
    ],
    win: [{ speaker: 'profe', text: 'Estadísticamente improbable... Andá a la parrilla del Flaco, ahí se juega fuerte.' }],
    lose: [{ speaker: 'profe', text: 'Los números no mienten. Volvé cuando hayas practicado.' }],
    reward: 100,
    map: { x: 41.8, y: 38.2 },
  },
  {
    id: 3,
    title: 'La parrilla de los domingos',
    place: 'Parrilla La Tranquera',
    region: 'Ituzaingó, Buenos Aires',
    tableId: 'parrilla',
    clothId: 'rojo',
    rivals: ['flaco'],
    partners: [],
    numPlayers: 2,
    target: 15,
    difficulty: 'normal',
    flor: false,
    intro: [
      { speaker: 'narrador', text: 'Domingo al mediodía. Humo, chorizos y un parrillero que canta truco con la pinza en la mano.' },
      { speaker: 'flaco', text: '¿Jugamos mientras se hace el asado? Te aviso que yo canto todo.' },
      { speaker: 'yo', text: 'Entonces vas a tener que querer todo también.' },
    ],
    win: [{ speaker: 'flaco', text: '¡Ganador come primero! Che, en San Telmo hay una señora que juega con flor...' }],
    lose: [{ speaker: 'flaco', text: '¡Te pasé por arriba! Comete un choripán y volvé.' }],
    reward: 130,
    map: { x: 39.3, y: 36.8 },
  },
  {
    id: 4,
    title: 'Un café en San Telmo',
    place: 'Café Notable',
    region: 'San Telmo, Buenos Aires',
    tableId: 'cafe',
    clothId: 'verde',
    rivals: ['rosa'],
    partners: [],
    numPlayers: 2,
    target: 15,
    difficulty: 'normal',
    flor: true,
    intro: [
      { speaker: 'narrador', text: 'Mármol, espejos y un tango sonando bajito. En este café se juega con flor.' },
      { speaker: 'rosa', text: 'Pasá, que el cortado va por la casa. Acá la flor se canta, ¿eh? Tres del mismo palo y la cantás sí o sí.' },
      { speaker: 'yo', text: 'Con flor o sin flor, vengo a ganar.' },
      { speaker: 'rosa', text: 'Eso dicen todos, corazón.' },
    ],
    win: [{ speaker: 'rosa', text: 'Me ganaste en mi propio café... En Córdoba hay uno que te va a hacer reír y llorar.' }],
    lose: [{ speaker: 'rosa', text: 'La casa siempre gana. Volvé cuando quieras.' }],
    reward: 160,
    map: { x: 41.4, y: 36.2 },
  },
  {
    id: 5,
    title: 'Fernet en Córdoba',
    place: 'Bar La Docta',
    region: 'Barrio Alberdi, Córdoba',
    tableId: 'bodegon',
    clothId: 'celeste',
    rivals: ['cordobes'],
    partners: [],
    numPlayers: 2,
    target: 15,
    difficulty: 'normal',
    flor: false,
    intro: [
      { speaker: 'narrador', text: 'Setecientos kilómetros después: cuarteto de fondo y fernet con coca en todas las mesas.' },
      { speaker: 'cordobes', text: '¿Qué hacé\', loco? ¿Vo\' sos el porteño que viene ganando? Sentate, que acá se juega con tonada.' },
      { speaker: 'yo', text: 'Vengo de lejos para esto.' },
      { speaker: 'cordobes', text: '¡Mirá vo\'! Dale, que traje el fernet.' },
    ],
    win: [{ speaker: 'cordobes', text: '¡Qué lo parió! Bien jugado, hermano. Andá a Mendoza, preguntá por Lucía.' }],
    lose: [{ speaker: 'cordobes', text: '¡Hasta acá llegaste, hermanooo! Pero volvé, que te invito otro fernet.' }],
    reward: 190,
    map: { x: 25.5, y: 28.2 },
  },
  {
    id: 6,
    title: 'El patio mendocino',
    place: 'Casa de los abuelos de Lucía',
    region: 'Maipú, Mendoza',
    tableId: 'patio',
    clothId: 'verde',
    rivals: ['lucia'],
    partners: [],
    numPlayers: 2,
    target: 15,
    difficulty: 'normal',
    flor: false,
    intro: [
      { speaker: 'narrador', text: 'Noche estrellada bajo el parral. Al fondo, la cordillera.' },
      { speaker: 'lucia', text: '¿Vos sos el que viene ganando? Acá en Mendoza se juega con vino y sin miedo.' },
      { speaker: 'yo', text: 'Entonces vamos a llevarnos bien.' },
    ],
    win: [{ speaker: 'lucia', text: 'Bien jugado. Te ganaste un Malbec... y una invitación a la pulpería de Don Ramón.' }],
    lose: [{ speaker: 'lucia', text: '¡Volvete a Buenos Aires! Pero practicá, que te espero.' }],
    reward: 220,
    map: { x: 13.5, y: 32.5 },
  },
  {
    id: 7,
    title: 'La pulpería',
    place: 'Pulpería La Blanqueada',
    region: 'San Antonio de Areco',
    tableId: 'campo',
    clothId: 'verde',
    rivals: ['ramon'],
    partners: [],
    numPlayers: 2,
    target: 15,
    difficulty: 'dificil',
    flor: false,
    intro: [
      { speaker: 'narrador', text: 'Campo adentro, un farol y una pulpería de más de cien años.' },
      { speaker: 'ramon', text: 'Arrime nomás, amigo. Acá no se apura nadie. Las cartas hablan cuando tienen que hablar.' },
      { speaker: 'yo', text: 'Vine a escucharlas, Don Ramón.' },
    ],
    win: [{ speaker: 'ramon', text: 'Me ganó en buena ley. Está listo para el torneo regional.' }],
    lose: [{ speaker: 'ramon', text: 'Paciencia, amigo. El campo enseña.' }],
    reward: 260,
    map: { x: 37.7, y: 35.4 },
  },
  {
    id: 8,
    title: 'Torneo regional',
    place: 'Club Atlético Unión',
    region: 'Rosario, Santa Fe',
    tableId: 'club',
    clothId: 'azul',
    rivals: ['abuela', 'pibe'],
    partners: ['cordobes'],
    numPlayers: 4,
    target: 15,
    difficulty: 'dificil',
    flor: false,
    intro: [
      { speaker: 'narrador', text: 'Torneo de parejas. Tu compañero: el Cordobés, que vino especialmente.' },
      { speaker: 'cordobes', text: '¡Vamos, hermano! Vos jugá tranquilo, que yo te hago señas... mentira, no se puede.' },
      { speaker: 'abuela', text: 'Ay, qué lindos chicos. Nene, ¿jugamos bien tranquilos, sí?' },
      { speaker: 'pibe', text: '¡Abuela, no les tengas piedad!' },
    ],
    win: [{ speaker: 'abuela', text: 'Muy bien, querido. Te ganaste el pase al Nacional. Saludame al Tano.' }],
    lose: [{ speaker: 'pibe', text: '¡Re ganado! ¡Aguante la abuela!' }],
    reward: 320,
    map: { x: 34.8, y: 32.6 },
  },
  {
    id: 9,
    title: 'Campeonato nacional',
    place: 'Estadio cubierto',
    region: 'Buenos Aires',
    tableId: 'torneo',
    clothId: 'verde',
    rivals: ['tano'],
    partners: [],
    numPlayers: 2,
    target: 30,
    difficulty: 'dificil',
    flor: false,
    intro: [
      { speaker: 'narrador', text: 'Semifinal del Nacional. A treinta puntos, con malas y buenas.' },
      { speaker: 'tano', text: 'Cincuenta años jugando, pibe. ¿Vos me venís a ganar a mí?' },
      { speaker: 'yo', text: 'Vengo a aprender, Tano. Y a ganar.' },
      { speaker: 'tano', text: '¡Me gusta! Sentate, que te enseño.' },
    ],
    win: [{ speaker: 'tano', text: '¡Me cacho en diez! Bien jugado, pibe. El Campeón te espera. Cuidado: no habla, calcula.' }],
    lose: [{ speaker: 'tano', text: '¡Andá a practicar al club, pibe! Pero tenés futuro.' }],
    reward: 400,
    map: { x: 42.6, y: 38.9 },
  },
  {
    id: 10,
    title: 'La gran final',
    place: 'Final del Campeonato Nacional',
    region: 'Buenos Aires',
    tableId: 'torneo',
    clothId: 'negro',
    rivals: ['campeon'],
    partners: [],
    numPlayers: 2,
    target: 30,
    difficulty: 'dificil',
    flor: false,
    intro: [
      { speaker: 'narrador', text: 'Las luces bajan. Silencio total. Del otro lado de la mesa, el Campeón.' },
      { speaker: 'campeon', text: 'Mostrame lo que sabés.' },
      { speaker: 'yo', text: 'Para esto vine.' },
    ],
    win: [{ speaker: 'campeon', text: 'Interesante. Me ganaste. Eso no pasa seguido. Sos el nuevo Campeón Nacional.' }],
    lose: [{ speaker: 'campeon', text: 'Buen intento. Hasta acá llegaste. Por ahora.' }],
    reward: 700,
    map: { x: 40.0, y: 38.6 },
  },
];

export function storyStage(id: number): StoryStage {
  return STORY.find((s) => s.id === id) ?? STORY[0];
}
