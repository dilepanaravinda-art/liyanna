/** Read-only release preflight. Does not execute deployments or inspect secret values. */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export function inspectRelease({ configText, routeText, packageText, lockfileExists }) {
  const problems = [];
  if (/\boutput\s*:\s*['"]export['"]/.test(configText)) problems.push('Static export cannot host the server-side integration worker API route');
  if (!/export\s+const\s+runtime\s*=\s*['"]nodejs['"]/.test(routeText)) problems.push('Integration worker must explicitly use Node.js runtime');
  if (!/enabled\s*:\s*false/.test(routeText)) problems.push('Worker fail-closed default is missing; review infrastructure before enabling');
  if (!/export\s+const\s+POST\s*=/.test(routeText)) problems.push('Worker POST handler missing');
  let pkg;
  try { pkg = JSON.parse(packageText); } catch { problems.push('Invalid package.json'); }
  if (pkg && (!pkg.scripts?.build || !pkg.scripts?.typecheck || !pkg.scripts?.test)) problems.push('Required build/typecheck/test scripts missing');
  if (!lockfileExists) problems.push('Dependency lockfile missing');
  return { ok: problems.length === 0, problems };
}
export function inspectReleaseFiles(projectRoot) {
  const read = name => readFileSync(resolve(projectRoot, name), 'utf8');
  return inspectRelease({ configText: read('next.config.ts'), routeText: read('src/app/api/integrations/worker/route.ts'), packageText: read('package.json'), lockfileExists: existsSync(resolve(projectRoot, 'pnpm-lock.yaml')) });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = inspectReleaseFiles(resolve(here, '..'));
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
