import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const route = readFileSync(new URL('../src/app/api/ready/route.ts', import.meta.url), 'utf8');
const smoke = readFileSync(new URL('./smoke-deployment.mjs', import.meta.url), 'utf8');
test('readiness requires both public Supabase settings', () => {
  assert.match(route, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(route, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(route, /configured \? 200 : 503/);
});
test('readiness response excludes configuration values', () => {
  assert.match(route, /status: configured \? 'ready' : 'not_ready'/);
  assert.doesNotMatch(route, /Response\.json\([\s\S]*?(?:url|key)\s*[,}]/i);
});
test('deployment smoke requires readiness', () => {
  assert.match(smoke, /check\('\/api\/ready', 200/);
  assert.match(smoke, /body\.status !== 'ready'/);
});
