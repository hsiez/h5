import { db } from '@/lib/storefront/db';
import { failure } from '@/lib/storefront/http';

export async function GET() {
  try {
    const result = await db().query(`SELECT i.id,i.slug,i.title,i.description,i.size_label,i.condition_note,i.measurements,i.status,
      h.photo_blob_path,h.photo_alt_text FROM storefront_items i
      LEFT JOIN item_handoffs h ON h.item_id=i.id WHERE i.published_at IS NOT NULL AND i.adoption_enabled=true AND EXISTS (SELECT 1 FROM catalog_regions r WHERE r.id=i.region_id AND r.publication_status='published') ORDER BY i.published_at DESC`);
    return Response.json({items:result.rows});
  } catch(error) { return failure(error); }
}
