import type { MetadataRoute } from 'next';
import { publicCatalog } from '@/lib/catalog/public';
import { SITE_ORIGIN } from '@/lib/catalog/seo';
export const dynamic = 'force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap> {
  const catalog=await publicCatalog();
  return [{url:SITE_ORIGIN},{url:`${SITE_ORIGIN}/things`},...catalog.regions.map(region=>({url:`${SITE_ORIGIN}/things?region=${encodeURIComponent(region.id)}`})),...catalog.items.map(item=>({url:`${SITE_ORIGIN}/things/${encodeURIComponent(item.slug)}`}))];
}
