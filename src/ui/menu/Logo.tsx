import { motion } from 'framer-motion';

/** Logo original del juego: letras con relieve dorado, volutas de fileteado y cinta. */
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <motion.div
      className={`logo ${small ? 'logo-small' : ''}`}
      initial={{ scale: 0.6, opacity: 0, rotate: -6 }}
      animate={{ scale: 1, opacity: 1, rotate: -2 }}
      transition={{ type: 'spring', stiffness: 160, damping: 12 }}
    >
      <svg viewBox="0 0 640 300" aria-label="Truco: La Revancha" role="img">
        <defs>
          <linearGradient id="logo-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff6c8" />
            <stop offset="0.45" stopColor="#f5c64a" />
            <stop offset="0.55" stopColor="#e09a1c" />
            <stop offset="1" stopColor="#ffde7a" />
          </linearGradient>
          <linearGradient id="logo-ribbon" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d23a32" />
            <stop offset="1" stopColor="#8a1a16" />
          </linearGradient>
          <linearGradient id="logo-shine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id="logo-text-clip">
            <text x="320" y="170" textAnchor="middle" fontFamily="'Alfa Slab One', serif" fontSize="150" letterSpacing="4">
              TRUCO
            </text>
          </clipPath>
        </defs>
        {/* volutas */}
        <g fill="none" strokeLinecap="round" strokeWidth="7">
          <path d="M 40 150 C 10 90 70 50 100 90 C 120 118 90 140 76 124 C 66 112 80 100 88 108" stroke="#e23b3b" />
          <path d="M 600 150 C 630 90 570 50 540 90 C 520 118 550 140 564 124 C 574 112 560 100 552 108" stroke="#3fae5a" />
          <path d="M 70 200 C 40 230 80 260 110 240" stroke="#5fb4e6" strokeWidth="5" />
          <path d="M 570 200 C 600 230 560 260 530 240" stroke="#f2c14e" strokeWidth="5" />
        </g>
        {/* relieve */}
        {[10, 8, 6, 4, 2].map((d) => (
          <text key={d} x={320 + d * 0.6} y={170 + d} textAnchor="middle" fontFamily="'Alfa Slab One', serif" fontSize="150" letterSpacing="4" fill={d > 6 ? '#2a1205' : '#6b3a0c'}>
            TRUCO
          </text>
        ))}
        <text x="320" y="170" textAnchor="middle" fontFamily="'Alfa Slab One', serif" fontSize="150" letterSpacing="4" fill="url(#logo-gold)" stroke="#5a2e08" strokeWidth="3">
          TRUCO
        </text>
        <g clipPath="url(#logo-text-clip)">
          <rect className="logo-shine" x="-200" y="20" width="140" height="200" fill="url(#logo-shine)" transform="skewX(-20)" />
        </g>
        {/* cinta */}
        <path d="M 120 205 L 520 205 L 545 232 L 520 259 L 120 259 L 95 232 Z" fill="url(#logo-ribbon)" stroke="#4a0c08" strokeWidth="3" />
        <path d="M 95 232 L 70 218 L 82 244 Z" fill="#6a1410" />
        <path d="M 545 232 L 570 218 L 558 244 Z" fill="#6a1410" />
        <text x="320" y="246" textAnchor="middle" fontFamily="'Lobster', cursive" fontSize="40" fill="#fff4d6" stroke="#4a0c08" strokeWidth="1.5" paintOrder="stroke">
          La Revancha
        </text>
        {/* sol */}
        <g transform="translate(320 46)">
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i / 16) * Math.PI * 2;
            return <line key={i} x1={Math.cos(a) * 14} y1={Math.sin(a) * 14} x2={Math.cos(a) * (i % 2 ? 22 : 27)} y2={Math.sin(a) * (i % 2 ? 22 : 27)} stroke="#f2c14e" strokeWidth="3" strokeLinecap="round" />;
          })}
          <circle r="12" fill="#f5c64a" stroke="#7a4b0e" strokeWidth="2" />
        </g>
      </svg>
    </motion.div>
  );
}
