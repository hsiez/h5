"use client";

import { useCallback, useEffect, useState } from 'react';
import { upload as uploadBlob } from '@vercel/blob/client';
import { preparePhoto } from './prepare-photo';
import { mediaPath } from '@/lib/catalog/media';

type Claim = { id:string; email:string; status:string; requestedAt:string|null; requestedStartAt:string|null; place:string|null; bookingUid:string|null };
type Item = { id:string; title:string; slug:string; status:string; claims:Claim[]; alertCount:number };

export function StorefrontAdmin() {
  const [items,setItems]=useState<Item[]>([]);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [alt,setAlt]=useState<Record<string,string>>({});
  const [photo,setPhoto]=useState<Record<string,File|undefined>>({});
  const [ownerName,setOwnerName]=useState<Record<string,string>>({});
  const [coffeeStory,setCoffeeStory]=useState<Record<string,string>>({});
  const [consent,setConsent]=useState<Record<string,boolean>>({});

  const refresh=useCallback(async () => {
    const response=await fetch('/api/admin/storefront/items',{});
    if (!response.ok) throw new Error('Could not load storefront items');
    const data=await response.json();
    setItems(data.items);
  },[]);
  useEffect(() => {
    fetch('/api/admin/storefront/items',{})
      .then(async response => {
        if (!response.ok) throw new Error('Could not load storefront items');
        return response.json();
      })
      .then(data => setItems(data.items))
      .catch(e => setError(String(e)));
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

  async function decide(claim:Claim, decision:'accept'|'decline') {
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

  return <section className="space-y-4">
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-lg font-medium">Things for you</h2>
      <button type="button" onClick={()=>refresh().catch(e=>setError(String(e)))} className="text-sm underline">Refresh</button>
    </div>
    <p className="text-sm text-neutral-600">Review Cal requests in order. Complete the item here after the in-person handoff.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {items.length===0 && <p className="text-sm text-neutral-500">No storefront items yet.</p>}
    {items.map(item=><div key={item.id} className="rounded-md border border-neutral-200 p-4 space-y-3">
      <div className="flex justify-between gap-3"><strong>{item.title}</strong><span className="text-sm text-neutral-500">{item.status}</span></div>
      <p className="text-sm text-neutral-500">{item.alertCount||0} availability notification subscribers</p>
      {item.claims.filter(c=>['booking_requested','accepted'].includes(c.status)).map((c,index)=><div key={c.id} className="text-sm text-neutral-600 space-y-2">
        <p>{c.email} · {c.status} · {c.requestedStartAt ? new Date(c.requestedStartAt).toLocaleString() : 'time pending'}{c.place ? ` · ${c.place}` : ''}</p>
        {c.status==='booking_requested' && <div className="flex gap-2">
          {index===0 && <button type="button" disabled={busy} onClick={()=>decide(c,'accept')} className="rounded bg-neutral-900 px-3 py-1.5 text-white disabled:opacity-50">Accept</button>}
          <button type="button" disabled={busy} onClick={()=>decide(c,'decline')} className="rounded border border-neutral-300 px-3 py-1.5 disabled:opacity-50">Decline</button>
        </div>}
      </div>)}
      {item.status==='reserved' && <div className="space-y-3">
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
