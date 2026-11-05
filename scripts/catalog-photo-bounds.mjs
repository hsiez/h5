import pg from 'pg';
import sharp from 'sharp';
import { get } from '@vercel/blob';
import { alphaBounds } from '../lib/catalog/photo-bounds.ts';

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const client = new pg.Client({ connectionString });
const measured = new Map();
async function boundsFor(src) {
  if (measured.has(src)) return measured.get(src);
  const url = new URL(src, 'https://h5.codes');
  let input;
  if (url.pathname === '/api/catalog/media') {
    const pathname = url.searchParams.get('pathname');
    if (!pathname?.startsWith('catalog/')) throw new Error('Unexpected photo path');
    const result = await get(pathname, { access: 'private' });
    if (!result || result.statusCode !== 200 || result.blob.size > 12_000_000) throw new Error('Could not read photo');
    input = Buffer.from(await new Response(result.stream).arrayBuffer());
  } else {
    if (url.origin !== 'https://h5.codes' && !url.hostname.endsWith('.public.blob.vercel-storage.com')) throw new Error('Unexpected photo host');
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error('Could not download photo');
    input = Buffer.from(await response.arrayBuffer());
  }
  const { data, info } = await sharp(input, { limitInputPixels: 40_000_000 })
    .resize({ width: 256, height: 256, fit: 'inside', withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bounds = alphaBounds(data, info.width, info.height);
  if (!bounds) throw new Error('Photo is fully transparent');
  measured.set(src, bounds);
  return bounds;
}
await client.connect();
try {
  const media = await client.query('SELECT item_id,blob_path FROM storefront_item_media WHERE visible_bounds IS NULL');
  for (const photo of media.rows) {
    const bounds = await boundsFor(photo.blob_path);
    await client.query('UPDATE storefront_item_media SET visible_bounds=$3 WHERE item_id=$1 AND blob_path=$2 AND visible_bounds IS NULL',
      [photo.item_id, photo.blob_path, bounds]);
  }
  const drafts = await client.query("SELECT id,draft_data FROM storefront_items WHERE draft_data IS NOT NULL");
  for (const item of drafts.rows) {
    if (!(item.draft_data.photos || []).some(photo => !photo.bounds)) continue;
    const draft = structuredClone(item.draft_data);
    for (const photo of draft.photos || []) if (!photo.bounds) photo.bounds = await boundsFor(photo.src);
    // Leave concurrently edited drafts to the next run.
    await client.query('UPDATE storefront_items SET draft_data=$3,revision=revision+1 WHERE id=$1 AND draft_data=$2',
      [item.id, item.draft_data, draft]);
  }
  console.log('Photo geometry backfill complete');
} finally { await client.end(); }
