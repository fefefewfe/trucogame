/**
 * Geometría de la mesa: dónde va cada jugador, sus cartas y las cartas jugadas.
 * Todo se calcula en píxeles a partir del tamaño real de la pantalla.
 */
export interface Point {
  x: number;
  y: number;
}

export interface SeatLayout {
  seat: number;
  vis: number;
  angle: number;
  avatar: Point;
  avatarSize: number;
  /** Centro del abanico de cartas tapadas (rivales y compañeros). */
  hand: Point;
  handRot: number;
  /** Dirección hacia el centro de la mesa (vector unitario). */
  inward: Point;
}

export interface Layout {
  w: number;
  h: number;
  portrait: boolean;
  compact: boolean;
  center: Point;
  cardW: number;
  cardH: number;
  tableW: number;
  tableH: number;
  backW: number;
  backH: number;
  handY: number;
  seats: SeatLayout[];
  /** Área de la mesa (elipse) para dibujar el paño. */
  felt: { x: number; y: number; rx: number; ry: number };
  played(seat: number, baza: number): Point & { rot: number };
  myHand(index: number, count: number, fan: boolean): Point & { rot: number };
  backPos(seat: number, index: number, count: number): Point & { rot: number };
  deck(dealer: number): Point;
}

const rad = (deg: number) => (deg * Math.PI) / 180;

function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function computeLayout(w: number, h: number, n: number, humanSeat: number): Layout {
  const portrait = h > w * 1.05;
  const compact = Math.min(w, h) < 520;
  const cardW = Math.round(
    portrait ? Math.min(w * 0.25, h * 0.15, 150) : Math.max(74, Math.min(w * 0.11, h * 0.2, 160)),
  );
  const cardH = Math.round(cardW * 1.55);
  const tableScale = portrait ? (n === 2 ? 0.72 : n === 4 ? 0.6 : 0.5) : n === 2 ? 0.72 : n === 4 ? 0.58 : 0.48;
  const tableW = Math.round(cardW * tableScale);
  const tableH = Math.round(tableW * 1.55);
  const backW = Math.round(cardW * (n === 6 ? 0.36 : 0.44));
  const backH = Math.round(backW * 1.55);
  const handY = h - cardH * 0.5 - (portrait ? 14 : 18);
  const center: Point = { x: w / 2, y: portrait ? h * 0.43 : h * 0.42 };

  const avatarBase = portrait ? Math.min(64, w * 0.15) : Math.min(84, h * 0.1);
  const arx = portrait ? w * 0.39 : Math.min(w * 0.42, h * 0.95);
  const ary = portrait ? h * 0.255 : h * 0.33;

  const seats: SeatLayout[] = [];
  for (let seat = 0; seat < n; seat++) {
    const vis = (seat - humanSeat + n) % n;
    const angle = 90 - vis * (360 / n);
    const cos = Math.cos(rad(angle));
    const sin = Math.sin(rad(angle));
    const avatarSize = vis === 0 ? avatarBase * (portrait ? 0.8 : 0.95) : avatarBase * (n === 6 ? 0.85 : 1);
    let avatar: Point;
    if (vis === 0) {
      avatar = portrait
        ? { x: avatarSize * 0.62 + 6, y: handY - cardH * 0.5 - avatarSize * 0.75 - 54 }
        : { x: Math.max(avatarSize * 0.7 + 10, w / 2 - cardW * 2.1 - avatarSize * 0.7), y: handY + cardH * 0.08 };
    } else {
      avatar = { x: center.x + arx * cos, y: center.y + ary * sin };
      if (n === 6 && Math.abs(sin) < 0.9) avatar.y += sin > 0 ? -h * 0.04 : h * 0.02;
    }
    const inward = { x: -cos, y: -sin };
    let hand: Point;
    if (vis !== 0 && Math.abs(sin) > 0.7) {
      // Arriba: las cartas tapadas van al costado del avatar para no tapar el nombre.
      hand = { x: avatar.x + avatarSize * (portrait ? 1.0 : 1.15), y: avatar.y + avatarSize * 0.1 };
    } else {
      const handDist = avatarSize * 1.4;
      hand = { x: avatar.x + inward.x * handDist, y: avatar.y + inward.y * handDist - avatarSize * 0.05 };
    }
    const handRot = vis !== 0 && Math.abs(sin) > 0.7 ? 8 : angle - 90 + 180;
    seats.push({ seat, vis, angle, avatar, avatarSize, hand, handRot, inward });
  }

  const prx = portrait ? w * 0.27 : Math.min(w * 0.17, h * 0.34);
  const pry = portrait ? h * 0.115 : h * (n === 2 ? 0.155 : 0.14);
  const felt = {
    x: center.x,
    y: center.y,
    rx: portrait ? w * 0.48 : Math.min(w * 0.47, h * 1.05),
    ry: portrait ? h * 0.26 : h * 0.36,
  };

  const layout: Layout = {
    w,
    h,
    portrait,
    compact,
    center,
    cardW,
    cardH,
    tableW,
    tableH,
    backW,
    backH,
    handY,
    seats,
    felt,
    played(seat, baza) {
      const s = seats[seat];
      const cos = Math.cos(rad(s.angle));
      const sin = Math.sin(rad(s.angle));
      const radial = n === 2 ? 1 : n === 4 ? 1 : 1.05;
      const base = { x: center.x + prx * cos * radial, y: center.y + pry * sin * radial };
      // Las bazas quedan en columnas (izquierda a derecha) para comparar fácil;
      // en los asientos laterales se apilan de arriba hacia abajo.
      const vertical = Math.abs(sin) >= 0.5;
      const spacing = tableW * (vertical ? (n === 2 ? 0.86 : 0.7) : 0.42);
      const off = (baza - 1) * spacing;
      const jitter = (hash(seat * 7 + baza * 13) - 0.5) * 10;
      const sideTilt = vertical ? 0 : cos > 0 ? -10 : 10;
      return vertical
        ? { x: base.x + off, y: base.y + baza * 2, rot: jitter + sideTilt }
        : { x: base.x - cos * Math.abs(off) * 0.15, y: base.y + off, rot: jitter + sideTilt };
    },
    myHand(index, count, fan) {
      const t = index - (count - 1) / 2;
      if (fan) {
        return { x: w / 2 + t * cardW * 0.74, y: handY + t * t * cardH * 0.035, rot: t * 7 };
      }
      return { x: w / 2 + t * cardW * 1.06, y: handY, rot: 0 };
    },
    backPos(seat, index, count) {
      const s = seats[seat];
      const t = index - (count - 1) / 2;
      const spread = backW * 0.42;
      // abanico perpendicular a la dirección hacia el centro
      const px = -s.inward.y;
      const py = s.inward.x;
      return {
        x: s.hand.x + px * t * spread,
        y: s.hand.y + py * t * spread + Math.abs(t) * 2,
        rot: s.handRot + t * 12,
      };
    },
    deck(dealer) {
      const s = seats[dealer];
      if (s.vis === 0) return { x: center.x - prx * 1.25, y: handY - cardH * 0.9 };
      return { x: s.avatar.x * 0.55 + center.x * 0.45, y: s.avatar.y * 0.55 + center.y * 0.45 };
    },
  };
  return layout;
}
