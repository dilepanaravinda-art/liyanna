import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { validateProviderEndpoint } from './endpoint-policy.mjs';
test('allows approved HTTPS domain with path', () => assert.equal(validateProviderEndpoint('https://api.finbase.com/v1/events').origin, 'https://api.finbase.com'));
for (const host of ['localhost', 'app.localhost', 'server.local', 'metadata.google.internal', '127.0.0.1', '10.0.0.1', '192.168.1.1', '[::1]', '[fd00::1]', '[::ffff:127.0.0.1]', 'example.invalid', 'api.example', 'intranet']) {
  test(`blocks non-public host ${host}`, () => assert.throws(() => validateProviderEndpoint(`https://${host}/events`), /not allowed/));
}
test('rejects nonstandard port', () => assert.throws(() => validateProviderEndpoint('https://api.finbase.com:8443/'), /not allowed/));
test('rejects credentials and fragments', () => assert.throws(() => validateProviderEndpoint('https://user:pass@api.finbase.com/#fragment'), /not allowed/));
