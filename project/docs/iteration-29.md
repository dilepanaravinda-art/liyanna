# Iteration 29 — server deployment compatibility and release preflight

- Removed `output: "export"` from Next.js configuration. Static export cannot host `/api/integrations/worker`, which needs a Node.js server runtime.
- Added a read-only release preflight (`npm run verify:release`) covering runtime, worker fail-closed default, lockfile, scripts, and migration ordering.
- Added six Node.js tests for the release preflight.

## Release gates still outstanding

- Run full `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, and `pnpm build` in an environment with registry access.
- Validate SQL against isolated staging PostgreSQL/Supabase and reconcile existing migration history.
- Provision a dedicated least-privilege database client, credential resolver, and network-level egress protections.
- Test FINBASE contract and end-to-end delivery before enabling worker.
- No production deployment or database mutation is included in this iteration.
