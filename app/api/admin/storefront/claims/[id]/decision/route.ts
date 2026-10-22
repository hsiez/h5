import { acceptFirstClaim, declineClaim } from '@/lib/storefront/admin-decisions';
import { failure, requireAdmin } from '@/lib/storefront/http';

export async function POST(request:Request, context:{params:Promise<{id:string}>}) {
  try {
    requireAdmin(request);
    const {id}=await context.params;
    const body=await request.json();
    if (body.decision==='accept') await acceptFirstClaim(id);
    else if (body.decision==='decline') await declineClaim(id,String(body.reason||''));
    else return Response.json({error:'Invalid decision'},{status:400});
    return Response.json({ok:true});
  } catch(error) { return failure(error); }
}
