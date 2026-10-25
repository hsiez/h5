// Copy legacy loadout assets into the configured private Blob store and update catalog rows.
// Once the manifest exists, reruns only repair database references.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import pg from 'pg';
import { put } from '@vercel/blob';

const root = new URL('../public/loadout/', import.meta.url);
const manifestUrl = new URL('../db/seeds/catalog-media.json', import.meta.url);
const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString || !process.env.BLOB_READ_WRITE_TOKEN) throw new Error('Database and Blob credentials are required');

let manifest;
try { manifest = JSON.parse(await readFile(manifestUrl, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }

if (!manifest) {
  manifest = {};
  const filenames = (await readdir(root)).sort();
  if (!filenames.length) throw new Error('No local loadout assets or media manifest were found');
  for (const filename of filenames) {
    if (!/^[a-z0-9-]+\.(?:png|jpe?g|webp)$/i.test(filename)) continue;
    const source = `/loadout/${filename}`;
    const extension = filename.split('.').at(-1).toLowerCase();
    const pathname = `catalog/${randomUUID()}.${extension}`;
    const contentType = extension === 'jpeg' || extension === 'jpg' ? 'image/jpeg' : `image/${extension}`;
    const blob = await put(pathname, await readFile(join(root.pathname, filename)), { access: 'private', addRandomSuffix: true, contentType });
    manifest[source] = `/api/catalog/media?pathname=${encodeURIComponent(blob.pathname)}`;
    console.log(`Copied ${filename}`);
  }
  await writeFile(manifestUrl, JSON.stringify(manifest, null, 2) + '\n');
}

function replaceReferences(value) {
  if (typeof value === 'string') return manifest[value] || value;
  if (Array.isArray(value)) return value.map(replaceReferences);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, replaceReferences(entry)]));
  return value;
}

const client = new pg.Client({ connectionString });
await client.connect();
try {
  await client.query('BEGIN');
  for (const [before, after] of Object.entries(manifest)) {
    await client.query('UPDATE storefront_item_media SET blob_path=$2 WHERE blob_path=$1', [before, after]);
  }
  const items = await client.query('SELECT id,review,draft_data FROM storefront_items');
  for (const item of items.rows) {
    const review = replaceReferences(item.review);
    const draft = replaceReferences(item.draft_data);
    if (JSON.stringify(review) !== JSON.stringify(item.review) || JSON.stringify(draft) !== JSON.stringify(item.draft_data)) {
      await client.query('UPDATE storefront_items SET review=$2,draft_data=$3 WHERE id=$1', [item.id, review, draft]);
    }
  }
  await client.query('COMMIT');
  console.log(`Catalog media references updated (${Object.keys(manifest).length} assets).`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally { await client.end(); }
