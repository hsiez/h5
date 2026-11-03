import { publicCatalog } from '@/lib/catalog/public';
import { shareImage } from '@/lib/catalog/share-image';
export async function GET(_request: Request,{params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  const item=(await publicCatalog()).items.find(item=>item.slug===slug);
  if(!item) return new Response('Not found',{status:404});
  const response=await shareImage(item);
  response.headers.set('Cache-Control','public, max-age=300');
  return response;
}
