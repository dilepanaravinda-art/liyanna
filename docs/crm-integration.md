# LIYANNA ↔ Vantoryx CRM integration design

Status: design proposal, not implemented.

## Ownership
- CRM: leads, contacts, opportunities, sales users, commissions.
- LIYANNA: quotations, invoices, document numbering, revisions, billing records.

## Initial flows
1. From an authorized CRM opportunity, request quotation creation in LIYANNA with tenant, opportunity, contact and currency references.
2. LIYANNA returns its quotation ID and revision; CRM stores the link, not a second authoritative quotation copy.
3. LIYANNA emits signed, idempotent status events for quote issued/accepted/rejected/expired and invoice issued/payment recorded.
4. CRM updates opportunity status and commission eligibility only after validated events.

## Security and reliability
- Enforce tenant isolation and per-user permissions on both sides.
- Authenticate API calls and verify webhook signatures; rotate secrets.
- Use external IDs, idempotency keys, retry queues, audit logs and reconciliation jobs.
- Never trust tenant IDs or deal ownership from client-side requests alone.
- No production credentials in GitHub; keep environments separated.

## Recovery prerequisites
- Obtain every source file from Vercel or original development workspace.
- Verify dependencies, required environment variables, Supabase schema/RPCs, tests and clean build.
- Deploy an isolated staging project; perform quotation/PDF/customer regression tests.
- Do not repoint `liyanna.vercel.app` until approved.
