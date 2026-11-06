"use client";

import { useEffect, useRef, type ReactNode } from 'react';
import styles from './mobile-action-bar.module.css';

export function MobileActionBar({ children, className = '', label, ...attributes }: {
  children: ReactNode;
  className?: string;
  label: string;
  'data-mobile-safari'?: boolean;
  'data-notify-open'?: boolean;
}) {
  const footer = useRef<HTMLElement>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    const element = footer.current;
    if (!viewport || !element) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      element.style.setProperty('--footer-bottom', `${viewport.offsetTop + viewport.height}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    viewport.addEventListener('resize', schedule);
    viewport.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('pageshow', schedule);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', schedule);
      viewport.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('pageshow', schedule);
      element.style.removeProperty('--footer-bottom');
    };
  }, []);
  return <nav ref={footer} className={`${styles.bar} ${className}`} aria-label={label} {...attributes}>{children}</nav>;
}
