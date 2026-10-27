/**
 * Driver local: corre el motor en el navegador y hace jugar a los bots.
 * Cada bot recibe solamente su PlayerView.
 */
import { decide } from '../ai/bot';
import { createMemory, observeHand, type BotMemory } from '../ai/memory';
import { applyAction, createMatch, getLegalActions, getPlayerView, randomSeed, teamOf } from '../engine';
import type { Action, MatchState } from '../engine/types';
import { useGame, type Driver, type Intent, type SeatMeta } from '../store/game';
import { paceFactor } from '../store/settings';
import type { MatchSetup } from './setup';

export interface LocalMatchResult {
  setup: MatchSetup;
  state: MatchState;
  humanWon: boolean;
  abandoned: boolean;
  handsPlayed: number;
  stats: HumanMatchStats;
}

export interface HumanMatchStats {
  trucosCantados: number;
  trucosGanados: number;
  envidosGanados: number;
  faroles: number;
  floresCantadas: number;
  manosGanadas: number;
  noQuieroGanados: number;
}

/** Elige quién tiene que actuar: el humano si puede, si no el primer bot que corresponde. */
export function pickActor(state: MatchState, humanSeat: number): number | null {
  const n = state.config.numPlayers;
  const withActions: number[] = [];
  for (let seat = 0; seat < n; seat++) if (getLegalActions(state, seat).length > 0) withActions.push(seat);
  if (withActions.length === 0) return null;
  if (withActions.includes(humanSeat)) return humanSeat;
  const h = state.hand;
  const pending = h.flor.pending ?? (h.envido.status === 'pending' ? h.envido.calls[h.envido.calls.length - 1] : null) ?? h.truco.pending;
  if (pending) {
    for (let i = 1; i <= n; i++) {
      const seat = (pending.seat + i) % n;
      if (withActions.includes(seat)) return seat;
    }
  }
  return withActions[0];
}

export class LocalDriver implements Driver {
  readonly kind = 'local' as const;
  private state: MatchState;
  private memories: BotMemory[];
  private intents = new Map<number, Intent>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private handsPlayed = 0;
  private stats: HumanMatchStats = { trucosCantados: 0, trucosGanados: 0, envidosGanados: 0, faroles: 0, floresCantadas: 0, manosGanadas: 0, noQuieroGanados: 0 };
  private finished = false;
  private abandoned = false;
  readonly humanSeat = 0;

  constructor(
    readonly setup: MatchSetup,
    private readonly onFinish: (result: LocalMatchResult) => void,
  ) {
    this.state = createMatch(
      { numPlayers: setup.numPlayers, targetScore: setup.targetScore, flor: setup.flor },
      setup.seats.map((s) => s.name),
      { seed: randomSeed() },
    );
    this.memories = setup.seats.map(() => createMemory());
  }

  start(): void {
    const seats: SeatMeta[] = this.setup.seats.map((s) => ({
      name: s.name,
      characterId: s.characterId,
      human: s.human,
      level: s.level ?? 1,
      label: s.human ? undefined : s.profile ? `Bot ${s.profile.difficulty === 'facil' ? 'fácil' : s.profile.difficulty === 'normal' ? 'normal' : 'difícil'}` : 'Bot',
      connected: true,
    }));
    const game = useGame.getState();
    game.begin({
      driver: this,
      seats,
      humanSeat: this.humanSeat,
      view: getPlayerView(this.state, this.humanSeat),
      tableId: this.setup.tableId,
      clothId: this.setup.clothId,
    });
    game.ingest([...this.state.hand.log], getPlayerView(this.state, this.humanSeat));
  }

  intentOf(seat: number): Intent | undefined {
    return this.intents.get(seat);
  }

  private apply(action: Action): void {
    if (this.disposed) return;
    const prevPhase = this.state.phase;
    const res = applyAction(this.state, action);
    this.track(action, res.state);
    this.state = res.state;
    if (prevPhase === 'playing' && this.state.phase !== 'playing') {
      this.handsPlayed++;
      this.state.players.forEach((p) => {
        if (!this.setup.seats[p.seat].human) observeHand(this.memories[p.seat], this.state.lastHandLog, p.seat);
      });
      const res2 = this.state.hand.result;
      if (res2 && res2.winnerTeam === teamOf(this.humanSeat)) {
        this.stats.manosGanadas++;
        if (this.state.hand.truco.level > 0 || res2.reason === 'no_quiero') this.stats.trucosGanados++;
        if (res2.reason === 'no_quiero') this.stats.noQuieroGanados++;
      }
    }
    useGame.getState().ingest(res.events, getPlayerView(this.state, this.humanSeat));
  }

  private track(action: Action, next: MatchState): void {
    if (action.type === 'call' && action.seat === this.humanSeat) {
      if (action.call === 'truco' || action.call === 'retruco' || action.call === 'vale_cuatro') this.stats.trucosCantados++;
      if (action.call === 'flor') this.stats.floresCantadas++;
    }
    const e = next.hand.envido;
    const before = this.state.hand.envido;
    if (before.status !== 'resolved' && e.status === 'resolved' && e.winnerTeam === teamOf(this.humanSeat)) {
      this.stats.envidosGanados++;
    }
  }

  submit(action: Action): void {
    if (this.disposed || this.timer) return;
    if (action.type !== 'next_hand' && 'seat' in action && action.seat !== this.humanSeat) return;
    try {
      this.apply(action);
    } catch {
      // Acción ilegal: se ignora (la interfaz solo ofrece acciones legales).
    }
  }

  onIdle(): void {
    if (this.disposed) return;
    const s = this.state;
    if (s.phase === 'match_over') {
      this.finish();
      return;
    }
    if (s.phase === 'hand_over') {
      this.schedule(() => this.nextHand(), 3400);
      return;
    }
    const actor = pickActor(s, this.humanSeat);
    if (actor === null || actor === this.humanSeat) {
      useGame.getState().setThinking(null);
      return;
    }
    const pendingForBot = s.hand.truco.pending || s.hand.envido.status === 'pending' || s.hand.flor.pending;
    const base = pendingForBot ? 1100 + Math.random() * 900 : 650 + Math.random() * 750;
    useGame.getState().setThinking(actor);
    this.schedule(() => this.botTurn(actor), base);
  }

  private schedule(fn: () => void, ms: number): void {
    if (this.timer) clearTimeout(this.timer);
    const tick = () => {
      if (this.disposed) return;
      if (useGame.getState().paused) {
        this.timer = setTimeout(tick, 200);
        return;
      }
      this.timer = null;
      fn();
    };
    this.timer = setTimeout(tick, ms * paceFactor());
  }

  private botTurn(seat: number): void {
    if (this.disposed || this.state.phase !== 'playing') return;
    const profile = this.setup.seats[seat].profile ?? { difficulty: this.setup.difficulty, personality: 'equilibrado' as const };
    const view = getPlayerView(this.state, seat);
    if (view.legalActions.length === 0) {
      this.onIdle();
      return;
    }
    const decision = decide(view, profile, this.memories[seat], Math.random);
    this.intents.set(seat, decision.intent);
    useGame.getState().setThinking(null);
    this.apply(decision.action);
  }

  private nextHand(): void {
    if (this.disposed || this.state.phase !== 'hand_over') return;
    this.apply({ type: 'next_hand' });
  }

  continueHand(): void {
    if (this.state.phase === 'hand_over' && !useGame.getState().presenting) {
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
      this.nextHand();
    }
  }

  abandon(): void {
    if (this.disposed || this.state.phase === 'match_over') return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.abandoned = true;
    this.apply({ type: 'abandon', team: teamOf(this.humanSeat) });
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    const abandoned = this.abandoned;
    this.onFinish({
      setup: this.setup,
      state: this.state,
      humanWon: this.state.winnerTeam === teamOf(this.humanSeat),
      abandoned,
      handsPlayed: this.handsPlayed,
      stats: this.stats,
    });
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
