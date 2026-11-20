# Iteration 32 — reproducible release validation

A GitHub Actions validation workflow is provided at `.github/workflows/validate.yml`.
It checks pull requests and main-branch pushes without deploying or applying migrations.
It installs locked dependencies, executes source/security preflight, typechecks, runs Vitest and builds Next.js.

## Setup

The workflow must be placed at the root of the actual Git repository. If the contents of `project/` are copied into a repository root, retain `.github/workflows/validate.yml` at that root. No production secrets are required by this workflow. Configure branch protection to require the `validate` job before merging.

## Limitations

No CI run has occurred merely by adding the workflow. The worker remains disabled; live database and FINBASE integration have not been tested. The workflow's full build needs network access to the package registry and may reveal TypeScript/build issues requiring fixes.
