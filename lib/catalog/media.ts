const PHOTO_PATH = /^(catalog|storefront\/handoffs)\/[a-f0-9-]{36}-[A-Za-z0-9]+\.(?:png|jpe?g|webp)$/;

export function mediaPath(pathname: string) {
  if (!PHOTO_PATH.test(pathname)) throw new Error('Invalid uploaded photo path');
  return `/api/catalog/media?pathname=${encodeURIComponent(pathname)}`;
}

export function uploadedPhotoPathname(src: string) {
  try {
    const url = new URL(src, 'http://catalog.local');
    if (url.origin !== 'http://catalog.local' || url.pathname !== '/api/catalog/media') return null;
    const pathname = url.searchParams.get('pathname');
    return pathname && PHOTO_PATH.test(pathname) ? pathname : null;
  } catch { return null; }
}
