# FINBASE compatibility review — 18 November 2026

Reviewed FINBASE main source at eb0c09a070cc51c4fe73677403860d166605ac4d:
- components/IntegrationCenter.tsx marks Liyanna as "Adapter required", describes a future integration, and explicitly says "Integration gateway is not live".
- app/api/v1/[...path]/route.ts exposes owner integration registry/catalog/activity routes; this reviewed route does not define a LIYANNA invoice-event intake route.
- LIYANNA project/src/integrations/finbase/contracts.ts explicitly describes its schema as a draft, not a verified FINBASE specification.

Conclusion: a real LIYANNA-to-FINBASE connection cannot be certified by configuring credentials alone.

Required implementation on FINBASE:
1. Authenticated event intake with explicit tenant/company mapping and consent.
2. Durable event ID/revision idempotency and transactional import into the agreed sales/receivable workflow.
3. An agreed validation/response contract and failure/retry semantics.
4. A scoped reconciled-payment response that matches LIYANNA's payment status contract.
5. Staging migrations, contract fixtures and a controlled end-to-end invoice test.

Do not treat an integration registry record as evidence of invoice delivery. Keep the current LIYANNA worker disabled until the receiving adapter and staging tests exist.
