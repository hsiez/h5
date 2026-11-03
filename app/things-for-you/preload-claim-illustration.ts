'use client';

import { useEffect } from 'react';
import { prepareFocusPhoto } from '@/lib/catalog/image-loading';

export const CLAIM_ILLUSTRATION = '/illustrations/coffee-chat-metal-cups-spaced-stipple-420.webp';
let prepared: Promise<void> | undefined;

/** Warm the shared Claim/Notify decoration after the item's primary image. */
export function usePreloadClaimIllustration(primarySrc?: string) {
  useEffect(() => {
    let cancelled = false;
    async function prepare() {
      if (primarySrc) {
        await prepareFocusPhoto(primarySrc).catch(() => {});
      }
      if (cancelled || prepared) return;
      const illustration = new window.Image();
      illustration.decoding = 'async';
      illustration.fetchPriority = 'low';
      illustration.src = CLAIM_ILLUSTRATION;
      prepared = illustration.decode().catch(() => { prepared = undefined; });
      await prepared;
    }
    void prepare();
    return () => { cancelled = true; };
  }, [primarySrc]);
}
