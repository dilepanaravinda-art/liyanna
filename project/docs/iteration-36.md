# Iteration 36 — Outbox delivery integrity and secret-safe failures

- Fail closed on duplicate event IDs, malformed IDs, or more claimed events than requested, before outbound delivery.
- Do not persist exception messages from HTTP transport or provider authorization; they may contain credentials, URLs or sensitive payloads.
- Added four Node.js regression tests for these conditions.
- No production database migration or deployment was performed.
- This does not replace database-level unique constraints, lease ownership checks, or egress controls.
