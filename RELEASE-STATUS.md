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

## Latest local validation

The latest source passed a fresh locked dependency install, TypeScript, release preflight, 142 Node tests and 65 Vitest tests (207 total), the full Next.js production build, and production runtime smoke tests. The three new PDF tests render real multipage invoice and quotation documents using the application template and exercise bundled English/Sinhala/Tamil fonts through the PDF probe. They validate PDF structure and pagination, not browser shaping or visual appearance. No application runtime behavior changed in this follow-up; the preview continues to serve the previously verified runtime.

## Browser acceptance update

GitHub Actions browser run https://github.com/dilepanaravinda-art/liyanna/actions/runs/44352142203 passed against application/test commit b8a6cb55b3080517dc490956d90639c5f28e2c82. Chromium verified the sign-in UI, business setup, invoice and quote save, real PDF download structure, record persistence after page reload, and sign-out. Authentication responses were synthetic; this does not establish actual Supabase password login or recovery, cross-browser cloud sync, or PDF visual correctness in Sinhala/Tamil. The local browser process was restricted; the same test passed on GitHub's Linux runner.

Controlled-trial steps are documented in docs/TRIAL-AND-INTEGRATION-ACCEPTANCE.md. No trial invitations have been sent. The owner currently provisions accounts through Supabase; there is no SaaS owner admin dashboard in LIYANNA.

FINBASE source review identified an adapter implementation gap, not only missing configuration. Its integration UI explicitly marks LIYANNA as Adapter required and its gateway as not live. See docs/FINBASE-COMPATIBILITY-REVIEW.md. Live synchronization remains incomplete.

## Still unverified

- Actual password sign-in and account recovery through the deployed browser app.
- Signed-in invoice/quotation workflows, browser PDF output and cloud synchronization.
- Execution of additive migrations against an isolated staging database.
- Live FINBASE contract, credentials, synchronization and scheduled worker activation.

`/api/ready` confirms public configuration only; it does not prove Supabase availability. The worker remains disabled and unauthenticated requests return 401. The preview retains existing deployment protection. Production traffic has not been promoted.

## Extended browser and live-account checks

Browser run https://github.com/dilepanaravinda-art/liyanna/actions/runs/44354270120 passed all four scenarios on 18 November 2026: failed-login error/password clearing, generic recovery confirmation, expired-link rejection, and the trial journey including invoice and quotation PDF downloads in English/Sinhala/Tamil. Auth responses were synthetic. PDF headers and nonempty output were checked; visual accuracy was not approved.

Added project/scripts/verify-live-account.mjs for two real sessions and read-only business/workspace comparison. Syntax validation passed; live execution has not run because dedicated test credentials were not supplied. It neither edits records nor sends email. See docs/LIVE-ACCOUNT-AND-PREVIEW-ACCESS.md.

A fresh browser redirected the preview to Vercel login. The current URL therefore requires Vercel access and must not be advertised as an anonymously accessible customer SaaS. No protection settings were changed. Customer onboarding remains manual and the trial has not started. FINBASE receiving-adapter work remains open. This update does not change the deployed application runtime.
