# LIYANNA Iteration 8 — Future-proof product integrations

## Implemented
- `project/src/integrations/vig/registry.ts`: provider-neutral, versioned manifest schema, registration and per-tenant/business/capability authorization checks.
- FINBASE and Vantoryx CRM sample manifests demonstrate extending the product catalog without editing LIYANNA document/domain code.
- Unit tests for provider registration, duplicate manifests, owner consent, revoked grants, cross-business isolation and per-action approvals.

## Architecture decisions
- The Vantoryx Integration Gateway (VIG) is independent of AI CEO. AI CEO can be an optional consumer of the same governed capabilities.
- A new product provides a vetted adapter and manifest, with its own versioned event/API contracts. The UI can discover capabilities from manifests rather than hardcoding FINBASE-specific screens.
- FINBASE remains the accounting authority, LIYANNA the invoice/quotation authority, CRM the opportunity authority.
- Unknown providers are denied; never accept untrusted manifests as executable plugins.

## Not implemented / mandatory before production
- No actual FINBASE adapter or verified FINBASE API compatibility (source not inspected).
- No server-side persistent grants, OAuth/service credentials, secret rotation, transport, signature verification, audit trail, transactional outbox/inbox, retries, capability-discovery API or integration marketplace UI.
- `approvedAction` is a trusted-server input placeholder; NEVER take it directly from a browser/client. Approval must be verified against a durable authorization record.
- Server authorization and RLS must be enforced at the data boundary; the pure registry is defense in depth only.
- Version compatibility/migrations and connector sandbox tests remain required.
- No production database or deployment changed.
