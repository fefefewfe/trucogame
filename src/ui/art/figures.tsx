import type { Suit } from '../../engine/cards';
import { Pip } from './suits';

/**
 * Figuras originales de la baraja: sota (10), caballo (11) y rey (12).
 * Coordenadas en el sistema de la carta (200 x 310).
 */

const O = '#2d1b0e';

interface Palette {
  primary: string;
  secondary: string;
  trim: string;
  horse: string;
  hair: string;
}

const PALETTE: Record<Suit, Palette> = {
  oro: { primary: '#c8342b', secondary: '#2b62b8', trim: '#f2c14e', horse: '#efe6d4', hair: '#7a4a1e' },
  copa: { primary: '#2b62b8', secondary: '#c8342b', trim: '#f2c14e', horse: '#8a4f2a', hair: '#3b2412' },
  espada: { primary: '#2a56a6', secondary: '#e0a52a', trim: '#c8342b', horse: '#c9c6cf', hair: '#5a3a1a' },
  basto: { primary: '#2f7a3a', secondary: '#c8342b', trim: '#f2c14e', horse: '#4a3a30', hair: '#2a1a0c' },
};

function Face({ cx, cy, rx, ry, old = false }: { cx: number; cy: number; rx: number; ry: number; old?: boolean }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#g-skin)" stroke={O} strokeWidth={1.4} />
      <circle cx={cx - rx * 0.36} cy={cy - ry * 0.08} r={1.6} fill={O} />
      <circle cx={cx + rx * 0.36} cy={cy - ry * 0.08} r={1.6} fill={O} />
      <path d={`M ${cx - rx * 0.55} ${cy - ry * 0.32} q ${rx * 0.2} -3 ${rx * 0.4} 0`} stroke={O} strokeWidth={1.2} fill="none" />
      <path d={`M ${cx + rx * 0.15} ${cy - ry * 0.32} q ${rx * 0.2} -3 ${rx * 0.4} 0`} stroke={O} strokeWidth={1.2} fill="none" />
      <path d={`M ${cx} ${cy - ry * 0.05} q 2 ${ry * 0.25} -1.5 ${ry * 0.3}`} stroke="#b07a55" strokeWidth={1.2} fill="none" />
      {!old && <path d={`M ${cx - rx * 0.28} ${cy + ry * 0.42} q ${rx * 0.28} 4 ${rx * 0.56} 0`} stroke="#8a3a2a" strokeWidth={1.4} fill="none" />}
      <circle cx={cx - rx * 0.55} cy={cy + ry * 0.25} r={rx * 0.18} fill="#ff8f8f" opacity={0.35} />
      <circle cx={cx + rx * 0.55} cy={cy + ry * 0.25} r={rx * 0.18} fill="#ff8f8f" opacity={0.35} />
    </g>
  );
}

function Ermine({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const spots = [];
  for (let yy = y + 6; yy < y + h - 2; yy += 12) {
    for (let xx = x + 4; xx < x + w - 2; xx += 8) {
      spots.push(<path key={`${xx}-${yy}`} d={`M ${xx} ${yy} l 1.5 -3 l 1.5 3 Z`} fill="#1a1a1a" />);
    }
  }
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#fbf7ee" stroke={O} strokeWidth={1} />
      {spots}
    </g>
  );
}

function Sota({ suit }: { suit: Suit }) {
  const p = PALETTE[suit];
  const upright = suit === 'espada' || suit === 'basto';
  return (
    <g>
      <ellipse cx={100} cy={266} rx={36} ry={5} fill="#000" opacity={0.15} />
      {/* piernas */}
      <path d="M 86 208 L 85 258 L 97 258 L 98 208 Z" fill={p.secondary} stroke={O} strokeWidth={1.3} />
      <path d="M 102 208 L 103 258 L 115 258 L 114 208 Z" fill={p.secondary} stroke={O} strokeWidth={1.3} />
      <ellipse cx={90} cy={261} rx={9} ry={4} fill="#3a2414" stroke={O} strokeWidth={1} />
      <ellipse cx={110} cy={261} rx={9} ry={4} fill="#3a2414" stroke={O} strokeWidth={1} />
      {/* brazo izquierdo en la cintura */}
      <path d="M 78 140 Q 62 162 72 186" stroke={p.primary} strokeWidth={12} fill="none" strokeLinecap="round" />
      <path d="M 78 140 Q 62 162 72 186" stroke={O} strokeWidth={13.5} fill="none" strokeLinecap="round" opacity={0.25} />
      <circle cx={74} cy={188} r={5.5} fill="url(#g-skin)" stroke={O} strokeWidth={1.1} />
      {/* túnica */}
      <path d="M 74 132 Q 69 172 66 212 L 134 212 Q 131 172 126 132 Q 100 122 74 132 Z" fill={p.primary} stroke={O} strokeWidth={1.6} />
      <path d="M 66 212 L 134 212 L 133 204 L 67 204 Z" fill={p.trim} stroke={O} strokeWidth={1} />
      <rect x={95} y={133} width={10} height={72} fill={p.trim} stroke={O} strokeWidth={1} />
      {[145, 158, 171, 184, 197].map((y) => (
        <circle key={y} cx={100} cy={y} r={2} fill={p.secondary} />
      ))}
      <rect x={70} y={170} width={60} height={7} fill={p.secondary} stroke={O} strokeWidth={1} />
      <rect x={96} y={169} width={8} height={9} fill={p.trim} stroke={O} strokeWidth={1} />
      <path d="M 78 140 Q 76 160 80 200" stroke="#000" strokeOpacity={0.18} strokeWidth={5} fill="none" />
      {/* brazo derecho con el palo */}
      <path d="M 124 140 Q 142 132 146 112" stroke={p.primary} strokeWidth={12} fill="none" strokeLinecap="round" />
      <circle cx={146} cy={110} r={5.5} fill="url(#g-skin)" stroke={O} strokeWidth={1.1} />
      <Pip suit={suit} x={150} y={upright ? 76 : 88} size={upright ? 62 : 44} rotate={upright ? 8 : 0} />
      {/* cuello y cabeza */}
      <rect x={94} y={110} width={12} height={16} fill="url(#g-skin)" stroke={O} strokeWidth={1} />
      <ellipse cx={100} cy={128} rx={18} ry={6} fill="#fbf7ee" stroke={O} strokeWidth={1.2} />
      <path d="M 84 96 Q 82 112 88 116 L 112 116 Q 118 112 116 96 Z" fill={p.hair} stroke={O} strokeWidth={1.2} />
      <Face cx={100} cy={101} rx={13} ry={15} />
      {/* boina con pluma */}
      <ellipse cx={98} cy={86} rx={21} ry={8} fill={p.secondary} stroke={O} strokeWidth={1.4} />
      <path d="M 80 88 Q 100 92 118 87" stroke={p.trim} strokeWidth={2.5} fill="none" />
      <path d="M 112 82 Q 132 62 124 50 Q 122 66 108 80 Z" fill="#fbf7ee" stroke={O} strokeWidth={1} />
    </g>
  );
}

function Caballo({ suit }: { suit: Suit }) {
  const p = PALETTE[suit];
  const dark = suit === 'basto' || suit === 'copa';
  const mane = dark ? '#1c120a' : '#8a6a4a';
  const upright = suit === 'espada' || suit === 'basto';
  return (
    <g>
      <ellipse cx={104} cy={266} rx={58} ry={5} fill="#000" opacity={0.15} />
      {/* cola */}
      <path d="M 146 186 Q 164 198 158 236 Q 150 218 142 200 Z" fill={mane} stroke={O} strokeWidth={1.2} />
      {/* patas traseras */}
      <path d="M 124 206 L 120 258 L 129 258 L 134 206 Z" fill={p.horse} stroke={O} strokeWidth={1.3} />
      <path d="M 138 202 L 142 256 L 151 256 L 148 200 Z" fill={p.horse} stroke={O} strokeWidth={1.3} />
      {/* patas delanteras */}
      <path d="M 70 204 L 64 236 L 74 258 L 82 256 L 74 236 L 82 206 Z" fill={p.horse} stroke={O} strokeWidth={1.3} />
      <path d="M 86 206 L 88 258 L 97 258 L 96 206 Z" fill={p.horse} stroke={O} strokeWidth={1.3} />
      {[ [74, 258], [92, 259], [124, 259], [146, 257] ].map(([x, y]) => (
        <rect key={`${x}`} x={x - 6} y={y - 4} width={12} height={5} rx={1.5} fill="#2a1a0c" />
      ))}
      {/* cuerpo */}
      <ellipse cx={106} cy={194} rx={46} ry={24} fill={p.horse} stroke={O} strokeWidth={1.6} />
      <path d="M 70 200 Q 106 222 146 198" stroke="#000" strokeOpacity={0.15} strokeWidth={6} fill="none" />
      {/* cuello y cabeza */}
      <path d="M 64 198 Q 50 160 60 134 L 82 140 Q 78 168 90 188 Z" fill={p.horse} stroke={O} strokeWidth={1.5} />
      <path d="M 60 134 Q 42 132 32 150 Q 30 160 40 162 Q 52 162 64 154 L 80 144 Z" fill={p.horse} stroke={O} strokeWidth={1.5} />
      <path d="M 64 128 L 70 116 L 74 132 Z" fill={p.horse} stroke={O} strokeWidth={1.2} />
      <circle cx={54} cy={142} r={2.2} fill={O} />
      <circle cx={37} cy={154} r={1.4} fill={O} />
      <path d="M 62 132 Q 70 150 70 170 Q 76 186 86 190 Q 80 170 82 150 Q 78 136 66 128 Z" fill={mane} stroke={O} strokeWidth={1} />
      {/* manta y montura */}
      <path d="M 88 172 L 130 172 L 134 206 L 86 206 Z" fill={p.primary} stroke={O} strokeWidth={1.4} />
      <path d="M 86 200 L 134 200 L 134 206 L 86 206 Z" fill={p.trim} stroke={O} strokeWidth={1} />
      {/* riendas */}
      <path d="M 40 158 Q 70 170 96 158" stroke="#5a3412" strokeWidth={1.6} fill="none" />
      {/* jinete */}
      <path d="M 104 180 L 100 214 L 112 216 L 114 182 Z" fill={p.secondary} stroke={O} strokeWidth={1.3} />
      <path d="M 98 214 L 114 214 L 116 222 L 96 222 Z" fill="#2a1a0c" />
      <path d="M 92 180 Q 88 150 94 136 L 120 136 Q 126 150 122 180 Z" fill={p.secondary} stroke={O} strokeWidth={1.5} />
      <rect x={104} y={136} width={6} height={44} fill={p.trim} stroke={O} strokeWidth={0.8} />
      <path d="M 96 146 Q 90 158 96 160" stroke={p.secondary} strokeWidth={10} fill="none" strokeLinecap="round" />
      <circle cx={96} cy={160} r={4.5} fill="url(#g-skin)" stroke={O} strokeWidth={1} />
      <path d="M 118 142 Q 134 132 138 112" stroke={p.secondary} strokeWidth={10} fill="none" strokeLinecap="round" />
      <circle cx={138} cy={110} r={5} fill="url(#g-skin)" stroke={O} strokeWidth={1.1} />
      <Pip suit={suit} x={144} y={upright ? 78 : 88} size={upright ? 58 : 42} rotate={upright ? 12 : 0} />
      <rect x={102} y={118} width={10} height={14} fill="url(#g-skin)" stroke={O} strokeWidth={1} />
      <ellipse cx={107} cy={133} rx={13} ry={4.5} fill="#fbf7ee" stroke={O} strokeWidth={1} />
      <Face cx={107} cy={112} rx={11} ry={13} />
      {/* sombrero */}
      <ellipse cx={107} cy={100} rx={20} ry={5} fill={p.primary} stroke={O} strokeWidth={1.3} />
      <path d="M 95 100 Q 96 84 107 84 Q 118 84 119 100 Z" fill={p.primary} stroke={O} strokeWidth={1.3} />
      <path d="M 116 88 Q 132 74 128 64 Q 124 76 114 86 Z" fill={p.trim} stroke={O} strokeWidth={1} />
    </g>
  );
}

function Rey({ suit }: { suit: Suit }) {
  const p = PALETTE[suit];
  const upright = suit === 'espada' || suit === 'basto';
  return (
    <g>
      <ellipse cx={100} cy={266} rx={44} ry={5} fill="#000" opacity={0.15} />
      {/* manto */}
      <path d="M 70 128 Q 60 200 56 262 L 144 262 Q 140 200 130 128 Q 100 116 70 128 Z" fill={p.primary} stroke={O} strokeWidth={1.7} />
      <path d="M 62 210 Q 100 222 138 210 L 141 240 Q 100 252 59 240 Z" fill="#000" opacity={0.08} />
      <Ermine x={92} y={132} w={16} h={120} />
      <Ermine x={56} y={252} w={88} h={10} />
      <rect x={70} y={180} width={60} height={8} fill={p.trim} stroke={O} strokeWidth={1} />
      {/* esclavina */}
      <path d="M 66 132 Q 100 108 134 132 Q 138 150 128 158 Q 100 142 72 158 Q 62 150 66 132 Z" fill={p.secondary} stroke={O} strokeWidth={1.5} />
      <path d="M 70 150 Q 100 136 130 150" stroke={p.trim} strokeWidth={2.5} fill="none" />
      {/* brazo con el palo */}
      <path d="M 126 150 Q 144 160 146 176" stroke={p.primary} strokeWidth={12} fill="none" strokeLinecap="round" />
      <circle cx={146} cy={178} r={5.5} fill="url(#g-skin)" stroke={O} strokeWidth={1.1} />
      <Pip suit={suit} x={152} y={upright ? 150 : 158} size={upright ? 66 : 46} rotate={upright ? 4 : 0} />
      <path d="M 74 150 Q 64 168 84 182" stroke={p.primary} strokeWidth={12} fill="none" strokeLinecap="round" />
      <circle cx={86} cy={183} r={5.5} fill="url(#g-skin)" stroke={O} strokeWidth={1.1} />
      {/* cabeza */}
      <rect x={93} y={108} width={14} height={18} fill="url(#g-skin)" stroke={O} strokeWidth={1} />
      <path d="M 82 92 Q 80 112 86 118 L 114 118 Q 120 112 118 92 Z" fill="#d9d4cc" stroke={O} strokeWidth={1.2} />
      <Face cx={100} cy={99} rx={15} ry={17} old />
      <path d="M 86 104 Q 88 128 100 134 Q 112 128 114 104 Q 108 114 100 114 Q 92 114 86 104 Z" fill="#ece8e0" stroke={O} strokeWidth={1.2} />
      <path d="M 90 109 Q 100 104 110 109 Q 100 112 90 109 Z" fill="#cfc9bf" stroke={O} strokeWidth={0.8} />
      {/* corona */}
      <path d="M 82 86 L 83 64 L 92 75 L 100 60 L 108 75 L 117 64 L 118 86 Z" fill="url(#g-gold)" stroke="#7a4b0e" strokeWidth={1.4} />
      <rect x={81} y={82} width={38} height={7} rx={1.5} fill="url(#g-gold)" stroke="#7a4b0e" strokeWidth={1.2} />
      <circle cx={100} cy={85.5} r={2.2} fill="#c0392b" />
      <circle cx={89} cy={85.5} r={1.8} fill="#2f6fd0" />
      <circle cx={111} cy={85.5} r={1.8} fill="#2f9a52" />
      <circle cx={100} cy={60} r={2.4} fill="url(#g-gold)" stroke="#7a4b0e" strokeWidth={0.8} />
    </g>
  );
}

export function CourtFigure({ rank, suit }: { rank: 10 | 11 | 12; suit: Suit }) {
  if (rank === 10) return <Sota suit={suit} />;
  if (rank === 11) return <Caballo suit={suit} />;
  return <Rey suit={suit} />;
}
