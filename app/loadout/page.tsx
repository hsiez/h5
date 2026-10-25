import type { Metadata } from 'next';
import { connection } from 'next/server';
import { publicCatalog } from '@/lib/catalog/public';
import { LoadoutWorld } from './loadout-world';
export const metadata:Metadata={title:'Loadout World — Harley Siezar',description:'An interactive, zoomable atlas of everyday equipment.'};
export default async function LoadoutPage() { await connection();return <LoadoutWorld catalog={await publicCatalog()}/>; }
