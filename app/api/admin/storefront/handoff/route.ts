import { completeHandoff } from '@/lib/storefront/core';
import { failure, requireAdmin } from '@/lib/storefront/http';
import { uploadedPhotoPathname } from '@/lib/catalog/media';

export async function POST(request:Request) {
  try {
    await requireAdmin(request);
    const body=await request.json();
    const itemId=String(body.itemId||'');
    const altText=String(body.altText||'');
    const ownerName=String(body.ownerName||'its new owner').trim();
    const coffeeStory=String(body.coffeeStory||'A coffee and a story shared in Seattle.').trim();
    if (!ownerName || ownerName.length>160 || coffeeStory.length>5000 || altText.length>500) return Response.json({error:'Check the handoff details'},{status:400});
    const consent=body.consent===true;
    const photoUrl=String(body.photoUrl||'');
    const validPhoto=uploadedPhotoPathname(photoUrl)?.startsWith('storefront/handoffs/') ?? false;
    if(!validPhoto||!consent) return Response.json({error:'An uploaded handoff photo and publish permission are required'},{status:400});
    await completeHandoff(itemId,photoUrl,altText,consent,ownerName,coffeeStory);
    return Response.json({ok:true,photoUrl});
  } catch(error) { return failure(error); }
}
