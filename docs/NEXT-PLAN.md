# LIYANNA next development plan — 19 November 2026

## Completed foundation

LIYANNA now saves owner-only draft destinations and immutable cloud invoice review preparations. Exact retries retain the original event identity and payload. The cloud recomputes amounts, validates matching customer/source/destination versions, blocks stale or conflicting changes and enforces owner-only access. Review files use FINBASE's existing draft staging shape. FINBASE independently now has durable staging and scoped service credentials; these are existing capabilities, not newly implemented in this LIYANNA iteration.

## 1. Real-account sandbox acceptance

Use dedicated LIYANNA and FINBASE sandbox accounts. Save/sync one invoice and matching customer, declare the verified LIYANNA business ID as both source tenant and source business, confirm destination company membership/currency, then stage the downloaded event. Verify the receipt, exact retry and source/version conflicts. Capture actual password/cloud/PDF workflows too. Automated tests use synthetic Auth responses and database-role claims, not real account sign-in.

## 2. Connect the scoped server sender

Provision the one-hour FINBASE credential through its administrator UI into the sender's server secret configuration. Add a fixed HTTPS receiver allowlist, disabled-by-default sandbox delivery, stable payload retries, timeouts, redirect rejection, receipt persistence and credential rotation/revocation tests. No raw tokens belong in browser storage, chat, source control or logs. Do not enable production delivery merely because staging succeeds.

## 3. Issuance approval and financial controls

Agree an actual issued-invoice lifecycle and proof tied to exact document/mapping revisions. Add verified customer, tax and income mappings, owner approval, duplicate prevention, reversal and reconciliation rules before financial posting. The draft invoiceIssuedV1 contract name and issuedOn field currently carry no proof of issuance. Preparation/staging remain review-only.

## 4. Controlled customer trial

Complete real-account recovery, two-session cloud editing, owner/staff isolation, visual multilingual PDF checks and end-to-end backup coverage of the new cloud records. Decide preview access, onboard named pilot businesses and record acceptance/support feedback before public launch.

SaaS preview: https://liyanna-preview.vercel.app
Current FINBASE source: https://github.com/dilepanaravinda-art/finbase
LIYANNA source review: https://github.com/dilepanaravinda-art/liyanna/pull/1
