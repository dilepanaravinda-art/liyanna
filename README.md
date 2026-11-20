# LIYANNA

Quotation and invoice SaaS with English, Sinhala and Tamil documents, account-scoped device storage, optional Supabase workspace sharing, and PDF export.

## Current preview — 19 November 2026

- SaaS: https://liyanna-preview.vercel.app (Vercel access may be required).
- FINBASE review interface: https://finbase-liyanna-preview.vercel.app.
- Application commit: e882a89b9d8b6b5714e9941116d515e6108a2515.
- Validation: 245 application tests (142 Node + 103 Vitest), TypeScript, release checks, production build and runtime smoke checks passed in GitHub run 44566792174. All five Chromium acceptance scenarios passed in run 44566792194 with synthetic authentication.
- Supabase was resumed and database persistence/tenant checks passed previously. Actual password recovery, real-account cloud editing, and authenticated FINBASE acceptance are still pending.

## Saved review destinations

Owners can save a FINBASE company reference, currency and income mapping under Integrations > FINBASE. Cloud settings have explicit confirmation, server-side owner authorization, stale-version rejection, revocation and immutable audit entries. These remain unverified draft references, not an active FINBASE connection. The additive review-destination migration was applied and verified with rolled-back synthetic fixtures. Device workspace backups do not contain these separate cloud settings.

Next.js is pinned to 16.4.6. See docs/FINBASE-DESTINATION-SETTINGS.md for the storage and authorization contract.

## Cloud review event preparation

Owners can prepare durable draft-contract events from cloud invoices and matching customer records. The database calculates exact totals and preserves the same event ID, timestamp and payload on retries. Stale source/destination versions and changed payloads conflict; revocation blocks preparation. Events can be downloaded for FINBASE sandbox staging without enabling live delivery or accounting posting. See docs/FINBASE-REVIEW-PREPARATIONS.md for scope, supported currencies and acceptance limits.

## Invoice review workflow

Owners can open Integrations > FINBASE to view source-data gaps and download invoice snapshots. Large workspaces are split into compact review files capped at 100 invoices and 60,000 UTF-8 bytes. Select and download each file separately, then upload it to FINBASE's review screen. Duplicates and oversized individual invoices block export with an explanation.

Snapshots explicitly carry postingAuthorized=false and unspecified issuance status. This workflow does not save imports, create financial transactions, or enable automatic synchronization. Customer trials have not started.

## Develop and validate

Use Node.js 22 and pnpm 10.28.0. From project/:

```sh
pnpm install --frozen-lockfile
pnpm verify:release
pnpm typecheck
pnpm test
pnpm build
pnpm smoke:production
```

Use environment.example for local placeholders; never commit credentials or customer records. The project/ directory contains the complete application and bundled PDF fonts. database/ contains recovery references and proposed migrations, not a customer database backup. The optional integration worker remains disabled.

See RELEASE-STATUS.md for validation history, docs/NEXT-PLAN.md for remaining work, docs/INVOICE-HANDOFF-V1.md for the file contract, and receivers/finbase-preview/ for the receiving integration kit. The full FINBASE implementation is reviewed separately at https://github.com/dilepanaravinda-art/finbase/pull/1.
