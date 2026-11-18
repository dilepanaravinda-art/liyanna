# LIYANNA release status — Iteration 40

## Verified locally
- Existing Node.js integration tests and release preflight (run separately).
- New source includes an unauthenticated `/api/health` liveness endpoint with no tenant data or secrets.
- CI now builds and boots the real Next.js production server, checks the homepage and health endpoint, and asserts the integration worker rejects unauthenticated POST requests.

## NOT yet verified
- Dependency installation, TypeScript compilation, Next.js build, and new production smoke execution: npm registry unavailable in this execution environment.
- Live Supabase migrations, live FINBASE integration, end-to-end browser journeys and preview deployment.

## Next release gate
1. Publish the complete `liyanna-full-source` tree to a reviewed Git branch (the existing GitHub repository may not have this layout).
2. Run `.github/workflows/validate.yml` on GitHub and resolve any failed checks.
3. Validate migrations on a non-production Supabase project.
4. Deploy a Vercel **preview**, test authentication, invoice lifecycle and PDF output.
5. Verify FINBASE contract and credential resolver before enabling the scheduled worker.
6. Promote only after all gates pass and explicit release approval.

Do not enable the worker by only setting a cron secret. Its server handler is intentionally disabled until a real database adapter and vault are wired and verified.
