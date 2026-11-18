import test from 'node:test';
import assert from 'node:assert/strict';
import { createSecureTransport } from './secure-transport.mjs';
const event = { connectionId:'c1', tenantId:'t1', businessId:'b1', eventType:'liyanna.invoice.issued', envelope:{id:'event_12345678'} };
const safeDns = async () => [{ address: '8.8.8.8', family: 4 }];
const conn = {status:'active',tenantId:'t1',businessId:'b1',endpoint:'https://api.example.com/events',allowedOrigins:['https://api.example.com'],token:'secret'};
test('sends scoped event with idempotency key and redirect prevention', async()=>{
 let args; const transport=createSecureTransport({dnsResolver:safeDns,resolveConnection:async()=>conn,fetchImpl:async(...a)=>{args=a;return {ok:true}}});
 await transport.deliver(event);
 assert.equal(args[1].headers['idempotency-key'],'event_12345678');
 assert.equal(args[1].redirect,'error');
 assert.equal(args[1].method,'POST');
});
test('rejects cross tenant before network',async()=>{
 const t=createSecureTransport({dnsResolver:safeDns,resolveConnection:async()=>({...conn,tenantId:'other'}),fetchImpl:()=>{throw Error('should not call')}});
 await assert.rejects(t.deliver(event),/scope mismatch/);
});
test('rejects non HTTPS and unapproved destinations',async()=>{
 for(const endpoint of ['http://api.example.com/events','https://other.example.com/events','https://user:pass@api.example.com/events']){
  const t=createSecureTransport({dnsResolver:safeDns,resolveConnection:async()=>({...conn,endpoint})});
  await assert.rejects(t.deliver(event),/Endpoint not authorized/);
 }
});
test('rejects revoked connections',async()=>{
 const t=createSecureTransport({dnsResolver:safeDns,resolveConnection:async()=>({...conn,status:'revoked'})});
 await assert.rejects(t.deliver(event),/inactive/);
});
test('fails on provider HTTP errors for retry',async()=>{
 const t=createSecureTransport({dnsResolver:safeDns,resolveConnection:async()=>conn,fetchImpl:async()=>({ok:false,status:503})});
 await assert.rejects(t.deliver(event),/HTTP 503/);
});
test('rejects invalid event identifiers',async()=>{
 const t=createSecureTransport({dnsResolver:safeDns,resolveConnection:async()=>conn});
 await assert.rejects(t.deliver({...event,envelope:{id:'bad'}}),/Invalid event ID/);
});
