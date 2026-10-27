import { motion } from 'framer-motion';
import { useState } from 'react';
import { parseCardId } from '../../engine/cards';
import { sfx } from '../../audio/sfx';
import { getCharacter } from '../../game/characters';
import { CLOTHS, COSMETICS, cosmeticValue, QUICK_MESSAGES, TABLES, type Cosmetic, type CosmeticKind } from '../../game/cosmetics';
import { useProfile } from '../../store/profile';
import { Avatar } from '../art/Avatar';
import { CardBack, CardFace, type CardBackStyle, type DeckStyle } from '../art/CardFace';
import { ScreenHeader } from '../common/ProfileChip';
import { Particles, type ParticleStyle } from '../fx/Particles';
import { Backdrop } from '../scene/Backdrop';

const TABS: { kind: CosmeticKind; label: string }[] = [
  { kind: 'mesa', label: 'Mesas' },
  { kind: 'paño', label: 'Paños' },
  { kind: 'reverso', label: 'Reversos' },
  { kind: 'baraja', label: 'Barajas' },
  { kind: 'marco', label: 'Marcos' },
  { kind: 'festejo', label: 'Festejos' },
  { kind: 'frases', label: 'Mensajes' },
];

function Preview({ item, hover }: { item: Cosmetic; hover: boolean }) {
  const v = cosmeticValue(item.id);
  const profile = useProfile();
  switch (item.kind) {
    case 'mesa': {
      const t = TABLES[v];
      return (
        <div className="pv-mesa">
          <Backdrop theme={t} people={false} />
          <div className="pv-mesa-table" style={{ background: `radial-gradient(ellipse at 50% 40%, ${CLOTHS.verde.felt}, ${CLOTHS.verde.feltDark})`, borderColor: t.wood }} />
        </div>
      );
    }
    case 'paño': {
      const c = CLOTHS[v];
      return <div className="pv-cloth" style={{ background: `radial-gradient(ellipse at 50% 40%, ${c.felt}, ${c.feltDark})`, borderColor: c.line }} />;
    }
    case 'reverso':
      return (
        <div className="pv-card">
          <CardBack style={v as CardBackStyle} />
        </div>
      );
    case 'baraja':
      return (
        <div className="pv-cards">
          <div className="pv-card small" style={{ transform: 'rotate(-8deg)' }}>
            <CardFace card={parseCardId('12-oro')} deck={v as DeckStyle} />
          </div>
          <div className="pv-card small" style={{ transform: 'rotate(8deg) translateX(-18px)' }}>
            <CardFace card={parseCardId('1-espada')} deck={v as DeckStyle} />
          </div>
        </div>
      );
    case 'marco':
      return (
        <span className={`avatar-ring big frame-${v}`}>
          <Avatar look={getCharacter(profile.characterId).look} size="100%" animated={false} />
        </span>
      );
    case 'festejo':
      return <div className="pv-fx">{hover ? <Particles style={v === 'confeti' ? 'confeti' : (v as ParticleStyle)} intensity={0.35} loop /> : <span className="pv-fx-hint">Pasá el mouse para ver</span>}</div>;
    case 'frases':
      return (
        <ul className="pv-msgs">
          {(QUICK_MESSAGES[v] ?? []).slice(0, 3).map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      );
  }
}

export function ShopScreen() {
  const profile = useProfile();
  const [tab, setTab] = useState<CosmeticKind>('mesa');
  const [hover, setHover] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const items = COSMETICS.filter((c) => c.kind === tab);
  return (
    <div className="screen shop-screen">
      <ScreenHeader title="Tienda" subtitle="Solo cosméticos. Las monedas se ganan jugando y no se compran con dinero." />
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.kind}
            role="tab"
            aria-selected={tab === t.kind}
            className={tab === t.kind ? 'on' : ''}
            onClick={() => {
              sfx.click();
              setTab(t.kind);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="shop-grid">
        {items.map((item, i) => {
          const owned = profile.owned.includes(item.id);
          const equipped = profile.equipped[item.kind] === item.id;
          const affordable = profile.coins >= item.price;
          return (
            <motion.div
              key={item.id}
              className={`shop-item ${equipped ? 'equipped' : ''} ${flash === item.id ? 'flash' : ''}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onMouseEnter={() => setHover(item.id)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="si-preview">
                <Preview item={item} hover={hover === item.id} />
              </div>
              <div className="si-info">
                <h3>{item.name}</h3>
                <p>{item.description}</p>
              </div>
              <div className="si-action">
                {owned ? (
                  <button
                    className={`btn ${equipped ? 'btn-ghost' : 'btn-secondary'}`}
                    disabled={equipped}
                    onClick={() => {
                      sfx.click();
                      profile.equip(item.id);
                    }}
                  >
                    {equipped ? 'En uso' : 'Usar'}
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    disabled={!affordable}
                    onClick={() => {
                      if (profile.buy(item.id)) {
                        sfx.reward();
                        profile.equip(item.id);
                        setFlash(item.id);
                        setTimeout(() => setFlash(null), 900);
                      }
                    }}
                  >
                    {item.price} <span className="coin" />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
