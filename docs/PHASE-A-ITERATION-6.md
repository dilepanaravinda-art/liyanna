# Phase A — Iteration 6

## Implemented
- Added a read-only Commercial Overview screen to the existing sidebar.
- Uses existing workspace snapshot, current business isolation, and deterministic Decimal.js totals from existing financial calculation logic.
- Groups invoice and quotation face values by currency, without inventing exchange rates.
- Includes customer/document search, type filtering, and invalid-document warning.
- Does not mutate data, issue documents, claim collections or assume lifecycle statuses.

## Remaining risks
- No reliable persisted invoice/quotation lifecycle or payment reconciliation in current workspace snapshot.
- Current local document number allocation is not authoritative across devices.
- UI labels are English placeholders; translate for Sinhala and Tamil before release.
- No production migration or deployment performed.
- Tests/build require dependencies and must be run before release.
