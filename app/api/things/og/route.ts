import { publicCatalog } from '@/lib/catalog/public';
import { shareImage, homeShareImage } from '@/lib/catalog/share-image';
export async function GET(request:Request) {
  const id=new URL(request.url).searchParams.get('region');
  if(!id) {
    const image=await homeShareImage();
    image.headers.set('Cache-Control','public, max-age=300');
    return image;
  }
  const catalog=await publicCatalog();
  const region=catalog.regions.find(region=>region.id===id);
  const items=region?catalog.items.filter(item=>item.regionId===region.id):catalog.items;
  const photo=items.flatMap(item=>item.photos).find(photo=>photo.stippleSrc);
  const image=await shareImage({title:region?.name||'Things worth mentioning',photos:photo?[photo]:[]});
  image.headers.set('Cache-Control','public, max-age=300');
  return image;
}
