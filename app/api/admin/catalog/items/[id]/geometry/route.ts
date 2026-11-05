import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/admin/auth';
import { transaction } from '@/lib/storefront/db';
import { FlowError } from '@/lib/storefront/core';
import { failure } from '@/lib/storefront/http';
import type { ItemDraft, Photo } from '@/lib/catalog/types';
import { validateShareFields } from '@/lib/catalog/validation';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(request);
    const { id } = await context.params;
    const body = await request.json();
    if (!Array.isArray(body.photos) || body.photos.length > 60) throw new FlowError('Too many photos', 400);
    const photos: Photo[] = body.photos.map((photo: unknown) => validateShareFields({ photos: [photo] }).photos[0]);
    if (!Number.isInteger(body.revision) || photos.some(photo => !photo.bounds)) throw new FlowError('Invalid photo geometry', 400);
    const revision = await transaction(async client => {
      const result = await client.query<{ revision: number; draft_data: ItemDraft | null }>(
        'SELECT revision,draft_data FROM storefront_items WHERE id=$1 FOR UPDATE', [id]);
      const item = result.rows[0];
      if (!item) throw new FlowError('Item not found', 404);
      if (item.revision !== body.revision) throw new FlowError('This item changed. Reload before generating metadata.', 409);
      for (const photo of photos) {
        await client.query('UPDATE storefront_item_media SET visible_bounds=$3 WHERE item_id=$1 AND blob_path=$2', [id, photo.src, photo.bounds]);
      }
      const bounds = new Map(photos.map(photo => [photo.src, photo.bounds]));
      const draft = item.draft_data && {
        ...item.draft_data,
        photos: item.draft_data.photos.map((photo: Photo) => bounds.has(photo.src) ? { ...photo, bounds: bounds.get(photo.src) } : photo),
      };
      await client.query('UPDATE storefront_items SET draft_data=$2,revision=revision+1 WHERE id=$1', [id, draft]);
      return item.revision + 1;
    });
    revalidatePath('/things', 'layout');
    return Response.json({ revision });
  } catch (error) { return failure(error); }
}
