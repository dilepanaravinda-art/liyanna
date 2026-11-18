# Iteration 17 — VIG Worker-to-Transport Bridge

## Delivered
- Added `src/integrations/vig/worker-transport-adapter.mjs`, bridging the existing claimed-event worker shape to the existing HTTPS transport.
- Normalizes `eventId` to the transport's `id` field while retaining the original event identifier.
- Rejects envelope tenant, business and event-type mismatches before network delivery.
- Added seven Node-native tests; all 13 tests across the adapter and existing transport passed using `node --test src/integrations/vig/*.test.mjs`.

## Important limitations
- No production integration was activated, and no migrations were run.
- The adapter is not yet wired to a scheduled worker route, durable repository, or credential vault.
- Full TypeScript checks, Vitest suite, browser tests and production build were not run.
- FINBASE's real API endpoints, authentication and payload contract have not been verified.
- The HTTP transport still needs DNS/IP-level SSRF defenses, credential lifecycle integration and real provider-side idempotency verification before production use.

## Next
1. Verify FINBASE connector/API contract.
2. Implement the private database repository with atomic leases and scoped authorization.
3. Add secure credential resolver and network egress restrictions.
4. Wire a protected worker endpoint and verify full application build and end-to-end synchronization in staging.
