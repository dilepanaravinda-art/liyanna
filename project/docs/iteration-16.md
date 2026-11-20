# Iteration 16 — Secure outbound connector transport

Added `src/integrations/vig/secure-transport.mjs` with dependency-injected connection resolver and HTTP client. The adapter checks active status, tenant and business scope, HTTPS destination against a server-controlled origin allowlist, credentials, event ID, and sends an idempotency header. Redirects are disabled, requests are time-limited, and non-2xx responses throw for worker retry.

## Verified
`node --test src/integrations/vig/secure-transport.test.mjs`: 6 tests passed on Node 22.16.0.

## Not yet complete
The transport is NOT wired to a production worker, persistence, or FINBASE. The resolver must be implemented server-side, use a trusted origin allowlist (never tenant-controlled), and retrieve secrets from a secure secret store. Prevent private-network and DNS rebinding destinations at the egress layer. Provider must implement durable idempotent receipt handling. Test actual FINBASE API contract and authentication before integration. Existing TypeScript/Vitest suite and Next production build not run. No production database or deployment changed.
