import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { db } from '@/lib/storefront/db';
import { FlowError } from '@/lib/storefront/core';
const derive = promisify(scrypt);
export const SESSION_COOKIE = 'h5_admin';
export const SESSION_SECONDS = 12 * 60 * 60;
export const digest = (value:string) => createHash('sha256').update(value).digest('hex');
export async function verifyPassword(password:string, encoded:string) {
  const [scheme,salt,key]=encoded.split(':');
  if (scheme!=='scrypt' || !/^[a-f0-9]{32}$/.test(salt||'') || !/^[a-f0-9]{128}$/.test(key||'')) return false;
  const actual=await derive(password,salt,64) as Buffer;
  return timingSafeEqual(actual,Buffer.from(key,'hex'));
}
export function checkOrigin(request:Request) {
  if (request.headers.get('origin')!==new URL(request.url).origin) throw new FlowError('Request origin is not allowed',403);
}
export async function validSession(token:string|undefined) {
  if (!token || !/^[a-f0-9]{64}$/.test(token) || !process.env.ADMIN_PASSWORD_HASH) return false;
  const result=await db().query('SELECT 1 FROM admin_sessions WHERE token_hash=$1 AND expires_at>now() AND password_version=$2',[digest(token),digest(process.env.ADMIN_PASSWORD_HASH)]);
  return result.rowCount===1;
}
export function sessionToken(request:Request) {
  return request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length+1);
}
export async function requireSession(request:Request) {
  if (!['GET','HEAD'].includes(request.method)) checkOrigin(request);
  if (!await validSession(sessionToken(request))) throw new FlowError('Please sign in again',401);
}
export async function login(request:Request,password:string) {
  checkOrigin(request);
  const encoded=process.env.ADMIN_PASSWORD_HASH;
  if (!encoded) throw new FlowError('Admin password has not been configured',503);
  if (typeof password!=='string' || password.length>1024) throw new FlowError('Invalid password',401);
  const key=digest(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local');
  const result=await db().query<{attempts:number}>(`INSERT INTO admin_login_attempts(key,attempts,window_start) VALUES($1,1,now())
    ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN admin_login_attempts.window_start<now()-interval '15 minutes' THEN 1 ELSE admin_login_attempts.attempts+1 END,
    window_start=CASE WHEN admin_login_attempts.window_start<now()-interval '15 minutes' THEN now() ELSE admin_login_attempts.window_start END RETURNING attempts`,[key]);
  if (result.rows[0].attempts>8) throw new FlowError('Too many attempts. Try again in 15 minutes.',429);
  if (!await verifyPassword(password,encoded)) throw new FlowError('Invalid password',401);
  const token=randomBytes(32).toString('hex');
  await db().query("DELETE FROM admin_sessions WHERE expires_at<now()");
  await db().query("DELETE FROM admin_login_attempts WHERE window_start<now()-interval '1 day' OR key=$1",[key]);
  await db().query("INSERT INTO admin_sessions(token_hash,password_version,expires_at) VALUES($1,$2,now()+interval '12 hours')",[digest(token),digest(encoded)]);
  return token;
}
