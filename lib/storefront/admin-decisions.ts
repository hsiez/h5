import { FlowError, reopenIfEmpty } from './core';
import { transaction } from './db';

async function callCalConfirm(uid:string) {
  const key=process.env.CAL_API_KEY;
  if (!key) throw new Error('CAL_API_KEY is not configured');
  const response=await fetch(`https://api.cal.com/v2/bookings/${encodeURIComponent(uid)}/confirm`,{
    method:'POST',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${key}`,'cal-api-version':'2026-02-25'}
  });
  if (!response.ok) throw new FlowError(`Cal could not confirm this booking (HTTP ${response.status})`,response.status >= 500 ? 502 : 409);
}

export async function acceptFirstClaim(claimId:string) {
  const uid=await transaction(async client => {
    const pointer=await client.query<{item_id:string}>('SELECT item_id FROM claim_requests WHERE id=$1',[claimId]);
    if (!pointer.rows[0]) throw new FlowError('Claim not found',404);
    const item=await client.query<{status:string}>('SELECT status FROM storefront_items WHERE id=$1 FOR UPDATE',[pointer.rows[0].item_id]);
    const claimRow=await client.query<{item_id:string;status:string;cal_booking_uid:string}>(
      'SELECT item_id,status,cal_booking_uid FROM claim_requests WHERE id=$1 FOR UPDATE',[claimId]);
    const claim=claimRow.rows[0];
    if (item.rows[0]?.status !== 'pending' || claim.status !== 'booking_requested' || !claim.cal_booking_uid)
      throw new FlowError('This claim cannot be accepted now',409);
    const first=await client.query<{id:string}>(`SELECT id FROM claim_requests WHERE item_id=$1 AND status='booking_requested'
      ORDER BY requested_at,id LIMIT 1`,[claim.item_id]);
    if (first.rows[0]?.id !== claimId) throw new FlowError('Review the earliest Cal request first',409);
    const otherApproval=await client.query('SELECT 1 FROM claim_requests WHERE item_id=$1 AND id<>$2 AND approval_started_at IS NOT NULL AND status=\'booking_requested\' LIMIT 1',[claim.item_id,claimId]);
    if (otherApproval.rowCount) throw new FlowError('Another approval is in progress',409);
    await client.query('UPDATE claim_requests SET approval_started_at=now() WHERE id=$1',[claimId]);
    return claim.cal_booking_uid;
  });
  try { await callCalConfirm(uid); }
  catch(error) {
    if (error instanceof FlowError && error.status === 409) {
      await transaction(async client => {
        await client.query("UPDATE claim_requests SET approval_started_at=NULL WHERE id=$1 AND status='booking_requested'",[claimId]);
      });
    }
    throw error;
  }
  const accepted=await transaction(async client => {
    const pointer=await client.query<{item_id:string}>('SELECT item_id FROM claim_requests WHERE id=$1',[claimId]);
    if(!pointer.rows[0])throw new FlowError('Claim not found',404);
    const item=await client.query<{status:string}>('SELECT status FROM storefront_items WHERE id=$1 FOR UPDATE',[pointer.rows[0].item_id]);
    const result=await client.query<{item_id:string;status:string;cal_booking_uid:string}>('SELECT item_id,status,cal_booking_uid FROM claim_requests WHERE id=$1 FOR UPDATE',[claimId]);
    const claim=result.rows[0];
    if(claim.status==='accepted' && item.rows[0].status==='reserved' && claim.cal_booking_uid===uid)return true;
    if(claim.status!=='booking_requested'||item.rows[0].status!=='pending'||claim.cal_booking_uid!==uid) {
      await client.query("INSERT INTO storefront_jobs(kind,item_id,uid,booking_status) VALUES('cal_cancel',$1,$2,'accepted') ON CONFLICT DO NOTHING",[claim.item_id,uid]);
      return false;
    }
    await client.query("UPDATE claim_requests SET status='accepted',updated_at=now() WHERE id=$1 AND status='booking_requested'",[claimId]);
    await client.query("UPDATE storefront_items SET status='reserved',updated_at=now() WHERE id=$1 AND status='pending'",[claim.item_id]);
    await client.query("UPDATE claim_requests SET status='expired' WHERE item_id=$1 AND status='link_sent'",[claim.item_id]);
    return true;
  });
  if(!accepted)throw new FlowError('The request changed while Cal was confirming it. Cancellation has been queued.',409);
}

export async function declineClaim(claimId:string, reason:string) {
  return transaction(async client=>{
    const pointer=await client.query('SELECT item_id FROM claim_requests WHERE id=$1',[claimId]);
    if(!pointer.rowCount)throw new FlowError('Claim not found',404);
    await client.query('SELECT id FROM storefront_items WHERE id=$1 FOR UPDATE',[pointer.rows[0].item_id]);
    const claim=(await client.query('SELECT * FROM claim_requests WHERE id=$1 FOR UPDATE',[claimId])).rows[0];
    if(!['booking_requested','accepted'].includes(claim.status))throw new FlowError('Claim cannot be declined now',409);
    await client.query("UPDATE claim_requests SET status=$2,approval_started_at=NULL,updated_at=now() WHERE id=$1",[claimId,claim.status==='accepted'?'canceled':'declined']);
    await client.query("INSERT INTO storefront_jobs(kind,item_id,uid,booking_status) VALUES('cal_cancel',$1,$2,$3) ON CONFLICT DO NOTHING",[claim.item_id,claim.cal_booking_uid,claim.status]);
    await client.query("INSERT INTO claim_events(claim_request_id,action,actor) VALUES($1,$2,'admin')",[claimId,reason?'DECLINED_BY_OWNER_WITH_REASON':'DECLINED_BY_OWNER']);
    await reopenIfEmpty(client,claim.item_id);
  });
}

// An indeterminate confirmation stays visible until an owner explicitly reconciles it.
export async function recoverApproval(claimId:string) {
  const result=await transaction(async client=>{
    const pointer=await client.query('SELECT item_id FROM claim_requests WHERE id=$1',[claimId]);
    if(!pointer.rowCount)throw new FlowError('Claim not found',404);
    await client.query('SELECT id FROM storefront_items WHERE id=$1 FOR UPDATE',[pointer.rows[0].item_id]);
    const claim=(await client.query("SELECT * FROM claim_requests WHERE id=$1 AND status='booking_requested' AND approval_started_at<now()-interval '2 minutes' FOR UPDATE",[claimId])).rows[0];
    if(!claim)throw new FlowError('No stalled approval to reconcile',409);
    return claim;
  });
  if(!process.env.CAL_API_KEY)throw Error('CAL_API_KEY is not configured');
  const response=await fetch(`https://api.cal.com/v2/bookings/${encodeURIComponent(result.cal_booking_uid)}`,{headers:{Authorization:`Bearer ${process.env.CAL_API_KEY}`,'cal-api-version':'2026-02-25'},signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new FlowError('Cal status lookup failed; keep this request for manual review',502);
  const {data}=await response.json();const status=String(data?.status||'').toLowerCase();
  const {applyCalEvent}=await import('./core');
  if(['accepted','cancelled','canceled','rejected'].includes(status))await applyCalEvent({triggerEvent:status==='accepted'?'BOOKING_CREATED':status==='rejected'?'BOOKING_REJECTED':'BOOKING_CANCELLED',createdAt:new Date().toISOString(),payload:{uid:result.cal_booking_uid,eventTypeId:result.cal_event_type_id,attendees:[{email:result.email}]}});
  else if(status==='pending')await transaction(async client=>{
    await client.query('SELECT id FROM storefront_items WHERE id=$1 FOR UPDATE',[result.item_id]);
    await client.query("UPDATE claim_requests SET approval_started_at=NULL WHERE id=$1 AND status='booking_requested' AND approval_started_at=$2",[claimId,result.approval_started_at]);
  });
  else throw new FlowError('Unexpected Cal status; review the booking in Cal before deciding',409);
}
