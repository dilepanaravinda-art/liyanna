# LIYANNA release handoff — iteration 41

## Verified external repository status (2026-11-18)

The connected `dilepanaravinda-art/liyanna` GitHub `main` README explicitly describes a source-recovery placeholder. It is **not** the authoritative copy of the 40-iteration local source archive. No GitHub CI run or production deployment of this archive has been performed.

## Release gate (do not skip)

1. Import the contents of this archive (the files *inside* `liyanna-full-source`) into a new review branch in `dilepanaravinda-art/liyanna`. Do not overwrite the existing production deployment or connect its credentials.
2. Inspect every file for secrets, private customer data and unintended generated output. Never commit `.env` files or service-role credentials.
3. GitHub Actions must run from the repository root `.github/workflows/liyanna-release-validation.yml`. The Next.js app lives in `project/`.
4. CI must pass `pnpm install --frozen-lockfile`, `pnpm verify:release`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm smoke:production` from `project/`.
5. Provision a **separate staging** Supabase project. Review the existing migration history before applying SQL. Run migration and permission checks, then worker tests using staging-only secrets.
6. Deploy a Vercel **preview**, verify homepage, login, quotation, invoice, PDF, customer records and tenant isolation. Worker remains disabled until credentials, database, and egress controls are configured.
7. FINBASE synchronization requires its actual API contract, a test tenant and an approved credential; mocks do not prove live connectivity.
8. Only after these gates pass should a production rollout be separately approved.

## Current verification limits

Node module tests and source preflight have been reported passing in earlier iterations. A complete Next.js build, GitHub CI run, live staging database test and FINBASE synchronization have not been verified. Do not describe this archive as production-ready.
