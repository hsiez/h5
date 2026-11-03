// Creates and drops an isolated schema. All external delivery is mocked in tests.
import pg from 'pg';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
const source=process.env.TEST_DATABASE_URL||process.env.DATABASE_URL_UNPOOLED||process.env.DATABASE_URL;
if(!source)throw Error('Configure a database URL');
const schema=`security_audit_${randomBytes(8).toString('hex')}`;
const client=new pg.Client({connectionString:source});
const url=new URL(source);
if(url.hostname.endsWith('.neon.tech'))url.hostname=url.hostname.replace('-pooler.','.');
url.searchParams.set('options',`-c search_path=${schema}`);
url.searchParams.set('application_name','storefront-security-audit');
const env={...process.env,DATABASE_URL:url.href,DATABASE_URL_UNPOOLED:url.href,TEST_DATABASE_URL:url.href,RESEND_API_KEY:'audit-not-a-real-key',CAL_API_KEY:'audit-not-a-real-key',CAL_WEBHOOK_SECRET:'audit-webhook-secret',STOREFRONT_LINK_SECRET:'audit-link-secret',STOREFRONT_FROM_EMAIL:'audit@example.invalid',STOREFRONT_BASE_URL:'https://audit.example.invalid',STOREFRONT_CAL_EVENT_TYPE_ID:'12345',STOREFRONT_CAL_BOOKING_URL:'https://cal.com/audit/test'};
const run=(args)=>new Promise((resolve,reject)=>{const child=spawn(args[0],args.slice(1),{env,stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(`Audit exited ${code}`)));});
try{await client.connect();await client.query(`CREATE SCHEMA ${schema}`);await run([process.execPath,'scripts/storefront-migrate.mjs']);await run(['npx','vitest','run','--config','vitest.security.config.ts']);}
finally{await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await client.end();}
