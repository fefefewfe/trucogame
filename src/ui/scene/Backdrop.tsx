import { memo, useId } from 'react';
import type { TableTheme } from '../../game/cosmetics';
import { shade } from '../art/color';

/**
 * Escenografía ilustrada en SVG para cada ambiente (bar, club, pulpería, café,
 * parrilla, patio mendocino, noche, lujo, torneo). Todo es dibujo propio.
 */

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function Bottles({ y, x0, x1, seed, theme }: { y: number; x0: number; x1: number; seed: number; theme: TableTheme }) {
  const r = rng(seed);
  const items = [];
  let x = x0;
  const glassColors = ['#2f5a2a', '#5a1f1a', '#1a2a3a', '#7a5a1a', '#2a1a10', '#3a6a5a', '#8a2a3a'];
  while (x < x1) {
    const kind = Math.floor(r() * 4);
    const w = kind === 2 ? 34 : 24 + r() * 8;
    const h = kind === 2 ? 70 : 80 + r() * 40;
    const c = glassColors[Math.floor(r() * glassColors.length)];
    const neck = kind === 0 ? 18 : kind === 1 ? 28 : 12;
    items.push(
      <g key={x}>
        <rect x={x} y={y - h + neck} width={w} height={h - neck} rx={kind === 2 ? 3 : 8} fill={c} />
        <rect x={x + w / 2 - 4} y={y - h} width={8} height={neck + 4} rx={2} fill={shade(c, -0.2)} />
        <rect x={x + w / 2 - 5} y={y - h - 4} width={10} height={6} rx={1.5} fill={theme.trim} opacity={0.8} />
        <rect x={x + 3} y={y - h * 0.6} width={w - 6} height={h * 0.28} fill="#efe3c8" opacity={0.85} />
        <rect x={x + 4} y={y - h + neck + 4} width={4} height={h - neck - 10} rx={2} fill="#ffffff" opacity={0.22} />
      </g>,
    );
    x += w + 6 + r() * 14;
  }
  return <g>{items}</g>;
}

function Lamp({ x, color, len = 130, cone = true, p }: { x: number; color: string; len?: number; cone?: boolean; p: string }) {
  return (
    <g>
      {cone && <path d={`M ${x - 26} ${len + 30} L ${x - 260} 900 L ${x + 260} 900 L ${x + 26} ${len + 30} Z`} fill={`url(#${p}-cone)`} opacity={0.35} />}
      <line x1={x} y1={0} x2={x} y2={len} stroke="#1a120c" strokeWidth={3} />
      <path d={`M ${x - 46} ${len + 34} Q ${x} ${len - 8} ${x + 46} ${len + 34} Z`} fill="#2a1d14" stroke="#120b06" strokeWidth={2} />
      <path d={`M ${x - 46} ${len + 34} Q ${x} ${len - 8} ${x + 46} ${len + 34}`} fill="none" stroke={color} strokeOpacity={0.4} strokeWidth={2} />
      <ellipse cx={x} cy={len + 34} rx={30} ry={8} fill={color} />
      <circle cx={x} cy={len + 40} r={90} fill={`url(#${p}-glow)`} />
    </g>
  );
}

function Silhouettes({ y, theme, seed, p }: { y: number; theme: TableTheme; seed: number; p: string }) {
  const r = rng(seed);
  const people = [];
  for (let i = 0; i < 7; i++) {
    const x = 120 + i * 220 + r() * 60;
    const s = 0.8 + r() * 0.4;
    people.push(
      <g key={i} transform={`translate(${x} ${y}) scale(${s})`} opacity={0.55}>
        <ellipse cx={0} cy={-150} rx={30} ry={36} fill={shade(theme.wallDark, 0.1)} />
        <path d="M -70 0 Q -66 -100 0 -110 Q 66 -100 70 0 Z" fill={shade(theme.wallDark, 0.08)} />
      </g>,
    );
  }
  return <g filter={`url(#${p}-blur)`}>{people}</g>;
}

function Fileteado({ x, y, text, color, accent }: { x: number; y: number; text: string; color: string; accent: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-190} y={-60} width={380} height={120} rx={18} fill="#140c06" stroke={accent} strokeWidth={4} />
      <path d="M -170 -30 C -150 -60 -110 -50 -120 -20 C -126 0 -150 -6 -144 -20" fill="none" stroke="#e23b3b" strokeWidth={5} strokeLinecap="round" />
      <path d="M 170 30 C 150 60 110 50 120 20 C 126 0 150 6 144 20" fill="none" stroke="#3fae5a" strokeWidth={5} strokeLinecap="round" />
      <path d="M 170 -30 C 150 -60 110 -50 120 -20" fill="none" stroke="#5fb4e6" strokeWidth={4} strokeLinecap="round" />
      <path d="M -170 30 C -150 60 -110 50 -120 20" fill="none" stroke="#f2c14e" strokeWidth={4} strokeLinecap="round" />
      <text x={0} y={18} textAnchor="middle" fontFamily="'Lobster', cursive" fontSize={58} fill={color} stroke="#140c06" strokeWidth={2} paintOrder="stroke">
        {text}
      </text>
    </g>
  );
}

function Pennants({ y, colors }: { y: number; colors: string[] }) {
  const flags = [];
  for (let i = 0; i < 22; i++) {
    const x = 20 + i * 74;
    const sag = Math.sin((i / 21) * Math.PI) * 40;
    flags.push(<path key={i} d={`M ${x} ${y + sag} L ${x + 60} ${y + sag + 4} L ${x + 30} ${y + sag + 60} Z`} fill={colors[i % colors.length]} opacity={0.9} />);
  }
  return (
    <g>
      <path d={`M 0 ${y} Q 800 ${y + 80} 1600 ${y}`} stroke="#1a120c" strokeWidth={2} fill="none" />
      {flags}
    </g>
  );
}

function Stars({ seed }: { seed: number }) {
  const r = rng(seed);
  return (
    <g>
      {Array.from({ length: 90 }, (_, i) => (
        <circle key={i} cx={r() * 1600} cy={r() * 420} r={r() * 1.8 + 0.4} fill="#fff8e0" opacity={0.4 + r() * 0.6} />
      ))}
    </g>
  );
}

function StringLights({ y, color, p }: { y: number; color: string; p: string }) {
  const bulbs = [];
  for (let i = 0; i < 26; i++) {
    const x = i * 64 + 10;
    const sag = Math.sin(((i % 13) / 12) * Math.PI) * 50;
    bulbs.push(
      <g key={i}>
        <circle cx={x} cy={y + sag + 10} r={22} fill={`url(#${p}-glow)`} opacity={0.7} />
        <circle cx={x} cy={y + sag + 10} r={5} fill={color} />
      </g>,
    );
  }
  return (
    <g>
      <path d={`M 0 ${y} Q 416 ${y + 100} 832 ${y} Q 1216 ${y + 100} 1600 ${y}`} stroke="#120b06" strokeWidth={2} fill="none" />
      {bulbs}
    </g>
  );
}

export const Backdrop = memo(function Backdrop({ theme, people = true, sign = true, className }: { theme: TableTheme; people?: boolean; sign?: boolean; className?: string }) {
  const p = useId().replace(/:/g, '');
  const a = theme.ambient;
  const brick = a === 'parrilla';
  const outdoor = a === 'patio';
  return (
    <svg className={`backdrop ${className ?? ''}`} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`${p}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={theme.wallDark} />
          <stop offset="0.55" stopColor={theme.wall} />
          <stop offset="1" stopColor={theme.wallDark} />
        </linearGradient>
        <radialGradient id={`${p}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={theme.lamp} stopOpacity="0.85" />
          <stop offset="1" stopColor={theme.lamp} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${p}-cone`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={theme.lamp} stopOpacity="0.55" />
          <stop offset="1" stopColor={theme.lamp} stopOpacity="0" />
        </linearGradient>
        <pattern id={`${p}-paper`} width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M30 6 Q38 18 30 30 Q22 18 30 6 Z M30 30 Q38 42 30 54 Q22 42 30 30 Z" fill="#000" opacity="0.13" />
          <circle cx="0" cy="30" r="3" fill="#000" opacity="0.1" />
          <circle cx="60" cy="30" r="3" fill="#000" opacity="0.1" />
        </pattern>
        <pattern id={`${p}-brick`} width="120" height="60" patternUnits="userSpaceOnUse">
          <rect width="120" height="60" fill={shade(theme.wall, -0.05)} />
          <rect x="2" y="2" width="56" height="26" rx="2" fill={shade(theme.wall, 0.08)} />
          <rect x="62" y="2" width="56" height="26" rx="2" fill={shade(theme.wall, 0.02)} />
          <rect x="-28" y="32" width="56" height="26" rx="2" fill={shade(theme.wall, 0.04)} />
          <rect x="32" y="32" width="56" height="26" rx="2" fill={shade(theme.wall, 0.1)} />
          <rect x="92" y="32" width="56" height="26" rx="2" fill={shade(theme.wall, 0.0)} />
        </pattern>
        <linearGradient id={`${p}-wood`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={theme.woodLight} />
          <stop offset="1" stopColor={theme.woodDark} />
        </linearGradient>
        <filter id={`${p}-blur`}>
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <radialGradient id={`${p}-vignette`} cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.75" />
        </radialGradient>
      </defs>

      {outdoor ? (
        <g>
          <rect width="1600" height="900" fill={`url(#${p}-wall)`} />
          <Stars seed={7} />
          <circle cx={1320} cy={150} r={46} fill="#fff6d8" opacity={0.9} />
          <circle cx={1305} cy={140} r={46} fill={theme.wallDark} opacity={0.35} />
          <path d="M 0 520 Q 200 470 420 520 T 860 510 T 1300 520 T 1600 500 L 1600 900 L 0 900 Z" fill={shade(theme.wallDark, 0.05)} />
          {/* parral */}
          {Array.from({ length: 30 }, (_, i) => (
            <g key={i}>
              <ellipse cx={i * 56 + 20} cy={40 + (i % 3) * 18} rx={46} ry={26} fill="#2f4a1e" opacity={0.95} />
              <ellipse cx={i * 56 + 40} cy={70 + (i % 2) * 14} rx={30} ry={18} fill="#3d5f26" opacity={0.9} />
              {i % 4 === 1 && (
                <g>
                  {[0, 1, 2, 3, 4, 5].map((k) => (
                    <circle key={k} cx={i * 56 + 30 + (k % 3) * 9} cy={96 + Math.floor(k / 3) * 9 + (k % 2) * 3} r={5.5} fill="#4a1f4f" />
                  ))}
                </g>
              )}
            </g>
          ))}
          <StringLights y={150} color={theme.lamp} p={p} />
        </g>
      ) : (
        <g>
          <rect width="1600" height="900" fill={brick ? `url(#${p}-brick)` : `url(#${p}-wall)`} />
          {!brick && <rect width="1600" height="560" fill={`url(#${p}-paper)`} />}
          {brick && <rect width="1600" height="900" fill={`url(#${p}-wall)`} opacity={0.55} />}
          {/* boiserie */}
          <rect y={560} width="1600" height="340" fill={`url(#${p}-wood)`} />
          {Array.from({ length: 9 }, (_, i) => (
            <rect key={i} x={20 + i * 180} y={600} width={150} height={220} rx={6} fill="none" stroke={shade(theme.woodDark, -0.2)} strokeWidth={4} opacity={0.6} />
          ))}
          <rect y={552} width="1600" height="14" fill={theme.woodLight} />
        </g>
      )}

      {(a === 'bar' || a === 'cafe' || a === 'lujo') && (
        <g>
          <rect x={980} y={170} width={560} height={300} rx={8} fill={shade(theme.wallDark, -0.1)} opacity={0.7} />
          <rect x={980} y={300} width={560} height={12} fill={theme.woodLight} />
          <rect x={980} y={440} width={560} height={12} fill={theme.woodLight} />
          <Bottles y={300} x0={995} x1={1525} seed={11} theme={theme} />
          <Bottles y={440} x0={995} x1={1525} seed={23} theme={theme} />
          {sign && <Fileteado x={420} y={230} text={a === 'cafe' ? 'Café Notable' : a === 'lujo' ? 'Salón Dorado' : 'Bar El Truco'} color={theme.trim} accent={theme.trim} />}
        </g>
      )}

      {a === 'club' && (
        <g>
          <Pennants y={40} colors={['#74acdf', '#ffffff', '#c0392b', '#f2c14e', '#2f7a3a']} />
          {[260, 520, 1080, 1340].map((x, i) => (
            <g key={x} transform={`translate(${x} 300)`}>
              <rect x={-70} y={-90} width={140} height={110} fill="#efe6d0" stroke={theme.trim} strokeWidth={6} />
              <circle cx={0} cy={-36} r={30} fill={['#c0392b', '#2a56a6', '#2f7a3a', '#f2c14e'][i]} />
              <text x={0} y={8} textAnchor="middle" fontFamily="'Barlow Condensed'" fontWeight={800} fontSize={18} fill="#222">
                {['CAMPEÓN 1987', 'TRUCO 1994', 'BOCHAS 2001', 'TRUCO 2015'][i]}
              </text>
            </g>
          ))}
          <g transform="translate(800 330)">
            <path d="M -40 60 L 40 60 L 30 0 Q 60 -10 56 -50 L 30 -46 Q 30 -60 0 -60 Q -30 -60 -30 -46 L -56 -50 Q -60 -10 -30 0 Z" fill="#e8b23c" stroke="#7a4b0e" strokeWidth={3} />
            <rect x={-50} y={58} width={100} height={18} fill="#5a3412" />
          </g>
        </g>
      )}

      {a === 'campo' && (
        <g>
          <rect x={980} y={140} width={300} height={240} fill="#0d1424" stroke={theme.woodLight} strokeWidth={14} />
          <Stars seed={3} />
          <circle cx={1180} cy={200} r={30} fill="#fff6d8" />
          <path d="M 987 330 Q 1060 300 1130 330 T 1273 320 L 1273 373 L 987 373 Z" fill="#141a10" />
          <line x1={1130} y1={147} x2={1130} y2={373} stroke={theme.woodLight} strokeWidth={8} />
          <g transform="translate(360 300)">
            <path d="M -110 0 Q -120 -60 -60 -70 L 60 -70 Q 120 -60 110 0 Q 60 30 0 30 Q -60 30 -110 0 Z" fill="#6a3a1c" stroke="#2a160a" strokeWidth={4} />
            <path d="M -90 -20 L 90 -20" stroke="#c9a46a" strokeWidth={6} strokeDasharray="12 8" />
          </g>
          <g transform="translate(700 220)">
            <rect x={-18} y={-50} width={36} height={60} rx={6} fill="#2a1d14" />
            <circle cx={0} cy={-20} r={60} fill={`url(#${p}-glow)`} />
            <rect x={-12} y={-40} width={24} height={40} rx={4} fill={theme.lamp} opacity={0.85} />
          </g>
        </g>
      )}

      {a === 'noche' && (
        <g>
          <text x={800} y={260} textAnchor="middle" fontFamily="'Lobster', cursive" fontSize={150} fill="none" stroke={theme.trim} strokeWidth={5} style={{ filter: `drop-shadow(0 0 12px ${theme.trim})` }}>
            Truco
          </text>
          <path d="M 200 380 L 1400 380" stroke={theme.lamp} strokeWidth={4} style={{ filter: `drop-shadow(0 0 10px ${theme.lamp})` }} />
          <path d="M 260 410 L 1340 410" stroke={theme.trim} strokeWidth={3} opacity={0.7} style={{ filter: `drop-shadow(0 0 10px ${theme.trim})` }} />
        </g>
      )}

      {a === 'parrilla' && (
        <g>
          <rect x={1060} y={250} width={420} height={260} fill="#1a0e08" stroke="#3a2416" strokeWidth={10} />
          <rect x={1080} y={430} width={380} height={60} fill="#ff6a1a" opacity={0.7} />
          <circle cx={1270} cy={470} r={200} fill={`url(#${p}-glow)`} opacity={0.8} />
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1={1080 + i * 32} y1={400} x2={1080 + i * 32} y2={430} stroke="#555" strokeWidth={4} />
          ))}
          <line x1={1070} y1={400} x2={1470} y2={400} stroke="#777" strokeWidth={6} />
          {sign && <Fileteado x={430} y={220} text="La Tranquera" color={theme.trim} accent={theme.trim} />}
        </g>
      )}

      {a === 'torneo' && (
        <g>
          {[300, 800, 1300].map((x) => (
            <path key={x} d={`M ${x} 0 L ${x - 280} 900 L ${x + 280} 900 Z`} fill="#ffffff" opacity={0.06} />
          ))}
          <rect x={360} y={120} width={880} height={130} rx={10} fill="#0b1a33" stroke="#74acdf" strokeWidth={6} />
          <text x={800} y={205} textAnchor="middle" fontFamily="'Alfa Slab One', serif" fontSize={64} fill="#ffffff">
            CAMPEONATO DE TRUCO
          </text>
          <rect x={360} y={250} width={880} height={10} fill="#74acdf" />
        </g>
      )}

      {people && a !== 'patio' && <Silhouettes y={560} theme={theme} seed={5} p={p} />}
      {a !== 'patio' && a !== 'noche' && (
        <g>
          <Lamp x={300} color={theme.lamp} len={110} p={p} />
          <Lamp x={800} color={theme.lamp} len={150} p={p} />
          <Lamp x={1300} color={theme.lamp} len={110} p={p} />
        </g>
      )}
      <rect width="1600" height="900" fill={`url(#${p}-vignette)`} />
    </svg>
  );
});
