import { randomUUID } from 'node:crypto';
import { budget } from './admission';
import { db, transaction } from "./db";
import { FlowError, newToken, tokenHash } from "./core";
import { claimEmail } from "./claim-email-template";
import { notificationConfirmationEmail } from "./notification-email-template";
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

export async function deliverPendingEmail(limit = 20, target?:{claimId?:string;subscriptionId?:string}) {
  const key=process.env.RESEND_API_KEY,from=process.env.STOREFRONT_FROM_EMAIL;
  if(!key||!from)throw new Error('Resend sender is not configured');
  // Cancel obsolete jobs BEFORE taking a bounded batch, avoiding queue starvation.
  await db().query(`UPDATE storefront_outbox o SET canceled_at=now() WHERE sent_at IS NULL AND canceled_at IS NULL AND (
    (claim_request_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM claim_requests c JOIN storefront_items i ON i.id=c.item_id JOIN catalog_regions r ON r.id=i.region_id WHERE c.id=o.claim_request_id AND c.status='link_sent' AND c.token_expires_at>now() AND i.status='available' AND i.publication_status='published' AND i.published_at IS NOT NULL AND r.publication_status='published' AND (o.availability_version IS NULL OR o.availability_version=i.availability_version))) OR
    (alert_subscription_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM item_availability_alerts a WHERE a.id=o.alert_subscription_id AND a.unsubscribed_at IS NULL AND a.fulfilled_at IS NULL AND ((o.kind='verify_alert' AND a.verified_at IS NULL AND a.verification_expires_at>now()) OR (o.kind='availability_alert' AND a.verified_at IS NOT NULL)))))`);
  let delivered=0;
  const preparedPhotos=new Set<string>();
  for(let n=0;n<limit;n++) {
    const lease=randomUUID();
    const row=await transaction(async client=>{
      const result=await client.query(`SELECT o.*,COALESCE(c.email,a.email) AS email,i.title,i.slug,
        (SELECT blob_path FROM storefront_item_media WHERE item_id=i.id ORDER BY sort_order,created_at LIMIT 1) AS photo_src
        FROM storefront_outbox o LEFT JOIN claim_requests c ON c.id=o.claim_request_id LEFT JOIN item_availability_alerts a ON a.id=o.alert_subscription_id
        JOIN storefront_items i ON i.id=COALESCE(c.item_id,a.item_id)
        WHERE o.sent_at IS NULL AND o.canceled_at IS NULL AND o.failed_at IS NULL AND o.next_attempt_at<=now() AND (o.locked_until IS NULL OR o.locked_until<now()) AND ($1::uuid IS NULL OR o.claim_request_id=$1) AND ($2::uuid IS NULL OR o.alert_subscription_id=$2) ORDER BY o.created_at,o.id LIMIT 1 FOR UPDATE OF o SKIP LOCKED`,[target?.claimId||null,target?.subscriptionId||null]);
      if(!result.rows[0])return null;
      const candidate=result.rows[0];
      if(candidate.kind==='availability_alert') {
        // Separate availability events must not send to one subscriber concurrently.
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`delivery:${candidate.alert_subscription_id}`]);
        const other=await client.query('SELECT 1 FROM storefront_outbox WHERE alert_subscription_id=$1 AND id<>$2 AND locked_until>now() LIMIT 1',[candidate.alert_subscription_id,candidate.id]);
        if(other.rowCount){
          await client.query("UPDATE storefront_outbox SET next_attempt_at=now()+interval '1 minute' WHERE id=$1",[candidate.id]);
          return {skipped:true};
        }
      }
      await client.query("UPDATE storefront_outbox SET lease_id=$2,locked_until=now()+interval '5 minutes',attempts=attempts+1 WHERE id=$1",[result.rows[0].id,lease]);return result.rows[0];
    });
    if(!row)break;
    if(row.skipped)continue;
    try {
      await budget([{key:'mail:global',limit:300,seconds:3600}]);
      // Recheck unsubscribe after leasing; never hold a DB lock during network I/O.
      if(row.alert_subscription_id){const sub=await db().query('SELECT * FROM item_availability_alerts WHERE id=$1',[row.alert_subscription_id]);if(!sub.rows[0]||sub.rows[0].unsubscribed_at||sub.rows[0].fulfilled_at){await db().query('UPDATE storefront_outbox SET canceled_at=now() WHERE id=$1',[row.id]);continue;}}
      if(row.kind==='availability_alert' && !row.claim_request_id) {
        const claimId=await transaction(async client=>{
          const item=(await client.query('SELECT * FROM storefront_items WHERE id=(SELECT item_id FROM item_availability_alerts WHERE id=$1) FOR UPDATE',[row.alert_subscription_id])).rows[0];
          const sub=(await client.query('SELECT * FROM item_availability_alerts WHERE id=$1 FOR UPDATE',[row.alert_subscription_id])).rows[0];
          if(!sub || sub.unsubscribed_at || sub.fulfilled_at || !sub.verified_at || item?.status!=='available' || item.availability_version!==row.availability_version) {
            await client.query('UPDATE storefront_outbox SET canceled_at=now(),locked_until=NULL WHERE id=$1 AND lease_id=$2',[row.id,lease]);return null;
          }
          const eventType=Number(process.env.STOREFRONT_CAL_EVENT_TYPE_ID);
          if(!Number.isSafeInteger(eventType)||eventType<=0)throw Error('Cal event type is not configured');
          const existing=await client.query("SELECT id FROM claim_requests WHERE item_id=$1 AND email=$2 AND status='link_sent' AND token_expires_at>now() ORDER BY created_at DESC LIMIT 1",[item.id,sub.email]);
          const id=existing.rows[0]?.id||randomUUID();
          if(!existing.rowCount)await client.query("INSERT INTO claim_requests(id,item_id,email,token_hash,token_expires_at,cal_event_type_id) VALUES($1,$2,$3,$4,now()+interval '1 hour',$5)",[id,item.id,sub.email,tokenHash(newToken(id)),eventType]);
          await client.query('UPDATE storefront_outbox SET claim_request_id=$3 WHERE id=$1 AND lease_id=$2',[row.id,lease,id]);return id;
        });
        if(!claimId)continue;
        row.claim_request_id=claimId;
      }
      const link=new URL(`/api/storefront/claim-link/${newToken(row.claim_request_id||'unused')}`,baseUrl()).href;
      const unsubscribe=row.alert_subscription_id?new URL(`/api/storefront/unsubscribe/${newToken(row.alert_subscription_id)}`,baseUrl()).href:null;
      const verify=row.alert_subscription_id?new URL(`/api/storefront/verify/${newToken(row.alert_subscription_id)}`,baseUrl()).href:'';
      const imageUrl=row.kind==='availability_alert'?null:absoluteEmailPhotoUrl(row.photo_src,baseUrl());
      const draft=(row.kind==='verify_alert'?notificationConfirmationEmail({title:row.title,imageUrl,verificationUrl:verify}):row.kind==='availability_alert'?availabilityAlertEmail(row.title,link,unsubscribe):claimEmail({title:row.title,imageUrl,schedulingUrl:link,cancelUrl:new URL(`/api/storefront/cancel/${newToken(row.claim_request_id)}`,baseUrl()).href}));
      const message=row.message || {from,to:row.email,subject:draft.subject,html:draft.html,text:draft.text};
      await db().query('UPDATE storefront_outbox SET message=COALESCE(message,$3) WHERE id=$1 AND lease_id=$2',[row.id,lease,message]);
      // Warm the exact public image URL before the first send, once per photo in this batch.
      // Retried messages keep their original envelope; a changed item photo must not replace it.
      if(!row.message && imageUrl && !preparedPhotos.has(imageUrl)) {
        preparedPhotos.add(imageUrl);
        await prepareEmailPhoto(imageUrl,baseUrl());
      }
      const eligible=await db().query(`SELECT 1 FROM storefront_outbox o
        LEFT JOIN claim_requests c ON c.id=o.claim_request_id LEFT JOIN item_availability_alerts a ON a.id=o.alert_subscription_id
        JOIN storefront_items i ON i.id=COALESCE(c.item_id,a.item_id) JOIN catalog_regions r ON r.id=i.region_id
        WHERE o.id=$1 AND o.lease_id=$2 AND o.canceled_at IS NULL AND o.sent_at IS NULL
        AND i.adoption_enabled=true AND i.publication_status='published' AND i.published_at IS NOT NULL AND r.publication_status='published'
        AND (c.id IS NULL OR (c.status='link_sent' AND c.token_expires_at>now() AND i.status='available' AND (o.availability_version IS NULL OR o.availability_version=i.availability_version)))
        AND (a.id IS NULL OR (a.unsubscribed_at IS NULL AND a.fulfilled_at IS NULL AND
          ((o.kind='verify_alert' AND a.verified_at IS NULL AND a.verification_expires_at>now()) OR (o.kind='availability_alert' AND a.verified_at IS NOT NULL))))`,[row.id,lease]);
      if(!eligible.rowCount){await db().query('UPDATE storefront_outbox SET canceled_at=now(),locked_until=NULL WHERE id=$1 AND lease_id=$2',[row.id,lease]);continue;}
      const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':row.id},body:JSON.stringify({from:message.from,to:message.to,subject:message.subject,html:message.html,text:message.text}),signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw new FlowError(`Email provider HTTP ${response.status}`,response.status);
      await transaction(async client=>{
        const result=await client.query('UPDATE storefront_outbox SET sent_at=now(),locked_until=NULL,last_error=NULL WHERE id=$1 AND lease_id=$2 AND sent_at IS NULL RETURNING id',[row.id,lease]);
        if(result.rowCount && row.kind==='availability_alert')await client.query('UPDATE item_availability_alerts SET fulfilled_at=now(),unsubscribed_at=COALESCE(unsubscribed_at,now()),last_notified_version=$2 WHERE id=$1',[row.alert_subscription_id,row.availability_version]);
      });delivered++;
    }catch(error){
      const permanent=error instanceof FlowError && error.status>=400&&error.status<500&&![408,409,429].includes(error.status);
      await db().query("UPDATE storefront_outbox SET locked_until=NULL,lease_id=NULL,last_error=$3,failed_at=CASE WHEN $4 OR attempts>=8 THEN now() ELSE NULL END,next_attempt_at=now()+LEAST(3600,30*power(2,LEAST(attempts,7)))*interval '1 second' WHERE id=$1 AND lease_id=$2",[row.id,lease,error instanceof Error?error.message:'Delivery failed',permanent]);
    }
  }
  return delivered;
}

function escapeHtml(value:string) { return value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!)); }

export function availabilityAlertEmail(title: string, link: string, unsubscribe: string | null) {
  const footer = unsubscribe ? `<p><a href="${escapeHtml(unsubscribe)}">Stop availability alerts for this item</a></p>` : '';
  return {
    subject: `${title} is available again`,
    html: `<p>${escapeHtml(title)} is back on the market.</p><p><a href="${escapeHtml(link)}">Choose a time and suggest a public place</a></p><p>The link expires in one hour. A booking request does not guarantee the item.</p>${footer}`,
    text: `${title} is back on the market.\n\nChoose a time and suggest a public place: ${link}\n\nThe link expires in one hour. A booking request does not guarantee the item.${unsubscribe ? `\n\nStop availability alerts for this item: ${unsubscribe}` : ''}`,
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
  if (uploadedPhotoPathname(url.pathname + url.search)) {
    url.searchParams.set('email', '1');
    // Bust existing immutable mail-client caches when the JPEG encoding changes.
    url.searchParams.set('v', '2');
  }
  return url.toString();
}

export async function prepareEmailPhoto(src: string | null, origin: URL) {
  if (!src) return false;
  try {
    const url = new URL(src);
    // Only fetch our validated media endpoint. Never follow external images or redirects.
    if (url.origin !== origin.origin || !uploadedPhotoPathname(url.pathname + url.search) || url.searchParams.get('email') !== '1') return false;
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(3000) });
    if (!response.ok || response.headers.get('content-type')?.split(';')[0] !== 'image/jpeg') {
      await response.body?.cancel();
      return false;
    }
    // Drain the response so the CDN can finish storing it before the email is delivered.
    await response.arrayBuffer();
    return true;
  } catch {
    // A slow or unavailable photo must not prevent delivery of the verification/claim link.
    return false;
  }
}
