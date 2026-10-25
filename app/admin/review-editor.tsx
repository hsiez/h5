'use client';
import { useState } from 'react';
import type { ItemReview, ReviewText } from '../loadout/reviews';
import type { Photo } from '@/lib/catalog/types';
export type RefEntry={key:string;value:Exclude<ReviewText,string>};
export type ReviewForm={enabled:boolean;about:string;pros:string;cons:string;refs:RefEntry[]};
export function fromReview(review:ItemReview|null):ReviewForm {
 const refs:RefEntry[]=[];
 const encode=(parts:ReviewText[])=>parts.map(p=>{if(typeof p==='string') return p;const key=`ref${refs.length+1}`;refs.push({key,value:p});return `[[${key}]]`;}).join('');
 return {enabled:!!review,about:review?.about.map(encode).join('\n\n')||'',pros:review?.pros.map(p=>typeof p==='string'?p:encode(p)).join('\n\n')||'',cons:review?.cons.map(p=>typeof p==='string'?p:encode(p)).join('\n\n')||'',refs};
}
export function toReview(form:ReviewForm,title:string):ItemReview|null {
 if(!form.enabled) return null;
 const parse=(text:string):ReviewText[]=>text.split(/(\[\[[a-z0-9]+\]\])/g).filter(Boolean).map(p=>{
  if(!p.startsWith('[[')) return p;
  const ref=form.refs.find(r=>r.key===p.slice(2,-2));if(!ref) throw new Error(`Unknown reference ${p}`);return ref.value;
 });
 const paragraphs=(text:string)=>text.split(/\n\s*\n/).filter(p=>p.trim()).map(parse);
 return {title,about:paragraphs(form.about),pros:paragraphs(form.pros),cons:paragraphs(form.cons)};
}
export function ReviewEditor({value,onChange,photos}:{value:ReviewForm;onChange:(v:ReviewForm)=>void;photos:Photo[]}) {
 const [section,setSection]=useState<'about'|'pros'|'cons'>('about');
 function add(kind:'location'|'image') {
  const key=`ref${Date.now()}`;
  const entry:RefEntry={key,value:{text:kind==='location'?'Place':'Photo',entity:kind==='location'?{kind,name:'',city:'',latitude:47.6062,longitude:-122.3321,zoom:14}:{kind,src:photos[0]?.src||'',alt:photos[0]?.alt||'',caption:'',width:1200,height:1200}}};
  onChange({...value,refs:[...value.refs,entry],[section]:`${value[section]} [[${key}]]`});
 }
 function edit(index:number,ref:RefEntry) {onChange({...value,refs:value.refs.map((r,i)=>i===index?ref:r)});}
 return <fieldset><legend>Review</legend>
  <label className="check"><input type="checkbox" checked={value.enabled} onChange={e=>onChange({...value,enabled:e.target.checked})}/>Include a review</label>
  {value.enabled&&<>
   <p>Write the text after each lead-in. Separate paragraphs with a blank line. Reference markers can be moved within the text.</p>
   {(['about','pros','cons'] as const).map((key,i)=><label key={key}>{['I acquired','I love','Only notes'][i]}<textarea rows={5} value={value[key]} onFocus={()=>setSection(key)} onChange={e=>onChange({...value,[key]:e.target.value})}/></label>)}
   <div className="actions"><label>Add a reference to<select value={section} onChange={e=>setSection(e.target.value as typeof section)}><option value="about">I acquired</option><option value="pros">I love</option><option value="cons">Only notes</option></select></label><button type="button" onClick={()=>add('image')}>Add image reference</button><button type="button" onClick={()=>add('location')}>Add location reference</button></div>
   {value.refs.map((ref,index)=>{const entity=ref.value.entity;return <fieldset key={ref.key}><legend>{`[[${ref.key}]]`}</legend>
    <label>Highlighted text<input value={ref.value.text} onChange={e=>edit(index,{...ref,value:{...ref.value,text:e.target.value}})}/></label>
    {entity.kind==='image'?<>
     <label>Image<select value={entity.src} onChange={e=>edit(index,{...ref,value:{...ref.value,entity:{...entity,src:e.target.value}}})}><option value="">Choose an uploaded image</option>{!photos.some(p=>p.src===entity.src)&&entity.src&&<option value={entity.src}>Existing reference image</option>}{photos.map((p,i)=><option key={i} value={p.src}>{p.alt||`Photo ${i+1}`}</option>)}</select></label>
     <label>Image description<input value={entity.alt} onChange={e=>edit(index,{...ref,value:{...ref.value,entity:{...entity,alt:e.target.value}}})}/></label>
    </>:<><label>Place name<input value={entity.name} onChange={e=>edit(index,{...ref,value:{...ref.value,entity:{...entity,name:e.target.value}}})}/></label><label>City, country<input value={entity.city} onChange={e=>edit(index,{...ref,value:{...ref.value,entity:{...entity,city:e.target.value}}})}/></label><div className="fields">{(['latitude','longitude','zoom'] as const).map(k=><label key={k}>{k}<input type="number" step="any" value={entity[k]} onChange={e=>edit(index,{...ref,value:{...ref.value,entity:{...entity,[k]:Number(e.target.value)}}})}/></label>)}</div></>}
    <button type="button" onClick={()=>onChange({...value,refs:value.refs.filter((_,i)=>i!==index),about:value.about.replaceAll(`[[${ref.key}]]`,ref.value.text),pros:value.pros.replaceAll(`[[${ref.key}]]`,ref.value.text),cons:value.cons.replaceAll(`[[${ref.key}]]`,ref.value.text)})}>Remove reference, keep text</button>
   </fieldset>})}
  </>}
 </fieldset>;
}
