# Iteration 34 — offline dependency lockfile consistency

Added `project/scripts/verify-lockfile.mjs` and five regression tests. The release preflight now checks that every direct runtime/development dependency has an exact pinned version and matches the `pnpm-lock.yaml` root importer. This catches package.json drift before CI's frozen install. The checker is intentionally offline and does not validate package availability, transitive dependency resolution or security advisories.

Verification: 31/31 Node.js release-checker tests passed; `npm run verify:release` passed. Full Next.js build and GitHub-hosted CI remain unverified because dependencies are not installed locally. No production deployment or database migration performed.
