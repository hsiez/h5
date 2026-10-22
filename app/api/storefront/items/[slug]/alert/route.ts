import { subscribeToAvailability } from '@/lib/storefront/core';
import { failure } from '@/lib/storefront/http';

export async function POST(request: Request, context: {params:Promise<{slug:string}>}) {
  try {
    const {slug} = await context.params;
    const body = await request.json();
    await subscribeToAvailability(slug,body.email);
    return Response.json({ok:true});
  } catch(error) { return failure(error); }
}
