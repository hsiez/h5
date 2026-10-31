'use client';
import { useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ItemLayerContext } from './item-layer';
import { regionHref } from '../loadout/catalog-navigation';
import claimPageStyles from './claim/[slug]/mobile-claim-page.module.css';
import claimStyles from '../things-for-you/storefront-item.module.css';
import frameStyles from '../_components/paper-frame.module.css';
import styles from './item-navigation.module.css';

export function ItemNavigation({regionId,slug,claimable}:{regionId:string;slug:string;claimable:boolean}) {
  const inGallery = useContext(ItemLayerContext);
  const router = useRouter();
  const anchor = useRef<HTMLSpanElement>(null);
  const [target,setTarget] = useState<HTMLElement|null>(null);
  useEffect(()=>{
    const frame=requestAnimationFrame(()=>setTarget(anchor.current?.closest('[data-item-layer]')?.querySelector<HTMLElement>('[data-item-footer]') ?? document.body));
    return ()=>cancelAnimationFrame(frame);
  },[]);
  const backContent = <><svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12.5 4.5 6 10l6.5 5.5" /></svg><span>Back</span></>;
  const backClass = `${claimPageStyles.back} ${frameStyles.frame} ${frameStyles.popover}`;
  const backPosition = {position:'relative',top:'auto',left:'auto',flexShrink:0} as const;
  return <><span ref={anchor} hidden />{target && createPortal(
    <nav className={styles.navigation} aria-label="Item navigation">
      <div className={styles.row}>
        {inGallery ? <button className={backClass} style={backPosition} type="button" data-gallery-return aria-label="Back to gallery" onClick={()=>{
          const retainedGrid=document.querySelector('[data-things-background] [data-stage="0"]');
          if(retainedGrid) router.back(); else router.push(regionHref(regionId));
        }}>{backContent}</button>
          : <Link className={backClass} style={backPosition} href={regionHref(regionId)} aria-label="Back to gallery">{backContent}</Link>}
        {claimable && <Link className={`${claimStyles.primaryButton} ${styles.claim}`} href={`/things/claim/${encodeURIComponent(slug)}`} transitionTypes={['claim-forward']}>
          <span className={claimStyles.buttonGrain} aria-hidden="true" />
          <span className={claimStyles.buttonLabel}>Claim for 1 coffee</span>
        </Link>}
      </div>
    </nav>,target)}</>;
}
