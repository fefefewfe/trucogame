/**
 * Protocolo compartido entre el cliente y el servidor multijugador.
 */
import type { Difficulty } from '../ai/profiles';
import type { Action, GameEvent, Team } from '../engine/types';
import type { PlayerView } from '../engine/view';

export type Visibility = 'publica' | 'privada';

export interface RoomConfig {
  numPlayers: 2 | 4 | 6;
  target: 15 | 30;
  flor: boolean;
  /** Segundos por decisión. */
  turnSeconds: number;
  visibility: Visibility;
  botDifficulty: Difficulty;
}

export interface RoomSeat {
  seat: number;
  name: string;
  characterId: string;
  level: number;
  bot: boolean;
  connected: boolean;
  /** true si el asiento está ocupado por una persona (aunque esté desconectada). */
  human: boolean;
}

export interface RoomState {
  code: string;
  config: RoomConfig;
  hostId: string;
  status: 'esperando' | 'jugando' | 'terminada';
  seats: (RoomSeat | null)[];
  spectators: number;
  /** Asiento del destinatario, o -1 si es espectador o todavía no se sentó. */
  yourSeat: number;
  quick: boolean;
}

export interface PublicRoom {
  code: string;
  config: RoomConfig;
  status: RoomState['status'];
  players: number;
  hostName: string;
}

export interface GameUpdate {
  code: string;
  view: PlayerView;
  events: GameEvent[];
  deadline: number | null;
  actingSeat: number | null;
}

export interface GameEnd {
  code: string;
  winnerTeam: Team;
  scores: [number, number];
  abandonedBy: Team | null;
  ratingChange: number | null;
}

export interface ChatMessage {
  id: string;
  seat: number;
  name: string;
  text: string;
  kind: 'texto' | 'rapido' | 'emote';
  teamOnly: boolean;
  at: number;
}

export interface RankingEntry {
  name: string;
  characterId: string;
  rating: number;
  played: number;
  won: number;
}

export interface Hello {
  token?: string;
  name: string;
  characterId: string;
  level: number;
}

export interface Ack<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

export interface ClientToServer {
  hello: (msg: Hello, ack: (r: Ack<{ token: string; playerId: string; resumeCode: string | null }>) => void) => void;
  'room:create': (cfg: RoomConfig, ack: (r: Ack<{ code: string }>) => void) => void;
  'room:join': (msg: { code: string; spectate?: boolean }, ack: (r: Ack<{ code: string }>) => void) => void;
  'room:leave': () => void;
  'room:start': (ack: (r: Ack) => void) => void;
  'room:list': (ack: (r: Ack<PublicRoom[]>) => void) => void;
  'queue:join': (msg: { numPlayers: 2 | 4 | 6; target: 15 | 30 }, ack: (r: Ack) => void) => void;
  'queue:leave': () => void;
  'queue:fill': (ack: (r: Ack) => void) => void;
  'game:action': (msg: { action: Action }, ack: (r: Ack) => void) => void;
  'chat:send': (msg: { text: string; kind: ChatMessage['kind']; teamOnly: boolean }, ack: (r: Ack) => void) => void;
  'player:report': (msg: { seat: number; reason: string }, ack: (r: Ack) => void) => void;
  'ranking:get': (ack: (r: Ack<RankingEntry[]>) => void) => void;
}

export interface ServerToClient {
  'room:state': (state: RoomState) => void;
  'room:closed': (msg: { reason: string }) => void;
  'queue:status': (msg: { waiting: number; needed: number; since: number }) => void;
  'game:update': (update: GameUpdate) => void;
  'game:end': (end: GameEnd) => void;
  'chat:message': (msg: ChatMessage) => void;
  notice: (msg: { text: string }) => void;
}

export const DEFAULT_ROOM: RoomConfig = {
  numPlayers: 2,
  target: 15,
  flor: false,
  turnSeconds: 30,
  visibility: 'privada',
  botDifficulty: 'normal',
};

export function validRoomConfig(c: Partial<RoomConfig>): RoomConfig | null {
  if (!c || typeof c !== 'object') return null;
  const numPlayers = c.numPlayers === 2 || c.numPlayers === 4 || c.numPlayers === 6 ? c.numPlayers : null;
  const target = c.target === 15 || c.target === 30 ? c.target : null;
  const turnSeconds = typeof c.turnSeconds === 'number' && c.turnSeconds >= 10 && c.turnSeconds <= 120 ? Math.round(c.turnSeconds) : null;
  const visibility = c.visibility === 'publica' || c.visibility === 'privada' ? c.visibility : null;
  const botDifficulty = c.botDifficulty === 'facil' || c.botDifficulty === 'normal' || c.botDifficulty === 'dificil' ? c.botDifficulty : null;
  if (!numPlayers || !target || !turnSeconds || !visibility || !botDifficulty) return null;
  return { numPlayers, target, flor: Boolean(c.flor), turnSeconds, visibility, botDifficulty };
}

export function normalizeCode(raw: string): string {
  const digits = raw.toUpperCase().replace(/[^0-9]/g, '');
  return digits.length === 4 ? `TRUCO-${digits}` : raw.toUpperCase().trim();
}
