import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
const baseURL=process.env.THINGS_TEST_URL || 'http://localhost:3000';
const browser=await (process.env.THINGS_BROWSER === 'webkit' ? webkit.launch({headless:true}) : chromium.launch({channel:'chrome',headless:true}));
for(const width of [390,900,1440]) {
 const page=await browser.newPage({viewport:{width,height:900}});
 await page.goto(`${baseURL}/things?region=edc`);
 await page.locator('[data-item-id=edc-5]').waitFor();
 await page.waitForTimeout(500);
 await page.locator('[data-item-id=edc-5]').click();
 await page.waitForURL('**/things/item/wallet');
 await page.waitForTimeout(100);
 const result=await page.evaluate(()=>{
  const image=document.querySelector('[data-motion-image=wallet]');
  const overlay=document.querySelector('[data-things-motion=focus]');
  const target=image.getBoundingClientRect();
  return {target:target.toJSON(), overlay:overlay && {left:parseFloat(overlay.style.left),top:parseFloat(overlay.style.top),width:parseFloat(overlay.style.width),height:parseFloat(overlay.style.height)}};
 });
 assert.ok(result.overlay,`Missing overlay ${width}`);
 for(const prop of ['left','top','width','height']) assert.ok(Math.abs(result.target[prop]-result.overlay[prop])<1,`${width}: ${prop} destination drift ${JSON.stringify(result)}`);
 await page.waitForTimeout(700);
 assert.equal(await page.locator('[data-things-motion]').count(),0);
 await page.reload();
 await page.waitForTimeout(700);
 assert.equal(await page.locator('[data-things-motion]').count(),0,'Refresh must not animate from stale route');
 console.log(width,'destination geometry and refresh passed');
 await page.close();
}
await browser.close();
