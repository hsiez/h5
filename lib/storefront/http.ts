import { requireSession } from '@/lib/admin/auth';
import { FlowError } from './core';

export function failure(error: unknown) {
  if (error instanceof FlowError) return Response.json({error:error.message},{status:error.status});
  if (error && typeof error === 'object' && 'code' in error && ['42P01', '42703'].includes(String(error.code))) {
    console.error('Storefront database schema is incomplete', error);
    return Response.json({error:'Database setup is incomplete. Run the catalog migration before using the admin panel.'},{status:503});
  }
  if (error && typeof error === 'object' && 'code' in error && error.code === '23505') return Response.json({error:'That URL or photo is already in use'},{status:409});
  console.error('Storefront request failed',error);
  return Response.json({error:'An internal error occurred'},{status:500});
}

export const requireAdmin = requireSession;
