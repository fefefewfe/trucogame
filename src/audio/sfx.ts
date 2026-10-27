import { audio, midiToFreq, noiseBurst, pluck, tone } from './engine';

export type CallSound = 'truco' | 'retruco' | 'vale_cuatro' | 'envido' | 'flor' | 'respuesta';

function sfxBus(): { ctx: AudioContext; out: GainNode; t: number } | null {
  const ctx = audio.ctx;
  const out = audio.bus('sfx');
  if (!ctx || !out || ctx.state !== 'running') return null;
  return { ctx, out, t: ctx.currentTime + 0.005 };
}

export const sfx = {
  /** Carta golpeando el paño. */
  cardSlap(intensity = 1): void {
    const b = sfxBus();
    if (!b) return;
    noiseBurst(b.t, b.out, { duration: 0.09, peak: 0.55 * intensity, filter: 'bandpass', freq: 2600, q: 0.8 });
    noiseBurst(b.t, b.out, { duration: 0.05, peak: 0.25 * intensity, filter: 'highpass', freq: 5000 });
    tone(b.t, b.out, { freq: 140, freqEnd: 60, duration: 0.09, peak: 0.35 * intensity });
  },

  /** Vuelo corto de una carta. */
  cardWhoosh(): void {
    const b = sfxBus();
    if (!b) return;
    noiseBurst(b.t, b.out, { duration: 0.16, attack: 0.04, peak: 0.12, filter: 'bandpass', freq: 900, freqEnd: 3200, q: 1.4 });
  },

  /** Reparto: pequeño roce de cartón. */
  deal(): void {
    const b = sfxBus();
    if (!b) return;
    noiseBurst(b.t, b.out, { duration: 0.07, attack: 0.01, peak: 0.16, filter: 'bandpass', freq: 3400, freqEnd: 1800, q: 1.2 });
  },

  /** Mezcla del mazo (riffle). */
  shuffle(): void {
    const b = sfxBus();
    if (!b) return;
    for (let i = 0; i < 18; i++) {
      const at = b.t + i * 0.028 + Math.random() * 0.01;
      noiseBurst(at, b.out, { duration: 0.02, peak: 0.09 + Math.random() * 0.05, filter: 'bandpass', freq: 2800 + Math.random() * 1500, q: 2 });
    }
    noiseBurst(b.t + 0.55, b.out, { duration: 0.22, attack: 0.05, peak: 0.12, filter: 'bandpass', freq: 1400, freqEnd: 600, q: 0.9 });
    noiseBurst(b.t + 0.8, b.out, { duration: 0.06, peak: 0.25, filter: 'bandpass', freq: 1800, q: 0.8 });
  },

  /** Recoger las cartas al final de la mano. */
  collect(): void {
    const b = sfxBus();
    if (!b) return;
    noiseBurst(b.t, b.out, { duration: 0.28, attack: 0.06, peak: 0.12, filter: 'bandpass', freq: 3000, freqEnd: 900, q: 1 });
  },

  click(): void {
    const b = sfxBus();
    if (!b) return;
    tone(b.t, b.out, { freq: 880, freqEnd: 520, duration: 0.05, peak: 0.12, type: 'triangle' });
    noiseBurst(b.t, b.out, { duration: 0.015, peak: 0.08, filter: 'highpass', freq: 4000 });
  },

  hover(): void {
    const b = sfxBus();
    if (!b) return;
    tone(b.t, b.out, { freq: 1500, duration: 0.025, peak: 0.025, type: 'sine' });
  },

  /** Golpe dramático para los cantos. */
  call(kind: CallSound): void {
    const b = sfxBus();
    if (!b) return;
    const { t, out } = b;
    const big = kind === 'vale_cuatro' ? 1.4 : kind === 'retruco' ? 1.15 : 1;
    if (kind === 'envido' || kind === 'flor') {
      // rasgueo de guitarra
      const notes = kind === 'flor' ? [57, 61, 64, 69, 73] : [57, 60, 64, 69, 72];
      notes.forEach((n, i) => pluck(t + i * 0.025, out, midiToFreq(n), 0.32, 1.4, 0.6));
      tone(t, out, { freq: 110, freqEnd: 55, duration: 0.25, peak: 0.3 });
      return;
    }
    if (kind === 'respuesta') {
      tone(t, out, { freq: 330, duration: 0.12, peak: 0.08, type: 'triangle' });
      return;
    }
    // bombo + golpe + acorde
    tone(t, out, { freq: 170 * big, freqEnd: 42, duration: 0.45 * big, peak: 0.85 });
    noiseBurst(t, out, { duration: 0.12, peak: 0.4 * big, filter: 'bandpass', freq: 1200, q: 0.6 });
    const chord = kind === 'vale_cuatro' ? [45, 52, 57, 61, 64] : kind === 'retruco' ? [45, 52, 57, 60, 64] : [45, 52, 57, 60];
    chord.forEach((n, i) =>
      pluck(t + 0.015 * i, out, midiToFreq(n), 0.28, 1.6, 0.75),
    );
    if (kind === 'vale_cuatro') {
      noiseBurst(t + 0.02, out, { duration: 1.2, attack: 0.01, peak: 0.12, filter: 'highpass', freq: 6000 });
      tone(t + 0.18, out, { freq: 140, freqEnd: 40, duration: 0.5, peak: 0.7 });
    }
  },

  bazaWin(): void {
    const b = sfxBus();
    if (!b) return;
    tone(b.t, b.out, { freq: midiToFreq(81), duration: 0.6, peak: 0.07, type: 'sine' });
    tone(b.t + 0.07, b.out, { freq: midiToFreq(88), duration: 0.7, peak: 0.05, type: 'sine' });
  },

  bazaLose(): void {
    const b = sfxBus();
    if (!b) return;
    tone(b.t, b.out, { freq: midiToFreq(64), duration: 0.35, peak: 0.05, type: 'triangle' });
  },

  points(n = 1): void {
    const b = sfxBus();
    if (!b) return;
    const count = Math.min(6, Math.max(1, n));
    for (let i = 0; i < count; i++) {
      tone(b.t + i * 0.07, b.out, { freq: midiToFreq(84 + (i % 3) * 3), duration: 0.18, peak: 0.08, type: 'triangle' });
    }
  },

  coins(): void {
    const b = sfxBus();
    if (!b) return;
    for (let i = 0; i < 8; i++) {
      const at = b.t + i * 0.06 + Math.random() * 0.03;
      tone(at, b.out, { freq: 2400 + Math.random() * 1600, duration: 0.12, peak: 0.05, type: 'sine' });
      tone(at, b.out, { freq: 5200 + Math.random() * 900, duration: 0.06, peak: 0.02, type: 'sine' });
    }
  },

  tick(urgent = false): void {
    const b = sfxBus();
    if (!b) return;
    tone(b.t, b.out, { freq: urgent ? 1200 : 900, duration: 0.03, peak: urgent ? 0.1 : 0.05, type: 'square' });
  },

  /** Murmullo del público ante un canto fuerte. */
  crowd(kind: 'uh' | 'aplauso'): void {
    const ctx = audio.ctx;
    const out = audio.bus('ambient');
    if (!ctx || !out || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    if (kind === 'uh') {
      noiseBurst(t, out, { duration: 1.1, attack: 0.25, peak: 0.35, filter: 'bandpass', freq: 500, freqEnd: 380, q: 2.5 });
      noiseBurst(t + 0.05, out, { duration: 1.0, attack: 0.3, peak: 0.2, filter: 'bandpass', freq: 900, freqEnd: 650, q: 3 });
    } else {
      for (let i = 0; i < 40; i++) {
        noiseBurst(t + Math.random() * 1.6, out, { duration: 0.03, peak: 0.12 + Math.random() * 0.1, filter: 'bandpass', freq: 1500 + Math.random() * 2000, q: 1.5 });
      }
    }
  },

  victory(): void {
    const b = sfxBus();
    if (!b) return;
    const melody = [69, 73, 76, 81, 76, 81, 85];
    melody.forEach((n, i) => {
      pluck(b.t + i * 0.12, b.out, midiToFreq(n), 0.32, 1.5, 0.7);
      tone(b.t + i * 0.12, b.out, { freq: midiToFreq(n), duration: 0.22, peak: 0.05, type: 'sawtooth', attack: 0.02 });
    });
    [57, 61, 64, 69].forEach((n) => pluck(b.t + 0.86, b.out, midiToFreq(n), 0.3, 2.2, 0.6));
    tone(b.t + 0.86, b.out, { freq: 110, freqEnd: 55, duration: 0.6, peak: 0.6 });
    sfx.crowd('aplauso');
  },

  defeat(): void {
    const b = sfxBus();
    if (!b) return;
    [64, 62, 60, 57].forEach((n, i) => pluck(b.t + i * 0.22, b.out, midiToFreq(n), 0.3, 1.6, 0.35));
    [45, 52, 57, 60].forEach((n) => pluck(b.t + 0.95, b.out, midiToFreq(n), 0.22, 2.4, 0.3));
  },

  reward(): void {
    const b = sfxBus();
    if (!b) return;
    [76, 79, 83, 88].forEach((n, i) => tone(b.t + i * 0.08, b.out, { freq: midiToFreq(n), duration: 0.35, peak: 0.07, type: 'triangle' }));
    sfx.coins();
  },
};
