'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { FOCUS_IMAGE_SIZES, GRID_IMAGE_SIZES } from '@/lib/catalog/image-loading';
import styles from './loadout.module.css';

/** Keep the already-cached grid rendition visible during a sharp-image upgrade. */
export function FocusPhoto({src,item,onReady,onError}:{src:string;item:string;onReady:(image:HTMLImageElement)=>void;onError:()=>void}) {
  const [sharpReady,setSharpReady]=useState(false);
  const [showPreview,setShowPreview]=useState(true);
  useEffect(() => {
    if (!sharpReady) return;
    // Keep the underlay through the 180ms opacity transition, then remove it
    // so transparent edges are not permanently composited twice.
    const timer = setTimeout(() => setShowPreview(false), 200);
    return () => clearTimeout(timer);
  }, [sharpReady]);
  return <>
    {showPreview && <Image src={src} alt="" fill sizes={GRID_IMAGE_SIZES} loading="eager"
      unoptimized={src.startsWith('https://')} draggable={false}
      className={`${styles.itemImage} ${styles.itemPhoto}`}
      onLoad={event=>onReady(event.currentTarget)} onError={onError}/>}
    <Image src={src} alt="" fill sizes={FOCUS_IMAGE_SIZES} loading="eager" fetchPriority="high"
      unoptimized={src.startsWith('https://')} draggable={false} data-motion-image={item}
      className={`${styles.itemImage} ${styles.itemPhoto}`} style={{opacity:sharpReady?1:0}}
      onLoad={event=>{onReady(event.currentTarget);setSharpReady(true);}} onError={onError}/>
  </>;
}
