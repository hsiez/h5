import { db, transaction } from '@/lib/storefront/db';
import { FlowError } from '@/lib/storefront/core';
import type { Catalog, CatalogItem, CatalogRegion, ItemDraft } from './types';
import { validateDraft, validateRegion } from './validation';
export async function getCatalog(admin=false):Promise<Catalog> {
 const regions=await db().query<CatalogRegion>(`SELECT * FROM catalog_regions ${admin?'':"WHERE publication_status='published'"} ORDER BY sort_order,id`);
 const items=await db().query<{data:CatalogItem}>(`SELECT json_build_object(
  'id',i.id,'slug',i.slug,'title',i.title,'regionId',i.region_id,'description',i.description,'size',COALESCE(i.size_label,''),'condition',COALESCE(i.condition_note,''),
  'measurements',i.measurements,'review',i.review,'sortOrder',i.sort_order,'publicationStatus',i.publication_status,'status',i.status,'legacyKey',i.legacy_key,
  'revision',i.revision,'draft',${admin?'i.draft_data':'NULL'},'photos',COALESCE(m.photos,'[]'::json),
  'owner',CASE WHEN h.item_id IS NULL THEN NULL ELSE json_build_object('name',h.owner_name,'coffeeStory',h.coffee_story,'photo',json_build_object('src',h.photo_blob_path,'alt',h.photo_alt_text)) END
 ) AS data FROM storefront_items i JOIN catalog_regions r ON r.id=i.region_id
 LEFT JOIN LATERAL (SELECT json_agg(json_build_object('src',blob_path,'alt',alt_text) ORDER BY sort_order,created_at) AS photos FROM storefront_item_media WHERE item_id=i.id) m ON true
 LEFT JOIN item_handoffs h ON h.item_id=i.id
 ${admin?'':"WHERE i.publication_status='published' AND i.published_at IS NOT NULL AND r.publication_status='published'"}
 ORDER BY i.sort_order,i.created_at`);
 return {regions:regions.rows,items:items.rows.map(r=>r.data)};
}
export async function createItem(input:unknown) {
 const d=validateDraft(input);
 const result=await db().query(`INSERT INTO storefront_items(slug,title,region_id,status,draft_data) VALUES($1,$2,$3,'available',$4) RETURNING id`,[d.slug,d.title,d.regionId,d]);
 return result.rows[0];
}
export async function saveItem(id:string,input:unknown,revision:unknown,action:unknown) {
 if(!['draft','publish','archive'].includes(String(action)) || typeof revision!=='number') throw new FlowError('Invalid save request',400);
 const d=validateDraft(input);
 return transaction(async client=>{
  const locked=await client.query<{status:string;revision:number;slug:string;region_id:string}>('SELECT status,revision,slug,region_id FROM storefront_items WHERE id=$1 FOR UPDATE',[id]);
  const item=locked.rows[0]; if(!item) throw new FlowError('Item not found',404);
  if(item.revision!==revision) throw new FlowError('This item changed in another window. Reload before saving.',409);
  if(item.slug!==d.slug) throw new FlowError('Published item URLs cannot be changed',400);
  const regions=await client.query<CatalogRegion>('SELECT * FROM catalog_regions WHERE id=$1 FOR SHARE',[d.regionId]);
  const region=regions.rows[0]; if(!region) throw new FlowError('Choose a region',400);
  if(action!=='draft' && ['pending','reserved'].includes(item.status) && (action==='archive'||region.kind!=='storefront'||item.region_id!==region.id)) throw new FlowError('Resolve the active booking before archiving or moving this item',409);
  if(action==='draft') await client.query('UPDATE storefront_items SET draft_data=$2,revision=revision+1,updated_at=now() WHERE id=$1',[id,d]);
  if(action==='archive') await client.query("UPDATE storefront_items SET publication_status='archived',published_at=NULL,revision=revision+1,updated_at=now() WHERE id=$1",[id]);
  if(action==='publish') {
   if(region.publication_status!=='published') throw new FlowError('Publish the region first',400);
   if(!d.photos.length) throw new FlowError('Add at least one photo before publishing',400);
   await client.query(`UPDATE storefront_items SET title=$2,region_id=$3,description=$4,size_label=$5,condition_note=$6,measurements=$7,review=$8,sort_order=$9,
    legacy_key=CASE WHEN (SELECT blob_path FROM storefront_item_media WHERE item_id=$1 ORDER BY sort_order,created_at LIMIT 1)=$11 THEN legacy_key ELSE NULL END,
    adoption_enabled=$10,publication_status='published',published_at=COALESCE(published_at,now()),draft_data=NULL,revision=revision+1,updated_at=now() WHERE id=$1`,
    [id,d.title,d.regionId,d.description,d.size,d.condition,d.measurements,d.review,d.sortOrder,region.kind==='storefront',d.photos[0].src]);
   await client.query('DELETE FROM storefront_item_media WHERE item_id=$1',[id]);
   for(const [order,photo] of d.photos.entries()) await client.query('INSERT INTO storefront_item_media(item_id,blob_path,alt_text,sort_order) VALUES($1,$2,$3,$4)',[id,photo.src,photo.alt,order]);
  }
  return {ok:true};
 });
}
export async function saveRegion(input:unknown,create:boolean) {
 const r=validateRegion(input);
 return transaction(async client=>{
  if(!create) {
   const existing=await client.query<CatalogRegion>('SELECT * FROM catalog_regions WHERE id=$1 FOR UPDATE',[r.id]);
   if(!existing.rows[0]) throw new FlowError('Region not found',404);
   const counts=await client.query<{total:string;active:string}>("SELECT count(*) AS total,count(*) FILTER(WHERE status IN ('pending','reserved')) AS active FROM storefront_items WHERE region_id=$1",[r.id]);
   if(existing.rows[0].kind!==r.kind && Number(counts.rows[0].total)) throw new FlowError('Move items out before changing the region type',409);
   if(r.publication_status!=='published' && Number(counts.rows[0].active)) throw new FlowError('Resolve active bookings before hiding this region',409);
  }
  if(create) await client.query('INSERT INTO catalog_regions(id,name,heading,description,kind,publication_status,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7)',[r.id,r.name,r.heading,r.description,r.kind,r.publication_status,r.sort_order]);
  else await client.query('UPDATE catalog_regions SET name=$2,heading=$3,description=$4,kind=$5,publication_status=$6,sort_order=$7,updated_at=now() WHERE id=$1',[r.id,r.name,r.heading,r.description,r.kind,r.publication_status,r.sort_order]);
  return {ok:true};
 });
}
export function editableItem(item:CatalogItem):ItemDraft { return item.draft || {slug:item.slug,title:item.title,regionId:item.regionId,description:item.description,size:item.size,condition:item.condition,measurements:item.measurements,photos:item.photos,review:item.review,sortOrder:item.sortOrder}; }
