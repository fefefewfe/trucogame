import { AnimatePresence, motion } from 'framer-motion';
import { memo, useEffect, useRef, useState } from 'react';
import type { Card } from '../../engine/cards';
import type { PlayerView } from '../../engine/view';
import { sfx } from '../../audio/sfx';
import { CardBack, CardFace, type CardBackStyle, type DeckStyle } from '../art/CardFace';
import type { Layout } from './layout';

interface Sprite {
  key: string;
  card?: Card;
  faceUp: boolean;
  x: number;
  y: number;
  rot: number;
  w: number;
  h: number;
  z: number;
  kind: 'mine' | 'table' | 'back';
  from?: { x: number; y: number; rot: number; faceUp: boolean };
  dealDelay?: number;
  win?: boolean;
  dim?: boolean;
}

export interface CardLayerProps {
  view: PlayerView;
  layout: Layout;
  fan: boolean;
  backStyle: CardBackStyle;
  deckStyle: DeckStyle;
  canPlay: boolean;
  doubleTap: boolean;
  dealing: boolean;
  highlight: { baza: number; seat: number | null } | null;
  reduced: boolean;
  onPlay: (cardId: string) => void;
}

function buildSprites(p: CardLayerProps): Sprite[] {
  const { view, layout } = p;
  const h = view.hand;
  const n = view.config.numPlayers;
  const me = view.seat;
  const hk = h.number;
  const sprites: Sprite[] = [];
  const deck = layout.deck(h.dealer);
  const dealOrder = (seat: number, idx: number) => idx * n + ((seat - h.mano + n) % n);

  // Cartas jugadas en la mesa
  h.bazas.forEach((b, bi) => {
    b.plays.forEach((pl, order) => {
      const pos = layout.played(pl.seat, bi);
      const finished = b.winnerTeam !== undefined;
      const isWinner = finished && b.winnerSeat === pl.seat;
      const origin = pl.seat === me ? undefined : layout.backPos(pl.seat, 1, 3);
      sprites.push({
        key: `${hk}-${pl.card.id}`,
        card: pl.card,
        faceUp: true,
        x: pos.x,
        y: pos.y,
        rot: pos.rot,
        w: layout.tableW,
        h: layout.tableH,
        z: 10 + bi * 10 + order,
        kind: 'table',
        from: origin ? { ...origin, faceUp: false } : undefined,
        win: isWinner && p.highlight?.baza === bi,
        dim: finished && !isWinner && b.winnerTeam !== null,
      });
    });
  });

  // Mi mano
  const mine = h.myCards;
  mine.forEach((card, i) => {
    const pos = layout.myHand(i, mine.length, p.fan);
    const dealtIdx = h.myDealt.findIndex((c) => c.id === card.id);
    sprites.push({
      key: `${hk}-${card.id}`,
      card,
      faceUp: true,
      x: pos.x,
      y: pos.y,
      rot: pos.rot,
      w: layout.cardW,
      h: layout.cardH,
      z: 100 + i,
      kind: 'mine',
      from: { x: deck.x, y: deck.y, rot: -20, faceUp: false },
      dealDelay: dealOrder(me, dealtIdx < 0 ? i : dealtIdx) * 0.095,
    });
  });

  // Cartas tapadas de los demás
  for (let seat = 0; seat < n; seat++) {
    if (seat === me) continue;
    const count = h.cardCounts[seat];
    for (let i = 0; i < count; i++) {
      const pos = layout.backPos(seat, i, count);
      sprites.push({
        key: `${hk}-s${seat}-${i}`,
        faceUp: false,
        x: pos.x,
        y: pos.y,
        rot: pos.rot,
        w: layout.backW,
        h: layout.backH,
        z: 5 + i,
        kind: 'back',
        from: { x: deck.x, y: deck.y, rot: -20, faceUp: false },
        dealDelay: dealOrder(seat, i) * 0.095,
      });
    }
  }
  return sprites;
}

const SPRING = { type: 'spring' as const, stiffness: 210, damping: 24, mass: 0.9 };

const CardSprite = memo(function CardSprite({
  s,
  props,
  index,
  collect,
}: {
  s: Sprite;
  props: CardLayerProps;
  index: number;
  collect: { x: number; y: number };
}) {
  const [entered, setEntered] = useState(false);
  const [hover, setHover] = useState(false);
  const [selected, setSelected] = useState(false);
  const dragged = useRef(false);
  const interactive = s.kind === 'mine' && props.canPlay;

  useEffect(() => {
    if (!interactive) setSelected(false);
  }, [interactive]);

  const initial = s.from
    ? { x: s.from.x - s.w / 2, y: s.from.y - s.h / 2, rotate: s.from.rot, scale: s.kind === 'mine' ? 0.5 : s.kind === 'back' ? 0.8 : 0.6, opacity: 1 }
    : false;
  const delay = !entered && s.dealDelay !== undefined ? s.dealDelay : 0;
  const transition = props.reduced ? { duration: 0.18, delay } : { ...SPRING, delay };

  const lifted = s.kind === 'mine' && (selected || (hover && interactive));
  const play = () => {
    if (!interactive || !s.card) return;
    props.onPlay(s.card.id);
  };

  return (
    <motion.div
      className={`sprite sprite-${s.kind}`}
      style={{ width: s.w, height: s.h, zIndex: lifted ? 300 : s.z }}
      initial={initial}
      animate={{ x: s.x - s.w / 2, y: s.y - s.h / 2, rotate: s.rot, scale: s.win ? 1.08 : 1, opacity: 1 }}
      exit={{ x: collect.x - s.w / 2, y: collect.y - s.h / 2, rotate: 90 + index * 3, opacity: 0, scale: 0.5, transition: { duration: 0.45, delay: index * 0.015 } }}
      transition={transition}
      onAnimationComplete={() => setEntered(true)}
    >
      <motion.div
        className="sprite-lift"
        animate={{ y: lifted ? -s.h * 0.16 : 0, scale: selected ? 1.08 : lifted ? 1.04 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        <motion.div
          className={`sprite-drag ${interactive ? 'is-playable' : ''}`}
          drag={interactive}
          dragSnapToOrigin
          dragElastic={0.6}
          dragMomentum={false}
          onDragStart={() => {
            dragged.current = true;
          }}
          onDragEnd={(_, info) => {
            if (info.offset.y < -s.h * 0.45) play();
            setTimeout(() => (dragged.current = false), 30);
          }}
          onHoverStart={() => {
            if (s.kind === 'mine') {
              setHover(true);
              if (interactive) sfx.hover();
            }
          }}
          onHoverEnd={() => setHover(false)}
          onTap={() => {
            if (dragged.current || !interactive) return;
            if (props.doubleTap && !selected) {
              setSelected(true);
              sfx.hover();
              return;
            }
            play();
          }}
          role={interactive ? 'button' : undefined}
          aria-label={interactive && s.card ? `Jugar ${s.card.rank} de ${s.card.suit}` : undefined}
          tabIndex={interactive ? 0 : -1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') play();
          }}
        >
          <motion.div
            className={`card3d ${s.win ? 'is-winner' : ''} ${s.dim ? 'is-dim' : ''} ${lifted ? 'is-lifted' : ''}`}
            initial={{ rotateY: s.from && !s.from.faceUp ? 180 : s.faceUp ? 0 : 180 }}
            animate={{ rotateY: s.faceUp ? 0 : 180 }}
            transition={props.reduced ? { duration: 0.15 } : { duration: 0.42, delay: s.kind === 'mine' && !entered ? delay + 0.32 : s.kind === 'table' ? 0.05 : 0 }}
          >
            <div className="card-face card-front">{s.card && <CardFace card={s.card} deck={props.deckStyle} />}</div>
            <div className="card-face card-back">
              <CardBack style={props.backStyle} />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
});

export function CardLayer(props: CardLayerProps) {
  const sprites = buildSprites(props);
  const collect = props.layout.deck(props.view.hand.dealer);
  const deckPos = props.layout.deck(props.view.hand.dealer);
  return (
    <div className="card-layer">
      <AnimatePresence>
        {props.dealing && (
          <motion.div
            key={`deck-${props.view.hand.number}`}
            className="deck-pile"
            style={{ width: props.layout.backW * 1.1, height: props.layout.backH * 1.1, left: deckPos.x - props.layout.backW * 0.55, top: deckPos.y - props.layout.backH * 0.55 }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1, rotate: [-4, 4, -2, 0] }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.5 }}
          >
            {[0, 1, 2].map((i) => (
              <div key={i} className="deck-card" style={{ transform: `translate(${i * 1.5}px, ${-i * 1.5}px)` }}>
                <CardBack style={props.backStyle} />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sprites.map((s, i) => (
          <CardSprite key={s.key} s={s} props={props} index={i} collect={collect} />
        ))}
      </AnimatePresence>
    </div>
  );
}
