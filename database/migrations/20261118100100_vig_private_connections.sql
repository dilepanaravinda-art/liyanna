-- ITERATION 11: proposed additive VIG storage. NOT applied to production.
-- No browser-facing grants. All access requires a reviewed server-side service.
BEGIN;
CREATE SCHEMA IF NOT EXISTS liyanna_integrations;
REVOKE ALL ON SCHEMA liyanna_integrations FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS liyanna_integrations.connections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL, business_id uuid NOT NULL REFERENCES public.liyanna_businesses(id),
 provider_id text NOT NULL CHECK(provider_id ~ '^[a-z][a-z0-9-]{1,63}$'),
 contract_version text NOT NULL CHECK(contract_version ~ '^[0-9]+\.[0-9]+$'),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','suspended','revoked')),
 consented_by uuid, consented_at timestamptz, expires_at timestamptz,
 credential_reference text, -- vault identifier only; never store token material
 revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT consent_pair CHECK ((consented_by IS NULL) = (consented_at IS NULL)),
 CONSTRAINT active_requires_consent CHECK (status <> 'active' OR (consented_by IS NOT NULL AND revoked_at IS NULL)),
 CONSTRAINT revoked_requires_timestamp CHECK (status <> 'revoked' OR revoked_at IS NOT NULL),
 UNIQUE(tenant_id,business_id,provider_id)
);
CREATE TABLE IF NOT EXISTS liyanna_integrations.grants (
 connection_id uuid NOT NULL REFERENCES liyanna_integrations.connections(id) ON DELETE CASCADE,
 capability text NOT NULL CHECK(capability ~ '^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$'),
 enabled boolean NOT NULL DEFAULT false,
 requires_approval boolean NOT NULL DEFAULT true,
 PRIMARY KEY(connection_id,capability)
);
CREATE TABLE IF NOT EXISTS liyanna_integrations.audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 connection_id uuid REFERENCES liyanna_integrations.connections(id) ON DELETE SET NULL,
 tenant_id uuid NOT NULL, business_id uuid NOT NULL,
 actor_id uuid, action text NOT NULL, outcome text NOT NULL,
 event_at timestamptz NOT NULL DEFAULT now(),
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 CHECK(jsonb_typeof(details)='object')
);
CREATE INDEX IF NOT EXISTS vig_audit_scope_idx ON liyanna_integrations.audit(tenant_id,business_id,event_at DESC);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['connections','grants','audit'] LOOP
  EXECUTE format('ALTER TABLE liyanna_integrations.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON liyanna_integrations.%I FROM PUBLIC, anon, authenticated',t);
 END LOOP;
END $$;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA liyanna_integrations FROM PUBLIC,anon,authenticated;
COMMIT;
