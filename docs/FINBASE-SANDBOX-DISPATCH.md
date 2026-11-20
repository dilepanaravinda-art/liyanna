# Inactive sandbox dispatch composition — 20 November 2026

sandbox-dispatch.ts connects the existing claim, credential resolution, last-moment authorization, sandbox send and finish interfaces for one attempt. It has no route, scheduler, login or credential provisioning. No live delivery is activated.

The PostgreSQL adapter uses parameterized calls through the proposed restricted dispatcher identity. A claim must match the requested source business and preparation/event ID. Credential metadata must match the source business, saved company, destination version and currency. The adapter reauthorizes after secret lookup, before HTTP; the proposed authorize function checks owner, source contents, customer, destination and active lease with at least 12 seconds remaining. HTTP remains capped at ten seconds. Changes after authorization may still affect an already in-flight request; this is not atomic remote cancellation.

Waiting, busy, blocked, review and already-staged claims never look up credentials or send. Disabled/non-sandbox input never touches the repository. Each invocation sends at most once. Results are acknowledged through the ledger. If acknowledgement fails after an HTTP request, the adapter returns ACKNOWLEDGEMENT_UNCONFIRMED rather than claiming a durable success. Recovery must inspect the ledger and retry only the unchanged persisted event once its lease permits it.

The trusted composition must provide the restricted database connection and a server-only credential resolver backed by secure configuration. These dependencies must never be selected by browser input. Do not use browser RPC or unrestricted service-role credentials to bypass dispatcher boundaries. Raw errors, credentials and receiver bodies are not returned.

The ledger migration remains unapplied and the dispatcher role has no login/membership. This source change amends that proposed migration only; it does not alter the connected database. Remaining work: isolated sandbox provisioning, secure credential installation, persistent worker scheduling, actual partner delivery/rotation/revocation acceptance, owner-visible history and issuance approval before financial posting.
