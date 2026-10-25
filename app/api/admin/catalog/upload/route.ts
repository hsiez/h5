import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { requireSession } from '@/lib/admin/auth';
import { FlowError } from '@/lib/storefront/core';
import { failure } from '@/lib/storefront/http';
export async function POST(request: Request) {
  try {
    const body = await request.json() as HandleUploadBody;
    if (body.type === 'blob.generate-client-token') await requireSession(request);
    else if (body.type !== 'blob.upload-completed') throw new FlowError('Invalid upload request', 400);

    const response = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async pathname => {
        if (!/^(catalog|storefront\/handoffs)\/[a-f0-9-]{36}\.webp$/.test(pathname)) {
          throw new FlowError('Invalid photo path', 400);
        }
        return {
          allowedContentTypes: ['image/webp'],
          maximumSizeInBytes: 8_000_000,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(response);
  } catch (error) { return failure(error); }
}
