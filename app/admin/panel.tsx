'use client';
import Image from 'next/image';
import { upload as uploadBlob } from '@vercel/blob/client';
import { useEffect, useState, type FormEvent } from 'react';
import type { Catalog, CatalogItem, CatalogRegion, ItemDraft } from '@/lib/catalog/types';
import { StorefrontAdmin } from './storefront-admin';
import { ReviewEditor, fromReview, toReview } from './review-editor';
import styles from './panel.module.css';
import { preparePhoto } from './prepare-photo';
import { mediaPath } from '@/lib/catalog/media';
async function api(path:string,method='GET',body?:unknown) {
 const response=await fetch(path,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
 const data=await response.json();if(!response.ok) throw new Error(response.status===401?'Your session expired. Sign in again.':data.error||'Could not save');return data;
}
export function AdminLogin({configured}:{configured:boolean}) {
 const [password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e:FormEvent) {e.preventDefault();setBusy(true);setError('');try{await api('/api/admin/session','POST',{password});window.location.reload();}catch(e){setError(String(e));}finally{setBusy(false);}}
 return <main className={styles.admin}><div className={styles.login}><p className={styles.eyebrow}>Harley Siezar / Admin</p><h1>Your collection</h1><p>Manage regions, reviews, and things ready for another life.</p>{!configured?<p role="alert">Set ADMIN_PASSWORD_HASH to enable sign-in. Setup instructions are in docs/admin-panel.md.</p>:<form onSubmit={submit}><label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required autoFocus/></label><button className={styles.primary} disabled={busy}>{busy?'Signing in…':'Sign in'}</button>{error&&<p role="alert">{error}</p>}</form>}</div></main>;
}
const blank=(regionId:string):ItemDraft=>({slug:'',title:'',regionId,description:'',size:'',condition:'',measurements:{},photos:[],review:null,sortOrder:0});
export function AdminDashboard() {
 const [catalog,setCatalog]=useState<Catalog|null>(null),[tab,setTab]=useState('items'),[selected,setSelected]=useState<string|null>(null),[error,setError]=useState(''),[filter,setFilter]=useState('');
 async function refresh(){try{setCatalog(await api('/api/admin/catalog/items'));setError('');}catch(e){setError(String(e));}}
 useEffect(()=>{api('/api/admin/catalog/items').then(setCatalog).catch(e=>setError(String(e)));},[]);
 const item=catalog?.items.find(i=>i.id===selected);
 return <main className={styles.admin}><header className={styles.header}><div><p className={styles.eyebrow}>Harley Siezar / Admin</p><h1>Your collection</h1></div><div className={styles.actions}><a href="/loadout?view=world" target="_blank" rel="noreferrer">View world ↗</a><button onClick={async()=>{try{await api('/api/admin/session','DELETE');window.location.reload();}catch(e){setError(String(e));}}}>Sign out</button></div></header>
 <nav className={styles.tabs}>{['items','regions','requests','operations'].map(t=><button key={t} aria-current={tab===t?'page':undefined} onClick={()=>{setTab(t);setSelected(null);}}>{t}</button>)}</nav>
 {error&&<p role="alert" className={styles.error}>{error} <button onClick={refresh}>Retry</button></p>}
 {!catalog&&!error&&<p>Loading your collection…</p>}
 {catalog&&tab==='items'&&(selected?<ItemEditor key={selected} item={item} regions={catalog.regions} onClose={()=>setSelected(null)} onSaved={async(id)=>{await refresh();setSelected(id);}}/>:<><div className={styles.toolbar}><label>Find an item<input value={filter} placeholder="Search by title" onChange={e=>setFilter(e.target.value)}/></label><button className={styles.primary} onClick={()=>setSelected('new')}>Add item</button></div><div className={styles.cards}>{catalog.items.filter(i=>i.title.toLowerCase().includes(filter.toLowerCase())).map(i=><button className={styles.card} key={i.id} onClick={()=>setSelected(i.id)}>{i.photos[0]&&<Image src={i.photos[0].src} alt="" width={220} height={180} unoptimized/>}<strong>{i.draft?.title||i.title}</strong><span>{catalog.regions.find(r=>r.id===i.regionId)?.name} · {i.publicationStatus}</span>{i.draft&&<small>Unpublished changes</small>}{catalog.regions.find(r=>r.id===i.regionId)?.kind==='storefront'&&<small>{i.status}</small>}</button>)}</div></>)}
 {catalog&&tab==='regions'&&<RegionManager regions={catalog.regions} onSaved={refresh}/>}
 {tab==='requests'&&<StorefrontAdmin/>}
 {tab==='operations'&&<Operations/>}
 </main>;
}
function ItemEditor({item,regions,onClose,onSaved}:{item?:CatalogItem;regions:CatalogRegion[];onClose:()=>void;onSaved:(id:string)=>Promise<void>}) {
 const [draft,setDraft]=useState<ItemDraft>(()=>item?.draft||item||blank(regions[0]?.id||''));
 const [review,setReview]=useState(()=>fromReview((item?.draft||item)?.review||null));
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [measurements,setMeasurements]=useState(()=>Object.entries((item?.draft||item)?.measurements||{}));
 const [revision,setRevision]=useState(item?.revision||0);
 function field<K extends keyof ItemDraft>(key:K,value:ItemDraft[K]){setDraft(d=>({...d,[key]:value}));setMessage('');}
 async function save(action:string) {
  setBusy(true);setError('');setMessage('');
  try {
   const data={...draft,review:toReview(review,draft.title),measurements:Object.fromEntries(measurements.filter(([key])=>key.trim()))};
   if(!item) {const created=await api('/api/admin/catalog/items','POST',data);await onSaved(created.id);setMessage('Draft created. Preview or publish when ready.');}
   else {await api(`/api/admin/catalog/items/${item.id}`,'PATCH',{draft:data,revision,action});setRevision(revision+1);await onSaved(item.id);setMessage(action==='publish'?'Published.':action==='archive'?'Archived.':'Draft saved. The public version is unchanged.');}
  } catch(e){setError(String(e));}finally{setBusy(false);}
 }
 async function upload(files:FileList|null) {
  if(!files) return;setBusy(true);setError('');try{const photos=[...draft.photos];for(const file of Array.from(files)){const prepared=await preparePhoto(file);const blob=await uploadBlob(`catalog/${crypto.randomUUID()}.webp`,prepared,{access:'private',handleUploadUrl:'/api/admin/catalog/upload',contentType:'image/webp'});photos.push({src:mediaPath(blob.pathname),alt:file.name.replace(/\.[^.]+$/,'')});field('photos',[...photos]);}}catch(e){setError(String(e));}finally{setBusy(false);}
 }
 const store=regions.find(r=>r.id===draft.regionId)?.kind==='storefront';
 return <div className={styles.editor}><div className={styles.toolbar}><button onClick={onClose}>← All items</button>{item&&<a href={`/admin/preview?region=${encodeURIComponent(draft.regionId)}&item=${encodeURIComponent(draft.slug)}`} target="_blank" rel="noreferrer">Preview saved draft ↗</a>}</div><h2>{item?'Edit item':'Add an item'}</h2>
 <fieldset disabled={busy}><legend>Item</legend><div className={styles.fields}><label>Name<input value={draft.title} onChange={e=>field('title',e.target.value)}/></label><label>URL name<input value={draft.slug} disabled={!!item} placeholder="red-chore-coat" onChange={e=>field('slug',e.target.value)}/></label><label>Region<select value={draft.regionId} onChange={e=>field('regionId',e.target.value)}>{regions.map(r=><option key={r.id} value={r.id}>{r.name} ({r.publication_status})</option>)}</select></label><label>Display order<input type="number" value={draft.sortOrder} onChange={e=>field('sortOrder',Number(e.target.value))}/></label></div>
 <p>{store?'This region enables adoption for a coffee and a story. Booking status is managed in Requests.':'This item appears as a review in its region.'}</p></fieldset>
 <fieldset disabled={busy}><legend>Photos</legend><p>The first photo is the main image. JPEG, PNG or WebP, up to 8 MB each.</p><input aria-label="Upload photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>upload(e.target.files)}/><div className={styles.photos}>{draft.photos.map((p,index)=><div key={p.src}><Image src={p.src} alt={p.alt} width={220} height={180} unoptimized/><label>Image description<input value={p.alt} onChange={e=>field('photos',draft.photos.map((photo,i)=>i===index?{...photo,alt:e.target.value}:photo))}/></label><div className={styles.actions}><button disabled={index===0||busy} onClick={()=>{const photos=[...draft.photos];[photos[index-1],photos[index]]=[photos[index],photos[index-1]];field('photos',photos);}}>Move earlier</button><button disabled={busy} onClick={()=>field('photos',draft.photos.filter((_,i)=>i!==index))}>Remove</button></div></div>)}</div></fieldset>
 <fieldset disabled={busy}><legend>Details</legend><div className={styles.fields}><label>Size<input value={draft.size} onChange={e=>field('size',e.target.value)}/></label><label>Condition<input value={draft.condition} onChange={e=>field('condition',e.target.value)}/></label></div><label>{store?'Why I’m forfeiting it':'Description'}<textarea rows={4} value={draft.description} onChange={e=>field('description',e.target.value)}/></label><h3>Measurements</h3>{measurements.map(([key,value],index)=><div className={styles.fields} key={index}><input aria-label={`Measurement ${index+1}`} placeholder="Waist" value={key} onChange={e=>setMeasurements(measurements.map((m,i)=>i===index?[e.target.value,value]:m))}/><input aria-label={`Value ${index+1}`} placeholder="32 in" value={value} onChange={e=>setMeasurements(measurements.map((m,i)=>i===index?[key,e.target.value]:m))}/><button onClick={()=>setMeasurements(measurements.filter((_,i)=>i!==index))}>Remove</button></div>)}<button onClick={()=>setMeasurements([...measurements,['','']])}>Add measurement</button></fieldset>
 <fieldset disabled={busy}><ReviewEditor value={review} onChange={setReview} photos={draft.photos}/></fieldset>
 {error&&<p className={styles.error} role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 <div className={styles.saveBar}><button disabled={busy} onClick={()=>save('draft')}>{busy?'Working…':'Save draft'}</button>{item&&<><button className={styles.primary} disabled={busy} onClick={()=>save('publish')}>Publish</button><button disabled={busy||item.publicationStatus==='archived'} onClick={()=>save('archive')}>Archive</button></>}</div>
 </div>;
}
function RegionManager({regions,onSaved}:{regions:CatalogRegion[];onSaved:()=>Promise<void>}) {
 const [region,setRegion]=useState<CatalogRegion|null>(null),[isNew,setIsNew]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{await api('/api/admin/catalog/regions',isNew?'POST':'PATCH',region);await onSaved();setRegion(null);}catch(e){setError(String(e));}finally{setBusy(false);}}
 return <><div className={styles.toolbar}><h2>Regions</h2><button onClick={()=>{setIsNew(true);setRegion({id:'',name:'',heading:'',description:'',kind:'review',publication_status:'draft',sort_order:regions.length});}}>Add region</button></div>{regions.map(r=><button className={styles.regionRow} key={r.id} onClick={()=>{setIsNew(false);setRegion(r);}}><strong>{r.name}</strong><span>{r.kind} · {r.publication_status} · order {r.sort_order}</span></button>)}
 {region&&<form onSubmit={submit}><fieldset disabled={busy}><legend>{isNew?'New region':region.name}</legend>{(['id','name','heading','description'] as const).map(key=><label key={key}>{key==='id'?'URL name':key}<input disabled={key==='id'&&!isNew} required={key!=='description'} value={region[key]} onChange={e=>setRegion({...region,[key]:e.target.value})}/></label>)}<label>Type<select value={region.kind} onChange={e=>setRegion({...region,kind:e.target.value as CatalogRegion['kind']})}><option value="review">Reviews</option><option value="storefront">Storefront</option></select></label><label>Publication<select value={region.publication_status} onChange={e=>setRegion({...region,publication_status:e.target.value as CatalogRegion['publication_status']})}>{['draft','published','archived'].map(s=><option key={s}>{s}</option>)}</select></label><label>Order<input type="number" value={region.sort_order} onChange={e=>setRegion({...region,sort_order:Number(e.target.value)})}/></label><div className={styles.actions}><button className={styles.primary} disabled={busy}>Save region</button><button type="button" onClick={()=>setRegion(null)}>Cancel</button></div></fieldset>{error&&<p role="alert">{error}</p>}</form>}</>;
}
function Operations() {
 const [date,setDate]=useState(''),[paper,setPaper]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function run(single:boolean){setBusy(true);try{const data=await api(`/api/admin/${single?'run-paper':'rerun-date'}`,'POST',single?{arxivId:paper,date}:{date});setMessage(`Started: ${data.runId}`);}catch(e){setMessage(String(e));}finally{setBusy(false);}}
 return <section><h2>Paper workflows</h2><label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><button disabled={busy||!date} onClick={()=>run(false)}>Rerun date</button><label>arXiv ID<input value={paper} onChange={e=>setPaper(e.target.value)}/></label><button disabled={busy||!paper} onClick={()=>run(true)}>Run paper</button><p role="status">{message}</p></section>;
}
