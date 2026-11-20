# Iteration 27 — DNS preflight hardening

Added `src/integrations/vig/dns-policy.mjs` and tests. The secure HTTP transport checks all DNS answers before delivery, rejecting private, reserved, mixed, invalid and IPv6 addresses. The DNS resolver is injectable for deterministic tests and is propagated through worker runtime/service. The default resolver uses Node's `dns.promises.lookup`.

## Security limitation

This is **only preflight defense in depth**: a later HTTP fetch can resolve the hostname again, so DNS rebinding remains possible. Do not activate outbound integrations in production without an egress proxy/firewall or transport that pins the resolved IP address and validates TLS hostname. Keep the existing origin allowlist and redirect rejection. IPv6 is conservatively blocked until a trusted egress solution supports it.

## Verification

`node --test src/integrations/vig/*.test.mjs` — 87 tests passed. No production deployment or migration performed. Full Next.js build and database integration are not verified.
