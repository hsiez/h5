import { Pool, type PoolClient } from "pg";

let pool: Pool | undefined;

export function db() {
  if (!pool) {
    let connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not configured");
    const url=new URL(connectionString);
    if(['require','prefer','verify-ca'].includes(url.searchParams.get('sslmode')||'') && url.searchParams.get('uselibpqcompat')!=='true') {
      url.searchParams.set('sslmode','verify-full');
      connectionString=url.href;
    }
    pool = new Pool({ connectionString, max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, statement_timeout: 15000, lock_timeout: 5000 });
  }
  return pool;
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
