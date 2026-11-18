# Iteration 22 — delivery-time authorization hardening

Rechecks connection consent, expiry, revocation, enabled `events:deliver` grant, and approval requirement immediately before vault credential resolution. This closes a time-of-check/time-of-use gap where an event could have been authorized earlier but consent revoked before delivery.

The service continues to require injected database, secret vault, approved endpoints and worker processor. No live database connection or FINBASE adapter is configured by this iteration.

Tests: `node --test src/integrations/vig/*.test.mjs` from project root.
