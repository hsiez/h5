import { randomUUID } from 'node:crypto';
import { db, transaction } from './db';
import { reconcileCalBooking } from './cal';

// Each lease survives a function crash. Fan-out transactions contain at most 20 recipients.
export async function processJobs(limit = 5) {
  for (let n = 0; n < limit; n++) {
    const lease = randomUUID();
    const job = await transaction(async client => {
      const result = await client.query(`SELECT * FROM storefront_jobs
        WHERE done_at IS NULL AND attempts<8 AND next_attempt_at<=now()
        AND (locked_until IS NULL OR locked_until<now())
        ORDER BY next_attempt_at,id LIMIT 1 FOR UPDATE SKIP LOCKED`);
      if (!result.rows[0]) return null;
      await client.query(`UPDATE storefront_jobs SET lease_id=$2,
        locked_until=now()+interval '5 minutes',attempts=attempts+1 WHERE id=$1`, [result.rows[0].id, lease]);
      return result.rows[0];
    });
    if (!job) break;
    try {
      if (job.kind === 'fanout') {
        await transaction(async client => {
          const item = (await client.query('SELECT * FROM storefront_items WHERE id=$1 FOR UPDATE', [job.item_id])).rows[0];
          const owned = await client.query('SELECT 1 FROM storefront_jobs WHERE id=$1 AND lease_id=$2 FOR UPDATE', [job.id, lease]);
          if (!owned.rowCount) return;
          if (item?.status !== 'available' || item.availability_version !== job.version || item.publication_status!=='published' || !item.adoption_enabled) {
            await client.query('UPDATE storefront_jobs SET done_at=now(),locked_until=NULL WHERE id=$1', [job.id]);
            return;
          }
          const subscribers = await client.query(`SELECT a.* FROM item_availability_alerts a
            WHERE item_id=$1 AND verified_at IS NOT NULL AND unsubscribed_at IS NULL AND fulfilled_at IS NULL
            AND NOT EXISTS(SELECT 1 FROM storefront_outbox o WHERE o.alert_subscription_id=a.id AND o.availability_version=$2)
            ORDER BY a.created_at,a.id LIMIT 20 FOR UPDATE SKIP LOCKED`, [job.item_id, job.version]);
          for (const sub of subscribers.rows) {
            // Issue the personal claim just before delivery, not hours ahead in a backlog.
            await client.query(`INSERT INTO storefront_outbox(kind,alert_subscription_id,availability_version)
              VALUES('availability_alert',$1,$2) ON CONFLICT DO NOTHING`, [sub.id, job.version]);
          }
          await client.query(`UPDATE storefront_jobs SET done_at=CASE WHEN $3<20 THEN now() ELSE NULL END,
            locked_until=NULL,lease_id=NULL,attempts=0 WHERE id=$1 AND lease_id=$2`, [job.id, lease, subscribers.rowCount]);
        });
      } else {
        await reconcileCalBooking(job.uid);
        await db().query('UPDATE storefront_jobs SET done_at=now(),locked_until=NULL,last_error=NULL WHERE id=$1 AND lease_id=$2', [job.id, lease]);
      }
    } catch (error) {
      await db().query(`UPDATE storefront_jobs SET locked_until=NULL,lease_id=NULL,last_error=$3,
        next_attempt_at=now()+interval '10 minutes' WHERE id=$1 AND lease_id=$2`, [job.id, lease, error instanceof Error ? error.message : 'Job failed']);
    }
  }
}
