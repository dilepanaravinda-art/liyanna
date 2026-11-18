# Iteration 39 — shared fail-closed consent validation

Both the PostgreSQL authorization adapter and the worker credential-resolution path now use a single shared validation function. Malformed expiry timestamps and future/invalid consent timestamps are rejected. This closes a discrepancy in which `Invalid Date` comparisons could allow delivery.

Validation: Node.js tests and release preflight. No live PostgreSQL, FINBASE or Next.js build claims. No production changes.
