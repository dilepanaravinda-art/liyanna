import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectCI, inspectCIFile } from './verify-ci.mjs';

test('project CI workflow passes validation', () => {
  assert.equal(inspectCIFile(new URL('..', import.meta.url).pathname).ok, true);
});
test('detects missing build gate', () => {
  const source = 'permissions:\n  contents: read\n';
  assert.ok(inspectCI(source).problems.some(p => p.includes('production build')));
});
test('rejects production deployment commands', () => {
  assert.ok(inspectCI('run: vercel deploy --prod').problems.some(p => p.includes('deploy')));
});
test('rejects privileged worker secrets in CI', () => {
  assert.ok(inspectCI('env:\n  LIYANNA_WORKER_SECRET: secret').problems.some(p => p.includes('secrets')));
});
