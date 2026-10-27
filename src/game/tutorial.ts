import { parseCardId, trucoValue, type Card } from '../engine/cards';
import { activePending, getLegalActions, teamOf } from '../engine/match';
import type { Action, GameEvent, MatchState } from '../engine/types';

export interface QuizQuestion {
  prompt: string;
  cards?: string[][];
  options: string[];
  answer: number;
  explain: string;
}

export interface Practice {
  numPlayers: 2 | 4;
  hands: string[][];
  mano: number;
  flor?: boolean;
  /** Mensaje del profe al empezar. */
  hint: string;
  /** Devuelve un mensaje si la acción del alumno no es la esperada (la acción no se aplica). */
  check?: (state: MatchState, action: Action) => string | null;
  /** ¿Se cumplió el objetivo? */
  goal: (state: MatchState, events: GameEvent[]) => boolean;
  /** ¿Falló sin remedio? Devuelve el mensaje para reintentar. */
  fail?: (state: MatchState) => string | null;
  success: string;
}

export interface Lesson {
  id: number;
  title: string;
  intro: string[];
  deal?: boolean;
  quiz?: QuizQuestion[];
  practice?: Practice;
}

const c = (ids: string[]): Card[] => ids.map(parseCardId);

/** Bot muy simple y predecible para las prácticas: acepta los cantos y gana barato. */
export function scriptedBotAction(state: MatchState, seat: number): Action | null {
  const legal = getLegalActions(state, seat);
  if (legal.length === 0) return null;
  const pending = activePending(state.hand);
  if (pending) {
    const q = legal.find((a) => a.type === 'respond' && a.response === 'quiero');
    if (q) return q;
    return legal[0];
  }
  const plays = legal.filter((a): a is Extract<Action, { type: 'play' }> => a.type === 'play');
  if (plays.length === 0) return legal[0];
  const h = state.hand;
  const cards = h.cards[seat];
  const valueOf = (id: string) => trucoValue(cards.find((x) => x.id === id)!);
  const baza = h.bazas[h.bazas.length - 1];
  const team = teamOf(seat);
  let best = -1;
  let bestTeam: number | null = null;
  for (const p of baza.plays) {
    const v = trucoValue(p.card);
    if (v > best) {
      best = v;
      bestTeam = teamOf(p.seat);
    } else if (v === best && teamOf(p.seat) !== bestTeam) bestTeam = -1;
  }
  const sorted = [...plays].sort((a, b) => valueOf(a.cardId) - valueOf(b.cardId));
  if (bestTeam === team) return sorted[0];
  const winning = sorted.find((a) => valueOf(a.cardId) > best);
  const tie = sorted.find((a) => valueOf(a.cardId) === best);
  return winning ?? tie ?? sorted[0];
}

const handOver = (s: MatchState) => s.phase !== 'playing';
const humanWonHand = (s: MatchState) => s.hand.result?.winnerTeam === 0;

export const LESSONS: Lesson[] = [
  {
    id: 1,
    title: 'Cómo se reparten las cartas',
    intro: [
      'El truco se juega con la baraja española de 40 cartas: no hay ochos ni nueves.',
      'Hay cuatro palos: espadas, bastos, oros y copas. Fijate en el marco: las cortaditas ("pintas") te dicen el palo aunque la carta esté de costado.',
      'Reparte quien está a la derecha de la mano. Da una carta por vez, empezando por la mano, hasta que cada uno tiene tres.',
    ],
    deal: true,
    quiz: [
      {
        prompt: '¿Cuántas cartas recibe cada jugador?',
        options: ['Dos', 'Tres', 'Cinco'],
        answer: 1,
        explain: 'Tres cartas cada uno. Por eso hay como máximo tres bazas en cada mano.',
      },
      {
        prompt: '¿Qué números NO están en la baraja del truco?',
        options: ['El 8 y el 9', 'El 10 y el 11', 'El 1 y el 2'],
        answer: 0,
        explain: 'Se sacan los ochos y los nueves: quedan 1 al 7 y las figuras 10 (sota), 11 (caballo) y 12 (rey).',
      },
    ],
  },
  {
    id: 2,
    title: 'Cuál carta gana',
    intro: [
      'En el truco las cartas no valen por su número. Hay una jerarquía especial.',
      'Las cuatro más bravas: el ancho de espada (1 de espada), el ancho de basto, el 7 de espada y el 7 de oro.',
      'Después vienen todos los 3, todos los 2, los anchos falsos (1 de oro y 1 de copa), los 12, 11, 10, los sietes falsos (7 de basto y de copa), los 6, 5 y 4.',
    ],
    quiz: [
      { prompt: '¿Cuál gana?', cards: [['1-espada'], ['1-basto']], options: ['El 1 de espada', 'El 1 de basto', 'Empatan'], answer: 0, explain: 'El ancho de espada es la carta más alta del juego.' },
      { prompt: '¿Cuál gana?', cards: [['7-oro'], ['3-copa']], options: ['El 7 de oro', 'El 3 de copa', 'Empatan'], answer: 0, explain: 'El 7 de oro es la cuarta carta más alta; le gana a todos los 3.' },
      { prompt: '¿Cuál gana?', cards: [['2-basto'], ['1-copa']], options: ['El 2 de basto', 'El 1 de copa', 'Empatan'], answer: 0, explain: 'Los anchos falsos (oro y copa) están por debajo de los 2.' },
      { prompt: '¿Cuál gana?', cards: [['12-espada'], ['7-copa']], options: ['El 12 de espada', 'El 7 de copa', 'Empatan'], answer: 0, explain: 'Los sietes de basto y copa son "falsos": valen menos que las figuras.' },
      { prompt: '¿Cuál gana?', cards: [['3-oro'], ['3-espada']], options: ['El 3 de oro', 'El 3 de espada', 'Empatan: es parda'], answer: 2, explain: 'Cartas del mismo nivel empatan. Eso se llama "parda".' },
    ],
  },
  {
    id: 3,
    title: 'Cómo funcionan las bazas',
    intro: ['Cada ronda en la que todos tiran una carta se llama baza. La gana la carta más alta.', 'Vos sos mano: tirás primero. El rival tiene un 2 escondido, así que elegí bien.'],
    practice: {
      numPlayers: 2,
      hands: [
        ['3-oro', '5-copa', '12-basto'],
        ['2-espada', '4-oro', '6-copa'],
      ],
      mano: 0,
      hint: 'Ganá la primera baza. Pista: el 3 le gana al 2.',
      check: (_s, a) => (a.type === 'call' || a.type === 'mazo' ? 'En esta práctica solo tirá una carta.' : null),
      goal: (s) => s.hand.bazas[0].winnerTeam === 0,
      fail: (s) => (s.hand.bazas[0].winnerTeam === 1 ? 'Esa no alcanzó: el 2 le gana al 12 y al 5. Probá con el 3.' : null),
      success: '¡Baza ganada! El 3 está por encima de todos los 2.',
    },
  },
  {
    id: 4,
    title: 'Cómo se gana una mano',
    intro: ['Una mano tiene hasta tres bazas. Gana la mano quien gana dos.', 'La mano sin cantos vale 1 punto. Jugá las tres cartas.'],
    practice: {
      numPlayers: 2,
      hands: [
        ['1-basto', '7-copa', '3-espada'],
        ['2-oro', '1-copa', '4-basto'],
      ],
      mano: 0,
      hint: 'Ganá dos bazas. Tus cartas son mejores: el ancho de basto y el 3.',
      check: (_s, a) => (a.type === 'call' || a.type === 'mazo' ? 'Por ahora no cantes: jugá las cartas.' : null),
      goal: (s) => handOver(s) && humanWonHand(s),
      fail: (s) => (handOver(s) && !humanWonHand(s) ? 'Esta vez la mano fue del rival. ¡Probá de nuevo!' : null),
      success: '¡Mano ganada! Sumaste 1 punto. Las partidas se juegan a 15 o a 30.',
    },
  },
  {
    id: 5,
    title: 'Cómo se canta truco',
    intro: [
      'Cuando te toca jugar podés cantar TRUCO: si el rival quiere, la mano vale 2. Si no quiere, ganás 1 punto.',
      'Quien acepta puede subir: retruco (3) y vale cuatro (4). Solo sube el que tiene el quiero.',
      'Con estas cartas, cantá truco antes de tirar.',
    ],
    practice: {
      numPlayers: 2,
      hands: [
        ['1-espada', '7-espada', '3-copa'],
        ['4-copa', '5-oro', '6-basto'],
      ],
      mano: 0,
      hint: 'Tocá el botón TRUCO y después ganá la mano.',
      check: (s, a) => (s.hand.truco.level === 0 && !s.hand.truco.pending && a.type === 'play' ? 'Antes de tirar, cantá TRUCO con el botón.' : a.type === 'call' && a.call !== 'truco' ? 'En esta práctica cantá solo truco.' : null),
      goal: (s) => handOver(s) && humanWonHand(s) && s.hand.truco.level >= 1,
      success: '¡Ganaste 2 puntos con el truco! Si el rival no lo quería, sumabas 1.',
    },
  },
  {
    id: 6,
    title: 'Cómo funciona el envido',
    intro: [
      'El envido es una apuesta aparte por los "tantos" de tus cartas. Se canta en la primera baza.',
      'Envido vale 2, real envido 3 y falta envido lo que le falta al que va ganando. Si no lo quieren, sumás 1.',
      'Tenés 7 y 6 de oro: ¡33, el máximo! Cantá envido.',
    ],
    practice: {
      numPlayers: 2,
      hands: [
        ['7-oro', '6-oro', '4-basto'],
        ['5-copa', '4-espada', '12-oro'],
      ],
      mano: 0,
      hint: 'Tocá ENVIDO antes de tirar tu primera carta.',
      check: (s, a) => (s.hand.envido.status === 'available' && a.type === 'play' ? 'Primero cantá ENVIDO: después de tirar ya no podés.' : a.type === 'call' && a.call !== 'envido' ? 'Cantá solo envido por ahora.' : null),
      goal: (s) => s.hand.envido.status === 'resolved' && s.hand.envido.winnerTeam === 0,
      success: '¡Envido ganado! Declaraste 33 y el rival dijo "son buenas". Sumaste 2 puntos.',
    },
  },
  {
    id: 7,
    title: 'Cómo se calculan los tantos',
    intro: [
      'Dos cartas del mismo palo: se suman y se agregan 20. Las figuras (10, 11 y 12) valen cero.',
      'Si no tenés dos del mismo palo, vale la carta más alta (sin contar figuras).',
      'Si las tres son del mismo palo, se usan las dos más altas (o es flor, si se juega con flor).',
    ],
    quiz: [
      { prompt: '¿Cuántos tantos son?', cards: [['7-copa', '5-copa', '1-oro']], options: ['12', '32', '33'], answer: 1, explain: '7 + 5 del mismo palo + 20 = 32.' },
      { prompt: '¿Cuántos tantos son?', cards: [['12-espada', '11-espada', '3-basto']], options: ['20', '23', '3'], answer: 0, explain: 'Dos figuras del mismo palo: 0 + 0 + 20 = 20.' },
      { prompt: '¿Cuántos tantos son?', cards: [['4-oro', '6-basto', '2-copa']], options: ['12', '6', '26'], answer: 1, explain: 'Ningún palo repetido: vale la más alta, el 6.' },
      { prompt: '¿Cuántos tantos son?', cards: [['10-basto', '7-basto', '6-basto']], options: ['33', '23', '13'], answer: 0, explain: 'Se toman las dos más altas: 7 + 6 + 20 = 33.' },
    ],
  },
  {
    id: 8,
    title: 'Qué significa ser mano',
    intro: [
      'La mano es el jugador que recibe la primera carta y el primero en jugar. Va rotando en cada mano.',
      'Ser mano tiene ventajas: gana los empates del envido y, si hay tres pardas, gana la mano.',
    ],
    quiz: [
      { prompt: 'Sos mano y en el envido los dos tienen 28. ¿Quién gana?', options: ['Vos, porque sos mano', 'El rival', 'Nadie, se repite'], answer: 0, explain: 'Los empates del envido los gana quien es mano (o el más cercano a la mano).' },
      { prompt: '¿Quién tira la primera carta de la mano?', options: ['El que reparte', 'La mano', 'El que tenga el ancho de espada'], answer: 1, explain: 'Siempre empieza la mano. Quien reparte juega último.' },
    ],
  },
  {
    id: 9,
    title: 'Cómo funcionan las pardas',
    intro: [
      'Cuando las cartas más altas de una baza empatan, es parda.',
      'Si la primera es parda, gana la mano quien gane la segunda. Si ganaste la primera y la segunda es parda, ganás vos.',
      'Tirá el 3 de oro: el rival va a empardar con su 3.',
    ],
    practice: {
      numPlayers: 2,
      hands: [
        ['3-oro', '1-espada', '4-copa'],
        ['3-copa', '2-basto', '5-oro'],
      ],
      mano: 0,
      hint: 'Primero el 3 de oro. Después, con la primera parda, jugá tu mejor carta.',
      check: (s, a) => (s.hand.bazas.length === 1 && a.type === 'play' && a.cardId !== '3-oro' ? 'Para ver la parda, tirá primero el 3 de oro.' : a.type !== 'play' ? 'Solo tirá cartas en esta práctica.' : null),
      goal: (s) => handOver(s) && humanWonHand(s) && s.hand.bazas[0].winnerTeam === null,
      fail: (s) => (handOver(s) && !humanWonHand(s) ? 'Después de la parda, la segunda baza decide todo. ¡Usá el ancho de espada!' : null),
      success: '¡Exacto! Parda en la primera y la segunda definió la mano.',
    },
  },
  {
    id: 10,
    title: 'Cómo jugar en parejas',
    intro: [
      'En 2 contra 2 tu compañero se sienta enfrente y se juega en sentido contrario a las agujas del reloj.',
      'Las bazas las gana el equipo: si tu compañero tira la carta más alta, la baza es de los dos.',
      'Tus cartas son bajas, pero tu compañero tiene las bravas. Jugá y mirá cómo te salva.',
    ],
    practice: {
      numPlayers: 4,
      hands: [
        ['4-copa', '5-oro', '6-basto'],
        ['3-oro', '12-copa', '4-espada'],
        ['1-espada', '1-basto', '7-oro'],
        ['2-copa', '11-oro', '5-basto'],
      ],
      mano: 0,
      hint: 'Tirá tus cartas: tu compañero (enfrente) se encarga.',
      check: (_s, a) => (a.type !== 'play' ? 'En esta práctica solo tirá cartas.' : null),
      goal: (s) => handOver(s) && humanWonHand(s),
      fail: (s) => (handOver(s) && !humanWonHand(s) ? 'Esta vez no salió. Probá otra vez.' : null),
      success: '¡Ganaron en equipo! En parejas también se canta truco y envido: el envido lo gana el mejor tanto del equipo.',
    },
  },
];

export function practiceHands(p: Practice): Card[][] {
  return p.hands.map(c);
}
