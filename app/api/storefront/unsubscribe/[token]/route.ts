import { unsubscribeAvailability } from '@/lib/storefront/core';

export async function GET(_request:Request, context:{params:Promise<{token:string}>}) {
  const {token}=await context.params;
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return new Response('Invalid link',{status:404});
  return new Response(`<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font:16px system-ui;max-width:32rem;margin:4rem auto;padding:1rem"><h1>Stop availability alerts?</h1><p>You will no longer receive alerts for this item.</p><form method="post"><button style="padding:.7rem 1rem">Unsubscribe</button></form></body></html>`,
    {headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}

export async function POST(_request:Request, context:{params:Promise<{token:string}>}) {
  const {token}=await context.params;
  try { await unsubscribeAvailability(token); return new Response('You are unsubscribed from availability alerts for this item.'); }
  catch { return new Response('This link is invalid.',{status:400}); }
}
