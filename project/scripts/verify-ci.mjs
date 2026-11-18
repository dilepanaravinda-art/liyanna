/** Read-only CI contract check; never executes workflows. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export function inspectCI(text) {
  const problems = [];
  const required = [
    ['read-only permissions', /permissions:\s*\n\s*contents:\s*read/],
    ['pull request validation', /^\s*pull_request:/m],
    ['locked dependencies', /pnpm install --frozen-lockfile/],
    ['release preflight', /pnpm verify:release/],
    ['typecheck', /pnpm typecheck/],
    ['tests', /pnpm test/],
    ['production build', /pnpm build/],
    ['pinned checkout action', /actions\/checkout@[a-f0-9]{40}/],
    ['pinned node action', /actions\/setup-node@[a-f0-9]{40}/],
  ];
  for (const [name, pattern] of required) if (!pattern.test(text)) problems.push(`Missing ${name}`);
  if (/\b(vercel deploy|vercel --prod|supabase db push|supabase migration up)\b/.test(text)) problems.push('Validation workflow must not deploy or migrate databases');
  if (/\b(service_role|SUPABASE_SERVICE_ROLE_KEY|LIYANNA_WORKER_SECRET)\b/.test(text)) problems.push('Validation workflow must not request privileged runtime secrets');
  return { ok: problems.length === 0, problems };
}
export function inspectCIFile(projectRoot) {
  return inspectCI(readFileSync(resolve(projectRoot, '.github/workflows/validate.yml'), 'utf8'));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = inspectCIFile(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
