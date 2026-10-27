/**
 * Motor de audio: un AudioContext con buses independientes para música,
 * voces, efectos y ambiente. Todos los sonidos se sintetizan en tiempo real
 * (no hay archivos externos que puedan fallar).
 */
import { useSettings } from '../store/settings';

export type Bus = 'music' | 'voice' | 'sfx' | 'ambient';

class AudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  buses: Partial<Record<Bus, GainNode>> = {};
  private noiseBuffer: AudioBuffer | null = null;
  private listeners: (() => void)[] = [];

  /** Crea o reanuda el contexto. Debe llamarse desde un gesto del usuario. */
  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor({ latencyHint: 'interactive' });
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.ratio.value = 3;
      this.master = this.ctx.createGain();
      this.master.connect(compressor).connect(this.ctx.destination);
      for (const bus of ['music', 'voice', 'sfx', 'ambient'] as Bus[]) {
        const g = this.ctx.createGain();
        g.connect(this.master);
        this.buses[bus] = g;
      }
      this.applyVolumes();
      useSettings.subscribe(() => this.applyVolumes());
      for (const l of this.listeners) l();
      this.listeners = [];
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  onReady(fn: () => void): void {
    if (this.ctx) fn();
    else this.listeners.push(fn);
  }

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  applyVolumes(): void {
    if (!this.ctx || !this.master) return;
    const s = useSettings.getState();
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.master, t, 0.05);
    this.buses.music?.gain.setTargetAtTime(s.music * 0.55, t, 0.1);
    this.buses.voice?.gain.setTargetAtTime(s.voice, t, 0.05);
    this.buses.sfx?.gain.setTargetAtTime(s.sfx, t, 0.05);
    this.buses.ambient?.gain.setTargetAtTime(s.ambient * 0.6, t, 0.1);
  }

  bus(name: Bus): GainNode | null {
    return this.buses[name] ?? null;
  }

  noise(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (!this.noiseBuffer) {
      const len = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buf;
    }
    return this.noiseBuffer;
  }

  /** Volumen efectivo de un bus (0..1), útil para la voz del navegador. */
  effectiveVolume(bus: Bus): number {
    const s = useSettings.getState();
    return Math.max(0, Math.min(1, s.master * s[bus]));
  }
}

export const audio = new AudioEngine();

// Desbloqueo con el primer gesto del usuario (política de autoplay de los navegadores).
if (typeof window !== 'undefined') {
  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
}

// ---------------------------------------------------------------------------
// Utilidades de síntesis
// ---------------------------------------------------------------------------

export function envGain(ctx: AudioContext, at: number, attack: number, peak: number, decay: number, dest: AudioNode): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  g.connect(dest);
  return g;
}

export function noiseBurst(
  at: number,
  dest: AudioNode,
  opts: { duration: number; peak: number; attack?: number; filter?: BiquadFilterType; freq?: number; q?: number; freqEnd?: number },
): void {
  const ctx = audio.ctx;
  const buf = audio.noise();
  if (!ctx || !buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = opts.filter ?? 'bandpass';
  f.frequency.setValueAtTime(opts.freq ?? 2000, at);
  if (opts.freqEnd) f.frequency.exponentialRampToValueAtTime(opts.freqEnd, at + opts.duration);
  f.Q.value = opts.q ?? 1;
  const g = envGain(ctx, at, opts.attack ?? 0.003, opts.peak, opts.duration, dest);
  src.connect(f).connect(g);
  src.start(at, Math.random() * 1.5);
  src.stop(at + (opts.attack ?? 0.003) + opts.duration + 0.05);
}

export function tone(
  at: number,
  dest: AudioNode,
  opts: { freq: number; freqEnd?: number; type?: OscillatorType; duration: number; peak: number; attack?: number; detune?: number },
): void {
  const ctx = audio.ctx;
  if (!ctx) return;
  const o = ctx.createOscillator();
  o.type = opts.type ?? 'sine';
  o.frequency.setValueAtTime(opts.freq, at);
  if (opts.freqEnd) o.frequency.exponentialRampToValueAtTime(opts.freqEnd, at + opts.duration);
  if (opts.detune) o.detune.value = opts.detune;
  const g = envGain(ctx, at, opts.attack ?? 0.005, opts.peak, opts.duration, dest);
  o.connect(g);
  o.start(at);
  o.stop(at + (opts.attack ?? 0.005) + opts.duration + 0.05);
}

const pluckCache = new Map<string, AudioBuffer>();

/** Cuerda pulsada (Karplus-Strong): suena como una guitarra criolla. */
export function pluckBuffer(freq: number, duration = 1.6, brightness = 0.5): AudioBuffer | null {
  const ctx = audio.ctx;
  if (!ctx) return null;
  const key = `${freq.toFixed(2)}-${duration}-${brightness}`;
  const cached = pluckCache.get(key);
  if (cached) return cached;
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * duration);
  const buf = ctx.createBuffer(1, len, sr);
  const out = buf.getChannelData(0);
  const period = Math.max(2, Math.round(sr / freq));
  const ring = new Float32Array(period);
  for (let i = 0; i < period; i++) ring[i] = (Math.random() * 2 - 1) * (0.6 + brightness * 0.4);
  let idx = 0;
  let prev = 0;
  const damping = 0.4985 + brightness * 0.0012;
  for (let i = 0; i < len; i++) {
    const cur = ring[idx];
    const next = ring[(idx + 1) % period];
    const v = damping * (cur + next);
    ring[idx] = v;
    // filtro paso bajo leve para quitar aspereza
    prev = prev + (cur - prev) * (0.55 + brightness * 0.35);
    out[i] = prev;
    idx = (idx + 1) % period;
  }
  // fundido final
  const fade = Math.floor(sr * 0.05);
  for (let i = 0; i < fade; i++) out[len - 1 - i] *= i / fade;
  pluckCache.set(key, buf);
  return buf;
}

export function pluck(at: number, dest: AudioNode, freq: number, gain: number, duration = 1.6, brightness = 0.5): void {
  const ctx = audio.ctx;
  const buf = pluckBuffer(freq, duration, brightness);
  if (!ctx || !buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(g).connect(dest);
  src.start(at);
}

export function midiToFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}
