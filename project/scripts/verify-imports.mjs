/** Dependency-free check for unresolved relative imports in application source. */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];
export function listSourceFiles(root) {
  if (!existsSync(root)) return [];
  const files = [];
  const visit = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (EXTENSIONS.includes(extname(entry.name))) files.push(path);
    }
  };
  visit(root);
  return files;
}
export function resolveLocalImport(sourceFile, specifier, fileExists = existsSync) {
  if (!specifier.startsWith('.')) return true;
  const base = resolve(dirname(sourceFile), specifier);
  const paths = [base, ...EXTENSIONS.map(ext => base + ext), ...EXTENSIONS.map(ext => resolve(base, 'index' + ext))];
  // TypeScript resolves .js specifiers to .ts/.tsx source in ESM projects.
  if (/\.(?:js|jsx|mjs)$/.test(base)) {
    const stem = base.replace(/\.(?:js|jsx|mjs)$/, '');
    paths.push(stem + '.ts', stem + '.tsx', stem + '.mts');
  }
  return paths.some(path => fileExists(path) && (!existsSync(path) || !statSync(path).isDirectory()));
}
export function extractImports(text) {
  const found = [];
  const patterns = [
    /\b(?:import|export)\s+(?:[\s\S]*?\s+from\s*)?['"](\.[^'"\n]+)['"]/g,
    /\bimport\s*\(\s*['"](\.[^'"\n]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"](\.[^'"\n]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) for (const match of text.matchAll(pattern)) found.push(match[1]);
  return [...new Set(found)];
}
export function inspectImports(root) {
  const problems = [];
  for (const file of listSourceFiles(root)) {
    for (const specifier of extractImports(readFileSync(file, 'utf8'))) {
      if (!resolveLocalImport(file, specifier)) problems.push(`${relative(root, file)}: unresolved ${specifier}`);
    }
  }
  return { ok: problems.length === 0, filesChecked: listSourceFiles(root).length, problems };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src');
  const result = inspectImports(root);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
