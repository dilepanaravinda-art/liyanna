# Iteration 42 — Deployment verification

Adds `npm run smoke:deployment`, a read-only HTTPS check for a real Vercel preview URL. It verifies the LIYANNA health API and HTML homepage, and supports Vercel deployment protection using `VERCEL_AUTOMATION_BYPASS_SECRET`. It does not use customer credentials, mutate records, invoke the integration worker or promote a deployment.

Example: `LIYANNA_PREVIEW_URL=https://your-preview.vercel.app npm run smoke:deployment`.

**Important:** The existing Vercel deployment predates these source changes. No new preview or production deployment has been created by this iteration. Build, migration, and FINBASE live verification remain required before release.
