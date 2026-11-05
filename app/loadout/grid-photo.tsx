'use client';

import Image from 'next/image';
import { GRID_IMAGE_SIZES } from '@/lib/catalog/image-loading';
import { useState } from 'react';
import styles from './loadout.module.css';

export function GridPhoto({ src, eager, onReady, onError }: {
  src: string;
  eager: boolean;
  onReady?: (image: HTMLImageElement) => void;
  onError?: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed) return <span>Photo unavailable</span>;
  return <Image src={src} alt="" fill draggable={false}
    unoptimized={src.startsWith('https://')}
    loading={eager ? 'eager' : 'lazy'}
    sizes={GRID_IMAGE_SIZES}
    className={`${styles.itemImage} ${styles.itemPhoto}`}
    style={{ opacity: ready ? 1 : 0 }}
    onLoad={async event => {
      const image = event.currentTarget;
      try { await image.decode(); } catch { /* onError handles failed downloads. */ }
      if (!image.isConnected) return;
      onReady?.(image);
      setReady(true);
    }}
    onError={() => { setFailed(true); onError?.(); }} />;
}
