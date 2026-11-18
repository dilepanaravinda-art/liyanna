# Iteration 33 — full-source repository CI layout

The downloadable archive contains `project/` (Next.js application) and `database/` at the repository root. GitHub Actions only discovers `.github/workflows` at the repository root. Earlier validation was nested inside `project/.github` and would not run if the entire archive was committed as a repository. This iteration adds a root workflow with `working-directory: project`, retaining the nested workflow for users who publish only the app directory as their GitHub repository.

The root workflow uses pinned checkout/setup-node actions, pinned pnpm, frozen lockfile, release checks, TypeScript, tests, and production build. It contains no deployment or migration steps and requests no runtime secrets.

Run `node project/scripts/verify-archive-layout.mjs` from the extracted full-source root to verify packaging. `pnpm verify:release` now includes this check and therefore assumes the distributed full-source layout. If using `project/` as a standalone repository, use the existing individual preflight scripts or adjust the archive-specific command.

No CI run, full build, database migration, or deployment was performed as part of this iteration.
