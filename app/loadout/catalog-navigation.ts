import type { Catalog } from '@/lib/catalog/types';

export function regionHref(regionId: string | null, preview = false) {
  const base = preview ? '/admin/preview' : '/things';
  return regionId ? `${base}?region=${encodeURIComponent(regionId)}` : base;
}

export function itemHref(slug: string, regionId: string, preview = false) {
  return preview
    ? `${regionHref(regionId, true)}&item=${encodeURIComponent(slug)}`
    : `/things/${encodeURIComponent(slug)}`;
}

export function previewSelection(catalog: Catalog, query: { region?: string; item?: string }) {
  const region = catalog.regions.find(candidate => candidate.id === query.region);
  const items = region ? catalog.items.filter(item => item.regionId === region.id) : [];
  return { regionId: region?.id ?? null, itemIndex: items.findIndex(item => item.slug === query.item) };
}
