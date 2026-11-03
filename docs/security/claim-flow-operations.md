# Claim flow: lifecycle, delivery and operations

This is the implementation follow-up to [the original adversarial review](claim-flow-review.md). The review preserves the old failure cases; the regression tests now assert prevention.

## Product policy

- Email entry never holds an item. Unused claim links expire one hour after **creation**, even after repeated submissions. A repeat request reuses the active token and does not invalidate a recipient's email or extend its expiry.
- A valid Cal request makes the item pending. Pending requests have **no automatic deadline**: the owner reviews them in Admin, earliest first.
- An accepted request reserves the item indefinitely, until the participant or owner cancels it, or the owner completes the handoff in Admin.
- Cancellation from either the original claim email or Cal releases that claim and recalculates inventory in the same database transaction. The original email remains a cancellation capability for an active booking even after its one-hour scheduling link expires; opening the cancellation page does not mutate state, and a POST confirmation is required. Remaining accepted claims keep it reserved; remaining booking requests keep it pending; with none left, it becomes available and queues one notification event. Rejections follow the same rule. Pending requests do not expire just because their email token expires.
- Reopening cancels outstanding requests and unused links. It commits one availability event in the same transaction. Cal cleanup and notification fan-out run later, with retries. The Admin screen shows when remote work is still outstanding.
- Handoff completes only the winner. Losing requests are closed locally, their unused emails are canceled, and their remaining Cal meetings are queued for cancellation. Losing claimants can then claim other items.
- “One item per person” is implemented per normalized email address. It is not proof of a unique human. Aliases and multiple mailboxes are a remaining product limitation.

## What a notification signup does

1. The visitor enters an email on a pending/reserved item. The server queues a verification message; it does not add an eligible notification recipient yet.
2. The message opens a confirmation page. **GET does not opt in** (mail scanners can open links); the recipient presses Confirm notification. Verification expires in one hour. Repeat submissions reuse the active confirmation, without refreshing its deadline.
3. A verified subscription waits until the item becomes available again. This is not a queue position, reservation, or guarantee.
4. A database job processes at most 20 subscribers per transaction, creating versioned email jobs. Notification claim tokens are issued just before the first delivery attempt, so a backlog does not consume their one-hour lifetime before sending. Reopening inventory never loops over all subscribers while holding the item lock.
5. The email worker rechecks publication, available state, link expiry, event version, verification and unsubscribe status before sending. After Resend accepts the availability email, it marks the subscription fulfilled and inactive. Another reopening will not send a second email to that subscription. A later signup is a new opt-in.
6. Unsubscribe cancels unsent notification jobs and their unused generated claim links. A request already handed to the mail provider cannot be recalled. This unavoidable network boundary is why the worker checks again immediately before handing it off.

Confirmation arriving after an availability job finished schedules another bounded pass for the current event. Old pre-verification subscribers are **not grandfathered into consent**; they must submit again and confirm. The migration expires those legacy confirmations without sending unsolicited verification mail.

## What the worker is

The worker is ordinary server code invoked by a scheduled Vercel request: `/api/cron/storefront`. PostgreSQL stores the work, so a crash/redeploy does not discard it. No additional queue vendor is required.

Public submissions use Next's `after()` to attempt **only their own message** after returning the response. A failed or interrupted attempt stays in the database. Cron provides the independent retry path. The public endpoint never drains everybody else's queue.

Both email and background jobs use five-minute leases and row locks with `SKIP LOCKED`. Overlapping invocations can work on different rows. A per-subscription lease check also serializes mail from different availability versions while a provider call is in flight. Network calls have ten-second deadlines and run without an inventory lock. Email retries use bounded exponential backoff; permanent provider errors or eight failed attempts stop in Admin for review. A job's message envelope and provider idempotency key are fixed across retries. Claim/verification expiry still applies to retries; expired mail is canceled rather than sent with a useless link.

For cancellation through the original email, inventory is released immediately and a durable Cal cleanup job is committed in the same transaction. Cal cleanup first reads remote status, then declines pending bookings or cancels accepted bookings. A retry recognizes an already canceled/rejected booking. A genuinely signed second booking UID for an already used claim is queued for cleanup; exact same-UID replays are acknowledged. If confirmation races with a cancellation/reopening, local state is re-read under item-then-claim locks, and a cancellation job reconciles the external confirmation rather than resurrecting the request.

A confirmation that times out stays visible as in progress. After two minutes, **Reconcile approval** reads Cal's actual status: accepted becomes reserved, canceled/rejected releases the claim and recalculates inventory, and still-pending clears the marker so the owner can retry. Do not confirm a different claimant while the first approval is unresolved.

## Abuse limits and their tradeoffs

These limits are shared database counters, not per-server memory:

| Scope | Current budget |
| --- | --- |
| Public claim/notify IP | 10 attempts / 15 minutes |
| Public recipient across items/IPs | 3 attempts / hour |
| Public item | 60 attempts / hour |
| Public aggregate | 200 attempts / hour |
| Outbound mail aggregate | 300 attempts / hour |
| Admin login aggregate | 100 attempts / 15 minutes, plus existing 8/IP |
| Active notification list | 1,000 per item, counting verified and unexpired verification requests |
| JSON request body | 4 KiB |
| Signed Cal webhook body | 64 KiB |

The same-origin/JSON guards stop browser drive-by requests; they are not bot authentication. IPs come from Vercel's overwritten forwarding header. Another reverse proxy must strip attacker-supplied forwarding headers before trusting it. Public acknowledgment does not reveal prior participation or item eligibility. Claim acknowledgment is checked server-side and timestamped, but is not enforceable identity verification.

Budgets cap sender cost/volume but can themselves be exhausted by distributed attackers. Knowing an address can still consume its request allowance; it cannot revoke its existing link. There is no CAPTCHA/MFA vendor integrated. Use Vercel Firewall/challenges and provider account limits for traffic that exceeds the site's expected volume. Limits are in `lib/storefront/admission.ts`; adjust using actual usage, not an unbounded bypass.

## Deployment steps (not performed automatically)

1. Back up the target database. Run `scripts/storefront-migrate.mjs` with the **migration/owner** connection, applying `006_claim_safety.sql` before serving the new application. Rerunning preserves pending/reserved requests. Unused legacy links become at most one hour from their original creation.
2. Keep Cal, Resend, link-secret, base-URL and sender settings configured. Set `CRON_SECRET` to a long random server secret. The existing papers cron uses the same secret. Never expose these as `NEXT_PUBLIC_*`.
3. Deploy the minute schedule from `vercel.json` and verify successful cron invocations. **Vercel Hobby only supports daily cron**, which is inadequate for one-hour links; this schedule requires a plan supporting minute-frequency cron, or a trusted scheduler invoking the same authenticated endpoint. Check the actual account before enabling in production.
4. Give the app a dedicated runtime DB role; keep owner credentials only for migrations. See [the example grants](runtime-role.sql). Runtime should have no ownership, DDL, CREATEROLE, CREATEDB or BYPASSRLS. If using a separate migration connection, do not also leave that owner URL in runtime Vercel environment variables.
5. Use a pooled runtime database URL with `sslmode=verify-full`. The app preserves today's pg certificate-verifying behavior for legacy require/prefer/verify-ca URLs unless explicit libpq compatibility is requested. Pool size is five **per process**, so deployment-wide pooling/connection limits still matter.
6. In Admin, verify queue age and failures, exercise a test mailbox + test Cal booking, confirm the notification email, and manually reopen the test item. A provider acceptance means accepted for delivery, not guaranteed inbox delivery; review Resend bounces/suppressions separately.

No live emails, real Cal bookings, production database permissions or Vercel settings are changed by the automated tests. No production migration is implied by a passing build.

## Production verification: November 3, 2026

Read-only checks through the authenticated Vercel CLI confirmed:

- Project `h5` belongs to `hsiezars-projects`, on Pro. The live production deployment was Ready.
- Production has the required claim-flow environment variable names, including `CRON_SECRET`, Cal, Resend, link secret and admin hash. Presence is verified; sensitive secret values cannot be retrieved from Vercel and were not validated by sending real requests.
- Only the papers cron is currently deployed. The storefront minute schedule remains a local change.
- The actual production `DATABASE_URL` connects as `neondb_owner`: database/table owner, CREATEROLE, CREATEDB, BYPASSRLS and schema CREATE. A restricted runtime role is still required. Owner credentials also exist under integration-provided environment variable names; remove owner credentials from the runtime environment rather than changing only the primary URL.
- The database connection was encrypted. The URL currently specifies `sslmode=require`; the application change preserves certificate verification explicitly.
- Production does not yet have the jobs/rate-limit tables, subscription verification column or email leases from migration 006. This matches the fact that this implementation has not been deployed.

These checks used read-only database transactions. No production records, environment variables, permissions, firewall settings or deployments were changed. A firewall configuration read returned not found; that alone does not establish which platform-level protections are active.

## Daily Admin operations

The Things for you section shows active requests, cancellation history indicators, confirmed subscriber count, email queue size/oldest age, pending background jobs and stopped jobs. Accept/decline requests in order. Use Cancel reservation for an accepted request; use Reopen item to explicitly abandon remaining requests. Complete handoff with the photo/consent when finished. Process a batch now is a manual fallback, not a substitute for a working cron. Retry a stopped job only after correcting its error. An expired message cannot be revived by retrying it; the recipient needs a fresh submission.

The application does not automatically delete pending/reserved histories. Expired unverified notification requests are made inactive by cron. Expired rate counters are removed after a day. Historical claims, events and delivery records remain for operations; set a separate personal-data retention policy before broadening public use.

## Verification

```sh
node --env-file=.env.local scripts/storefront-security-audit.mjs
node --env-file=.env.local scripts/catalog-test.mjs
npx tsc --noEmit
npm run build
```

Both integration runners create random temporary schemas, inject dummy delivery keys and mock external delivery, then drop the schemas. They do not test Vercel's real IP headers, account plan, production grants, Cal configuration or inbox delivery.

References: [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing), [cron authentication and overlapping runs](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [Cal decline](https://cal.com/docs/api-reference/v2/bookings/decline-a-booking), [Cal cancel](https://cal.com/docs/api-reference/v2/bookings/cancel-a-booking), [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Isolated local database: November 3, 2026

Local `.env.local` now points to the separate database `h5_local_20261103_0e84e453`. Migration 006 is applied there. The app uses restricted role `h5_local_0e84e453`; migration/test URLs use the owner connection to this **local test database**, not the production database. The restricted role has no CREATEDB, CREATEROLE, BYPASSRLS or schema CREATE privilege.

The database contains copies of the 12 published catalog items and their existing image references. All local items start available. No production claims, subscriptions, sessions, drafts or handoffs were copied. Sign in to local Admin again. Existing Blob images and Cal/Resend services are still shared integrations; database isolation does not create a test Cal event type, reroute Cal webhooks or create a mail sandbox. Full local booking tests require a webhook route to this server or controlled simulated events. Use Admin's Process a batch now for local queued work; Vercel cron does not run on localhost.

Verified `/things`, authenticated Admin item listing and delivery status all return 200 using the restricted account. The local database has zero claims/jobs/emails initially. A separate read-only production check confirmed migration 006 remains absent there. No Vercel settings or production application records were changed.

## Cancellation policy correction: November 3, 2026

The previous release recorded Cal cancellations while deliberately retaining inventory for manual review, and its original-email cancel route only supported unscheduled links. Both paths now release active claims and recalculate inventory without waiting for an owner action. Replayed cancellations are idempotent and can reconcile a previously recorded cancellation with stale inventory. Completed handoffs remain final, and a cancellation cannot release another person's active claim. This changes cancellation behavior, not the policy that active pending requests have no automatic deadline.

A targeted production repair reconciled the already-canceled Riding Jacket claim with its inventory and queued one availability event, after verifying Cal's canceled state and checking there were no other active requests under the item lock. The existing accepted demo-cap reservation was left unchanged. The general code correction still requires deployment; the data repair alone does not alter future webhook handling.
