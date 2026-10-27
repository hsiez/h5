import { db, transaction } from "./db";
import { FlowError, newToken } from "./core";
import { claimEmail } from "./claim-email-template";
import { mediaPath, uploadedPhotoPathname } from "../catalog/media";

function baseUrl() {
  const { VERCEL_ENV, VERCEL_PROJECT_PRODUCTION_URL, VERCEL_BRANCH_URL, VERCEL_URL, STOREFRONT_BASE_URL } = process.env;
  const vercelHost = VERCEL_ENV === 'production'
    ? VERCEL_PROJECT_PRODUCTION_URL
    : VERCEL_ENV === 'preview' ? (VERCEL_BRANCH_URL || VERCEL_URL) : undefined;
  const value = STOREFRONT_BASE_URL || (vercelHost ? `https://${vercelHost}` : undefined);
  if (!value) throw new Error("Storefront URL is not configured; set STOREFRONT_BASE_URL locally or enable Vercel system environment variables");
  const url = new URL(value);
  if (!['http:','https:'].includes(url.protocol)) throw new Error("Invalid storefront URL");
  return url;
}

export async function deliverPendingEmail(limit = 20) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.STOREFRONT_FROM_EMAIL;
  if (!key || !from) throw new Error("Resend sender is not configured");
  const rows = await db().query<{id:string;kind:string;claim_request_id:string;alert_subscription_id:string|null;email:string;title:string;slug:string;status:string;item_status:string;photo_src:string|null}>(`
    SELECT o.id,o.kind,o.claim_request_id,o.alert_subscription_id,c.email,i.title,i.slug,c.status,i.status AS item_status,
      (SELECT m.blob_path FROM storefront_item_media m WHERE m.item_id=i.id ORDER BY m.sort_order,m.created_at LIMIT 1) AS photo_src
    FROM storefront_outbox o JOIN claim_requests c ON c.id=o.claim_request_id
    JOIN storefront_items i ON i.id=c.item_id
    WHERE o.sent_at IS NULL AND c.token_expires_at>now()
      AND (o.availability_version IS NULL OR o.availability_version=i.availability_version)
    ORDER BY o.created_at LIMIT $1`, [limit]);
  let delivered = 0;
  for (const row of rows.rows) {
    if (row.status !== 'link_sent' || row.item_status !== 'available') continue;
    const link = new URL(`/api/storefront/claim-link/${newToken(row.claim_request_id)}`,baseUrl()).toString();
    const unsubscribe=row.alert_subscription_id ? new URL(`/api/storefront/unsubscribe/${newToken(row.alert_subscription_id)}`,baseUrl()).toString() : null;
    const message = row.kind === 'availability_alert'
      ? availabilityAlertEmail(row.title, link, unsubscribe)
      : claimEmail({ title: row.title, imageUrl: absoluteEmailPhotoUrl(row.photo_src, baseUrl()), logoUrl: new URL('/brand/h5-email-logo.png', baseUrl()).toString(), schedulingUrl: link });
    const response = await fetch('https://api.resend.com/emails', {
      method:'POST', headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':row.id},
      body:JSON.stringify({from,to:row.email,...message})
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => null) as {message?:unknown} | null;
      const message = typeof detail?.message === 'string' ? detail.message.slice(0, 500) : 'No reason returned';
      console.error(`Resend rejected storefront email (HTTP ${response.status}): ${message}`);
      throw new FlowError('Email is unavailable right now. Please try again later.',503);
    }
    await transaction(async client => {
      await client.query('UPDATE storefront_outbox SET sent_at=now() WHERE id=$1 AND sent_at IS NULL',[row.id]);
      if (row.kind === 'availability_alert') await client.query(`UPDATE item_availability_alerts SET last_notified_version=o.availability_version
        FROM storefront_outbox o WHERE o.id=$1 AND item_availability_alerts.id=o.alert_subscription_id`,[row.id]);
    });
    delivered++;
  }
  return delivered;
}

function escapeHtml(value:string) { return value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!)); }

export function availabilityAlertEmail(title: string, link: string, unsubscribe: string | null) {
  const footer = unsubscribe ? `<p><a href="${escapeHtml(unsubscribe)}">Stop availability alerts for this item</a></p>` : '';
  return {
    subject: `${title} is available again`,
    html: `<p>${escapeHtml(title)} is back on the market.</p><p><a href="${escapeHtml(link)}">Choose a time and suggest a public place</a></p><p>The link expires in 48 hours. A booking request does not guarantee the item.</p>${footer}`,
    text: `${title} is back on the market.\n\nChoose a time and suggest a public place: ${link}\n\nThe link expires in 48 hours. A booking request does not guarantee the item.${unsubscribe ? `\n\nStop availability alerts for this item: ${unsubscribe}` : ''}`,
  };
}

export function absolutePhotoUrl(src: string | null, origin: URL) {
  if (!src) return null;
  if (src.startsWith('/') && !src.startsWith('//')) return new URL(src, origin).toString();
  try {
    return new URL(mediaPath(src), origin).toString();
  } catch {
    try {
      const url = new URL(src);
      return url.protocol === 'https:' && url.hostname.endsWith('.public.blob.vercel-storage.com') ? url.toString() : null;
    } catch { return null; }
  }
}

export function absoluteEmailPhotoUrl(src: string | null, origin: URL) {
  const resolved = absolutePhotoUrl(src, origin);
  if (!resolved) return null;
  const url = new URL(resolved);
  if (uploadedPhotoPathname(url.pathname + url.search)) url.searchParams.set('email', '1');
  return url.toString();
}
