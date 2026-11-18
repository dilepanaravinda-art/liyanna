# Iteration 26 — Provider destination hardening and verification

Introduces a shared provider endpoint policy for worker configuration and outbound transport. Rejects non-HTTPS URLs, credentials, fragments, nonstandard ports, literal IPs (IPv4 and IPv6), localhost and internal-only domain suffixes. Adds 17 endpoint-policy tests. This is application-level defense in depth; production must additionally enforce DNS-resolved IP restrictions at the network/egress layer to mitigate DNS rebinding.

Verification: `node --test src/integrations/vig/*.test.mjs` passes 73 tests. Full Next.js build/typecheck were not run because dependencies were not installed and package registry DNS resolution failed. No database migrations or production deployment were performed.
