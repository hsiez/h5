'use client';
import { getImageProps } from 'next/image';

export const GRID_IMAGE_SIZES = '(max-width: 700px) 50vw, (max-width: 1168px) 33vw, 374px';
export const FOCUS_IMAGE_SIZES = '(max-width: 700px) 100vw, 900px';
const prepared = new Map<string, { image: HTMLImageElement; ready: Promise<HTMLImageElement> }>();

/** Match the exact responsive resource used by focus and gallery rendering. */
function preparePhoto(src: string, sizes: string, priority: 'low' | 'high') {
  const key = `${sizes}:${src}:${window.innerWidth}:${window.devicePixelRatio}`;
  const cached = prepared.get(key);
  if (cached) {
    if (priority === 'high') cached.image.fetchPriority = 'high';
    return cached.ready;
  }
  const { props } = getImageProps({ src, alt: '', fill: true, sizes, unoptimized: src.startsWith('https://') });
  const image = new window.Image();
  image.decoding = 'async';
  image.fetchPriority = priority;
  if (props.sizes) image.sizes = props.sizes;
  if (props.srcSet) image.srcset = props.srcSet;
  image.src = props.src;
  const ready = image.decode().then(() => image).catch(error => { prepared.delete(key); throw error; });
  prepared.set(key, { image, ready });
  if (prepared.size > 32) prepared.delete(prepared.keys().next().value!);
  return ready;
}

export function prepareFocusPhoto(src: string, priority: 'low' | 'high' = 'low') {
  return preparePhoto(src, FOCUS_IMAGE_SIZES, priority);
}
export function prepareGridPhoto(src: string) {
  return preparePhoto(src, GRID_IMAGE_SIZES, 'low');
}
