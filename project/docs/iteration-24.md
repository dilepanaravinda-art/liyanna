# Iteration 24 — Scheduled delivery boundary

Added `src/app/api/integrations/worker/route.ts` and the independently tested `scheduled-handler.mjs`.

- POST only, with an exact bearer token comparison using Node's `timingSafeEqual`.
- Minimum 32-character worker secret; missing or weak secrets reject all requests.
- Execution is explicitly disabled in the Next.js route until a dedicated database connection, private SQL migrations and vault resolver are configured and validated in staging. Authenticated requests return HTTP 503 until then.
- Responses do not reveal internal errors or credentials. No infrastructure is initialized on unauthenticated requests.
- Six new Node tests; `node --test src/integrations/vig/*.test.mjs` passes 48 tests.

## Activation checklist
1. Validate migrations and role grants against a staging database.
2. Provision a dedicated, least-privilege PostgreSQL client and server-only vault resolver.
3. Compose `createWorkerService` with those dependencies and approved provider endpoints; wire its `runOnce` to the handler and explicitly enable only after checks.
4. Configure a 32+ character `LIYANNA_WORKER_SECRET` in server environment and a trusted scheduler sending POST Authorization Bearer.
5. Perform end-to-end staging delivery and retry tests before production enablement.

No production migration, credential changes or deployment are included in this archive.
