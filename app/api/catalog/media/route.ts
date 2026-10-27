import { get } from '@vercel/blob';
import { uploadedPhotoPathname } from '@/lib/catalog/media';
import { emailPhotoJpeg } from '@/lib/catalog/email-photo';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pathname = uploadedPhotoPathname(request.url.replace(url.origin, ''));
  const emailPhoto = url.searchParams.get('email') === '1';
  if (!pathname) return new Response('Not found', { status: 404 });
  try {
    const result = await get(pathname, { access: 'private', ifNoneMatch: emailPhoto ? undefined : request.headers.get('if-none-match') ?? undefined });
    if (!result) return new Response('Not found', { status: 404 });
    if (emailPhoto) {
      if (result.statusCode !== 200) return new Response('Not found', { status: 404 });
      if (result.blob.size > 12_000_000) return new Response('Photo too large', { status: 413 });
      const original = Buffer.from(await new Response(result.stream).arrayBuffer());
      const jpeg = await emailPhotoJpeg(original);
      return new Response(new Uint8Array(jpeg), { headers: {
        'Content-Type': 'image/jpeg',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=31536000, immutable',
      } });
    }
    const headers = {
      'Content-Type': result.blob.contentType || 'image/webp',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=3600',
      ETag: result.blob.etag,
    };
    return result.statusCode === 304 ? new Response(null, { status: 304, headers }) : new Response(result.stream, { headers });
  } catch (error) {
    console.error('Catalog photo request failed', error);
    return new Response('Photo unavailable', { status: 502 });
  }
}
