# Iteration 37 — Worker SQL/repository contract preflight

Added `project/scripts/verify-worker-contract.mjs` to ensure the private PostgreSQL worker API remains compatible with `postgres-repository.mjs` and retains browser-role execute restrictions. The check runs during `npm run verify:release` and is intentionally offline/read-only.

Four regression tests cover a matching contract, missing SQL function, accidental browser-role execute grant, and repository signature drift. This is static validation, not a substitute for applying migrations to a disposable staging database or running the full Next.js build.

No production database or deployment changes were made.
