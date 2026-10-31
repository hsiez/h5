import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
const base = process.env.THINGS_TEST_URL || 'http://localhost:3000';
const engine = process.env.THINGS_BROWSER === 'webkit' ? webkit : chromium;
const browser = await engine.launch(engine === chromium ? {channel:'chrome'} : {});
{
 const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];
 page.on('pageerror', error=>errors.push(error.message));
 await page.addInitScript(()=>{
  window.navigationTrace=[];
  for(const name of ['pushState','replaceState']) {
   const original=history[name].bind(history);
   history[name]=(...args)=>{window.navigationTrace.push({event:name,url:String(args[2]),time:performance.now()});return original(...args);};
  }
  addEventListener('popstate',()=>window.navigationTrace.push({event:'popstate',url:location.href,time:performance.now()}));
 });
 // Slow uncached route responses to expose the interval before the destination mounts.
 await page.route('**/*',async route=>{
  if(route.request().url().includes('_rsc='))await new Promise(resolve=>setTimeout(resolve,250));
  await route.continue();
 });
 try {
  await page.goto(`${base}/things`);
  await page.locator('[data-region-id=edc]').click();
  await page.waitForURL('**/things?region=edc');
  for(let i=0;i<6;i++) {
   const index=i%2===0?5:0;
   const slug=index===5?'wallet':'hat';
   await page.locator(`[data-item-id="edc-${index}"]`).click();
   await page.waitForURL(`**/things/item/${slug}`);
   await page.locator('[data-stage="1"]').waitFor();
   assert.equal(await page.locator('[data-things-motion]').count(),0);
   // Return during the forward animation, then select the other product immediately.
   await page.goBack();
   await page.waitForURL('**/things?region=edc');
   await page.locator('[data-stage="0"]').waitFor();
  }
  // Competing selections before either destination commits must not stack products.
  for(let attempt=0;attempt<3;attempt++) {
   await page.evaluate(()=>{
    document.querySelector('[data-item-id="edc-5"]').click();
    document.querySelector('[data-item-id="edc-0"]').click();
   });
   await page.waitForURL('**/things/item/hat');
   await page.goBack();
   await page.waitForURL('**/things?region=edc');
   await page.locator('[data-stage="0"]').waitFor();
  }
  // Interrupt the return to region immediately with another Back.
  await page.locator('[data-item-id="edc-5"]').click();
  await page.waitForURL('**/things/item/wallet');
  await page.goBack();
  await page.waitForURL('**/things?region=edc');
  await page.evaluate(()=>history.back());
  await page.waitForURL('**/things');
  await page.locator('[data-region-id=edc]').waitFor();
  await page.waitForTimeout(900);
  assert.equal(await page.locator('[data-things-motion]').count(),0);
  assert.equal(await page.locator('[data-region-entering]').count(),0);
  assert.equal(await page.locator('[data-motion-image][style*="visibility: hidden"]').count(),0);
  assert.deepEqual(errors,[]);
  console.log(`${engine.name()} mobile : alternating products + interrupted Back passed`);
 } catch(error) {
  console.error(await page.evaluate(()=>window.navigationTrace));
  throw error;
 } finally { await page.close(); }
}
await browser.close();
