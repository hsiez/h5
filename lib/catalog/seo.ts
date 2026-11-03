import type { Metadata } from 'next';
import type { CatalogItem } from './types';
export const SITE_ORIGIN = 'https://h5.codes';
export function productName(item: Pick<CatalogItem, 'brand'|'model'|'title'>) {
  return [item.brand?.trim(), item.model?.trim() || item.title].filter(Boolean).join(' ');
}
export function itemDescription(item: CatalogItem) {
  const review = item.review?.about.flat().map(part => typeof part === 'string' ? part : part.text).join(' ');
  return (item.description || review || `My experience with ${productName(item)}.`).replace(/\s+/g, ' ').trim().slice(0, 160);
}
export function itemMetadata(item: CatalogItem): Metadata {
  const title = `${productName(item)} — My experience | Things`;
  const description = itemDescription(item);
  const url = `${SITE_ORIGIN}/things/${encodeURIComponent(item.slug)}`;
  const image = { url: `${SITE_ORIGIN}/api/catalog/og/${encodeURIComponent(item.slug)}?v=${item.revision}`, width:1200, height:630, alt:productName(item) };
  return {title,description,alternates:{canonical:url},openGraph:{title,description,url,type:'article',images:[image]},twitter:{card:'summary_large_image',title,description,images:[image]}};
}
