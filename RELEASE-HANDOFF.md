# LIYANNA remaining release work

The source publication, full compilation and preview deployment are completed. See RELEASE-STATUS.md for evidence. Do not repeat the previous archive-only release loop.

1. Resolve the Supabase active-project limit through an owner decision: upgrade the relevant plan, or explicitly select an active project to pause. Resume existing Liyanna project `yfbbwehvisofdkjtzacz` afterward.
2. Inspect the live schema and migration history before applying any SQL. Verify authentication and account-scoped access, then test invoice/quotation save, numbering, PDF output, backup and cloud synchronization with authorized test data.
3. Validate additive database changes in staging and verify the real FINBASE contract and credential storage before enabling any integration worker.
4. Promote a verified application release only after the remaining runtime checks and release approval.

The verified preview is https://liyanna-preview.vercel.app. Existing Vercel preview protection applies. No production migration, project pausing or paid-plan change is part of the source recovery.
