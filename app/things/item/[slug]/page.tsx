import { notFound } from 'next/navigation';
import { publicCatalog } from '@/lib/catalog/public';
import { LoadoutWorld } from '../../../loadout/loadout-world';

export default async function ItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await publicCatalog();
  const item = catalog.items.find(candidate => candidate.slug === slug);
  if (!item) notFound();
  const items = catalog.items.filter(candidate => candidate.regionId === item.regionId);
  return <LoadoutWorld key={slug} catalog={catalog} dedicatedItem initialSelection={{ regionId: item.regionId, itemIndex: items.findIndex(candidate => candidate.slug === slug) }} />;
}
