# Liyanna application and database source

Application: production deployment dpl_HHc7dYKzPg3zhU7QESf4spjt95uQ, 18 October 2026.
Database: Liyanna project yfbbwehvisofdkjtzacz, read-only catalog export on 19 October 2026. These are separate snapshots; this is not an original Git repository or historical migration chain.

## Included

- project/: all 48 available deployment files, including assets and dependency lockfile.
- database/restore.sql: 5 tables, 22 constraints, 8 indexes (6 created by primary/unique constraints), 15 functions, 6 RLS policies, ownership and explicit grants. Private schema permissions are preserved.
- database/functions.sql: exact reference definitions, also included in restore.sql.
- database/catalog.json: structured schema metadata, including original schema ACLs, default privileges and installed extension versions. No application rows.
- database/function-checksums.json: independently re-read database checksums for all 15 function definitions.
- database/auth-settings-reference.json: non-secret login/signup settings observed during this session.
- recovery/: original app recovery evidence. Its original exclusions describe the earlier app-only archive; this expanded archive adds the database definitions above.
- environment.example: empty configuration placeholders.

## Restore to a new Supabase project

1. Create a separate, empty Supabase project using PostgreSQL 17. Supabase must provide auth.users, auth.uid(), and the standard postgres, anon, authenticated and service_role database roles. gen_random_uuid() is supplied by PostgreSQL. The export does not recreate Supabase-managed auth/storage/vault internals.
2. Review database/restore.sql, then run the entire file as postgres in the NEW project. It runs in one transaction. It deliberately uses CREATE TABLE and CREATE POLICY without replacing existing objects; it is not intended for the existing production database or as an upgrade migration. Never run functions.sql separately as a substitute: it does not restore grants or policies.
3. Set Auth configuration separately: disable public signup and anonymous/social/phone sign-in, keep email login and email confirmation enabled. Configure the destination Site URL, redirect URLs and mail delivery for your deployment. These project-management settings are not applied by SQL.
4. Provision authorized accounts through privileged Supabase administration. No users, owner IDs, business records, memberships, passwords or sessions are imported. A newly created cloud business assigns ownership to its authenticated creator.
5. Copy environment.example to project/.env.local and fill in the NEW project's URL and publishable key. Do not place a service-role key in the frontend. Install dependencies with the supplied pnpm lockfile, then build and test in the separate environment.

## Export scope and limitations

All currently discovered Liyanna database objects in public.liyanna_* and liyanna_private are included. No application triggers, views, sequences or publication memberships were found in that scope. Table types are built-in PostgreSQL types. Platform-wide default privileges and the shared public schema ACL are recorded in catalog.json for review rather than replayed automatically; restore.sql explicitly sets each exported object's access privileges.

No database rows, Auth user records, tokens, API keys (including publishable keys), passwords, private keys, environment values, or connection strings are included. Role names such as service_role are permission identifiers, not credentials. Runtime data, secrets, Git history, tests omitted from the deployment, Supabase-managed platform code and a full dashboard configuration export are not part of this source package.

Verification: all 15 function definitions match independently queried database checksums. The 48 app files match the previous verified recovery manifest; 45 had Vercel source hash confirmation and three were verified by repeat browser retrieval. Archive contents are checksum-verified. The SQL has NOT been executed against a fresh database, and no app build was run. A clean-environment restore and access-control test remain necessary before redeployment.

No live database, deployment, permissions or authentication settings were changed during this export.
