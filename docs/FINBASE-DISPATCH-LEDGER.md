# Proposed durable dispatch ledger — 20 November 2026

The additive 20261120090000_finbase_dispatch_ledger.sql migration supplies durable dispatch attempts and receipt tracking for a future trusted sandbox worker. It has been exercised against isolated PostgreSQL/PGlite, not applied to the connected LIYANNA database. No role membership, route, scheduler, credential or delivery activation is included.

Only the new NOLOGIN dispatcher role can execute the claim/finish functions. Browser roles cannot call them or mutate/read the ledger tables; the dispatcher cannot mutate tables directly either. A future restricted worker login must be reviewed before granting membership.

Claim locks the source business, rechecks its owner against the preparation actor, active destination/version/config, exact cloud invoice contents and matching customer. It preserves the prepared event payload, issues a 60-second lease and records an attempt. Active leases return busy; backoff returns waiting. Completed staging receipts and blocked/review states are terminal. Eight attempts is the maximum.

Finish accepts bounded sanitized results, never credentials or arbitrary error text. It rejects expired/replaced leases and conflicting acknowledgements; repeating the identical completed acknowledgement is idempotent. Network/temporary retries use exponential backoff. Finishing records the result and receipt atomically. A timeout may occur after remote staging committed: the next attempt must reuse the same immutable event.

A receipt can still arrive for a request already in flight when a destination is revoked. Record that outcome; subsequent claims are blocked. This does not provide atomic cancellation of a remote request. It does not establish verified source ownership or invoice issuance and cannot authorize financial posting.

Remaining work: apply the reviewed ledger migration only during controlled sandbox setup, provision a dedicated restricted worker identity and short-lived credential, wire authorization/claim/send/finish, test actual network retries/rotation/revocation, add owner-visible delivery history and cover these records in backup/recovery. No migration or live delivery was performed for this iteration.
