import { readFile } from 'node:fs/promises';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not configured');
const client = new pg.Client({connectionString});
await client.connect();
try {
  await client.query('BEGIN');
  for (const migration of ['001_storefront.sql','002_shared_cal_event.sql','003_catalog_admin.sql']) {
    await client.query(await readFile(new URL(`../db/migrations/${migration}`,import.meta.url),'utf8'));
  }
  const seed=JSON.parse(await readFile(new URL('../db/seeds/catalog.json',import.meta.url),'utf8'));
  for (const item of seed) {
    const result=await client.query(`INSERT INTO storefront_items(slug,title,region_id,review,legacy_key,sort_order,status,publication_status,published_at)
      VALUES($1,$2,$3,$4,$5,$6,'available','published',now()) ON CONFLICT(slug) DO NOTHING RETURNING id`,
      [item.slug,item.title,item.regionId,item.review,item.legacyKey,item.sortOrder]);
    if(result.rows[0]) for (const [order,photo] of item.photos.entries()) await client.query(
      'INSERT INTO storefront_item_media(item_id,blob_path,alt_text,sort_order) VALUES($1,$2,$3,$4)',[result.rows[0].id,photo.src,photo.alt,order]);
  }
  await client.query('COMMIT');
  console.log('Catalog and storefront schema ready');
} catch(error) {
  await client.query('ROLLBACK');
  throw error;
} finally { await client.end(); }
