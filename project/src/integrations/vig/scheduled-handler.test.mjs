import test from 'node:test';
import assert from 'node:assert/strict';
import { createScheduledWorkerHandler } from './scheduled-handler.mjs';
const secret = 'a'.repeat(40);
const req = (method, token) => new Request('https://example.test/api/integrations/worker', { method, headers: token ? { authorization: token } : {} });
test('rejects GET without invoking worker', async () => {
  let calls = 0;
  const handler = createScheduledWorkerHandler({ secret, enabled: true, runOnce: () => { calls++; } });
  assert.equal((await handler(req('GET', `Bearer ${secret}`))).status, 405);
  assert.equal(calls, 0);
});
test('rejects absent, malformed and incorrect tokens', async () => {
  let calls = 0;
  const handler = createScheduledWorkerHandler({ secret, enabled: true, runOnce: () => { calls++; } });
  for (const token of [undefined, `Bearer ${'b'.repeat(40)}`, secret, `bearer ${secret}`]) {
    assert.equal((await handler(req('POST', token))).status, 401);
  }
  assert.equal(calls, 0);
});
test('refuses execution without an explicit enabled state', async () => {
  const handler = createScheduledWorkerHandler({ secret, runOnce: () => { throw Error('should not execute'); } });
  assert.equal((await handler(req('POST', `Bearer ${secret}`))).status, 503);
});
test('executes once with valid token when enabled', async () => {
  let calls = 0;
  const handler = createScheduledWorkerHandler({ secret, enabled: true, runOnce: async () => ({ processed: ++calls }) });
  const response = await handler(req('POST', `Bearer ${secret}`));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, result: { processed: 1 } });
});
test('does not leak worker exceptions', async () => {
  const handler = createScheduledWorkerHandler({ secret, enabled: true, runOnce: async () => { throw Error('database password leaked'); } });
  const response = await handler(req('POST', `Bearer ${secret}`));
  assert.equal(response.status, 500);
  assert.doesNotMatch(await response.text(), /password leaked/);
});
test('rejects weak secrets', async () => {
  const handler = createScheduledWorkerHandler({ secret: 'short', enabled: true, runOnce: async () => null });
  assert.equal((await handler(req('POST', 'Bearer short'))).status, 401);
});

test('rejects overlapping requests without starting another batch', async () => {
  let release;
  let calls = 0;
  const handler = createScheduledWorkerHandler({ secret, enabled: true, runOnce: async () => {
    calls++;
    await new Promise(resolve => { release = resolve; });
    return { processed: 1 };
  } });
  const first = handler(req('POST', `Bearer ${secret}`));
  const second = await handler(req('POST', `Bearer ${secret}`));
  assert.equal(second.status, 409);
  assert.equal(second.headers.get('retry-after'), '5');
  assert.equal(calls, 1);
  release();
  assert.equal((await first).status, 200);
});
test('clears busy flag after worker failure', async () => {
  let calls = 0;
  const handler = createScheduledWorkerHandler({ secret, enabled: true, runOnce: async () => {
    calls++;
    if (calls === 1) throw new Error('temporary failure');
    return { processed: 1 };
  } });
  assert.equal((await handler(req('POST', `Bearer ${secret}`))).status, 500);
  assert.equal((await handler(req('POST', `Bearer ${secret}`))).status, 200);
  assert.equal(calls, 2);
});
test('unauthenticated concurrent requests do not affect active batch', async () => {
  let release;
  const handler = createScheduledWorkerHandler({ secret, enabled: true, runOnce: () => new Promise(resolve => { release = resolve; }) });
  const first = handler(req('POST', `Bearer ${secret}`));
  assert.equal((await handler(req('POST', 'Bearer wrong'))).status, 401);
  release();
  assert.equal((await first).status, 200);
});
