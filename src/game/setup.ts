import type { BotProfile, Difficulty } from '../ai/profiles';
import { CHARACTERS, getCharacter } from './characters';

export interface SeatSetup {
  characterId: string;
  name: string;
  human: boolean;
  profile?: BotProfile;
  level?: number;
}

export type MatchMode = 'rapida' | 'personalizada' | 'historia' | 'torneo';

export interface MatchSetup {
  mode: MatchMode;
  numPlayers: 2 | 4 | 6;
  targetScore: 15 | 30;
  flor: boolean;
  difficulty: Difficulty;
  seats: SeatSetup[];
  /** Mesa (cosmético o escenario de la historia). */
  tableId: string;
  clothId: string;
  storyStage?: number;
  tournamentId?: string;
}

export function botSeat(characterId: string, difficulty: Difficulty): SeatSetup {
  const ch = getCharacter(characterId);
  return {
    characterId,
    name: ch.name,
    human: false,
    profile: { difficulty, personality: ch.personality },
    level: difficulty === 'facil' ? 3 + Math.floor(Math.random() * 5) : difficulty === 'normal' ? 10 + Math.floor(Math.random() * 10) : 25 + Math.floor(Math.random() * 15),
  };
}

/**
 * Arma los asientos: el humano en el asiento 0, compañeros en los asientos
 * pares y rivales en los impares (los equipos son asiento % 2).
 */
export function buildSeats(
  human: { name: string; characterId: string; level: number },
  rivals: string[],
  partners: string[],
  difficulty: Difficulty,
  numPlayers: 2 | 4 | 6,
): SeatSetup[] {
  const seats: SeatSetup[] = [];
  const used = new Set<string>([human.characterId]);
  const pool = CHARACTERS.map((c) => c.id).filter((id) => !used.has(id));
  const take = (preferred: string | undefined): string => {
    let id = preferred && !used.has(preferred) ? preferred : undefined;
    if (!id) id = pool.find((p) => !used.has(p)) ?? CHARACTERS[0].id;
    used.add(id);
    return id;
  };
  let r = 0;
  let p = 0;
  for (let seat = 0; seat < numPlayers; seat++) {
    if (seat === 0) {
      seats.push({ characterId: human.characterId, name: human.name, human: true, level: human.level });
    } else if (seat % 2 === 0) {
      seats.push(botSeat(take(partners[p++]), difficulty));
    } else {
      seats.push(botSeat(take(rivals[r++]), difficulty));
    }
  }
  return seats;
}
