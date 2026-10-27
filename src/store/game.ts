/**
 * Estado de la partida en pantalla.
 *
 * El motor de reglas aplica las acciones al instante; este store reproduce los
 * eventos resultantes de a uno (con pausas, sonidos, voces y animaciones) para
 * que el jugador entienda qué pasa. El "driver" decide de dónde salen las
 * acciones: bots locales o un servidor online.
 */
import { create } from 'zustand';
import { trucoValue } from '../engine/cards';
import { teamOf } from '../engine/match';
import type { Action, Call, GameEvent, HandEndReason, Team } from '../engine/types';
import type { PlayerView } from '../engine/view';
import { getCharacter, pickPhrase, type PhraseKey } from '../game/characters';
import { sfx, type CallSound } from '../audio/sfx';
import { speak } from '../audio/voice';
import { paceFactor, useSettings } from './settings';
import type { Expression } from '../ui/art/Avatar';

export interface SeatMeta {
  name: string;
  characterId: string;
  human: boolean;
  level: number;
  label?: string;
  connected: boolean;
}

export interface Bubble {
  id: number;
  text: string;
  kind: 'canto' | 'respuesta' | 'tantos' | 'frase' | 'chat';
}

export interface Banner {
  id: number;
  seat: number;
  call: Call;
}

export interface Toast {
  id: number;
  text: string;
  good: boolean | null;
}

export interface HandSummary {
  winnerTeam: Team;
  points: number;
  reason: HandEndReason;
  lines: { text: string; good: boolean }[];
}

export interface MatchOutcome {
  winnerTeam: Team;
  humanWon: boolean;
  scores: [number, number];
  abandoned: boolean;
}

export type Intent = 'normal' | 'farol' | 'fuerte' | 'debil';

export interface Driver {
  kind: 'local' | 'online';
  submit(action: Action): void;
  onIdle(): void;
  continueHand(): void;
  abandon(): void;
  dispose(): void;
  intentOf?(seat: number): Intent | undefined;
}

interface GameState {
  active: boolean;
  driver: Driver | null;
  seats: SeatMeta[];
  humanSeat: number;
  view: PlayerView | null;
  displayScores: [number, number];
  presenting: boolean;
  thinkingSeat: number | null;
  dealing: boolean;
  banner: Banner | null;
  bubbles: Record<number, Bubble>;
  expressions: Record<number, Expression>;
  toasts: Toast[];
  pointsFx: { id: number; team: Team; points: number }[];
  bazaHighlight: { baza: number; seat: number | null } | null;
  handSummary: HandSummary | null;
  outcome: MatchOutcome | null;
  paused: boolean;
  cameraKick: { id: number; strength: number } | null;
  tableId: string;
  clothId: string;
  /** Tiempo límite del turno en partidas online (ms epoch) */
  turnDeadline: number | null;

  begin(opts: { driver: Driver; seats: SeatMeta[]; humanSeat: number; view: PlayerView; tableId: string; clothId: string }): void;
  ingest(events: GameEvent[], view: PlayerView): void;
  humanAct(action: Action, opts?: { spokenText?: string }): void;
  notify(text: string, good?: boolean | null): void;
  setThinking(seat: number | null): void;
  continueHand(): void;
  setPaused(paused: boolean): void;
  abandon(): void;
  end(): void;
  say(seat: number, text: string, kind?: Bubble['kind']): void;
  setSeatConnected(seat: number, connected: boolean): void;
  setDeadline(deadline: number | null): void;
}

let uid = 1;
let session = 0;
let queue: GameEvent[] = [];
let running = false;
/** Texto dicho por micrófono: reemplaza la frase del personaje y no se reproduce con voz. */
const spokenOverride = new Map<number, string>();
const exprTimers = new Map<number, ReturnType<typeof setTimeout>>();
const bubbleTimers = new Map<number, ReturnType<typeof setTimeout>>();

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms * paceFactor()));

const CALL_LABEL: Record<Call, string> = {
  truco: '¡Truco!',
  retruco: '¡Retruco!',
  vale_cuatro: '¡Vale cuatro!',
  envido: '¡Envido!',
  real_envido: '¡Real envido!',
  falta_envido: '¡Falta envido!',
  flor: '¡Flor!',
  contraflor: '¡Contraflor!',
  contraflor_al_resto: '¡Contraflor al resto!',
};

export function callLabel(call: Call): string {
  return CALL_LABEL[call];
}

function callSound(call: Call): CallSound {
  if (call === 'truco' || call === 'retruco' || call === 'vale_cuatro') return call;
  if (call === 'flor' || call === 'contraflor' || call === 'contraflor_al_resto') return 'flor';
  return 'envido';
}

export const useGame = create<GameState>()((set, get) => {
  const isCurrent = (s: number) => s === session && get().active;

  const setExpression = (seat: number, expr: Expression, ms = 2800) => {
    set((st) => ({ expressions: { ...st.expressions, [seat]: expr } }));
    const prev = exprTimers.get(seat);
    if (prev) clearTimeout(prev);
    exprTimers.set(
      seat,
      setTimeout(() => set((st) => ({ expressions: { ...st.expressions, [seat]: 'neutral' } })), ms),
    );
  };

  const showBubble = (seat: number, text: string, kind: Bubble['kind'], ms = 2400) => {
    const id = uid++;
    set((st) => ({ bubbles: { ...st.bubbles, [seat]: { id, text, kind } } }));
    const prev = bubbleTimers.get(seat);
    if (prev) clearTimeout(prev);
    bubbleTimers.set(
      seat,
      setTimeout(() => {
        set((st) => {
          if (st.bubbles[seat]?.id !== id) return st;
          const next = { ...st.bubbles };
          delete next[seat];
          return { bubbles: next };
        });
      }, ms * Math.max(0.7, paceFactor())),
    );
  };

  const toast = (text: string, good: boolean | null) => {
    const id = uid++;
    set((st) => ({ toasts: [...st.toasts.slice(-2), { id, text, good }] }));
    setTimeout(() => set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) })), 2600);
  };

  const phrase = (seat: number, key: PhraseKey, kind: Bubble['kind'], vars?: Record<string, number | string>) => {
    const meta = get().seats[seat];
    if (!meta) return;
    const ch = getCharacter(meta.characterId);
    const spoken = spokenOverride.get(seat);
    if (spoken !== undefined && (kind === 'canto' || kind === 'respuesta')) {
      spokenOverride.delete(seat);
      showBubble(seat, `🎤 ${spoken}`, kind);
      return;
    }
    const text = pickPhrase(ch, key, vars);
    showBubble(seat, text, kind);
    speak(ch, key, text);
  };

  const humanTeam = () => teamOf(get().humanSeat);
  const teamName = (team: Team) => (team === humanTeam() ? 'Nosotros' : 'Ellos');
  const intentOf = (seat: number) => get().driver?.intentOf?.(seat);
  const isBot = (seat: number) => !get().seats[seat]?.human;

  async function present(ev: GameEvent, s: number): Promise<void> {
    const st = get();
    const n = st.seats.length;
    switch (ev.type) {
      case 'hand_start': {
        set({ dealing: true, bazaHighlight: null, handSummary: null, banner: null, bubbles: {} });
        sfx.collect();
        await sleep(350);
        sfx.shuffle();
        await sleep(850);
        for (let i = 0; i < n * 3; i++) {
          setTimeout(() => sfx.deal(), i * 95 * paceFactor());
        }
        await sleep(n * 3 * 95 + 450);
        set({ dealing: false });
        return;
      }
      case 'card_played': {
        sfx.cardWhoosh();
        setTimeout(() => sfx.cardSlap(trucoValue(ev.card) >= 12 ? 1.25 : 1), 230 * paceFactor());
        if (isBot(ev.seat) && trucoValue(ev.card) >= 12 && Math.random() < 0.35) {
          setTimeout(() => isCurrent(s) && phrase(ev.seat, 'carta_brava', 'frase'), 300);
          setExpression(ev.seat, 'smug');
        }
        await sleep(560);
        return;
      }
      case 'baza_end': {
        set({ bazaHighlight: { baza: ev.baza, seat: ev.winnerSeat } });
        if (ev.winnerTeam === null) {
          toast('¡Parda!', null);
          sfx.bazaLose();
        } else if (ev.winnerTeam === humanTeam()) sfx.bazaWin();
        else sfx.bazaLose();
        if (ev.winnerSeat !== null) {
          setExpression(ev.winnerSeat, 'happy', 1800);
          if (isBot(ev.winnerSeat) && Math.random() < 0.22) phrase(ev.winnerSeat, 'gana_baza', 'frase');
        }
        await sleep(820);
        return;
      }
      case 'call': {
        const truco = ev.call === 'truco' || ev.call === 'retruco' || ev.call === 'vale_cuatro';
        const strength = ev.call === 'vale_cuatro' || ev.call === 'falta_envido' || ev.call === 'contraflor_al_resto' ? 2 : truco ? 1 : 0.6;
        set({ banner: { id: uid++, seat: ev.seat, call: ev.call }, cameraKick: { id: uid++, strength } });
        sfx.call(callSound(ev.call));
        if (strength >= 2) setTimeout(() => sfx.crowd('uh'), 250);
        phrase(ev.seat, ev.call as PhraseKey, 'canto');
        const intent = intentOf(ev.seat);
        setExpression(ev.seat, intent === 'farol' || intent === 'fuerte' ? 'smug' : 'happy');
        for (let seat = 0; seat < n; seat++) {
          if (teamOf(seat) !== teamOf(ev.seat)) setExpression(seat, truco ? 'surprised' : 'thinking', 2000);
        }
        await sleep(strength >= 2 ? 1500 : 1250);
        set({ banner: null });
        return;
      }
      case 'response': {
        sfx.call('respuesta');
        const intent = intentOf(ev.seat);
        if (ev.response === 'quiero') {
          phrase(ev.seat, intent === 'fuerte' || intent === 'farol' || !isBot(ev.seat) ? 'quiero' : 'quiero_dudoso', 'respuesta');
          setExpression(ev.seat, intent === 'debil' ? 'thinking' : 'smug');
        } else if (ev.response === 'no_quiero') {
          phrase(ev.seat, 'no_quiero', 'respuesta');
          setExpression(ev.seat, 'sad');
        } else {
          phrase(ev.seat, 'me_achico', 'respuesta');
          setExpression(ev.seat, 'sad');
        }
        await sleep(950);
        return;
      }
      case 'envido_declaration': {
        const decls = get().view?.hand.envido.declarations ?? [];
        const idx = decls.findIndex((d) => d.seat === ev.seat && d.points === ev.points);
        const first = idx <= 0;
        if (ev.points === null) {
          phrase(ev.seat, 'son_buenas', 'tantos');
          setExpression(ev.seat, 'sad', 1800);
        } else {
          phrase(ev.seat, first ? 'tengo' : 'mejores', 'tantos', { n: ev.points });
          setExpression(ev.seat, ev.points >= 30 ? 'smug' : 'neutral', 1800);
        }
        await sleep(1150);
        return;
      }
      case 'envido_result': {
        const good = ev.winnerTeam === humanTeam();
        toast(`${ev.accepted ? 'Envido' : 'Envido no querido'}: +${ev.points} ${teamName(ev.winnerTeam)}`, good);
        if (ev.accepted && ev.points >= 3 && useSettings.getState().puteadas) {
          const loserBot = get().seats.findIndex((m, i) => !m.human && teamOf(i) !== ev.winnerTeam);
          if (loserBot >= 0 && Math.random() < 0.45) setTimeout(() => isCurrent(s) && phrase(loserBot, 'puteada_pierde', 'frase'), 350);
        }
        await sleep(650);
        return;
      }
      case 'flor_result': {
        const good = ev.team === humanTeam();
        const label =
          ev.reason === 'flor' ? 'Flor' : ev.reason === 'flor_achico' ? 'Con flor me achico' : ev.reason === 'contraflor' ? 'Contraflor' : 'Contraflor no querida';
        toast(`${label}: +${ev.points} ${teamName(ev.team)}`, good);
        await sleep(900);
        return;
      }
      case 'mazo': {
        phrase(ev.seat, 'mazo', 'respuesta');
        setExpression(ev.seat, 'sad');
        await sleep(850);
        return;
      }
      case 'score': {
        set({ displayScores: ev.scores, pointsFx: [...get().pointsFx.slice(-3), { id: uid++, team: ev.team, points: ev.points }] });
        sfx.points(ev.points);
        await sleep(420);
        return;
      }
      case 'hand_end': {
        const view = get().view;
        const lines: HandSummary['lines'] = [];
        const log = view?.hand.log ?? [];
        for (const e of log) {
          if (e.type === 'envido_result') {
            lines.push({ text: `${e.accepted ? 'Envido' : 'Envido no querido'}: +${e.points} ${teamName(e.winnerTeam)}`, good: e.winnerTeam === humanTeam() });
          }
          if (e.type === 'flor_result') lines.push({ text: `Flor: +${e.points} ${teamName(e.team)}`, good: e.team === humanTeam() });
        }
        const reasonText =
          ev.reason === 'no_quiero' ? 'No quisieron el truco' : ev.reason === 'mazo' ? 'Se fueron al mazo' : ev.points > 1 ? 'Truco ganado' : 'Ganó la mano';
        lines.push({ text: `${reasonText}: +${ev.points} ${teamName(ev.winnerTeam)}`, good: ev.winnerTeam === humanTeam() });
        set({ handSummary: { winnerTeam: ev.winnerTeam, points: ev.points, reason: ev.reason, lines } });
        // Reacciones de los personajes
        const winners = get().seats.map((_, i) => i).filter((i) => teamOf(i) === ev.winnerTeam);
        const losers = get().seats.map((_, i) => i).filter((i) => teamOf(i) !== ev.winnerTeam);
        winners.forEach((i) => setExpression(i, 'laugh', 2600));
        losers.forEach((i) => setExpression(i, getCharacter(get().seats[i].characterId).id === 'tano' ? 'angry' : 'sad', 2600));
        const botWinner = winners.find((i) => isBot(i));
        const botLoser = losers.find((i) => isBot(i));
        const strong = useSettings.getState().puteadas;
        if (strong && botLoser !== undefined && Math.random() < (ev.points >= 2 ? 0.6 : 0.35)) {
          phrase(botLoser, 'puteada_pierde', 'frase');
        } else if (strong && botWinner !== undefined && Math.random() < 0.25) {
          phrase(botWinner, 'puteada_gana', 'frase');
        } else if (ev.reason === 'no_quiero' && botWinner !== undefined) {
          const caller = [...log].reverse().find((e) => e.type === 'call');
          const who = caller && caller.type === 'call' && teamOf(caller.seat) === ev.winnerTeam ? caller.seat : botWinner;
          if (isBot(who) && Math.random() < 0.65) phrase(who, 'no_te_animas', 'frase');
        } else if (botWinner !== undefined && ev.reason === 'bazas' && Math.random() < 0.4) {
          phrase(botWinner, 'gana_mano', 'frase');
        } else if (botLoser !== undefined && Math.random() < 0.3) {
          phrase(botLoser, 'pierde_mano', 'frase');
        }
        await sleep(350);
        return;
      }
      case 'match_end': {
        const hw = ev.winnerTeam === humanTeam();
        const abandoned = (get().view?.hand.result?.reason ?? '') === 'abandono';
        set({ outcome: { winnerTeam: ev.winnerTeam, humanWon: hw, scores: ev.scores, abandoned }, handSummary: null, displayScores: ev.scores });
        if (hw) sfx.victory();
        else sfx.defeat();
        const seats = get().seats;
        seats.forEach((_, i) => setExpression(i, teamOf(i) === ev.winnerTeam ? 'laugh' : 'sad', 6000));
        const botWinner = seats.findIndex((m, i) => !m.human && teamOf(i) === ev.winnerTeam);
        const botLoser = seats.findIndex((m, i) => !m.human && teamOf(i) !== ev.winnerTeam);
        if (botWinner >= 0) phrase(botWinner, 'victoria', 'frase');
        else if (botLoser >= 0) phrase(botLoser, 'derrota', 'frase');
        await sleep(600);
        return;
      }
    }
  }

  async function run(s: number): Promise<void> {
    running = true;
    set({ presenting: true });
    while (queue.length > 0) {
      while (get().paused && isCurrent(s)) await new Promise((r) => setTimeout(r, 150));
      if (!isCurrent(s)) return;
      const ev = queue.shift()!;
      await present(ev, s);
      if (!isCurrent(s)) return;
    }
    running = false;
    set({ presenting: false });
    get().driver?.onIdle();
  }

  return {
    active: false,
    driver: null,
    seats: [],
    humanSeat: 0,
    view: null,
    displayScores: [0, 0],
    presenting: false,
    thinkingSeat: null,
    dealing: false,
    banner: null,
    bubbles: {},
    expressions: {},
    toasts: [],
    pointsFx: [],
    bazaHighlight: null,
    handSummary: null,
    outcome: null,
    paused: false,
    cameraKick: null,
    tableId: 'bodegon',
    clothId: 'verde',
    turnDeadline: null,

    begin({ driver, seats, humanSeat, view, tableId, clothId }) {
      get().driver?.dispose();
      session++;
      queue = [];
      running = false;
      set({
        active: true,
        driver,
        seats,
        humanSeat,
        view,
        displayScores: [...view.scores] as [number, number],
        presenting: false,
        thinkingSeat: null,
        dealing: false,
        banner: null,
        bubbles: {},
        expressions: {},
        toasts: [],
        pointsFx: [],
        bazaHighlight: null,
        handSummary: null,
        outcome: null,
        paused: false,
        tableId,
        clothId,
        turnDeadline: null,
      });
      // Saludo del primer rival
      const rival = seats.findIndex((m, i) => !m.human && teamOf(i) !== teamOf(humanSeat));
      if (rival >= 0) setTimeout(() => get().active && phrase(rival, 'saludo', 'frase'), 600);
    },

    ingest(events, view) {
      set({ view });
      queue.push(...events);
      if (!running) void run(session);
    },

    humanAct(action, opts) {
      const st = get();
      if (!st.view || st.presenting || st.paused || st.outcome) return;
      const legal = st.view.legalActions.some((a) => JSON.stringify(a) === JSON.stringify(action));
      if (!legal) return;
      if (opts?.spokenText && (action.type === 'call' || action.type === 'respond' || action.type === 'mazo')) {
        spokenOverride.set(st.view.seat, opts.spokenText);
      }
      st.driver?.submit(action);
    },

    notify(text, good = null) {
      toast(text, good);
    },

    setThinking(seat) {
      set({ thinkingSeat: seat });
      if (seat !== null) setExpression(seat, 'thinking', 1600);
    },

    continueHand() {
      get().driver?.continueHand();
    },

    setPaused(paused) {
      set({ paused });
    },

    abandon() {
      get().driver?.abandon();
    },

    end() {
      get().driver?.dispose();
      session++;
      queue = [];
      running = false;
      set({ active: false, driver: null, view: null, outcome: null, handSummary: null, banner: null, bubbles: {}, paused: false });
    },

    say(seat, text, kind = 'chat') {
      showBubble(seat, text, kind, 3000);
    },

    setSeatConnected(seat, connected) {
      set((st) => ({ seats: st.seats.map((m, i) => (i === seat ? { ...m, connected } : m)) }));
    },

    setDeadline(deadline) {
      set({ turnDeadline: deadline });
    },
  };
});

/** El jugador humano puede actuar ahora. */
export function canHumanAct(st: Pick<GameState, 'view' | 'presenting' | 'paused' | 'outcome'>): boolean {
  return Boolean(st.view && !st.presenting && !st.paused && !st.outcome && st.view.legalActions.length > 0);
}
