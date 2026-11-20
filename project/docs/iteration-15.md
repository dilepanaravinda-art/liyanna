# Iteration 15 — Lease-safe VIG worker foundation

Added a transport-neutral server-side delivery orchestrator, four Vitest scenarios, and proposed SQL atomic claim / lease-checked completion functions. This is NOT wired to the live database, HTTP provider transport, or scheduled runner. It does NOT connect to FINBASE yet.

## Critical follow-ups
- Inspect FINBASE actual API before implementing a provider transport; do not guess endpoints.
- Provision a dedicated server worker identity and restricted DB permissions, and test migrations against a disposable Supabase database.
- Implement a repository adapter using a private server-side database connection. Do not expose privileged keys to the browser.
- Add worker lease renewal for long deliveries, destination allowlists, signed requests, idempotency, rate limits, circuit breakers, structured logs and per-tenant quotas.
- Never log event payloads or secrets. Test worker crash/recovery and concurrency with real PostgreSQL.
- SQL and TypeScript tests must run in CI before deployment; do not claim deployment readiness based on ZIP integrity.
