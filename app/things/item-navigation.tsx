'use client';
import { useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NotifyFooterForm } from './notify-footer-form';
import { ItemLayerContext } from './item-layer';
import { regionHref } from '../loadout/catalog-navigation';
import claimPageStyles from './claim/[slug]/mobile-claim-page.module.css';
import claimStyles from '../things-for-you/storefront-item.module.css';
import frameStyles from '../_components/paper-frame.module.css';
import styles from './item-navigation.module.css';
import { MobileActionBar } from './mobile-action-bar';
import footerStyles from './mobile-action-bar.module.css';

export function ItemNavigation({regionId,slug,claimable,notifiable=false}:{regionId:string;slug:string;claimable:boolean;notifiable?:boolean}) {
  const [mobileSafari, setMobileSafari] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const notifyButton = useRef<HTMLButtonElement>(null);
  const closeNotify = () => { setNotifyOpen(false); requestAnimationFrame(() => notifyButton.current?.focus({preventScroll:true})); };
  const inGallery = useContext(ItemLayerContext);
  const router = useRouter();
  const anchor = useRef<HTMLSpanElement>(null);
  const [target,setTarget] = useState<HTMLElement|null>(null);
  useEffect(()=>{
    const frame=requestAnimationFrame(()=>{
      const ua = navigator.userAgent;
      // Safari tokens also appear in other iOS browsers; exclude their identifiers.
      setMobileSafari(/AppleWebKit/.test(ua) && /Version\//.test(ua) && /Mobile\//.test(ua) && /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA|Chrome|Android/i.test(ua));
      setTarget(anchor.current?.closest('[data-item-layer]')?.querySelector<HTMLElement>('[data-item-footer]') ?? document.body);
    });
    return ()=>cancelAnimationFrame(frame);
  },[]);
  const backContent = <><svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12.5 4.5 6 10l6.5 5.5" /></svg><span>Back</span></>;
  const backClass = `${claimPageStyles.back} ${frameStyles.frame} ${frameStyles.popover}`;
  const backPosition = {position:'relative',top:'auto',left:'auto',flexShrink:0} as const;
  return <><span ref={anchor} hidden />{target && createPortal(
    <MobileActionBar className={styles.navigation} data-mobile-safari={mobileSafari || undefined} data-notify-open={notifyOpen || undefined} label="Item navigation">
      {notifyOpen ? <NotifyFooterForm key={slug} slug={slug} onClose={closeNotify} /> : <div className={footerStyles.row} data-action-row>
        {inGallery ? <button className={backClass} style={backPosition} type="button" data-gallery-return aria-label="Back to gallery" onClick={()=>{
          const retainedGrid=document.querySelector('[data-things-background] [data-stage="0"]');
          if(retainedGrid) router.back(); else router.push(regionHref(regionId));
        }}>{backContent}</button>
          : <Link className={backClass} style={backPosition} href={regionHref(regionId)} aria-label="Back to gallery">{backContent}</Link>}
        {notifiable && <button ref={notifyButton} type="button" className={`${claimStyles.primaryButton} ${footerStyles.action}`} data-footer-action aria-expanded={notifyOpen} onClick={() => setNotifyOpen(true)}><span className={claimStyles.buttonGrain} aria-hidden="true" /><span className={claimStyles.buttonLabel}>Notify me</span></button>}
        {claimable && !notifiable && <Link className={`${claimStyles.primaryButton} ${footerStyles.action}`} data-footer-action href={`/things/claim/${encodeURIComponent(slug)}`} transitionTypes={['claim-forward']}>
          <span className={claimStyles.buttonGrain} aria-hidden="true" />
          <span className={claimStyles.buttonLabel}>Claim for 1 coffee</span>
        </Link>}
      </div>}
    </MobileActionBar>,target)}</>;
}
