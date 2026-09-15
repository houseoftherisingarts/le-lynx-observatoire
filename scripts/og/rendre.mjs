// Rend la vignette de partage du Lynx (1200 × 630, JPG sous 300 Ko pour WhatsApp)
// et l'icone d'ecran d'accueil (180 × 180), a partir de scripts/og/carte.html.
//   node scripts/og/rendre.mjs   ->  public/images/og-lelynx.jpg + public/images/apple-touch-icon.png
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, statSync } from 'node:fs';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = join(ici, '..', '..');
const images = join(racine, 'public', 'images');
mkdirSync(images, { recursive: true });

const nav = await chromium.launch();

const page = await nav.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(join(ici, 'carte.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600);
const carte = join(images, 'og-lelynx.jpg');
await page.screenshot({ path: carte, type: 'jpeg', quality: 86 });
console.log('vignette :', carte, Math.round(statSync(carte).size / 1024), 'Ko');

const icone = await nav.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
await icone.setContent(`<body style="margin:0;width:180px;height:180px;background:#060b12;
  display:flex;align-items:center;justify-content:center;">
  <img src="${pathToFileURL(join(racine, 'public', 'courriel', 'logo.png')).href}"
       style="width:124px;height:144px;object-fit:contain;">
</body>`, { waitUntil: 'networkidle' });
await icone.waitForTimeout(300);
const png = join(images, 'apple-touch-icon.png');
await icone.screenshot({ path: png, type: 'png' });
console.log('icone :', png, Math.round(statSync(png).size / 1024), 'Ko');

await nav.close();
