import test from 'node:test';
import assert from 'node:assert/strict';
import { extractImports, resolveLocalImport } from './verify-imports.mjs';
test('extracts static and dynamic relative imports', () => {
  assert.deepEqual(extractImports("import x from './a'; export { y } from '../b'; await import('./c');"), ['./a', '../b', './c']);
});
test('ignores bare package imports', () => {
  assert.equal(resolveLocalImport('/src/a.ts', 'react', () => false), true);
});
test('resolves TypeScript source for ESM js specifiers', () => {
  assert.equal(resolveLocalImport('/src/a.ts', './b.js', path => path === '/src/b.ts'), true);
});
test('reports missing relative imports', () => {
  assert.equal(resolveLocalImport('/src/a.ts', './missing', () => false), false);
});
