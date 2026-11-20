# Iteration 35 — Scheduled worker single-process concurrency guard

- Added a per-handler in-memory busy flag to reject overlapping authenticated POSTs with HTTP 409 and Retry-After: 5.
- Always clears busy state after successful and failed execution, and preserves fail-closed disabled behavior.
- Unauthorized requests do not affect an active batch.
- Added three Node.js regression tests.

## Verification

- `node --test src/integrations/vig/*.test.mjs scripts/*.test.mjs`: 121 passed, 0 failed.
- `npm run verify:release`: passed.
- Full Next.js build, database migration application, and FINBASE live synchronization: **not verified**.

## Operational limitation

This flag is scoped to one Node.js process and is **not** a distributed lock. Multiple Vercel function instances can execute simultaneously. PostgreSQL atomic event claims and leases remain mandatory for cross-instance delivery correctness. Do not enable production worker until the real database repository, credential resolver, and approved egress controls are wired and tested.
