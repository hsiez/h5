CREATE TABLE IF NOT EXISTS catalog_regions (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL,
  heading text NOT NULL,
  description text NOT NULL DEFAULT '',
  kind text NOT NULL CHECK (kind IN ('review','storefront')),
  publication_status text NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft','published','archived')),
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO catalog_regions(id,name,heading,kind,publication_status,sort_order) VALUES
 ('edc','Everyday carry','Things I carry everyday','review','published',0),
 ('things-for-you','Things for you','Things for you','storefront','published',1),
 ('cooking','Cooking','Things for cooking','review','draft',2)
 ON CONFLICT (id) DO NOTHING;
ALTER TABLE storefront_items ADD COLUMN IF NOT EXISTS region_id text REFERENCES catalog_regions(id);
ALTER TABLE storefront_items ADD COLUMN IF NOT EXISTS review jsonb;
ALTER TABLE storefront_items ADD COLUMN IF NOT EXISTS draft_data jsonb;
ALTER TABLE storefront_items ADD COLUMN IF NOT EXISTS publication_status text NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft','published','archived'));
ALTER TABLE storefront_items ADD COLUMN IF NOT EXISTS adoption_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE storefront_items ADD COLUMN IF NOT EXISTS legacy_key text;
ALTER TABLE storefront_items ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE storefront_items ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0;
UPDATE storefront_items SET region_id='things-for-you',adoption_enabled=true,
 publication_status=CASE WHEN published_at IS NULL THEN 'draft' ELSE 'published' END
 WHERE region_id IS NULL;
UPDATE storefront_items SET status='available' WHERE status='draft';
ALTER TABLE item_handoffs ADD COLUMN IF NOT EXISTS owner_name text NOT NULL DEFAULT 'its new owner';
ALTER TABLE item_handoffs ADD COLUMN IF NOT EXISTS coffee_story text NOT NULL DEFAULT 'A coffee and a story shared in Seattle.';
CREATE TABLE IF NOT EXISTS admin_sessions (
 token_hash text PRIMARY KEY, password_version text NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS admin_login_attempts (
 key text PRIMARY KEY, attempts integer NOT NULL, window_start timestamptz NOT NULL
);
ALTER TABLE storefront_item_media DROP CONSTRAINT IF EXISTS storefront_item_media_blob_path_key;
CREATE UNIQUE INDEX IF NOT EXISTS storefront_item_media_item_path ON storefront_item_media(item_id,blob_path);
