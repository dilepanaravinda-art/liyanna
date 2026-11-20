# Iteration 13 — provider-neutral event delivery foundation

Added `src/integrations/vig/event-envelope.ts` and unit tests. Defines a strict, versioned integration event envelope; a delivery-store interface requiring atomic claim/deduplication; authorization recheck on each attempt; exponential retry with a dead-letter cutoff. No secrets or customer financial data should be placed in generic event payloads: adapters should pass references and retrieve permitted details from authoritative services.

## Not yet implemented
- Persistent transactional outbox and delivery store, worker/queue, credential vault, signature verification, provider endpoints and real FINBASE API mapping.
- No database migration applied, no production deployment, no live connection.
- Do not invoke the delivery helper from a browser or treat the example transport as a production connector.

## Next step
Implement a database-backed delivery store with unique `(event_id, destination)` constraint, lease-based atomic claims, transactional event publication, tenant-verified authorization, and integration tests for concurrent workers and failures. Validate FINBASE's actual connector contract before mapping invoices.
