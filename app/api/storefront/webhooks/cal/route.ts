import { applyCalEvent, FlowError } from '@/lib/storefront/core';
import { db } from '@/lib/storefront/db';
import { verifyCalSignature } from '@/lib/storefront/cal-signature';
import { failure } from '@/lib/storefront/http';

export async function POST(request: Request) {
  if(Number(request.headers.get('content-length')||0)>65536)return new Response('Payload too large',{status:413});
  const reader=request.body?.getReader();
  if(!reader)return new Response('Missing body',{status:400});
  const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536)return new Response('Payload too large',{status:413});chunks.push(value);}}finally{await reader.cancel();}
  const raw=Buffer.concat(chunks).toString('utf8');
  if (!verifyCalSignature(raw,request.headers.get('x-cal-signature-256'),process.env.CAL_WEBHOOK_SECRET))
    return Response.json({error:'Unauthorized'},{status:401});
  let event: Parameters<typeof applyCalEvent>[0] | undefined;
  try {
    event = JSON.parse(raw);
    const result = await applyCalEvent(event!);
    return Response.json(result);
  } catch(error) {
    if (event?.triggerEvent === 'BOOKING_REQUESTED' && error instanceof FlowError && error.status === 409 && typeof event.payload?.uid === 'string') {
      try {
        await db().query("INSERT INTO storefront_jobs(kind,uid,booking_status) VALUES('cal_cancel',$1,'booking_requested') ON CONFLICT DO NOTHING",[event.payload.uid]);
        return Response.json({rejected:true});
      } catch(declineError) { return failure(declineError); }
    }
    return failure(error);
  }
}
