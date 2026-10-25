// Copy legacy loadout assets into the configured private Blob store and update catalog rows.
// Verify assets in the target store before repairing database references.
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { head, put, BlobNotFoundError } from '@vercel/blob';
import { populateCatalogMedia } from './catalog-media-populate.mjs';

const root = new URL('../db/assets/catalog/', import.meta.url);
const manifestUrl = new URL('../db/seeds/catalog-media.json', import.meta.url);
const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString || !process.env.BLOB_READ_WRITE_TOKEN) throw new Error('Database and Blob credentials are required');

const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
await populateCatalogMedia(manifest, {
  head,
  put,
  readSource: filename => readFile(new URL(filename, root)),
  isNotFound: error => error instanceof BlobNotFoundError,
});

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
