-- EXAMPLE ONLY: run as the owner, review for your database/schema first.
-- Provision h5_runtime with a password using your provider's secret UI.
-- Never commit its password or replace the production role without a staged test.
CREATE ROLE h5_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
-- Grant CONNECT on the actual database separately, then use its non-owner URL.
GRANT USAGE ON SCHEMA public TO h5_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE
  public.storefront_items, public.catalog_regions, public.storefront_item_media,
  public.claim_requests, public.claim_events, public.item_handoffs,
  public.item_availability_alerts, public.storefront_outbox, public.storefront_jobs,
  public.storefront_rate_limits, public.admin_sessions, public.admin_login_attempts
TO h5_runtime;
GRANT DELETE ON public.storefront_item_media, public.admin_sessions,
  public.admin_login_attempts, public.storefront_rate_limits TO h5_runtime;
-- UUID PKs use gen_random_uuid(); no owned sequences or schema CREATE are needed.
-- Do not give this role membership in an owner/migration role or future default grants.
-- Audit inherited/PUBLIC grants separately; changing them can affect other applications.
SELECT current_user,rolsuper,rolcreatedb,rolcreaterole,rolbypassrls
FROM pg_roles WHERE rolname=current_user;

-- Run with the new runtime connection: both should be false.
SELECT has_schema_privilege(current_user,'public','CREATE') AS can_create_in_public,
  pg_has_role(current_user,(SELECT datdba FROM pg_database WHERE datname=current_database()),'MEMBER') AS member_of_database_owner;
