import type { Card } from './cards';

export type Team = 0 | 1;

export type TrucoCall = 'truco' | 'retruco' | 'vale_cuatro';
export type EnvidoCall = 'envido' | 'real_envido' | 'falta_envido';
export type FlorCall = 'flor' | 'contraflor' | 'contraflor_al_resto';
export type Call = TrucoCall | EnvidoCall | FlorCall;
export type Response = 'quiero' | 'no_quiero' | 'me_achico';

export const TRUCO_CALLS: readonly TrucoCall[] = ['truco', 'retruco', 'vale_cuatro'];
export const ENVIDO_CALLS: readonly EnvidoCall[] = ['envido', 'real_envido', 'falta_envido'];
export const FLOR_CALLS: readonly FlorCall[] = ['flor', 'contraflor', 'contraflor_al_resto'];

export function isTrucoCall(c: Call): c is TrucoCall {
  return (TRUCO_CALLS as readonly string[]).includes(c);
}
export function isEnvidoCall(c: Call): c is EnvidoCall {
  return (ENVIDO_CALLS as readonly string[]).includes(c);
}
export function isFlorCall(c: Call): c is FlorCall {
  return (FLOR_CALLS as readonly string[]).includes(c);
}

export interface MatchConfig {
  numPlayers: 2 | 4 | 6;
  /** Partida a 15 o a 30 puntos (a 30 se separan malas y buenas). */
  targetScore: 15 | 30;
  /** Jugar con flor, contraflor y contraflor al resto. */
  flor: boolean;
}

export interface PlayerInfo {
  seat: number;
  name: string;
  team: Team;
}

export interface Play {
  seat: number;
  card: Card;
}

export interface Baza {
  leader: number;
  plays: Play[];
  /** undefined: en juego · null: parda · 0/1: equipo ganador */
  winnerTeam?: Team | null;
  winnerSeat?: number | null;
}

export type TrucoLevel = 0 | 1 | 2 | 3;

export interface PendingCall<C extends Call = Call> {
  call: C;
  seat: number;
  team: Team;
}

export interface TrucoState {
  /** Nivel aceptado: 0 nada, 1 truco, 2 retruco, 3 vale cuatro. */
  level: TrucoLevel;
  /** Equipo que tiene el "quiero" y por lo tanto puede subir la apuesta. null = cualquiera. */
  holder: Team | null;
  pending: PendingCall<TrucoCall> | null;
  calls: PendingCall<TrucoCall>[];
}

export interface EnvidoDeclaration {
  seat: number;
  /** null = "son buenas" */
  points: number | null;
}

export interface EnvidoState {
  /** available: se puede cantar · pending: espera respuesta · resolved: ya se jugó · closed: ya no se puede cantar */
  status: 'available' | 'pending' | 'resolved' | 'closed';
  calls: PendingCall<EnvidoCall>[];
  declarations: EnvidoDeclaration[];
  accepted?: boolean;
  winnerTeam?: Team;
  points?: number;
}

export interface FlorState {
  /** Asientos con flor (información privada: se oculta en la vista de cada jugador). */
  holders: number[];
  /** Asientos que ya cantaron flor (público). */
  sung: number[];
  closed: boolean;
  calls: PendingCall<FlorCall>[];
  pending: PendingCall<FlorCall> | null;
  /** Puntos otorgados por flor en esta mano. */
  awards: { team: Team; points: number; reason: string }[];
}

export type HandEndReason = 'bazas' | 'no_quiero' | 'mazo' | 'abandono';

export interface HandResult {
  winnerTeam: Team;
  points: number;
  reason: HandEndReason;
}

export interface HandState {
  number: number;
  mano: number;
  dealer: number;
  /** Cartas que le quedan a cada asiento (privado). */
  cards: Card[][];
  /** Cartas repartidas al inicio (privado, sirve para envido y flor). */
  dealt: Card[][];
  bazas: Baza[];
  turn: number;
  truco: TrucoState;
  envido: EnvidoState;
  flor: FlorState;
  result: HandResult | null;
  /** Eventos públicos de la mano para la repetición. */
  log: GameEvent[];
}

export type MatchPhase = 'playing' | 'hand_over' | 'match_over';

export interface MatchState {
  config: MatchConfig;
  players: PlayerInfo[];
  scores: [number, number];
  phase: MatchPhase;
  winnerTeam: Team | null;
  hand: HandState;
  /** Eventos públicos de la mano anterior (repetición). */
  lastHandLog: GameEvent[];
  /** Estado del generador aleatorio (privado). */
  rng: number;
}

export type Action =
  | { type: 'play'; seat: number; cardId: string }
  | { type: 'call'; seat: number; call: Call }
  | { type: 'respond'; seat: number; response: Response }
  | { type: 'mazo'; seat: number }
  | { type: 'next_hand' }
  | { type: 'abandon'; team: Team };

export type ScoreReason =
  | 'mano'
  | 'truco'
  | 'truco_no_querido'
  | 'mazo'
  | 'envido'
  | 'envido_no_querido'
  | 'flor'
  | 'flor_achico'
  | 'contraflor'
  | 'contraflor_no_querida'
  | 'abandono';

export type GameEvent =
  | { type: 'hand_start'; hand: number; mano: number; dealer: number }
  | { type: 'card_played'; seat: number; card: Card; baza: number }
  | { type: 'baza_end'; baza: number; winnerTeam: Team | null; winnerSeat: number | null }
  | { type: 'call'; seat: number; call: Call }
  | { type: 'response'; seat: number; response: Response; to: Call }
  | { type: 'envido_declaration'; seat: number; points: number | null }
  | { type: 'envido_result'; winnerTeam: Team; points: number; accepted: boolean }
  | { type: 'flor_result'; team: Team; points: number; reason: string; winnerSeat?: number; florPoints?: number }
  | { type: 'mazo'; seat: number }
  | { type: 'score'; team: Team; points: number; reason: ScoreReason; scores: [number, number] }
  | { type: 'hand_end'; winnerTeam: Team; points: number; reason: HandEndReason }
  | { type: 'match_end'; winnerTeam: Team; scores: [number, number] };

export class IllegalActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IllegalActionError';
  }
}
