import { get } from '@vercel/blob';
import { uploadedPhotoPathname } from '@/lib/catalog/media';

export async function GET(request: Request) {
  const pathname = uploadedPhotoPathname(request.url.replace(new URL(request.url).origin, ''));
  if (!pathname) return new Response('Not found', { status: 404 });
  try {
    const result = await get(pathname, { access: 'private', ifNoneMatch: request.headers.get('if-none-match') ?? undefined });
    if (!result || (result.statusCode !== 200 && result.statusCode !== 304)) return new Response('Not found', { status: 404 });
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
