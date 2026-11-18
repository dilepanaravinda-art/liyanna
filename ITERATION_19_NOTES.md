# Iteration 19 — PostgreSQL delivery repository

Added `project/src/integrations/vig/postgres-repository.mjs` and Node tests.

- Implements `claim`, `authorize`, `markDelivered`, `markRetry` for the existing delivery-worker interface.
- Uses parameterized SQL and the proposed `liyanna_integrations.claim_events` / `finish_event` functions.
- Fails closed for missing connections, disabled grants, expired consent, and approval-required delivery.
- Uses `events:deliver` capability; add this grant only through an authenticated, audited owner-consent flow.
- Does NOT create a database connection, fetch credentials, expose browser APIs, or run a worker automatically.

## Verified
`node --test project/src/integrations/vig/*.test.mjs` -> 27 passed, 0 failed (Node module tests only).

## Blockers
- Review migration ordering and security before applying any SQL; no production database was touched.
- Dedicated worker database role must have tightly scoped EXECUTE/SELECT grants and be verified against RLS.
- The actual FINBASE API, credential vault, runtime orchestration, and full Next.js build remain unverified.
- Never treat the tests as evidence of end-to-end synchronization.
