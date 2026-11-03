import { after } from 'next/server';
import { deliverPendingEmail } from '@/lib/storefront/email';
import { admit } from '@/lib/storefront/admission';
import { startClaim } from '@/lib/storefront/core';
import { failure } from '@/lib/storefront/http';

export async function POST(request: Request, context: {params:Promise<{slug:string}>}) {
  try {
    const {slug} = await context.params;
    const email = await admit(request,slug,true);
    try { const claim=await startClaim(slug,email,true);
      after(async()=>{try{await deliverPendingEmail(1,{claimId:claim.claimId});}catch(error){console.error('Claim email deferred to worker',error);}}); } catch(error) {
      // Keep recipient history and eligibility private; abuse limits stay explicit.
      if (!(error instanceof Error && 'status' in error && [404,409].includes(Number(error.status)))) throw error;
    }
    return Response.json({ok:true});
  } catch(error) { return failure(error); }
}
