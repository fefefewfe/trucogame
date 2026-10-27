import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { lazy, Suspense, useEffect } from 'react';
import { useNav, type ScreenId } from './store/nav';
import { useSettings } from './store/settings';
import { GameScreen } from './ui/game/GameScreen';
import { MainMenu } from './ui/menu/MainMenu';
import { PlaySetup } from './ui/menu/PlaySetup';

const StoryScreen = lazy(() => import('./ui/screens/StoryScreen').then((m) => ({ default: m.StoryScreen })));
const TournamentScreen = lazy(() => import('./ui/screens/TournamentScreen').then((m) => ({ default: m.TournamentScreen })));
const CharactersScreen = lazy(() => import('./ui/screens/CharactersScreen').then((m) => ({ default: m.CharactersScreen })));
const ShopScreen = lazy(() => import('./ui/screens/ShopScreen').then((m) => ({ default: m.ShopScreen })));
const ProfileScreen = lazy(() => import('./ui/screens/ProfileScreen').then((m) => ({ default: m.ProfileScreen })));
const SettingsScreen = lazy(() => import('./ui/screens/SettingsScreen').then((m) => ({ default: m.SettingsScreen })));
const TutorialScreen = lazy(() => import('./ui/screens/TutorialScreen').then((m) => ({ default: m.TutorialScreen })));
const OnlineScreen = lazy(() => import('./ui/screens/OnlineScreen').then((m) => ({ default: m.OnlineScreen })));

function renderScreen(screen: ScreenId) {
  switch (screen) {
    case 'menu':
      return <MainMenu />;
    case 'jugar':
      return <PlaySetup />;
    case 'partida':
      return <GameScreen />;
    case 'historia':
      return <StoryScreen />;
    case 'torneos':
      return <TournamentScreen />;
    case 'personajes':
      return <CharactersScreen />;
    case 'tienda':
      return <ShopScreen />;
    case 'perfil':
      return <ProfileScreen />;
    case 'config':
      return <SettingsScreen />;
    case 'tutorial':
      return <TutorialScreen />;
    case 'online':
      return <OnlineScreen />;
  }
}

export function App() {
  const screen = useNav((s) => s.screen);
  const animations = useSettings((s) => s.animations);

  useEffect(() => {
    // Enlace de invitación: ?sala=TRUCO-1234
    const sala = new URLSearchParams(window.location.search).get('sala');
    if (sala) useNav.getState().go('online', { tab: 'amigos', code: sala });
  }, []);

  useEffect(() => {
    // Equipos modestos: arrancar con efectos reducidos.
    const nav = navigator as Navigator & { deviceMemory?: number };
    const weak = (nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2;
    if (weak && useSettings.getState().animations === 'completas') useSettings.getState().set({ animations: 'reducidas' });
  }, []);

  return (
    <MotionConfig reducedMotion={animations === 'minimas' ? 'always' : 'user'}>
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          className="screen-root"
          initial={{ opacity: 0, scale: 1.02, filter: 'blur(6px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.985, filter: 'blur(4px)' }}
          transition={{ duration: animations === 'minimas' ? 0.12 : 0.32, ease: 'easeOut' }}
        >
          <Suspense fallback={<div className="screen center-screen loading">Cargando…</div>}>{renderScreen(screen)}</Suspense>
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}
