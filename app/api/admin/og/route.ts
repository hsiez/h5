import { requireSession } from '@/lib/admin/auth';
import { validateShareFields } from '@/lib/catalog/validation';
import { shareImage } from '@/lib/catalog/share-image';
import { failure } from '@/lib/storefront/http';
export async function POST(request:Request) {
  try {
    await requireSession(request);
    const image=await shareImage(validateShareFields(await request.json()));
    image.headers.set('Cache-Control','no-store');
    return image;
  } catch(error) {return failure(error);}
}
