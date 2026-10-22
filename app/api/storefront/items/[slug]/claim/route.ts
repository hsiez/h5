import { startClaim } from '@/lib/storefront/core';
import { deliverPendingEmail } from '@/lib/storefront/email';
import { failure } from '@/lib/storefront/http';

export async function POST(request: Request, context: {params:Promise<{slug:string}>}) {
  try {
    const {slug} = await context.params;
    const body = await request.json();
    await startClaim(slug,body.email);
    await deliverPendingEmail();
    return Response.json({ok:true});
  } catch(error) { return failure(error); }
}
