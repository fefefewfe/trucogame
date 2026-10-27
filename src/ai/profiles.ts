export type Difficulty = 'facil' | 'normal' | 'dificil';
export type Personality = 'agresivo' | 'conservador' | 'mentiroso' | 'equilibrado' | 'experto';

export interface BotProfile {
  difficulty: Difficulty;
  personality: Personality;
  /** Ajustes finos por personaje (por ejemplo, un rival de historia más mentiroso). */
  tuning?: Partial<BotParams>;
}

/** Parámetros numéricos que derivan de la dificultad y la personalidad. */
export interface BotParams {
  /** Cantidad de repartos simulados para estimar probabilidades. */
  samples: number;
  /** Probabilidad de jugar una carta sin pensar (errores de principiante). */
  mistakeRate: number;
  /** Usa lo que dicen los cantos y los tantos declarados para deducir cartas. */
  inference: boolean;
  /** Recuerda el estilo del rival entre manos (faroles, cuándo se achica). */
  memory: boolean;
  /** Ajusta el riesgo según el marcador. */
  scoreAware: boolean;
  /** Probabilidad de ganar la mano necesaria para cantar truco. */
  trucoCall: number;
  /** Probabilidad necesaria para subir (retruco / vale cuatro). */
  trucoRaise: number;
  /** Corrimiento del umbral para aceptar un truco (positivo = acepta más). */
  acceptBias: number;
  /** Frecuencia base de faroles con el truco. */
  bluff: number;
  /** Probabilidad de ganar el envido necesaria para cantarlo. */
  envidoCall: number;
  /** Frecuencia de faroles con el envido. */
  envidoBluff: number;
  /** Probabilidad de esperar (no cantar) con una mano muy fuerte para que el rival se confíe. */
  slowPlay: number;
  /** Ruido aleatorio que se suma a las estimaciones (los fáciles se equivocan más). */
  noise: number;
}

const BASE: Record<Difficulty, BotParams> = {
  facil: {
    samples: 8,
    mistakeRate: 0.35,
    inference: false,
    memory: false,
    scoreAware: false,
    trucoCall: 0.6,
    trucoRaise: 0.8,
    acceptBias: 0.12,
    bluff: 0.12,
    envidoCall: 0.55,
    envidoBluff: 0.08,
    slowPlay: 0,
    noise: 0.25,
  },
  normal: {
    samples: 36,
    mistakeRate: 0.06,
    inference: true,
    memory: false,
    scoreAware: true,
    trucoCall: 0.66,
    trucoRaise: 0.78,
    acceptBias: 0,
    bluff: 0.08,
    envidoCall: 0.6,
    envidoBluff: 0.06,
    slowPlay: 0.15,
    noise: 0.06,
  },
  dificil: {
    samples: 80,
    mistakeRate: 0,
    inference: true,
    memory: true,
    scoreAware: true,
    trucoCall: 0.64,
    trucoRaise: 0.76,
    acceptBias: 0,
    bluff: 0.1,
    envidoCall: 0.6,
    envidoBluff: 0.08,
    slowPlay: 0.3,
    noise: 0,
  },
};

const PERSONALITY: Record<Personality, Partial<Record<keyof BotParams, number>>> = {
  agresivo: { trucoCall: -0.08, trucoRaise: -0.06, acceptBias: 0.06, bluff: 0.08, envidoCall: -0.08, envidoBluff: 0.05, slowPlay: -0.1 },
  conservador: { trucoCall: 0.07, trucoRaise: 0.02, acceptBias: -0.05, bluff: -0.06, envidoCall: 0.07, envidoBluff: -0.05, slowPlay: 0.05 },
  mentiroso: { bluff: 0.16, envidoBluff: 0.12, slowPlay: 0.15, acceptBias: 0.02 },
  equilibrado: {},
  experto: { bluff: 0.03, slowPlay: 0.1, acceptBias: 0.01 },
};

export function botParams(profile: BotProfile): BotParams {
  const p = { ...BASE[profile.difficulty] };
  const mod = PERSONALITY[profile.personality];
  for (const key of Object.keys(mod) as (keyof BotParams)[]) {
    const delta = mod[key]!;
    (p[key] as number) = Math.max(0, (p[key] as number) + delta);
  }
  if (profile.personality === 'experto' && profile.difficulty !== 'facil') {
    p.memory = true;
    p.samples = Math.max(p.samples, 60);
  }
  return { ...p, ...profile.tuning };
}

export const PERSONALITY_LABEL: Record<Personality, string> = {
  agresivo: 'Agresivo',
  conservador: 'Conservador',
  mentiroso: 'Mentiroso',
  equilibrado: 'Equilibrado',
  experto: 'Experto',
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  facil: 'Fácil',
  normal: 'Normal',
  dificil: 'Difícil',
};
