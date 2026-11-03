# Claim-flow adversarial review

Historical review: 2026-11-02 against main `a323faa`. See [the implementation and operations guide](claim-flow-operations.md) for remediation and the approved manual-review policy. The current security tests assert prevention, not the vulnerable behavior described below.

## Scope and evidence

Reviewed public claim, notification, claim-link, unsubscribe and cancellation endpoints; Cal webhook verification and state transitions; admin confirmation/handoff; email delivery; PostgreSQL schema, constraints, sessions and runtime configuration. Read-only introspection of the database configured locally was also performed. The Vercel firewall, production environment values/role, Cal account settings, Resend account controls and deployment were not inspected. Do not assume local and production configuration are identical.

Ten exploit/abuse scenarios were reproduced against a freshly created PostgreSQL schema, with fake service credentials and all outbound delivery mocked. The schema is dropped on completion. At review time, tests documented the vulnerable behavior; the implementation follow-up has converted them to prevention regressions. A passing suite does not establish production configuration or immunity to abuse. No actual customer claims, emails or bookings were created. No production load testing was performed.

Reproduce with:

```sh
node --env-file=.env.local scripts/storefront-security-audit.mjs
```

## Findings

### F1 — High: public email generation has no useful aggregate abuse limit

Sources: `app/api/storefront/items/[slug]/claim/route.ts:5`, `lib/storefront/core.ts:40–60`.

A caller can submit any syntactically valid address without authentication, a bot challenge, proof of intent or an aggregate request/sending limit. The only quota is three requests per item + exact normalized email per 15 minutes. Rotating recipients or aliases bypasses it. The route immediately drains the global mail outbox, so this is also a sender-cost and reputation risk, not merely unwanted database rows. The API accepts JSON carried as `text/plain` with an unrelated Origin, allowing browser-simple cross-site requests; an origin/content-type check would reduce drive-by submissions but does not stop bots.

Confirmed: 12 unauthenticated cross-origin requests with different recipients all returned 200 and invoked 12 mocked sends. Claim acknowledgment is not supplied or recorded by this endpoint either; the client checkbox is not an enforced record of agreement.

Fix: enforce distributed limits before expensive work: trusted-client-IP, recipient, item and global send budgets; cooldowns and escalating bot challenges; request type/body limits and server-side input validation. Apply the same admission rules to any confirmation mail. Avoid draining unrelated mail synchronously from this endpoint. Return a neutral acknowledgment to reduce email-history disclosure.

### F2 — High: notification list poisoning and unbounded fan-out inside an item lock

Sources: `app/api/storefront/items/[slug]/alert/route.ts:4`, `lib/storefront/core.ts:100–110, 149–160`.

Anyone can register arbitrary victims for a pending/reserved item. No email ownership verification, admission quota, subscriber limit or retention deadline is present. Deduplication prevents repeated exact email + item registrations, but unique recipients/aliases bypass it. When the item reopens, every active subscriber gets a new claim and outbox row, created with sequential queries while the item row remains locked. A poisoned list can therefore create mass mail and make the reopening transaction very expensive. Large enough fan-out could timeout/rollback the operation that should make the item available. The last scalability consequence is a code-derived risk, not a production stress-test result.

Confirmed: 30 unrelated, unverified registrations returned 200 and produced 30 active subscriptions.

Fix: verified one-shot subscriptions, quotas/expiry for unverified records, list caps, and asynchronous batched fan-out outside the booking state-change transaction. Availability-version deduplication is useful and should remain.

### F3 — High: confirmation can resurrect a canceled claim

Source: `lib/storefront/admin-decisions.ts:41–48`.

After the external Cal confirmation, the final transaction reads claim status before obtaining the item lock and never rereads/locks the claim afterward. A concurrent cancellation can commit while confirmation is waiting for the item lock. Confirmation then uses the stale `booking_requested` value and unconditionally sets the claim to accepted. Its conditional item update affects zero rows because cancellation already made the item available.

Confirmed with deterministic PostgreSQL lock coordination: final state was `claim=accepted`, `item=available` after a simulated cancellation concurrent with a successful mocked Cal response. This requires an admin confirmation plus a concurrent cancellation; it is not an unauthenticated admin-action bypass. It undermines inventory consistency and can expose an already accepted item for new booking requests.

Fix: consistent lock order (item, then claim), reread status under lock after the external call, validate both live states and assert conditional update row counts. Reconcile the external booking if local state changed. Add a recovery path for indeterminate Cal responses/approval leases.

### F4 — High impact, configuration-dependent: configured runtime database role is overprivileged

Source: `lib/storefront/db.ts:5–9`; read-only inspection of the role used by local `DATABASE_URL`.

Observed flags: database owner=true, create roles=true, create databases=true, BYPASSRLS=true, CREATE in public=true. It can also delete claims and insert admin sessions. It is not a superuser. Because the same application pool serves public endpoints and admin functions, a future SQL injection, server compromise or connection-string leak has broad consequences. This is excessive blast radius, not evidence that a public request currently gives direct database access.

Fix: separate migration/owner credentials from runtime credentials. Runtime should not own the database or tables, create roles/databases, bypass RLS or perform DDL. Grant only required table/sequence operations, ideally separating public-flow and admin capabilities. Confirm the actual Vercel production role independently. Replace `sslmode=require` with explicit `verify-full` to retain existing driver certificate verification across upgrades; the current warning does not establish an insecure connection today.

### F5 — Medium: unsubscribe does not cancel queued notification emails

Sources: `lib/storefront/core.ts:114–117`, `lib/storefront/email.ts:22–41`.

Unsubscribe changes the subscription row, but email delivery does not join/check its unsubscribe status. A job queued before unsubscribe remains deliverable. The associated generated claim link is also not invalidated.

Confirmed: reopening queued an alert, unsubscribe succeeded, then the mocked worker sent the alert to that subscriber.

Fix: cancel pending jobs on unsubscribe and recheck subscription eligibility before delivery. Invalidate any unused notification-generated claims as appropriate. Handle the unavoidable in-flight send boundary explicitly.

### F6 — High availability risk: unsendable old jobs starve newer emails; retries are opportunistic

Sources: `lib/storefront/email.ts:22–47`, public claim route, `vercel.json`.

The outbox query selects the oldest 20 jobs before filtering claim/item sendability. The loop skips ineligible rows without completing or canceling them. Twenty such rows occupy every batch while a valid new email waits behind them. Public claim creation can return 200 even though its email was never selected/sent. A provider error also aborts the batch at the first failed row. There is no per-job attempt count, retry schedule, permanent-failure/dead-letter state, delivery lease, or dedicated storefront retry cron in the repository; retries depend on subsequent claims/webhooks or a manual admin call.

Confirmed: 20 queued jobs for an item that became pending caused `deliverPendingEmail()` to return zero while a valid newer job for another available item remained unsent. This scenario assumes an unsent backlog, which can follow a mail outage or notification fan-out.

Fix: filter sendability in the claiming query, cancel terminal jobs, lease eligible rows with `FOR UPDATE SKIP LOCKED`, schedule retries independently with backoff and per-job errors, and isolate poison jobs. Check publication, availability version and unsubscribe state at delivery. Keep stable provider idempotency keys/payloads, but do not treat provider deduplication as a durable queue: Resend retains keys for 24 hours while claim tokens last 48 hours.

### F7 — Medium: notifications are recurring despite the one-email promise

Sources: `lib/storefront/core.ts:152–159`, `lib/storefront/email.ts:51`, `app/things/notify-footer-form.tsx:37`.

Subscriptions remain active after delivery. Each reopening creates another versioned job. `last_notified_version` is recorded but never limits a subscription to one lifetime notification.

Confirmed: the same subscription received two mocked notifications across two reopenings.

Fix: make the product policy explicit. Current copy promises one email, so consume the subscription after the first notification and require a new opt-in for another. If recurring notifications are intended, change the consent and UI first.

### F8 — Medium: unsuccessful claimants stay blocked after another person's handoff

Sources: `lib/storefront/core.ts:48–52, 216–226`.

Multiple preissued links can become booking requests for one item. Completing the winning handoff updates only the winner and the item. Other requests remain `booking_requested`; the cross-item rule then treats those people as still having an active claim indefinitely.

Confirmed: winner completes; loser remains `booking_requested`; loser cannot claim a different available item.

Fix: terminalize losing requests and reconcile/cancel their external Cal bookings when a winner completes. Cancel their obsolete outbox jobs. Do not merely ignore the rows in the cross-item query while leaving real meetings unresolved.

### F9 — Medium: arbitrary resends invalidate a victim's existing link

Source: `lib/storefront/core.ts:54–59`.

Knowing someone's email is sufficient to expire their existing unscheduled link and spend their three-request quota. The victim is then told to use the most recent email, even if they never asked for replacements. Abuse does not require learning their existing token.

Confirmed: two additional requests expired the victim's original token; the following request was rate-limited.

Fix: resend the same active link during a cooldown instead of rotating/invalidation on every unauthenticated request. Apply recipient/IP/global budgets and reserve true revocation for an authenticated or token-authorized action.

### F10 — Medium policy/abuse gap: pending bookings have no enforced deadline

Sources: `lib/storefront/core.ts:181–196`, `vercel.json`.

Email token expiry stops initial link use; it does not expire `booking_requested` or accepted reservations. One person with a valid mailbox can create a pending booking that blocks fresh claim submissions until an admin or Cal event resolves it. Abandoned pending requests also block that email from other items. No scheduled expiry/reconciliation policy exists in this repository.

Confirmed: a pending request with a token and requested timestamp 14 days in the past remained pending and rejected new claim attempts.

Fix: define explicit review/reservation deadlines, enforce them through scheduled reconciliation with Cal, and distinguish an expired email link from an expired booking. This needs a product policy, not an arbitrary timeout silently added to code.

### F11 — Medium: a reused claim reference creates untracked Cal requests

Source: `lib/storefront/core.ts:181–212`.

A new `BOOKING_REQUESTED` event for a claim that is already `booking_requested` (or another non-link state) falls through without recording or rejecting the new booking UID, then returns success. A person who has their valid Cal link can submit another booking with the same claim reference/email. Its genuine signed webhook is acknowledged, but the second booking is not tracked by the app. Subsequent cancellation events for it cannot resolve a claim. Practical calendar-abuse volume also depends on Cal's account/event limits, which were not inspected.

Confirmed: second UID was acknowledged with `ignored:false`, first UID remained in the database, and cancellation of the second UID failed with “Unknown claim for booking.”

Fix: distinguish an exact replay of the same UID from a new booking attempt. Only acknowledge exact duplicates; explicitly reject/reconcile additional UIDs or implement a deliberate replacement workflow.

## Other hardening observations

- Public claim/alert handlers parse bodies before validating types and do not enforce small body/content-type limits. Missing/non-string email reaches `.trim()` and returns a 500 instead of a controlled 400. Slug/email-related queries and row locks occur before any shared limiter.
- Pool `max:5` is per application instance, not a deployment-wide connection budget. No connection acquisition, statement or lock timeout is set in the application pool. Combine real pooled DB connection configuration, admission limits and bounded query/lock lifetimes.
- The one-item policy identifies an email string, not a person. Different mailboxes/plus aliases bypass it. Lowercasing is useful normalization, not identity proof; do not broadly strip dots/plus suffixes across unrelated providers.
- The preverification claim endpoint distinguishes emails with completed/in-progress claims through response errors. Neutral public responses reduce participation-history enumeration.
- The admin login has an atomic database-backed eight-attempt IP limit and password hashing, but no MFA or global/admin-account budget. Distributed IPs can bypass a per-IP limit. The request's X-Forwarded-For value is trusted; Vercel documents overwriting it at their edge, so a production spoofing bypass was NOT established. Verify the deployment path before changing IP parsing.
- Claim tokens are HMAC-derived from random claim IDs and checked through hashes. This protects against token guessing, but compromise of `STOREFRONT_LINK_SECRET` plus database IDs exposes claim and unsubscribe capabilities. Secrets should be distinct, access-controlled and rotatable.

## Controls that are already useful

Parameterized SQL was used in the reviewed public flow; no SQL-injection path or unauthenticated admin-data access was established. Admin mutations require a valid session and origin checks. Session cookies are HttpOnly/Secure in production/SameSite Strict; stored sessions are hashed and revoked by password-hash rotation. Cal signatures use HMAC over the raw body and timing-safe comparison, and booking email/event-type matching exists. Item row locks, per-email advisory locks and partial unique indexes protect important winner/cross-item invariants. Claim/cancellation/unsubscribe capabilities are long unguessable tokens. HTML email values are escaped. Subscription deduplication and versioned notification uniqueness prevent exact same-version duplicates. Cancellation/unsubscribe GETs show confirmation rather than mutating state.

These controls do not eliminate the lifecycle/rate-limit failures above.

## Recommended implementation order

1. Public abuse budgets and notification opt-in/admission limits; guard recipient lists before fan-out.
2. Confirmation race fix, duplicate Cal-request handling, loser cleanup and a documented timeout/reconciliation policy.
3. Durable outbox worker with eligibility checks, unsubscribe cancellation, retries/backoff and poison-job isolation. Enforce one-shot notification semantics.
4. Dedicated restricted runtime database roles, production configuration verification, timeouts, retention and monitoring.
5. Turn each reproduced vulnerability into a passing prevention regression test when fixed. Keep global mail quotas and reconciliation alerts visible in admin operations.

Do not change the database role in production without testing required grants. Do not silently delete pending bookings as a cleanup shortcut.

## External references

- [OWASP REST security: rate limiting, input/content-type and request-size controls](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- [Resend idempotency keys: 24-hour retention](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [Cal webhook signatures and payloads](https://cal.com/docs/developing/guides/automation/webhooks)
- [PostgreSQL role attributes](https://www.postgresql.org/docs/current/role-attributes.html)
- [Vercel request headers and X-Forwarded-For behavior](https://vercel.com/docs/headers/request-headers)
