// Renders the source images used by `@capacitor/assets` (launcher icon and splash screen) from
// inline SVG, then run: npx capacitor-assets generate --android
// Usage: node scripts/generate-app-assets.mjs
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const ACCENT = '#c2185b';
const DARK_BG = '#121212';
const LIGHT_BG = '#fafafa';

// Open book glyph on a 100x100 grid.
const glyph = (color) => `
  <path fill="${color}" d="M14 22h26a6 6 0 0 1 6 6v48a5 5 0 0 0-5-5H14z"/>
  <path fill="${color}" d="M86 22H60a6 6 0 0 0-6 6v48a5 5 0 0 1 5-5h27z"/>`;

const svg = (size, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${body}</svg>`;

const render = (svgText, file) => sharp(Buffer.from(svgText)).png().toFile(file);

mkdirSync('assets', { recursive: true });

await Promise.all([
  // Legacy square icon.
  render(
    svg(1024, `<rect width="100" height="100" rx="22" fill="${ACCENT}"/>${glyph('#fff')}`),
    'assets/icon-only.png',
  ),
  // Adaptive icon: the glyph stays inside the central safe zone (66%).
  render(
    svg(1024, `<g transform="translate(25 25) scale(0.5)">${glyph('#fff')}</g>`),
    'assets/icon-foreground.png',
  ),
  render(
    svg(1024, `<rect width="100" height="100" fill="${ACCENT}"/>`),
    'assets/icon-background.png',
  ),
  // Splash screens: small centred icon on the app background.
  render(
    svg(
      2732,
      `<rect width="100" height="100" fill="${LIGHT_BG}"/><g transform="translate(42 42) scale(0.16)"><rect width="100" height="100" rx="22" fill="${ACCENT}"/>${glyph('#fff')}</g>`,
    ),
    'assets/splash.png',
  ),
  render(
    svg(
      2732,
      `<rect width="100" height="100" fill="${DARK_BG}"/><g transform="translate(42 42) scale(0.16)"><rect width="100" height="100" rx="22" fill="${ACCENT}"/>${glyph('#fff')}</g>`,
    ),
    'assets/splash-dark.png',
  ),
]);

// Web app (PWA) icons, served from public/. iOS rounds apple-touch-icon itself: full bleed.
const fullBleed = (size) =>
  svg(size, `<rect width="100" height="100" fill="${ACCENT}"/>${glyph('#fff')}`);
const rounded = (size) =>
  svg(size, `<rect width="100" height="100" rx="22" fill="${ACCENT}"/>${glyph('#fff')}`);
// Maskable icons keep the glyph inside the 80% safe circle.
const maskable = (size) =>
  svg(
    size,
    `<rect width="100" height="100" fill="${ACCENT}"/><g transform="translate(15 15) scale(0.7)">${glyph('#fff')}</g>`,
  );
await Promise.all([
  render(rounded(192), 'public/pwa-192.png'),
  render(rounded(512), 'public/pwa-512.png'),
  render(maskable(512), 'public/pwa-maskable-512.png'),
  render(fullBleed(180), 'public/apple-touch-icon.png'),
]);

console.log('Source assets written to assets/ and web icons to public/');
