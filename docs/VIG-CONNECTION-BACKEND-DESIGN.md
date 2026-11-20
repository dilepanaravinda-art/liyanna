# Vantoryx Integration Gateway — secure backend plan

## Stable product-neutral contract
Each trusted product adapter registers a provider ID, contract version, capabilities, authentication method, supported event types and health-check mechanism. LIYANNA core financial workflows never import provider-specific SDKs; an integration service dispatches to vetted adapters.

## Persistent data (planned, not deployed)
- `integration_connections`: tenant, business, provider, status, consent actor/time, expiration, encrypted credential reference (never a plaintext secret).
- `integration_grants`: connection ID, capability, enabled, approval policy.
- `integration_action_approvals`: immutable approval records bound to action payload digest, approver, scope, expiry and single-use state.
- `integration_outbox` and `integration_inbox`: event ID, schema version, correlation ID, deduplication key, retry metadata and delivery state.
- `integration_audit`: append-only actor, action, scope, outcome, timestamp and redacted metadata.

## Server request flow
1. Authenticate user or machine identity with a trusted identity provider.
2. Load tenant/business membership and owner role from authoritative database records.
3. Load current connection and permissions, reject revoked/expired connections.
4. Validate provider manifest, capability and payload schema.
5. Validate action approval from a server-side approval record, not a client boolean.
6. Atomically reserve an idempotency key and enqueue a versioned outbox event.
7. A backend worker uses server-only credentials to deliver to the adapter with bounded retries.
8. Verify webhook signature, timestamp, replay protection and tenant mapping before applying inbound events.
9. Record audit outcomes, expose sync health and allow immediate suspension/revocation.

## Security and isolation
Use RLS for tenant-scoped records and deny browser access to secret-bearing tables. Never expose Supabase service role credentials in client code. Enforce business mapping on both inbound and outbound messages. Treat external payloads as untrusted and apply size limits and schema validation. Financial ledger authority remains FINBASE when connected.

## Provider onboarding
New Vantoryx products supply a vetted manifest + adapter + conformance tests. A new provider must not require changes to quotation or invoice domain models. Product-specific field mappings are versioned and isolated in the adapter.

## Acceptance criteria before enabling Connect
Verified owner authorization, consent and revocation persistence, credential vault, FINBASE contract confirmation, idempotent synchronization, signed webhook tests, RLS negative tests, production build and recovery runbook.
