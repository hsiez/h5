import { del, put } from '@vercel/blob';
import { completeHandoff } from '@/lib/storefront/core';
import { failure, requireAdmin } from '@/lib/storefront/http';

export async function POST(request:Request) {
  try {
    requireAdmin(request);
    const form = await request.formData();
    const itemId = String(form.get('itemId') || '');
    const altText = String(form.get('altText') || '');
    const consent = form.get('consent') === 'true';
    const file = form.get('photo');
    if (!(file instanceof File) || !['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 10_000_000 || !consent)
      return Response.json({error:'A JPEG, PNG, or WebP photo under 10 MB and publish permission are required'},{status:400});
    const blob = await put(`storefront/handoffs/${crypto.randomUUID()}-${file.name}`,file,{access:'public',contentType:file.type});
    try { await completeHandoff(itemId,blob.url,altText,consent); }
    catch(error) { await del(blob.url).catch(() => {}); throw error; }
    return Response.json({ok:true,photoUrl:blob.url});
  } catch(error) { return failure(error); }
}
