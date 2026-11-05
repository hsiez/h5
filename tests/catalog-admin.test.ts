import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { scryptSync, randomBytes } from 'node:crypto';
import { db } from '../lib/storefront/db';
import { getCatalog, saveItem, saveRegion } from '../lib/catalog/repository';
import { alphaBounds } from '../lib/catalog/photo-bounds';
import { validateDraft } from '../lib/catalog/validation';
import { login, validSession, requireSession, digest, verifyPassword, checkOrigin } from '../lib/admin/auth';
import { startClaim } from '../lib/storefront/core';
import { GET, POST } from '../app/api/admin/catalog/items/route';
import type { ItemDraft } from '../lib/catalog/types';
const password='only-for-local-catalog-tests';
const salt=randomBytes(16).toString('hex');
const hash=`scrypt:${salt}:${scryptSync(password,salt,64).toString('hex')}`;
const draft:ItemDraft={slug:'catalog-test-item',title:'Original title',brand:'Test brand',model:'Test model',ogPhotoSrc:'/api/catalog/media?pathname=catalog%2F0491b12e-1261-42a3-917d-915cb06d8f79-JwYdhSMzT7AN4pRh8kwl1GhTypAUBO.png',regionId:'edc',description:'A draft',size:'M',condition:'Good',measurements:{Waist:'32 in'},photos:[{src:'/api/catalog/media?pathname=catalog%2F0491b12e-1261-42a3-917d-915cb06d8f79-JwYdhSMzT7AN4pRh8kwl1GhTypAUBO.png',alt:'A black cap',bounds:{left:10,top:20,width:70,height:60},stippleSrc:'/api/catalog/media?pathname=catalog%2Fa10806a5-3ccc-4ad4-aeaf-897cdded03b4-nTjjUHjdgBjdbVRF5opDnQoB7hCkEA.png'}],review:{title:'Original title',about:[['Bought at ',{text:'Seattle',entity:{kind:'location',name:'Seattle',city:'Seattle, US',latitude:47.6,longitude:-122.3,zoom:14}},' in spring.']],pros:['Soft'],cons:[]},sortOrder:10};
let id:string;
let savedDraft:ItemDraft;
describe('catalog validation',()=>{
 it('accepts the browser host when the dev server uses its listen address',()=>expect(()=>checkOrigin(new Request('http://0.0.0.0:3000/api/admin/og',{headers:{host:'localhost:3000',origin:'http://localhost:3000'}}))).not.toThrow());
 it('rejects cross-origin writes and untrusted forwarded hosts',()=>expect(()=>checkOrigin(new Request('https://h5.codes/api/admin/og',{headers:{host:'h5.codes',origin:'https://other.example','x-forwarded-host':'other.example'}}))).toThrow('origin'));

 it('measures visible alpha bounds in percentages',()=>{
  const pixels=new Uint8Array(4*4*4);
  for(const [x,y] of [[1,1],[2,2]]) pixels[(y*4+x)*4+3]=255;
  expect(alphaBounds(pixels,4,4)).toEqual({left:25,top:25,width:50,height:50});
  expect(alphaBounds(new Uint8Array(64),4,4)).toBeNull();
 });
 it('rejects bounds outside the photo',()=>expect(()=>validateDraft({...draft,photos:[{...draft.photos[0],bounds:{left:90,top:0,width:30,height:50}}]})).toThrow('bounds'));
 it('preserves spaces around inline references',()=>expect(validateDraft(draft).review?.about[0][0]).toBe('Bought at '));
 it('rejects an OG selection without a generated drawing',()=>expect(()=>validateDraft({...draft,photos:[{src:draft.photos[0].src,alt:'Test'}]})).toThrow('generated drawing'));
 it('rejects unsafe photo URLs',()=>expect(()=>validateDraft({...draft,photos:[{src:'javascript:alert(1)',alt:'x'}]})).toThrow());
 it('rejects unsafe stippling URLs',()=>expect(()=>validateDraft({...draft,photos:[{...draft.photos[0],stippleSrc:'https://untrusted.example/art.png'}]})).toThrow());
 it('rejects invalid coordinates',()=>expect(()=>validateDraft({...draft,review:{...draft.review,about:[[{text:'x',entity:{kind:'location',name:'x',city:'y',latitude:999,longitude:0,zoom:14}}]]}})).toThrow());
 it('verifies a password without accepting a malformed hash',async()=>{expect(await verifyPassword(password,hash)).toBe(true);expect(await verifyPassword('wrong',hash)).toBe(false);expect(await verifyPassword(password,'bad')).toBe(false);});
 it('protects the catalog endpoint without a session',async()=>expect((await GET(new Request('http://localhost/api/admin/catalog/items'))).status).toBe(401));
});
describe.skipIf(!process.env.TEST_DATABASE_URL)('catalog with Postgres',()=>{
 beforeAll(()=>{process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;process.env.ADMIN_PASSWORD_HASH=hash;process.env.STOREFRONT_LINK_SECRET='catalog-test-link-secret';});
 afterAll(async()=>{await db().end();});
 it('assigns a new draft its own ID as the URL and keeps it private',async()=>{
  const headers={origin:'http://localhost','content-type':'application/json'};
  const token=await login(new Request('http://localhost/api/admin/session',{method:'POST',headers}),password);
  const response=await POST(new Request('http://localhost/api/admin/catalog/items',{
   method:'POST',headers:{...headers,cookie:`h5_admin=${token}`},body:JSON.stringify({...draft,slug:undefined}),
  }));
  expect(response.status).toBe(201);
  ({id}=await response.json());
  expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  savedDraft={...draft,slug:id};
  expect((await getCatalog()).items.find(i=>i.id===id)).toBeUndefined();
  expect((await getCatalog(true)).items.find(i=>i.id===id)).toMatchObject({slug:id,draft:{slug:id,title:draft.model}});
 });
 it('publishes and preserves a separate unpublished edit',async()=>{await saveItem(id,savedDraft,0,'publish');expect((await getCatalog()).items.find(i=>i.id===id)).toMatchObject({slug:id,brand:draft.brand,model:draft.model,ogPhotoSrc:draft.ogPhotoSrc,photos:draft.photos});await saveItem(id,{...savedDraft,title:'Unpublished title',model:'Unpublished title',brand:'Unpublished brand'},1,'draft');expect((await getCatalog()).items.find(i=>i.id===id)?.title).toBe('Test model');expect((await getCatalog()).items.find(i=>i.id===id)?.brand).toBe('Test brand');expect((await getCatalog(true)).items.find(i=>i.id===id)?.draft?.title).toBe('Unpublished title');});
 it('rejects stale saves and review adoption attempts',async()=>{await expect(saveItem(id,savedDraft,0,'publish')).rejects.toThrow('another window');await expect(startClaim(savedDraft.slug,'test@example.com')).rejects.toThrow('not found');});
 it('moves the same item into a new storefront region without resetting status',async()=>{await saveRegion({id:'test-region',name:'Test region',heading:'Things to adopt',description:'',kind:'storefront',publication_status:'published',sort_order:99},true);await saveItem(id,{...savedDraft,regionId:'test-region'},2,'publish');const item=(await getCatalog()).items.find(i=>i.id===id);expect(item?.regionId).toBe('test-region');expect(item?.status).toBe('available');await db().query("UPDATE storefront_items SET status='pending' WHERE id=$1",[id]);await saveItem(id,{...savedDraft,regionId:'test-region',title:'Edited pending item'},3,'publish');expect((await getCatalog()).items.find(i=>i.id===id)?.status).toBe('pending');});
 it('blocks moving or hiding active bookings',async()=>{await expect(saveItem(id,savedDraft,4,'publish')).rejects.toThrow('active booking');await expect(saveItem(id,{...savedDraft,regionId:'test-region'},4,'archive')).rejects.toThrow('active booking');await expect(saveRegion({id:'test-region',name:'x',heading:'x',description:'',kind:'storefront',publication_status:'archived',sort_order:99},false)).rejects.toThrow('active bookings');});
 it('archives completed items without losing history',async()=>{await db().query("UPDATE storefront_items SET status='claimed' WHERE id=$1",[id]);await saveItem(id,{...savedDraft,regionId:'test-region'},4,'archive');expect((await getCatalog()).items.find(i=>i.id===id)).toBeUndefined();expect((await getCatalog(true)).items.find(i=>i.id===id)?.status).toBe('claimed');});
 it('creates expiring sessions, rejects cross-origin writes and revokes on password rotation',async()=>{const req=new Request('http://localhost/api/admin/session',{method:'POST',headers:{origin:'http://localhost','x-forwarded-for':'test-admin'}});const token=await login(req,password);expect(await validSession(token)).toBe(true);await expect(requireSession(new Request('http://localhost/api/admin/catalog/items',{method:'POST',headers:{origin:'https://other.example',cookie:`h5_admin=${token}`}}))).rejects.toThrow('origin');process.env.ADMIN_PASSWORD_HASH=hash+'changed';expect(await validSession(token)).toBe(false);process.env.ADMIN_PASSWORD_HASH=hash;await db().query("UPDATE admin_sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1",[digest(token)]);expect(await validSession(token)).toBe(false);});
 it('rate limits repeated incorrect passwords across requests',async()=>{const req=new Request('http://localhost/api/admin/session',{method:'POST',headers:{origin:'http://localhost','x-forwarded-for':'bad-password-test'}});for(let i=0;i<8;i++) await expect(login(req,'incorrect')).rejects.toThrow('Invalid password');await expect(login(req,password)).rejects.toThrow('Too many attempts');});
});
