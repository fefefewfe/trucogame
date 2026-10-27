/**
 * Servidor multijugador autoritativo.
 *
 * - El servidor reparte (con números aleatorios criptográficos) y guarda el
 *   estado completo; cada cliente recibe solo su PlayerView.
 * - Toda acción se valida con el motor de reglas antes de aplicarse; el
 *   asiento lo decide el servidor, nunca el cliente.
 * - Los asientos vacíos o abandonados los juegan bots.
 * - Si alguien se desconecta, puede volver con su token y retomar su lugar.
 */
import { randomInt, randomUUID } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import { decide } from '../src/ai/bot';
import { createMemory, observeHand, type BotMemory } from '../src/ai/memory';
import type { BotProfile, Difficulty } from '../src/ai/profiles';
import { applyAction, createMatch, getLegalActions, teamOf } from '../src/engine/match';
import type { Action, GameEvent, MatchState, Team } from '../src/engine/types';
import { getPlayerView as viewOf } from '../src/engine/view';
import { CHARACTERS, getCharacter } from '../src/game/characters';
import { humanSpotChance, MAX_SENAS_PER_HAND, resolveSena, senasForHand, spotChance, type SenaId, type SenaKnowledge } from '../src/game/senas';
import {
  validRoomConfig,
  type Ack,
  type ChatMessage,
  type ClientToServer,
  type Hello,
  type PublicRoom,
  type RoomConfig,
  type RoomState,
  type ServerToClient,
} from '../src/net/protocol';
import { cleanName, cleanText } from './moderation';
import type { Store } from './store';

type IO = Server<ClientToServer, ServerToClient>;
type Sock = Socket<ClientToServer, ServerToClient>;


export interface ServerOptions {
  /** Multiplica todas las esperas (las pruebas usan valores chicos). */
  timeScale?: number;
  /** Segundos de gracia antes de que un bot reemplace a un desconectado. */
  reconnectGrace?: number;
}

interface ServerPlayer {
  id: string;
  token: string;
  name: string;
  characterId: string;
  level: number;
  socketId: string | null;
  roomCode: string | null;
  lastChat: number;
  queueKey: string | null;
  queueSince: number;
}

interface SeatOcc {
  playerId: string | null;
  name: string;
  characterId: string;
  level: number;
  connected: boolean;
  botControlled: boolean;
  profile: BotProfile;
  memory: BotMemory;
  abandoned: boolean;
  timeouts: number;
}

const BOT_RATING: Record<Difficulty, number> = { facil: 900, normal: 1050, dificil: 1200 };

/** Tiempo aproximado que el cliente tarda en mostrar cada evento (para no apurar a nadie). */
function presentMs(events: GameEvent[]): number {
  let ms = 0;
  for (const e of events) {
    switch (e.type) {
      case 'hand_start':
        ms += 2600;
        break;
      case 'card_played':
        ms += 560;
        break;
      case 'baza_end':
        ms += 820;
        break;
      case 'call':
        ms += 1400;
        break;
      case 'response':
        ms += 950;
        break;
      case 'envido_declaration':
        ms += 1150;
        break;
      default:
        ms += 400;
    }
  }
  return ms;
}

export class Room {
  readonly code: string;
  config: RoomConfig;
  hostId: string;
  status: RoomState['status'] = 'esperando';
  readonly quick: boolean;
  seats: (SeatOcc | null)[];
  spectators = new Set<string>();
  state: MatchState | null = null;
  deadline: number | null = null;
  private knowledge: SenaKnowledge[][] = [];
  private senasUsed: number[] = [];
  private senaHand = 0;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private turnTimer: ReturnType<typeof setTimeout> | null = null;
  private ratedLeavers = new Set<string>();

  constructor(
    private readonly server: GameServer,
    code: string,
    config: RoomConfig,
    hostId: string,
    quick: boolean,
  ) {
    this.code = code;
    this.config = config;
    this.hostId = hostId;
    this.quick = quick;
    this.seats = Array.from({ length: config.numPlayers }, () => null);
  }

  private ms(n: number): number {
    return n * this.server.timeScale;
  }

  humanSeats(): number[] {
    return this.seats.map((s, i) => (s && s.playerId && !s.botControlled ? i : -1)).filter((i) => i >= 0);
  }

  seatOf(playerId: string): number {
    return this.seats.findIndex((s) => s?.playerId === playerId);
  }

  addPlayer(p: ServerPlayer): number {
    const existing = this.seatOf(p.id);
    if (existing >= 0) return existing;
    const free = this.seats.findIndex((s) => s === null);
    if (free < 0) return -1;
    this.seats[free] = {
      playerId: p.id,
      name: p.name,
      characterId: p.characterId,
      level: p.level,
      connected: true,
      botControlled: false,
      profile: { difficulty: this.config.botDifficulty, personality: getCharacter(p.characterId).personality },
      memory: createMemory(),
      abandoned: false,
      timeouts: 0,
    };
    p.roomCode = this.code;
    return free;
  }

  private botSeat(index: number): SeatOcc {
    const used = new Set(this.seats.filter(Boolean).map((s) => s!.characterId));
    const ch = CHARACTERS.find((c) => !used.has(c.id)) ?? CHARACTERS[index % CHARACTERS.length];
    return {
      playerId: null,
      name: `${ch.name} (bot)`,
      characterId: ch.id,
      level: this.config.botDifficulty === 'facil' ? 5 : this.config.botDifficulty === 'normal' ? 15 : 30,
      connected: true,
      botControlled: true,
      profile: { difficulty: this.config.botDifficulty, personality: ch.personality },
      memory: createMemory(),
      abandoned: false,
      timeouts: 0,
    };
  }

  /** Arranca (o reinicia) la partida completando con bots. */
  start(): void {
    this.clearTimers();
    for (let i = 0; i < this.seats.length; i++) if (!this.seats[i]) this.seats[i] = this.botSeat(i);
    for (const s of this.seats) if (s) s.memory = createMemory();
    this.ratedLeavers.clear();
    this.state = createMatch(
      { numPlayers: this.config.numPlayers, targetScore: this.config.target, flor: this.config.flor },
      this.seats.map((s) => s!.name),
      { seed: randomInt(0, 2 ** 32 - 1) },
    );
    this.status = 'jugando';
    this.server.broadcastRoom(this);
    this.afterChange([...this.state.hand.log]);
  }

  // -------------------------------------------------------------------------

  handleAction(playerId: string, action: Action): Ack {
    if (!this.state || this.status !== 'jugando') return { ok: false, error: 'No hay partida en juego' };
    const seat = this.seatOf(playerId);
    if (seat < 0) return { ok: false, error: 'No estás sentado en esta mesa' };
    const occ = this.seats[seat]!;
    if (occ.botControlled) return { ok: false, error: 'Tu lugar lo está jugando un bot' };
    if (action.type === 'next_hand' || action.type === 'abandon') return { ok: false, error: 'Acción no permitida' };
    // El asiento lo fija el servidor: el cliente no puede jugar por otro.
    const fixed = { ...action, seat } as Action;
    try {
      this.apply(fixed);
      occ.timeouts = 0;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Acción inválida' };
    }
  }

  private apply(action: Action): void {
    const prev = this.state!;
    const res = applyAction(prev, action);
    this.state = res.state;
    if (prev.phase === 'playing' && res.state.phase !== 'playing') {
      this.seats.forEach((s, i) => s?.botControlled && observeHand(s.memory, res.state.lastHandLog, i));
    }
    this.afterChange(res.events);
  }

  private afterChange(events: GameEvent[]): void {
    const s = this.state!;
    if (this.senaHand !== s.hand.number) {
      this.senaHand = s.hand.number;
      this.knowledge = this.seats.map(() => []);
      this.senasUsed = this.seats.map(() => 0);
      this.scheduleBotSenas(this.ms(presentMs(events)));
    }
    this.clearTurnTimer();
    const wait = this.ms(presentMs(events));
    if (s.phase === 'match_over') {
      this.deadline = null;
      this.broadcastGame(events, null);
      this.finish();
      return;
    }
    if (s.phase === 'hand_over') {
      this.deadline = null;
      this.broadcastGame(events, null);
      this.later(() => this.nextHand(), wait + this.ms(3600));
      return;
    }
    const actors = this.seats.map((_, i) => i).filter((i) => getLegalActions(s, i).length > 0);
    const humans = actors.filter((i) => !this.seats[i]!.botControlled);
    if (humans.length > 0) {
      const total = wait + this.config.turnSeconds * 1000 * this.server.timeScale;
      this.deadline = Date.now() + total;
      this.broadcastGame(events, humans[0]);
      this.turnTimer = setTimeout(() => this.timeout(humans), total);
      return;
    }
    const actor = this.pickBot(actors);
    this.deadline = null;
    this.broadcastGame(events, actor);
    if (actor !== null) this.later(() => this.botAct(actor), wait + this.ms(700 + Math.random() * 900));
  }

  private pickBot(actors: number[]): number | null {
    if (actors.length === 0) return null;
    const h = this.state!.hand;
    const pending = h.flor.pending ?? (h.envido.status === 'pending' ? h.envido.calls[h.envido.calls.length - 1] : null) ?? h.truco.pending;
    if (pending) {
      for (let i = 1; i <= this.seats.length; i++) {
        const seat = (pending.seat + i) % this.seats.length;
        if (actors.includes(seat)) return seat;
      }
    }
    return actors[0];
  }

  private botAct(seat: number): void {
    const s = this.state;
    if (!s || s.phase !== 'playing' || this.status !== 'jugando') return;
    const occ = this.seats[seat]!;
    const view = viewOf(s, seat);
    if (view.legalActions.length === 0) return;
    const { action } = decide(view, occ.profile, occ.memory, Math.random, this.knowledge[seat] ?? []);
    try {
      this.apply(action);
    } catch {
      /* no debería pasar: el bot solo elige acciones legales */
    }
  }

  /** Se acabó el tiempo: se juega una acción automática por el jugador. */
  private timeout(humans: number[]): void {
    const s = this.state;
    if (!s || s.phase !== 'playing') return;
    const seat = this.pickBot(humans) ?? humans[0];
    const legal = getLegalActions(s, seat);
    if (legal.length === 0) return;
    const occ = this.seats[seat]!;
    occ.timeouts++;
    const find = (pred: (a: Action) => boolean) => legal.find(pred);
    const action =
      find((a) => a.type === 'call' && a.call === 'flor' && legal.every((x) => x.type !== 'play')) ??
      find((a) => a.type === 'respond' && a.response === 'no_quiero') ??
      find((a) => a.type === 'respond' && a.response === 'me_achico') ??
      legal.filter((a) => a.type === 'play')[0] ??
      legal[0];
    this.server.notice(this, `Se le acabó el tiempo a ${occ.name}.`);
    if (!occ.connected && occ.timeouts >= 2) this.replaceWithBot(seat, 'no volvió a tiempo');
    this.apply(action);
  }

  private nextHand(): void {
    if (!this.state || this.state.phase !== 'hand_over') return;
    // Cada mano se mezcla con una semilla nueva criptográficamente segura.
    this.state = { ...this.state, rng: randomInt(0, 2 ** 32 - 1) };
    this.apply({ type: 'next_hand' });
  }

  replaceWithBot(seat: number, reason: string): void {
    const occ = this.seats[seat];
    if (!occ || occ.botControlled) return;
    occ.botControlled = true;
    occ.profile = { difficulty: this.config.botDifficulty, personality: getCharacter(occ.characterId).personality };
    this.server.notice(this, `${occ.name} ${reason}: lo reemplaza un bot.`);
    this.server.broadcastRoom(this);
    if (this.state?.phase === 'playing') {
      this.clearTurnTimer();
      this.afterChange([]);
    }
  }

  resumeHuman(seat: number): void {
    const occ = this.seats[seat];
    if (!occ || occ.abandoned) return;
    occ.connected = true;
    occ.timeouts = 0;
    if (occ.botControlled && occ.playerId) {
      occ.botControlled = false;
      this.server.notice(this, `${occ.name} volvió a la mesa.`);
    }
  }

  // -------------------------------------------------------------------------
  // Señas

  sena(playerId: string, sena: SenaId): Ack<{ left: number }> {
    if (!this.state || this.state.phase !== 'playing') return { ok: false, error: 'No hay mano en juego' };
    if (this.config.numPlayers < 4) return { ok: false, error: 'Las señas son para partidas en parejas' };
    const seat = this.seatOf(playerId);
    if (seat < 0) return { ok: false, error: 'No estás sentado' };
    if (this.senasUsed[seat] >= MAX_SENAS_PER_HAND) return { ok: false, error: 'No te quedan señas en esta mano' };
    this.senasUsed[seat]++;
    this.deliverSena(seat, sena);
    return { ok: true, data: { left: MAX_SENAS_PER_HAND - this.senasUsed[seat] } };
  }

  private chanceFor(from: number, seat: number): number {
    const watcher = this.seats[seat]!;
    if (!watcher.botControlled) {
      const fromOcc = this.seats[from]!;
      return fromOcc.botControlled ? humanSpotChance(fromOcc.profile.difficulty) : 0.3;
    }
    return spotChance(watcher.profile.difficulty);
  }

  private deliverSena(from: number, sena: SenaId): void {
    const seen = resolveSena(from, this.seats.length, (seat) => this.chanceFor(from, seat), Math.random);
    const fromOcc = this.seats[from]!;
    if (!fromOcc.botControlled && fromOcc.playerId) this.server.toPlayer(fromOcc.playerId, 'game:sena', { seat: from, sena, rival: false, mine: true });
    for (const seat of seen) {
      this.knowledge[seat].push({ seat: from, sena });
      const occ = this.seats[seat]!;
      const rival = teamOf(seat) !== teamOf(from);
      if (!occ.botControlled && occ.playerId) this.server.toPlayer(occ.playerId, 'game:sena', { seat: from, sena, rival, mine: false });
      if (rival && fromOcc.playerId && !fromOcc.botControlled) this.server.toPlayer(fromOcc.playerId, 'notice', { text: `¡${occ.name} te vio la seña!` });
    }
  }

  private scheduleBotSenas(after: number): void {
    if (this.config.numPlayers < 4 || !this.state) return;
    let delay = after + this.ms(400);
    const hand = this.state.hand.number;
    this.seats.forEach((occ, seat) => {
      if (!occ?.botControlled) return;
      for (const sena of senasForHand(this.state!.hand.dealt[seat], this.config.flor).slice(0, 2)) {
        delay += this.ms(650);
        this.later(() => {
          if (this.state?.hand.number === hand && this.state.phase === 'playing') this.deliverSena(seat, sena);
        }, delay);
      }
    });
  }

  // -------------------------------------------------------------------------

  private finish(): void {
    const s = this.state!;
    this.status = 'terminada';
    this.clearTimers();
    const changes = this.server.applyRatings(this, s.winnerTeam as Team);
    for (let seat = 0; seat < this.seats.length; seat++) {
      const occ = this.seats[seat];
      if (!occ?.playerId || occ.abandoned) continue;
      this.server.toPlayer(occ.playerId, 'game:end', {
        code: this.code,
        winnerTeam: s.winnerTeam as Team,
        scores: [s.scores[0], s.scores[1]],
        abandonedBy: null,
        ratingChange: changes.get(occ.playerId) ?? null,
      });
    }
    for (const id of this.spectators) {
      this.server.toPlayer(id, 'game:end', { code: this.code, winnerTeam: s.winnerTeam as Team, scores: [s.scores[0], s.scores[1]], abandonedBy: null, ratingChange: null });
    }
    // Los bots que reemplazaban a desconectados se liberan para una revancha.
    this.seats = this.seats.map((occ) => (occ && occ.playerId && occ.abandoned ? null : occ));
    this.server.broadcastRoom(this);
  }

  markLeaver(playerId: string): void {
    this.ratedLeavers.add(playerId);
  }

  ratedLeaver(playerId: string): boolean {
    return this.ratedLeavers.has(playerId);
  }

  broadcastGame(events: GameEvent[], actingSeat: number | null): void {
    const s = this.state!;
    this.seats.forEach((occ, seat) => {
      if (!occ?.playerId || occ.botControlled) return;
      this.server.toPlayer(occ.playerId, 'game:update', { code: this.code, view: viewOf(s, seat), events, deadline: this.deadline, actingSeat });
    });
    const spectatorView = viewOf(s, -1);
    for (const id of this.spectators) {
      this.server.toPlayer(id, 'game:update', { code: this.code, view: spectatorView, events, deadline: this.deadline, actingSeat });
    }
  }

  sendSnapshot(playerId: string): void {
    if (!this.state) return;
    const seat = this.seatOf(playerId);
    const view = viewOf(this.state, seat >= 0 && !this.seats[seat]!.botControlled ? seat : -1);
    this.server.toPlayer(playerId, 'game:update', { code: this.code, view, events: [], deadline: this.deadline, actingSeat: null });
  }

  private later(fn: () => void, ms: number): void {
    const t = setTimeout(() => {
      this.timers = this.timers.filter((x) => x !== t);
      fn();
    }, ms);
    this.timers.push(t);
  }

  private clearTurnTimer(): void {
    if (this.turnTimer) clearTimeout(this.turnTimer);
    this.turnTimer = null;
  }

  clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.clearTurnTimer();
  }

  toState(forPlayer: string): RoomState {
    const yourSeat = this.seatOf(forPlayer);
    return {
      code: this.code,
      config: this.config,
      hostId: this.hostId,
      status: this.status,
      seats: this.seats.map((s, seat) =>
        s
          ? { seat, name: s.name, characterId: s.characterId, level: s.level, bot: s.botControlled, connected: s.connected, human: Boolean(s.playerId) }
          : null,
      ),
      spectators: this.spectators.size,
      yourSeat: yourSeat >= 0 && !this.seats[yourSeat]!.abandoned ? yourSeat : -1,
      quick: this.quick,
    };
  }
}

// ---------------------------------------------------------------------------

export class GameServer {
  readonly players = new Map<string, ServerPlayer>();
  private byToken = new Map<string, string>();
  readonly rooms = new Map<string, Room>();
  private queues = new Map<string, string[]>();
  readonly timeScale: number;
  private readonly grace: number;
  private graceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly io: IO,
    private readonly store: Store,
    opts: ServerOptions = {},
  ) {
    this.timeScale = opts.timeScale ?? 1;
    this.grace = (opts.reconnectGrace ?? 60) * 1000;
    io.on('connection', (socket) => this.onConnection(socket));
  }

  toPlayer<E extends keyof ServerToClient>(playerId: string, event: E, ...args: Parameters<ServerToClient[E]>): void {
    const p = this.players.get(playerId);
    if (!p?.socketId) return;
    (this.io.to(p.socketId).emit as (ev: E, ...a: Parameters<ServerToClient[E]>) => void)(event, ...args);
  }

  notice(room: Room, text: string): void {
    for (const s of room.seats) if (s?.playerId && !s.botControlled) this.toPlayer(s.playerId, 'notice', { text });
    for (const id of room.spectators) this.toPlayer(id, 'notice', { text });
  }

  broadcastRoom(room: Room): void {
    for (const s of room.seats) if (s?.playerId) this.toPlayer(s.playerId, 'room:state', room.toState(s.playerId));
    for (const id of room.spectators) this.toPlayer(id, 'room:state', room.toState(id));
  }

  private newCode(): string {
    for (let i = 0; i < 50; i++) {
      const code = `TRUCO-${randomInt(1000, 10000)}`;
      if (!this.rooms.has(code)) return code;
    }
    return `TRUCO-${randomUUID().slice(0, 6).toUpperCase()}`;
  }

  private onConnection(socket: Sock): void {
    const me = (): ServerPlayer | undefined => this.players.get(socket.data.playerId as string);
    const guard = <T>(ack: unknown, fn: () => T): void => {
      if (typeof ack !== 'function') return;
      try {
        (ack as (r: unknown) => void)(fn());
      } catch (e) {
        (ack as (r: Ack) => void)({ ok: false, error: e instanceof Error ? e.message : 'Error' });
      }
    };

    socket.on('hello', (msg: Hello, ack) =>
      guard(ack, () => {
        const name = cleanName(msg?.name);
        const characterId = CHARACTERS.some((c) => c.id === msg?.characterId) ? msg.characterId : 'pibe';
        const level = Number.isInteger(msg?.level) ? Math.max(1, Math.min(99, msg.level)) : 1;
        let player: ServerPlayer | undefined;
        const token = typeof msg?.token === 'string' ? msg.token : undefined;
        if (token && this.byToken.has(token)) player = this.players.get(this.byToken.get(token)!);
        if (!player) {
          const id = randomUUID();
          const newToken = token && /^[0-9a-f-]{36}$/i.test(token) ? token : randomUUID();
          player = { id, token: newToken, name, characterId, level, socketId: null, roomCode: null, lastChat: 0, queueKey: null, queueSince: 0 };
          this.players.set(id, player);
          this.byToken.set(newToken, id);
        }
        // Una sola conexión activa por jugador.
        if (player.socketId && player.socketId !== socket.id) this.io.sockets.sockets.get(player.socketId)?.disconnect(true);
        player.socketId = socket.id;
        player.name = name;
        player.characterId = characterId;
        player.level = level;
        socket.data.playerId = player.id;
        const grace = this.graceTimers.get(player.id);
        if (grace) clearTimeout(grace);
        this.graceTimers.delete(player.id);
        let resumeCode: string | null = null;
        const room = player.roomCode ? this.rooms.get(player.roomCode) : undefined;
        if (room) {
          const seat = room.seatOf(player.id);
          if (seat >= 0) {
            room.resumeHuman(seat);
            resumeCode = room.code;
            setTimeout(() => {
              this.broadcastRoom(room);
              room.sendSnapshot(player!.id);
            }, 0);
          } else if (room.spectators.has(player.id)) {
            resumeCode = room.code;
            setTimeout(() => room.sendSnapshot(player!.id), 0);
          }
        }
        return { ok: true, data: { token: player.token, playerId: player.id, resumeCode } };
      }),
    );

    socket.on('room:create', (cfg, ack) =>
      guard(ack, () => {
        const p = me();
        if (!p) return { ok: false, error: 'Primero saludá al servidor' };
        const config = validRoomConfig(cfg);
        if (!config) return { ok: false, error: 'Configuración inválida' };
        this.leave(p);
        const room = new Room(this, this.newCode(), config, p.id, false);
        this.rooms.set(room.code, room);
        room.addPlayer(p);
        this.broadcastRoom(room);
        return { ok: true, data: { code: room.code } };
      }),
    );

    socket.on('room:join', (msg, ack) =>
      guard(ack, () => {
        const p = me();
        if (!p) return { ok: false, error: 'Primero saludá al servidor' };
        const code = typeof msg?.code === 'string' ? msg.code.toUpperCase().trim() : '';
        const room = this.rooms.get(code);
        if (!room) return { ok: false, error: 'No existe una mesa con ese código' };
        if (p.roomCode !== room.code) this.leave(p);
        const already = room.seatOf(p.id);
        if (already >= 0) {
          room.resumeHuman(already);
        } else if (msg?.spectate || room.status !== 'esperando' || !room.seats.includes(null)) {
          if (room.config.visibility === 'privada' && room.status === 'jugando' && !msg?.spectate) {
            return { ok: false, error: 'La mesa está completa' };
          }
          room.spectators.add(p.id);
          p.roomCode = room.code;
        } else {
          room.addPlayer(p);
        }
        this.broadcastRoom(room);
        if (room.state) room.sendSnapshot(p.id);
        return { ok: true, data: { code: room.code } };
      }),
    );

    socket.on('room:leave', () => {
      const p = me();
      if (p) this.leave(p);
    });

    socket.on('room:start', (ack) =>
      guard(ack, () => {
        const p = me();
        const room = p?.roomCode ? this.rooms.get(p.roomCode) : undefined;
        if (!p || !room) return { ok: false, error: 'No estás en una mesa' };
        if (room.hostId !== p.id) return { ok: false, error: 'Solo el anfitrión puede empezar' };
        if (room.status === 'jugando') return { ok: false, error: 'La partida ya empezó' };
        room.start();
        return { ok: true };
      }),
    );

    socket.on('room:list', (ack) =>
      guard(ack, () => {
        const list: PublicRoom[] = [...this.rooms.values()]
          .filter((r) => r.config.visibility === 'publica')
          .map((r) => ({
            code: r.code,
            config: r.config,
            status: r.status,
            players: r.humanSeats().length,
            hostName: this.players.get(r.hostId)?.name ?? '—',
          }));
        return { ok: true, data: list };
      }),
    );

    socket.on('queue:join', (msg, ack) =>
      guard(ack, () => {
        const p = me();
        if (!p) return { ok: false, error: 'Primero saludá al servidor' };
        const n = msg?.numPlayers === 4 || msg?.numPlayers === 6 ? msg.numPlayers : 2;
        const target = msg?.target === 30 ? 30 : 15;
        this.leave(p);
        const key = `${n}-${target}`;
        const q = this.queues.get(key) ?? [];
        if (!q.includes(p.id)) q.push(p.id);
        this.queues.set(key, q);
        p.queueKey = key;
        p.queueSince = Date.now();
        this.matchmake(key);
        return { ok: true };
      }),
    );

    socket.on('queue:leave', () => {
      const p = me();
      if (p) this.leaveQueue(p);
    });

    socket.on('queue:fill', (ack) =>
      guard(ack, () => {
        const p = me();
        if (!p?.queueKey) return { ok: false, error: 'No estás buscando partida' };
        this.matchmake(p.queueKey, true);
        return { ok: true };
      }),
    );

    socket.on('game:action', (msg, ack) =>
      guard(ack, () => {
        const p = me();
        const room = p?.roomCode ? this.rooms.get(p.roomCode) : undefined;
        if (!p || !room) return { ok: false, error: 'No estás en una mesa' };
        if (!msg || typeof msg.action !== 'object') return { ok: false, error: 'Acción inválida' };
        return room.handleAction(p.id, msg.action);
      }),
    );

    socket.on('game:sena', (msg, ack) =>
      guard(ack, () => {
        const p = me();
        const room = p?.roomCode ? this.rooms.get(p.roomCode) : undefined;
        if (!p || !room) return { ok: false, error: 'No estás en una mesa' };
        const valid: SenaId[] = ['ancho_espada', 'ancho_basto', 'siete_espada', 'siete_oro', 'tres', 'dos', 'ancho_falso', 'nada', 'flor', 'envido'];
        if (!valid.includes(msg?.sena)) return { ok: false, error: 'Seña inválida' };
        return room.sena(p.id, msg.sena);
      }),
    );

    socket.on('chat:send', (msg, ack) =>
      guard(ack, () => {
        const p = me();
        const room = p?.roomCode ? this.rooms.get(p.roomCode) : undefined;
        if (!p || !room) return { ok: false, error: 'No estás en una mesa' };
        if (Date.now() - p.lastChat < 900) return { ok: false, error: 'Más despacio' };
        const text = cleanText(msg?.text, msg?.kind === 'emote' ? 8 : 140);
        if (!text) return { ok: false, error: 'Mensaje vacío' };
        p.lastChat = Date.now();
        const seat = room.seatOf(p.id);
        const spectator = seat < 0;
        const chat: ChatMessage = {
          id: randomUUID(),
          seat,
          name: p.name,
          text,
          kind: msg?.kind === 'emote' || msg?.kind === 'rapido' ? msg.kind : 'texto',
          teamOnly: Boolean(msg?.teamOnly) && !spectator,
          at: Date.now(),
        };
        if (spectator) {
          for (const id of room.spectators) this.toPlayer(id, 'chat:message', chat);
        } else {
          room.seats.forEach((occ, i) => {
            if (!occ?.playerId) return;
            if (chat.teamOnly && teamOf(i) !== teamOf(seat)) return;
            this.toPlayer(occ.playerId, 'chat:message', chat);
          });
          if (!chat.teamOnly) for (const id of room.spectators) this.toPlayer(id, 'chat:message', chat);
        }
        return { ok: true };
      }),
    );

    socket.on('player:report', (msg, ack) =>
      guard(ack, () => {
        const p = me();
        const room = p?.roomCode ? this.rooms.get(p.roomCode) : undefined;
        if (!p || !room) return { ok: false, error: 'No estás en una mesa' };
        const target = room.seats[msg?.seat];
        if (!target?.playerId) return { ok: false, error: 'Solo se puede denunciar a personas' };
        this.store.addReport({ at: Date.now(), reporter: p.id, target: target.playerId, reason: cleanText(msg?.reason, 200), room: room.code });
        return { ok: true };
      }),
    );

    socket.on('ranking:get', (msg, ack) =>
      guard(ack, () => {
        const period = msg?.period === 'semanal' || msg?.period === 'mensual' ? msg.period : 'global';
        return { ok: true, data: this.store.ranking(50, period) };
      }),
    );

    socket.on('disconnect', () => {
      const p = me();
      if (!p || p.socketId !== socket.id) return;
      p.socketId = null;
      this.leaveQueue(p);
      const room = p.roomCode ? this.rooms.get(p.roomCode) : undefined;
      if (!room) return;
      const seat = room.seatOf(p.id);
      if (seat >= 0) {
        room.seats[seat]!.connected = false;
        this.broadcastRoom(room);
      }
      const graceMs = room.status === 'jugando' ? this.grace : Math.min(this.grace, 20000);
      this.graceTimers.set(
        p.id,
        setTimeout(() => {
          this.graceTimers.delete(p.id);
          if (p.socketId) return;
          if (room.status === 'jugando' && seat >= 0) {
            room.replaceWithBot(seat, 'se desconectó');
          } else {
            this.leave(p);
          }
        }, graceMs),
      );
    });
  }

  private leaveQueue(p: ServerPlayer): void {
    if (!p.queueKey) return;
    const q = this.queues.get(p.queueKey) ?? [];
    this.queues.set(
      p.queueKey,
      q.filter((id) => id !== p.id),
    );
    const key = p.queueKey;
    p.queueKey = null;
    this.queueStatus(key);
  }

  private queueStatus(key: string): void {
    const q = this.queues.get(key) ?? [];
    const needed = Number(key.split('-')[0]);
    for (const id of q) {
      const p = this.players.get(id);
      this.toPlayer(id, 'queue:status', { waiting: q.length, needed, since: p?.queueSince ?? Date.now() });
    }
  }

  /** Arma una mesa pública con la gente que espera (o completa con bots si se pide). */
  private matchmake(key: string, fill = false): void {
    const q = (this.queues.get(key) ?? []).filter((id) => this.players.get(id)?.socketId);
    this.queues.set(key, q);
    const [n, target] = key.split('-').map(Number) as [2 | 4 | 6, 15 | 30];
    if (q.length === 0) return;
    if (q.length < n && !fill) {
      this.queueStatus(key);
      return;
    }
    const group = q.splice(0, n);
    this.queues.set(key, q);
    const room = new Room(this, this.newCode(), { numPlayers: n, target, flor: false, turnSeconds: 30, visibility: 'publica', botDifficulty: 'normal' }, group[0], true);
    this.rooms.set(room.code, room);
    // Repartir a las personas en equipos alternados: 0, 1, 2...
    for (const id of group) {
      const p = this.players.get(id)!;
      p.queueKey = null;
      room.addPlayer(p);
    }
    room.start();
    this.queueStatus(key);
  }

  leave(p: ServerPlayer): void {
    this.leaveQueue(p);
    const room = p.roomCode ? this.rooms.get(p.roomCode) : undefined;
    p.roomCode = null;
    if (!room) return;
    room.spectators.delete(p.id);
    const seat = room.seatOf(p.id);
    if (seat >= 0) {
      if (room.status === 'jugando') {
        const occ = room.seats[seat]!;
        occ.abandoned = true;
        occ.connected = false;
        this.applyLeaverPenalty(room, p.id);
        room.replaceWithBot(seat, 'abandonó la partida');
      } else {
        room.seats[seat] = null;
      }
    }
    const humansLeft = room.seats.some((s) => s?.playerId && !s.abandoned && this.players.get(s.playerId)?.roomCode === room.code);
    if (!humansLeft) {
      room.clearTimers();
      for (const id of room.spectators) {
        this.toPlayer(id, 'room:closed', { reason: 'La mesa se cerró' });
        const sp = this.players.get(id);
        if (sp) sp.roomCode = null;
      }
      this.rooms.delete(room.code);
      return;
    }
    if (room.hostId === p.id) {
      const next = room.seats.find((s) => s?.playerId && !s.abandoned);
      if (next?.playerId) room.hostId = next.playerId;
    }
    this.broadcastRoom(room);
  }

  // -------------------------------------------------------------------------
  // Ranking verificado por el servidor

  private storedRating(id: string): number {
    return this.store.getPlayer(id)?.rating ?? 1000;
  }

  private teamRating(room: Room, team: Team): number {
    const ratings = room.seats
      .map((s, i) => (s && teamOf(i) === team ? (s.playerId && !s.abandoned ? this.storedRating(s.playerId) : BOT_RATING[s.profile.difficulty]) : null))
      .filter((r): r is number => r !== null);
    return ratings.reduce((a, b) => a + b, 0) / Math.max(1, ratings.length);
  }

  private updateRating(room: Room, playerId: string, team: Team, won: boolean): number {
    const p = this.players.get(playerId);
    const mine = this.storedRating(playerId);
    const theirs = this.teamRating(room, (1 - team) as Team);
    const expected = 1 / (1 + Math.pow(10, (theirs - mine) / 400));
    const k = room.seats.some((s) => s && !s.playerId) ? 16 : 28;
    const delta = Math.round(k * ((won ? 1 : 0) - expected));
    const prev = this.store.getPlayer(playerId);
    this.store.upsertPlayer({
      id: playerId,
      name: p?.name ?? prev?.name ?? 'Invitado',
      characterId: p?.characterId ?? prev?.characterId ?? 'pibe',
      rating: mine + delta,
      played: (prev?.played ?? 0) + 1,
      won: (prev?.won ?? 0) + (won ? 1 : 0),
    });
    this.store.addResult({ at: Date.now(), playerId, won, delta });
    return delta;
  }

  private applyLeaverPenalty(room: Room, playerId: string): void {
    if (room.ratedLeaver(playerId)) return;
    room.markLeaver(playerId);
    const seat = room.seatOf(playerId);
    if (seat >= 0) this.updateRating(room, playerId, teamOf(seat), false);
  }

  applyRatings(room: Room, winner: Team): Map<string, number> {
    const out = new Map<string, number>();
    room.seats.forEach((s, seat) => {
      if (!s?.playerId || s.abandoned || room.ratedLeaver(s.playerId)) return;
      out.set(s.playerId, this.updateRating(room, s.playerId, teamOf(seat), teamOf(seat) === winner));
    });
    return out;
  }
}
