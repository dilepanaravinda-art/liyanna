# LIYANNA next development plan — 20 November 2026

## Completed foundation

LIYANNA now saves owner-only draft destinations and immutable cloud invoice review preparations. Exact retries retain the original event identity and payload. The cloud recomputes amounts, validates matching customer/source/destination versions, blocks stale or conflicting changes and enforces owner-only access. Review files use FINBASE's existing draft staging shape. FINBASE independently now has durable staging and scoped service credentials; these are existing capabilities, not newly implemented in this LIYANNA iteration.

## New sender foundation

The server-only sandbox sender adapter is implemented and tested with injected transports. It validates an exact HTTPS destination, rejects redirects/cookies, caps receipt size, applies a timeout and classifies authentication/conflict/temporary errors. It serializes the stored event identically for retries and returns a receipt/payload hash without raw credentials. It has no route, scheduler or live credential wiring. See docs/FINBASE-SANDBOX-SENDER.md.

## Proposed durable delivery ledger

The source now includes an isolated-tested PostgreSQL ledger migration with restricted dispatcher functions, source/destination/customer rechecks, leases, bounded retries, receipt preservation and idempotent acknowledgements. It has NOT been applied to LIYANNA, and no dispatcher identity or live worker is provisioned. See docs/FINBASE-DISPATCH-LEDGER.md.


## Inactive worker composition

The source now connects claim, scoped credential resolution, last-moment database reauthorization, sandbox send and durable acknowledgement for one attempt. The amended proposed migration checks source/destination/customer and lease validity again after credential lookup. An unconfirmed acknowledgement is reported as uncertain; retain the original event for recovery. This code remains inactive and the ledger migration remains unapplied. See docs/FINBASE-SANDBOX-DISPATCH.md.

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
