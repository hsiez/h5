'use client';

import { useCallback, useEffect, useRef, type ReactNode, type UIEventHandler } from 'react';
import styles from './overflow-fade.module.css';

type OverflowFadeProps = {
  children: ReactNode;
  className?: string;
  dataReviewScroll?: boolean;
  label: string;
  onScroll?: UIEventHandler<HTMLDivElement>;
};

export function OverflowFade({ children, className, dataReviewScroll, label, onScroll }: OverflowFadeProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const updateFade = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const remaining = Math.max(0, viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop);
    viewport.style.setProperty('--fade-top', `${Math.min(32, viewport.scrollTop)}px`);
    viewport.style.setProperty('--fade-bottom', `${Math.min(32, remaining)}px`);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(updateFade);
    observer.observe(viewport);
    if (viewport.firstElementChild) observer.observe(viewport.firstElementChild);
    updateFade();
    return () => observer.disconnect();
  }, [updateFade, children]);

  return <div
    ref={viewportRef}
    className={`${styles.viewport}${className ? ` ${className}` : ''}`}
    data-review-scroll={dataReviewScroll ? '' : undefined}
    role="region"
    aria-label={label}
    tabIndex={0}
    onScroll={event => { updateFade(); onScroll?.(event); }}
  >{children}</div>;
}
