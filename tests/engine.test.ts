import { describe, expect, it } from 'vitest';
import {
  applyAction,
  createDeck,
  createMatch,
  createRandom,
  envidoAcceptedPoints,
  envidoDeclarations,
  envidoPoints,
  envidoRejectedPoints,
  faltaPoints,
  getLegalActions,
  getPlayerView,
  handWinner,
  IllegalActionError,
  parseCardId,
  trucoValue,
  withPresetHand,
  type Action,
  type Card,
  type MatchConfig,
  type MatchState,
} from '../src/engine';

const c = (id: string): Card => parseCardId(id);
const hand = (...ids: string[]): Card[] => ids.map(c);

function newMatch(config: Partial<MatchConfig> = {}, seed = 1): MatchState {
  const full: MatchConfig = { numPlayers: 2, targetScore: 15, flor: false, ...config };
  const names = Array.from({ length: full.numPlayers }, (_, i) => `J${i}`);
  return createMatch(full, names, { seed, firstMano: 0 });
}

function preset(cards: Card[][], config: Partial<MatchConfig> = {}, mano = 0): MatchState {
  return withPresetHand(newMatch(config), cards, mano);
}

function act(state: MatchState, action: Action): MatchState {
  return applyAction(state, action).state;
}

function play(state: MatchState, seat: number, id: string): MatchState {
  return act(state, { type: 'play', seat, cardId: id });
}

function call(state: MatchState, seat: number, callName: Extract<Action, { type: 'call' }>['call']): MatchState {
  return act(state, { type: 'call', seat, call: callName });
}

function respond(state: MatchState, seat: number, response: 'quiero' | 'no_quiero' | 'me_achico'): MatchState {
  return act(state, { type: 'respond', seat, response });
}

describe('jerarquía de cartas', () => {
  const deck = createDeck();

  it('el 1 de espada le gana a cualquier carta', () => {
    const ancho = c('1-espada');
    for (const other of deck) {
      if (other.id === ancho.id) continue;
      expect(trucoValue(ancho)).toBeGreaterThan(trucoValue(other));
    }
  });

  it('el 1 de basto pierde contra el 1 de espada y le gana al resto', () => {
    const basto = c('1-basto');
    expect(trucoValue(basto)).toBeLessThan(trucoValue(c('1-espada')));
    for (const other of deck) {
      if (other.id === basto.id || other.id === '1-espada') continue;
      expect(trucoValue(basto)).toBeGreaterThan(trucoValue(other));
    }
  });

  it('respeta el orden oficial completo', () => {
    const order = [
      ['1-espada'],
      ['1-basto'],
      ['7-espada'],
      ['7-oro'],
      ['3-espada', '3-basto', '3-oro', '3-copa'],
      ['2-espada', '2-basto', '2-oro', '2-copa'],
      ['1-oro', '1-copa'],
      ['12-espada', '12-basto', '12-oro', '12-copa'],
      ['11-espada', '11-basto', '11-oro', '11-copa'],
      ['10-espada', '10-basto', '10-oro', '10-copa'],
      ['7-basto', '7-copa'],
      ['6-espada', '6-basto', '6-oro', '6-copa'],
      ['5-espada', '5-basto', '5-oro', '5-copa'],
      ['4-espada', '4-basto', '4-oro', '4-copa'],
    ];
    expect(order.flat().length).toBe(40);
    for (let i = 0; i < order.length; i++) {
      for (const id of order[i]) {
        // mismo nivel: empatan
        for (const same of order[i]) expect(trucoValue(c(id))).toBe(trucoValue(c(same)));
        // niveles inferiores: pierden
        for (let j = i + 1; j < order.length; j++) {
          for (const lower of order[j]) expect(trucoValue(c(id))).toBeGreaterThan(trucoValue(c(lower)));
        }
      }
    }
  });

  it('dos cartas de igual jerarquía empatan', () => {
    expect(trucoValue(c('3-oro'))).toBe(trucoValue(c('3-copa')));
    expect(trucoValue(c('7-basto'))).toBe(trucoValue(c('7-copa')));
    expect(trucoValue(c('1-oro'))).toBe(trucoValue(c('1-copa')));
  });

  it('el mazo tiene 40 cartas distintas sin 8 ni 9', () => {
    expect(deck).toHaveLength(40);
    expect(new Set(deck.map((d) => d.id)).size).toBe(40);
    expect(deck.some((d) => (d.rank as number) === 8 || (d.rank as number) === 9)).toBe(false);
  });
});

describe('envido', () => {
  it('7 y 6 del mismo palo valen 33', () => {
    expect(envidoPoints(hand('7-oro', '6-oro', '1-espada'))).toBe(33);
  });

  it('las figuras valen cero', () => {
    expect(envidoPoints(hand('10-copa', '12-copa', '4-basto'))).toBe(20);
    expect(envidoPoints(hand('11-oro', '12-espada', '10-basto'))).toBe(0);
    expect(envidoPoints(hand('12-oro', '5-oro', '7-copa'))).toBe(25);
  });

  it('sin dos del mismo palo se toma la carta más alta', () => {
    expect(envidoPoints(hand('7-espada', '12-oro', '4-copa'))).toBe(7);
  });

  it('con tres del mismo palo se usan las dos más altas', () => {
    expect(envidoPoints(hand('7-basto', '6-basto', '5-basto'))).toBe(33);
    expect(envidoPoints(hand('12-basto', '1-basto', '3-basto'))).toBe(24);
  });

  it('el máximo posible es 33', () => {
    const deck = createDeck();
    let max = 0;
    for (let i = 0; i < deck.length; i++)
      for (let j = i + 1; j < deck.length; j++)
        for (let k = j + 1; k < deck.length; k++)
          max = Math.max(max, envidoPoints([deck[i], deck[j], deck[k]]));
    expect(max).toBe(33);
  });

  it('suma los cantos aceptados', () => {
    const falta = () => 99;
    expect(envidoAcceptedPoints(['envido'], falta)).toBe(2);
    expect(envidoAcceptedPoints(['envido', 'envido'], falta)).toBe(4);
    expect(envidoAcceptedPoints(['real_envido'], falta)).toBe(3);
    expect(envidoAcceptedPoints(['envido', 'real_envido'], falta)).toBe(5);
    expect(envidoAcceptedPoints(['envido', 'envido', 'real_envido'], falta)).toBe(7);
    expect(envidoAcceptedPoints(['envido', 'falta_envido'], falta)).toBe(99);
  });

  it('los cantos rechazados entregan los puntos correctos', () => {
    expect(envidoRejectedPoints(['envido'])).toBe(1);
    expect(envidoRejectedPoints(['real_envido'])).toBe(1);
    expect(envidoRejectedPoints(['falta_envido'])).toBe(1);
    expect(envidoRejectedPoints(['envido', 'envido'])).toBe(2);
    expect(envidoRejectedPoints(['envido', 'real_envido'])).toBe(2);
    expect(envidoRejectedPoints(['envido', 'envido', 'real_envido'])).toBe(4);
    expect(envidoRejectedPoints(['envido', 'falta_envido'])).toBe(2);
    expect(envidoRejectedPoints(['real_envido', 'falta_envido'])).toBe(3);
    expect(envidoRejectedPoints(['envido', 'real_envido', 'falta_envido'])).toBe(5);
    expect(envidoRejectedPoints(['envido', 'envido', 'real_envido', 'falta_envido'])).toBe(7);
  });

  it('la falta envido se calcula correctamente', () => {
    // A 15: lo que le falta al que va ganando
    expect(faltaPoints([10, 4], 15, 1)).toBe(5);
    expect(faltaPoints([10, 4], 15, 0)).toBe(5);
    // A 30 en las malas: vale el partido
    expect(faltaPoints([10, 4], 30, 1)).toBe(26);
    expect(faltaPoints([10, 4], 30, 0)).toBe(20);
    // A 30 en las buenas: lo que le falta al que va ganando
    expect(faltaPoints([20, 12], 30, 1)).toBe(10);
    expect(faltaPoints([12, 27], 30, 0)).toBe(3);
  });

  it('en la declaración el empate lo gana la mano', () => {
    const dealt = [hand('7-oro', '5-oro', '4-copa'), hand('7-copa', '5-copa', '4-oro')];
    const res = envidoDeclarations(dealt, 1);
    expect(res.winnerSeat).toBe(1);
    expect(res.declarations).toEqual([
      { seat: 1, points: 32 },
      { seat: 0, points: null },
    ]);
  });

  it('en parejas declaran en orden y gana el mejor tanto', () => {
    const dealt = [
      hand('4-oro', '5-oro', '12-copa'), // 29 (eq 0)
      hand('7-copa', '3-copa', '1-oro'), // 30 (eq 1)
      hand('6-espada', '7-espada', '1-basto'), // 33 (eq 0)
      hand('10-basto', '2-basto', '11-copa'), // 22 (eq 1)
    ];
    const res = envidoDeclarations(dealt, 0);
    expect(res.winnerSeat).toBe(2);
    expect(res.winnerPoints).toBe(33);
    expect(res.declarations[0]).toEqual({ seat: 0, points: 29 });
    expect(res.declarations[1]).toEqual({ seat: 1, points: 30 });
    expect(res.declarations[2]).toEqual({ seat: 2, points: 33 });
  });
});

describe('bazas y pardas', () => {
  it('gana quien gana dos bazas', () => {
    expect(handWinner([0, 0], 1)).toBe(0);
    expect(handWinner([1, 0, 1], 0)).toBe(1);
  });

  it('parda en la primera: define la segunda', () => {
    expect(handWinner([null, 1], 0)).toBe(1);
    expect(handWinner([null, 0], 1)).toBe(0);
  });

  it('gana la primera y parda en la segunda: gana el de la primera', () => {
    expect(handWinner([1, null], 0)).toBe(1);
  });

  it('una por lado y parda en la tercera: gana el de la primera', () => {
    expect(handWinner([0, 1, null], 1)).toBe(0);
    expect(handWinner([1, 0, null], 0)).toBe(1);
  });

  it('dos pardas: define la tercera; tres pardas: gana la mano', () => {
    expect(handWinner([null, null], 0)).toBeUndefined();
    expect(handWinner([null, null, 1], 0)).toBe(1);
    expect(handWinner([null, null, null], 1)).toBe(1);
  });

  it('una parda se resuelve correctamente durante la mano', () => {
    let s = preset([hand('3-oro', '1-espada', '4-copa'), hand('3-copa', '5-basto', '6-oro')]);
    s = play(s, 0, '3-oro');
    s = play(s, 1, '3-copa');
    expect(s.hand.bazas[0].winnerTeam).toBeNull();
    // tras la parda vuelve a salir quien tiró primero la carta empardada
    expect(s.hand.turn).toBe(0);
    s = play(s, 0, '1-espada');
    s = play(s, 1, '5-basto');
    expect(s.phase).toBe('hand_over');
    expect(s.hand.result).toEqual({ winnerTeam: 0, points: 1, reason: 'bazas' });
    expect(s.scores).toEqual([1, 0]);
  });

  it('en parejas, si empatan compañeros gana su equipo', () => {
    let s = preset(
      [hand('3-oro', '4-oro', '4-copa'), hand('2-copa', '5-basto', '6-oro'), hand('3-espada', '5-oro', '6-copa'), hand('2-oro', '4-basto', '4-espada')],
      { numPlayers: 4 },
    );
    s = play(s, 0, '3-oro');
    s = play(s, 1, '2-copa');
    s = play(s, 2, '3-espada');
    s = play(s, 3, '2-oro');
    expect(s.hand.bazas[0].winnerTeam).toBe(0);
    expect(s.hand.bazas[0].winnerSeat).toBe(0);
    expect(s.hand.turn).toBe(0);
  });
});

describe('turnos y validaciones', () => {
  const base = () => preset([hand('1-espada', '2-oro', '4-copa'), hand('7-oro', '5-basto', '6-oro')]);

  it('no se puede jugar fuera de turno', () => {
    expect(() => play(base(), 1, '7-oro')).toThrow(IllegalActionError);
  });

  it('no se puede jugar una carta ajena ni repetir una carta', () => {
    expect(() => play(base(), 0, '7-oro')).toThrow(IllegalActionError);
    let s = play(base(), 0, '1-espada');
    s = play(s, 1, '5-basto');
    expect(() => play(s, 0, '1-espada')).toThrow(IllegalActionError);
  });

  it('no se puede responder dos veces ni responder lo propio', () => {
    let s = call(base(), 0, 'truco');
    expect(() => respond(s, 0, 'quiero')).toThrow(IllegalActionError);
    s = respond(s, 1, 'quiero');
    expect(() => respond(s, 1, 'quiero')).toThrow(IllegalActionError);
  });

  it('no se puede jugar una carta con un canto pendiente', () => {
    const s = call(base(), 0, 'truco');
    expect(() => play(s, 0, '1-espada')).toThrow(IllegalActionError);
  });

  it('no se puede cantar retruco sin truco ni cantar dos veces seguidas', () => {
    expect(() => call(base(), 0, 'retruco')).toThrow(IllegalActionError);
    let s = call(base(), 0, 'truco');
    s = respond(s, 1, 'quiero');
    // el que cantó no tiene el quiero: no puede subir
    expect(() => call(s, 0, 'retruco')).toThrow(IllegalActionError);
    s = play(s, 0, '4-copa');
    // el que aceptó sí puede subir en su turno
    s = call(s, 1, 'retruco');
    expect(s.hand.truco.pending?.call).toBe('retruco');
  });

  it('no se puede continuar una mano terminada', () => {
    let s = act(base(), { type: 'mazo', seat: 0 });
    expect(s.phase).toBe('hand_over');
    expect(getLegalActions(s, 0)).toEqual([]);
    expect(getLegalActions(s, 1)).toEqual([]);
    expect(() => play(s, 1, '7-oro')).toThrow(IllegalActionError);
    s = act(s, { type: 'next_hand' });
    expect(s.phase).toBe('playing');
  });

  it('el envido solo se canta en la primera baza y antes del truco aceptado', () => {
    let s = base();
    s = call(s, 0, 'truco');
    s = respond(s, 1, 'quiero');
    expect(getLegalActions(s, 0).some((a) => a.type === 'call' && a.call === 'envido')).toBe(false);

    s = base();
    s = play(s, 0, '4-copa');
    s = play(s, 1, '5-basto');
    expect(getLegalActions(s, 1).some((a) => a.type === 'call' && a.call === 'envido')).toBe(false);
  });

  it('el envido está primero', () => {
    let s = base();
    s = play(s, 0, '4-copa');
    s = call(s, 1, 'truco');
    expect(getLegalActions(s, 0).some((a) => a.type === 'call' && a.call === 'envido')).toBe(true);
    s = call(s, 0, 'envido');
    s = respond(s, 1, 'quiero');
    // J0 tiene 2 (sin palo), J1 tiene 7+6 de oro = 33
    expect(s.scores).toEqual([0, 2]);
    // vuelve el truco que estaba pendiente
    expect(s.hand.truco.pending?.call).toBe('truco');
    s = respond(s, 0, 'no_quiero');
    expect(s.scores).toEqual([0, 3]);
  });

  it('el mano solo puede cantar envido antes de tirar su carta', () => {
    let s = base();
    s = play(s, 0, '4-copa');
    expect(getLegalActions(s, 0)).toEqual([]);
    expect(getLegalActions(s, 1).some((a) => a.type === 'call' && a.call === 'envido')).toBe(true);
  });
});

describe('puntaje del truco', () => {
  // J0 gana las dos primeras bazas
  const base = () => preset([hand('1-espada', '7-espada', '4-copa'), hand('3-oro', '2-basto', '6-oro')]);
  const winTwo = (s: MatchState) => {
    s = play(s, 0, '1-espada');
    s = play(s, 1, '3-oro');
    s = play(s, 0, '7-espada');
    return play(s, 1, '2-basto');
  };

  it('mano sin truco: 1 punto', () => {
    expect(winTwo(base()).scores).toEqual([1, 0]);
  });

  it('truco querido: 2 puntos', () => {
    let s = call(base(), 0, 'truco');
    s = respond(s, 1, 'quiero');
    expect(winTwo(s).scores).toEqual([2, 0]);
  });

  it('retruco querido: 3 puntos', () => {
    let s = call(base(), 0, 'truco');
    s = call(s, 1, 'retruco');
    s = respond(s, 0, 'quiero');
    expect(winTwo(s).scores).toEqual([3, 0]);
  });

  it('vale cuatro querido: 4 puntos', () => {
    let s = call(base(), 0, 'truco');
    s = call(s, 1, 'retruco');
    s = call(s, 0, 'vale_cuatro');
    s = respond(s, 1, 'quiero');
    expect(winTwo(s).scores).toEqual([4, 0]);
  });

  it('truco no querido: 1 punto para quien cantó', () => {
    let s = call(base(), 0, 'truco');
    s = respond(s, 1, 'no_quiero');
    expect(s.scores).toEqual([1, 0]);
    expect(s.phase).toBe('hand_over');
  });

  it('retruco no querido: 2 puntos', () => {
    let s = call(base(), 0, 'truco');
    s = call(s, 1, 'retruco');
    s = respond(s, 0, 'no_quiero');
    expect(s.scores).toEqual([0, 2]);
  });

  it('vale cuatro no querido: 3 puntos', () => {
    let s = call(base(), 0, 'truco');
    s = call(s, 1, 'retruco');
    s = call(s, 0, 'vale_cuatro');
    s = respond(s, 1, 'no_quiero');
    expect(s.scores).toEqual([3, 0]);
  });

  it('irse al mazo entrega lo que vale la mano', () => {
    let s = call(base(), 0, 'truco');
    s = respond(s, 1, 'quiero');
    s = play(s, 0, '4-copa');
    s = act(s, { type: 'mazo', seat: 1 });
    expect(s.scores).toEqual([2, 0]);
  });
});

describe('envido en partida', () => {
  const base = (config: Partial<MatchConfig> = {}) =>
    preset([hand('7-oro', '6-oro', '4-copa'), hand('5-copa', '4-basto', '12-copa')], config);

  it('envido querido: gana el mejor tanto', () => {
    let s = call(base(), 0, 'envido');
    s = respond(s, 1, 'quiero');
    expect(s.scores).toEqual([2, 0]);
    expect(s.hand.envido.declarations).toEqual([
      { seat: 0, points: 33 },
      { seat: 1, points: null },
    ]);
  });

  it('envido no querido: 1 punto', () => {
    let s = call(base(), 0, 'envido');
    s = respond(s, 1, 'no_quiero');
    expect(s.scores).toEqual([1, 0]);
    // después del envido la mano sigue
    expect(s.phase).toBe('playing');
    expect(getLegalActions(s, 0).some((a) => a.type === 'call' && a.call === 'envido')).toBe(false);
  });

  it('envido, real envido, falta envido querido en partida a 15', () => {
    let s = base();
    s.scores = [8, 3];
    s = call(s, 0, 'envido');
    s = call(s, 1, 'real_envido');
    s = call(s, 0, 'falta_envido');
    s = respond(s, 1, 'quiero');
    expect(s.scores).toEqual([15, 3]);
    expect(s.phase).toBe('match_over');
    expect(s.winnerTeam).toBe(0);
  });

  it('falta envido no querido después de real envido', () => {
    let s = call(base(), 0, 'real_envido');
    s = call(s, 1, 'falta_envido');
    s = respond(s, 0, 'no_quiero');
    expect(s.scores).toEqual([0, 3]);
  });

  it('no permite cantar envido tres veces', () => {
    let s = call(base(), 0, 'envido');
    s = call(s, 1, 'envido');
    expect(getLegalActions(s, 0).some((a) => a.type === 'call' && a.call === 'envido')).toBe(false);
    expect(getLegalActions(s, 0).some((a) => a.type === 'call' && a.call === 'real_envido')).toBe(true);
  });
});

describe('flor', () => {
  const florCards = () => [hand('7-oro', '6-oro', '5-oro'), hand('1-copa', '4-basto', '12-copa')];

  it('sin flor activada no existe el canto', () => {
    const s = preset(florCards());
    expect(getLegalActions(s, 0).some((a) => a.type === 'call' && a.call === 'flor')).toBe(false);
  });

  it('quien tiene flor debe cantarla y suma 3', () => {
    let s = preset(florCards(), { flor: true });
    expect(getLegalActions(s, 0).some((a) => a.type === 'play')).toBe(false);
    s = call(s, 0, 'flor');
    expect(s.scores).toEqual([3, 0]);
    expect(getLegalActions(s, 0).some((a) => a.type === 'play')).toBe(true);
    expect(getLegalActions(s, 0).some((a) => a.type === 'call' && a.call === 'envido')).toBe(false);
  });

  it('la flor anula el envido', () => {
    let s = preset([hand('5-copa', '4-basto', '12-copa'), hand('7-oro', '6-oro', '5-oro')], { flor: true });
    s = call(s, 0, 'envido');
    expect(getLegalActions(s, 1).map((a) => (a.type === 'call' ? a.call : a.type))).toEqual(['flor']);
    s = call(s, 1, 'flor');
    expect(s.hand.envido.status).toBe('closed');
    expect(s.scores).toEqual([0, 3]);
  });

  it('contraflor querida: 6 puntos para la mejor flor', () => {
    let s = preset([hand('7-oro', '6-oro', '5-oro'), hand('1-copa', '2-copa', '3-copa')], { flor: true });
    s = call(s, 0, 'flor');
    s = call(s, 1, 'contraflor');
    s = respond(s, 0, 'quiero');
    expect(s.scores).toEqual([6, 0]);
  });

  it('con flor me achico: 4 puntos', () => {
    let s = preset([hand('7-oro', '6-oro', '5-oro'), hand('1-copa', '2-copa', '3-copa')], { flor: true });
    s = call(s, 0, 'flor');
    s = respond(s, 1, 'me_achico');
    expect(s.scores).toEqual([4, 0]);
  });
});

describe('desarrollo de la partida', () => {
  it('los cambios de mano rotan correctamente', () => {
    for (const n of [2, 4, 6] as const) {
      let s = newMatch({ numPlayers: n });
      const firstMano = s.hand.mano;
      for (let i = 1; i <= n + 1; i++) {
        s = act(s, { type: 'mazo', seat: s.hand.turn });
        if (s.phase === 'match_over') break;
        s = act(s, { type: 'next_hand' });
        expect(s.hand.mano).toBe((firstMano + i) % n);
        expect(s.hand.dealer).toBe((s.hand.mano - 1 + n) % n);
        expect(s.hand.turn).toBe(s.hand.mano);
      }
    }
  });

  it('ninguna carta aparece duplicada en cientos de repartos', () => {
    for (const n of [2, 4, 6] as const) {
      let s = newMatch({ numPlayers: n, targetScore: 30 }, 77 + n);
      for (let i = 0; i < 60 && s.phase !== 'match_over'; i++) {
        const ids = s.hand.dealt.flat().map((d) => d.id);
        expect(ids).toHaveLength(n * 3);
        expect(new Set(ids).size).toBe(ids.length);
        s = act(s, { type: 'mazo', seat: s.hand.turn });
        if (s.phase === 'hand_over') s = act(s, { type: 'next_hand' });
      }
    }
  });

  it('la vista de un jugador no revela cartas ajenas', () => {
    const s = newMatch({ numPlayers: 4 }, 5);
    const view = getPlayerView(s, 0);
    const json = JSON.stringify(view);
    for (let seat = 1; seat < 4; seat++) {
      for (const card of s.hand.dealt[seat]) {
        expect(json.includes(`"id":"${card.id}"`)).toBe(false);
      }
    }
    expect(view.hand.cardCounts).toEqual([3, 3, 3, 3]);
    expect(json.includes('holders')).toBe(false);
    expect(json.includes('"rng"')).toBe(false);
  });

  it('partidas aleatorias completas terminan al alcanzar 15 o 30 sin romper invariantes', () => {
    const configs: MatchConfig[] = [];
    for (const numPlayers of [2, 4, 6] as const)
      for (const targetScore of [15, 30] as const)
        for (const flor of [false, true]) configs.push({ numPlayers, targetScore, flor });

    let seed = 1000;
    for (const config of configs) {
      for (let g = 0; g < 6; g++) {
        const random = createRandom(seed++);
        let s = createMatch(config, Array.from({ length: config.numPlayers }, (_, i) => `J${i}`), { seed: seed * 7 });
        let steps = 0;
        while (s.phase !== 'match_over') {
          expect(steps++).toBeLessThan(5000);
          if (s.phase === 'hand_over') {
            s = act(s, { type: 'next_hand' });
            continue;
          }
          const all = s.players.flatMap((p) => getLegalActions(s, p.seat));
          expect(all.length).toBeGreaterThan(0);
          // Preferimos jugar cartas para que las manos lleguen al final
          const plays = all.filter((a) => a.type === 'play');
          const others = all.filter((a) => a.type !== 'play' && a.type !== 'mazo');
          const pool = plays.length > 0 && random() < 0.7 ? plays : others.length > 0 ? others : all;
          const a = pool[Math.floor(random() * pool.length)];
          s = act(s, a);
          // Conservación de cartas en la mano actual
          const h = s.hand;
          for (let seat = 0; seat < config.numPlayers; seat++) {
            const played = h.bazas.flatMap((b) => b.plays.filter((p) => p.seat === seat).map((p) => p.card.id));
            const remaining = h.cards[seat].map((x) => x.id);
            expect([...played, ...remaining].sort()).toEqual(h.dealt[seat].map((x) => x.id).sort());
          }
          expect(s.scores[0]).toBeLessThanOrEqual(config.targetScore);
          expect(s.scores[1]).toBeLessThanOrEqual(config.targetScore);
        }
        expect(Math.max(...s.scores)).toBe(config.targetScore);
        expect(s.scores[s.winnerTeam!]).toBe(config.targetScore);
        for (const p of s.players) expect(getLegalActions(s, p.seat)).toEqual([]);
      }
    }
  });
});
