import { readFile } from 'node:fs/promises';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not configured');
const client = new pg.Client({connectionString});
await client.connect();
try {
  await client.query('BEGIN');
  for (const migration of ['001_storefront.sql','002_shared_cal_event.sql']) {
    await client.query(await readFile(new URL(`../db/migrations/${migration}`,import.meta.url),'utf8'));
  }
  await client.query('COMMIT');
  console.log('Storefront schema ready');
} catch(error) {
  await client.query('ROLLBACK');
  throw error;
} finally { await client.end(); }
