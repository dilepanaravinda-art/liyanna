-- Iteration 14: proposed private, durable VIG event queue. NOT applied.
-- Run only after reviewing existing schema, roles, and migration ordering.
BEGIN;
CREATE SCHEMA IF NOT EXISTS liyanna_integrations;
REVOKE ALL ON SCHEMA liyanna_integrations FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS liyanna_integrations.event_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 connection_id uuid NOT NULL REFERENCES liyanna_integrations.connections(id),
 tenant_id uuid NOT NULL,
 business_id uuid NOT NULL,
 event_id uuid NOT NULL,
 destination text NOT NULL CHECK(length(destination) BETWEEN 1 AND 128),
 event_type text NOT NULL,
 envelope jsonb NOT NULL CHECK(jsonb_typeof(envelope) = 'object'),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','delivered','dead_letter')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 100),
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_owner uuid,
 lease_until timestamptz,
 delivered_at timestamptz,
 last_error text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(connection_id,event_id,destination),
 CONSTRAINT lease_pair CHECK((lease_owner IS NULL) = (lease_until IS NULL)),
 CONSTRAINT delivered_timestamp CHECK(status <> 'delivered' OR delivered_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS vig_outbox_ready_idx ON liyanna_integrations.event_outbox(next_attempt_at,created_at)
 WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS vig_outbox_lease_idx ON liyanna_integrations.event_outbox(lease_until)
 WHERE status = 'processing';
CREATE INDEX IF NOT EXISTS vig_outbox_scope_idx ON liyanna_integrations.event_outbox(tenant_id,business_id,created_at DESC);
ALTER TABLE liyanna_integrations.event_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON liyanna_integrations.event_outbox FROM PUBLIC, anon, authenticated;
-- No browser-facing policies: a reviewed privileged worker must validate tenant,
-- connection, consent, grants and provider identity before enqueue and delivery.
-- Workers must claim due rows atomically with SELECT ... FOR UPDATE SKIP LOCKED,
-- set a finite lease, and recover expired leases. Never send from browser clients.
COMMIT;
