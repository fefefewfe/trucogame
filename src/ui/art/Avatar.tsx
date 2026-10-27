import { motion, useReducedMotion } from 'framer-motion';
import { memo, useEffect, useId, useState } from 'react';
import { shade } from './color';

export type HairStyle = 'corto' | 'pelado' | 'rulos' | 'rodete' | 'largo' | 'peinado' | 'entradas' | 'flequillo';
export type FacialHair = 'none' | 'bigote' | 'bigotazo' | 'barba' | 'candado' | 'barbaBlanca' | 'sombra';
export type Hat = 'none' | 'gorra' | 'gorraAtras' | 'boina' | 'sombrero' | 'vincha';
export type Glasses = 'none' | 'lentes' | 'anteojosSol';
export type ShirtStyle = 'camisa' | 'buzo' | 'saco' | 'chaleco' | 'poncho' | 'cardigan' | 'remera';

export interface AvatarLook {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  facial: FacialHair;
  hat: Hat;
  hatColor?: string;
  glasses: Glasses;
  shirt: string;
  shirtStyle: ShirtStyle;
  accent: string;
  age: 'joven' | 'adulto' | 'mayor';
  feminine?: boolean;
  earrings?: boolean;
  eyeColor?: string;
}

export type Expression = 'neutral' | 'happy' | 'laugh' | 'angry' | 'surprised' | 'smug' | 'sad' | 'thinking';

interface ExprShape {
  browL: number;
  browR: number;
  browY: number;
  eye: number;
  mouth: 'flat' | 'smile' | 'open' | 'frown' | 'o' | 'smirk' | 'sad' | 'side';
  look: [number, number];
}

const EXPR: Record<Expression, ExprShape> = {
  neutral: { browL: 0, browR: 0, browY: 0, eye: 1, mouth: 'flat', look: [0, 0] },
  happy: { browL: -4, browR: 4, browY: -2, eye: 0.9, mouth: 'smile', look: [0, 0] },
  laugh: { browL: -6, browR: 6, browY: -4, eye: 0, mouth: 'open', look: [0, 0] },
  angry: { browL: 16, browR: -16, browY: 3, eye: 0.75, mouth: 'frown', look: [0, 0] },
  surprised: { browL: -6, browR: 6, browY: -8, eye: 1.3, mouth: 'o', look: [0, 0] },
  smug: { browL: -10, browR: 4, browY: -1, eye: 0.55, mouth: 'smirk', look: [1.5, 0] },
  sad: { browL: -14, browR: 14, browY: -1, eye: 0.85, mouth: 'sad', look: [0, 1.5] },
  thinking: { browL: -8, browR: 2, browY: -2, eye: 0.9, mouth: 'side', look: [2.5, -2] },
};

const LINE = '#2a170c';

function Mouth({ kind, skin, feminine }: { kind: ExprShape['mouth']; skin: string; feminine?: boolean }) {
  const lip = feminine ? '#b2384a' : shade(skin, -0.45);
  switch (kind) {
    case 'flat':
      return <path d="M 90 125 Q 100 127 110 125" stroke={lip} strokeWidth={2.6} fill="none" strokeLinecap="round" />;
    case 'smile':
      return <path d="M 86 121 Q 100 134 114 121" stroke={lip} strokeWidth={2.8} fill="none" strokeLinecap="round" />;
    case 'open':
      return (
        <g>
          <path d="M 84 119 Q 100 120 116 119 Q 114 140 100 141 Q 86 140 84 119 Z" fill="#5a1414" stroke={lip} strokeWidth={2} />
          <path d="M 87 121 Q 100 122 113 121 L 112 126 Q 100 127 88 126 Z" fill="#fffaf2" />
          <ellipse cx={100} cy={135} rx={8} ry={3.5} fill="#e0605e" />
        </g>
      );
    case 'frown':
      return <path d="M 88 129 Q 100 120 112 129" stroke={lip} strokeWidth={2.8} fill="none" strokeLinecap="round" />;
    case 'o':
      return <ellipse cx={100} cy={127} rx={6} ry={7.5} fill="#5a1414" stroke={lip} strokeWidth={2} />;
    case 'smirk':
      return <path d="M 88 126 Q 102 128 113 119" stroke={lip} strokeWidth={2.8} fill="none" strokeLinecap="round" />;
    case 'sad':
      return <path d="M 89 129 Q 100 123 111 129" stroke={lip} strokeWidth={2.6} fill="none" strokeLinecap="round" />;
    case 'side':
      return <path d="M 95 126 Q 104 125 111 122" stroke={lip} strokeWidth={2.6} fill="none" strokeLinecap="round" />;
  }
}

function Eye({ cx, shape, color, blink, skin }: { cx: number; shape: ExprShape; color: string; blink: boolean; skin: string }) {
  const cy = 94;
  if (shape.eye === 0) {
    return <path d={`M ${cx - 8} ${cy + 1} Q ${cx} ${cy - 7} ${cx + 8} ${cy + 1}`} stroke={LINE} strokeWidth={2.8} fill="none" strokeLinecap="round" />;
  }
  const ry = 6.2 * shape.eye;
  const [lx, ly] = shape.look;
  return (
    <g style={{ transformOrigin: `${cx}px ${cy}px`, transform: `scaleY(${blink ? 0.08 : 1})`, transition: 'transform 70ms ease' }}>
      <ellipse cx={cx} cy={cy} rx={8.2} ry={ry} fill="#fffdf8" stroke={LINE} strokeWidth={1.4} />
      <circle cx={cx + lx} cy={cy + ly} r={Math.min(4.6, ry)} fill={color} />
      <circle cx={cx + lx} cy={cy + ly} r={Math.min(2.3, ry * 0.5)} fill="#120a05" />
      <circle cx={cx + lx - 1.6} cy={cy + ly - 1.8} r={1.3} fill="#ffffff" />
      {shape.eye < 0.8 && (
        <path d={`M ${cx - 9} ${cy - ry - 1} L ${cx + 9} ${cy - ry - 1} L ${cx + 9} ${cy - ry * 0.25} Q ${cx} ${cy - ry * 0.55} ${cx - 9} ${cy - ry * 0.25} Z`} fill={skin} opacity={0.95} />
      )}
      <path d={`M ${cx - 8.5} ${cy - ry * 0.6} Q ${cx} ${cy - ry - 1.6} ${cx + 8.5} ${cy - ry * 0.6}`} stroke={LINE} strokeWidth={1.8} fill="none" strokeLinecap="round" />
    </g>
  );
}

function HairBack({ look }: { look: AvatarLook }) {
  const c = look.hair;
  if (look.hairStyle === 'largo') {
    return (
      <path
        d="M 52 84 Q 44 140 54 168 Q 66 176 80 168 Q 74 146 76 124 L 124 124 Q 126 146 120 168 Q 134 176 146 168 Q 156 140 148 84 Q 146 40 100 38 Q 54 40 52 84 Z"
        fill={shade(c, -0.15)}
      />
    );
  }
  if (look.hairStyle === 'rodete') {
    return (
      <g>
        <circle cx={100} cy={36} r={18} fill={c} stroke={shade(c, -0.3)} strokeWidth={1.5} />
        <path d="M 88 30 Q 100 24 112 30" stroke={shade(c, 0.25)} strokeWidth={2} fill="none" />
      </g>
    );
  }
  return null;
}

function HairFront({ look }: { look: AvatarLook }) {
  const c = look.hair;
  const dark = shade(c, -0.3);
  const light = shade(c, 0.25);
  switch (look.hairStyle) {
    case 'pelado':
      return (
        <g>
          <path d="M 56 96 Q 54 74 62 68 L 64 98 Z" fill={c} />
          <path d="M 144 96 Q 146 74 138 68 L 136 98 Z" fill={c} />
        </g>
      );
    case 'entradas':
      return (
        <g>
          <path d="M 56 96 Q 50 56 74 44 Q 82 52 78 60 Q 66 66 64 98 Z" fill={c} stroke={dark} strokeWidth={1} />
          <path d="M 144 96 Q 150 56 126 44 Q 118 52 122 60 Q 134 66 136 98 Z" fill={c} stroke={dark} strokeWidth={1} />
          <path d="M 84 46 Q 100 40 116 46 Q 108 52 100 50 Q 92 52 84 46 Z" fill={c} />
        </g>
      );
    case 'rulos': {
      const curls = [];
      for (let i = 0; i < 11; i++) {
        const a = Math.PI + (i / 10) * Math.PI;
        curls.push(<circle key={i} cx={100 + Math.cos(a) * 44} cy={78 + Math.sin(a) * 40} r={12} fill={c} stroke={dark} strokeWidth={1.2} />);
      }
      return (
        <g>
          {curls}
          <circle cx={84} cy={52} r={12} fill={c} stroke={dark} strokeWidth={1.2} />
          <circle cx={108} cy={48} r={13} fill={c} stroke={dark} strokeWidth={1.2} />
          <circle cx={96} cy={44} r={9} fill={light} opacity={0.4} />
        </g>
      );
    }
    case 'rodete':
    case 'largo':
      return (
        <g>
          <path d="M 54 92 Q 50 40 100 38 Q 150 40 146 92 Q 138 64 116 56 Q 96 70 64 68 Q 58 76 54 92 Z" fill={c} stroke={dark} strokeWidth={1.2} />
          <path d="M 70 52 Q 92 44 120 52" stroke={light} strokeWidth={2.4} fill="none" opacity={0.6} />
        </g>
      );
    case 'peinado':
      return (
        <g>
          <path d="M 54 90 Q 50 42 100 36 Q 148 38 148 88 Q 142 62 120 54 Q 90 50 70 58 Q 58 68 54 90 Z" fill={c} stroke={dark} strokeWidth={1.2} />
          <path d="M 66 56 Q 100 40 136 58" stroke={light} strokeWidth={3} fill="none" opacity={0.55} />
          <path d="M 72 62 Q 104 48 138 66" stroke={dark} strokeWidth={1.2} fill="none" opacity={0.6} />
        </g>
      );
    case 'flequillo':
      return (
        <g>
          <path d="M 54 92 Q 48 40 100 36 Q 152 40 146 92 Q 140 70 128 66 L 122 74 L 116 64 L 106 72 L 98 62 L 88 72 L 80 62 L 70 72 Q 60 76 54 92 Z" fill={c} stroke={dark} strokeWidth={1.2} />
          <path d="M 70 50 Q 100 40 128 50" stroke={light} strokeWidth={2.4} fill="none" opacity={0.5} />
        </g>
      );
    case 'corto':
    default:
      return (
        <g>
          <path d="M 55 90 Q 50 44 100 38 Q 150 44 145 90 Q 142 68 130 62 Q 100 56 70 62 Q 58 68 55 90 Z" fill={c} stroke={dark} strokeWidth={1.2} />
          <path d="M 68 52 Q 100 42 132 52" stroke={light} strokeWidth={2.4} fill="none" opacity={0.5} />
        </g>
      );
  }
}

function FacialHairShape({ look, mouth }: { look: AvatarLook; mouth: ExprShape['mouth'] }) {
  const c = look.facial === 'barbaBlanca' ? '#ece8e0' : look.hair;
  const dark = shade(c, -0.3);
  const open = mouth === 'open' || mouth === 'o';
  switch (look.facial) {
    case 'bigote':
      return <path d="M 84 116 Q 92 110 100 114 Q 108 110 116 116 Q 108 120 100 118 Q 92 120 84 116 Z" fill={c} stroke={dark} strokeWidth={1} />;
    case 'bigotazo':
      return (
        <path
          d="M 78 120 Q 80 108 92 110 Q 98 110 100 114 Q 102 110 108 110 Q 120 108 122 120 Q 116 116 108 118 Q 100 120 92 118 Q 84 116 78 120 Z"
          fill={c}
          stroke={dark}
          strokeWidth={1.2}
        />
      );
    case 'barba':
    case 'barbaBlanca':
      return (
        <g>
          <path
            d={`M 58 100 Q 60 132 80 144 Q 100 154 120 144 Q 140 132 142 100 Q 136 122 120 126 Q 110 ${open ? 142 : 132} 100 ${open ? 144 : 134} Q 90 ${open ? 142 : 132} 80 126 Q 64 122 58 100 Z`}
            fill={c}
            stroke={dark}
            strokeWidth={1.2}
          />
          <path d="M 84 116 Q 92 110 100 114 Q 108 110 116 116 Q 108 120 100 118 Q 92 120 84 116 Z" fill={c} stroke={dark} strokeWidth={1} />
        </g>
      );
    case 'candado':
      return (
        <g>
          <path d="M 84 116 Q 92 111 100 114 Q 108 111 116 116 Q 108 119 100 117 Q 92 119 84 116 Z" fill={c} />
          <path d={`M 88 ${open ? 142 : 134} Q 100 ${open ? 150 : 144} 112 ${open ? 142 : 134} Q 100 ${open ? 146 : 139} 88 ${open ? 142 : 134} Z`} fill={c} />
        </g>
      );
    case 'sombra':
      return <path d="M 62 104 Q 66 134 86 142 Q 100 148 114 142 Q 134 134 138 104 Q 132 128 100 136 Q 68 128 62 104 Z" fill={c} opacity={0.22} />;
    default:
      return null;
  }
}

function HatShape({ look }: { look: AvatarLook }) {
  const c = look.hatColor ?? look.accent;
  const dark = shade(c, -0.35);
  const light = shade(c, 0.25);
  switch (look.hat) {
    case 'gorra':
      return (
        <g>
          <path d="M 54 72 Q 56 32 100 30 Q 144 32 146 72 Z" fill={c} stroke={dark} strokeWidth={1.5} />
          <path d="M 54 72 Q 100 64 146 72 Q 168 78 170 86 Q 140 76 100 78 Q 66 78 54 72 Z" fill={dark} />
          <path d="M 74 40 Q 100 32 126 40" stroke={light} strokeWidth={3} fill="none" opacity={0.6} />
          <circle cx={100} cy={31} r={3} fill={dark} />
        </g>
      );
    case 'gorraAtras':
      return (
        <g>
          <path d="M 54 72 Q 56 32 100 30 Q 144 32 146 72 Q 100 62 54 72 Z" fill={c} stroke={dark} strokeWidth={1.5} />
          <path d="M 120 36 Q 146 30 160 44 Q 146 46 132 50 Z" fill={dark} />
          <rect x={82} y={60} width={36} height={8} rx={3} fill={dark} opacity={0.7} />
          <path d="M 70 40 Q 100 30 126 38" stroke={light} strokeWidth={3} fill="none" opacity={0.5} />
        </g>
      );
    case 'boina':
      return (
        <g>
          <path d="M 48 70 Q 42 44 80 34 Q 116 26 148 44 Q 160 56 150 70 Q 100 60 48 70 Z" fill={c} stroke={dark} strokeWidth={1.5} />
          <path d="M 52 70 Q 100 62 150 70" stroke={dark} strokeWidth={3} fill="none" />
          <rect x={98} y={26} width={5} height={8} rx={2} fill={dark} />
        </g>
      );
    case 'sombrero':
      return (
        <g>
          <ellipse cx={100} cy={64} rx={70} ry={12} fill={c} stroke={dark} strokeWidth={1.5} />
          <path d="M 66 64 Q 64 28 100 26 Q 136 28 134 64 Z" fill={c} stroke={dark} strokeWidth={1.5} />
          <path d="M 66 56 Q 100 62 134 56 L 134 62 Q 100 68 66 62 Z" fill={dark} />
          <path d="M 76 36 Q 100 28 122 36" stroke={light} strokeWidth={2.5} fill="none" opacity={0.5} />
        </g>
      );
    case 'vincha':
      return <path d="M 54 70 Q 100 54 146 70 L 146 78 Q 100 62 54 78 Z" fill={c} stroke={dark} strokeWidth={1} />;
    default:
      return null;
  }
}

function GlassesShape({ kind }: { kind: Glasses }) {
  if (kind === 'none') return null;
  if (kind === 'anteojosSol') {
    return (
      <g>
        <path d="M 68 86 L 96 86 Q 96 104 82 104 Q 68 104 68 86 Z" fill="#111" stroke="#000" strokeWidth={1.5} />
        <path d="M 104 86 L 132 86 Q 132 104 118 104 Q 104 104 104 86 Z" fill="#111" stroke="#000" strokeWidth={1.5} />
        <path d="M 96 89 Q 100 86 104 89" stroke="#000" strokeWidth={2.5} fill="none" />
        <path d="M 72 89 L 82 89" stroke="#ffffff" strokeOpacity={0.4} strokeWidth={2} />
        <path d="M 108 89 L 118 89" stroke="#ffffff" strokeOpacity={0.4} strokeWidth={2} />
      </g>
    );
  }
  return (
    <g fill="#ffffff" fillOpacity={0.12} stroke="#5a3a20" strokeWidth={2.2}>
      <circle cx={82} cy={94} r={12} />
      <circle cx={118} cy={94} r={12} />
      <path d="M 94 92 Q 100 88 106 92" fill="none" />
      <path d="M 70 92 L 58 88 M 130 92 L 142 88" fill="none" />
    </g>
  );
}

function Torso({ look, id }: { look: AvatarLook; id: string }) {
  const c = look.shirt;
  const dark = shade(c, -0.3);
  const light = shade(c, 0.2);
  const base = <path d="M 18 200 Q 22 152 70 142 L 130 142 Q 178 152 182 200 Z" fill={`url(#${id}-shirt)`} stroke={dark} strokeWidth={1.5} />;
  switch (look.shirtStyle) {
    case 'camisa':
      return (
        <g>
          {base}
          <path d="M 84 140 L 100 166 L 92 172 L 76 146 Z" fill={light} stroke={dark} strokeWidth={1.2} />
          <path d="M 116 140 L 100 166 L 108 172 L 124 146 Z" fill={light} stroke={dark} strokeWidth={1.2} />
          <line x1={100} y1={166} x2={100} y2={200} stroke={dark} strokeWidth={1.2} />
          {[176, 188].map((y) => (
            <circle key={y} cx={104} cy={y} r={2} fill={shade(c, 0.5)} stroke={dark} strokeWidth={0.6} />
          ))}
        </g>
      );
    case 'buzo':
      return (
        <g>
          <path d="M 50 156 Q 100 128 150 156 Q 142 172 100 168 Q 58 172 50 156 Z" fill={dark} />
          {base}
          <path d="M 76 144 Q 100 164 124 144" stroke={dark} strokeWidth={6} fill="none" />
          <line x1={92} y1={156} x2={90} y2={182} stroke="#f5f5f5" strokeWidth={2} />
          <line x1={108} y1={156} x2={110} y2={182} stroke="#f5f5f5" strokeWidth={2} />
          <path d="M 62 186 L 138 186" stroke={light} strokeWidth={6} opacity={0.4} />
        </g>
      );
    case 'saco':
      return (
        <g>
          {base}
          <path d="M 86 142 L 100 182 L 114 142 Z" fill="#f2efe8" />
          <path d="M 96 150 L 100 160 L 104 150 L 102 182 L 98 182 Z" fill={look.accent} />
          <path d="M 78 142 L 100 190 L 90 200 L 64 150 Z" fill={dark} />
          <path d="M 122 142 L 100 190 L 110 200 L 136 150 Z" fill={dark} />
        </g>
      );
    case 'chaleco':
      return (
        <g>
          {base}
          <path d="M 84 140 L 100 164 L 116 140 Z" fill="#f4efe2" />
          <path d="M 60 150 Q 70 146 82 142 L 100 176 L 100 200 L 56 200 Z" fill={shade(look.accent, -0.2)} stroke={dark} strokeWidth={1} />
          <path d="M 140 150 Q 130 146 118 142 L 100 176 L 100 200 L 144 200 Z" fill={shade(look.accent, -0.2)} stroke={dark} strokeWidth={1} />
          {[182, 192].map((y) => (
            <circle key={y} cx={98} cy={y} r={2} fill="#e8c35a" />
          ))}
        </g>
      );
    case 'poncho':
      return (
        <g>
          {base}
          {[160, 176, 192].map((y, i) => (
            <path key={y} d={`M 26 ${y} L 174 ${y}`} stroke={i % 2 ? look.accent : '#f2ead8'} strokeWidth={5} opacity={0.85} />
          ))}
          <path d="M 80 142 L 100 160 L 120 142" stroke={dark} strokeWidth={3} fill="none" />
        </g>
      );
    case 'cardigan':
      return (
        <g>
          {base}
          <path d="M 82 142 L 100 178 L 118 142 Z" fill="#f5efe2" stroke={dark} strokeWidth={1} />
          <path d="M 100 178 L 100 200" stroke={dark} strokeWidth={1.4} />
          {[184, 194].map((y) => (
            <circle key={y} cx={104} cy={y} r={2.2} fill={shade(c, 0.5)} />
          ))}
        </g>
      );
    case 'remera':
    default:
      return (
        <g>
          {base}
          <path d="M 80 143 Q 100 160 120 143" stroke={dark} strokeWidth={3} fill="none" />
        </g>
      );
  }
}

export const Avatar = memo(function Avatar({
  look,
  expression = 'neutral',
  size = 96,
  animated = true,
  className,
  framed = true,
}: {
  look: AvatarLook;
  expression?: Expression;
  size?: number | string;
  animated?: boolean;
  className?: string;
  framed?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const live = animated && !reduce;
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (!live) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 120);
        loop();
      }, 2200 + Math.random() * 3200);
    };
    loop();
    return () => clearTimeout(t);
  }, [live]);

  const shape = EXPR[expression];
  const skin = look.skin;
  const skinDark = shade(skin, -0.22);
  const brow = look.age === 'mayor' ? shade(look.hair, 0.15) : shade(look.hair, -0.1);
  const eyeColor = look.eyeColor ?? '#5a3a1a';
  const headMotion = live
    ? expression === 'laugh' || expression === 'happy'
      ? { y: [0, -3, 0], rotate: [0, -1.5, 0] }
      : expression === 'angry'
        ? { x: [0, -1.5, 1.5, 0] }
        : expression === 'thinking'
          ? { rotate: [0, 3, 3, 0] }
          : { y: [0, -1.2, 0] }
    : {};

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-bg`} cx="0.5" cy="0.35" r="0.75">
          <stop offset="0" stopColor={shade(look.accent, 0.35)} />
          <stop offset="1" stopColor={shade(look.accent, -0.45)} />
        </radialGradient>
        <radialGradient id={`${id}-skin`} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor={shade(skin, 0.28)} />
          <stop offset="0.6" stopColor={skin} />
          <stop offset="1" stopColor={skinDark} />
        </radialGradient>
        <linearGradient id={`${id}-shirt`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={shade(look.shirt, 0.18)} />
          <stop offset="1" stopColor={shade(look.shirt, -0.25)} />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx={100} cy={100} r={98} />
        </clipPath>
      </defs>
      {framed && <circle cx={100} cy={100} r={98} fill={`url(#${id}-bg)`} />}
      <g clipPath={framed ? `url(#${id}-clip)` : undefined}>
        <motion.g
          animate={live ? { y: [0, -1.5, 0] } : undefined}
          transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Torso look={look} id={id} />
          <path d="M 84 124 L 84 150 Q 100 160 116 150 L 116 124 Z" fill={skinDark} />
          <motion.g
            animate={headMotion}
            transition={{ duration: expression === 'angry' ? 0.4 : 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: expression === 'angry' ? 1.2 : 0 }}
          >
            <HairBack look={look} />
            <ellipse cx={55} cy={98} rx={8} ry={12} fill={skinDark} />
            <ellipse cx={145} cy={98} rx={8} ry={12} fill={skinDark} />
            {look.earrings && (
              <g>
                <circle cx={55} cy={113} r={3.5} fill="#e8c35a" stroke="#8a6a1a" strokeWidth={0.8} />
                <circle cx={145} cy={113} r={3.5} fill="#e8c35a" stroke="#8a6a1a" strokeWidth={0.8} />
              </g>
            )}
            <path
              d={
                look.feminine
                  ? 'M 57 88 Q 57 42 100 42 Q 143 42 143 88 Q 142 120 122 136 Q 100 148 78 136 Q 58 120 57 88 Z'
                  : 'M 56 86 Q 56 40 100 40 Q 144 40 144 86 Q 144 124 122 138 Q 100 148 78 138 Q 56 124 56 86 Z'
              }
              fill={`url(#${id}-skin)`}
              stroke={shade(skin, -0.35)}
              strokeWidth={1.4}
            />
            {look.age === 'mayor' && (
              <g stroke={shade(skin, -0.3)} strokeWidth={1.2} fill="none" opacity={0.7}>
                <path d="M 82 66 Q 100 62 118 66" />
                <path d="M 86 72 Q 100 69 114 72" />
                <path d="M 64 96 l -4 -2 M 64 100 l -4 1" />
                <path d="M 136 96 l 4 -2 M 136 100 l 4 1" />
                <path d="M 82 112 Q 78 120 82 126" />
                <path d="M 118 112 Q 122 120 118 126" />
              </g>
            )}
            <circle cx={74} cy={112} r={8} fill="#ff7a7a" opacity={expression === 'angry' ? 0.45 : 0.22} />
            <circle cx={126} cy={112} r={8} fill="#ff7a7a" opacity={expression === 'angry' ? 0.45 : 0.22} />
            <Eye cx={82} shape={shape} color={eyeColor} blink={blink} skin={skin} />
            <Eye cx={118} shape={shape} color={eyeColor} blink={blink} skin={skin} />
            {look.feminine && shape.eye > 0 && (
              <g stroke={LINE} strokeWidth={1.6} strokeLinecap="round">
                <path d="M 73 89 l -4 -3 M 127 89 l 4 -3" />
              </g>
            )}
            <g transform={`translate(0 ${shape.browY})`}>
              <path
                d="M 72 80 Q 82 75 92 79"
                stroke={brow}
                strokeWidth={look.age === 'mayor' ? 4.5 : 4}
                fill="none"
                strokeLinecap="round"
                transform={`rotate(${shape.browL} 82 79)`}
              />
              <path
                d="M 108 79 Q 118 75 128 80"
                stroke={brow}
                strokeWidth={look.age === 'mayor' ? 4.5 : 4}
                fill="none"
                strokeLinecap="round"
                transform={`rotate(${shape.browR} 118 79)`}
              />
            </g>
            <path d="M 100 96 Q 95 110 99 113 Q 103 115 107 111" stroke={shade(skin, -0.38)} strokeWidth={2} fill="none" strokeLinecap="round" />
            <Mouth kind={shape.mouth} skin={skin} feminine={look.feminine} />
            <FacialHairShape look={look} mouth={shape.mouth} />
            <HairFront look={look} />
            <GlassesShape kind={look.glasses} />
            <HatShape look={look} />
          </motion.g>
        </motion.g>
      </g>
      {framed && <circle cx={100} cy={100} r={97} fill="none" stroke="#000" strokeOpacity={0.25} strokeWidth={2} />}
    </svg>
  );
});
