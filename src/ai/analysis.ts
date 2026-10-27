/**
 * Análisis probabilístico para los bots.
 *
 * Solo trabaja con la vista pública del jugador (PlayerView): sus propias
 * cartas, las cartas que ya se jugaron, los cantos y los tantos declarados.
 * Las cartas ocultas de los demás se estiman generando repartos posibles
 * coherentes con esa información (muestreo de Monte Carlo) y resolviendo cada
 * reparto con búsqueda minimax.
 */
import { createDeck, envidoPoints, florPoints, hasFlor, trucoValue, type Card } from '../engine/cards';
import { envidoDeclarations, handWinner, teamOf } from '../engine/match';
import type { Team } from '../engine/types';
import type { PlayerView } from '../engine/view';
import { envidoBluffRate, trucoBluffRate, type BotMemory } from './memory';
import type { BotParams } from './profiles';
import { senaDef, type SenaKnowledge, type SenaId } from '../game/senas';

interface SeatInfo {
  seat: number;
  played: Card[];
  unknown: number;
  envidoExact?: number;
  envidoMax?: number;
  flor?: boolean;
  senas?: SenaId[];
  combos?: Card[][];
}

export interface Sample {
  /** Cartas originales de cada asiento (las propias son reales). */
  dealt: Card[][];
  /** Cartas que le quedan a cada asiento. */
  remaining: Card[][];
  weight: number;
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export function handStrength(cards: readonly Card[]): number {
  const values = cards.map(trucoValue).sort((a, b) => b - a);
  return ((values[0] ?? 0) + (values[1] ?? 0)) / 27;
}

function combinations<T>(items: readonly T[], k: number): T[][] {
  const out: T[][] = [];
  const pick: T[] = [];
  const rec = (start: number) => {
    if (pick.length === k) {
      out.push([...pick]);
      return;
    }
    for (let i = start; i <= items.length - (k - pick.length); i++) {
      pick.push(items[i]);
      rec(i + 1);
      pick.pop();
    }
  };
  rec(0);
  return out;
}

// ---------------------------------------------------------------------------
// Resolución exacta de las bazas para un reparto conocido
// ---------------------------------------------------------------------------

interface SimState {
  n: number;
  cards: number[][];
  plays: [number, number][];
  results: (Team | null)[];
  turn: number;
  manoTeam: Team;
}

type StepResult = { winner: Team; next?: undefined } | { winner?: undefined; next: SimState };

function step(st: SimState, seat: number, value: number): StepResult {
  const cards = st.cards.slice();
  const own = cards[seat].slice();
  own.splice(own.indexOf(value), 1);
  cards[seat] = own;
  const plays: [number, number][] = [...st.plays, [seat, value]];
  if (plays.length < st.n) {
    return { next: { ...st, cards, plays, turn: (seat + 1) % st.n } };
  }
  let max = -1;
  for (const [, v] of plays) if (v > max) max = v;
  const top = plays.filter(([, v]) => v === max);
  const teams = new Set(top.map(([s]) => s % 2));
  const winner: Team | null = teams.size === 1 ? ((top[0][0] % 2) as Team) : null;
  const results = [...st.results, winner];
  const hw = handWinner(results, st.manoTeam);
  if (hw !== undefined) return { winner: hw };
  return { next: { ...st, cards, plays: [], results, turn: top[0][0] } };
}

/** 1 si el equipo gana la mano con juego perfecto de todos, 0 si no. */
function solve(st: SimState, myTeam: Team): number {
  const seat = st.turn;
  const maximizing = seat % 2 === myTeam;
  const options = [...new Set(st.cards[seat])];
  for (const v of options) {
    const r = step(st, seat, v);
    const val = r.winner !== undefined ? (r.winner === myTeam ? 1 : 0) : solve(r.next, myTeam);
    if (maximizing && val === 1) return 1;
    if (!maximizing && val === 0) return 0;
  }
  return maximizing ? 0 : 1;
}

// ---------------------------------------------------------------------------

export class Analysis {
  readonly view: PlayerView;
  readonly params: BotParams;
  readonly memory: BotMemory | null;
  readonly random: () => number;
  readonly myTeam: Team;
  private cachedSamples: Sample[] | null = null;
  private cachedWin: number | null = null;
  private cachedEnvido: number | null = null;

  /** Señas que este jugador vio en la mano (de su compañero o pescadas a los rivales). */
  readonly senas: SenaKnowledge[];

  constructor(view: PlayerView, params: BotParams, memory: BotMemory | null, random: () => number, senas: SenaKnowledge[] = []) {
    this.view = view;
    this.params = params;
    this.memory = params.memory ? memory : null;
    this.random = random;
    this.myTeam = teamOf(view.seat);
    this.senas = senas;
  }

  private seatInfos(): SeatInfo[] {
    const v = this.view;
    const h = v.hand;
    const infos: SeatInfo[] = [];
    for (let seat = 0; seat < v.config.numPlayers; seat++) {
      if (seat === v.seat) continue;
      const played = h.bazas.flatMap((b) => b.plays.filter((p) => p.seat === seat).map((p) => p.card));
      const senas = this.senas.filter((k) => k.seat === seat).map((k) => k.sena);
      infos.push({ seat, played, unknown: h.cardCounts[seat], senas: senas.length > 0 ? senas : undefined });
    }
    if (!this.params.inference) return infos;

    // Tantos declarados: información pública exacta.
    let best: number | null = null;
    for (const d of h.envido.declarations) {
      const info = infos.find((i) => i.seat === d.seat);
      if (d.points !== null) {
        best = d.points;
        if (info) info.envidoExact = d.points;
      } else if (info && best !== null) {
        info.envidoMax = best;
      }
    }
    // Flor: es obligatoria, así que quien jugó sin cantarla no la tiene.
    if (v.config.flor) {
      for (const info of infos) {
        if (h.flor.sung.includes(info.seat)) info.flor = true;
        else if (h.flor.closed || h.bazas[0].plays.some((p) => p.seat === info.seat)) info.flor = false;
      }
    }
    return infos;
  }

  private knownCards(): Set<string> {
    const h = this.view.hand;
    const known = new Set<string>(h.myDealt.map((c) => c.id));
    for (const b of h.bazas) for (const p of b.plays) known.add(p.card.id);
    return known;
  }

  private satisfies(info: SeatInfo, extra: readonly Card[]): boolean {
    const dealt = [...info.played, ...extra];
    if (info.envidoExact !== undefined && envidoPoints(dealt) !== info.envidoExact) return false;
    if (info.envidoMax !== undefined && envidoPoints(dealt) > info.envidoMax) return false;
    if (info.flor !== undefined && hasFlor(dealt) !== info.flor) return false;
    if (info.senas && !info.senas.every((id) => senaDef(id).matches(dealt))) return false;
    return true;
  }

  /** Peso de un reparto según lo que sugieren los cantos (los faroles bajan la confianza). */
  private weightOf(dealt: Card[][]): number {
    if (!this.params.inference) return 1;
    const h = this.view.hand;
    let w = 1;
    const trucoCallers = new Set(h.truco.calls.filter((c) => c.seat !== this.view.seat).map((c) => c.seat));
    for (const seat of trucoCallers) {
      const b = Math.min(0.6, trucoBluffRate(this.memory, seat) + this.params.noise);
      w *= b + (1 - b) * sigmoid((handStrength(dealt[seat]) - 0.5) * 9);
    }
    const envidoCallers = new Set(h.envido.calls.filter((c) => c.seat !== this.view.seat).map((c) => c.seat));
    for (const seat of envidoCallers) {
      if (h.envido.declarations.some((d) => d.seat === seat)) continue;
      const b = Math.min(0.6, envidoBluffRate(this.memory, seat));
      w *= b + (1 - b) * sigmoid((envidoPoints(dealt[seat]) - 26) / 2.5);
    }
    // Rivales que rechazaron un envido o lo dejaron pasar probablemente tengan pocos tantos.
    let envidoCalledBefore = false;
    for (const ev of h.log) {
      if (ev.type === 'call' && (ev.call === 'envido' || ev.call === 'real_envido' || ev.call === 'falta_envido')) {
        envidoCalledBefore = true;
      }
      if (ev.type === 'response' && ev.seat !== this.view.seat && ev.response === 'no_quiero') {
        if (ev.to === 'envido' || ev.to === 'real_envido' || ev.to === 'falta_envido') {
          w *= 0.25 + 0.75 * sigmoid((27 - envidoPoints(dealt[ev.seat])) / 2.5);
        }
      }
      if (ev.type === 'card_played' && ev.baza === 0 && !envidoCalledBefore && ev.seat !== this.view.seat) {
        if (teamOf(ev.seat) !== this.myTeam) {
          w *= 0.45 + 0.55 * sigmoid((28 - envidoPoints(dealt[ev.seat])) / 3);
        }
      }
    }
    return w;
  }

  samples(): Sample[] {
    if (this.cachedSamples) return this.cachedSamples;
    const v = this.view;
    const n = v.config.numPlayers;
    const known = this.knownCards();
    const pool = createDeck().filter((c) => !known.has(c.id));
    const infos = this.seatInfos();

    for (const info of infos) {
      const constrained = info.envidoExact !== undefined || info.envidoMax !== undefined || info.flor !== undefined || info.senas !== undefined;
      if (!constrained || info.unknown === 0) continue;
      const combos = combinations(pool, info.unknown).filter((c) => this.satisfies(info, c));
      if (combos.length > 0) info.combos = combos;
    }
    const constrained = infos.filter((i) => i.combos).sort((a, b) => a.combos!.length - b.combos!.length);
    const free = infos.filter((i) => !i.combos);

    const target = Math.max(4, Math.round(this.params.samples / (n >= 6 ? 3 : n >= 4 ? 1.5 : 1)));
    const out: Sample[] = [];
    let attempts = 0;
    while (out.length < target && attempts < target * 8) {
      attempts++;
      const used = new Set<string>();
      const remaining: Card[][] = Array.from({ length: n }, () => []);
      const dealt: Card[][] = Array.from({ length: n }, () => []);
      remaining[v.seat] = v.hand.myCards.slice();
      dealt[v.seat] = v.hand.myDealt.slice();
      let ok = true;
      for (const info of constrained) {
        let chosen: Card[] | null = null;
        for (let t = 0; t < 40; t++) {
          const combo = info.combos![Math.floor(this.random() * info.combos!.length)];
          if (combo.every((c) => !used.has(c.id))) {
            chosen = combo;
            break;
          }
        }
        if (!chosen) {
          ok = false;
          break;
        }
        for (const c of chosen) used.add(c.id);
        remaining[info.seat] = chosen.slice();
        dealt[info.seat] = [...info.played, ...chosen];
      }
      if (!ok) continue;
      const rest = pool.filter((c) => !used.has(c.id));
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      let k = 0;
      for (const info of free) {
        const chosen = rest.slice(k, k + info.unknown);
        k += info.unknown;
        remaining[info.seat] = chosen;
        dealt[info.seat] = [...info.played, ...chosen];
      }
      out.push({ dealt, remaining, weight: this.weightOf(dealt) });
    }
    this.cachedSamples = out;
    return out;
  }

  private simState(sample: Sample): SimState {
    const h = this.view.hand;
    const n = this.view.config.numPlayers;
    const current = h.bazas[h.bazas.length - 1];
    const finished = current.plays.length === n || h.result !== null;
    return {
      n,
      cards: sample.remaining.map((cards) => cards.map(trucoValue)),
      plays: finished ? [] : current.plays.map((p) => [p.seat, trucoValue(p.card)] as [number, number]),
      results: h.bazas.filter((b) => b.winnerTeam !== undefined).map((b) => b.winnerTeam as Team | null),
      turn: h.turn,
      manoTeam: teamOf(h.mano),
    };
  }

  private weighted(fn: (s: Sample) => number): number {
    let total = 0;
    let acc = 0;
    for (const s of this.samples()) {
      total += s.weight;
      acc += s.weight * fn(s);
    }
    return total > 0 ? acc / total : 0.5;
  }

  private jitter(p: number): number {
    if (this.params.noise <= 0) return p;
    return Math.min(1, Math.max(0, p + (this.random() - 0.5) * 2 * this.params.noise));
  }

  /** Probabilidad de que mi equipo gane la mano (truco) desde el estado actual. */
  winProb(): number {
    if (this.cachedWin === null) {
      this.cachedWin = this.jitter(this.weighted((s) => solve(this.simState(s), this.myTeam)));
    }
    return this.cachedWin;
  }

  /** Probabilidad de ganar la mano si juego cada una de mis cartas ahora. */
  cardWinProbs(): Map<string, number> {
    const result = new Map<string, number>();
    const seat = this.view.seat;
    for (const card of this.view.hand.myCards) {
      const value = trucoValue(card);
      result.set(
        card.id,
        this.weighted((s) => {
          const st = this.simState(s);
          if (st.turn !== seat) return solve(st, this.myTeam);
          const r = step(st, seat, value);
          if (r.winner !== undefined) return r.winner === this.myTeam ? 1 : 0;
          return solve(r.next, this.myTeam);
        }),
      );
    }
    return result;
  }

  /** Probabilidad de que mi equipo gane el envido. */
  envidoWinProb(): number {
    if (this.cachedEnvido === null) {
      const mano = this.view.hand.mano;
      this.cachedEnvido = this.jitter(
        this.weighted((s) => (teamOf(envidoDeclarations(s.dealt, mano).winnerSeat) === this.myTeam ? 1 : 0)),
      );
    }
    return this.cachedEnvido;
  }

  /** Probabilidad de que la mejor flor sea de mi equipo. */
  florWinProb(): number {
    const v = this.view;
    const n = v.config.numPlayers;
    return this.jitter(
      this.weighted((s) => {
        let best: { seat: number; pts: number } | null = null;
        for (let i = 0; i < n; i++) {
          const seat = (v.hand.mano + i) % n;
          if (!hasFlor(s.dealt[seat])) continue;
          const pts = florPoints(s.dealt[seat]);
          if (!best || pts > best.pts) best = { seat, pts };
        }
        return best && teamOf(best.seat) === this.myTeam ? 1 : 0;
      }),
    );
  }
}
