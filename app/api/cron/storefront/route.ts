import { processJobs } from '@/lib/storefront/worker';
import { deliverPendingEmail } from '@/lib/storefront/email';
import { db } from '@/lib/storefront/db';
export const maxDuration=300;
export async function GET(request:Request) {
  if(!process.env.CRON_SECRET || request.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)
    return new Response('Unauthorized',{status:401});
  await db().query("UPDATE item_availability_alerts SET unsubscribed_at=now() WHERE verified_at IS NULL AND unsubscribed_at IS NULL AND verification_expires_at<now()");
  await processJobs(5);
  const delivered=await deliverPendingEmail(10);
  await db().query("DELETE FROM storefront_rate_limits WHERE expires_at<now()-interval '1 day'");
  return Response.json({delivered});
}
