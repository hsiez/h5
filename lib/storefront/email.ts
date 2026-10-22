import { db, transaction } from "./db";
import { FlowError, newToken } from "./core";

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
  const rows = await db().query<{id:string;kind:string;claim_request_id:string;alert_subscription_id:string|null;email:string;title:string;slug:string;status:string;item_status:string}>(`
    SELECT o.id,o.kind,o.claim_request_id,o.alert_subscription_id,c.email,i.title,i.slug,c.status,i.status AS item_status
    FROM storefront_outbox o JOIN claim_requests c ON c.id=o.claim_request_id
    JOIN storefront_items i ON i.id=c.item_id
    WHERE o.sent_at IS NULL AND c.token_expires_at>now()
      AND (o.availability_version IS NULL OR o.availability_version=i.availability_version)
    ORDER BY o.created_at LIMIT $1`, [limit]);
  let delivered = 0;
  for (const row of rows.rows) {
    if (row.status !== 'link_sent' || row.item_status !== 'available') continue;
    const link = new URL(`/api/storefront/claim-link/${newToken(row.claim_request_id)}`,baseUrl()).toString();
    const subject = row.kind === 'availability_alert' ? `${row.title} is available again` : `Request ${row.title}`;
    const lead = row.kind === 'availability_alert' ? `${row.title} is back on the market.` : `You asked about ${row.title}.`;
    const unsubscribe=row.alert_subscription_id ? new URL(`/api/storefront/unsubscribe/${newToken(row.alert_subscription_id)}`,baseUrl()).toString() : null;
    const footer=unsubscribe ? `<p><a href="${escapeHtml(unsubscribe)}">Stop availability alerts for this item</a></p>` : '';
    const response = await fetch('https://api.resend.com/emails', {
      method:'POST', headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':row.id},
      body:JSON.stringify({from,to:row.email,subject,html:`<p>${escapeHtml(lead)}</p><p><a href="${escapeHtml(link)}">Choose a time and suggest a public place</a></p><p>The link expires in 48 hours. A booking request does not guarantee the item.</p>${footer}`})
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
