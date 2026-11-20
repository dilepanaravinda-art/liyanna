# Phase A — Iteration 4

## Added
- `project/src/domain/commercial-reporting.ts`: pure, deterministic commercial summary calculation with tenant filtering, separate currency buckets, overdue balance by due date, and confirmed-payment-only receipts.
- `project/src/domain/commercial-reporting.test.ts`: test cases for tenant isolation, mixed currencies, reconciliation, overpayment, duplicates, and voided invoices.

## Boundaries and unresolved work
- This module is not wired to the application UI or persistence layer.
- Existing `paymentBalance` in `commercial.ts` includes unreconciled payments as received; do not use it for confirmed cash reporting. The new reporting module counts only reconciled payments.
- SQL migration `20261118100000_commercial_foundation.sql` remains **unapplied** and requires historical document-number seeding, schema compatibility checks, authorization verification, and a staging rehearsal.
- No test execution, typecheck or build verification is claimed without installed dependencies and actual command results.
- No production systems or user data changed.

## Next integration work
1. Reconcile historical document numbering and finalize server-side reservation contract.
2. Implement transactional quotation conversion, document mapping and approval audit.
3. Connect payment persistence and reconcile semantics with FINBASE.
4. Bind dashboard to authorized source data, then add UI components.
