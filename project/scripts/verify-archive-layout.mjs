/** Validates the full-source ZIP repository layout; does not deploy. */
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export function inspectArchiveLayout(root, workflowText) {
  const problems = [];
  for (const name of ['project/package.json', 'project/pnpm-lock.yaml', 'project/next.config.ts', 'database', '.github/workflows/validate.yml']) {
    if (!existsSync(resolve(root, name))) problems.push(`Missing ${name}`);
  }
  if (!/working-directory:\s*project/.test(workflowText)) problems.push('Root workflow must run commands in project directory');
  if (!/pnpm install --frozen-lockfile/.test(workflowText)) problems.push('Root workflow must install locked dependencies');
  if (!/pnpm typecheck/.test(workflowText) || !/pnpm build/.test(workflowText)) problems.push('Root workflow must typecheck and build');
  if (/\b(vercel deploy|vercel --prod|supabase db push)\b/.test(workflowText)) problems.push('Validation must not deploy or migrate');
  return { ok: problems.length === 0, problems };
}
export function inspectArchiveLayoutFile(root) {
  const file = resolve(root, '.github/workflows/validate.yml');
  return inspectArchiveLayout(root, existsSync(file) ? readFileSync(file, 'utf8') : '');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const result = inspectArchiveLayoutFile(root);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
