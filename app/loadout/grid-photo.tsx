'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from './loadout.module.css';

export function GridPhoto({ src, eager, onReady, onError }: {
  src: string;
  eager: boolean;
  onReady: (image: HTMLImageElement) => void;
  onError: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed) return <span>Photo unavailable</span>;
  return <Image src={src} alt="" fill draggable={false}
    unoptimized={src.startsWith('https://')}
    loading={eager ? 'eager' : 'lazy'}
    sizes="(max-width: 700px) 50vw, (max-width: 1168px) 33vw, 374px"
    className={`${styles.itemImage} ${styles.itemPhoto}`}
    style={{ opacity: ready ? 1 : 0 }}
    onLoad={async event => {
      const image = event.currentTarget;
      try { await image.decode(); } catch { /* onError handles failed downloads. */ }
      if (!image.isConnected) return;
      onReady(image);
      setReady(true);
    }}
    onError={() => { setFailed(true); onError(); }} />;
}
