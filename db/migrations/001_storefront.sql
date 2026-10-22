CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS storefront_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (length(trim(slug)) > 0),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  size_label text,
  condition_note text,
  measurements jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','available','pending','reserved','claimed')),
  availability_version integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storefront_item_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES storefront_items(id) ON DELETE CASCADE,
  blob_path text NOT NULL UNIQUE,
  alt_text text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS storefront_item_media_order ON storefront_item_media(item_id, sort_order);

CREATE TABLE IF NOT EXISTS claim_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES storefront_items(id),
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  token_expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'link_sent' CHECK (status IN ('link_sent','booking_requested','accepted','declined','expired','canceled','completed')),
  cal_booking_uid text UNIQUE,
  cal_event_type_id integer,
  requested_at timestamptz,
  requested_start_at timestamptz,
  time_zone text,
  suggested_public_place text,
  approval_started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS claim_requests_item_order ON claim_requests(item_id, status, requested_at);
CREATE UNIQUE INDEX IF NOT EXISTS claim_requests_one_winner ON claim_requests(item_id) WHERE status IN ('accepted','completed');
ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS approval_started_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS claim_requests_one_approval ON claim_requests(item_id) WHERE approval_started_at IS NOT NULL AND status='booking_requested';

CREATE TABLE IF NOT EXISTS item_availability_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES storefront_items(id) ON DELETE CASCADE,
  email text NOT NULL,
  unsubscribe_token_hash text UNIQUE,
  last_notified_version integer NOT NULL DEFAULT 0,
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS item_alerts_one_active ON item_availability_alerts(item_id, lower(email)) WHERE unsubscribed_at IS NULL;
ALTER TABLE item_availability_alerts ADD COLUMN IF NOT EXISTS unsubscribe_token_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS item_alerts_unsubscribe_token ON item_availability_alerts(unsubscribe_token_hash);

CREATE TABLE IF NOT EXISTS item_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL UNIQUE REFERENCES storefront_items(id),
  claim_request_id uuid NOT NULL UNIQUE REFERENCES claim_requests(id),
  photo_blob_path text NOT NULL,
  photo_alt_text text NOT NULL,
  photo_publish_consent_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS claim_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_request_id uuid NOT NULL REFERENCES claim_requests(id),
  action text NOT NULL,
  actor text NOT NULL,
  external_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storefront_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('claim_link','availability_alert')),
  claim_request_id uuid REFERENCES claim_requests(id),
  alert_subscription_id uuid REFERENCES item_availability_alerts(id),
  availability_version integer,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alert_subscription_id, availability_version)
);
