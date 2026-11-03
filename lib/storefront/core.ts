import { createHash, createHmac, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { db, transaction } from "./db";

export class FlowError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function normalEmail(value: string) {
  if(typeof value!=='string') throw new FlowError('Enter a valid email address');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new FlowError("Enter a valid email address");
  return email;
}

export function newToken(claimId: string) {
  const secret = process.env.STOREFRONT_LINK_SECRET;
  if (!secret) throw new Error("STOREFRONT_LINK_SECRET is not configured");
  return createHmac("sha256", secret).update(claimId).digest("base64url");
}
export function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }

type Item = { id: string; slug: string; status: string; availability_version: number; adoption_enabled:boolean; published_at:Date|null; region_id:string; publication_status:string };

function sharedCalEvent() {
  const eventTypeId = Number(process.env.STOREFRONT_CAL_EVENT_TYPE_ID);
  const bookingUrl = process.env.STOREFRONT_CAL_BOOKING_URL;
  if (!Number.isSafeInteger(eventTypeId) || eventTypeId <= 0 || !bookingUrl) throw new FlowError('Scheduling is not configured',503);
  const url = new URL(bookingUrl);
  if (url.protocol !== 'https:' || !['cal.com','app.cal.com'].includes(url.hostname)) throw new FlowError('Invalid Cal booking URL',500);
  return { eventTypeId, url };
}

async function itemForUpdate(client: PoolClient, itemId: string): Promise<Item> {
  const result = await client.query<Item>("SELECT * FROM storefront_items WHERE id=$1 FOR UPDATE", [itemId]);
  if (!result.rows[0]) throw new FlowError("Item not found", 404);
  return result.rows[0];
}

export async function startClaim(slug: string, emailValue: string, acknowledged=false) {
  const email = normalEmail(emailValue);
  const claimId = randomUUID();
  const token = newToken(claimId);
  return transaction(async client => {
    const itemResult = await client.query<Item>("SELECT * FROM storefront_items WHERE slug=$1 AND published_at IS NOT NULL AND adoption_enabled=true AND publication_status='published' AND EXISTS (SELECT 1 FROM catalog_regions r WHERE r.id=storefront_items.region_id AND r.publication_status='published') FOR UPDATE", [slug]);
    const item = itemResult.rows[0];
    if (!item) throw new FlowError("Item not found", 404);
    if (item.status !== "available") throw new FlowError("This item is not available", 409);
    const priorClaim = await client.query<{status:string}>(`SELECT status FROM claim_requests
      WHERE email=$1 AND item_id<>$2 AND status IN ('booking_requested','accepted','completed')
      LIMIT 1`, [email,item.id]);
    if (priorClaim.rows[0]) throw new FlowError(
      priorClaim.rows[0].status === 'completed' ? 'You have already claimed an item' : 'You already have a claim in progress', 409);
    const cal = sharedCalEvent();
    const active=await client.query<{id:string}>("SELECT id FROM claim_requests WHERE item_id=$1 AND email=$2 AND status='link_sent' AND token_expires_at>now() ORDER BY created_at DESC LIMIT 1",[item.id,email]);
    if(active.rows[0]) {
      // A temporary pending state may have canceled the original unsent job.
      await client.query(`INSERT INTO storefront_outbox(kind,claim_request_id) SELECT 'claim_link',$1
        WHERE NOT EXISTS(SELECT 1 FROM storefront_outbox WHERE claim_request_id=$1 AND canceled_at IS NULL)`,[active.rows[0].id]);
      return {token:newToken(active.rows[0].id),claimId:active.rows[0].id,itemId:item.id,email};
    }
    await client.query(`INSERT INTO claim_requests(id,item_id,email,token_hash,token_expires_at,cal_event_type_id,acknowledged_at)
      VALUES($1,$2,$3,$4,now()+interval '1 hour',$5,CASE WHEN $6 THEN now() ELSE NULL END)`, [claimId,item.id,email,tokenHash(token),cal.eventTypeId,acknowledged]);
    await client.query("INSERT INTO storefront_outbox(kind,claim_request_id) VALUES('claim_link',$1)", [claimId]);
    return { token, claimId, itemId: item.id, email };
  });
}

export async function resolveClaimLink(token: string) {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) throw new FlowError("Invalid link", 404);
  const result = await db().query<{id:string;status:string; token_expires_at:Date; item_status:string; email:string}>(`
    SELECT c.id,c.status,c.token_expires_at,i.status AS item_status,c.email
    FROM claim_requests c JOIN storefront_items i ON i.id=c.item_id WHERE c.token_hash=$1 AND i.adoption_enabled=true AND i.published_at IS NOT NULL AND i.publication_status='published' AND EXISTS (SELECT 1 FROM catalog_regions r WHERE r.id=i.region_id AND r.publication_status='published')`, [tokenHash(token)]);
  const claim = result.rows[0];
  if (!claim || claim.status !== "link_sent" || claim.token_expires_at.getTime() < Date.now()) throw new FlowError("This link has expired", 410);
  if (claim.item_status !== "available") throw new FlowError("This item is currently pending", 409);
  const { url } = sharedCalEvent();
  url.searchParams.set("email", claim.email);
  url.searchParams.set('claim_ref', claim.id);
  return url.toString();
}

export async function claimCancellationDetails(token: string) {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) throw new FlowError('Invalid link', 404);
  const result = await db().query<{title:string;status:string}>(`
    SELECT i.title,c.status FROM claim_requests c
    JOIN storefront_items i ON i.id=c.item_id WHERE c.token_hash=$1`, [tokenHash(token)]);
  if (!result.rows[0]) throw new FlowError('Invalid link', 404);
  return result.rows[0];
}

export async function cancelUnscheduledClaim(token: string) {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) throw new FlowError('Invalid link', 404);
  return transaction(async client => {
    const result = await client.query<{id:string}>(`
      UPDATE claim_requests SET status='canceled',updated_at=now()
      WHERE token_hash=$1 AND status='link_sent' RETURNING id`, [tokenHash(token)]);
    if (!result.rows[0]) return false;
    await client.query("INSERT INTO claim_events(claim_request_id,action,actor) VALUES($1,'CLAIM_CANCELED','recipient')", [result.rows[0].id]);
    return true;
  });
}

export async function subscribeToAvailability(slug: string, emailValue: string) {
  const email = normalEmail(emailValue);
  return transaction(async client => {
    const itemResult = await client.query<Item>("SELECT * FROM storefront_items WHERE slug=$1 AND published_at IS NOT NULL AND adoption_enabled=true AND publication_status='published' AND EXISTS (SELECT 1 FROM catalog_regions r WHERE r.id=storefront_items.region_id AND r.publication_status='published') FOR UPDATE", [slug]);
    const item = itemResult.rows[0];
    if (!item) throw new FlowError("Item not found", 404);
    if (!['pending','reserved'].includes(item.status)) throw new FlowError("This item is available now", 409);
    const subscriptionId=randomUUID();
    // Refresh an expired verification, but preserve any active verified opt-in.
    const existing=await client.query<{id:string;verified_at:Date|null;verification_expires_at:Date}>("SELECT id,verified_at,verification_expires_at FROM item_availability_alerts WHERE item_id=$1 AND lower(email)=$2 AND unsubscribed_at IS NULL FOR UPDATE",[item.id,email]);
    if(existing.rows[0]?.verified_at)return existing.rows[0].id;
    if(existing.rows[0] && existing.rows[0].verification_expires_at.getTime()>Date.now())return existing.rows[0].id;
    await client.query("UPDATE item_availability_alerts SET unsubscribed_at=now() WHERE item_id=$1 AND lower(email)=$2 AND unsubscribed_at IS NULL",[item.id,email]);
    const count=await client.query<{n:string}>('SELECT count(*) AS n FROM item_availability_alerts WHERE item_id=$1 AND unsubscribed_at IS NULL AND (verified_at IS NOT NULL OR verification_expires_at>now())',[item.id]);
    if(Number(count.rows[0].n)>=1000)throw new FlowError('Notification list is full',429);
    await client.query(`INSERT INTO item_availability_alerts(id,item_id,email,unsubscribe_token_hash) VALUES($1,$2,$3,$4)`,[subscriptionId,item.id,email,tokenHash(newToken(subscriptionId))]);
    await client.query("INSERT INTO storefront_outbox(kind,alert_subscription_id) VALUES('verify_alert',$1)",[subscriptionId]);
    return subscriptionId;
  });
}

export async function unsubscribeAvailability(token:string) {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) throw new FlowError('Invalid unsubscribe link',404);
  return transaction(async client=>{
    const result=await client.query('UPDATE item_availability_alerts SET unsubscribed_at=now() WHERE unsubscribe_token_hash=$1 AND unsubscribed_at IS NULL RETURNING id',[tokenHash(token)]);
    if(result.rows[0]) {
      await client.query("UPDATE claim_requests c SET status='canceled',updated_at=now() WHERE status='link_sent' AND id IN (SELECT claim_request_id FROM storefront_outbox WHERE alert_subscription_id=$1 AND sent_at IS NULL) AND NOT EXISTS(SELECT 1 FROM storefront_outbox o WHERE o.claim_request_id=c.id AND o.kind='claim_link')",[result.rows[0].id]);
      await client.query('UPDATE storefront_outbox SET canceled_at=now() WHERE alert_subscription_id=$1 AND sent_at IS NULL',[result.rows[0].id]);
    }
    return Boolean(result.rowCount);
  });
}

type BookingEvent = { triggerEvent:string; createdAt:string; payload:Record<string,unknown> };
function bookingInfo(event: BookingEvent) {
  const p = event.payload;
  const attendees = Array.isArray(p.attendees) ? p.attendees : [];
  const attendee = attendees[0] as Record<string,unknown> | undefined;
  const email = typeof attendee?.email === 'string' ? normalEmail(attendee.email) : null;
  const uid = typeof p.uid === 'string' ? p.uid : null;
  const eventTypeId = Number(p.eventTypeId);
  if (!email || !uid || !Number.isInteger(eventTypeId)) throw new FlowError("Incomplete booking event");
  const responses = (p.bookingFieldsResponses && typeof p.bookingFieldsResponses === 'object' ? p.bookingFieldsResponses : p.responses) as Record<string,unknown> | undefined;
  const field = (name:string) => {
    const value=responses?.[name];
    return typeof value === 'string' ? value : value && typeof value === 'object' && 'value' in value && typeof value.value === 'string' ? value.value : null;
  };
  return { email, uid, eventTypeId, previousUid: typeof p.rescheduleUid === 'string' ? p.rescheduleUid : null,
    claimRef: field('claim_ref'),
    start: typeof p.startTime === 'string' ? p.startTime : null,
    timeZone: typeof attendee?.timeZone === 'string' ? attendee.timeZone : null,
    place: field('seattle_place') ?? (typeof p.additionalNotes === 'string' ? p.additionalNotes : null) };
}

export async function reopenIfEmpty(client: PoolClient, itemId: string) {
  const item = await itemForUpdate(client,itemId);
  if (!['pending','reserved'].includes(item.status)) return;
  const active = await client.query<{status:string}>("SELECT status FROM claim_requests WHERE item_id=$1 AND status IN ('booking_requested','accepted') ORDER BY (status='accepted') DESC,requested_at LIMIT 1", [itemId]);
  if (active.rows[0]) {
    const target = active.rows[0].status === 'accepted' ? 'reserved' : 'pending';
    if (item.status !== target) await client.query("UPDATE storefront_items SET status=$2,updated_at=now() WHERE id=$1",[itemId,target]);
    return;
  }
  const nextVersion = item.availability_version + 1;
  await client.query("UPDATE storefront_items SET status='available',availability_version=$2,updated_at=now() WHERE id=$1", [itemId,nextVersion]);
  await client.query("INSERT INTO storefront_jobs(kind,item_id,version) VALUES('fanout',$1,$2) ON CONFLICT DO NOTHING",[itemId,nextVersion]);
}

export async function applyCalEvent(event: BookingEvent) {
  if (!['BOOKING_REQUESTED','BOOKING_CREATED','BOOKING_REJECTED','BOOKING_CANCELLED','BOOKING_RESCHEDULED'].includes(event.triggerEvent)) return { ignored:true };
  const info = bookingInfo(event);
  if (info.eventTypeId !== sharedCalEvent().eventTypeId) throw new FlowError('Unknown Cal event type',404);
  return transaction(async client => {
    if (event.triggerEvent === 'BOOKING_REQUESTED' && (!info.claimRef || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(info.claimRef)))
      throw new FlowError('Booking has no claim reference',409);
    const pointer = event.triggerEvent === 'BOOKING_REQUESTED'
      ? await client.query<{item_id:string}>('SELECT item_id FROM claim_requests WHERE id=$1',[info.claimRef])
      : await client.query<{item_id:string}>('SELECT item_id FROM claim_requests WHERE cal_booking_uid=$1 OR cal_booking_uid=$2 LIMIT 1',[info.uid,info.previousUid]);
    if (!pointer.rows[0]) throw new FlowError('Unknown claim for booking',409);
    const item = await itemForUpdate(client,pointer.rows[0].item_id);
    const claimResult = await client.query<{id:string;status:string;item_id:string;email:string;cal_event_type_id:number;token_expires_at:Date;cal_booking_uid:string|null}>(
      event.triggerEvent === 'BOOKING_REQUESTED' ? 'SELECT id,status,item_id,email,cal_event_type_id,token_expires_at,cal_booking_uid FROM claim_requests WHERE id=$1 FOR UPDATE' :
        'SELECT id,status,item_id,email,cal_event_type_id,token_expires_at,cal_booking_uid FROM claim_requests WHERE cal_booking_uid=$1 OR cal_booking_uid=$2 LIMIT 1 FOR UPDATE',
      event.triggerEvent === 'BOOKING_REQUESTED' ? [info.claimRef] : [info.uid,info.previousUid]);
    const claim = claimResult.rows[0];
    if (!claim || claim.email !== info.email || claim.cal_event_type_id !== info.eventTypeId) throw new FlowError('Booking does not match claim',409);
    if(event.triggerEvent==='BOOKING_REQUESTED' && claim.status!=='link_sent') {
      if(claim.cal_booking_uid===info.uid)return {ignored:true};
      throw new FlowError('Claim already used',409);
    }
    if((event.triggerEvent==='BOOKING_CREATED' || event.triggerEvent==='BOOKING_RESCHEDULED') && ['canceled','declined','expired'].includes(claim.status)) {
      await client.query("INSERT INTO storefront_jobs(kind,item_id,uid,booking_status) VALUES('cal_cancel',$1,$2,'accepted') ON CONFLICT DO NOTHING",[item.id,info.uid]);
      return {ignored:true};
    }
    if (event.triggerEvent === 'BOOKING_REQUESTED' && claim.status === 'link_sent') {
      const region=await client.query("SELECT 1 FROM catalog_regions WHERE id=$1 AND publication_status='published' FOR SHARE",[item.region_id]);
      if (!item.adoption_enabled || !item.published_at || item.publication_status!=='published' || !region.rowCount) throw new FlowError('This item is no longer available for adoption',409);
      if (!['available','pending'].includes(item.status)) throw new FlowError('Item is already reserved',409);
      if (claim.token_expires_at.getTime() < Date.now()) throw new FlowError('Claim link expired',409);
      // The email link verifies the address; serialize bookings for that address across items.
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [claim.email]);
      const priorClaim = await client.query<{status:string}>(`SELECT status FROM claim_requests
        WHERE email=$1 AND item_id<>$2 AND status IN ('booking_requested','accepted','completed')
        LIMIT 1`, [claim.email,item.id]);
      if (priorClaim.rows[0]) throw new FlowError(
        priorClaim.rows[0].status === 'completed' ? 'You have already claimed an item' : 'You already have a claim in progress', 409);
      await client.query(`UPDATE claim_requests SET status='booking_requested',cal_booking_uid=$2,requested_at=$3,
        requested_start_at=$4,time_zone=$5,suggested_public_place=$6,updated_at=now() WHERE id=$1`,
        [claim.id,info.uid,event.createdAt,info.start,info.timeZone,info.place]);
      if (item.status === 'available') await client.query("UPDATE storefront_items SET status='pending',updated_at=now() WHERE id=$1", [item.id]);
    } else if (event.triggerEvent === 'BOOKING_CREATED' && claim.status === 'booking_requested') {
      if (item.status !== 'pending') throw new FlowError("Item is not pending", 409);
      const earlier = await client.query(`SELECT 1 FROM claim_requests WHERE item_id=$1 AND status='booking_requested'
        AND (requested_at,id) < (SELECT requested_at,id FROM claim_requests WHERE id=$2) LIMIT 1`,[item.id,claim.id]);
      if (earlier.rowCount) throw new FlowError('An earlier request must be reviewed first',409);
      await client.query("UPDATE claim_requests SET status='accepted',updated_at=now() WHERE id=$1", [claim.id]);
      await client.query("UPDATE storefront_items SET status='reserved',updated_at=now() WHERE id=$1", [item.id]);
      await client.query("UPDATE claim_requests SET status='expired' WHERE item_id=$1 AND status='link_sent'",[item.id]);
    } else if (['BOOKING_REJECTED','BOOKING_CANCELLED'].includes(event.triggerEvent) && ['booking_requested','accepted'].includes(claim.status)) {
      await client.query("UPDATE claim_requests SET status=$2,updated_at=now() WHERE id=$1", [claim.id,event.triggerEvent === 'BOOKING_REJECTED' ? 'declined' : 'canceled']);
      // Cancellation is recorded; inventory stays pending/reserved until Admin resolves it.
    } else if (event.triggerEvent === 'BOOKING_RESCHEDULED' && ['booking_requested','accepted'].includes(claim.status)) {
      await client.query("UPDATE claim_requests SET cal_booking_uid=$2,requested_start_at=$3,time_zone=$4,updated_at=now() WHERE id=$1", [claim.id,info.uid,info.start,info.timeZone]);
    }
    await client.query("INSERT INTO claim_events(claim_request_id,action,actor,external_key) VALUES($1,$2,'cal',$3) ON CONFLICT DO NOTHING",
      [claim.id,event.triggerEvent,`${info.uid}:${event.triggerEvent}:${event.createdAt}`]);
    return { ignored:false,itemId:item.id,claimId:claim.id };
  });
}

export async function completeHandoff(itemId: string, photoBlobPath: string, altText: string, consent: boolean, ownerName = 'its new owner', coffeeStory = 'A coffee and a story shared in Seattle.') {
  if (!consent || !photoBlobPath || !altText.trim()) throw new FlowError("Photo, alt text, and permission to publish are required");
  return transaction(async client => {
    const item = await itemForUpdate(client,itemId);
    if (item.status !== 'reserved') throw new FlowError("Item must be reserved",409);
    const claim = await client.query<{id:string}>("SELECT id FROM claim_requests WHERE item_id=$1 AND status='accepted' FOR UPDATE", [itemId]);
    if (!claim.rows[0]) throw new FlowError("Accepted claim not found",409);
    await client.query(`INSERT INTO item_handoffs(item_id,claim_request_id,photo_blob_path,photo_alt_text,photo_publish_consent_at,owner_name,coffee_story)
      VALUES($1,$2,$3,$4,now(),$5,$6)`, [itemId,claim.rows[0].id,photoBlobPath,altText.trim(),ownerName.trim(),coffeeStory.trim()]);
    await client.query("UPDATE claim_requests SET status='completed',updated_at=now() WHERE id=$1", [claim.rows[0].id]);
    await closeOtherClaims(client,itemId,claim.rows[0].id);
    await client.query("UPDATE storefront_items SET status='claimed',updated_at=now() WHERE id=$1", [itemId]);
  });
}

export async function closeOtherClaims(client:PoolClient,itemId:string,winner?:string) {
 await client.query(`INSERT INTO storefront_jobs(kind,item_id,uid,booking_status)
   SELECT 'cal_cancel',item_id,cal_booking_uid,status FROM claim_requests
   WHERE item_id=$1 AND id<>COALESCE($2::uuid,'00000000-0000-0000-0000-000000000000')
   AND status IN ('booking_requested','accepted') AND cal_booking_uid IS NOT NULL
   ON CONFLICT DO NOTHING`,[itemId,winner||null]);
 await client.query(`INSERT INTO claim_events(claim_request_id,action,actor)
   SELECT id,'CLOSED_BY_OWNER','admin' FROM claim_requests WHERE item_id=$1
   AND id<>COALESCE($2::uuid,'00000000-0000-0000-0000-000000000000')
   AND status IN ('link_sent','booking_requested','accepted')`,[itemId,winner||null]);
 await client.query("UPDATE claim_requests SET status='canceled',updated_at=now() WHERE item_id=$1 AND id<>COALESCE($2::uuid,'00000000-0000-0000-0000-000000000000') AND status IN ('link_sent','booking_requested','accepted')",[itemId,winner||null]);
 await client.query("UPDATE storefront_outbox SET canceled_at=now() WHERE claim_request_id IN (SELECT id FROM claim_requests WHERE item_id=$1 AND status IN ('canceled','expired')) AND sent_at IS NULL",[itemId]);
}
export async function verifyAvailability(token:string) {
 if(!/^[A-Za-z0-9_-]{40,100}$/.test(token))throw new FlowError('Invalid link',404);
 return transaction(async client=>{
  const pointer=await client.query('SELECT item_id FROM item_availability_alerts WHERE unsubscribe_token_hash=$1',[tokenHash(token)]);
  if(!pointer.rowCount)throw new FlowError('Invalid link',404);
  const item=await itemForUpdate(client,pointer.rows[0].item_id);
  const result=await client.query("UPDATE item_availability_alerts SET verified_at=COALESCE(verified_at,now()) WHERE unsubscribe_token_hash=$1 AND unsubscribed_at IS NULL AND fulfilled_at IS NULL AND (verified_at IS NOT NULL OR verification_expires_at>now()) RETURNING id",[tokenHash(token)]);
  if(!result.rowCount)throw new FlowError('Verification link expired',410);
  // Confirmation can arrive after the reopening event has already been processed.
  if(item.status==='available')await client.query("INSERT INTO storefront_jobs(kind,item_id,version) VALUES('fanout',$1,$2) ON CONFLICT(item_id,version,kind) DO UPDATE SET done_at=NULL,next_attempt_at=now(),attempts=0",[item.id,item.availability_version]);
 });
}
export async function reopenItem(itemId:string) {
 return transaction(async client=>{
  const item=await itemForUpdate(client,itemId);
  if(!['pending','reserved'].includes(item.status))throw new FlowError('Only pending/reserved items can reopen',409);
  await closeOtherClaims(client,itemId);
  await reopenIfEmpty(client,itemId);
 });
}
