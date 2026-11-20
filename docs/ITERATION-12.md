# Iteration 12 — provider-neutral server integration orchestration

Added `project/src/integrations/vig/connection-service.ts` and tests. The service requires server-verified membership, stored connection grants, provider manifests, explicit approval verification for sensitive actions, and compare-and-swap state changes. The executor interface accepts idempotency keys; actual provider transport must enforce deduplication and securely retrieve credentials.

## Important limitations
- The store and executor are **interfaces**, not production implementations. No new API routes, remote FINBASE calls, credential storage or Vercel deployment were made.
- `appendAudit` is an interface only; persistence implementation must ensure durable logs, including denied requests, without leaking secrets.
- Verify owner consent and pending connection activation using an authenticated server workflow before exposing any UI control.
- Do not run database/restore.sql on production. Review and test the Iteration 11 migration in a staging Supabase environment before applying it.
- Do not trust browser-provided tenant IDs, owner flags, approval booleans, or connection capabilities.
- Before live integration, inspect FINBASE's real API and auth contract and implement retry-safe transactional outbox + idempotency storage.

## Deployment
The existing Vercel deployment is independent of this source archive. Uploading or downloading this ZIP does not deploy these changes.
