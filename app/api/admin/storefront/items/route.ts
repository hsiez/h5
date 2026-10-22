import { db } from '@/lib/storefront/db';
import { failure, requireAdmin } from '@/lib/storefront/http';

export async function GET(request:Request) {
  try {
    requireAdmin(request);
    const result = await db().query(`SELECT i.*, COALESCE(json_agg(json_build_object('id',c.id,'email',c.email,'status',c.status,
      'requestedAt',c.requested_at,'requestedStartAt',c.requested_start_at,'place',c.suggested_public_place,'bookingUid',c.cal_booking_uid)
      ORDER BY c.requested_at) FILTER (WHERE c.id IS NOT NULL),'[]') AS claims
      FROM storefront_items i LEFT JOIN claim_requests c ON c.item_id=i.id GROUP BY i.id ORDER BY i.created_at DESC`);
    return Response.json({items:result.rows});
  } catch(error) { return failure(error); }
}

export async function POST(request:Request) {
  try {
    requireAdmin(request);
    const body = await request.json();
    if (!body.slug || !body.title) return Response.json({error:'Slug and title required'},{status:400});
    const result = await db().query(`INSERT INTO storefront_items(slug,title,description,size_label,condition_note,measurements,status,published_at)
      VALUES($1,$2,$3,$4,$5,$6,'available',now()) RETURNING *`,
      [body.slug,body.title,body.description||'',body.sizeLabel||null,body.conditionNote||null,body.measurements||{}]);
    return Response.json({item:result.rows[0]},{status:201});
  } catch(error) { return failure(error); }
}
