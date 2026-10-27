/**
 * Cliente multijugador: conexión con el servidor, estado de la sala y driver
 * de partida online (las acciones se mandan al servidor, que es quien decide).
 */
import { io, type Socket } from 'socket.io-client';
import { create } from 'zustand';
import type { Action } from '../engine/types';
import { levelFromXp } from '../game/progression';
import { senaDef, MAX_SENAS_PER_HAND, type SenaId } from '../game/senas';
import { useGame, type Driver, type SeatMeta } from '../store/game';
import { useNav } from '../store/nav';
import { useProfile } from '../store/profile';
import { useResult } from '../store/result';
import { cosmeticValue } from '../game/cosmetics';
import type { Ack, ChatMessage, ClientToServer, GameEnd, GameUpdate, PublicRoom, RankingEntry, RoomConfig, RoomState, ServerToClient } from './protocol';

type Client = Socket<ServerToClient, ClientToServer>;

export type ConnStatus = 'desconectado' | 'conectando' | 'conectado' | 'sin-servidor';

interface OnlineState {
  status: ConnStatus;
  playerId: string | null;
  error: string | null;
  room: RoomState | null;
  queue: { waiting: number; needed: number; since: number } | null;
  publicRooms: PublicRoom[];
  ranking: RankingEntry[];
  chat: ChatMessage[];
  muted: string[];
  lastEnd: GameEnd | null;
}

export const useOnline = create<OnlineState>()(() => ({
  status: 'desconectado',
  playerId: null,
  error: null,
  room: null,
  queue: null,
  publicRooms: [],
  ranking: [],
  chat: [],
  muted: [],
  lastEnd: null,
}));

const TOKEN_KEY = 'truco-online-token';
const MUTED_KEY = 'truco-online-muted';

function readToken(): string | undefined {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function saveToken(t: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, t);
  } catch {
    /* sin almacenamiento */
  }
}

try {
  useOnline.setState({ muted: JSON.parse(localStorage.getItem(MUTED_KEY) ?? '[]') as string[] });
} catch {
  /* nada */
}

export function serverUrl(): string {
  const env = import.meta.env.VITE_SERVER_URL as string | undefined;
  return env && env.length > 0 ? env : window.location.origin;
}

let socket: Client | null = null;
let driver: OnlineDriver | null = null;

function emitAck<T>(ev: keyof ClientToServer, ...args: unknown[]): Promise<Ack<T>> {
  return new Promise((resolve) => {
    if (!socket?.connected) {
      resolve({ ok: false, error: 'Sin conexión con el servidor' });
      return;
    }
    const timer = setTimeout(() => resolve({ ok: false, error: 'El servidor no respondió' }), 8000);
    (socket.emit as (e: string, ...a: unknown[]) => void)(ev, ...args, (r: Ack<T>) => {
      clearTimeout(timer);
      resolve(r);
    });
  });
}

async function hello(): Promise<void> {
  const p = useProfile.getState();
  const res = await emitAck<{ token: string; playerId: string; resumeCode: string | null }>('hello', {
    token: readToken(),
    name: p.name,
    characterId: p.characterId,
    level: levelFromXp(p.xp).level,
  });
  if (res.ok && res.data) {
    saveToken(res.data.token);
    useOnline.setState({ status: 'conectado', error: null, playerId: res.data.playerId });
  } else {
    useOnline.setState({ error: res.error ?? 'No se pudo entrar' });
  }
}

export function connect(): void {
  if (socket) {
    if (!socket.connected) socket.connect();
    return;
  }
  if (window.location.protocol === 'file:' && !import.meta.env.VITE_SERVER_URL) {
    // Jugar.html abierto con doble clic: no hay servidor en ninguna dirección.
    useOnline.setState({ status: 'sin-servidor', error: 'El juego está abierto como archivo, sin servidor.' });
    return;
  }
  useOnline.setState({ status: 'conectando', error: null });
  socket = io(serverUrl(), { transports: ['websocket', 'polling'], reconnection: true, reconnectionDelay: 1500, timeout: 6000 });
  socket.on('connect', () => void hello());
  socket.on('connect_error', () => {
    useOnline.setState({ status: 'sin-servidor', error: 'No hay un servidor multijugador disponible en esta dirección.' });
  });
  socket.on('disconnect', () => {
    useOnline.setState({ status: 'desconectado' });
    if (driver) useGame.getState().notify('Se cortó la conexión. Reconectando…', false);
  });
  socket.on('room:state', (room) => {
    useOnline.setState({ room, queue: null });
    if (driver) {
      room.seats.forEach((s, i) => s && useGame.getState().setSeatConnected(i, s.connected && !(s.human && s.bot)));
    }
  });
  socket.on('room:closed', ({ reason }) => {
    useOnline.setState({ room: null, error: reason });
  });
  socket.on('queue:status', (queue) => useOnline.setState({ queue }));
  socket.on('notice', ({ text }) => {
    if (driver) useGame.getState().notify(text, null);
    else useOnline.setState({ error: text });
  });
  socket.on('chat:message', (msg) => {
    if (useOnline.getState().muted.includes(msg.name)) return;
    useOnline.setState((s) => ({ chat: [...s.chat.slice(-40), msg] }));
    if (driver && msg.seat >= 0 && msg.seat !== useGame.getState().view?.seat) {
      useGame.getState().say(msg.seat, msg.teamOnly ? `(equipo) ${msg.text}` : msg.text, 'chat');
    }
  });
  socket.on('game:update', (u) => onGameUpdate(u));
  socket.on('game:end', (e) => onGameEnd(e));
  socket.on('game:sena', ({ seat, sena, rival, mine }) => {
    const game = useGame.getState();
    if (!driver) return;
    if (mine) {
      game.showSena(seat, sena, { known: false, rival: false });
      return;
    }
    const label = senaDef(sena).label;
    game.showSena(seat, sena, { known: true, rival, caption: rival ? `¡Le viste la seña! ${label}` : `Seña: ${label}` });
  });
}

/** Vuelve a presentarse (por ejemplo, después de cambiar el nombre). */
export function rehello(): void {
  if (socket?.connected) void hello();
}

export function disconnect(): void {
  socket?.disconnect();
  socket = null;
  useOnline.setState({ status: 'desconectado', room: null, queue: null });
}

function seatsFromRoom(room: RoomState): SeatMeta[] {
  return room.seats.map((s, i) =>
    s
      ? { name: s.name, characterId: s.characterId, human: s.human && !s.bot, level: s.level, label: s.bot ? 'Bot' : undefined, connected: s.connected }
      : { name: `Asiento ${i + 1}`, characterId: 'rulo', human: false, level: 1, connected: false },
  );
}

function onGameUpdate(u: GameUpdate): void {
  const room = useOnline.getState().room;
  if (!room || room.code !== u.code) return;
  const game = useGame.getState();
  if (!driver || driver.code !== u.code || !game.active) {
    driver?.dispose();
    driver = new OnlineDriver(u.code);
    const p = useProfile.getState();
    useResult.setState({ info: null });
    game.begin({
      driver,
      seats: seatsFromRoom(room),
      humanSeat: u.view.seat < 0 ? 0 : u.view.seat,
      view: u.view,
      tableId: cosmeticValue(p.equipped.mesa),
      clothId: cosmeticValue(p.equipped.paño),
    });
    useNav.getState().go('partida');
    // Al entrar en una partida ya empezada se muestra el estado sin animar todo lo anterior.
    useGame.getState().ingest(u.events.length > 0 ? u.events : [], u.view);
  } else {
    game.ingest(u.events, u.view);
  }
  useGame.getState().setDeadline(u.deadline);
}

function onGameEnd(e: GameEnd): void {
  useOnline.setState({ lastEnd: e });
  const game = useGame.getState();
  const view = game.view;
  if (!view || view.seat < 0 || !driver) return;
  const myTeam = (view.seat % 2) as 0 | 1;
  const won = e.winnerTeam === myTeam;
  const profile = useProfile.getState();
  const room = useOnline.getState().room;
  const opponents = (room?.seats ?? []).filter((s, i) => s && i % 2 !== myTeam).map((s) => ({ name: s!.name, characterId: s!.characterId }));
  const xpBefore = profile.xp;
  const rpBefore = profile.rp;
  const recorded = profile.recordMatch({
    mode: 'online',
    opponents,
    won,
    abandoned: false,
    scores: [e.scores[myTeam], e.scores[1 - myTeam]],
    target: view.config.targetScore,
    difficulty: 'dificil',
    trucosGanados: 0,
    envidosGanados: 0,
    flores: 0,
  });
  useResult.setState({
    info: {
      setup: {
        mode: 'personalizada',
        numPlayers: view.config.numPlayers,
        targetScore: view.config.targetScore,
        flor: view.config.flor,
        difficulty: 'normal',
        seats: [],
        tableId: game.tableId,
        clothId: game.clothId,
      },
      won,
      abandoned: false,
      scores: [e.scores[myTeam], e.scores[1 - myTeam]],
      rewards: { ...recorded.rewards, rp: e.ratingChange ?? recorded.rewards.rp },
      newBadges: recorded.newBadges,
      levelBefore: recorded.levelBefore,
      levelAfter: recorded.levelAfter,
      rankUp: recorded.rankUp,
      xpBefore,
      rpBefore,
    },
  });
}

class OnlineDriver implements Driver {
  readonly kind = 'online' as const;
  private senasLeftCount = MAX_SENAS_PER_HAND;
  private senaHand = 0;
  private disposed = false;

  constructor(readonly code: string) {}

  submit(action: Action): void {
    void emitAck('game:action', { action }).then((r) => {
      if (!r.ok) useGame.getState().notify(r.error ?? 'Acción rechazada', false);
    });
  }

  onIdle(): void {
    useGame.getState().setThinking(null);
  }

  continueHand(): void {
    // El servidor reparte la mano siguiente solo.
  }

  abandon(): void {
    socket?.emit('room:leave');
    useOnline.setState({ room: null });
  }

  senasLeft(): number {
    const n = useGame.getState().view?.hand.number ?? 0;
    if (n !== this.senaHand) {
      this.senaHand = n;
      this.senasLeftCount = MAX_SENAS_PER_HAND;
    }
    return (useGame.getState().view?.config.numPlayers ?? 2) >= 4 ? this.senasLeftCount : 0;
  }

  sena(sena: SenaId): void {
    void emitAck<{ left: number }>('game:sena', { sena }).then((r) => {
      if (r.ok && r.data) this.senasLeftCount = r.data.left;
      else useGame.getState().notify(r.error ?? 'No se pudo hacer la seña', false);
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (driver === this) driver = null;
  }
}

// ---------------------------------------------------------------------------
// Acciones de la interfaz

export const online = {
  createRoom: (cfg: RoomConfig) => emitAck<{ code: string }>('room:create', cfg),
  joinRoom: (code: string, spectate = false) => emitAck<{ code: string }>('room:join', { code, spectate }),
  leaveRoom: () => {
    socket?.emit('room:leave');
    useOnline.setState({ room: null });
  },
  start: () => emitAck('room:start'),
  listRooms: async () => {
    const r = await emitAck<PublicRoom[]>('room:list');
    if (r.ok && r.data) useOnline.setState({ publicRooms: r.data });
    return r;
  },
  queue: (numPlayers: 2 | 4 | 6, target: 15 | 30) => emitAck('queue:join', { numPlayers, target }),
  leaveQueue: () => {
    socket?.emit('queue:leave');
    useOnline.setState({ queue: null });
  },
  fillWithBots: () => emitAck('queue:fill'),
  chat: (text: string, kind: ChatMessage['kind'], teamOnly: boolean) => emitAck('chat:send', { text, kind, teamOnly }),
  report: (seat: number, reason: string) => emitAck('player:report', { seat, reason }),
  ranking: async (period: 'global' | 'semanal' | 'mensual' = 'global') => {
    const r = await emitAck<RankingEntry[]>('ranking:get', { period });
    if (r.ok && r.data) useOnline.setState({ ranking: r.data });
    return r;
  },
  mute: (name: string) => {
    const muted = [...new Set([...useOnline.getState().muted, name])];
    useOnline.setState({ muted });
    try {
      localStorage.setItem(MUTED_KEY, JSON.stringify(muted));
    } catch {
      /* nada */
    }
  },
};

export function onlineDriverActive(): boolean {
  return driver !== null;
}
