import { afterEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { GET } from '../app/api/catalog/media/route';
import { prepareEmailPhoto } from '../lib/storefront/email';

const { getBlob } = vi.hoisted(() => ({ getBlob: vi.fn() }));
vi.mock('@vercel/blob', () => ({ get: getBlob }));
const origin = new URL('https://h5.codes');
const path = 'catalog/0491b12e-1261-42a3-917d-915cb06d8f79-JwYdhSMzT7AN4pRh8kwl1GhTypAUBO.png';
const photoUrl = `${origin.origin}/api/catalog/media?pathname=${encodeURIComponent(path)}&email=1&v=2`;
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('email photo delivery', () => {
  it('serves a prepared JPEG with explicit edge caching', async () => {
    const input = await sharp({ create: { width: 100, height: 100, channels: 3, background: '#444' } }).png().toBuffer();
    getBlob.mockResolvedValue({ statusCode: 200, blob: { size: input.length }, stream: new Response(new Uint8Array(input)).body });
    const response = await GET(new Request(photoUrl));
    expect(response.status).toBe(200);
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe('public, max-age=31536000');
    expect(response.headers.get('Cache-Control')).toContain('immutable');
    expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    expect((await sharp(Buffer.from(await response.arrayBuffer())).metadata()).format).toBe('jpeg');
  });
  it('does not cache a missing or oversized photo as a successful image', async () => {
    getBlob.mockResolvedValue(null);
    const missing = await GET(new Request(photoUrl));
    expect(missing.status).toBe(404);
    expect(missing.headers.has('Vercel-CDN-Cache-Control')).toBe(false);
    getBlob.mockResolvedValue({ statusCode: 200, blob: { size: 12_000_001 } });
    const oversized = await GET(new Request(photoUrl));
    expect(oversized.status).toBe(413);
    expect(oversized.headers.has('Vercel-CDN-Cache-Control')).toBe(false);
  });
  it('rejects invalid paths before reading private storage', async () => {
    expect((await GET(new Request('https://h5.codes/api/catalog/media?pathname=../../secret&email=1'))).status).toBe(404);
    expect(getBlob).not.toHaveBeenCalled();
  });
});

describe('preparing an email photo before sending', () => {
  it('fully reads the exact image URL without forwarding credentials or following redirects', async () => {
    const fetchPhoto = vi.fn().mockResolvedValue(new Response('jpeg', { headers: { 'Content-Type': 'image/jpeg' } }));
    vi.stubGlobal('fetch', fetchPhoto);
    expect(await prepareEmailPhoto(photoUrl, origin)).toBe(true);
    expect(fetchPhoto).toHaveBeenCalledWith(new URL(photoUrl), { redirect: 'error', signal: expect.any(AbortSignal) });
  });
  it('skips external, non-image and invalid paths', async () => {
    const fetchPhoto = vi.fn(); vi.stubGlobal('fetch', fetchPhoto);
    for (const src of [null, photoUrl.replace('h5.codes', 'attacker.example'), 'https://h5.codes/api/admin/session', photoUrl.replace('email=1', 'email=0')]) {
      expect(await prepareEmailPhoto(src, origin)).toBe(false);
    }
    expect(fetchPhoto).not.toHaveBeenCalled();
  });
  it('treats timeouts and failed responses as optional so mail delivery can continue', async () => {
    const fetchPhoto = vi.fn().mockRejectedValueOnce(new DOMException('Timed out', 'TimeoutError'))
      .mockResolvedValueOnce(new Response('unavailable', { status: 502 }))
      .mockResolvedValueOnce(Response.json({ error: 'not an image' }));
    vi.stubGlobal('fetch', fetchPhoto);
    for (let i = 0; i < 3; i++) expect(await prepareEmailPhoto(photoUrl, origin)).toBe(false);
  });
});
