# Controlled trial and live integration acceptance

## Trial onboarding
Use the preview at https://liyanna-preview.vercel.app for selected test businesses only.
The owner provisions each participant's account through Supabase Authentication; this application does not yet provide an owner administration dashboard or self-service signup.
Do not share owner credentials. Use a separate account for each participant.
Complete the normal password setup/recovery flow and verify the redirect returns to the intended deployment.
Create a test business, choose currency and document language, and save a customer.
Create a quotation and invoice, save, reopen after refresh, and verify numbering and totals.
Download and visually review PDFs in English, Sinhala and Tamil; check long notes and page boundaries.
Export a backup, restore into a disposable workspace, and compare customer/document counts.
Enable team sharing explicitly. Open the business in a second independent browser session; verify updates and revision conflicts.
Test owner and staff permissions through the UI and revoke the staff account before finishing.
Record observed results and any error text. Invite actual customers only after these checks pass.
No invitations or emails were sent by this development update.

## Automated browser scope
Run from project: pnpm exec playwright install --with-deps chromium, then pnpm e2e.
The browser test uses a synthetic authentication provider and real local IndexedDB and PDF downloads.
It does not validate live Supabase passwords, recovery delivery, cloud synchronization, or FINBASE.
The synthetic URL and key are confined to the Playwright web server environment; they must not be copied to production settings.

## FINBASE prerequisites
The existing LIYANNA contract is explicitly a draft. Keep the worker disabled until the following are established:
- FINBASE staging base URL and documented invoice intake endpoint.
- Agreed schema version, tenant/business mapping and customer identifier mapping.
- Server-side credential provisioning and connection consent with the required delivery scopes.
- Verified migration history and additive staging migrations.
- One accepted invoice event, duplicate-event handling, retry/dead-letter behavior and reconciled payment response.
Record request IDs and sanitized outcomes without recording credentials.
A successful simulation is not evidence of live FINBASE connectivity.
