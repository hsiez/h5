import { FlowError } from './core';
import { transaction } from './db';
import { declineCalBooking } from './cal';

async function callCalConfirm(uid:string) {
  const key=process.env.CAL_API_KEY;
  if (!key) throw new Error('CAL_API_KEY is not configured');
  const response=await fetch(`https://api.cal.com/v2/bookings/${encodeURIComponent(uid)}/confirm`,{
    method:'POST',headers:{Authorization:`Bearer ${key}`,'cal-api-version':'2026-02-25'}
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
  await transaction(async client => {
    const claim=await client.query<{item_id:string;status:string}>('SELECT item_id,status FROM claim_requests WHERE id=$1',[claimId]);
    if (!claim.rows[0]) throw new FlowError('Claim not found',404);
    await client.query('SELECT id FROM storefront_items WHERE id=$1 FOR UPDATE',[claim.rows[0].item_id]);
    if (claim.rows[0].status === 'accepted') return;
    if (claim.rows[0].status !== 'booking_requested') throw new FlowError('Claim changed during confirmation',409);
    await client.query("UPDATE claim_requests SET status='accepted',updated_at=now() WHERE id=$1",[claimId]);
    await client.query("UPDATE storefront_items SET status='reserved',updated_at=now() WHERE id=$1 AND status='pending'",[claim.rows[0].item_id]);
  });
}

export async function declineClaim(claimId:string, reason:string) {
  const claim=await transaction(async client => {
    const result=await client.query<{item_id:string;status:string;cal_booking_uid:string;email:string;cal_event_type_id:number}>(
      'SELECT item_id,status,cal_booking_uid,email,cal_event_type_id FROM claim_requests WHERE id=$1',[claimId]);
    if (!result.rows[0] || result.rows[0].status !== 'booking_requested') throw new FlowError('Claim cannot be declined now',409);
    return result.rows[0];
  });
  await declineCalBooking(claim.cal_booking_uid,reason || 'The item is unavailable');
  const { applyCalEvent } = await import('./core');
  await applyCalEvent({triggerEvent:'BOOKING_REJECTED',createdAt:new Date().toISOString(),payload:{
    uid:claim.cal_booking_uid,eventTypeId:claim.cal_event_type_id,attendees:[{email:claim.email}]
  }});
}
