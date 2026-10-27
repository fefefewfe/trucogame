/**
 * Motor de reglas del truco argentino.
 *
 * Es una máquina de estados pura e independiente de la interfaz: recibe un
 * estado y una acción, valida la acción contra las acciones legales y devuelve
 * un estado nuevo junto con los eventos públicos que produjo.
 */
import { createDeck, envidoPoints, florPoints, hasFlor, trucoValue, type Card } from './cards';
import { nextRandom, shuffleInPlace } from './rng';
import {
  IllegalActionError,
  isEnvidoCall,
  isFlorCall,
  isTrucoCall,
  type Action,
  type Baza,
  type Call,
  type EnvidoCall,
  type EnvidoDeclaration,
  type FlorCall,
  type GameEvent,
  type HandEndReason,
  type HandState,
  type MatchConfig,
  type MatchState,
  type PendingCall,
  type ScoreReason,
  type Team,
  type TrucoCall,
  type TrucoLevel,
} from './types';

export const TRUCO_LEVEL_CALL: Record<1 | 2 | 3, TrucoCall> = {
  1: 'truco',
  2: 'retruco',
  3: 'vale_cuatro',
};

export const TRUCO_CALL_LEVEL: Record<TrucoCall, 1 | 2 | 3> = {
  truco: 1,
  retruco: 2,
  vale_cuatro: 3,
};

const ENVIDO_VALUE: Record<Exclude<EnvidoCall, 'falta_envido'>, number> = {
  envido: 2,
  real_envido: 3,
};

export function teamOf(seat: number): Team {
  return (seat % 2) as Team;
}

export function otherTeam(team: Team): Team {
  return (1 - team) as Team;
}

/** Puntos que vale la mano según el nivel de truco aceptado. */
export function trucoPoints(level: TrucoLevel): number {
  return level + 1;
}

export interface MatchOptions {
  seed: number;
  /** Fuerza quién es mano en la primera mano (por defecto se sortea). */
  firstMano?: number;
}

export function createMatch(config: MatchConfig, names: string[], options: MatchOptions): MatchState {
  if (![2, 4, 6].includes(config.numPlayers)) {
    throw new Error('El truco se juega de a 2, 4 o 6 jugadores');
  }
  if (names.length !== config.numPlayers) {
    throw new Error('La cantidad de nombres no coincide con la cantidad de jugadores');
  }
  if (config.targetScore !== 15 && config.targetScore !== 30) {
    throw new Error('Las partidas son a 15 o a 30 puntos');
  }
  const state: MatchState = {
    config: { ...config },
    players: names.map((name, seat) => ({ seat, name, team: teamOf(seat) })),
    scores: [0, 0],
    phase: 'playing',
    winnerTeam: null,
    hand: undefined as unknown as HandState,
    lastHandLog: [],
    rng: options.seed >>> 0,
  };
  const firstMano =
    options.firstMano ?? Math.floor(nextRandom(state) * config.numPlayers) % config.numPlayers;
  dealHand(state, firstMano, 1, []);
  return state;
}

function emptyHand(state: MatchState, number: number, mano: number, cards: Card[][]): HandState {
  const n = state.config.numPlayers;
  const holders = state.config.flor
    ? cards.map((c, seat) => (hasFlor(c) ? seat : -1)).filter((s) => s >= 0)
    : [];
  return {
    number,
    mano,
    dealer: (mano - 1 + n) % n,
    cards: cards.map((c) => [...c]),
    dealt: cards.map((c) => [...c]),
    bazas: [{ leader: mano, plays: [] }],
    turn: mano,
    truco: { level: 0, holder: null, pending: null, calls: [] },
    envido: { status: 'available', calls: [], declarations: [] },
    flor: {
      holders,
      sung: [],
      closed: !state.config.flor || holders.length === 0,
      calls: [],
      pending: null,
      awards: [],
    },
    result: null,
    log: [],
  };
}

function dealHand(state: MatchState, mano: number, number: number, events: GameEvent[]): void {
  const n = state.config.numPlayers;
  const deck = shuffleInPlace(createDeck(), () => nextRandom(state));
  const cards: Card[][] = Array.from({ length: n }, () => []);
  // Se reparte de a una carta, empezando por la mano.
  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < n; i++) cards[(mano + i) % n].push(deck.pop()!);
  }
  state.hand = emptyHand(state, number, mano, cards);
  state.phase = 'playing';
  emit(state, events, { type: 'hand_start', hand: number, mano, dealer: state.hand.dealer });
}

/**
 * Comienza una mano con cartas predeterminadas. Se usa en el tutorial y en
 * las pruebas automáticas; nunca en partidas online.
 */
export function withPresetHand(state: MatchState, cards: Card[][], mano: number): MatchState {
  const n = state.config.numPlayers;
  if (cards.length !== n || cards.some((c) => c.length !== 3)) {
    throw new Error('Cada jugador debe recibir exactamente tres cartas');
  }
  const ids = cards.flat().map((c) => c.id);
  if (new Set(ids).size !== ids.length) throw new Error('Hay cartas repetidas en el reparto');
  const s = clone(state);
  s.hand = emptyHand(s, state.hand ? state.hand.number : 1, mano, cards);
  s.phase = 'playing';
  emit(s, [], { type: 'hand_start', hand: s.hand.number, mano, dealer: s.hand.dealer });
  return s;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function emit(state: MatchState, events: GameEvent[], event: GameEvent): void {
  events.push(event);
  state.hand.log.push(event);
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export interface ActivePending {
  kind: 'truco' | 'envido' | 'flor';
  call: Call;
  seat: number;
  team: Team;
}

/** El canto que está esperando respuesta en este momento (el más reciente manda). */
export function activePending(hand: HandState): ActivePending | null {
  if (hand.flor.pending) return { kind: 'flor', ...hand.flor.pending };
  if (hand.envido.status === 'pending') {
    const last = hand.envido.calls[hand.envido.calls.length - 1];
    return { kind: 'envido', ...last };
  }
  if (hand.truco.pending) return { kind: 'truco', ...hand.truco.pending };
  return null;
}

export function currentBazaIndex(hand: HandState): number {
  return hand.bazas.length - 1;
}

function inFirstBaza(hand: HandState): boolean {
  return hand.bazas.length === 1;
}

function hasPlayedInFirstBaza(hand: HandState, seat: number): boolean {
  return hand.bazas[0].plays.some((p) => p.seat === seat);
}

/** El jugador tiene flor y todavía no la cantó: está obligado a cantarla. */
export function mustSingFlor(state: MatchState, seat: number): boolean {
  const f = state.hand.flor;
  return (
    state.config.flor &&
    !f.closed &&
    f.holders.includes(seat) &&
    !f.sung.includes(seat) &&
    inFirstBaza(state.hand)
  );
}

/** ¿La secuencia de envido admite este canto a continuación? */
export function envidoChainAllows(calls: readonly EnvidoCall[], next: EnvidoCall): boolean {
  if (calls.includes('falta_envido')) return false;
  if (next === 'falta_envido') return true;
  if (next === 'real_envido') return !calls.includes('real_envido');
  // envido: como máximo "envido, envido" y siempre antes del real envido
  return !calls.includes('real_envido') && calls.filter((c) => c === 'envido').length < 2;
}

/** Puntos de la falta envido (y de la contraflor al resto). */
export function faltaPoints(scores: readonly [number, number], target: number, winner: Team): number {
  const leader = Math.max(scores[0], scores[1]);
  // A 30 puntos, si el que va ganando todavía está en las malas, la falta vale el partido.
  if (target === 30 && leader <= 15) return target - scores[winner];
  return target - leader;
}

/** Puntos de un envido querido (sin falta). */
export function envidoAcceptedPoints(calls: readonly EnvidoCall[], falta: () => number): number {
  if (calls.includes('falta_envido')) return falta();
  return calls.reduce((acc, c) => acc + ENVIDO_VALUE[c as Exclude<EnvidoCall, 'falta_envido'>], 0);
}

/** Puntos de un envido no querido: lo acumulado antes del último canto, o 1. */
export function envidoRejectedPoints(calls: readonly EnvidoCall[]): number {
  if (calls.length <= 1) return 1;
  return calls
    .slice(0, -1)
    .reduce((acc, c) => acc + ENVIDO_VALUE[c as Exclude<EnvidoCall, 'falta_envido'>], 0);
}

function envidoOpenForTurn(state: MatchState, seat: number): boolean {
  const h = state.hand;
  if (h.envido.status !== 'available') return false;
  if (!inFirstBaza(h) || h.truco.level !== 0 || h.truco.pending) return false;
  if (hasPlayedInFirstBaza(h, seat)) return false;
  if (state.config.flor && !h.flor.closed && h.flor.holders.includes(seat)) return false;
  return true;
}

/** "El envido está primero": se puede contestar un truco con envido en la primera baza. */
function envidoOpenAsTrucoResponse(state: MatchState, seat: number): boolean {
  const h = state.hand;
  if (h.envido.status !== 'available') return false;
  if (!inFirstBaza(h) || h.truco.level !== 0) return false;
  if (!h.truco.pending || h.truco.pending.call !== 'truco') return false;
  if (state.config.flor && !h.flor.closed && h.flor.holders.includes(seat)) return false;
  return true;
}

export function getLegalActions(state: MatchState, seat: number): Action[] {
  if (state.phase !== 'playing') return [];
  const n = state.config.numPlayers;
  if (!Number.isInteger(seat) || seat < 0 || seat >= n) return [];
  const h = state.hand;
  const team = teamOf(seat);
  const actions: Action[] = [];
  const pending = activePending(h);

  if (pending) {
    if (pending.team === team) return [];
    const call = (c: Call) => actions.push({ type: 'call', seat, call: c });
    const respond = (r: 'quiero' | 'no_quiero' | 'me_achico') =>
      actions.push({ type: 'respond', seat, response: r });

    if (pending.kind === 'flor') {
      // Solo responde quien tiene flor en el equipo contrario.
      const holdersOfTeam = h.flor.holders.filter((s) => teamOf(s) === team);
      if (!holdersOfTeam.includes(seat)) return [];
      if (pending.call === 'flor') {
        call('contraflor');
        call('contraflor_al_resto');
        respond('me_achico');
      } else if (pending.call === 'contraflor') {
        respond('quiero');
        respond('no_quiero');
        call('contraflor_al_resto');
      } else {
        respond('quiero');
        respond('no_quiero');
      }
      return actions;
    }

    if (pending.kind === 'envido') {
      if (mustSingFlor(state, seat)) {
        // Con flor no se juega el envido: la flor lo anula.
        call('flor');
        return actions;
      }
      respond('quiero');
      respond('no_quiero');
      const chain = h.envido.calls.map((c) => c.call);
      for (const c of ['envido', 'real_envido', 'falta_envido'] as const) {
        if (envidoChainAllows(chain, c)) call(c);
      }
      return actions;
    }

    // Truco pendiente
    respond('quiero');
    respond('no_quiero');
    const level = TRUCO_CALL_LEVEL[pending.call as TrucoCall];
    if (level < 3) call(TRUCO_LEVEL_CALL[(level + 1) as 2 | 3]);
    if (mustSingFlor(state, seat)) call('flor');
    else if (envidoOpenAsTrucoResponse(state, seat)) {
      call('envido');
      call('real_envido');
      call('falta_envido');
    }
    return actions;
  }

  if (h.turn !== seat) return [];

  if (mustSingFlor(state, seat)) {
    actions.push({ type: 'call', seat, call: 'flor' });
    actions.push({ type: 'mazo', seat });
    return actions;
  }

  for (const card of h.cards[seat]) actions.push({ type: 'play', seat, cardId: card.id });

  if (h.truco.level < 3 && (h.truco.holder === null || h.truco.holder === team)) {
    actions.push({
      type: 'call',
      seat,
      call: TRUCO_LEVEL_CALL[(h.truco.level + 1) as 1 | 2 | 3],
    });
  }

  if (envidoOpenForTurn(state, seat)) {
    actions.push({ type: 'call', seat, call: 'envido' });
    actions.push({ type: 'call', seat, call: 'real_envido' });
    actions.push({ type: 'call', seat, call: 'falta_envido' });
  }

  actions.push({ type: 'mazo', seat });
  return actions;
}

export function sameAction(a: Action, b: Action): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case 'play':
      return b.type === 'play' && a.seat === b.seat && a.cardId === b.cardId;
    case 'call':
      return b.type === 'call' && a.seat === b.seat && a.call === b.call;
    case 'respond':
      return b.type === 'respond' && a.seat === b.seat && a.response === b.response;
    case 'mazo':
      return b.type === 'mazo' && a.seat === b.seat;
    case 'next_hand':
      return true;
    case 'abandon':
      return b.type === 'abandon' && a.team === b.team;
  }
}

export function isLegal(state: MatchState, action: Action): boolean {
  if (action.type === 'next_hand') return state.phase === 'hand_over';
  if (action.type === 'abandon') return state.phase !== 'match_over';
  return getLegalActions(state, action.seat).some((a) => sameAction(a, action));
}

// ---------------------------------------------------------------------------
// Transiciones
// ---------------------------------------------------------------------------

export interface ActionResult {
  state: MatchState;
  events: GameEvent[];
}

export function applyAction(state: MatchState, action: Action): ActionResult {
  if (!isLegal(state, action)) {
    throw new IllegalActionError(describeIllegal(state, action));
  }
  const s = clone(state);
  const events: GameEvent[] = [];
  switch (action.type) {
    case 'next_hand': {
      const n = s.config.numPlayers;
      dealHand(s, (s.hand.mano + 1) % n, s.hand.number + 1, events);
      break;
    }
    case 'abandon': {
      const winner = otherTeam(action.team);
      s.phase = 'match_over';
      s.winnerTeam = winner;
      if (!s.hand.result) {
        s.hand.result = { winnerTeam: winner, points: 0, reason: 'abandono' };
      }
      emit(s, events, { type: 'match_end', winnerTeam: winner, scores: [...s.scores] as [number, number] });
      s.lastHandLog = [...s.hand.log];
      break;
    }
    case 'play':
      doPlay(s, action.seat, action.cardId, events);
      break;
    case 'call':
      doCall(s, action.seat, action.call, events);
      break;
    case 'respond':
      doRespond(s, action.seat, action.response, events);
      break;
    case 'mazo':
      emit(s, events, { type: 'mazo', seat: action.seat });
      endHand(s, otherTeam(teamOf(action.seat)), trucoPoints(s.hand.truco.level), 'mazo', events);
      break;
  }
  return { state: s, events };
}

function describeIllegal(state: MatchState, action: Action): string {
  if (state.phase === 'match_over') return 'La partida ya terminó';
  if (action.type === 'next_hand') return 'La mano todavía no terminó';
  if (state.phase === 'hand_over') return 'La mano ya terminó';
  if (action.type === 'abandon') return 'Acción inválida';
  const h = state.hand;
  const pending = activePending(h);
  if (pending && pending.team === teamOf(action.seat)) return 'Hay que esperar la respuesta del rival';
  if (pending) return 'Primero hay que responder el canto';
  if (h.turn !== action.seat) return 'No es tu turno';
  if (action.type === 'play') return 'Esa carta no se puede jugar';
  return 'Ese canto no está permitido ahora';
}

function resolveBaza(baza: Baza): { winnerTeam: Team | null; winnerSeat: number | null; nextLeader: number } {
  let max = -1;
  for (const p of baza.plays) max = Math.max(max, trucoValue(p.card));
  const top = baza.plays.filter((p) => trucoValue(p.card) === max);
  const teams = new Set(top.map((p) => teamOf(p.seat)));
  if (teams.size === 1) {
    return { winnerTeam: teamOf(top[0].seat), winnerSeat: top[0].seat, nextLeader: top[0].seat };
  }
  // Parda: arranca la siguiente quien tiró primero la carta empardada.
  return { winnerTeam: null, winnerSeat: null, nextLeader: top[0].seat };
}

/**
 * Ganador de la mano según las bazas jugadas, o undefined si todavía no está definido.
 * - Gana quien gana dos bazas.
 * - Parda en la primera: gana quien gane la segunda (o la tercera si también hay parda).
 * - Gana la primera y empata la segunda: gana quien ganó la primera.
 * - Primera y segunda repartidas y parda en la tercera: gana quien ganó la primera.
 * - Tres pardas: gana el equipo que es mano.
 */
export function handWinner(results: readonly (Team | null)[], manoTeam: Team): Team | undefined {
  const wins = [0, 0];
  for (const r of results) if (r !== null) wins[r]++;
  if (wins[0] >= 2) return 0;
  if (wins[1] >= 2) return 1;
  if (results.length >= 2) {
    const [r1, r2] = results;
    if (r1 === null && r2 !== null) return r2;
    if (r1 !== null && r2 === null) return r1;
  }
  if (results.length === 3) {
    const [r1, , r3] = results;
    if (r3 !== null) return r3;
    if (r1 !== null) return r1;
    return manoTeam;
  }
  return undefined;
}

function closeFirstBazaWindows(state: MatchState): void {
  const h = state.hand;
  if (h.envido.status === 'available') h.envido.status = 'closed';
  if (!h.flor.closed && !h.flor.pending) h.flor.closed = true;
}

function doPlay(s: MatchState, seat: number, cardId: string, events: GameEvent[]): void {
  const h = s.hand;
  const n = s.config.numPlayers;
  const idx = h.cards[seat].findIndex((c) => c.id === cardId);
  const [card] = h.cards[seat].splice(idx, 1);
  const bazaIndex = currentBazaIndex(h);
  const baza = h.bazas[bazaIndex];
  baza.plays.push({ seat, card });
  emit(s, events, { type: 'card_played', seat, card, baza: bazaIndex });

  if (baza.plays.length < n) {
    h.turn = (seat + 1) % n;
    return;
  }

  const res = resolveBaza(baza);
  baza.winnerTeam = res.winnerTeam;
  baza.winnerSeat = res.winnerSeat;
  emit(s, events, {
    type: 'baza_end',
    baza: bazaIndex,
    winnerTeam: res.winnerTeam,
    winnerSeat: res.winnerSeat,
  });
  if (bazaIndex === 0) closeFirstBazaWindows(s);

  const winner = handWinner(
    h.bazas.map((b) => b.winnerTeam as Team | null),
    teamOf(h.mano),
  );
  if (winner !== undefined) {
    endHand(s, winner, trucoPoints(h.truco.level), 'bazas', events);
    return;
  }
  h.bazas.push({ leader: res.nextLeader, plays: [] });
  h.turn = res.nextLeader;
}

function doCall(s: MatchState, seat: number, call: Call, events: GameEvent[]): void {
  const h = s.hand;
  const team = teamOf(seat);
  emit(s, events, { type: 'call', seat, call });

  if (isTrucoCall(call)) {
    if (h.truco.pending) {
      // Subir la apuesta como respuesta implica aceptar el canto anterior.
      h.truco.level = TRUCO_CALL_LEVEL[h.truco.pending.call];
      h.truco.holder = team;
    }
    const rec: PendingCall<TrucoCall> = { call, seat, team };
    h.truco.pending = rec;
    h.truco.calls.push(rec);
    if (h.truco.level >= 1 && h.envido.status === 'available') h.envido.status = 'closed';
    return;
  }

  if (isEnvidoCall(call)) {
    h.envido.calls.push({ call, seat, team });
    h.envido.status = 'pending';
    return;
  }

  if (isFlorCall(call)) {
    if (call === 'flor') {
      singFlor(s, seat, events);
    } else {
      const rec: PendingCall<FlorCall> = { call, seat, team };
      h.flor.calls.push(rec);
      h.flor.pending = rec;
    }
  }
}

function singFlor(s: MatchState, seat: number, events: GameEvent[]): void {
  const h = s.hand;
  const team = teamOf(seat);
  h.flor.sung.push(seat);
  // La flor anula el envido (también uno que estaba esperando respuesta).
  if (h.envido.status === 'available' || h.envido.status === 'pending') {
    h.envido.status = 'closed';
  }
  const rivals = h.flor.holders.filter((x) => teamOf(x) !== team && !h.flor.sung.includes(x));
  if (rivals.length === 0) {
    awardFlor(s, team, 3, 'flor', events);
    if (h.flor.holders.every((x) => h.flor.sung.includes(x))) h.flor.closed = true;
    return;
  }
  const rec: PendingCall<FlorCall> = { call: 'flor', seat, team };
  h.flor.calls = [rec];
  h.flor.pending = rec;
}

function awardFlor(
  s: MatchState,
  team: Team,
  points: number,
  reason: ScoreReason,
  events: GameEvent[],
  extra?: { winnerSeat: number; florPoints: number },
): void {
  s.hand.flor.awards.push({ team, points, reason });
  emit(s, events, { type: 'flor_result', team, points, reason, ...extra });
  award(s, team, points, reason, events);
}

function closeFlor(s: MatchState): void {
  const f = s.hand.flor;
  f.pending = null;
  f.closed = true;
  for (const x of f.holders) if (!f.sung.includes(x)) f.sung.push(x);
  if (s.hand.envido.status === 'available') s.hand.envido.status = 'closed';
}

function bestFlor(s: MatchState): { seat: number; points: number } {
  const h = s.hand;
  const n = s.config.numPlayers;
  let best: { seat: number; points: number; pos: number } | null = null;
  for (let pos = 0; pos < n; pos++) {
    const seat = (h.mano + pos) % n;
    if (!h.flor.holders.includes(seat)) continue;
    const pts = florPoints(h.dealt[seat]);
    if (!best || pts > best.points) best = { seat, points: pts, pos };
  }
  return best!;
}

function doRespond(
  s: MatchState,
  seat: number,
  response: 'quiero' | 'no_quiero' | 'me_achico',
  events: GameEvent[],
): void {
  const h = s.hand;
  const team = teamOf(seat);
  const pending = activePending(h)!;
  emit(s, events, { type: 'response', seat, response, to: pending.call });

  if (pending.kind === 'truco') {
    const level = TRUCO_CALL_LEVEL[pending.call as TrucoCall];
    h.truco.pending = null;
    if (response === 'quiero') {
      h.truco.level = level;
      h.truco.holder = team;
      if (h.envido.status === 'available') h.envido.status = 'closed';
    } else {
      // No quiero: el que cantó se lleva lo que valía la mano antes del canto.
      endHand(s, pending.team, level, 'no_quiero', events);
    }
    return;
  }

  if (pending.kind === 'envido') {
    resolveEnvido(s, response === 'quiero', events);
    return;
  }

  // Flor
  const florTeam = pending.team;
  if (response === 'me_achico') {
    closeFlor(s);
    awardFlor(s, florTeam, 4, 'flor_achico', events);
    return;
  }
  if (response === 'quiero') {
    const best = bestFlor(s);
    const winner = teamOf(best.seat);
    const points =
      pending.call === 'contraflor_al_resto'
        ? faltaPoints(s.scores, s.config.targetScore, winner)
        : 6;
    closeFlor(s);
    awardFlor(s, winner, points, 'contraflor', events, { winnerSeat: best.seat, florPoints: best.points });
    return;
  }
  // No quiero
  const previous = h.flor.calls.length >= 2 ? h.flor.calls[h.flor.calls.length - 2].call : 'flor';
  const points = pending.call === 'contraflor_al_resto' && previous === 'contraflor' ? 6 : 4;
  closeFlor(s);
  awardFlor(s, florTeam, points, 'contraflor_no_querida', events);
}

/** Declaración de tantos en orden desde la mano. Los empates los gana quien está más cerca de la mano. */
export function envidoDeclarations(
  dealt: readonly (readonly Card[])[],
  mano: number,
): { declarations: EnvidoDeclaration[]; winnerSeat: number; winnerPoints: number } {
  const n = dealt.length;
  const order = Array.from({ length: n }, (_, i) => (mano + i) % n);
  const declarations: EnvidoDeclaration[] = [];
  const saidGood = new Set<number>();
  let best: { seat: number; points: number; pos: number } | null = null;
  let changed = true;
  while (changed) {
    changed = false;
    for (let pos = 0; pos < n; pos++) {
      const seat = order[pos];
      const points = envidoPoints(dealt[seat]);
      if (!best) {
        best = { seat, points, pos };
        declarations.push({ seat, points });
        changed = true;
        continue;
      }
      if (teamOf(seat) === teamOf(best.seat)) continue;
      const beats = points > best.points || (points === best.points && pos < best.pos);
      if (beats) {
        best = { seat, points, pos };
        declarations.push({ seat, points });
        changed = true;
      } else if (!saidGood.has(seat)) {
        saidGood.add(seat);
        declarations.push({ seat, points: null });
      }
    }
  }
  return { declarations, winnerSeat: best!.seat, winnerPoints: best!.points };
}

function resolveEnvido(s: MatchState, accepted: boolean, events: GameEvent[]): void {
  const h = s.hand;
  const e = h.envido;
  const calls = e.calls.map((c) => c.call);
  const last = e.calls[e.calls.length - 1];
  e.status = 'resolved';
  e.accepted = accepted;

  if (!accepted) {
    const points = envidoRejectedPoints(calls);
    e.winnerTeam = last.team;
    e.points = points;
    emit(s, events, { type: 'envido_result', winnerTeam: last.team, points, accepted: false });
    award(s, last.team, points, 'envido_no_querido', events);
    return;
  }

  const { declarations, winnerSeat } = envidoDeclarations(h.dealt, h.mano);
  for (const d of declarations) {
    e.declarations.push(d);
    emit(s, events, { type: 'envido_declaration', seat: d.seat, points: d.points });
  }
  const winnerTeam = teamOf(winnerSeat);
  const points = envidoAcceptedPoints(calls, () =>
    faltaPoints(s.scores, s.config.targetScore, winnerTeam),
  );
  e.winnerTeam = winnerTeam;
  e.points = points;
  emit(s, events, { type: 'envido_result', winnerTeam, points, accepted: true });
  award(s, winnerTeam, points, 'envido', events);
}

function award(s: MatchState, team: Team, points: number, reason: ScoreReason, events: GameEvent[]): void {
  if (s.phase === 'match_over') return;
  const target = s.config.targetScore;
  s.scores[team] = Math.min(target, s.scores[team] + points);
  emit(s, events, { type: 'score', team, points, reason, scores: [...s.scores] as [number, number] });
  if (s.scores[team] >= target) {
    s.phase = 'match_over';
    s.winnerTeam = team;
    closeAllPending(s);
    emit(s, events, { type: 'match_end', winnerTeam: team, scores: [...s.scores] as [number, number] });
    s.lastHandLog = [...s.hand.log];
  }
}

function closeAllPending(s: MatchState): void {
  s.hand.truco.pending = null;
  s.hand.flor.pending = null;
  if (s.hand.envido.status === 'pending') s.hand.envido.status = 'closed';
}

const HAND_REASON_SCORE: Record<Exclude<HandEndReason, 'abandono'>, (level: TrucoLevel) => ScoreReason> = {
  bazas: (level) => (level === 0 ? 'mano' : 'truco'),
  no_quiero: () => 'truco_no_querido',
  mazo: () => 'mazo',
};

function endHand(s: MatchState, winnerTeam: Team, points: number, reason: HandEndReason, events: GameEvent[]): void {
  const h = s.hand;
  h.result = { winnerTeam, points, reason };
  h.truco.pending = null;
  if (h.envido.status === 'available') h.envido.status = 'closed';
  h.flor.closed = true;
  emit(s, events, { type: 'hand_end', winnerTeam, points, reason });
  if (s.phase !== 'match_over') s.phase = 'hand_over';
  const scoreReason = reason === 'abandono' ? 'abandono' : HAND_REASON_SCORE[reason](h.truco.level);
  award(s, winnerTeam, points, scoreReason, events);
  s.lastHandLog = [...h.log];
}

export function isInMalas(score: number, target: number): boolean {
  return target === 30 && score <= 15;
}
