# Iteration 43 — deployment readiness gate

The existing `/api/health` only proves that the Next.js server responds; it does not prove LIYANNA can authenticate users. Added `/api/ready`, returning HTTP 503 until both public Supabase configuration values exist, and made deployment smoke tests require HTTP 200 readiness. No credential values or tenant identifiers are returned. This is a configuration gate, **not** a database connectivity check, full application build, or a live FINBASE test.

Vercel must set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the preview environment **before building**, because Next.js inlines public environment values in the browser bundle. Never put service-role keys in NEXT_PUBLIC variables. Set the Vercel Root Directory to `project` when deploying this archive repository layout.
