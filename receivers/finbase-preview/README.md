# FINBASE receiver preview source kit

Authoritative review: https://github.com/dilepanaravinda-art/finbase/pull/1
Branch: feature/liyanna-receiver-preview-20261119
Receiver commit: 945ca10965e280b2b9900e2cad97603a40f45be3

This kit accompanies LIYANNA's full source. The nested src/ and tests/ paths belong in FINBASE, not in LIYANNA/project.
Use the FINBASE draft PR for integration. route.patch records the narrowly scoped insertion against the reviewed base; do not replace a newer FINBASE API route wholesale.

POST /api/v1/integrations/liyanna/preview?tenantId=<FINBASE tenant>&companyId=<FINBASE company>
Body: {sourceBusinessId:<LIYANNA business UUID>,categoryId:<FINBASE income category>,snapshot:<LIYANNA JSON export>}
Use the existing FINBASE authenticated same-origin session. Existing origin and request-size protections apply (64 KB). Company scope and sales.write are required.
No service credential, live connection or persistent source mapping is created.

The receiver recomputes decimal line/subtotal/grand totals, rejects inconsistent data/duplicates and checks selected source-business identity. Company currency and available income mapping come from the authenticated FINBASE scope. It flags currency, customer, due-date, tax-mapping and issuance requirements.
postingAuthorized is always false. No sales/journal/import rows are inserted.
Candidate idempotency identities are stable but no durable idempotency store exists yet.

This is a receiving validation/mapping preview, not live synchronization. The next stage needs persistent source bindings, issuance/approval semantics, durable staged imports and controlled posting through FINBASE's existing approval service.

Files:
- src/modules/integrations/liyanna-preview.ts
- tests/unit/liyanna-preview.test.ts
- route.patch
