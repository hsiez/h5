import { FlowError } from './core';

export function failure(error: unknown) {
  if (error instanceof FlowError) return Response.json({error:error.message},{status:error.status});
  console.error('Storefront request failed',error);
  return Response.json({error:'An internal error occurred'},{status:500});
}

export function requireAdmin(request: Request) {
  const secret = process.env.STOREFRONT_ADMIN_SECRET || process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) throw new FlowError('Unauthorized',401);
}
