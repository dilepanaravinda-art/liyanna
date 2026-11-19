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
