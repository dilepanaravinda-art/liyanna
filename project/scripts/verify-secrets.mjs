/** Offline source audit for accidentally exposed server-side secrets. */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = resolve(root, 'src');
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const privateNames = ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY', 'VIG_WORKER_SECRET', 'VIG_CREDENTIAL_VAULT_KEY', 'DATABASE_URL'];
export function auditSourceFiles(files) {
  const findings = [];
  for (const [path, contents] of Object.entries(files)) {
    const browserFile = /(^|\/)(components|features|hooks)\//.test(path) || /^\s*['"]use client['"]/.test(contents);
    if (!browserFile) continue;
    for (const secret of privateNames) {
      if (contents.includes(`NEXT_PUBLIC_${secret}`)) findings.push(`${path}: server secret declared as NEXT_PUBLIC_${secret}`);
      if (new RegExp(`\\bprocess\\.env\\.${secret}\\b`).test(contents)) findings.push(`${path}: server secret referenced in browser-facing source (${secret})`);
    }
  }
  return { ok: findings.length === 0, findings };
}
function walk(dir, out = {}) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && extensions.has(extname(full))) out[relative(source, full).replaceAll('\\', '/')] = readFileSync(full, 'utf8');
  }
  return out;
}
export function auditProject() { return auditSourceFiles(walk(source)); }
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = auditProject();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
