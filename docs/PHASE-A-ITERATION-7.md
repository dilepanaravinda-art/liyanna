# LIYANNA — Iteration 7: FINBASE integration boundary

## Implemented (source only)
- Versioned, strict Zod contracts for invoice-issued and reconciled payment-status events.
- Explicit connection mode, owner-enabled flag, capability scopes, and tenant/business boundary validation.
- Pure validation helpers; no network requests, credential handling, production migrations, or FINBASE writes.
- Contract unit tests for scope enforcement, disconnection, strict schema and invalid amounts.

## Critical limitations
This is a proposed Vantoryx Integration Gateway contract, **not** an implementation of FINBASE's actual AI CEO connector. FINBASE source/API documentation has not been inspected in this iteration. There is no live integration, no UI toggle, no secure transport, no webhook signature validation, no event outbox/inbox, and no reconciled accounting data flowing into LIYANNA. Never represent it as connected or deployed.

## Next steps
1. Inspect actual FINBASE connector source and agree on compatible versioned contracts.
2. Implement authenticated server-to-server transport, replay prevention, event inbox/outbox and retries.
3. Implement owner authorization and per-tenant connection settings stored server-side with RLS.
4. Map issued LIYANNA invoices to FINBASE receivables; preserve FINBASE as accounting authority.
5. Integrate status read model into UI, showing sync freshness and stale/disconnected warnings.
6. Run integration tests against a FINBASE sandbox before production deployment.
