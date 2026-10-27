import { useId } from 'react';
import type { Badge, Rank } from '../../game/progression';
import { shade } from './color';

/** Insignia original para cada rango: escudo con laureles, estrellas y gema. */
export function RankEmblem({ rank, size = 64 }: { rank: Rank; size?: number }) {
  const id = useId().replace(/:/g, '');
  const stars = Math.min(5, Math.ceil(rank.id / 2));
  const top = rank.id >= 8;
  return (
    <svg viewBox="0 0 100 110" width={size} height={size * 1.1} aria-label={`Rango ${rank.name}`}>
      <defs>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={shade(rank.color, 0.35)} />
          <stop offset="0.6" stopColor={rank.color} />
          <stop offset="1" stopColor={shade(rank.color, -0.45)} />
        </linearGradient>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="1" stopColor="#c8901f" />
        </linearGradient>
      </defs>
      {rank.id >= 4 && (
        <g fill={rank.id >= 7 ? `url(#${id}-g)` : shade(rank.color, -0.2)}>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <ellipse cx={14 - i * 0.5} cy={72 - i * 13} rx={6} ry={3} transform={`rotate(-55 ${14 - i * 0.5} ${72 - i * 13})`} />
              <ellipse cx={86 + i * 0.5} cy={72 - i * 13} rx={6} ry={3} transform={`rotate(55 ${86 + i * 0.5} ${72 - i * 13})`} />
            </g>
          ))}
        </g>
      )}
      <path d="M 50 6 L 84 18 L 82 60 Q 78 88 50 104 Q 22 88 18 60 L 16 18 Z" fill={`url(#${id}-s)`} stroke={shade(rank.color, -0.6)} strokeWidth={3} />
      <path d="M 50 14 L 77 24 L 75 59 Q 72 81 50 95 Q 28 81 25 59 L 23 24 Z" fill="none" stroke={rank.accent} strokeOpacity={0.7} strokeWidth={1.6} />
      {top && <path d="M 32 10 L 38 0 L 44 8 L 50 -2 L 56 8 L 62 0 L 68 10 Z" fill={`url(#${id}-g)`} stroke="#7a4b0e" strokeWidth={1.2} transform="translate(0 4)" />}
      <text x={50} y={62} textAnchor="middle" fontFamily="'Alfa Slab One', serif" fontSize={30} fill="#fff" stroke={shade(rank.color, -0.6)} strokeWidth={2} paintOrder="stroke">
        {rank.id}
      </text>
      <g fill={`url(#${id}-g)`} stroke="#7a4b0e" strokeWidth={0.6}>
        {Array.from({ length: stars }, (_, i) => {
          const x = 50 + (i - (stars - 1) / 2) * 11;
          return <path key={i} d={`M ${x} 70 l 2.2 4.6 5 .6 -3.7 3.4 1 5 -4.5 -2.5 -4.5 2.5 1 -5 -3.7 -3.4 5 -.6 Z`} />;
        })}
      </g>
    </svg>
  );
}

function BadgeGlyph({ icon }: { icon: Badge['icon'] }) {
  switch (icon) {
    case 'estrella':
      return <path d="M 0 -16 L 4.7 -5 L 16 -4.9 L 7.4 2.9 L 9.9 14 L 0 8 L -9.9 14 L -7.4 2.9 L -16 -4.9 L -4.7 -5 Z" />;
    case 'llama':
      return <path d="M 0 -18 Q 12 -4 8 8 Q 6 16 0 16 Q -10 16 -10 6 Q -10 -2 -2 -8 Q -2 -2 2 0 Q 4 -8 0 -18 Z" />;
    case 'cohete':
      return <path d="M 0 -18 Q 8 -10 8 4 L 12 12 L 6 10 L 4 16 L -4 16 L -6 10 L -12 12 L -8 4 Q -8 -10 0 -18 Z M 0 -8 A 3 3 0 1 0 0.01 -8 Z" />;
    case 'espada':
      return <path d="M -2 -18 L 2 -18 L 2 6 L 9 6 L 9 9 L 2 9 L 2 16 L -2 16 L -2 9 L -9 9 L -9 6 L -2 6 Z" />;
    case 'copa':
      return <path d="M -11 -14 L 11 -14 Q 11 2 2 4 L 2 10 L 8 14 L -8 14 L -2 10 L -2 4 Q -11 2 -11 -14 Z" />;
    case 'flor':
      return (
        <g>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={0} cy={-8} rx={5} ry={8} transform={`rotate(${a})`} />
          ))}
          <circle r={4} fill="#fff3c4" />
        </g>
      );
    case 'escudo':
      return <path d="M 0 -16 L 13 -11 L 12 3 Q 9 12 0 17 Q -9 12 -12 3 L -13 -11 Z" />;
    case 'rayo':
      return <path d="M 4 -18 L -10 2 L -1 2 L -5 18 L 10 -4 L 1 -4 Z" />;
    case 'mate':
      return <path d="M -10 -6 Q -12 12 0 14 Q 12 12 10 -6 Z M 2 -6 L 10 -18 L 12 -16 L 5 -6 Z" />;
    case 'corona':
      return <path d="M -14 10 L -14 -8 L -7 0 L 0 -14 L 7 0 L 14 -8 L 14 10 Z" />;
    case 'trofeo':
      return <path d="M -8 -14 L 8 -14 L 8 -4 Q 8 4 0 6 Q -8 4 -8 -4 Z M -14 -12 L -8 -12 L -8 -6 Q -14 -6 -14 -12 Z M 14 -12 L 8 -12 L 8 -6 Q 14 -6 14 -12 Z M -2 6 L 2 6 L 2 11 L 7 14 L -7 14 L -2 11 Z" />;
    case 'ojo':
      return (
        <g>
          <path d="M -16 0 Q 0 -14 16 0 Q 0 14 -16 0 Z" />
          <circle r={5} fill="#1a1a1a" />
        </g>
      );
  }
}

export function BadgeIcon({ badge, size = 56, locked = false }: { badge: Badge; size?: number; locked?: boolean }) {
  const id = useId().replace(/:/g, '');
  const c = locked ? '#5a5048' : badge.color;
  return (
    <svg viewBox="0 0 60 70" width={size} height={size * 1.17} aria-label={badge.name} style={{ opacity: locked ? 0.55 : 1 }}>
      <defs>
        <radialGradient id={`${id}-m`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor={shade(c, 0.45)} />
          <stop offset="1" stopColor={shade(c, -0.35)} />
        </radialGradient>
      </defs>
      <path d="M 18 0 L 30 18 L 42 0 L 50 0 L 36 24 L 24 24 L 10 0 Z" fill={locked ? '#3a332d' : '#74acdf'} />
      <path d="M 24 0 L 30 9 L 36 0 Z" fill={locked ? '#4a423a' : '#ffffff'} />
      <circle cx={30} cy={42} r={24} fill={locked ? '#4a423a' : '#c9a24a'} />
      <circle cx={30} cy={42} r={20} fill={`url(#${id}-m)`} stroke={shade(c, -0.5)} strokeWidth={1.2} />
      <g transform="translate(30 42) scale(0.8)" fill="#fff8e6" stroke={shade(c, -0.6)} strokeWidth={1}>
        <BadgeGlyph icon={badge.icon} />
      </g>
    </svg>
  );
}
