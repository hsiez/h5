import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/admin/auth';
import { saveItem } from '@/lib/catalog/repository';
import { failure } from '@/lib/storefront/http';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(request);
    const { id } = await context.params;
    const { draft, revision, action } = await request.json();
    const result = await saveItem(id, draft, revision, action);
    if (action === 'publish' || action === 'archive') {
      revalidatePath('/things', 'layout');
    }
    return Response.json(result);
  } catch (error) {
    return failure(error);
  }
}
