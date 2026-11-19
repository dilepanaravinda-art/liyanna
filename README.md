# LIYANNA

Quotation and invoice SaaS with English, Sinhala and Tamil documents, account-scoped device storage, optional Supabase workspace sharing, and PDF export.

## Current preview — 19 November 2026

- SaaS: https://liyanna-preview.vercel.app (Vercel access may be required).
- FINBASE review interface: https://finbase-liyanna-preview.vercel.app.
- Application commit: 76eee76f6b518b763aac7814ff4154c9f021e55b.
- Validation: 226 application tests (142 Node + 84 Vitest), TypeScript, release checks, production build and runtime smoke checks passed in GitHub run 44561802869. All five Chromium acceptance scenarios passed in run 44561802941 with synthetic authentication.
- Supabase was resumed and database persistence/tenant checks passed previously. Actual password recovery, real-account cloud editing, and authenticated FINBASE acceptance are still pending.

## Invoice review workflow

Owners can open Integrations > FINBASE to view source-data gaps and download invoice snapshots. Large workspaces are split into compact review files capped at 100 invoices and 60,000 UTF-8 bytes. Select and download each file separately, then upload it to FINBASE's review screen. Duplicates and oversized individual invoices block export with an explanation.

Snapshots explicitly carry postingAuthorized=false and unspecified issuance status. This workflow does not save imports, persist business mappings, create financial transactions, or enable automatic synchronization. Customer trials have not started.

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
