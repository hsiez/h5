"use client";

import { useCallback, useEffect, useState } from 'react';
import { upload as uploadBlob } from '@vercel/blob/client';
import { preparePhoto } from './prepare-photo';
import { mediaPath } from '@/lib/catalog/media';

type Claim = { id:string; email:string; status:string; requestedAt:string|null; requestedStartAt:string|null; place:string|null; bookingUid:string|null; approvalStartedAt:string|null };
type Item = { id:string; title:string; slug:string; status:string; claims:Claim[]; alertCount:number };

async function loadStorefront() {
  const [itemsResponse,queueResponse]=await Promise.all([fetch('/api/admin/storefront/items'),fetch('/api/admin/storefront/outbox')]);
  if(!itemsResponse.ok || !queueResponse.ok)throw new Error('Could not load storefront items and delivery status');
  const [data,queue]=await Promise.all([itemsResponse.json(),queueResponse.json()]);
  return {items:data.items,queue};
}

export function StorefrontAdmin() {
  const [queue,setQueue]=useState<{counts:{queued:number;failed:number;oldest:string|null};jobs:number;failures:{id:string;type:string;kind:string;attempts:number;error:string}[]}|null>(null);
  const [items,setItems]=useState<Item[]>([]);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [alt,setAlt]=useState<Record<string,string>>({});
  const [photo,setPhoto]=useState<Record<string,File|undefined>>({});
  const [ownerName,setOwnerName]=useState<Record<string,string>>({});
  const [coffeeStory,setCoffeeStory]=useState<Record<string,string>>({});
  const [consent,setConsent]=useState<Record<string,boolean>>({});

  const refresh=useCallback(async () => {
    const data=await loadStorefront();setItems(data.items);setQueue(data.queue);
  },[]);
  useEffect(() => {
    let active=true;
    loadStorefront().then(data=>{if(active){setItems(data.items);setQueue(data.queue);}}).catch(e=>{if(active)setError(String(e));});
    return ()=>{active=false;};
  },[]);

  async function complete(item:Item) {
    setError('');
    const selected=photo[item.id];
    if (!selected || !alt[item.id]?.trim() || !consent[item.id]) { setError('Add a photo, alt text, and publication permission.'); return; }
    setBusy(true);
    try {
      const prepared=await preparePhoto(selected);
      const blob=await uploadBlob(`storefront/handoffs/${crypto.randomUUID()}.webp`,prepared,{access:'private',handleUploadUrl:'/api/admin/catalog/upload',contentType:'image/webp'});
      const response=await fetch('/api/admin/storefront/handoff',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({itemId:item.id,photoUrl:mediaPath(blob.pathname),altText:alt[item.id],consent:true,ownerName:ownerName[item.id]||'its new owner',coffeeStory:coffeeStory[item.id]||'A coffee and a story shared in Seattle.'})});
      if (!response.ok) { const data=await response.json(); throw new Error(data.error || 'Could not complete handoff'); }
      await refresh();
    } catch(e) { setError(String(e)); }
    finally { setBusy(false); }
  }

  async function decide(claim:Claim, decision:'accept'|'decline'|'recover') {
    setError(''); setBusy(true);
    try {
      const response=await fetch(`/api/admin/storefront/claims/${claim.id}/decision`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({decision})
      });
      if (!response.ok) { const data=await response.json(); throw new Error(data.error || 'Could not update request'); }
      await refresh();
    } catch(e) { setError(String(e)); }
    finally { setBusy(false); }
  }

  async function operate(url:string,body:Record<string,string>={}) {
    setError('');setBusy(true);
    try {
      const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Could not complete action');
      await refresh();
    }catch(e){setError(String(e));}finally{setBusy(false);}
  }

  return <section className="space-y-4">
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-lg font-medium">Things for you</h2>
      <button type="button" onClick={()=>refresh().catch(e=>setError(String(e)))} className="text-sm underline">Refresh</button>
    </div>
    <p className="text-sm text-neutral-600">Review Cal requests in order. Pending requests and reservations stay until you resolve them here. Cal cancellations do not automatically reopen inventory.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {queue && <div className="rounded-md border border-neutral-200 p-4 space-y-2 text-sm">
      <strong>Email and booking jobs</strong>
      <p>{queue.counts.queued} emails queued · {queue.counts.failed} failed · {queue.jobs} booking/notification jobs pending</p>
      {queue.counts.oldest && <p>Oldest queued email: {new Date(queue.counts.oldest).toLocaleString()}</p>}
      <button type="button" disabled={busy} className="underline disabled:opacity-50" onClick={()=>operate('/api/admin/storefront/outbox')}>Process a batch now</button>
      {queue.failures.map(job=><div key={job.id}><p>{job.kind} · {job.attempts} attempts · {job.error}</p><button type="button" disabled={busy} className="underline" onClick={()=>operate('/api/admin/storefront/outbox',{id:job.id,type:job.type})}>Retry failed job</button></div>)}
    </div>}
    {items.length===0 && <p className="text-sm text-neutral-500">No storefront items yet.</p>}
    {items.map(item=><div key={item.id} className="rounded-md border border-neutral-200 p-4 space-y-3">
      <div className="flex justify-between gap-3"><strong>{item.title}</strong><span className="text-sm text-neutral-500">{item.status}</span></div>
      <p className="text-sm text-neutral-500">{item.alertCount||0} confirmed availability notification subscribers</p>
      {item.claims.filter(c=>['booking_requested','accepted'].includes(c.status)).map((c,index)=><div key={c.id} className="text-sm text-neutral-600 space-y-2">
        <p>{c.email} · {c.status} · {c.requestedStartAt ? new Date(c.requestedStartAt).toLocaleString() : 'time pending'}{c.place ? ` · ${c.place}` : ''}</p>
        {c.approvalStartedAt && c.status==='booking_requested' && <p>Cal confirmation in progress. If this persists for two minutes, reconcile before retrying. <button disabled={busy} type="button" className="underline" onClick={()=>decide(c,'recover')}>Reconcile approval</button></p>}
        {c.status==='accepted' && <button type="button" disabled={busy} className="underline" onClick={()=>decide(c,'decline')}>Cancel reservation</button>}
        {c.status==='booking_requested' && <div className="flex gap-2">
          {index===0 && item.status==='pending' && !c.approvalStartedAt && <button type="button" disabled={busy} onClick={()=>decide(c,'accept')} className="rounded bg-neutral-900 px-3 py-1.5 text-white disabled:opacity-50">Accept</button>}
          <button type="button" disabled={busy} onClick={()=>decide(c,'decline')} className="rounded border border-neutral-300 px-3 py-1.5 disabled:opacity-50">Decline</button>
        </div>}
      </div>)}
      {['pending','reserved'].includes(item.status) && <div className="text-sm space-y-2">
        {item.claims.some(c=>['canceled','declined'].includes(c.status)) && <p>A booking was canceled or declined. Review the remaining requests or reopen this item.</p>}
        <p>Reopening cancels remaining requests and queues their Cal cancellations.</p>
        <button type="button" disabled={busy} className="underline" onClick={()=>{if(window.confirm('Cancel remaining requests and make this item available again?'))operate(`/api/admin/storefront/items/${item.id}/reopen`);}}>Reopen item</button>
      </div>}
      {item.status==='reserved' && item.claims.some(c=>c.status==='accepted') && <div className="space-y-3">
        <label>New owner’s public name<input value={ownerName[item.id]||''} onChange={e=>setOwnerName({...ownerName,[item.id]:e.target.value})}/></label>
        <label>Coffee and story<textarea value={coffeeStory[item.id]||''} onChange={e=>setCoffeeStory({...coffeeStory,[item.id]:e.target.value})}/></label>
        <label className="block text-sm">Handoff photo (up to 8 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setPhoto({...photo,[item.id]:e.target.files?.[0]})} className="block mt-1" /></label>
        <label className="block text-sm">Alt text<input value={alt[item.id]||''} onChange={e=>setAlt({...alt,[item.id]:e.target.value})} className="block mt-1 w-full border border-neutral-300 rounded px-3 py-2" /></label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={!!consent[item.id]} onChange={e=>setConsent({...consent,[item.id]:e.target.checked})} />The person agreed to this photo being published.</label>
        <button type="button" disabled={busy} onClick={()=>complete(item)} className="rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">Mark claimed</button>
      </div>}
    </div>)}
  </section>;
}
