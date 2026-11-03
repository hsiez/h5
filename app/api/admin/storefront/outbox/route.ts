import { db } from '@/lib/storefront/db';
import { deliverPendingEmail } from '@/lib/storefront/email';
import { processJobs } from '@/lib/storefront/worker';
import { failure, requireAdmin } from '@/lib/storefront/http';
export const maxDuration=300;
export async function GET(request:Request) {
  try {
    await requireAdmin(request);
    const counts=(await db().query(`SELECT count(*) FILTER(WHERE sent_at IS NULL AND canceled_at IS NULL AND failed_at IS NULL)::int AS queued,
      count(*) FILTER(WHERE failed_at IS NOT NULL AND sent_at IS NULL AND canceled_at IS NULL)::int AS failed,
      min(created_at) FILTER(WHERE sent_at IS NULL AND canceled_at IS NULL AND failed_at IS NULL) AS oldest FROM storefront_outbox`)).rows[0];
    const failures=await db().query(`SELECT id,'email' AS type,kind,attempts,last_error AS error FROM storefront_outbox WHERE failed_at IS NOT NULL AND sent_at IS NULL AND canceled_at IS NULL
      UNION ALL SELECT id,'job' AS type,kind,attempts,last_error AS error FROM storefront_jobs WHERE done_at IS NULL AND attempts>=8 LIMIT 50`);
    const jobs=(await db().query('SELECT count(*)::int AS queued FROM storefront_jobs WHERE done_at IS NULL')).rows[0];
    return Response.json({counts,jobs:jobs.queued,failures:failures.rows},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return failure(error);}
}
export async function POST(request:Request) {
  try {
    await requireAdmin(request);
    const body=await request.json();
    if(body.id){
      if(!/^[0-9a-f-]{36}$/i.test(body.id))return Response.json({error:'Invalid job'},{status:400});
      if(body.type==='email')await db().query(`UPDATE storefront_outbox SET failed_at=NULL,attempts=0,next_attempt_at=now(),last_error=NULL
        WHERE id=$1 AND failed_at IS NOT NULL AND sent_at IS NULL AND canceled_at IS NULL AND (locked_until IS NULL OR locked_until<now())`,[body.id]);
      else if(body.type==='job')await db().query(`UPDATE storefront_jobs SET attempts=0,next_attempt_at=now(),last_error=NULL
        WHERE id=$1 AND done_at IS NULL AND attempts>=8 AND (locked_until IS NULL OR locked_until<now())`,[body.id]);
      else return Response.json({error:'Invalid job type'},{status:400});
      return Response.json({ok:true});
    }
    await processJobs(5);
    return Response.json({delivered:await deliverPendingEmail(10)});
  }catch(error){return failure(error);}
}
