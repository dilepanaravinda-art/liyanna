# LIYANNA release status — 18 November 2026

## Completed and verified

The recovered source is on `release/verified-source-20261118` in https://github.com/dilepanaravinda-art/liyanna/pull/1. The deployed application commit is `82e787f374ebbc9ff3aaf92b4b2b0201d6fec2ba`.

GitHub Actions run https://github.com/dilepanaravinda-art/liyanna/actions/runs/44345786008 completed successfully. Vercel deployment `dpl_9ghwKfK8ppYgpmyoHwzazfzstfbK` is READY at https://liyanna-preview.vercel.app.

Both environments passed locked dependency installation, source preflight, TypeScript validation, 142 Node tests, 62 Vitest tests, the full Next.js production build and production runtime smoke tests (homepage, liveness and unauthenticated worker rejection). The live preview homepage, `/api/health` and `/api/ready` also returned HTTP 200.

The compilation failure in the lifecycle guard was fixed without widening its public overloads. Node and Vitest suites now have distinct runners, and pnpm is pinned to the version used in CI.

## Live database verification

The owner authorized pausing `investara-production`. It is now INACTIVE, and Liyanna project `yfbbwehvisofdkjtzacz` is ACTIVE_HEALTHY. The database connectivity query and Auth health endpoint passed (HTTP 200).

`database/tests/cloud-workspace-rollback.sql` was executed successfully against the live PostgreSQL database using the authenticated role and synthetic JWT claims. It verified business creation, quotation and invoice persistence/reload, stale revision rejection, owner backup, staff document isolation, blocked staff overwrites, outsider RLS and workspace access denial, and member revocation. All fixtures were rolled back; a separate query confirmed zero remaining test users and businesses. No customer data or schema was changed.

These database tests do not prove password login, browser interaction, PDF output or network synchronization through the frontend. Health advisors returned no findings. The security advisor reports leaked-password protection disabled; see https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

## Still unverified

- Actual password sign-in and account recovery through the deployed browser app.
- Signed-in invoice/quotation workflows, browser PDF output and cloud synchronization.
- Execution of additive migrations against an isolated staging database.
- Live FINBASE contract, credentials, synchronization and scheduled worker activation.

`/api/ready` confirms public configuration only; it does not prove Supabase availability. The worker remains disabled and unauthenticated requests return 401. The preview retains existing deployment protection. Production traffic has not been promoted.
