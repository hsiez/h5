/* eslint-disable @next/next/no-img-element -- ImageResponse renders native img elements, not next/image. */
import { ImageResponse } from 'next/og';
import { get } from '@vercel/blob';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { uploadedPhotoPathname } from './media';
import { productName } from './seo';
import type { ItemDraft } from './types';

async function drawingData(src: string) {
  const pathname = uploadedPhotoPathname(src);
  let bytes: Buffer;
  if(pathname) {
    const result=await get(pathname,{access:'private'});
    if(!result || result.statusCode!==200 || result.blob.size>12_000_000) throw new Error('Share drawing unavailable');
    bytes=Buffer.from(await new Response(result.stream).arrayBuffer());
  } else if(/^\/loadout\/[a-zA-Z0-9._/-]+$/.test(src) && !src.includes('..')) {
    bytes=await readFile(join(process.cwd(),'public',src));
  } else {
    const url=new URL(src);
    if(url.protocol!=='https:' || !url.hostname.endsWith('.public.blob.vercel-storage.com') || url.username || url.password) throw new Error('Invalid share drawing');
    const response=await fetch(url,{signal:AbortSignal.timeout(8000),redirect:'error'});
    if(!response.ok) throw new Error('Share drawing unavailable');
    bytes=Buffer.from(await response.arrayBuffer());
  }
  const png=await sharp(bytes,{limitInputPixels:24_000_000}).resize({width:800,height:800,fit:'inside',withoutEnlargement:true}).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}
export async function shareImage(item: Pick<ItemDraft,'title'|'brand'|'model'|'photos'|'ogPhotoSrc'>) {
  const selected=item.photos.find(photo=>photo.src===item.ogPhotoSrc && photo.stippleSrc) || item.photos.find(photo=>photo.stippleSrc) || item.photos[0];
  let image: string|undefined;
  if(selected) image=await drawingData(selected.stippleSrc || selected.src);
  const name=productName(item);
  const titleSize=name.length>80?34:name.length>45?42:54;
  const font=await readFile(join(process.cwd(),'app/fonts/iowan-old-style-regular.ttf'));
  return new ImageResponse(<div style={{display:'flex',width:'100%',height:'100%',background:'#fff',color:'#151515',padding:60,alignItems:'center',gap:40,fontFamily:'Iowan'}}>
    <div style={{display:'flex',flexDirection:'column',width:image?'48%':'100%',gap:24}}><div style={{fontSize:25,color:'#777'}}>Things · h5.codes</div><div style={{fontSize:titleSize,lineHeight:1.1,wordBreak:'break-word'}}>{name}</div><div style={{fontSize:27,color:'#777'}}>A few things worth mentioning.</div></div>
    {image && <img src={image} alt="" width={500} height={510} style={{objectFit:'contain'}}/>}
  </div>,{width:1200,height:630,fonts:[{name:'Iowan',data:font,weight:400,style:'normal'}]});
}
