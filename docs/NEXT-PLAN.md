# LIYANNA next development plan — 19 November 2026

## Completed this iteration

Saved owner-only FINBASE review destination settings: source business scope, target company reference, currency, income mapping reference, explicit confirmation, optimistic revisions, revocation and immutable audit entries. The additive migration was tested against isolated PostgreSQL, applied to LIYANNA, and verified on the connected database with rolled-back synthetic fixtures. No credentials, transactions, or automatic connection grants are stored by this feature. Next.js was patched to 16.4.6.

## 1. Verify the destination against FINBASE

Authenticate a dedicated owner account in each product. Verify actual FINBASE company membership, active revenue account and currency before marking any mapping as verified. Add mapping versions and revocation checks on the receiving side. The new LIYANNA settings are draft references only; saving them cannot establish FINBASE access.

## 2. Build staged imports with durable duplicate protection

In the isolated FINBASE integration branch, store pending imports separately from financial records. Add payload digests and a durable uniqueness rule for source business/document/revision, approval state, rejection reason and concurrency protection. Reject changed payloads using the same source identity and preserve an audit history. Acceptance: retries and concurrent submissions create one staged record and zero posted transactions.

## 3. Issuance approval and reconciliation

Define how a LIYANNA draft becomes an issued invoice. Capture owner approval against the exact revision and mappings, then validate tax/customer accounts. Only after these rules pass should a controlled financial posting path be developed. Test rollback, revocation, retries and reconciliation in isolated staging.

## 4. Real-account acceptance and selected-customer trial

Complete deployed password sign-in/recovery, cloud save/reload in two real browser sessions, owner/staff isolation, multilingual PDF inspection, and authenticated FINBASE review. Decide customer-facing preview access and complete onboarding before inviting selected businesses. Browser CI currently uses synthetic Auth and destination responses; live database tests use authenticated-role JWT claims rather than password sessions.

SaaS preview: https://liyanna-preview.vercel.app
FINBASE review: https://finbase-liyanna-preview.vercel.app
Source review: https://github.com/dilepanaravinda-art/liyanna/pull/1
