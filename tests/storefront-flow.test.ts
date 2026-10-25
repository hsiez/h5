import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '../lib/storefront/db';
import { applyCalEvent, completeHandoff, newToken, resolveClaimLink, startClaim, subscribeToAvailability, tokenHash, unsubscribeAvailability } from '../lib/storefront/core';
import { deliverPendingEmail } from '../lib/storefront/email';
import { acceptFirstClaim } from '../lib/storefront/admin-decisions';

const slug = `flow-test-${randomUUID()}`;
const eventTypeId = Math.floor(100_000_000 + Math.random() * 800_000_000);
let itemId:string;
let secondItemId:string;
let claimId:string;
let laterClaimId:string;

function event(triggerEvent:string, uid:string, email:string, when:string, ref=claimId) {
  return {triggerEvent,createdAt:when,payload:{uid,eventTypeId,attendees:[{email,timeZone:'America/Los_Angeles'}],
    startTime:'2026-11-01T17:00:00Z',bookingFieldsResponses:{claim_ref:ref,seattle_place:'Public café in Seattle'}}};
}

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!testDatabaseUrl)('storefront flow with Postgres', () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.STOREFRONT_LINK_SECRET ||= 'storefront-integration-test-secret';
    process.env.STOREFRONT_CAL_EVENT_TYPE_ID=String(eventTypeId);
    process.env.STOREFRONT_CAL_BOOKING_URL='https://cal.com/test/coffee';
    const row = await db().query<{id:string}>(`INSERT INTO storefront_items(slug,title,status,published_at,region_id,adoption_enabled,publication_status)
      VALUES($1,'Test item','available',now(),'things-for-you',true,'published') RETURNING id`,[slug]);
    itemId=row.rows[0].id;
  });
  afterAll(async () => {
    for (const id of [itemId,secondItemId].filter(Boolean)) {
      await db().query('DELETE FROM storefront_outbox WHERE claim_request_id IN (SELECT id FROM claim_requests WHERE item_id=$1)',[id]);
      await db().query('DELETE FROM claim_events WHERE claim_request_id IN (SELECT id FROM claim_requests WHERE item_id=$1)',[id]);
      await db().query('DELETE FROM item_handoffs WHERE item_id=$1',[id]);
      await db().query('DELETE FROM item_availability_alerts WHERE item_id=$1',[id]);
      await db().query('DELETE FROM claim_requests WHERE item_id=$1',[id]);
      await db().query('DELETE FROM storefront_items WHERE id=$1',[id]);
    }
    await db().end();
  });

  it('keeps an item available after email entry, then makes it pending on a Cal request', async () => {
    const result=await startClaim(slug,'  PERSON@example.com ');
    claimId=result.claimId;
    expect(result.email).toBe('person@example.com');
    expect((await db().query('SELECT status FROM storefront_items WHERE id=$1',[itemId])).rows[0].status).toBe('available');
    expect((await db().query('SELECT token_hash FROM claim_requests WHERE id=$1',[claimId])).rows[0].token_hash).toBe(tokenHash(result.token));
    await expect(resolveClaimLink(result.token)).resolves.toContain(`claim_ref=${claimId}`);
    await expect(applyCalEvent(event('BOOKING_REQUESTED','wrong-ref','person@example.com','2026-10-21T12:00:00Z',randomUUID()))).rejects.toThrow('Unknown claim');
    await applyCalEvent(event('BOOKING_REQUESTED','booking-test-1','person@example.com','2026-10-21T12:00:00Z'));
    expect((await db().query('SELECT status FROM storefront_items WHERE id=$1',[itemId])).rows[0].status).toBe('pending');
  });

  it('routes a shared Cal event to the item named by the claim reference', async () => {
    const otherSlug=`${slug}-second`;
    secondItemId=(await db().query<{id:string}>(`INSERT INTO storefront_items(slug,title,status,published_at,region_id,adoption_enabled,publication_status)
      VALUES($1,'Second item','available',now(),'things-for-you',true,'published') RETURNING id`,[otherSlug])).rows[0].id;
    const other=await startClaim(otherSlug,'second@example.com');
    await expect(applyCalEvent(event('BOOKING_REQUESTED','wrong-email','person@example.com','2026-10-21T12:01:00Z',other.claimId))).rejects.toThrow('Booking does not match claim');
    await applyCalEvent(event('BOOKING_REQUESTED','booking-second','second@example.com','2026-10-21T12:01:00Z',other.claimId));
    expect((await db().query('SELECT status FROM storefront_items WHERE id=$1',[secondItemId])).rows[0].status).toBe('pending');
    await applyCalEvent(event('BOOKING_REJECTED','booking-second','second@example.com','2026-10-21T12:02:00Z',other.claimId));
  });

  it('records an alert subscriber without giving them a claim or rank', async () => {
    await subscribeToAvailability(slug,'alert@example.com');
    const rows=await db().query('SELECT * FROM item_availability_alerts WHERE item_id=$1',[itemId]);
    expect(rows.rowCount).toBe(1);
    expect((await db().query('SELECT count(*)::int AS n FROM claim_requests WHERE item_id=$1',[itemId])).rows[0].n).toBe(1);
  });

  it('reopens after a decline and queues one alert with a personal claim link', async () => {
    await applyCalEvent(event('BOOKING_REJECTED','booking-test-1','person@example.com','2026-10-21T12:03:00Z'));
    const item=(await db().query('SELECT status,availability_version FROM storefront_items WHERE id=$1',[itemId])).rows[0];
    expect(item.status).toBe('available');
    expect(item.availability_version).toBe(1);
    const alert=(await db().query(`SELECT o.kind,c.email FROM storefront_outbox o JOIN claim_requests c ON c.id=o.claim_request_id
      WHERE c.item_id=$1 AND o.kind='availability_alert'`,[itemId])).rows;
    expect(alert).toEqual([{kind:'availability_alert',email:'alert@example.com'}]);
    const previousFetch=globalThis.fetch;
    const previousSender=process.env.STOREFRONT_FROM_EMAIL;
    process.env.STOREFRONT_FROM_EMAIL='test@h5.codes';
    const sent:unknown[]=[];
    globalThis.fetch=async (_input,init) => {
      sent.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({id:'test-email'}),{status:200});
    };
    try { expect(await deliverPendingEmail()).toBe(1); }
    finally { globalThis.fetch=previousFetch; if (previousSender) process.env.STOREFRONT_FROM_EMAIL=previousSender; else delete process.env.STOREFRONT_FROM_EMAIL; }
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({to:'alert@example.com',subject:'Test item is available again'});
    const next=await startClaim(slug,'person@example.com');
    claimId=next.claimId;
    const later=await startClaim(slug,'later@example.com');
    laterClaimId=later.claimId;
    await applyCalEvent(event('BOOKING_REQUESTED','booking-test-2','person@example.com','2026-10-21T12:04:00Z'));
    await applyCalEvent(event('BOOKING_REQUESTED','booking-test-later','later@example.com','2026-10-21T12:04:30Z',laterClaimId));
  });

  it('reserves on confirmation and claims only after the photo handoff', async () => {
    await expect(acceptFirstClaim(laterClaimId)).rejects.toThrow('earliest Cal request');
    const previousFetch=globalThis.fetch;
    globalThis.fetch=async () => new Response(JSON.stringify({status:'error'}),{status:400});
    try {
      await expect(acceptFirstClaim(claimId)).rejects.toThrow('Cal could not confirm');
      expect((await db().query('SELECT approval_started_at FROM claim_requests WHERE id=$1',[claimId])).rows[0].approval_started_at).toBeNull();
      globalThis.fetch=async () => new Response(JSON.stringify({status:'success'}),{status:200});
      await acceptFirstClaim(claimId);
    }
    finally { globalThis.fetch=previousFetch; }
    await applyCalEvent(event('BOOKING_CREATED','booking-test-2','person@example.com','2026-10-21T12:05:00Z'));
    expect((await db().query('SELECT status FROM storefront_items WHERE id=$1',[itemId])).rows[0].status).toBe('reserved');
    const rescheduled={...event('BOOKING_RESCHEDULED','booking-test-3','person@example.com','2026-10-21T12:06:00Z'),
      payload:{...event('BOOKING_RESCHEDULED','booking-test-3','person@example.com','2026-10-21T12:06:00Z').payload,rescheduleUid:'booking-test-2'}};
    await applyCalEvent(rescheduled);
    expect((await db().query('SELECT cal_booking_uid FROM claim_requests WHERE id=$1',[claimId])).rows[0].cal_booking_uid).toBe('booking-test-3');
    await applyCalEvent(event('BOOKING_CANCELLED','booking-test-3','person@example.com','2026-10-21T12:07:00Z'));
    expect((await db().query('SELECT status FROM storefront_items WHERE id=$1',[itemId])).rows[0].status).toBe('pending');
    await applyCalEvent(event('BOOKING_REJECTED','booking-test-later','later@example.com','2026-10-21T12:07:30Z',laterClaimId));
    expect((await db().query('SELECT status,availability_version FROM storefront_items WHERE id=$1',[itemId])).rows[0]).toMatchObject({status:'available',availability_version:2});
    const subscription=(await db().query('SELECT id FROM item_availability_alerts WHERE item_id=$1',[itemId])).rows[0];
    expect(await unsubscribeAvailability(newToken(subscription.id))).toBe(true);
    expect(await unsubscribeAvailability(newToken(subscription.id))).toBe(false);
    const replacement=await startClaim(slug,'newperson@example.com');
    claimId=replacement.claimId;
    await applyCalEvent(event('BOOKING_REQUESTED','booking-test-4','newperson@example.com','2026-10-21T12:08:00Z'));
    await applyCalEvent(event('BOOKING_CREATED','booking-test-4','newperson@example.com','2026-10-21T12:09:00Z'));
    await completeHandoff(itemId,'storefront/handoffs/test.webp','Two people smiling with the item',true);
    expect((await db().query('SELECT status FROM storefront_items WHERE id=$1',[itemId])).rows[0].status).toBe('claimed');
    expect((await db().query('SELECT status FROM claim_requests WHERE id=$1',[claimId])).rows[0].status).toBe('completed');
  });
});
