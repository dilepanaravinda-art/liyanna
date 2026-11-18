import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicAddress, assertPublicDns } from './dns-policy.mjs';
import { createSecureTransport } from './secure-transport.mjs';

for (const address of ['127.0.0.1','10.2.3.4','172.16.1.2','192.168.1.1','169.254.169.254','100.64.1.1','198.18.0.1','203.0.113.2','::1','::ffff:127.0.0.1']) {
  test(`blocks nonpublic DNS address ${address}`, () => assert.equal(isPublicAddress(address), false));
}
test('allows public IPv4', () => assert.equal(isPublicAddress('8.8.8.8'), true));
test('rejects mixed public/private DNS answers', async () => {
  await assert.rejects(assertPublicDns('api.example.com', async () => [{address:'8.8.8.8'}, {address:'127.0.0.1'}]), /not authorized/);
});
test('rejects DNS failures', async () => {
  await assert.rejects(assertPublicDns('api.example.com', async () => {throw Error('NXDOMAIN')}), /DNS validation failed/);
});
test('never fetches after unsafe DNS resolution', async () => {
  let called = false;
  const transport = createSecureTransport({
    dnsResolver: async () => [{address:'10.0.0.5'}],
    resolveConnection: async () => ({status:'active', tenantId:'t1', businessId:'b1',endpoint:'https://api.example.com/events',allowedOrigins:['https://api.example.com'],token:'secret'}),
    fetchImpl: async () => { called = true; return {ok:true}; },
  });
  await assert.rejects(transport.deliver({connectionId:'c1',tenantId:'t1',businessId:'b1',eventType:'invoice.issued',envelope:{id:'event_12345678'}}), /not authorized/);
  assert.equal(called,false);
});
