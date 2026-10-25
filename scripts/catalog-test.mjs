// Runs integration tests in a fresh isolated schema, never in the live catalog.
import pg from 'pg';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
const source=process.env.TEST_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if(!source) throw new Error('Set TEST_DATABASE_URL or DATABASE_URL');
const schema=`catalog_test_${randomBytes(8).toString('hex')}`;
const client=new pg.Client({connectionString:source});
await client.connect();
const scoped=new URL(source);
if(scoped.hostname.endsWith(".neon.tech")) scoped.hostname=scoped.hostname.replace("-pooler.",".");scoped.searchParams.set('options',`-c search_path=${schema}`);
const env={...process.env,DATABASE_URL:scoped.toString(),DATABASE_URL_UNPOOLED:scoped.toString(),TEST_DATABASE_URL:scoped.toString()};
function run(command,args){return new Promise((resolve,reject)=>{const child=spawn(command,args,{env,stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`Test command exited ${code}`)));});}
try {
 await client.query(`CREATE SCHEMA ${schema}`);
 await run(process.execPath,['scripts/storefront-migrate.mjs']);
 await run('npx',['vitest','run','--config','vitest.catalog.config.ts']);
} finally {await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await client.end();}
