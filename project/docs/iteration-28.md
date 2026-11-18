# Iteration 28 — Migration ordering and release preflight

## Verified defect fixed
The previous four SQL files shared the same `20261118_` prefix, and lexical execution would place `vig_event_queue` before `vig_private_connections`. This fails because `event_outbox.connection_id` references `connections.id`. They now have 14-digit chronological migration identifiers in dependency order.

## Read-only verification
From `project/` run `node scripts/verify-migrations.mjs` and `node --test scripts/verify-migrations.test.mjs src/integrations/vig/*.test.mjs`. The migration preflight rejects missing, unexpected, or out-of-order files and checks selected schema security contracts. It does NOT parse or execute SQL, nor prove migration compatibility with a real database.

## Critical deployment warning
Do not apply these files to an existing Supabase project without inspecting its migration history first. If the old migration identifiers have already been recorded, renaming them can cause duplicate migration execution or migration-history divergence. Reconcile with the actual remote history before any staging or production application. Do not grant browser roles access to the private integration schema.

## Still blocked
Full Next.js build was not verified: npm offline install failed because the package cache lacks required dependencies. No staging SQL execution, live FINBASE integration, or Vercel deployment occurred.
