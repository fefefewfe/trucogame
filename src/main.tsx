import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/alfa-slab-one/400.css';
import '@fontsource/lobster/400.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/600.css';
import './styles/global.css';
import './styles/game.css';
import './styles/menu.css';
import './styles/screens.css';
import { App } from './App';
import { SvgDefs } from './ui/art/SvgDefs';
import { Gallery } from './ui/dev/Gallery';

const gallery = import.meta.env.DEV && new URLSearchParams(window.location.search).has('galeria');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SvgDefs />
    {gallery ? <Gallery /> : <App />}
  </StrictMode>,
);

// Instalable como aplicación y jugable sin conexión contra la computadora.
if (import.meta.env.PROD && 'serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
