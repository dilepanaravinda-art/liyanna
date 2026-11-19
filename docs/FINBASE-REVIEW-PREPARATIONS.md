# LIYANNA cloud review events — 19 November 2026

## Workflow

1. Save/sync the invoice and its matching customer record to the LIYANNA cloud business. Customer name, email and phone must match.
2. Save an active draft FINBASE review destination with the invoice currency.
3. Open Integrations > FINBASE > Cloud review events. Reload after changing the destination. Choose an invoice and matching customer, confirm staging-only review, and prepare.
4. Download the saved review event. In a dedicated FINBASE sandbox, declare this LIYANNA business UUID as both source tenant and source business, then use FINBASE's staging inbox to review the event. Verify actual destination ownership, company currency and permissions first.
5. Retry using the same saved event file. Do not regenerate event IDs to bypass a conflict. HTTP/staging success is not accounting posting.

FINBASE's current main source was reviewed: docs/LIYANNA-DURABLE-STAGING-2026-11-19.md and docs/LIYANNA-SERVICE-DELIVERY-2026-11-19.md. The event matches its existing strict draft invoiceIssuedV1 shape. Despite that historical contract name and issuedOn field, preparation is not evidence that a draft invoice was issued. The UI and RPC explicitly deny posting authorization. FINBASE must retain source ownership/issuance as unverified until the separate sandbox acceptance process succeeds.

## Durable identity and authorization

The new owner-only liyanna_finbase_review RPC derives source IDs, invoice number/revision, customer reference, dates, currency and rounded totals from cloud rows. The caller cannot submit totals, payloads or event IDs. The database locks the business before checking ownership, then checks the expected invoice/destination revisions and active destination. It recomputes line rounding, discount and tax using numeric arithmetic.

One immutable preparation exists per business/document/revision. Exact retries return the original event ID, timestamp and payload. Changed source contents, customer or destination versions conflict rather than generating another ID for the same invoice revision. A destination revocation blocks new preparation and exact preparation retries, while the owner can still read historical files. No delivery token, credential or FINBASE session is stored.

Prepared records are append-only for the application roles. Staff, outsiders and anonymous callers cannot read or prepare them. The latest 30 preparations are shown; older preparations can still be recovered by an exact confirmed prepare call against the unchanged active source/destination. These separate cloud records are not included in device workspace backups. Cover them in normal database backups.

## Limits and remaining work

Preparation currently supports LKR, USD, EUR, GBP, AUD, CAD, NZD, SGD, INR, CNY, AED and SAR (two decimal places). The ordinary invoice/PDF/snapshot workflows retain their existing currency support. Quotes, unmatched customers, unsynced/stale records, invalid dates and nonpositive/oversized totals cannot be prepared.

No live service delivery is enabled by this feature, and no FINBASE mapping/credential/event or financial record is created automatically. Real-account source ownership, sandbox delivery/retry/revocation, issuance approval and posting/reversal rules remain outstanding. Automated browser tests use synthetic Auth/RPC responses; database rollback tests use real PostgreSQL authenticated-role claims with synthetic fixtures.

Migration 20261119110000_finbase_review_preparations.sql requires the existing workspace schema and 20261119100000_finbase_review_destinations.sql only. It does not activate optional worker/commercial migrations. The reproducible live rollback script is database/tests/finbase-review-preparations-rollback.sql.
