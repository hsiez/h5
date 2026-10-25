import { requireSession } from '@/lib/admin/auth';
import { getCatalog, createItem } from '@/lib/catalog/repository';
import { failure } from '@/lib/storefront/http';
export async function GET(request:Request) { try { await requireSession(request); return Response.json(await getCatalog(true),{headers:{'Cache-Control':'no-store'}}); } catch(error) { return failure(error); } }
export async function POST(request:Request) { try { await requireSession(request); return Response.json(await createItem(await request.json()),{status:201}); } catch(error) { return failure(error); } }
