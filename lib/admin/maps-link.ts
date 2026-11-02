export function mapsUrl(input: string) {
  const url = new URL(input.trim());
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !['maps.app.goo.gl', 'goo.gl', 'google.com', 'www.google.com', 'maps.google.com'].includes(url.hostname)) {
    throw new Error('Paste an HTTPS Google Maps link.');
  }
  return url;
}

export function parseMapsLink(input: string) {
  const url = mapsUrl(input);
  const text = decodeURIComponent(url.pathname + url.search);
  // Place coordinates are more precise than the camera center in /@ URLs.
  const pin = text.match(/!3d(-?[\d.]+)!4d(-?[\d.]+)/);
  const camera = text.match(/@(-?[\d.]+),(-?[\d.]+),(\d+(?:\.\d+)?)z/);
  const query = (url.searchParams.get('query') || url.searchParams.get('q') || url.searchParams.get('ll') || '').match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
  const coordinates = pin || query || camera;
  if (!coordinates) return null;
  const latitude = Number(coordinates[1]), longitude = Number(coordinates[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new Error('The link contains invalid coordinates.');
  const place = url.pathname.match(/\/place\/([^/]+)/)?.[1];
  return { latitude, longitude, zoom: Math.min(20, Math.max(1, Number(camera?.[3] || 14))), ...(place ? { name: decodeURIComponent(place.replace(/\+/g, ' ')) } : {}) };
}
