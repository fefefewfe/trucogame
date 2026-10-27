/**
 * Ambiente de bar: murmullo de conversaciones de fondo (ruido filtrado y
 * modulado), vasos que chocan y alguna silla que se arrastra.
 */
import { audio, noiseBurst, tone } from './engine';

class Ambience {
  private nodes: AudioNode[] = [];
  private sources: AudioScheduledSourceNode[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private active = false;
  private out: GainNode | null = null;

  start(): void {
    if (this.active) return;
    this.active = true;
    audio.onReady(() => this.build());
  }

  stop(): void {
    this.active = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const ctx = audio.ctx;
    if (this.out && ctx) this.out.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
    const sources = this.sources;
    const nodes = this.nodes;
    setTimeout(() => {
      sources.forEach((s) => {
        try {
          s.stop();
        } catch {
          /* ya detenido */
        }
      });
      nodes.forEach((n) => n.disconnect());
    }, 2000);
    this.sources = [];
    this.nodes = [];
    this.out = null;
  }

  private build(): void {
    const ctx = audio.ctx;
    const bus = audio.bus('ambient');
    const noise = audio.noise();
    if (!ctx || !bus || !noise || !this.active || this.out) return;
    this.out = ctx.createGain();
    this.out.gain.setValueAtTime(0, ctx.currentTime);
    this.out.gain.linearRampToValueAtTime(1, ctx.currentTime + 3);
    this.out.connect(bus);
    this.nodes.push(this.out);

    // Varias "voces" de murmullo con formantes distintos y modulación lenta.
    const formants = [380, 620, 900, 1300];
    formants.forEach((freq, i) => {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = 3.5;
      const g = ctx.createGain();
      g.gain.value = 0.05;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.25 + i * 0.17;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.035;
      lfo.connect(lfoGain).connect(g.gain);
      const lfo2 = ctx.createOscillator();
      lfo2.frequency.value = 2.1 + i * 0.9;
      const lfo2Gain = ctx.createGain();
      lfo2Gain.gain.value = 0.015;
      lfo2.connect(lfo2Gain).connect(g.gain);
      src.connect(bp).connect(g).connect(this.out!);
      src.start(ctx.currentTime, i * 0.37);
      lfo.start();
      lfo2.start();
      this.sources.push(src, lfo, lfo2);
      this.nodes.push(bp, g, lfoGain, lfo2Gain);
    });
    this.scheduleEvent();
  }

  private scheduleEvent(): void {
    if (!this.active) return;
    this.timer = setTimeout(() => {
      this.playEvent();
      this.scheduleEvent();
    }, 3500 + Math.random() * 7000);
  }

  private playEvent(): void {
    const ctx = audio.ctx;
    if (!ctx || !this.out || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const r = Math.random();
    if (r < 0.55) {
      // vasos
      const base = 2200 + Math.random() * 1400;
      tone(t, this.out, { freq: base, duration: 0.5, peak: 0.05, type: 'sine' });
      tone(t, this.out, { freq: base * 2.71, duration: 0.25, peak: 0.025, type: 'sine' });
      if (Math.random() < 0.5) tone(t + 0.12, this.out, { freq: base * 1.13, duration: 0.4, peak: 0.035, type: 'sine' });
    } else if (r < 0.8) {
      // silla que se arrastra
      noiseBurst(t, this.out, { duration: 0.35, attack: 0.08, peak: 0.07, filter: 'bandpass', freq: 260, freqEnd: 420, q: 6 });
    } else {
      // cucharita en la taza
      for (let i = 0; i < 3; i++) tone(t + i * 0.09, this.out, { freq: 3800 + i * 120, duration: 0.08, peak: 0.025 });
    }
  }
}

export const ambience = new Ambience();
