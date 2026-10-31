import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:900}});
await page.route('**/*',async route=>{
 if(route.request().url().includes('_rsc=')) await new Promise(r=>setTimeout(r,600));
 await route.continue();
});
for(let attempt=0;attempt<12;attempt++) {
 await page.goto('http://localhost:3000/things');
 await page.locator('[data-region-id=edc]').click();
 await page.locator('[data-item-id=edc-5]').waitFor({state:'visible'});
 await page.locator('[data-item-id=edc-5]').click();
 await page.waitForTimeout([0,30,100,250][attempt%4]);
 await page.goBack({waitUntil:'commit'});
 await page.waitForTimeout(1600);
 const state=await page.evaluate(()=>({url:location.pathname+location.search,world:!!document.querySelector('[data-region-id=edc]'),focus:document.querySelector('[data-stage]')?.getAttribute('data-stage'),motion:document.querySelectorAll('[data-things-motion]').length}));
 console.log(attempt,state);
 if(state.url==='/things')assert.ok(state.world,'URL says world but region remains');
 else if(state.url==='/things?region=edc')assert.equal(state.focus,'0');
 assert.equal(state.motion,0);
}
await browser.close();
