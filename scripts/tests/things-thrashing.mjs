import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const b=await (process.env.THINGS_BROWSER==='webkit'?webkit.launch():chromium.launch({channel:'chrome'}));const p=await b.newPage({viewport:{width:Number(process.env.THINGS_WIDTH || 1440),height:900}});
await p.route('**/*',async route=>{if(route.request().url().includes('_rsc='))await new Promise(resolve=>setTimeout(resolve,400));await route.continue();});
for(let i=0;i<10;i++){
 await p.goto('http://localhost:3000/things');
 await p.locator('[data-region-id=edc]').click();
 await p.waitForURL('**/things?region=edc');
 await p.locator('[data-item-id=edc-5]').click();
 await p.waitForURL('**/things/item/wallet');
 await p.evaluate(delay=>{[-1,-1,1,1,-1,-1].forEach((step,index)=>setTimeout(()=>history.go(step),index*delay));},[20,40,80,120,200][i%5]);
 await p.waitForTimeout(1300);
 await p.waitForURL('**/things');
 try{await p.locator('[data-region-id=edc]').waitFor({state:'visible',timeout:3000});}
 catch(e){console.log('MISMATCH',i,await p.evaluate(()=>({url:location.href,text:document.body.innerText.slice(0,200),overlays:document.querySelectorAll('[data-things-motion]').length})));throw e;}
 await p.waitForTimeout(700);
 assert.equal(await p.locator('[data-things-motion]').count(),0);
 console.log('rapid back',i,'passed');
}
await b.close();
