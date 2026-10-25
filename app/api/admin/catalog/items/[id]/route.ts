import { requireSession } from '@/lib/admin/auth';
import { saveItem } from '@/lib/catalog/repository';
import { failure } from '@/lib/storefront/http';
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}) {
 try { await requireSession(request); const {id}=await context.params; const {draft,revision,action}=await request.json(); return Response.json(await saveItem(id,draft,revision,action)); } catch(error) { return failure(error); }
}
