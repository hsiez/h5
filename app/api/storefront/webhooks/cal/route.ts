import { applyCalEvent, FlowError } from '@/lib/storefront/core';
import { declineCalBooking } from '@/lib/storefront/cal';
import { verifyCalSignature } from '@/lib/storefront/cal-signature';
import { deliverPendingEmail } from '@/lib/storefront/email';
import { failure } from '@/lib/storefront/http';

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyCalSignature(raw,request.headers.get('x-cal-signature-256'),process.env.CAL_WEBHOOK_SECRET))
    return Response.json({error:'Unauthorized'},{status:401});
  let event: Parameters<typeof applyCalEvent>[0] | undefined;
  try {
    event = JSON.parse(raw);
    const result = await applyCalEvent(event!);
    if (!result.ignored) {
      try { await deliverPendingEmail(); } catch(error) { console.error('Pending email delivery failed',error); }
    }
    return Response.json(result);
  } catch(error) {
    if (event?.triggerEvent === 'BOOKING_REQUESTED' && error instanceof FlowError && error.status === 409 && typeof event.payload?.uid === 'string') {
      try {
        await declineCalBooking(event.payload.uid,'This item is unavailable or the claim link is invalid.');
        return Response.json({rejected:true});
      } catch(declineError) { return failure(declineError); }
    }
    return failure(error);
  }
}
