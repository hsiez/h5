import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.THINGS_TEST_URL||'http://localhost:3130';
const browser=await(process.env.THINGS_BROWSER==='webkit'?webkit.launch():chromium.launch({channel:'chrome'}));
for(const width of [390,1440]) for(const [region,slug] of [['edc','wallet'],['things-for-you','work-jacket']]) {
 const page=await browser.newPage({viewport:{width,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/things`);
 await page.locator(`[data-region-id="${region}"]`).click();
 await page.waitForURL(`**/things?region=${region}`);
 const wallet=page.locator(`[data-things-background] [data-motion-image="${slug}"]`);
 await wallet.scrollIntoViewIfNeeded();
 await page.evaluate(()=>{
  window.savedGrid=document.querySelector('[data-things-background] [data-stage="0"]');
  window.savedImages=Array.from(window.savedGrid.querySelectorAll('img'));
  window.savedScroll=scrollY;
 });
 for(let i=0;i<4;i++) {
  await wallet.click();
  await page.waitForURL(`**/things/item/${slug}`);
  await page.locator('[data-item-layer]').waitFor();
  assert.ok(await page.evaluate(()=>window.savedGrid.isConnected));
  assert.ok(await page.locator('[data-things-background]').evaluate(e=>e.inert));
  await page.goBack();
  await page.waitForURL(`**/things?region=${region}`);
  await page.locator('[data-item-layer]').waitFor({state:'detached'});
  const state=await page.evaluate(()=>({same:window.savedGrid===document.querySelector('[data-stage="0"]'),images:window.savedImages.every(image=>image.isConnected),scroll:scrollY,saved:window.savedScroll,inert:document.querySelector('[data-things-background]').inert}));
  assert.ok(state.same&&state.images,JSON.stringify(state));
  assert.ok(Math.abs(state.scroll-state.saved)<2,JSON.stringify(state));
  assert.equal(state.inert,false);
 }
 await page.goForward();await page.waitForURL(`**/things/item/${slug}`);
 await page.locator('[data-item-layer]').waitFor();
 await page.reload();
 await page.locator('[data-stage="1"]').waitFor();
 assert.equal(await page.locator('[data-item-layer]').count(),0,'Refresh should show standalone item');
 assert.equal(await page.locator('[data-stage="0"]').count(),0);
 assert.deepEqual(errors,[]);
 console.log(width,region,'retained grid/images, scroll, Back/Forward and standalone refresh passed');
 await page.close();
}
await browser.close();
