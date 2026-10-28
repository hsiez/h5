import { cancelUnscheduledClaim, claimCancellationDetails, FlowError } from '@/lib/storefront/core';

const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
const shell = (body: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Cancel request</title></head><body style="font:16px/1.5 Arial,Helvetica,sans-serif;color:#222;max-width:32rem;margin:4rem auto;padding:0 1rem">${body}</body></html>`;
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  try {
    const claim = await claimCancellationDetails(token);
    const body = claim.status === 'link_sent'
      ? `<h1>Cancel your request?</h1><p>This will cancel your email link for ${escapeHtml(claim.title)}. No meeting has been scheduled yet.</p><form method="post"><button style="padding:.7rem 1rem;font:inherit">Cancel request</button></form>`
      : `<h1>Request cannot be canceled here</h1><p>${['booking_requested', 'accepted'].includes(claim.status) ? 'A meeting has already been scheduled. Please use your Cal.com confirmation to cancel it.' : 'This request is no longer active.'}</p>`;
    return new Response(shell(body), { headers });
  } catch (error) {
    const invalid = error instanceof FlowError && error.status === 404;
    return new Response(shell(invalid ? '<h1>Link unavailable</h1><p>This cancellation link is invalid.</p>' : '<h1>Could not load request</h1><p>Please try again later.</p>'), { status: invalid ? 404 : 500, headers });
  }
}

export async function POST(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  try {
    const canceled = await cancelUnscheduledClaim(token);
    return new Response(shell(canceled ? '<h1>Request canceled</h1><p>Your scheduling link for this item no longer works.</p>' : '<h1>Request cannot be canceled here</h1><p>If you scheduled a meeting, use your Cal.com confirmation to cancel it.</p>'), { status: canceled ? 200 : 409, headers });
  } catch (error) {
    const invalid = error instanceof FlowError && error.status === 404;
    return new Response(shell(invalid ? '<h1>Link unavailable</h1><p>This cancellation link is invalid.</p>' : '<h1>Could not cancel request</h1><p>Please try again later.</p>'), { status: invalid ? 404 : 500, headers });
  }
}
