/**
 * Definiciones SVG compartidas (degradados y patrones) que usan las cartas y
 * los reversos. Se montan una sola vez para no duplicar ids en el documento.
 */
export function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="card-paper" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="0.55" stopColor="#f7eedb" />
          <stop offset="1" stopColor="#ecdfc2" />
        </linearGradient>
        <radialGradient id="card-sheen" cx="0.25" cy="0.15" r="0.9">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="g-oro" cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#fff2b0" />
          <stop offset="0.35" stopColor="#f3c84b" />
          <stop offset="0.8" stopColor="#d79a1e" />
          <stop offset="1" stopColor="#a66d0f" />
        </radialGradient>
        <radialGradient id="g-oro-inner" cx="0.45" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#ffe48a" />
          <stop offset="1" stopColor="#e2a52b" />
        </radialGradient>
        <linearGradient id="g-copa" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8e1620" />
          <stop offset="0.35" stopColor="#d8323b" />
          <stop offset="0.55" stopColor="#f0545a" />
          <stop offset="1" stopColor="#8e1620" />
        </linearGradient>
        <linearGradient id="g-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe9a3" />
          <stop offset="0.5" stopColor="#e8b23c" />
          <stop offset="1" stopColor="#a8701a" />
        </linearGradient>
        <linearGradient id="g-steel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8fa6c9" />
          <stop offset="0.45" stopColor="#eef4ff" />
          <stop offset="0.55" stopColor="#c9d6ec" />
          <stop offset="1" stopColor="#6d83aa" />
        </linearGradient>
        <linearGradient id="g-steel-blue" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3f64b0" />
          <stop offset="0.42" stopColor="#c9dbff" />
          <stop offset="0.55" stopColor="#7d9ee0" />
          <stop offset="1" stopColor="#2a4a8a" />
        </linearGradient>
        <linearGradient id="g-guard" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4f86e0" />
          <stop offset="1" stopColor="#1f468f" />
        </linearGradient>
        <linearGradient id="g-basto" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3d6b2c" />
          <stop offset="0.4" stopColor="#6f9a3d" />
          <stop offset="0.6" stopColor="#8a6a30" />
          <stop offset="1" stopColor="#4a3317" />
        </linearGradient>
        <linearGradient id="g-wood-grip" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5a3412" />
          <stop offset="0.5" stopColor="#9a6328" />
          <stop offset="1" stopColor="#5a3412" />
        </linearGradient>
        <radialGradient id="g-skin" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#ffe2c4" />
          <stop offset="1" stopColor="#e5ae84" />
        </radialGradient>
        <radialGradient id="g-glow-brava" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff3c0" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff3c0" stopOpacity="0" />
        </radialGradient>

        {/* Reversos */}
        <pattern id="pat-clasico" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="16" height="16" fill="#9e1b22" />
          <rect x="0" y="0" width="8" height="8" fill="#b8262d" />
          <rect x="8" y="8" width="8" height="8" fill="#b8262d" />
          <circle cx="8" cy="8" r="1.6" fill="#f0c75e" />
        </pattern>
        <pattern id="pat-azul" width="18" height="18" patternUnits="userSpaceOnUse">
          <rect width="18" height="18" fill="#132f63" />
          <path d="M0 9 L9 0 L18 9 L9 18 Z" fill="none" stroke="#d9b45a" strokeWidth="1" />
          <circle cx="9" cy="9" r="2" fill="#2d5aa8" />
        </pattern>
        <pattern id="pat-celeste" width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="#f4f8fc" />
          <rect width="24" height="8" fill="#74acdf" />
          <rect y="16" width="24" height="8" fill="#74acdf" />
        </pattern>
        <pattern id="pat-premium" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="#121212" />
          <path d="M10 0 Q14 6 10 10 Q6 14 10 20" fill="none" stroke="#c9a24a" strokeWidth="0.8" />
          <path d="M0 10 Q6 6 10 10 Q14 14 20 10" fill="none" stroke="#7d6430" strokeWidth="0.6" />
        </pattern>
        <pattern id="pat-fileteado" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="#1d1d1d" />
          <path d="M4 20 C4 8 18 6 20 16 C22 24 12 26 12 20 C12 16 17 16 17 19" fill="none" stroke="#e23b3b" strokeWidth="2" strokeLinecap="round" />
          <path d="M36 20 C36 32 22 34 20 24 C18 16 28 14 28 20 C28 24 23 24 23 21" fill="none" stroke="#3fae5a" strokeWidth="2" strokeLinecap="round" />
          <circle cx="20" cy="20" r="2.2" fill="#f2c14e" />
          <circle cx="4" cy="4" r="1.4" fill="#5fb4e6" />
          <circle cx="36" cy="36" r="1.4" fill="#5fb4e6" />
        </pattern>
        <pattern id="pat-paño" width="28" height="28" patternUnits="userSpaceOnUse">
          <rect width="28" height="28" fill="#145a3c" />
          <path d="M0 14 L14 0 L28 14 L14 28 Z" fill="#0f4a31" />
          <circle cx="14" cy="14" r="3" fill="none" stroke="#e8c35a" strokeWidth="1" />
        </pattern>
      </defs>
    </svg>
  );
}
