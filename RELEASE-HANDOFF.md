# LIYANNA next release plan

SaaS preview: https://liyanna-preview.vercel.app
Source review: https://github.com/dilepanaravinda-art/liyanna/pull/1

## Verified foundation
- Full application compilation, TypeScript and release checks pass.
- Live Supabase is active. Auth health and database connectivity pass.
- Real PostgreSQL tests cover business creation, quotation/invoice persistence, stale updates, backup authorization, staff isolation, outsider RLS and revoked memberships. Fixtures are rolled back.
- PDF tests generate real multipage invoice and quotation files with the application template and verify PDF structure; the separate multilingual probe loads bundled English, Sinhala and Tamil fonts. These tests do not establish browser shaping or visual accuracy.

## Next milestone: signed-in browser acceptance
Use a dedicated test account to verify login, recovery, business setup, customer creation, quotation save/reopen, invoice save/reopen, and cloud refresh from a second browser context. Verify downloaded PDFs visually in English, Sinhala and Tamil, including long notes and multipage documents. Record failures and fix them before inviting trial users. Existing account credentials are not included in this source.

## Then: controlled customer trial
Confirm account onboarding and owner/staff access from the UI. Verify backups and restore from the UI and agree the release version for the first selected businesses. Promote only the tested application after acceptance.

## Separate integration milestone
Inspect live migration history and test additive commercial/integration migrations in isolated staging. Confirm the actual FINBASE endpoint, versioned contract and server-side credentials. Run one controlled invoice synchronization with duplicate/retry checks before enabling the scheduled worker.

The current preview serves the verified application runtime. The latest source also contains the added database/PDF regression tests and release documentation. FINBASE synchronization remains unverified.
