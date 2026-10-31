import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
const browser=await (process.env.THINGS_BROWSER==='webkit'?webkit.launch():chromium.launch({channel:'chrome'}));
for(const width of [390,1440]) {
 const page=await browser.newPage({viewport:{width,height:900}});
 for(const region of ['edc','things-for-you']) {
  await page.goto('http://localhost:3000/things');
  const tile=page.locator(`[data-region-id="${region}"]`);
  await tile.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await tile.click();
  await page.waitForURL(`**/things?region=${region}`);
  await page.waitForFunction(expected=>document.querySelectorAll('[data-things-motion=region]').length===expected, width<=700?4:6);
  const timing=await page.locator('[data-things-motion=region]').first().evaluate(e=>e.getAnimations()[0].effect.getTiming().duration);
  assert.equal(timing,620);
  assert.ok(await page.locator('[data-stage="0"] [data-motion-image]').evaluateAll(images=>images.every(image=>getComputedStyle(image).opacity==='0')), 'All region photos must stay stippled during entrance');
  await page.waitForTimeout(900);
  assert.ok(await page.locator('[data-stage="0"] [data-motion-image]').evaluateAll(images=>images.every(image=>getComputedStyle(image).opacity==='1')), 'All region photos must reveal color after entrance');
  assert.equal(await page.locator('[data-things-motion]').count(),0);
  await page.goBack();await page.waitForURL('**/things');
  await page.waitForFunction(expected=>document.querySelectorAll('[data-things-motion=world]').length===expected, width<=700?4:6);
  assert.equal(await page.locator('[data-things-motion=world]').first().evaluate(e=>e.getAnimations()[0].effect.getTiming().duration),400);
  assert.ok(await page.evaluate(()=>{
   const drawings=new Set(Array.from(document.querySelectorAll('[data-world-item-index] [data-motion-image]')).map(e=>e.currentSrc||e.src));
   return Array.from(document.querySelectorAll('[data-things-motion=world]')).every(e=>drawings.has(e.src));
  }), 'Return must use world drawings immediately');
  await page.waitForTimeout(500);
  assert.equal(await page.locator('[data-things-motion]').count(),0);
  console.log(width,region,'visible shared images move both directions');
 }
 await page.close();
}
await browser.close();
