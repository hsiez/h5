import type { Metadata } from 'next';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { publicCatalog } from '@/lib/catalog/public';
import { LoadoutWorld } from '../loadout/loadout-world';

export const metadata: Metadata = {
  title: 'Things — Harley Siezar',
  description: 'An interactive collection of things I carry and things for you.',
};

export default async function ThingsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; region?: string; item?: string }>;
}) {
  await connection();
  const query = await searchParams;
  if (query.view === 'world') redirect('/things');
  const catalog = await publicCatalog();
  const region = !query.region
    ? null
    : catalog.regions.find(candidate => candidate.id === query.region) ?? catalog.regions[0] ?? null;
  const regionItems = region ? catalog.items.filter(item => item.regionId === region.id) : [];
  const itemIndex = query.item
    ? regionItems.findIndex(item => item.slug === query.item)
    : -1;
  return <LoadoutWorld catalog={catalog} initialSelection={{ regionId: region?.id ?? null, itemIndex }} />;
}
