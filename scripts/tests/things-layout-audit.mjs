import {chromium, webkit} from 'playwright';
import assert from 'node:assert/strict';
const baseURL=process.env.THINGS_TEST_URL || 'http://localhost:3100';
const browser=await (process.env.THINGS_BROWSER === 'webkit' ? webkit.launch({headless:true}) : chromium.launch({channel:'chrome',headless:true}));
for(const width of [390,1440]) {
 const page=await browser.newPage({viewport:{width,height:900}});
 await page.addInitScript(()=>{
  window.copyPositions=[];
  const sample=()=>{const e=document.querySelector('[data-review-scroll]'); if(e){const r=e.getBoundingClientRect(); if(r.width) window.copyPositions.push({x:r.x,width:r.width});}requestAnimationFrame(sample);};requestAnimationFrame(sample);
 });
 for(const slug of ['hat','coat','wallet','work-jacket']) {
  const region=slug==='work-jacket'?'things-for-you':'edc';
  await page.goto(`${baseURL}/things/${slug}`);
  await page.waitForTimeout(800);
  const positions=await page.evaluate(()=>window.copyPositions);
  assert.ok(positions.length);
  assert.ok(Math.max(...positions.map(p=>p.x))-Math.min(...positions.map(p=>p.x))<1,`${slug} ${width} column shifts: ${JSON.stringify(positions.slice(0,10))}`);
  await page.goto(`${baseURL}/things?region=${region}`);
  await page.locator(`[data-motion-image=${slug}]`).waitFor();
  await page.waitForTimeout(200);
  await page.locator(`[data-motion-image=${slug}]`).click({force:true});
  await page.waitForURL(`**/things/${slug}`);
  await page.waitForTimeout(750);
  await page.evaluate(()=>window.scrollTo(0,200));
  await page.goBack(); await page.waitForURL(`**/things?region=${region}`);
  await page.locator('[data-stage="0"]').waitFor();
  assert.equal(await page.locator('[data-things-motion]').count(),0);
  assert.notEqual(await page.locator(`[data-motion-image=${slug}]`).evaluate(e=>getComputedStyle(e).visibility),'hidden');
  console.log(width,slug,'initial copy position, scrolled return, completion passed');
 }
 await page.close();
}
await browser.close();
