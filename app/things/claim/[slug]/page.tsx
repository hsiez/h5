import type { Metadata } from 'next';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { publicCatalog } from '@/lib/catalog/public';
import { MobileClaimPage } from './mobile-claim-page';

export const metadata: Metadata = { title: 'Claim an item — Harley Siezar' };

export default async function ClaimPage({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const catalog = await publicCatalog();
  const item = catalog.items.find(candidate => candidate.slug === slug && candidate.regionId === 'things-for-you');
  if (!item) notFound();

  return <MobileClaimPage slug={item.slug} title={item.title} />;
}
