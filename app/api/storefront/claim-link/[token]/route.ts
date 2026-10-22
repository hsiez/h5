import { resolveClaimLink } from '@/lib/storefront/core';

export async function GET(_request: Request, context: {params:Promise<{token:string}>}) {
  const {token} = await context.params;
  try { return Response.redirect(await resolveClaimLink(token),302); }
  catch { return new Response('This item is unavailable or this link has expired.',{status:410,headers:{'Content-Type':'text/plain; charset=utf-8'}}); }
}
