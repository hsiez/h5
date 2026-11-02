import { requireSession } from '@/lib/admin/auth';
import { mapsUrl, parseMapsLink } from '@/lib/admin/maps-link';
import { failure } from '@/lib/storefront/http';

export async function POST(request: Request) {
  try {
    await requireSession(request);
    const body = await request.json();
    if (typeof body.url !== 'string' || body.url.length > 8192) return Response.json({ error: 'Paste a Google Maps link.' }, { status: 400 });
    try {
      let url = mapsUrl(body.url);
      for (let redirects = 0; redirects < 5; redirects++) {
        const place = parseMapsLink(url.href);
        if (place) return Response.json(place, { headers: { 'Cache-Control': 'no-store' } });
        // Expand share links only. Validate every destination before fetching it.
        if (!['maps.app.goo.gl', 'goo.gl'].includes(url.hostname)) break;
        const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(5000), cache: 'no-store' });
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (response.status < 300 || response.status >= 400 || !location) break;
        url = mapsUrl(new URL(location, url).href);
      }
      return Response.json({ error: 'No coordinates found. Open the place in Google Maps and paste the full address-bar URL, or enter coordinates below.' }, { status: 400 });
    } catch {
      return Response.json({ error: 'Could not read that Maps link. Try the full Google Maps address-bar URL.' }, { status: 400 });
    }
  } catch (error) { return failure(error); }
}
