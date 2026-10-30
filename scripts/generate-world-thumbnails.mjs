import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { get } from '@vercel/blob';
import pg from 'pg';
import sharp from 'sharp';

const outputDir = new URL('../public/loadout/world-thumbnails/', import.meta.url);
const manifestFile = new URL('../app/loadout/world-thumbnails.json', import.meta.url);
const boundsFile = new URL('../app/loadout/world-photo-bounds.json', import.meta.url);
const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString || !process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error('DATABASE_URL and BLOB_READ_WRITE_TOKEN are required');
}

const client = new pg.Client({ connectionString });
await client.connect();
try {
  const result = await client.query(`
    SELECT DISTINCT m.blob_path AS photo_src, m.stipple_blob_path AS src
    FROM storefront_items i
    JOIN storefront_item_media m ON m.item_id = i.id
    JOIN catalog_regions r ON r.id = i.region_id
    WHERE i.publication_status = 'published'
      AND i.published_at IS NOT NULL
      AND r.publication_status = 'published'
      AND m.sort_order = 0
  `);
  await mkdir(outputDir, { recursive: true });
  const manifest = {};
  const bounds = {};
  const readBlob = async src => {
    const url = new URL(src, 'http://catalog.local');
    if (url.origin !== 'http://catalog.local' || url.pathname !== '/api/catalog/media') {
      throw new Error(`Unexpected image URL: ${src}`);
    }
    const pathname = url.searchParams.get('pathname');
    if (!pathname?.startsWith('catalog/')) throw new Error(`Unexpected Blob path: ${pathname}`);
    const blob = await get(pathname, { access: 'private' });
    if (!blob || blob.statusCode !== 200) throw new Error(`Could not read ${pathname}`);
    return Buffer.from(await new Response(blob.stream).arrayBuffer());
  };
  for (const { src, photo_src: photoSrc } of result.rows) {
    if (photoSrc) {
      const photo = await readBlob(photoSrc);
      const metadata = await sharp(photo).metadata();
      const factor = Math.min(1, 256 / Math.max(metadata.width, metadata.height));
      const width = Math.max(1, Math.round(metadata.width * factor));
      const height = Math.max(1, Math.round(metadata.height * factor));
      const pixels = await sharp(photo).ensureAlpha().resize(width, height, { fit: 'fill' }).raw().toBuffer();
      let left = width, top = height, right = -1, bottom = -1;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        if (pixels[(y * width + x) * 4 + 3] < 16) continue;
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
      if (right >= left) bounds[photoSrc] = {
        left: left / width * 100,
        top: top / height * 100,
        width: (right + 1 - left) / width * 100,
        height: (bottom + 1 - top) / height * 100,
      };
    }
    if (!src) continue;
    const original = await readBlob(src);
    const thumbnail = await sharp(original)
      .resize({ width: 600, withoutEnlargement: true, kernel: 'lanczos3' })
      .webp({ quality: 90, effort: 6 })
      .toBuffer();
    const name = `${createHash('sha256').update(src).digest('hex').slice(0, 16)}.webp`;
    await writeFile(join(outputDir.pathname, name), thumbnail);
    manifest[src] = `/loadout/world-thumbnails/${name}`;
    console.log(`${name}: ${original.length} -> ${thumbnail.length} bytes`);
  }
  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(boundsFile, `${JSON.stringify(bounds, null, 2)}\n`);
} finally {
  await client.end();
}
