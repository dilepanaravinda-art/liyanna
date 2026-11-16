# LIYANNA

Existing LIYANNA quotation and invoicing application. This repository is being prepared for source recovery from the existing Vercel deployment.

## Recovery status

- Original production project: `liyanna` on Vercel. Keep it unchanged until a recovered copy passes validation.
- Stack identified from deployment: Next.js, React, TypeScript, Supabase, IndexedDB, pdfmake.
- Source inventory: 48 deployment files were listed, but complete recovery and independent build have **not** been verified.
- Do not commit `.env*`, service-role keys, customer records, database exports, or other secrets.

## Planned CRM integration

- CRM owns leads, contacts, opportunities, sales assignments and commissions.
- LIYANNA owns quotations, invoices, document revisions and billing records.
- Link records using tenant-scoped IDs and secure authenticated APIs; support idempotent webhooks and an audit trail.
- First deliverable: verify source recovery and a reproducible local build before making production changes.

## Safety

This repository is not yet a verified backup or deployable copy of LIYANNA. Do not connect it to the production Vercel project until the application source, configuration, and build are validated.
