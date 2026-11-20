# Liyanna — source audit and phased implementation baseline

## Scope and evidence
Reviewed the uploaded recovered source snapshot (74 archive entries), including domain model, document saving, cloud sync, app orchestration, money calculations, and SQL definitions. This is a static audit, not a production security certification.

## Confirmed current architecture
- Next.js 16 / React 19 / TypeScript application with Supabase authentication and RPC-based cloud sync.
- Local workspace snapshots with IndexedDB and revision checks.
- `Document` supports `quote` and `invoice`, but has no lifecycle status or payment ledger fields.
- `allocateLocalNumber` derives numbers from local snapshot sequences; `app.tsx` increments sequence on initial save.
- `prepareDocumentSave` prevents duplicate numbers within a single snapshot and rejects stale document revisions.
- Cloud `sync` SQL locks the business row and checks expected revision, but numbering and offline/concurrent-device behavior require end-to-end testing.
- Decimal.js is used for currency arithmetic; PDFMake rendering and multilingual fonts are included.
- SQL uses SECURITY DEFINER functions and RLS; review effective grants, role boundaries, and tenant isolation with actual database tests before release.

## Highest-priority gaps
1. **Critical:** Implement authoritative server-issued final document numbers and temporary offline draft IDs. Preserve existing document numbers. Test concurrency across devices.
2. **Critical:** Prove SQL authorization and tenant isolation with authenticated owner, staff and unauthorized test users. Never execute `restore.sql` on production.
3. **High:** Introduce additive status/event/payment tables and server-enforced transitions. Preserve legacy documents and backups.
4. **High:** Implement payment reconciliation with FINBASE as accounting system of record; no duplicate receivable authority.
5. **High:** Build owner-controlled, opt-in AI CEO connector with scoped permissions, approval workflow, audit and revocation.
6. **Medium:** Improve commercial dashboards, responsive navigation, accessibility and localized copy.

## Incremental implementation started
`src/domain/lifecycle.ts` adds a pure, opt-in status-transition policy without changing existing persisted document shapes or production behavior. It is a foundation only; it does not yet provide approvals, payments, database persistence or enforced authorization. Its transitions are proposed defaults and require product approval before wiring to live operations.

## Next development steps
- Add tests for the lifecycle policy and existing monetary calculations.
- Design additive SQL migrations with tenant-specific policies and migration rollback strategy.
- Implement server-authoritative numbering and conflict-safe conversion.
- Add document status history and payment records behind feature flags.
- Add connector capability contracts and supervised approval gates.
- Test and deploy to staging, migrate only after backup and verification.

## Verification status
Static inspection completed for listed modules. Dependency installation, TypeScript checks, unit tests, browser tests, database integration tests and production build have **not been run** in this audit. No production changes were made.
