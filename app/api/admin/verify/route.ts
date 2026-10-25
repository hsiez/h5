import { requireSession } from '@/lib/admin/auth';
import { type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try { await requireSession(request); } catch { return Response.json({error:'Unauthorized'},{status:401}); }
  return Response.json({ ok: true });
}
