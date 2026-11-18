# Iteration 11 — persistent connection groundwork

Added a **proposed**, unexecuted additive SQL migration with private-schema connection, capability grant and audit tables. Default access is denied to browser roles, and no connection endpoint or credential vault has been enabled. Added a pure state transition validator and unit tests.

## Integration invariants
- A provider manifest alone never authorizes an action.
- Tenant/business membership must be verified from trusted server-side records at every request.
- Owner consent and approval must be recorded and checked on the server, never inferred from UI flags.
- Revocation must invalidate active credentials and queued work; not yet implemented.
- Audit must be append-only by application policy and protected by restricted database roles; current schema is groundwork, not a complete tamper-proof audit design.
- Actual FINBASE API and mapping must be confirmed against FINBASE source before live synchronization.
- Future providers join through vetted manifests and adapters, not changes to invoice domain logic.

## Before deployment
Review the existing schema and migration dependencies, verify tenant ID mapping and role grants, implement a privileged authenticated server service and vault, run RLS-negative tests, build and run tests, review historical migration state, then deploy to staging. No production SQL was executed.
