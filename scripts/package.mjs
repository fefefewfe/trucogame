/**
 * Arma la versión descargable del juego en la carpeta release/:
 *
 * - TrucoLaRevancha.html: todo el juego en un solo archivo (código, estilos y
 *   tipografías adentro). Se abre con doble clic y se juega contra la
 *   computadora sin instalar nada.
 * - TrucoLaRevancha.zip: ese mismo archivo (Jugar.html) más el servidor
 *   compilado en un único servidor.mjs y lanzadores para Windows, Mac y Linux.
 *   Con Node.js instalado suma el micrófono y las partidas online con amigos
 *   de la misma red.
 *
 * Uso: npm run paquete
 */
import { execFileSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as esbuild } from 'esbuild';
import { build as viteBuild } from 'vite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'release');
const singleDir = join(out, '.un-archivo');
const pkgDir = join(out, 'TrucoLaRevancha');
const gameDir = join(pkgDir, 'juego');

rmSync(out, { recursive: true, force: true });
mkdirSync(gameDir, { recursive: true });

// 1. Versión normal, la que sirve el servidor (con PWA, voces y cartas opcionales).
await viteBuild({ root, logLevel: 'warn', build: { outDir: join(gameDir, 'dist'), emptyOutDir: true } });

// 2. Versión de un solo archivo: sin división en partes y con todos los recursos embebidos.
await viteBuild({
  root,
  base: './',
  publicDir: false,
  logLevel: 'warn',
  build: {
    outDir: singleDir,
    emptyOutDir: true,
    assetsInlineLimit: () => true,
    cssCodeSplit: false,
    modulePreload: false,
    rolldownOptions: { output: { codeSplitting: false } },
  },
});
const assets = join(singleDir, 'assets');
const files = readdirSync(assets);
const jsFiles = files.filter((f) => f.endsWith('.js'));
const cssFiles = files.filter((f) => f.endsWith('.css'));
if (jsFiles.length !== 1 || cssFiles.length !== 1 || files.length !== 2) {
  throw new Error(`La versión de un archivo debería tener un .js y un .css, quedó: ${files.join(', ')}`);
}
const dataUri = (file, type) => `data:${type};base64,${readFileSync(join(root, 'public', file)).toString('base64')}`;
let html = readFileSync(join(singleDir, 'index.html'), 'utf8');
html = html
  .replace(/<script type="module" crossorigin src="[^"]+"><\/script>/, () => {
    const js = readFileSync(join(assets, jsFiles[0]), 'utf8').replaceAll('</script', '<\\/script');
    return `<script type="module">${js}</script>`;
  })
  .replace(/<link rel="stylesheet" crossorigin href="[^"]+">/, () => `<style>${readFileSync(join(assets, cssFiles[0]), 'utf8')}</style>`)
  .replace(/href="\.?\/icon\.svg"/, () => `href="${dataUri('icon.svg', 'image/svg+xml')}"`)
  .replace(/href="\.?\/icon-192\.png"/, () => `href="${dataUri('icon-192.png', 'image/png')}"`)
  .replace(/\s*<link rel="manifest"[^>]*>/, '');
if (/(src|href)="\.?\/(?!\/)/.test(html)) throw new Error('Jugar.html todavía apunta a archivos externos.');
writeFileSync(join(out, 'TrucoLaRevancha.html'), html);
copyFileSync(join(out, 'TrucoLaRevancha.html'), join(pkgDir, 'Jugar.html'));
rmSync(singleDir, { recursive: true, force: true });

// 3. Servidor en un solo archivo: solo necesita Node.js, sin npm install.
await esbuild({
  entryPoints: [join(root, 'server/index.ts')],
  outfile: join(gameDir, 'servidor.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  minify: true,
  logLevel: 'warning',
  // Las dependencias de socket.io escritas en CommonJS usan require.
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  // Aceleradores opcionales de ws: si no están, funciona igual.
  external: ['bufferutil', 'utf-8-validate'],
});

// 4. Licencias de lo que va adentro del paquete (bibliotecas y tipografías).
const deps = execFileSync('npm', ['ls', '--omit=dev', '--all', '--parseable'], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' })
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l.includes('node_modules'));
const notices = [...new Set(deps)].sort().map((dir) => {
  const meta = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const licenseFile = readdirSync(dir).find((f) => /^(licen[cs]e|copying)/i.test(f));
  const text = licenseFile ? readFileSync(join(dir, licenseFile), 'utf8').trim() : `Licencia: ${meta.license ?? 'no indicada'}`;
  return `${meta.name} ${meta.version}\n${'-'.repeat(60)}\n${text}\n`;
});
writeFileSync(join(pkgDir, 'LICENCIAS-TERCEROS.txt'), notices.join('\n\n').replace(/\r?\n/g, '\r\n'));

// 5. Lanzadores y instrucciones.
const crlf = (s) => s.replace(/\r?\n/g, '\r\n');
writeFileSync(
  join(pkgDir, 'Iniciar (Windows).bat'),
  crlf(`@echo off
chcp 65001 >nul
title Truco: La Revancha
cd /d "%~dp0juego"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Para el modo completo, con microfono y online, hace falta Node.js, que es gratis.
  echo  Se abre la pagina de descarga: instala la version LTS y volve a abrir este archivo.
  echo.
  echo  Mientras tanto podes jugar contra la computadora abriendo Jugar.html
  echo.
  start "" "https://nodejs.org/es/download"
  pause
  exit /b 1
)
set "DATA_FILE=%~dp0juego\\datos\\datos.json"
set "OPEN_BROWSER=1"
echo.
echo  Deja esta ventana abierta mientras jugas. Para apagar el juego, cerrala.
echo.
node servidor.mjs
pause
`),
);
const unix = (open) => `#!/bin/bash
cd "$(dirname "$0")/juego" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Para el modo completo, con micrófono y online, hace falta Node.js, que es gratis."
  echo "Se abre la página de descarga: instalá la versión LTS y volvé a abrir este archivo."
  echo "Mientras tanto podés jugar contra la computadora abriendo Jugar.html"
  ${open} "https://nodejs.org/es/download" >/dev/null 2>&1
  read -r -p "Apretá Enter para cerrar."
  exit 1
fi
export DATA_FILE="$PWD/datos/datos.json" OPEN_BROWSER=1
echo "Dejá esta ventana abierta mientras jugás. Para apagar el juego, cerrala o apretá Ctrl+C."
node servidor.mjs
`;
writeFileSync(join(pkgDir, 'Iniciar (Mac).command'), unix('open'));
writeFileSync(join(pkgDir, 'iniciar-linux.sh'), unix('xdg-open'));
chmodSync(join(pkgDir, 'Iniciar (Mac).command'), 0o755);
chmodSync(join(pkgDir, 'iniciar-linux.sh'), 0o755);
writeFileSync(
  join(pkgDir, 'LEEME.txt'),
  crlf(`TRUCO: LA REVANCHA
==================

Hay dos formas de jugar.


1) RÁPIDO, SIN INSTALAR NADA

   Abrí "Jugar.html" con doble clic (mejor en Chrome o Edge).

   Jugás contra la computadora: partida rápida, partidas de 1 contra 1,
   2 contra 2 y 3 contra 3 con señas, modo historia, torneos, tutorial,
   tienda y perfil. Para el micrófono y el online usá la forma 2.


2) COMPLETO: MICRÓFONO Y ONLINE CON AMIGOS

   Necesitás Node.js, que es gratis: https://nodejs.org/es/download
   (instalá la versión LTS). Después abrí el lanzador de tu sistema:

   - Windows: "Iniciar (Windows).bat"
     Si aparece "Windows protegió su PC", tocá "Más información" y
     después "Ejecutar de todas formas".
   - Mac: "Iniciar (Mac).command"
     La primera vez hacé clic derecho > Abrir > Abrir, porque macOS
     bloquea los archivos descargados de internet.
   - Linux: "iniciar-linux.sh"

   El juego se abre solo en http://localhost:3001. Dejá abierta la ventana
   negra mientras jugás: si la cerrás, se apaga el juego.

   Para jugar con amigos conectados al mismo WiFi: la ventana negra muestra
   una dirección como http://192.168.0.10:3001. Tus amigos la abren en su
   navegador (sirve el celular), vos creás una sala en "Online" y les pasás
   el código. Si Windows pregunta por el Firewall, permití el acceso en
   redes privadas.


MICRÓFONO

   En la mesa tocá el botón del micrófono y hablá: "truco", "retruco",
   "quiero", "no quiero", "envido", "real envido", "falta envido", "flor",
   "me voy al mazo", o una carta: "el ancho de espada", "la más alta".
   Funciona en Chrome y Edge.


VOCES

   Los personajes hablan con las voces en español que tenga tu dispositivo.
   En Windows, Edge trae voces argentinas; en Mac y iPhone está la voz
   "Diego". Se cambia en Configuración.


TU PROGRESO

   Se guarda en el navegador. Jugar.html y el modo completo guardan cada
   uno por su lado.
`),
);

// 6. Comprimir (zip en Linux y Mac; tar viene con Windows 10 y posteriores).
try {
  execFileSync('zip', ['-r', '-X', '-q', 'TrucoLaRevancha.zip', 'TrucoLaRevancha'], { cwd: out });
} catch {
  try {
    execFileSync('tar', ['-a', '-c', '-f', 'TrucoLaRevancha.zip', 'TrucoLaRevancha'], { cwd: out });
  } catch {
    console.log('No se encontró zip ni tar: la carpeta release/TrucoLaRevancha quedó lista para comprimir a mano.');
  }
}
console.log('Listo: release/TrucoLaRevancha.html y release/TrucoLaRevancha.zip');
