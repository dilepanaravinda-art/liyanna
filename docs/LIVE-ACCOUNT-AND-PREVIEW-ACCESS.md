# Live account and preview access

The preview https://liyanna-preview.vercel.app was opened in a fresh cloud browser on 18 November 2026. It redirected to Vercel login. It requires Vercel access before LIYANNA authentication can be reached. It is not currently verified as an anonymously accessible customer trial link.

Do not disable deployment protection as part of automated testing. The owner must choose the customer-facing release/access model before distributing the preview.

## Real-account check
From project/, run node scripts/verify-live-account.mjs with these environment variables injected privately:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- LIYANNA_TEST_EMAIL
- LIYANNA_TEST_PASSWORD
- LIYANNA_TEST_BUSINESS_ID (optional existing dedicated test business)

Never commit or print the password or session tokens. Use a dedicated test account. The runner signs in twice, verifies both sessions and compares allowed business IDs. If a test business is selected, it compares read-only workspace responses. It signs out each created session locally afterward. It does not edit records, send email or reset passwords.

Syntax validation passed. Live execution requires test credentials and has not yet run. Matching reads do not prove cloud write synchronization. Recovery email delivery and actual two-browser edit/conflict behavior still require acceptance.

## Scope of this update
Browser tests cover rejected login, generic recovery confirmation, expired links and PDF downloads in all three supported languages using synthetic Auth responses. They do not certify the live identity provider or email delivery. The FINBASE receiver remains unimplemented; see FINBASE-COMPATIBILITY-REVIEW.md.
