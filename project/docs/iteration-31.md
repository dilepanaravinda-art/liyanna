# Iteration 31 — Offline credential exposure preflight

Added `scripts/verify-secrets.mjs` and five Node.js regression tests. The checker scans browser-facing source for references to selected privileged environment variables and for `NEXT_PUBLIC_` declarations of privileged names. It is wired into `npm run verify:release`.

The audit is intentionally narrow: it is not a general-purpose secret scanner, and it cannot prove runtime isolation or the absence of embedded credentials. Keep sensitive credentials in server-side vaults and configure least-privilege network egress. No production changes were performed.

Verification: `npm run verify:release` and `node --test scripts/*.test.mjs` passed. Full Next.js build, live database integration and FINBASE API calls remain unverified.
