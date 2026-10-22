import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyCalSignature(raw:string, signature:string|null, secret:string|undefined) {
  const digest=signature?.replace(/^sha256=/,'');
  if (!secret || !digest || !/^[a-f0-9]{64}$/i.test(digest)) return false;
  const expected=createHmac('sha256',secret).update(raw).digest();
  return timingSafeEqual(Buffer.from(digest,'hex'),expected);
}
