'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { ItemFields } from '@/lib/catalog/types';
import { productName } from '@/lib/catalog/seo';

export function SharePreview({draft}:{draft:ItemFields}) {
  const [url,setUrl]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [rendered,setRendered]=useState<ItemFields|null>(null);
  useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
  async function preview() {
    setBusy(true);setError('');
    try {
      const response=await fetch('/api/admin/og',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft)});
      if(!response.ok) {const data=await response.json();throw new Error(data.error||'Could not generate preview');}
      setUrl(URL.createObjectURL(await response.blob()));setRendered(draft);
    } catch(error){setError(error instanceof Error?error.message:'Could not generate preview');}
    finally{setBusy(false);}
  }
  return <fieldset><legend>Search and sharing</legend><p>{productName(draft)} — My experience | Things</p><p>Choose a generated drawing in Photos for the OG and X image. Without a selection, the first drawing is used, then the first photo.</p><button type="button" disabled={busy} onClick={()=>void preview()}>{busy?'Rendering…':'Preview OG / X image'}</button>{rendered!==draft&&url&&<p>Details changed. Refresh the preview.</p>}{error&&<p role="alert">{error}</p>}{url&&<Image unoptimized src={url} width={1200} height={630} alt="OG and X share preview" style={{display:'block',width:'100%',height:'auto',marginTop:16}}/>}</fieldset>;
}
