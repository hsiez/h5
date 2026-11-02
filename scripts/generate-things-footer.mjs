// Frozen composition with embedded source drawings; no network or Blob dependency.
// Run: node scripts/generate-things-footer.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';
import { readFile, mkdir } from 'node:fs/promises';
const html = await readFile(new URL('./fixtures/things-footer.html', import.meta.url), 'utf8');
const output = new URL('../public/things/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const [name, width] of [['desktop', 1920], ['mobile', 700]]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
    await page.setContent(html);
    await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth));
    const png = await page.locator('[class*="inventoryStrip"]').screenshot();
    await sharp(png).webp({ quality: 90 }).toFile(new URL(`footer-${name}.webp`, output).pathname);
    await page.close();
  }
} finally { await browser.close(); }
