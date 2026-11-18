# LIYANNA

Quotation and invoice application with English, Sinhala and Tamil support, account-scoped local storage, optional Supabase cloud synchronization, PDF export and a disabled integration-worker foundation.

## Verified preview release — 18 November 2026

- Preview: https://liyanna-preview.vercel.app (existing Vercel preview protection applies).
- Application commit: `82e787f374ebbc9ff3aaf92b4b2b0201d6fec2ba`.
- GitHub validation: https://github.com/dilepanaravinda-art/liyanna/actions/runs/44345786008.
- TypeScript, all 204 tests (142 Node + 62 Vitest), the Next.js production build and production runtime smoke checks pass on GitHub and Vercel.
- Live preview homepage, health and public-configuration readiness endpoints return HTTP 200.

**Sign-in is blocked by infrastructure:** the existing Liyanna Supabase project is paused. Resuming it was refused because the account already has two active free projects. No other project was paused, deleted or upgraded. Public configuration readiness is not a live database check.

## Develop and validate

Use Node.js 22 and the pinned pnpm version from `project/package.json`. From `project/`:

```sh
corepack pnpm install --frozen-lockfile
pnpm verify:release
pnpm typecheck
pnpm test
pnpm build
pnpm smoke:production
```

`pnpm test` runs Node integration/release tests and TypeScript application tests through their respective runners. Public Supabase configuration comes from the deployment environment; use `environment.example` for local placeholders. Never commit environment secrets.

## Repository layout

- `project/`: Next.js application, tests, brand assets, bundled PDF fonts and dependency lockfile.
- `.github/workflows/validate.yml`: complete-source validation from `project/`.
- `database/`: original schema reference and reviewed-but-not-applied commercial/integration migrations.
- `docs/RECOVERY-REFERENCE.md`: provenance and restore limitations of the original recovery snapshot.
- `RELEASE-STATUS.md`: current validation evidence and remaining release gates.

No production promotion or database migration has been performed. FINBASE live synchronization and the scheduled worker remain disabled. Restore SQL is intended for a new empty database only; review the recovery reference and current migration history before any database changes.
