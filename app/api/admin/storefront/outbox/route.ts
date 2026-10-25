import { deliverPendingEmail } from '@/lib/storefront/email';
import { failure, requireAdmin } from '@/lib/storefront/http';

export async function POST(request:Request) {
  try { await requireAdmin(request); return Response.json({delivered:await deliverPendingEmail(100)}); }
  catch(error) { return failure(error); }
}
