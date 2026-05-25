# Calm Papers Email Service

Cloudflare Worker that handles newsletter subscriptions and sends daily paper digests.

## Architecture

```
POST /api/subscribe     → validate → D1 insert → send confirmation email
GET  /api/email/confirm → D1 update → confirmation page
GET  /unsubscribe       → D1 update → confirmation page
Cron (daily 8am UTC)    → fetch papers → query active subscribers → send digest
```

## Setup

### 1. Install dependencies

```sh
cd workers/email-service
npm install
```

### 2. Create D1 database

```sh
npx wrangler d1 create calm-papers-subscribers
```

Copy the `database_id` from the output into `wrangler.toml`.

### 3. Run migrations

```sh
# Local development
npm run db:migrate:local

# Production
npm run db:migrate
```

### 4. Set secrets

```sh
npx wrangler secret put API_SECRET
npx wrangler secret put PAPERS_API_URL
```

- `API_SECRET` — bearer token for the `/api/send-digest` endpoint
- `PAPERS_API_URL` — your Vercel site URL (e.g. `https://calmp.dev`)

### 5. Configure DNS for email deliverability

In Cloudflare Dashboard → DNS:

1. **SPF record** — Add a TXT record:
   ```
   v=spf1 include:_spf.mx.cloudflare.net ~all
   ```

2. **DKIM** — Follow the MailChannels setup:
   - Add a TXT record at `_dkim.yourdomain.com` with the DKIM key
   - Add a TXT record at `_mailchannels.yourdomain.com`:
     ```
     v=mc1 cfid=your-worker-subdomain.workers.dev
     ```

3. **DMARC** — Add a TXT record at `_dmarc.yourdomain.com`:
   ```
   v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
   ```

### 6. Set the subscribe URL in your Next.js app

Add to your Vercel environment variables:

```
NEXT_PUBLIC_SUBSCRIBE_URL=https://calm-papers-email.<your-subdomain>.workers.dev/api/subscribe
```

### 7. Deploy

```sh
npm run deploy
```

### 8. Development

```sh
npm run dev
```

This starts a local dev server with D1 bindings. Test with:

```sh
curl -X POST http://localhost:8787/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## Email sending

Uses [MailChannels](https://blog.cloudflare.com/sending-email-from-workers-with-mailchannels/) — free for Cloudflare Workers, no API key needed. Requires DNS records (SPF, DKIM, DMARC) to be configured for deliverability.

## Scaling

For 100+ subscribers, consider adding Cloudflare Queues to batch sends:
1. Push subscriber messages onto a queue in `scheduled()`
2. A consumer Worker sends them individually
3. This avoids hitting Worker CPU time limits

## Environment variables

| Variable | Where | Description |
|---|---|---|
| `SITE_URL` | wrangler.toml | Public URL of your site |
| `FROM_EMAIL` | wrangler.toml | Sender email with display name |
| `FROM_NAME` | wrangler.toml | Sender display name |
| `API_SECRET` | wrangler secret | Auth token for manual digest trigger |
| `PAPERS_API_URL` | wrangler secret | Vercel app URL to fetch paper data |
| `NEXT_PUBLIC_SUBSCRIBE_URL` | Vercel env | Worker subscribe endpoint URL |
