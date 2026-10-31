import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.THINGS_TEST_URL||'http://localhost:3130';
const browser=await(process.env.THINGS_BROWSER==='webkit'?webkit.launch():chromium.launch({channel:'chrome'}));
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await page.goto(`${base}/things?region=things-for-you`);
await page.locator('[data-motion-image="work-jacket"]').click();
await page.waitForURL('**/things/work-jacket');
const claim=page.locator('[data-item-footer]').getByRole('link',{name:'Claim for 1 coffee'});
await claim.waitFor();
await page.waitForTimeout(300);
async function assertClickable(button) {
 assert.ok(await button.evaluate(el=>{
  const r=el.getBoundingClientRect();
  return r.top>=0&&r.bottom<=innerHeight&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
 }), 'Claim button is obscured or outside the viewport');
}
await assertClickable(claim);
assert.equal(await page.getByRole('link',{name:'Previous item',exact:true}).count(),0);
assert.equal(await page.getByRole('link',{name:'Next item',exact:true}).count(),0);
const back=page.locator('[data-item-footer]').getByRole('button',{name:'Back to gallery'});
await assertClickable(back);
const aligned=await claim.evaluate(el=>{
 const back=el.closest('nav').querySelector('[data-gallery-return]');
 const a=el.getBoundingClientRect(),b=back.getBoundingClientRect();
 return Math.abs((a.top+a.bottom)/2-(b.top+b.bottom)/2)<1;
});
assert.ok(aligned,'Back and Claim should share a centered row');
for (const height of [700, 900, 760, 844]) {
 await page.setViewportSize({width:390,height});
 await page.waitForTimeout(50);
 await assertClickable(claim);
 const bottom = await claim.evaluate(el=>el.closest('nav').getBoundingClientRect().bottom);
 assert.ok(Math.abs(bottom-height)<1, `Footer bottom ${bottom} does not follow viewport ${height}`);
}
await claim.focus();
assert.ok(await claim.evaluate(el=>document.activeElement===el),'Footer must be focusable inside layer');
await claim.click();
await page.waitForURL('**/things/claim/work-jacket');
await page.locator('[data-item-layer]').waitFor({state:'detached'});
assert.equal(await page.locator('[data-item-footer]').count(),0);
await page.goBack();await page.waitForURL('**/things/work-jacket');
await claim.waitFor();await page.waitForTimeout(300);await assertClickable(claim);
await page.reload();
const standalone=page.getByRole('link',{name:'Claim for 1 coffee'});
await standalone.waitFor();await page.waitForTimeout(300);
assert.equal(await page.locator('[data-item-layer]').count(),0);
await assertClickable(standalone);
console.log('Mobile claim footer hit testing, focus, claim navigation, Back and refresh passed');
await browser.close();
