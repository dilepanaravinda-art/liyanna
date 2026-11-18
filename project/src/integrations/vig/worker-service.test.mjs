import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkerService} from './worker-service.mjs';
const id='123e4567-e89b-12d3-a456-426614174000';
const safeDns=async()=>[{address:'8.8.8.8'}];
const config={workerId:id,batchLimit:1,allowedOrigins:['https://finbase.example.com'],providerEndpoints:{finbase:'https://finbase.example.com/events'}};
const db={query:async()=>({rows:[{id,tenant_id:id,business_id:id,status:'active',provider_id:'finbase',credential_reference:'vault/ref',consented_at:'2026-01-01T00:00:00Z',delivery_enabled:true,requires_approval:false}]})};
test('requires database',()=>assert.throws(()=>createWorkerService({dnsResolver:safeDns,config,secretResolver:()=>{},processBatch:()=>{},fetchImpl:()=>{}}),/database/));
test('requires server vault resolver',()=>assert.throws(()=>createWorkerService({dnsResolver:safeDns,db,config,processBatch:()=>{},fetchImpl:()=>{}}),/secret/));
test('rejects unapproved provider endpoint',()=>assert.throws(()=>createWorkerService({dnsResolver:safeDns,db,config:{...config,providerEndpoints:{finbase:'https://evil.example/events'}},secretResolver:()=>{},processBatch:()=>{},fetchImpl:()=>{}}),/allowlisted/));
test('resolves approved provider endpoint and vault credential',async()=>{
 let calls=0;
 const service=createWorkerService({dnsResolver:safeDns,db,config,secretResolver:async(ref,scope)=>{assert.equal(ref,'vault/ref');assert.equal(scope.connectionId,id);return 'test-token'},fetchImpl:async(url,options)=>{calls++;assert.equal(url,'https://finbase.example.com/events');assert.equal(options.headers.authorization,'Bearer test-token');return {ok:true}},processBatch:async(_repo,transport)=>{await transport.deliver({connectionId:id,tenantId:id,businessId:id,eventType:'invoice.issued',envelope:{id:'event_123456'}});return {claimed:1,delivered:1}}});
 assert.equal((await service.runOnce()).delivered,1);assert.equal(calls,1);
});
test('inactive connection prevents delivery',async()=>{
 const inactive={query:async()=>({rows:[{status:'revoked'}]})};
 const service=createWorkerService({dnsResolver:safeDns,db:inactive,config,secretResolver:async()=>{throw Error('should not resolve')},fetchImpl:async()=>{throw Error('should not send')},processBatch:async(_repo,transport)=>{await assert.rejects(transport.deliver({connectionId:id,tenantId:id,businessId:id,eventType:'invoice.issued',envelope:{id:'event_123456'}}),/inactive/);return {claimed:0}}});
 assert.equal((await service.runOnce()).claimed,0);
});
test('scope mismatch is rejected before vault access',async()=>{
 let vaultCalls=0, httpCalls=0;
 const service=createWorkerService({dnsResolver:safeDns,db,config,secretResolver:async()=>{vaultCalls++;return 'secret'},fetchImpl:async()=>{httpCalls++;return {ok:true}},processBatch:async(_repo,transport)=>{
   await assert.rejects(transport.deliver({connectionId:id,tenantId:'123e4567-e89b-12d3-a456-426614174001',businessId:id,eventType:'invoice.issued',envelope:{id:'event_123456'}}),/inactive or scope mismatch/);
   return {claimed:0};
 }});
 await service.runOnce(); assert.equal(vaultCalls,0); assert.equal(httpCalls,0);
});
test('unknown provider cannot trigger vault or HTTP request',async()=>{
 let vaultCalls=0;
 const unknown={query:async()=>({rows:[{id,tenant_id:id,business_id:id,status:'active',provider_id:'unregistered',credential_reference:'vault/ref',consented_at:'2026-01-01T00:00:00Z',delivery_enabled:true,requires_approval:false}]})};
 const service=createWorkerService({dnsResolver:safeDns,db:unknown,config,secretResolver:async()=>{vaultCalls++;return 'secret'},fetchImpl:async()=>{throw Error('unexpected network call')},processBatch:async(_repo,transport)=>{
   await assert.rejects(transport.deliver({connectionId:id,tenantId:id,businessId:id,eventType:'invoice.issued',envelope:{id:'event_123456'}}),/inactive or scope mismatch/);
   return {claimed:0};
 }});
 await service.runOnce(); assert.equal(vaultCalls,0);
});

test('revoked consent blocks vault access even after initial authorization',async()=>{
 let vaultCalls=0;
 const revoked={query:async()=>({rows:[{id,tenant_id:id,business_id:id,status:'active',provider_id:'finbase',credential_reference:'vault/ref',consented_at:'2026-01-01T00:00:00Z',revoked_at:'2026-02-01T00:00:00Z',delivery_enabled:true}]})};
 const service=createWorkerService({dnsResolver:safeDns,db:revoked,config,secretResolver:async()=>{vaultCalls++;return 'secret'},fetchImpl:async()=>{throw Error('unexpected HTTP')},processBatch:async(_repo,transport)=>{await assert.rejects(transport.deliver({connectionId:id,tenantId:id,businessId:id,eventType:'invoice.issued',envelope:{id:'event_123456'}}),/inactive or scope mismatch/);return {claimed:0}}});
 await service.runOnce();assert.equal(vaultCalls,0);
});
test('missing delivery grant blocks credential retrieval',async()=>{
 let vaultCalls=0;
 const noGrant={query:async()=>({rows:[{id,tenant_id:id,business_id:id,status:'active',provider_id:'finbase',credential_reference:'vault/ref',consented_at:'2026-01-01T00:00:00Z',delivery_enabled:null}]})};
 const service=createWorkerService({dnsResolver:safeDns,db:noGrant,config,secretResolver:async()=>{vaultCalls++;return 'secret'},fetchImpl:async()=>{throw Error('unexpected HTTP')},processBatch:async(_repo,transport)=>{await assert.rejects(transport.deliver({connectionId:id,tenantId:id,businessId:id,eventType:'invoice.issued',envelope:{id:'event_123456'}}),/inactive or scope mismatch/);return {claimed:0}}});
 await service.runOnce();assert.equal(vaultCalls,0);
});
