# Iteration 21 — Pre-vault authorization boundary

## Changes
- Connection resolver receives event tenant and business scope from the transport runtime.
- Connection scope is checked **before** fetching a credential from the server vault.
- Unknown provider identifiers are rejected before vault or network operations.
- Added negative tests for cross-tenant and unknown-provider delivery attempts.

## Verification
- `node --test src/integrations/vig/*.test.mjs` — 34 tests passing.
- The entire Next.js application build, TypeScript suite, and database migrations have not been verified here.

## Deployment prerequisites
- Review and apply private VIG migrations in correct order on a staging database.
- Provision a dedicated restricted PostgreSQL worker identity and server-only secret resolver.
- Configure provider endpoints from an audited allowlist; do not use arbitrary user-supplied URLs.
- Implement authenticated scheduler entrypoint, rate limiting, monitoring, and real FINBASE contract testing.
- Do not expose this worker or credential references to browser code.
