# Iteration 20 — server-side worker composition

Added `src/integrations/vig/worker-service.mjs` to compose the PostgreSQL repository, existing worker runtime, and secure transport.

## Security and configuration
- Requires a dedicated database query client, secret resolver, batch processor, and fetch implementation supplied by a trusted server environment.
- Reads `provider_id` and `credential_reference` from the existing private connection schema; credentials must come from a separate server-side vault resolver.
- Endpoint URLs are configured centrally in `config.providerEndpoints`, not controlled by integration records. Every configured endpoint must use HTTPS and match `config.allowedOrigins`.
- Does not deploy a scheduled worker, grant database privileges, or connect to a live provider.

## Verification
`node --test src/integrations/vig/*.test.mjs`: 32 passed, 0 failed (on 2026-11-18). Full Vitest suite, typecheck, production build, live PostgreSQL and FINBASE tests not run.

## Integration checklist
1. Review SQL migrations and PostgreSQL roles against the actual database. Existing schema and worker SQL contracts must be reconciled before deployment.
2. Implement a server-only vault resolver and provider endpoint configuration.
3. Wire the TypeScript `processDeliveryBatch` into the runtime via an authenticated scheduled server entry point.
4. Test claim, authorization, delivery, retries, and dead-letter behavior against a disposable database.
5. Run complete application tests and build, then deploy a preview.
