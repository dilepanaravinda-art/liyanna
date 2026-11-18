# LIYANNA release status — 18 November 2026

## Completed and verified

The recovered source is on `release/verified-source-20261118` in https://github.com/dilepanaravinda-art/liyanna/pull/1. The deployed application commit is `82e787f374ebbc9ff3aaf92b4b2b0201d6fec2ba`.

GitHub Actions run https://github.com/dilepanaravinda-art/liyanna/actions/runs/44345786008 completed successfully. Vercel deployment `dpl_9ghwKfK8ppYgpmyoHwzazfzstfbK` is READY at https://liyanna-preview.vercel.app.

Both environments passed locked dependency installation, source preflight, TypeScript validation, 142 Node tests, 62 Vitest tests, the full Next.js production build and production runtime smoke tests (homepage, liveness and unauthenticated worker rejection). The live preview homepage, `/api/health` and `/api/ready` also returned HTTP 200.

The compilation failure in the lifecycle guard was fixed without widening its public overloads. Node and Vitest suites now have distinct runners, and pnpm is pinned to the version used in CI.

## Current blocking decision

The existing Liyanna Supabase project `yfbbwehvisofdkjtzacz` reports INACTIVE. Its resume request was rejected due to the account's two-active-free-project limit. The active projects are `investara-production` and `vantoryx-webstudio`.

An owner must choose whether to upgrade the relevant Supabase plan or pause an explicitly selected active project before LIYANNA can resume. Pausing another project interrupts that project's backend. No other project was modified and no plan was upgraded.

## Still unverified

- Live authentication and database schema compatibility, because the database is paused.
- Signed-in invoice/quotation workflows, browser PDF output and cloud synchronization.
- Execution of additive migrations against an isolated staging database.
- Live FINBASE contract, credentials, synchronization and scheduled worker activation.

`/api/ready` confirms public configuration only; it does not prove Supabase availability. The worker remains disabled and unauthenticated requests return 401. The preview retains existing deployment protection. Production traffic has not been promoted.
