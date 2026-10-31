import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.THINGS_TEST_URL || 'http://localhost:3000';
const browser=await (process.env.THINGS_BROWSER==='webkit'?webkit.launch():chromium.launch({channel:'chrome'}));
for(const width of [390,1440]) {
 const page=await browser.newPage({viewport:{width,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.pageFades=[];
  document.addEventListener('animationstart',event=>{
   if(event.target.matches('[data-things-page]'))window.pageFades.push({
    duration:getComputedStyle(event.target).animationDuration,
    easing:getComputedStyle(event.target).animationTimingFunction,
   });
  });
 });
 await page.goto(`${base}/things`);
 await page.locator('[data-region-id=edc]').click();
 await page.waitForURL('**/things?region=edc');
 await page.locator('[data-item-id=edc-5]').click();
 await page.waitForURL('**/things/item/wallet');
 for(let i=0;i<3;i++) {
  await page.goBack();await page.waitForURL('**/things?region=edc');
  await page.locator('[data-stage="0"]').waitFor();
  assert.equal(await page.locator('[data-things-page]').evaluate(e=>getComputedStyle(e).animationName),'none','Returning grid must not fade its images');
  await page.goBack();await page.waitForURL('**/things');
  await page.locator('[data-region-id=edc]').waitFor();
  await page.goForward();await page.waitForURL('**/things?region=edc');
  await page.goForward();await page.waitForURL('**/things/item/wallet');
  await page.locator('[data-stage="1"]').waitFor();
  await page.waitForTimeout(80);
 }
 await page.waitForTimeout(200);
 const fades=await page.evaluate(()=>window.pageFades);
 assert.ok(fades.length>=3,'Incoming pages did not fade');
 assert.ok(fades.every(f=>f.duration==='0.25s'&&f.easing==='ease-out'),JSON.stringify(fades));
 assert.equal(await page.locator('[data-things-motion]').count(),0);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goBack();await page.waitForURL('**/things?region=edc');
 assert.equal(await page.locator('[data-things-page]').evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.deepEqual(errors,[]);
 console.log(width,'history, 250ms page fade, reduced motion passed');
 await page.close();
}
await browser.close();
