/**
 * Vista de un jugador: solo contiene información legalmente disponible para él.
 * Es lo único que reciben los bots y los clientes online.
 */
import { envidoPoints, hasFlor, type Card } from './cards';
import { activePending, getLegalActions, type ActivePending } from './match';
import type {
  Action,
  Baza,
  EnvidoState,
  FlorCall,
  GameEvent,
  HandResult,
  MatchConfig,
  MatchPhase,
  MatchState,
  PendingCall,
  PlayerInfo,
  Team,
  TrucoState,
} from './types';

export interface PublicFlorState {
  sung: number[];
  closed: boolean;
  calls: PendingCall<FlorCall>[];
  pending: PendingCall<FlorCall> | null;
  awards: { team: Team; points: number; reason: string }[];
}

export interface HandView {
  number: number;
  mano: number;
  dealer: number;
  turn: number;
  /** Cartas propias que quedan en la mano. Vacío para espectadores. */
  myCards: Card[];
  /** Las tres cartas que recibí al comienzo de la mano. */
  myDealt: Card[];
  /** Cuántas cartas le quedan a cada asiento. */
  cardCounts: number[];
  bazas: Baza[];
  truco: TrucoState;
  envido: EnvidoState;
  flor: PublicFlorState;
  result: HandResult | null;
  log: GameEvent[];
}

export interface PlayerView {
  /** Asiento del jugador, o -1 si es un espectador. */
  seat: number;
  config: MatchConfig;
  players: PlayerInfo[];
  scores: [number, number];
  phase: MatchPhase;
  winnerTeam: Team | null;
  hand: HandView;
  pending: ActivePending | null;
  legalActions: Action[];
  myEnvido: number | null;
  myFlor: boolean;
  lastHandLog: GameEvent[];
}

export function getPlayerView(state: MatchState, seat: number): PlayerView {
  const h = state.hand;
  const isPlayer = seat >= 0 && seat < state.config.numPlayers;
  const myDealt = isPlayer ? h.dealt[seat].map(copyCard) : [];
  return structuredClone({
    seat: isPlayer ? seat : -1,
    config: state.config,
    players: state.players,
    scores: state.scores,
    phase: state.phase,
    winnerTeam: state.winnerTeam,
    hand: {
      number: h.number,
      mano: h.mano,
      dealer: h.dealer,
      turn: h.turn,
      myCards: isPlayer ? h.cards[seat].map(copyCard) : [],
      myDealt,
      cardCounts: h.cards.map((c) => c.length),
      bazas: h.bazas,
      truco: h.truco,
      envido: h.envido,
      flor: {
        sung: h.flor.sung,
        closed: h.flor.closed,
        calls: h.flor.calls,
        pending: h.flor.pending,
        awards: h.flor.awards,
      },
      result: h.result,
      log: h.log,
    },
    pending: activePending(h),
    legalActions: isPlayer ? getLegalActions(state, seat) : [],
    myEnvido: isPlayer ? envidoPoints(myDealt) : null,
    myFlor: isPlayer && state.config.flor ? hasFlor(myDealt) : false,
    lastHandLog: state.lastHandLog,
  });
}

function copyCard(c: Card): Card {
  return { id: c.id, suit: c.suit, rank: c.rank };
}
