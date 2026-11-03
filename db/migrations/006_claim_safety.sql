CREATE TABLE IF NOT EXISTS storefront_rate_limits (key text PRIMARY KEY, hits integer NOT NULL, expires_at timestamptz NOT NULL);
ALTER TABLE item_availability_alerts ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE item_availability_alerts ADD COLUMN IF NOT EXISTS verification_expires_at timestamptz NOT NULL DEFAULT '1970-01-01'::timestamptz;
ALTER TABLE item_availability_alerts ALTER COLUMN verification_expires_at SET DEFAULT now()+interval '1 hour';
ALTER TABLE item_availability_alerts ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz;
-- Existing addresses were never verified: require fresh confirmation, not implied consent.
ALTER TABLE storefront_outbox DROP CONSTRAINT IF EXISTS storefront_outbox_kind_check;
ALTER TABLE storefront_outbox ADD CONSTRAINT storefront_outbox_kind_check CHECK(kind IN ('claim_link','availability_alert','verify_alert'));
ALTER TABLE storefront_outbox ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
ALTER TABLE storefront_outbox ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE storefront_outbox ADD COLUMN IF NOT EXISTS locked_until timestamptz;
ALTER TABLE storefront_outbox ADD COLUMN IF NOT EXISTS lease_id uuid;
ALTER TABLE storefront_outbox ADD COLUMN IF NOT EXISTS canceled_at timestamptz;
ALTER TABLE storefront_outbox ADD COLUMN IF NOT EXISTS failed_at timestamptz;
ALTER TABLE storefront_outbox ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE storefront_outbox ADD COLUMN IF NOT EXISTS message jsonb;
CREATE INDEX IF NOT EXISTS storefront_outbox_due ON storefront_outbox(next_attempt_at,created_at) WHERE sent_at IS NULL AND canceled_at IS NULL AND failed_at IS NULL;
CREATE INDEX IF NOT EXISTS claim_email_item ON claim_requests(email,item_id,status,created_at);
CREATE TABLE IF NOT EXISTS storefront_jobs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),kind text NOT NULL CHECK(kind IN ('fanout','cal_cancel')),item_id uuid REFERENCES storefront_items(id) ON DELETE SET NULL,version integer,uid text,booking_status text,done_at timestamptz,attempts integer NOT NULL DEFAULT 0,next_attempt_at timestamptz NOT NULL DEFAULT now(),locked_until timestamptz,lease_id uuid,last_error text,UNIQUE(item_id,version,kind));
-- Shorten unused legacy links; never affect pending/accepted bookings.
UPDATE claim_requests SET token_expires_at=LEAST(token_expires_at,created_at+interval '1 hour') WHERE status='link_sent';

CREATE UNIQUE INDEX IF NOT EXISTS storefront_jobs_cal_uid ON storefront_jobs(uid) WHERE kind='cal_cancel';
ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;
