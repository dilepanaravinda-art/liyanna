# Sandbox sender adapter — 20 November 2026

The server-only sandbox-sender.ts adapter is implemented but is not connected to a route, scheduled worker, environment credential or live sender. No external delivery is activated by importing this source package.

A trusted server composition must explicitly enable sandbox mode, supply an exact HTTPS origin and fixed /api/integrations/liyanna/events URL, and obtain a scoped FINBASE credential through server secret configuration. Never accept these configuration values from a browser request. The adapter rejects redirects, cookies, credentials in URLs, query strings, IP/local host destinations and unapproved origins. It validates the draft event before sending, caps the response stream at 8 KB and applies an abort timeout up to ten seconds.

Exact retries serialize the same stored event. Successful staging requires a valid authenticated review-only receipt with zero ledger entries and posting authorization false. The return value includes a SHA-256 payload hash, receipt ID and duplicate flag, not the credential or raw receiver body. A receipt does not prove invoice issuance or source ownership.

Authentication/scope errors halt delivery; 409 conflicts require operator review. Network/timeouts, 429 and temporary server failures are retryable with the original event identity and payload. There is no automatic retry loop. A timeout may occur after the receiver committed: retain the event and retry it unchanged. Do not mint a replacement event ID.

Still required before integration activation: verified source/target ownership, dedicated sandbox accounts, secure short-lived credential provisioning, persistent delivery attempts/receipts, current source/destination revocation checks at dispatch, real network acceptance including rotation/revocation, and approved issuance semantics. This module alone grants no dispatch authority and does not authorize financial posting.
