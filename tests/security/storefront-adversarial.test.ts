import { afterAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '../../lib/storefront/db';
import { startClaim, applyCalEvent, subscribeToAvailability, unsubscribeAvailability, newToken, resolveClaimLink, completeHandoff, verifyAvailability, reopenItem } from '../../lib/storefront/core';
import { deliverPendingEmail } from '../../lib/storefront/email';
import { processJobs } from '../../lib/storefront/worker';
import { acceptFirstClaim, declineClaim, recoverApproval } from '../../lib/storefront/admin-decisions';
import { POST as claimPost } from '../../app/api/storefront/items/[slug]/claim/route';
import { POST as alertPost } from '../../app/api/storefront/items/[slug]/alert/route';
import { POST as webhookPost } from '../../app/api/storefront/webhooks/cal/route';
import { GET as cronGet } from '../../app/api/cron/storefront/route';
import { GET as adminQueue } from '../../app/api/admin/storefront/outbox/route';
import { createHmac } from 'node:crypto';
vi.mock('next/server',()=>({after:vi.fn()}));

const sent:{to:string;subject:string}[]=[];
async function item() {
  const slug=`audit-${randomUUID()}`;
  const result=await db().query(`INSERT INTO storefront_items(slug,title,status,published_at,region_id,adoption_enabled,publication_status) VALUES($1,'Audit item','available',now(),'things-for-you',true,'published') RETURNING id`,[slug]);
  return {id:result.rows[0].id as string,slug};
}
function event(kind:string,claim:{claimId:string;email:string},uid:string,time=new Date().toISOString()) {
  return {triggerEvent:kind,createdAt:time,payload:{uid,eventTypeId:12345,attendees:[{email:claim.email}],bookingFieldsResponses:{claim_ref:claim.claimId},startTime:new Date(Date.now()+86400000).toISOString()}};
}
function request(slug:string,email:unknown,action:string,headers:Record<string,string>={}) {
  return new Request(`https://h5.codes/api/storefront/items/${slug}/${action}`,{method:'POST',headers:{origin:'https://h5.codes','Content-Type':'application/json',...headers},body:JSON.stringify({email,acknowledged:true})});
}
async function subscribe(slug:string,email='subscriber@example.invalid') {
  const id=(await subscribeToAvailability(slug,email))!;
  await verifyAvailability(newToken(id));
  return id;
}
async function pending() {
  const target=await item(),claim=await startClaim(target.slug,'claimant@example.invalid');
  await applyCalEvent(event('BOOKING_REQUESTED',claim,'audit-booking'));
  return {target,claim};
}
describe.skipIf(!process.env.TEST_DATABASE_URL)('claim-flow security regressions in isolated Postgres',()=>{
  beforeEach(async()=>{
    await db().query('TRUNCATE storefront_items,storefront_rate_limits CASCADE');sent.length=0;
    vi.stubGlobal('fetch',vi.fn(async (url,init)=>{
      if(String(url).includes('api.resend.com')){sent.push(JSON.parse(String(init?.body||'{}')));return Response.json({id:'audit-email'});}
      return Response.json({data:{status:'pending'}});
    }));
  });
  afterEach(()=>vi.unstubAllGlobals());
  afterAll(async()=>{await db().end();});
  it('rejects drive-by requests, oversized bodies and bad email types before creating jobs',async()=>{
    const target=await item();
    for(const [headers,status] of [[{origin:'https://untrusted.example'},403],[{'Content-Type':'text/plain'},415],[{'content-length':'9000'},413]] as [Record<string,string>,number][])
      expect((await claimPost(request(target.slug,'victim@example.invalid','claim',headers),{params:Promise.resolve({slug:target.slug})})).status).toBe(status);
    expect((await claimPost(request(target.slug,{},'claim'),{params:Promise.resolve({slug:target.slug})})).status).toBe(400);
    expect((await db().query('SELECT count(*)::int AS n FROM storefront_outbox')).rows[0].n).toBe(0);
  });
  it('enforces an aggregate IP budget even when recipients rotate',async()=>{
    const target=await item();
    for(let i=0;i<10;i++)expect((await claimPost(request(target.slug,`victim${i}@example.invalid`,'claim'),{params:Promise.resolve({slug:target.slug})})).status).toBe(200);
    expect((await claimPost(request(target.slug,'extra@example.invalid','claim'),{params:Promise.resolve({slug:target.slug})})).status).toBe(429);
    expect(sent).toHaveLength(0); // Endpoint never drains the unrelated global queue.
  });
  it('requires and records the client acknowledgment',async()=>{
    const target=await item();
    const missing=new Request(`https://h5.codes/api/storefront/items/${target.slug}/claim`,{method:'POST',headers:{origin:'https://h5.codes','Content-Type':'application/json'},body:JSON.stringify({email:'person@example.invalid'})});
    expect((await claimPost(missing,{params:Promise.resolve({slug:target.slug})})).status).toBe(400);
    expect((await claimPost(request(target.slug,'person@example.invalid','claim'),{params:Promise.resolve({slug:target.slug})})).status).toBe(200);
    expect((await db().query('SELECT acknowledged_at FROM claim_requests')).rows[0].acknowledged_at).not.toBeNull();
  });
  it('returns neutral eligibility responses and limits a recipient across items and IPs',async()=>{
    const target=await item();await db().query("UPDATE storefront_items SET status='pending' WHERE id=$1",[target.id]);
    for(let i=0;i<3;i++)expect((await claimPost(request(target.slug,'victim@example.invalid','claim',{'x-forwarded-for':`192.0.2.${i}`}),{params:Promise.resolve({slug:target.slug})})).status).toBe(200);
    expect((await claimPost(request(target.slug,'victim@example.invalid','claim',{'x-forwarded-for':'192.0.2.100'}),{params:Promise.resolve({slug:target.slug})})).status).toBe(429);
  });
  it('keeps the original link and one-hour expiry across repeated submissions',async()=>{
    const target=await item(),victim=await startClaim(target.slug,'victim@example.invalid');
    const before=(await db().query('SELECT token_expires_at,created_at FROM claim_requests WHERE id=$1',[victim.claimId])).rows[0];
    for(let i=0;i<5;i++)expect((await startClaim(target.slug,victim.email)).claimId).toBe(victim.claimId);
    expect((await db().query('SELECT count(*)::int AS n FROM storefront_outbox')).rows[0].n).toBe(1);
    expect((await db().query('SELECT token_expires_at FROM claim_requests WHERE id=$1',[victim.claimId])).rows[0].token_expires_at).toEqual(before.token_expires_at);
    expect(before.token_expires_at-before.created_at).toBe(3600000);
    await expect(resolveClaimLink(victim.token)).resolves.toContain(victim.claimId);
  });
  it('does not turn unverified notification registrations into availability emails',async()=>{
    const {target}=await pending();
    expect((await alertPost(request(target.slug,'subscriber@example.invalid','alert'),{params:Promise.resolve({slug:target.slug})})).status).toBe(200);
    await reopenItem(target.id);await processJobs();await deliverPendingEmail();
    expect(sent).toEqual([{...sent[0],to:'subscriber@example.invalid',subject:'Confirm your availability notification'}]);
    expect((await db().query("SELECT count(*)::int AS n FROM storefront_outbox WHERE kind='availability_alert'")).rows[0].n).toBe(0);
  });
  it('cancels queued availability mail and its unused claim when unsubscribed',async()=>{
    const {target}=await pending();const sub=await subscribe(target.slug);
    await reopenItem(target.id);await processJobs();
    expect((await db().query("SELECT count(*)::int AS n FROM storefront_outbox WHERE kind='availability_alert'")).rows[0].n).toBe(1);
    await unsubscribeAvailability(newToken(sub));await deliverPendingEmail();
    expect(sent).toHaveLength(0);
    expect((await db().query("SELECT canceled_at,claim_request_id FROM storefront_outbox WHERE kind='availability_alert'")).rows[0]).toMatchObject({canceled_at:expect.any(Date),claim_request_id:null});
  });
  it('consumes a verified subscription after one availability email',async()=>{
    const {target}=await pending();const sub=await subscribe(target.slug);
    await reopenItem(target.id);await processJobs();await deliverPendingEmail();
    expect(sent.filter(mail=>mail.to==='subscriber@example.invalid')).toHaveLength(1);
    expect((await db().query('SELECT fulfilled_at FROM item_availability_alerts WHERE id=$1',[sub])).rows[0].fulfilled_at).not.toBeNull();
    const second=await startClaim(target.slug,'second@example.invalid');await applyCalEvent(event('BOOKING_REQUESTED',second,'second-booking'));
    await reopenItem(target.id);await processJobs();await deliverPendingEmail();
    expect(sent.filter(mail=>mail.to==='subscriber@example.invalid')).toHaveLength(1);
  });
  it('includes late verification after the reopening fan-out has completed',async()=>{
    const {target}=await pending();const sub=(await subscribeToAvailability(target.slug,'late@example.invalid'))!;
    await reopenItem(target.id);await processJobs();await verifyAvailability(newToken(sub));await processJobs();await deliverPendingEmail();
    expect(sent.filter(mail=>mail.to==='late@example.invalid'&&mail.subject.includes('available again'))).toHaveLength(1);
  });
  it('does not let unsendable old jobs starve newer mail',async()=>{
    const blocked=await item();let first:Awaited<ReturnType<typeof startClaim>>|undefined;
    for(let i=0;i<20;i++){const claim=await startClaim(blocked.slug,`old${i}@example.invalid`);first??=claim;}
    await applyCalEvent(event('BOOKING_REQUESTED',first!,'blocking-booking'));
    const available=await item(),victim=await startClaim(available.slug,'waiting@example.invalid');
    expect(await deliverPendingEmail()).toBe(1);
    expect((await db().query('SELECT sent_at FROM storefront_outbox WHERE claim_request_id=$1',[victim.claimId])).rows[0].sent_at).not.toBeNull();
  });
  it('isolates a failed provider job and schedules retries with a stable payload/key',async()=>{
    const target=await item();await startClaim(target.slug,'retry@example.invalid');await startClaim(target.slug,'healthy@example.invalid');
    const attempts:{key:string;body:string}[]=[];
    vi.stubGlobal('fetch',async (_url:RequestInfo|URL,init?:RequestInit)=>{const body=JSON.parse(String(init?.body));if(body.to==='retry@example.invalid'){attempts.push({key:(init?.headers as Record<string,string>)['Idempotency-Key'],body:String(init?.body)});return new Response('',{status:503});}sent.push(body);return Response.json({id:'ok'});});
    expect(await deliverPendingEmail()).toBe(1);expect(sent[0].to).toBe('healthy@example.invalid');
    const retry=(await db().query("SELECT * FROM storefront_outbox WHERE sent_at IS NULL AND canceled_at IS NULL")).rows[0];
    expect(retry.attempts).toBe(1);expect(retry.next_attempt_at.getTime()).toBeGreaterThan(Date.now());
    await db().query('UPDATE storefront_outbox SET next_attempt_at=now() WHERE id=$1',[retry.id]);await deliverPendingEmail();
    expect(attempts[0]).toEqual(attempts[1]);
  });
  it('leases mail so two workers cannot send the same job concurrently',async()=>{
    const target=await item();await startClaim(target.slug,'once@example.invalid');
    await Promise.all([deliverPendingEmail(),deliverPendingEmail()]);expect(sent).toHaveLength(1);
  });
  it('releases losing claimants and durably queues their Cal cleanup after handoff',async()=>{
    const target=await item(),another=await item();
    const winner=await startClaim(target.slug,'winner@example.invalid'),loser=await startClaim(target.slug,'loser@example.invalid');
    await applyCalEvent(event('BOOKING_REQUESTED',winner,'winner-booking',new Date(Date.now()-1000).toISOString()));await applyCalEvent(event('BOOKING_REQUESTED',loser,'loser-booking'));
    await applyCalEvent(event('BOOKING_CREATED',winner,'winner-booking'));await completeHandoff(target.id,'audit-photo.webp','Audit photo',true);
    expect((await db().query('SELECT status FROM claim_requests WHERE id=$1',[loser.claimId])).rows[0].status).toBe('canceled');
    await expect(startClaim(another.slug,loser.email)).resolves.toBeDefined();
    expect((await db().query("SELECT uid FROM storefront_jobs WHERE kind='cal_cancel'")).rows[0].uid).toBe('loser-booking');
  });
  it('retains old pending/reserved bookings for manual review but invalidates unused links on reservation',async()=>{
    const target=await item(),claim=await startClaim(target.slug,'old@example.invalid'),other=await startClaim(target.slug,'other@example.invalid');
    await applyCalEvent(event('BOOKING_REQUESTED',claim,'old-booking'));await db().query("UPDATE claim_requests SET token_expires_at=now()-interval '14 days',requested_at=now()-interval '14 days' WHERE id=$1",[claim.claimId]);
    await processJobs();expect((await db().query('SELECT status FROM storefront_items WHERE id=$1',[target.id])).rows[0].status).toBe('pending');
    await applyCalEvent(event('BOOKING_CREATED',claim,'old-booking'));await expect(resolveClaimLink(other.token)).rejects.toThrow('expired');
    await applyCalEvent(event('BOOKING_CANCELLED',claim,'old-booking'));expect((await db().query('SELECT status FROM storefront_items WHERE id=$1',[target.id])).rows[0].status).toBe('reserved');
    await reopenItem(target.id);expect((await db().query('SELECT status FROM storefront_items WHERE id=$1',[target.id])).rows[0].status).toBe('available');
  });
  it('declines through Admin atomically and queues remote cleanup',async()=>{
    const {target,claim}=await pending();await declineClaim(claim.claimId,'Owner decision');
    expect((await db().query('SELECT status FROM storefront_items WHERE id=$1',[target.id])).rows[0].status).toBe('available');
    expect((await db().query("SELECT count(*)::int AS n FROM storefront_jobs WHERE kind='cal_cancel'")).rows[0].n).toBe(1);
  });
  it('rejects extra Cal UIDs, acknowledges exact replays, and persists cleanup through the signed webhook',async()=>{
    const {claim}=await pending();expect(await applyCalEvent(event('BOOKING_REQUESTED',claim,'audit-booking'))).toMatchObject({ignored:true});
    await expect(applyCalEvent(event('BOOKING_REQUESTED',claim,'second-booking'))).rejects.toThrow('already used');
    const raw=JSON.stringify(event('BOOKING_REQUESTED',claim,'second-booking'));
    const signature=createHmac('sha256',process.env.CAL_WEBHOOK_SECRET!).update(raw).digest('hex');
    expect((await webhookPost(new Request('https://h5.codes/api/storefront/webhooks/cal',{method:'POST',headers:{'x-cal-signature-256':signature},body:raw}))).status).toBe(200);
    expect((await db().query("SELECT uid FROM storefront_jobs WHERE kind='cal_cancel'")).rows[0].uid).toBe('second-booking');
  });
  it('recovers an indeterminate approval by checking live Cal status',async()=>{
    const {target,claim}=await pending();await db().query("UPDATE claim_requests SET approval_started_at=now()-interval '3 minutes' WHERE id=$1",[claim.claimId]);
    vi.stubGlobal('fetch',async()=>Response.json({data:{status:'accepted'}}));await recoverApproval(claim.claimId);
    expect((await db().query('SELECT status FROM storefront_items WHERE id=$1',[target.id])).rows[0].status).toBe('reserved');
  });
  it('serializes availability delivery across overlapping reopening events',async()=>{
    const {target}=await pending();await subscribe(target.slug);await reopenItem(target.id);await processJobs();
    let sending!:()=>void,release!:()=>void;
    const began=new Promise<void>(resolve=>{sending=resolve;});const held=new Promise<void>(resolve=>{release=resolve;});
    vi.stubGlobal('fetch',async (_url:RequestInfo|URL,init?:RequestInit)=>{
      sent.push(JSON.parse(String(init?.body)));sending();await held;return Response.json({id:'accepted'});
    });
    const first=deliverPendingEmail(1);await began;
    try {
      const next=await startClaim(target.slug,'next@example.invalid');await applyCalEvent(event('BOOKING_REQUESTED',next,'next-event'));await reopenItem(target.id);
      // Leave the mocked provider's in-flight call intact; fan-out itself has no network.
      await db().query("UPDATE storefront_jobs SET done_at=now() WHERE kind='cal_cancel'");await processJobs();
      expect(await deliverPendingEmail(1)).toBe(0);expect(sent).toHaveLength(1);
    }finally{release();await first;}
    await db().query('UPDATE storefront_outbox SET next_attempt_at=now()');await deliverPendingEmail();expect(sent).toHaveLength(1);
  });
  it('bounds fan-out to twenty recipients and deduplicates subsequent passes',async()=>{
    const {target}=await pending();
    for(let i=0;i<21;i++)await subscribe(target.slug,`batch${i}@example.invalid`);
    await reopenItem(target.id);
    // Remove no-op Cal cleanup to isolate one fan-out pass.
    await db().query("UPDATE storefront_jobs SET done_at=now() WHERE kind='cal_cancel'");
    await processJobs(1);
    expect((await db().query("SELECT count(*)::int AS n FROM storefront_outbox WHERE kind='availability_alert'")).rows[0].n).toBe(20);
    await processJobs(1);await processJobs(1);
    expect((await db().query("SELECT count(*)::int AS n FROM storefront_outbox WHERE kind='availability_alert'")).rows[0].n).toBe(21);
  });
  it('serializes simultaneous booking requests for the same email across items',async()=>{
    const a=await item(),b=await item();
    const first=await startClaim(a.slug,'same@example.invalid'),second=await startClaim(b.slug,'same@example.invalid');
    const results=await Promise.allSettled([applyCalEvent(event('BOOKING_REQUESTED',first,'same-1')),applyCalEvent(event('BOOKING_REQUESTED',second,'same-2'))]);
    expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);
    expect((await db().query("SELECT count(*)::int AS n FROM claim_requests WHERE status='booking_requested'")).rows[0].n).toBe(1);
  });
  it('stops permanent delivery errors and refuses to send expired links',async()=>{
    const target=await item();const expired=await startClaim(target.slug,'expired@example.invalid');await startClaim(target.slug,'bad@example.invalid');
    await db().query("UPDATE claim_requests SET token_expires_at=now()-interval '1 second' WHERE id=$1",[expired.claimId]);
    let calls=0;vi.stubGlobal('fetch',async()=>{calls++;return new Response('',{status:400});});
    await deliverPendingEmail();await deliverPendingEmail();expect(calls).toBe(1);
    expect((await db().query("SELECT count(*)::int AS n FROM storefront_outbox WHERE failed_at IS NOT NULL")).rows[0].n).toBe(1);
    await expect(resolveClaimLink(expired.token)).rejects.toThrow('expired');
  });
  it('queues cleanup for a late reschedule of a canceled request',async()=>{
    const {target,claim}=await pending();await reopenItem(target.id);
    const rescheduled=event('BOOKING_RESCHEDULED',claim,'late-reschedule');
    await applyCalEvent({...rescheduled,payload:{...rescheduled.payload,rescheduleUid:'audit-booking'}});
    expect((await db().query("SELECT count(*)::int AS n FROM storefront_jobs WHERE uid='late-reschedule'")).rows[0].n).toBe(1);
  });
  it('fails closed for unauthorized cron and Admin access',async()=>{
    expect((await cronGet(new Request('https://h5.codes/api/cron/storefront'))).status).toBe(401);
    expect((await adminQueue(new Request('https://h5.codes/api/admin/storefront/outbox'))).status).toBe(401);
  });
  it('cannot resurrect a canceled claim during confirmation',async()=>{
    const {target,claim}=await pending(),blocker=await db().connect();
    let reached!:()=>void;const started=new Promise<void>(resolve=>{reached=resolve;});
    vi.stubGlobal('fetch',async()=>{
      await blocker.query('BEGIN');await blocker.query('SELECT id FROM storefront_items WHERE id=$1 FOR UPDATE',[target.id]);
      await blocker.query("UPDATE claim_requests SET status='canceled' WHERE id=$1",[claim.claimId]);await blocker.query("UPDATE storefront_items SET status='available' WHERE id=$1",[target.id]);reached();return Response.json({ok:true});
    });
    const accepting=acceptFirstClaim(claim.claimId).then(()=>null,error=>error);
    try {
      await started;let waiting=false;
      for(let i=0;i<100;i++){
        const result=await db().query("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='storefront-security-audit' AND wait_event_type='Lock' AND query='SELECT status FROM storefront_items WHERE id=$1 FOR UPDATE') AS waiting");
        if(result.rows[0].waiting){waiting=true;break;}await new Promise(resolve=>setTimeout(resolve,10));
      }
      expect(waiting).toBe(true);await blocker.query('COMMIT');expect(await accepting).toMatchObject({status:409});
      expect((await db().query('SELECT status FROM claim_requests WHERE id=$1',[claim.claimId])).rows[0].status).toBe('canceled');
      expect((await db().query('SELECT status FROM storefront_items WHERE id=$1',[target.id])).rows[0].status).toBe('available');
      expect((await db().query("SELECT count(*)::int AS n FROM storefront_jobs WHERE kind='cal_cancel'")).rows[0].n).toBe(1);
    }finally{await blocker.query('ROLLBACK');blocker.release();await accepting;}
  });
});
