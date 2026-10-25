import { randomUUID, createHash } from 'node:crypto';
import pg from 'pg';

const eventTypeId = Number(process.env.STOREFRONT_CAL_EVENT_TYPE_ID);
const key = process.env.CAL_API_KEY;
const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!key || !eventTypeId || !connectionString) throw new Error('Cal and database settings are required');

const cal = async (path, options = {}) => {
  const response = await fetch(`https://api.cal.com/v2${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${key}`, 'cal-api-version': options.version || '2026-02-25',
      'content-type': 'application/json', ...options.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Cal ${path}: ${response.status} ${JSON.stringify(body).slice(0, 500)}`);
  return body.data;
};

const client = new pg.Client({ connectionString });
const itemId = randomUUID();
const claimId = randomUUID();
let bookingUid;
await client.connect();
try {
  const me = await cal('/me');
  if (!me.email) throw new Error('Cal account email is unavailable for the test');
  await client.query(`INSERT INTO storefront_items(id,slug,title,status,published_at,region_id,adoption_enabled,publication_status)
    VALUES($1,$2,'Temporary Cal integration test','available',now(),'things-for-you',true,'published')`, [itemId, `cal-local-test-${itemId}`]);
  await client.query(`INSERT INTO claim_requests(id,item_id,email,token_hash,token_expires_at,cal_event_type_id)
    VALUES($1,$2,$3,$4,now()+interval '1 hour',$5)`,
    [claimId,itemId,me.email.toLowerCase(),createHash('sha256').update(randomUUID()).digest('hex'),eventTypeId]);

  const start = new Date(Date.now()+2*864e5).toISOString().slice(0,10);
  const end = new Date(Date.now()+10*864e5).toISOString().slice(0,10);
  const slots = await cal(`/slots?${new URLSearchParams({start,end,eventTypeId:String(eventTypeId),timeZone:'America/Los_Angeles'})}`, {version:'2024-09-04'});
  const first = Object.values(slots).flat()[0]?.start;
  if (!first) throw new Error('No Cal slots available for a test booking');
  const booked = await cal('/bookings', {method:'POST',body:JSON.stringify({
    start:new Date(first).toISOString(),eventTypeId,
    attendee:{name:'Storefront integration test',email:me.email,timeZone:'America/Los_Angeles',language:'en'},
    location:{type:'address'},
    bookingFieldsResponses:{claim_ref:claimId,seattle_place:'Seattle test — no meetup'},
  })});
  bookingUid = booked.uid;
  console.log('Cal booking request created:', bookingUid || '[UID pending in webhook]');
  let state;
  for (let attempt=0;attempt<20;attempt++) {
    const result = await client.query(`SELECT i.status AS item_status,c.status AS claim_status,c.cal_booking_uid,c.suggested_public_place
      FROM storefront_items i JOIN claim_requests c ON c.item_id=i.id WHERE i.id=$1`,[itemId]);
    state=result.rows[0];
    if (state?.claim_status==='booking_requested') break;
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  console.log('Local webhook state:', JSON.stringify(state));
  if (state?.claim_status!=='booking_requested' || state.item_status!=='pending' || state.suggested_public_place!=='Seattle test — no meetup')
    throw new Error('Cal request did not reach the local claim flow');
} finally {
  const result = await client.query('SELECT cal_booking_uid FROM claim_requests WHERE id=$1',[claimId]);
  bookingUid ||= result.rows[0]?.cal_booking_uid;
  if (bookingUid) {
    try { await cal(`/bookings/${encodeURIComponent(bookingUid)}/decline`,{method:'POST',body:JSON.stringify({reason:'Local integration test complete'})}); }
    catch(error) { console.error('Test booking cleanup failed:',error); }
  }
  await client.query('DELETE FROM claim_events WHERE claim_request_id=$1',[claimId]);
  await client.query('DELETE FROM claim_requests WHERE id=$1',[claimId]);
  await client.query('DELETE FROM storefront_items WHERE id=$1',[itemId]);
  await client.end();
}
