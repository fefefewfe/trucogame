import { useEffect, useRef } from 'react';

export type ParticleStyle = 'confeti' | 'fuegos' | 'cartas' | 'polvo' | 'chispas';

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  shape: 'rect' | 'circle' | 'card';
}

const CONFETI = ['#74acdf', '#ffffff', '#f2b631', '#74acdf', '#ffffff', '#e8c35a'];
const FUEGOS = ['#ffd27a', '#ff9a3c', '#fff2c0', '#e8b23c', '#ff6b4a'];

/** Partículas en canvas (livianas). Se detienen solas cuando terminan. */
export function Particles({ style, intensity = 1, loop = false, className }: { style: ParticleStyle; intensity?: number; loop?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w = 0;
    let h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ps: P[] = [];
    const spawn = (count: number) => {
      for (let i = 0; i < count; i++) {
        if (style === 'confeti' || style === 'cartas') {
          ps.push({
            x: Math.random() * w,
            y: -20 - Math.random() * h * 0.3,
            vx: (Math.random() - 0.5) * 1.6,
            vy: 1.4 + Math.random() * 2.4,
            life: 0,
            max: 260 + Math.random() * 120,
            size: style === 'cartas' ? 18 + Math.random() * 10 : 5 + Math.random() * 6,
            rot: Math.random() * Math.PI,
            vr: (Math.random() - 0.5) * 0.2,
            color: CONFETI[Math.floor(Math.random() * CONFETI.length)],
            shape: style === 'cartas' ? 'card' : Math.random() < 0.7 ? 'rect' : 'circle',
          });
        } else if (style === 'fuegos') {
          const cx = w * (0.2 + Math.random() * 0.6);
          const cy = h * (0.15 + Math.random() * 0.35);
          const color = FUEGOS[Math.floor(Math.random() * FUEGOS.length)];
          for (let k = 0; k < 40; k++) {
            const a = (k / 40) * Math.PI * 2;
            const sp = 1.5 + Math.random() * 3;
            ps.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 60 + Math.random() * 40, size: 2 + Math.random() * 2, rot: 0, vr: 0, color, shape: 'circle' });
          }
        } else if (style === 'chispas') {
          ps.push({
            x: w / 2 + (Math.random() - 0.5) * w * 0.3,
            y: h / 2 + (Math.random() - 0.5) * h * 0.2,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.8) * 6,
            life: 0,
            max: 40 + Math.random() * 30,
            size: 1.5 + Math.random() * 2.5,
            rot: 0,
            vr: 0,
            color: FUEGOS[Math.floor(Math.random() * FUEGOS.length)],
            shape: 'circle',
          });
        } else {
          ps.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.15,
            vy: -0.05 - Math.random() * 0.15,
            life: 0,
            max: 400 + Math.random() * 400,
            size: 0.8 + Math.random() * 1.8,
            rot: 0,
            vr: 0,
            color: 'rgba(255, 228, 170, 0.55)',
            shape: 'circle',
          });
        }
      }
    };
    const initial = style === 'fuegos' ? 2 : style === 'polvo' ? 50 : style === 'chispas' ? 60 : 140;
    spawn(Math.round(initial * intensity));
    let frame = 0;
    let raf = 0;
    let spawned = 0;
    const tick = () => {
      frame++;
      ctx.clearRect(0, 0, w, h);
      if (style === 'fuegos' && frame % 38 === 0 && (loop || spawned < 6)) {
        spawn(1);
        spawned++;
      }
      if ((style === 'confeti' || style === 'cartas') && loop && frame % 20 === 0) spawn(Math.round(8 * intensity));
      if (style === 'polvo' && ps.length < 50 * intensity) spawn(1);
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (style === 'fuegos' || style === 'chispas') {
          p.vy += 0.05;
          p.vx *= 0.985;
          p.vy *= 0.985;
        } else if (style !== 'polvo') {
          p.vx += Math.sin((p.life + i) * 0.05) * 0.03;
        }
        const alpha = style === 'polvo' ? Math.sin((p.life / p.max) * Math.PI) : Math.max(0, 1 - p.life / p.max);
        if (p.life > p.max || p.y > h + 40) {
          ps.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = alpha;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        else if (p.shape === 'card') {
          ctx.fillStyle = '#fbf3df';
          ctx.strokeStyle = '#b8892a';
          ctx.lineWidth = 1;
          ctx.fillRect(-p.size / 2, -p.size * 0.78, p.size, p.size * 1.55);
          ctx.strokeRect(-p.size / 2, -p.size * 0.78, p.size, p.size * 1.55);
          ctx.fillStyle = p.color === '#ffffff' ? '#b3242c' : '#2a56a6';
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.22, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (ps.length > 0 || loop) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [style, intensity, loop]);
  return <canvas ref={ref} className={`particles ${className ?? ''}`} aria-hidden="true" />;
}
