import { requireSession } from '@/lib/admin/auth';
import { saveRegion } from '@/lib/catalog/repository';
import { failure } from '@/lib/storefront/http';
async function save(request:Request,create:boolean) { try { await requireSession(request);return Response.json(await saveRegion(await request.json(),create)); } catch(error) { return failure(error); } }
export const POST=(request:Request)=>save(request,true);
export const PATCH=(request:Request)=>save(request,false);
