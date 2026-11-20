# Iteration 14 — Durable integration queue groundwork

Added a private PostgreSQL event outbox migration, TypeScript enqueue/scope validation, lease-state helpers, and Vitest cases. The migration has **not** been applied. This is not a functioning worker or FINBASE connection.

## Before production
1. Reconcile historical migrations and confirm `liyanna_integrations.connections` exists.
2. Review privileged worker access, RLS, and grants. Never expose the private queue to the browser.
3. Implement atomic database claim using `FOR UPDATE SKIP LOCKED`, bounded leases, lease renewal, and transactional state changes.
4. Enforce current owner consent, tenant membership, capability grants, credential rotation, and destination allowlisting at send time.
5. Implement webhook signing or OAuth/mTLS, receiving-side idempotency, replay protection and observability.
6. Verify FINBASE's actual API and mappings before any real financial synchronization.
7. Run migrations and integration tests in an isolated preview database; do not deploy to production without explicit approval.

Event transport provides **at-least-once** delivery, not exactly-once. Receiving systems must deduplicate by stable event/idempotency keys.
