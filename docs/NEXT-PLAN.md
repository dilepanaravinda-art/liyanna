# LIYANNA next development plan — 19 November 2026

## Completed this iteration

Owner invoice review checklist, exact-value normalization, duplicate detection, bounded review files, manual file selection, and seven batch regression tests. Application commit 76eee76f6b518b763aac7814ff4154c9f021e55b passed 226 application tests and five Chromium scenarios. The browser scenarios use synthetic Auth responses, not real-account acceptance.

## 1. Real-account acceptance

Use a dedicated account to verify deployed sign-in/recovery, cloud save/reload in two browser sessions, owner/staff isolation, and one LIYANNA file review through FINBASE's authenticated endpoint. Acceptance: correct source business, destination company and totals, no transactions created, and access revocation blocks subsequent requests.

## 2. Persistent business and account mappings

Develop company-scoped source-business bindings with owner consent, mapping version, income/tax/customer mappings, revocation and an audit trail. Validate against staging database policies before applying migrations. Acceptance: cross-company access rejected, stale mappings rejected, and company changes clear pending files and results. Do not store credentials or access grants in browser storage.

## 3. Staged imports and duplicate prevention

Store pending imports separately from posted financial records. Add a durable uniqueness rule for source business/document/revision, payload digest, review state, rejection reason and concurrency protection. Acceptance: repeated/concurrent submissions do not duplicate records, changed payloads are flagged, and all invoice rows remain unposted until approval.

## 4. Issuance approval and controlled trial

Define how a LIYANNA draft becomes an issued invoice; verify approvals and audit history before building financial posting. Test rollback, retry behavior and reconciliation in staging, then complete selected-customer onboarding and the public access decision. Automatic sync and production promotion remain separate release steps.

SaaS preview: https://liyanna-preview.vercel.app
FINBASE review: https://finbase-liyanna-preview.vercel.app
