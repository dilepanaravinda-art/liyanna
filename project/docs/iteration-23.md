# Iteration 23 — Runnable server-side batch processor

Added `src/integrations/vig/delivery-processor.mjs` and six Node.js regression tests. The worker service now defaults to this real Node.js batch processor, while still allowing a test-injected processor. Previously, callers had to inject a processor manually; without that injection the service could not execute.

The processor performs authorization checks, at-least-once delivery, acknowledgement, exponential retry, terminal dead-lettering, and lost-lease accounting. It does not create credentials or database clients.

## Release blockers

- A trusted server-side scheduled endpoint and dedicated least-privilege database client are not yet configured.
- Worker SQL migrations have not been executed on a staging database.
- No production or staging FINBASE API credentials have been configured.
- Full Next.js build/typecheck and end-to-end integration still require validation.
