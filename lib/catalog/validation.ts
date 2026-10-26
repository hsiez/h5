import type { ItemReview, ReviewText } from '@/app/loadout/reviews';
import type { ItemDraft, CatalogRegion } from './types';
import { FlowError } from '@/lib/storefront/core';
import { uploadedPhotoPathname } from './media';
function object(value:unknown):Record<string,unknown> { if (!value || typeof value!=='object' || Array.isArray(value)) throw new FlowError('Invalid item data',400); return value as Record<string,unknown>; }
function text(value:unknown,max=10000,required=false) { if(typeof value!=='string'||value.length>max||(required&&!value.trim())) throw new FlowError('A text field is missing or too long',400); return value.trim(); }
export function mediaUrl(value:unknown) {
 const src=text(value,2000,true);
 if (/^\/loadout\/[a-zA-Z0-9._/-]+$/.test(src) && !src.includes('..')) return src;
 if (uploadedPhotoPathname(src)) return src;
 try { const url=new URL(src); if(url.protocol==='https:'&&url.hostname.endsWith('.public.blob.vercel-storage.com')&&!url.username&&!url.password) return src; } catch {}
 throw new FlowError('Choose an uploaded image',400);
}
function finite(value:unknown,min:number,max:number) { if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max) throw new FlowError('A number is out of range',400); return value; }
function part(value:unknown):ReviewText {
 if(typeof value==='string') { text(value,10000); return value; }
 const v=object(value), e=object(v.entity), label=text(v.text,250,true);
 if(e.kind==='image') return {text:label,entity:{kind:'image',src:mediaUrl(e.src),alt:text(e.alt,500,true),caption:text(e.caption??'',500),width:finite(e.width,1,30000),height:finite(e.height,1,30000)}};
 if(e.kind==='location') return {text:label,entity:{kind:'location',name:text(e.name,250,true),city:text(e.city,250,true),latitude:finite(e.latitude,-90,90),longitude:finite(e.longitude,-180,180),zoom:finite(e.zoom,1,20)}};
 throw new FlowError('Invalid reference type',400);
}
function parts(value:unknown):ReviewText[] { if(!Array.isArray(value)||value.length>100) throw new FlowError('Invalid review paragraph',400); return value.map(part); }
export function reviewData(value:unknown,title:string):ItemReview|null {
 if(value===null||value===undefined) return null;
 const v=object(value);
 for(const k of ['about','pros','cons']) if(!Array.isArray(v[k])||(v[k] as unknown[]).length>50) throw new FlowError('Invalid review section',400);
 return {title,about:(v.about as unknown[]).map(parts),pros:(v.pros as unknown[]).map(x=>typeof x==='string'?text(x):parts(x)),cons:(v.cons as unknown[]).map(x=>typeof x==='string'?text(x):parts(x))};
}
export function slug(value:unknown) { const s=text(value,100,true); if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)) throw new FlowError('Use lowercase letters, numbers and hyphens for the URL',400); return s; }
export function validateDraft(value:unknown):ItemDraft {
 const v=object(value), title=text(v.title,160,true);
 if(!Array.isArray(v.photos)||v.photos.length>20) throw new FlowError('Use up to 20 photos',400);
 const measurements=object(v.measurements); if(Object.keys(measurements).length>30) throw new FlowError('Use up to 30 measurements',400);
 return {slug:slug(v.slug),title,regionId:slug(v.regionId),description:text(v.description??''),size:text(v.size??'',250),condition:text(v.condition??'',1000),sortOrder:finite(v.sortOrder??0,-10000,10000),
 measurements:Object.fromEntries(Object.entries(measurements).map(([k,val])=>[text(k,100,true),text(val,250,true)])),
 photos:v.photos.map(p=>{const photo=object(p);return {src:mediaUrl(photo.src),alt:text(photo.alt,500,true),...(photo.stippleSrc ? {stippleSrc:mediaUrl(photo.stippleSrc)} : {})}}),review:reviewData(v.review,title)};
}
export function validateRegion(value:unknown):CatalogRegion {
 const v=object(value); if(!['review','storefront'].includes(String(v.kind))||!['draft','published','archived'].includes(String(v.publication_status))) throw new FlowError('Invalid region settings',400);
 return {id:slug(v.id),name:text(v.name,100,true),heading:text(v.heading,160,true),description:text(v.description??'',1000),kind:v.kind as CatalogRegion['kind'],publication_status:v.publication_status as CatalogRegion['publication_status'],sort_order:finite(v.sort_order??0,-10000,10000)};
}
