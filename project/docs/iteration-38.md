# Iteration 38 — Integration pipeline smoke tests and release blockers

## Added
- `src/integrations/vig/worker-end-to-end.test.mjs`: dependency-free, in-memory database/provider integration smoke tests for the *actual* worker service composition. Covers successful invoice event delivery and acknowledgement, revoked consent before vault access, and provider failure retry with sanitized error.
- Tests exercise repository SQL calls and secure HTTP transport without production credentials or outbound requests.

## What is verified
- `node --test src/integrations/vig/*.test.mjs` and `npm run verify:release` run without dependency installation.
- CI workflow is present and configured to attempt `pnpm install`, typecheck, Vitest, and production build on GitHub.

## Outstanding blockers before production
1. Full dependency installation and `pnpm build` in CI. The local environment cannot resolve registry.npmjs.org.
2. Staging PostgreSQL migration execution and RLS/privilege verification. The in-memory mock does not execute SQL.
3. Dedicated least-privilege PostgreSQL client, server-side credential vault, network egress controls, and approved provider configuration must be wired into the currently **disabled** worker route.
4. Real FINBASE API contract, credentials, receiver-side idempotency and reconciliation must be verified.
5. Vercel preview smoke testing and operational monitoring.

**Do not enable the scheduled worker or promote to production based on these smoke tests alone.**
