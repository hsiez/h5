import { db } from '@/lib/storefront/db';
import { failure, requireAdmin } from '@/lib/storefront/http';

export async function GET(request:Request) {
  try {
    await requireAdmin(request);
    const result = await db().query(`SELECT i.*, (SELECT count(*)::int FROM item_availability_alerts a WHERE a.item_id=i.id AND a.unsubscribed_at IS NULL) AS "alertCount", COALESCE(json_agg(json_build_object('id',c.id,'email',c.email,'status',c.status,
      'requestedAt',c.requested_at,'requestedStartAt',c.requested_start_at,'place',c.suggested_public_place,'bookingUid',c.cal_booking_uid)
      ORDER BY c.requested_at) FILTER (WHERE c.id IS NOT NULL),'[]') AS claims
      FROM storefront_items i LEFT JOIN claim_requests c ON c.item_id=i.id WHERE i.adoption_enabled=true GROUP BY i.id ORDER BY i.created_at DESC`);
    return Response.json({items:result.rows});
  } catch(error) { return failure(error); }
}
