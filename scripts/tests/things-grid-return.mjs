import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const b=await chromium.launch({channel:'chrome',headless:true});
for(const width of [1440,390]) {
const p=await b.newPage({viewport:{width,height:900}});
await p.goto('http://localhost:3000/things?region=things-for-you');
await p.waitForTimeout(600);
await p.locator('[data-motion-image=knit-quater-zip]').click({force:true});
await p.waitForURL('**/things/item/knit-quater-zip');await p.waitForTimeout(800);
await p.evaluate(()=>{window.returnFrames=[];window.stopFrames=false;const tick=()=>{const e=document.querySelector('[data-things-motion=grid]');const t=document.querySelector('[data-stage="0"] [data-motion-image=knit-quater-zip]');if(e&&t){const r=t.getBoundingClientRect();window.returnFrames.push({y:r.y,x:r.x,oy:parseFloat(e.style.top),ox:parseFloat(e.style.left),scroll:scrollY});}if(!window.stopFrames)requestAnimationFrame(tick);};requestAnimationFrame(tick);});
await p.goBack();await p.waitForURL('**/things?region=things-for-you');await p.waitForTimeout(700);
const frames=await p.evaluate(()=>{window.stopFrames=true;return window.returnFrames;});console.log(width, {first:frames[0],last:frames.at(-1),frames:frames.length,maxVerticalDrift:Math.max(...frames.map(f=>Math.abs(f.y-f.oy)))});
assert.ok(frames.length);assert.ok(frames.every(f=>Math.abs(f.y-f.oy)<1&&Math.abs(f.x-f.ox)<1),'Landing rectangle differs from live target');
await p.close();}
await b.close();
