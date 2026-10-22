# Things for you: claim flow skeleton

This defines the claim lifecycle before choosing a storefront layout or calendar integration. An item's price is one coffee and a story. `Claim` begins a request; it does not promise the item immediately.

## Visitor flow

1. Open an available item and see its description, size, measurements, condition, and price: “A coffee and a story.”
2. Select **Claim** and provide only an email address. The storefront sends an item-specific, expiring claim link. It does not ask for a time or place.
3. Open the email link; it resolves the item-specific claim and takes the visitor to one shared Cal.com booking page with their email and a hidden `claim_ref` prefilled. Choose a time and suggest a public café or neighborhood in Seattle there, once. Cal.com must require your confirmation rather than immediately confirming the meeting.
4. After Cal.com receives the first booking request, its webhook records the request and changes the item to **Pending**. The Cal request time establishes priority, not the earlier email entry time. You receive the request with the item, email, chosen time, and place suggestion.
5. While pending, other visitors can subscribe to an email-only availability alert. This is not a queue or a claim; they are not asked to choose a time or place.
6. If you confirm a request, the visitor receives the confirmed time and public meeting place. The item becomes **Reserved**. If you decline or the request is canceled, consider any other Cal booking requests already received; if none remains, return the item to **Available** and email all active alert subscribers a personal link that leads directly to Cal when the item is still available.
7. After the in-person handoff, open the item's admin control, upload the photo you took together, add short alt text, confirm the person's permission to publish it, and select **Mark claimed**. The photo and claimed state appear together. If a reserved meetup is canceled before handoff, reconsider any existing booking requests or reopen the item and alert subscribers.

## Item state

```text
available --first Cal booking request--> pending --confirm--> reserved --handoff--> claimed
    ^                                      |            |
    +---------no active requests----------+            |
    +--------------cancel/reopen------------------------+
```

Requests have their own state: `link_sent → booking_requested → accepted | declined | withdrawn`. A link that expires without a booking request is `expired`. Email entry alone does not change the item or establish priority. The first Cal booking request changes the item to pending; later Cal booking requests, if any, are ordered by Cal request time. Confirmation reserves exactly one item. A decline only reopens the item when no other active booking request or accepted reservation remains. A second acceptance for a reserved or claimed item must fail, even when two requests are reviewed at nearly the same time. Availability alert subscribers have no rank, priority, or reservation. Their emailed link skips reentering an email address, but a new Cal booking request is still required to claim.

## Data in Postgres

- `storefront_items`: `id` (UUID primary key), `slug` (unique), `title`, `description`, `size_label`, `condition_note`, `measurements` (JSONB with explicit units), `status` (`draft`, `available`, `pending`, `reserved`, `claimed`), `published_at`, `created_at`, `updated_at`. Keep the one-coffee-and-a-story price in product copy rather than inventing a currency amount.
- `storefront_item_media`: `id` (UUID primary key), `item_id` (foreign key), `blob_path` (unique), `alt_text`, `sort_order`, `created_at`. Store the image in Vercel Blob and its reference here; do not put image bytes in Postgres. This table supports multiple ordered photos and a future upload/edit module.
- `claim_requests`: `id` (UUID primary key), `item_id` (foreign key), `email`, `token_hash` (unique), `token_expires_at`, `token_used_at`, `status` (`link_sent`, `booking_requested`, `accepted`, `declined`, `expired`, `canceled`, `completed`), `cal_booking_uid` (unique when present), `cal_event_type_id`, `requested_at`, `requested_start_at`, `time_zone`, `suggested_public_place`, `created_at`, `updated_at`. Set `requested_at` from the first verified Cal booking request and use it for claim order. Time and place are populated only from Cal.com's booking request. Keep personal details out of public item responses.
- `item_availability_alerts`: `id` (UUID primary key), `item_id` (foreign key), `email`, `created_at`, `last_notified_version`, `unsubscribed_at`. Keep one active subscription per email and item. This is a notification audience, not a queue. Track each reopening version on the item so a subscriber can be notified once per return to market, including later reopenings.
- `item_handoffs`: `id` (UUID primary key), `item_id` (unique foreign key), `claim_request_id` (unique foreign key), `photo_blob_path`, `photo_alt_text`, `photo_publish_consent_at`, `completed_at`, `created_at`. This separates the handoff portrait from product photos and ties it to the accepted claim. No person's name, email, or meeting details appear on the public item page.
- `claim_events`: `id` (UUID primary key), `claim_request_id` (foreign key), `action`, `actor`, `external_key` (unique when present), `created_at`. This is a compact audit trail; `external_key` makes repeated calendar callbacks safe to ignore. Do not store raw webhook payloads or email-link tokens here.

Use database checks for valid statuses and nonempty item slugs. Index `storefront_item_media(item_id, sort_order)` and `claim_requests(item_id, status, requested_at)`. Add a partial unique index allowing at most one `accepted` or `completed` request per item, and a unique active alert subscription per email and item. Unpublished `draft` items never appear in public queries.

Use a database transaction when processing the first valid Cal booking request: record the request and change the item from `available` to `pending` together. Use another transaction when confirming a request: change the item from `pending` to `reserved` and mark exactly one request accepted. Declines and cancellations must check for other active requests before reopening. When an item moves back to available, queue one availability alert per active subscriber after the durable change; retries must not send duplicates. Notifications and calendar updates happen after the database change and can be retried if delivery fails.

The admin handoff action uploads the photo first, then uses one database transaction to require a reserved item and its accepted claim, insert the handoff record, mark the claim completed, and mark the item claimed. A failed transaction must leave the item reserved and remove or later clean up an unused upload. Photo upload alone never claims the item. Keep the portrait unpublished until the completion transaction and consent confirmation succeed.

## Service boundaries

- **Email link:** generate an item-scoped, expiring token, store only its hash, and rate-limit sends. Both the initial claim email and each availability alert contain a personal site link that checks current availability, then opens Cal.com with that person's email prefilled. Do not put a shared direct Cal URL in the blast: it cannot check whether the item has become pending again. Visiting the site link alone must not consume it because email security scanners may open links. Email access is checked; identity and safety are not guaranteed by this step.
- **Scheduling:** Cal.com owns the time and Seattle public-place suggestion. The storefront never collects them. Use one hidden event with a `claim_ref` hidden booking question, prefill both that field and the email, and associate the signed Cal booking callback with the claim request. Reject callbacks with an invalid reference, mismatched email, wrong event type, or expired claim. Store its booking ID on the request, not as the item's source of truth.
- **Owner review:** the admin page lists requests in Cal request order. Its Accept action checks that the request is first, then calls Cal's confirmation API; its Decline action calls Cal's decline API. Signed webhooks reconcile changes also made in Cal.com. Do not publish your private calendar, contact details, or a private address.
- **Handoff:** add a small item-level control to the existing admin area: photo picker with preview, alt-text field, publish-permission checkbox, and **Mark claimed** button. Show the accepted claim and item title above it so the correct handoff is recorded. Allow a later admin edit or unpublish of the portrait without erasing the historical claim.
- **Notifications:** Cal.com owns booking request, confirmation, cancellation, and reminder messages; Resend sends the initial claim link and availability alerts. Avoid duplicate provider emails. Never send a confirmation before the item reservation succeeds. Availability alerts say the item is back on the market and offer one-click access to scheduling, without implying priority or a guarantee. They also include an unsubscribe link that requires a click on a confirmation page, so email scanners cannot unsubscribe someone. If another Cal request makes the item pending before a subscriber opens the email, the site link explains that the item is pending instead of opening Cal.

## First implementation slice

Create the tables and server-side claim link, availability alert, booking-callback, and handoff operations against Postgres. Exercise the full state sequence with temporary database records and a mocked email sender before designing the storefront UI. The shared Cal event now exists; connect its signed webhook when the public route is deployed. A real hosted booking is still needed to verify the hidden field's round trip through Cal's webhook.

Keep modules separate: `storefront/items` owns reads and future item create/update/publish operations, `storefront/media` owns Blob uploads and image ordering, `storefront/claims` owns claim tokens and state changes, and provider adapters own Resend and Cal.com calls. A later owner-only upload screen will call the item and media modules; it will not write directly to tables or need a new claim schema.

## Runtime setup

- Run `node --env-file=.env.local scripts/storefront-migrate.mjs` to apply the additive schema.
- Set `STOREFRONT_LINK_SECRET` to a random, stable value in each environment. The secret must stay stable while email links are valid. Email links use Vercel's production or preview URL automatically when system environment variables are enabled. Set `STOREFRONT_BASE_URL` only as a local or custom-domain override.
- Set `STOREFRONT_FROM_EMAIL` to a sender from a verified Resend domain; `RESEND_API_KEY` is already expected. Configure `CAL_WEBHOOK_SECRET` in both Cal.com and the deployment. Subscribe the webhook at `/api/storefront/webhooks/cal` to Booking Requested, Booking Created, Booking Rejected, Booking Cancelled, and Booking Rescheduled.
- Set `STOREFRONT_CAL_EVENT_TYPE_ID` and `STOREFRONT_CAL_BOOKING_URL` for one shared, hidden 30-minute “Coffee & a story” Cal event. It must always require confirmation. Add a hidden short-text booking question with identifier `claim_ref` and a visible question with identifier `seattle_place` asking for a public café or neighborhood in Seattle. The site appends the claim UUID and email to each link. The admin item API can create a test item without Cal configuration; the public storefront design and owner-only item upload screen are later work.
- Existing admin token authentication is reused for the prototype controls. Set a dedicated `STOREFRONT_ADMIN_SECRET` before production if you do not want the paper workflow's token to also administer storefront items.

## Decisions to settle before integration

- Whether Cal dashboard approvals should remain possible after the admin flow is live. The admin action enforces first-request priority; a manual approval in Cal.com could bypass that check and should be avoided for claim event types.
- Whether a hosted Cal.com private single-use link is useful in addition to the site's expiring, item-scoped email link. The shared event is hidden but its regular URL can still be forwarded; unmatched bookings are rejected by the site's webhook.
- Which email sender and calendar account to connect for production.
