import type { Metadata } from 'next';
import { connection } from 'next/server';
import { publicCatalog } from '@/lib/catalog/public';
import { LoadoutWorld } from '../loadout/loadout-world';

export const metadata: Metadata = {
  title: 'Things — Harley Siezar',
  description: 'An interactive collection of things I carry and things for you.',
};

export default async function ThingsPage() {
  await connection();
  return <LoadoutWorld catalog={await publicCatalog()} />;
}
