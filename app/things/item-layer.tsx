'use client';

import { createContext, useLayoutEffect, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import styles from './item-layer.module.css';

export const ItemLayerContext = createContext(false);

// The router retains the region in the children slot. No copied grid, synthetic
// history, image snapshots, or delayed navigation are needed to reveal it again.
export function ItemLayer({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useLayoutEffect(() => {
    const background = document.querySelector<HTMLElement>('[data-things-background]');
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousInert = background?.inert ?? false;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    if (background) background.inert = true;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    ref.current?.focus({ preventScroll: true });
    return () => {
      if (background) background.inert = previousInert;
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);
  return <ItemLayerContext.Provider value={true}><div ref={ref} className={styles.layer} data-item-layer role="dialog"
    aria-modal="true" aria-label="Item details" tabIndex={-1}
    onKeyDown={event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        const gallery = ref.current?.querySelector<HTMLButtonElement>('[data-gallery-return]');
        if (gallery) gallery.click(); else router.back();
      }
      if (event.key !== 'Tab') return;
      const controls = Array.from(ref.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
      ) ?? []).filter(element => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }}>

    {children}
    <div data-item-footer />
  </div></ItemLayerContext.Provider>;
}
