import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { parseCardId } from '../../engine/cards';
import { music } from '../../audio/music';
import { ambience } from '../../audio/ambience';
import { sfx } from '../../audio/sfx';
import { CHARACTERS, getCharacter } from '../../game/characters';
import { CLOTHS, cosmeticValue, TABLES } from '../../game/cosmetics';
import { levelFromXp } from '../../game/progression';
import { buildSeats } from '../../game/setup';
import { startLocalMatch } from '../../game/launcher';
import { useNav, type ScreenId } from '../../store/nav';
import { usePrefs } from '../../store/prefs';
import { useProfile } from '../../store/profile';
import { useSettings } from '../../store/settings';
import { Avatar } from '../art/Avatar';
import { CardBack, CardFace, type CardBackStyle } from '../art/CardFace';
import { ProfileChip } from '../common/ProfileChip';
import { Particles } from '../fx/Particles';
import { Backdrop } from '../scene/Backdrop';
import { Logo } from './Logo';

const MENU: { id: string; label: string; screen?: ScreenId; params?: Record<string, unknown>; primary?: boolean; note?: string }[] = [
  { id: 'jugar', label: 'Jugar ahora', primary: true },
  { id: 'multi', label: 'Multijugador', screen: 'online', params: { tab: 'publica' }, note: 'Online' },
  { id: 'amigos', label: 'Jugar con amigos', screen: 'online', params: { tab: 'amigos' }, note: 'Código' },
  { id: 'historia', label: 'Modo historia', screen: 'historia' },
  { id: 'torneos', label: 'Torneos', screen: 'torneos' },
  { id: 'personajes', label: 'Personajes', screen: 'personajes' },
  { id: 'tienda', label: 'Tienda', screen: 'tienda' },
  { id: 'perfil', label: 'Mi perfil', screen: 'perfil' },
  { id: 'config', label: 'Configuración', screen: 'config' },
];

const TABLE_CARDS = ['1-espada', '7-oro', '1-basto'];

export function MainMenu() {
  const nav = useNav();
  const profile = useProfile();
  const prefs = usePrefs();
  const animations = useSettings((s) => s.animations);
  const table = TABLES[cosmeticValue(profile.equipped.mesa)] ?? TABLES.bodegon;
  const cloth = CLOTHS[cosmeticValue(profile.equipped.paño)] ?? CLOTHS.verde;
  const back = cosmeticValue(profile.equipped.reverso) as CardBackStyle;

  useEffect(() => {
    music.play('menu');
    ambience.start();
    return () => ambience.stop();
  }, []);

  const quickPlay = () => {
    sfx.click();
    const pool = CHARACTERS.filter((c) => c.id !== profile.characterId).map((c) => c.id);
    const rival = pool[Math.floor(Math.random() * pool.length)];
    const lvl = levelFromXp(profile.xp).level;
    startLocalMatch({
      mode: 'rapida',
      numPlayers: 2,
      targetScore: prefs.target,
      flor: prefs.flor,
      difficulty: prefs.difficulty,
      seats: buildSeats({ name: profile.name, characterId: profile.characterId, level: lvl }, [rival], [], prefs.difficulty, 2),
      tableId: cosmeticValue(profile.equipped.mesa),
      clothId: cosmeticValue(profile.equipped.paño),
    });
  };

  const watchers = ['tano', 'abuela', 'cordobes'];

  return (
    <div className="main-menu" style={{ '--felt': cloth.felt, '--felt-dark': cloth.feltDark, '--wood': table.wood, '--wood-dark': table.woodDark, '--wood-light': table.woodLight } as React.CSSProperties}>
      <Backdrop theme={table} sign={false} className="menu-backdrop" />
      {animations !== 'minimas' && <Particles style="polvo" loop intensity={animations === 'completas' ? 1 : 0.4} className="menu-dust" />}

      <div className="menu-patrons" aria-hidden="true">
        {watchers.map((id, i) => (
          <motion.div
            key={id}
            className={`patron patron-${i}`}
            animate={animations === 'completas' ? { y: [0, -4, 0], rotate: [0, i % 2 ? 1.5 : -1.5, 0] } : undefined}
            transition={{ duration: 3 + i, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Avatar look={getCharacter(id).look} expression={i === 1 ? 'smug' : i === 2 ? 'laugh' : 'thinking'} size="100%" framed={false} />
          </motion.div>
        ))}
      </div>

      <div className="menu-table" aria-hidden="true">
        <div className="menu-table-top" />
        {TABLE_CARDS.map((id, i) => (
          <motion.div
            key={id}
            className={`menu-card menu-card-${i}`}
            initial={{ y: -200, opacity: 0, rotate: -30 }}
            animate={{ y: 0, opacity: 1, rotate: [-14, 6, 18][i] }}
            transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.5 + i * 0.15 }}
          >
            <motion.div
              animate={animations === 'completas' ? { y: [0, -6, 0], rotate: [0, 1.2, 0] } : undefined}
              transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
              className="menu-card-inner"
            >
              <CardFace card={parseCardId(id)} />
            </motion.div>
          </motion.div>
        ))}
        <motion.div className="menu-deck" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="menu-deck-card" style={{ transform: `translate(${i * 2}px, ${-i * 2}px)` }}>
              <CardBack style={back} />
            </div>
          ))}
        </motion.div>
        <div className="menu-mate">
          <svg viewBox="0 0 120 160">
            <ellipse cx={60} cy={150} rx={44} ry={8} fill="#000" opacity={0.35} />
            <path d="M 22 60 Q 14 140 60 148 Q 106 140 98 60 Z" fill="#7a4a24" stroke="#3a1f0c" strokeWidth={3} />
            <path d="M 22 60 Q 60 72 98 60" fill="none" stroke="#c9a24a" strokeWidth={6} />
            <ellipse cx={60} cy={60} rx={38} ry={10} fill="#4a6a2a" />
            <path d="M 66 62 L 96 4 L 102 7 L 74 64 Z" fill="#c9c9c9" stroke="#777" strokeWidth={2} />
            <path d="M 34 90 Q 40 120 56 132" stroke="#ffffff" strokeOpacity={0.25} strokeWidth={6} fill="none" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div className="menu-top">
        <ProfileChip />
      </div>

      <div className="menu-content">
        <Logo />
        <nav className="menu-buttons" aria-label="Menú principal">
          {MENU.map((item, i) => (
            <motion.button
              key={item.id}
              className={`menu-btn ${item.primary ? 'primary' : ''}`}
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.25 + i * 0.05, type: 'spring', stiffness: 260, damping: 22 }}
              whileHover={{ x: 6, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onMouseEnter={() => sfx.hover()}
              onClick={() => {
                if (item.id === 'jugar') {
                  quickPlay();
                  return;
                }
                sfx.click();
                if (item.screen) nav.go(item.screen, item.params);
              }}
            >
              <span>{item.label}</span>
              {item.note && <small>{item.note}</small>}
            </motion.button>
          ))}
          <div className="menu-secondary">
            <button className="link-btn" onClick={() => nav.go('jugar')}>
              Partida personalizada
            </button>
            <span>·</span>
            <button className="link-btn" onClick={() => nav.go('tutorial')}>
              {profile.tutorialDone ? 'Repasar el tutorial' : 'Aprender a jugar'}
            </button>
          </div>
        </nav>
      </div>
      <div className="menu-footer">Juego de cartas gratuito · Las monedas son virtuales y solo sirven para cosméticos.</div>
    </div>
  );
}
