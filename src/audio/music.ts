/**
 * Música instrumental original generada en tiempo real: una milonga para
 * guitarra criolla (ritmo 3-3-2) con melodía de "bandoneón" sintetizado.
 * La progresión y la melodía se generan con reglas, así que nunca se repite
 * exactamente igual.
 */
import { audio, midiToFreq, pluck } from './engine';

type Theme = 'menu' | 'mesa';

interface ThemeDef {
  bpm: number;
  /** Acordes: [raíz MIDI del bajo, notas del acorde] por compás. */
  progression: [number, number[]][];
  melodyScale: number[];
  melodyDensity: number;
  bandoneon: boolean;
}

const THEMES: Record<Theme, ThemeDef> = {
  menu: {
    bpm: 104,
    progression: [
      [45, [57, 60, 64]], // Am
      [45, [57, 60, 64]],
      [40, [56, 59, 62, 64]], // E7
      [40, [56, 59, 62, 64]],
      [38, [57, 62, 65]], // Dm
      [45, [57, 60, 64]], // Am
      [40, [56, 59, 62, 64]], // E7
      [45, [57, 60, 64]], // Am
    ],
    melodyScale: [69, 71, 72, 74, 76, 77, 80, 81],
    melodyDensity: 0.62,
    bandoneon: true,
  },
  mesa: {
    bpm: 88,
    progression: [
      [38, [62, 65, 69]], // Dm
      [43, [62, 67, 71]], // G7 (sin 3ra baja)
      [36, [60, 64, 67]], // C
      [41, [60, 65, 69]], // F
      [46, [62, 65, 70]], // Bb
      [40, [59, 64, 68]], // E (dominante)
      [45, [61, 64, 69]], // A
      [45, [61, 64, 67]], // A7
    ],
    melodyScale: [62, 64, 65, 67, 69, 70, 72, 74],
    melodyDensity: 0.4,
    bandoneon: true,
  },
};

class MusicPlayer {
  private theme: Theme | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private step = 0;
  private bar = 0;
  private out: GainNode | null = null;
  private lastMelody = 76;

  play(theme: Theme): void {
    if (this.theme === theme && this.timer) return;
    this.theme = theme;
    audio.onReady(() => this.start());
  }

  stop(): void {
    this.theme = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.out && audio.ctx) {
      const g = this.out;
      g.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.3);
      setTimeout(() => g.disconnect(), 1500);
      this.out = null;
    }
  }

  private start(): void {
    const ctx = audio.ctx;
    const bus = audio.bus('music');
    if (!ctx || !bus || !this.theme) return;
    if (this.timer) clearInterval(this.timer);
    if (this.out) {
      const old = this.out;
      old.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      setTimeout(() => old.disconnect(), 2000);
    }
    this.out = ctx.createGain();
    this.out.gain.setValueAtTime(0, ctx.currentTime);
    this.out.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.5);
    // un poco de "sala" con un retardo suave
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.23;
    const fb = ctx.createGain();
    fb.gain.value = 0.22;
    const wet = ctx.createGain();
    wet.gain.value = 0.25;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    this.out.connect(bus);
    this.out.connect(delay);
    delay.connect(lp).connect(fb).connect(delay);
    lp.connect(wet).connect(bus);
    this.nextTime = ctx.currentTime + 0.2;
    this.step = 0;
    this.bar = 0;
    this.timer = setInterval(() => this.schedule(), 90);
  }

  private schedule(): void {
    const ctx = audio.ctx;
    if (!ctx || !this.out || !this.theme) return;
    if (ctx.state !== 'running') {
      this.nextTime = ctx.currentTime + 0.1;
      return;
    }
    const def = THEMES[this.theme];
    const eighth = 60 / def.bpm / 2;
    while (this.nextTime < ctx.currentTime + 0.35) {
      this.playStep(def, this.nextTime);
      this.nextTime += eighth;
      this.step++;
      if (this.step % 8 === 0) this.bar++;
    }
  }

  private playStep(def: ThemeDef, t: number): void {
    const out = this.out!;
    const pos = this.step % 8;
    const [bass, chord] = def.progression[this.bar % def.progression.length];
    const swing = (Math.random() - 0.5) * 0.008;
    // Bajo en 3-3-2 (milonga): tiempos 0, 3 y 6
    if (pos === 0) pluck(t + swing, out, midiToFreq(bass), 0.55, 1.8, 0.35);
    if (pos === 3) pluck(t + swing, out, midiToFreq(bass + 7), 0.42, 1.4, 0.35);
    if (pos === 6) pluck(t + swing, out, midiToFreq(bass + 12), 0.4, 1.2, 0.35);
    // Rasguido suave en los contratiempos
    if (pos === 2 || pos === 5 || pos === 7) {
      chord.forEach((n, i) => pluck(t + i * 0.012 + swing, out, midiToFreq(n), 0.13, 0.9, 0.5));
    }
    // Melodía cada dos compases con descanso
    const phrasePos = this.bar % 4;
    if (phrasePos === 3 && pos > 3) return;
    if ((pos === 0 || pos === 3 || pos === 6 || Math.random() < 0.18) && Math.random() < def.melodyDensity) {
      const note = this.nextMelodyNote(def, chord, pos === 0);
      const len = pos === 6 ? 2 : 3;
      if (def.bandoneon) this.bandoneon(t, note, (60 / def.bpm / 2) * len * 0.95);
      else pluck(t, out, midiToFreq(note), 0.25, 1.2, 0.7);
    }
  }

  private nextMelodyNote(def: ThemeDef, chord: number[], strong: boolean): number {
    const scale = def.melodyScale;
    if (strong) {
      // en los tiempos fuertes, una nota del acorde cercana
      const options = scale.filter((n) => chord.some((c) => (n - c) % 12 === 0));
      const pick = options.sort((a, b) => Math.abs(a - this.lastMelody) - Math.abs(b - this.lastMelody))[Math.random() < 0.7 ? 0 : 1] ?? options[0];
      this.lastMelody = pick ?? this.lastMelody;
      return this.lastMelody;
    }
    const idx = scale.indexOf(this.lastMelody);
    const move = Math.random() < 0.5 ? 1 : -1;
    const next = scale[Math.max(0, Math.min(scale.length - 1, (idx < 0 ? 3 : idx) + move))];
    this.lastMelody = next;
    return next;
  }

  /** Voz de lengüeta tipo bandoneón: dos osciladores desafinados, filtro y vibrato. */
  private bandoneon(t: number, note: number, dur: number): void {
    const ctx = audio.ctx!;
    const out = this.out!;
    const f = midiToFreq(note);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.06);
    g.gain.setValueAtTime(0.06, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;
    lp.Q.value = 0.7;
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.2;
    const vibGain = ctx.createGain();
    vibGain.gain.value = f * 0.004;
    vib.connect(vibGain);
    for (const [type, detune] of [
      ['sawtooth', -7],
      ['square', 6],
    ] as [OscillatorType, number][]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = detune;
      vibGain.connect(o.frequency);
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.2);
    }
    vib.start(t);
    vib.stop(t + dur + 0.2);
    lp.connect(g).connect(out);
  }
}

export const music = new MusicPlayer();
