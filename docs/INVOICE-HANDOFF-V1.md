# Read-only invoice handoff v1

## Device download
Open Integrations, select FINBASE, and use Download invoice snapshot.
The file contains this device's invoice records and calculated totals; unsynced edits may differ from the cloud. Quotations are excluded.
This is an export for review, not a verified FINBASE import format.

## Cloud API
GET /api/integrations/finbase/invoices?businessId=<UUID>
Send Authorization: Bearer <current LIYANNA owner access token>.
Do not put tokens in URLs, logs or source. A FINBASE machine-to-machine adapter still needs its own reviewed service authorization and owner consent; this endpoint does not provision that connection.

The server verifies the Supabase user, reads through the existing user-scoped workspace RPC, and requires role=owner, scope=owner, and a matching business ID.
Staff accounts cannot export the whole workspace through this endpoint.
Responses use Cache-Control: no-store and Vary: Authorization.
No service-role key is used and no records are changed.
Missing/invalid authentication returns 401; invalid business IDs return 400; non-owner or mismatched responses return 403; service failures return a generic 503.

## Envelope
schemaVersion: liyanna.invoice-snapshot.v1
source: liyanna
mode: read-only
postingAuthorized: false
origin: device or cloud
businessId, businessName, workspaceRevision (null for a device export), updatedAt
documentStatus: unspecified
invoices: document ID/number/revision, issue/due dates, currency, customer name, items, calculated totals and updatedAt.

Money values are decimal strings. Each document keeps its own currency; no cross-currency aggregate is generated.
Invoices may include drafts. The current document model does not prove issuance, approval, payment or posting status. Consumers must not create accounting postings from this snapshot without the separately agreed workflow.
This is distinct from the draft invoiceIssuedV1 event contract.

## Remaining FINBASE work
Implement receiving validation, tenant/company/customer mapping, service authorization, explicit issuance/approval semantics, durable event idempotency and reconciled payment responses.
Then test one controlled staging invoice before enabling live synchronization.

## Review-file preparation

The owner interface prepares compact JSON review files capped at 100 invoices and 60,000 UTF-8 bytes each. Select each file in turn for manual download and FINBASE review. Exact invoice IDs and revisions are preserved; invoices are never truncated. Quotes are excluded. An oversized single invoice, duplicate ID/trimmed number, or incompatible field length blocks export with corrective guidance. Amount strings are canonicalized without changing monetary values.

The checklist shows missing customer names/due dates, reversed due dates, long customer names, tax mapping needs, nonpositive totals, currency precision, and issuance approval. Source currency and business identity must still be checked against the target company. These are source checks, not receiver acceptance or posting approval. Downloaded files may contain private customer information.

This batching applies to device-file export only. The existing owner-only cloud snapshot API retains its v1 contract. No connection, persistent mapping, import ledger, accounting write, or live authentication acceptance is added by this change.
