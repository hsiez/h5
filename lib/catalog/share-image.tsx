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
function ShareWordmark({logoSrc,scale=1}:{logoSrc:string;scale?:number}) {
  return <div style={{display:'flex',alignItems:'center',gap:12*scale,height:40*scale,fontSize:34*scale,lineHeight:1,color:'#aaa'}}><img src={logoSrc} alt="h5" width={70*scale} height={26*scale} style={{objectFit:'contain'}}/><span style={{display:'flex',alignItems:'center',height:40*scale,transform:`translateY(${scale}px)`}}>Things</span></div>;
}
async function shareBranding() {
  const logo=await readFile(join(process.cwd(),'public/h5-logo.svg'),'utf8');
  const logoSrc=`data:image/svg+xml;base64,${Buffer.from(logo.replace('fill="currentColor"','fill="#aaaaaa"')).toString('base64')}`;
  const font=await readFile(join(process.cwd(),'app/fonts/iowan-old-style-regular.ttf'));
  return {logoSrc,font};
}

export async function homeShareImage() {
  const {logoSrc,font}=await shareBranding();
  const footer=await sharp(await readFile(join(process.cwd(),'public/things/footer-desktop.webp'))).resize({width:2400}).png().toBuffer();
  const footerSrc=`data:image/png;base64,${footer.toString('base64')}`;
  return new ImageResponse(<div style={{position:'relative',display:'flex',width:'100%',height:'100%',background:'#fff',fontFamily:'Iowan',justifyContent:'center'}}>
    <div style={{position:'absolute',top:220,display:'flex'}}><ShareWordmark logoSrc={logoSrc} scale={2}/></div>
    <img src={footerSrc} alt="" width={1500} height={211} style={{position:'absolute',left:-150,bottom:0}}/>
  </div>,{width:1200,height:630,fonts:[{name:'Iowan',data:font,weight:400,style:'normal'}]});
}

export async function shareImage(item: Pick<ItemDraft,'title'|'brand'|'model'|'photos'|'ogPhotoSrc'>) {
  const selected=item.photos.find(photo=>photo.src===item.ogPhotoSrc && photo.stippleSrc) || item.photos.find(photo=>photo.stippleSrc) || item.photos[0];
  let image: string|undefined;
  if(selected) image=await drawingData(selected.stippleSrc || selected.src);
  const {logoSrc,font}=await shareBranding();
  const name=productName(item);
  return new ImageResponse(<div style={{display:'flex',width:'100%',height:'100%',background:'#fff',padding:60,alignItems:'center',justifyContent:'center',gap:64,fontFamily:'Iowan'}}>
    <div style={{display:'flex',width:image?508:1080,flexShrink:0,alignItems:'center',justifyContent:'center'}}><ShareWordmark logoSrc={logoSrc} scale={1.8}/></div>
    {image && <div style={{display:'flex',width:508,flexShrink:0,alignItems:'center',justifyContent:'center'}}><img src={image} alt={name} width={540} height={510} style={{objectFit:'contain',flexShrink:0}}/></div>}
  </div>,{width:1200,height:630,fonts:[{name:'Iowan',data:font,weight:400,style:'normal'}]});
}
