import type { Metadata } from 'next';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { publicCatalog } from '@/lib/catalog/public';
import { LoadoutWorld } from '../loadout/loadout-world';

export async function generateMetadata({searchParams}:{searchParams:Promise<{region?:string}>}):Promise<Metadata> {
  const {region:id}=await searchParams;
  const region=id?(await publicCatalog()).regions.find(region=>region.id===id):undefined;
  const title=region?`${region.name} — Things | Harley Siezar`:'Things worth mentioning — Harley Siezar';
  const description=region?.description || 'Amazing things are created every day. These are a few physical items I’ve come across. Some of these could be yours.';
  const url=`https://h5.codes/things${region?`?region=${encodeURIComponent(region.id)}`:''}`;
  const image=`https://h5.codes/api/things/og${region?`?region=${encodeURIComponent(region.id)}`:''}`;
  return {title,description,alternates:{canonical:url},openGraph:{title,description,url,images:[{url:image,width:1200,height:630}]},twitter:{card:'summary_large_image',title,description,images:[image]}};
}

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
  if (itemIndex >= 0) redirect(`/things/${encodeURIComponent(regionItems[itemIndex].slug)}`);
  return <LoadoutWorld key={region?.id ?? 'world'} catalog={catalog} initialSelection={{ regionId: region?.id ?? null, itemIndex }} />;
}
