# Phase A iteration 3 — source-only database groundwork

Added an additive SQL migration for server-side document numbering, conversion uniqueness, and payment records, plus offline draft-number guards and unit tests.

**NOT PRODUCTION READY:** Before applying, seed counters from historical document numbers and existing business sequences; otherwise old numbers may be reused. Verify existing schema, grants and tenant access. Conversion and payment tables require permission-checked transactional write endpoints. UI flows are not yet wired. No database migration has been executed. Dependencies are absent in this environment, so tests and build were not run.
