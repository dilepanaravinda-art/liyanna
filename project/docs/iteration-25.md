# Iteration 25 — Worker deployment configuration gate

Added `src/integrations/vig/worker-config.mjs` with strict opt-in configuration validation and Node.js tests. The production worker requires an explicit approval flag; absent or invalid configuration fails closed. Approved provider destinations must be HTTPS and not obvious local/private hosts. **This is not comprehensive SSRF prevention**: production deployments must also enforce DNS/IP egress restrictions, redirect blocking, and private-network controls at the network layer.

Environment configuration (never commit real secrets):
- `LIYANNA_WORKER_ENABLED=true` to opt in
- `LIYANNA_WORKER_PRODUCTION_APPROVED=true` for explicit production opt-in
- `LIYANNA_WORKER_SECRET` at least 32 characters
- `LIYANNA_WORKER_ID` UUID
- `LIYANNA_WORKER_BATCH_LIMIT` integer 1–100
- `LIYANNA_PROVIDER_ENDPOINTS` JSON object of provider identifiers to approved HTTPS endpoint URLs

The Next.js worker route remains disabled until a dedicated least-privilege PostgreSQL client, secret resolver and tested infrastructure are supplied. This iteration **does not** connect production infrastructure or enable the worker. Run `node --test src/integrations/vig/*.test.mjs` to execute the Node integration tests.
