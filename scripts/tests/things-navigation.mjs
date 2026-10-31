import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
const baseURL=process.env.THINGS_TEST_URL || 'http://localhost:3000';
const browser = await (process.env.THINGS_BROWSER === 'webkit' ? webkit.launch({headless:true}) : chromium.launch({headless:true,channel:'chrome'}));
for (const width of [1440, 390]) {
 const page = await browser.newPage({viewport:{width,height:900}});
 page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(10000);
 page.on('console',m=>{if(m.type()==='error'||m.type()==='warning'||m.text().startsWith('VT ')) console.log('BROWSER',m.text());});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(() => {
   window.motionSamples=[];
   const original=document.startViewTransition?.bind(document);
   if(original) document.startViewTransition=(arg)=>{console.log('VT BEFORE',JSON.stringify(Array.from(document.querySelectorAll('[data-shared-item-index]')).map(e=>({style:e.getAttribute('style'),name:getComputedStyle(e).viewTransitionName,rect:e.getBoundingClientRect().toJSON()}))));const t=original(arg);t.ready.then(()=>console.log('VT READY',JSON.stringify(document.getAnimations().map(a=>({name:a.animationName || a.effect?.target?.dataset?.thingsMotion,pseudo:a.effect?.pseudoElement,target:String(a.effect?.target),duration:a.effect?.getTiming().duration})))),e=>console.error('VT FAILED',String(e)));return t;};
   const sample=()=> {for(const a of document.getAnimations()) {const pseudo=a.effect?.pseudoElement; if(pseudo?.includes('view-transition') || a.effect?.target?.dataset?.thingsMotion) window.motionSamples.push({pseudo,duration:a.effect.getTiming().duration,name:a.animationName || a.effect?.target?.dataset?.thingsMotion});} requestAnimationFrame(sample);};requestAnimationFrame(sample);
 });
 await page.goto(`${baseURL}/things`);
 console.log('loaded',width); await page.locator('[data-region-id=edc]').click();console.log('clicked region',page.url());
 await page.waitForURL('**/things?region=edc');
 await page.waitForFunction(()=>{const el=document.querySelector('[data-item-id="edc-5"] [data-shared-item-index]');return el && getComputedStyle(el).opacity==='1';}); await page.waitForTimeout(700); await page.locator('[data-item-id=edc-5]').click();console.log('clicked item',page.url());
 await page.waitForURL('**/things/item/wallet');
 await page.waitForTimeout(1000);
 console.log(width,'focus',await page.evaluate(()=>({url:location.href,motion:Array.from(new Map(window.motionSamples.map(s=>[JSON.stringify(s),s])).values())})));
 assert.ok(await page.evaluate(()=>window.motionSamples.some(s=>s.name==='focus' && s.duration===620)), 'Forward image animation did not run');
 await page.evaluate(()=>{window.motionSamples=[];});
 await page.goBack(); await page.waitForURL('**/things?region=edc'); await page.waitForTimeout(800);
 console.log(width,'back',await page.evaluate(()=>({url:location.href,motion:Array.from(new Map(window.motionSamples.map(s=>[JSON.stringify(s),s])).values())})));
 assert.ok(await page.evaluate(()=>window.motionSamples.some(s=>s.name==='grid' && s.duration===400)), 'Reverse image animation did not run');
 await page.goBack(); await page.waitForURL('**/things');
 await page.goForward();await page.waitForURL('**/things?region=edc');
 await page.goForward();await page.waitForURL('**/things/item/wallet');
 for (let attempt=0; attempt<3; attempt++) {
   await page.evaluate(()=>{window.motionSamples=[];});
   await page.goBack(); await page.waitForURL('**/things?region=edc');
   await page.waitForFunction(()=>window.motionSamples.some(s=>s.name==='grid'));
   assert.equal(await page.locator('[data-things-motion="grid"]').count(),1);
   await page.goBack(); await page.waitForURL('**/things');
   await page.waitForFunction(()=>!document.querySelector('[data-things-motion]'));
   await page.goForward(); await page.waitForURL('**/things?region=edc');
   await page.locator('[data-item-id=edc-5]').waitFor({state:'visible'});
   await page.waitForTimeout(50);
   await page.goForward(); await page.waitForURL('**/things/item/wallet');
   await page.waitForFunction(()=>!!document.querySelector('[data-things-motion="focus"]'));
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goBack(); await page.waitForURL('**/things?region=edc');
 await page.locator('[data-stage="0"] [data-item-id=edc-5]').waitFor({state:'visible'});
 assert.equal(await page.locator('[data-things-motion]').count(),0);
 assert.equal(errors.length,0,errors.join('\n'));
 await page.close();
}
await browser.close();
