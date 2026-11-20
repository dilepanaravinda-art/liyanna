/** Offline consistency check for the direct dependencies pinned in pnpm-lock.yaml. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export function inspectLockfile(pkg, lock) {
  const problems = [];
  if (!/^lockfileVersion:\s*['"]?9\.0['"]?/m.test(lock)) problems.push('Expected pnpm lockfile v9');
  const importer = lock.split(/^importers:\s*$/m)[1]?.split(/^packages:\s*$/m)[0] ?? '';
  const lines = importer.split('\n');
  let section = '', key = '';
  const entries = { dependencies: new Map(), devDependencies: new Map() };
  for (const line of lines) {
    const header = line.match(/^    (dependencies|devDependencies):\s*$/);
    if (header) { section = header[1]; key = ''; continue; }
    const entry = line.match(/^      (.+):\s*$/);
    if (entry) { key = entry[1].replace(/^['"]|['"]$/g, ''); continue; }
    const spec = line.match(/^        specifier: (.+)$/);
    if (spec && section && key) entries[section].set(key, spec[1].trim().replace(/^['"]|['"]$/g, ''));
  }
  for (const sectionName of ['dependencies', 'devDependencies']) {
    for (const [name, version] of Object.entries(pkg[sectionName] ?? {})) {
      if (!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(version)) problems.push(`${name} must use an exact pinned version`);
      if (entries[sectionName].get(name) !== version) problems.push(`${sectionName}.${name} does not match lockfile importer`);
    }
  }
  return { ok: problems.length === 0, problems };
}
export function inspectLockfileAt(root) {
  return inspectLockfile(JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')), readFileSync(resolve(root, 'pnpm-lock.yaml'), 'utf8'));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = inspectLockfileAt(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
