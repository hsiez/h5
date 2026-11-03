import { reopenItem } from '@/lib/storefront/core';
import { failure, requireAdmin } from '@/lib/storefront/http';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    await requireAdmin(request);
    const {id}=await params;
    if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:'Invalid item'},{status:400});
    await reopenItem(id);
    return Response.json({ok:true});
  } catch(error){return failure(error);}
}
