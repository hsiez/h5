// Run against the local server: node scripts/things-photo-readiness.mjs
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({channel:'chrome'});
let release;
try {
  const page = await browser.newPage({viewport:{width:390,height:844}});
  const gate = new Promise(resolve => {release=resolve;});
  let firstSource;
  await page.route('**/_next/image?**',async route => {
    const source = new URL(route.request().url()).searchParams.get('url');
    firstSource ??= source;
    if (source !== firstSource) await gate;
    await route.continue();
  });
  await page.goto('http://localhost:3000/things/work-jacket');
  await page.getByRole('button',{name:/View photos of/}).click();
  const viewer = page.getByRole('dialog',{name:/Photos of/});
  await viewer.getByRole('button',{name:'Next photo'}).click();
  await viewer.getByText('Loading photo…').waitFor();
  assert.match(await viewer.locator('img').getAttribute('alt'),/photo 1 of 2/);
  release();
  await viewer.getByText('2 / 2',{exact:true}).waitFor({timeout:30000});
  assert.match(await viewer.locator('img').getAttribute('alt'),/photo 2 of 2/);
  assert.match(await viewer.locator('img').evaluate(image=>image.currentSrc),/\/_next\/image\?/);
  console.log('Gallery keeps the current photo and counter until the optimized replacement is decoded.');
} finally {
  release?.();
  await browser.close();
}
