import test from 'node:test';
import assert from 'node:assert/strict';
import { createPostgresDeliveryRepository } from './postgres-repository.mjs';
const a='11111111-1111-4111-8111-111111111111', b='22222222-2222-4222-8222-222222222222';
const event={id:a,connectionId:b,tenantId:a,businessId:b,leaseOwner:a};
test('rejects missing database',()=>assert.throws(()=>createPostgresDeliveryRepository({}),/Database/));
test('claim uses parameterized SQL and maps rows',async()=>{
 const calls=[];const repo=createPostgresDeliveryRepository({db:{query:async(...args)=>{calls.push(args);return {rows:[{id:a,connection_id:b,tenant_id:a,business_id:b,destination:'finbase',event_type:'liyanna.invoice.issued',envelope:{id:'event_12345678'},lease_owner:a,attempts:1}]};}}});
 assert.equal((await repo.claim(a,2))[0].connectionId,b);assert.deepEqual(calls[0][1],[a,2]);
});
test('invalid worker rejected before query',async()=>{const repo=createPostgresDeliveryRepository({db:{query:async()=>{throw Error('unexpected');}}});await assert.rejects(repo.claim('bad',1),/worker/);});
test('authorization fails closed on missing grant',async()=>{const repo=createPostgresDeliveryRepository({db:{query:async()=>({rows:[{status:'active',consented_at:new Date(),enabled:false}]})}});assert.equal((await repo.authorize(event)).allowed,false);});
test('approval-required delivery rejected',async()=>{const repo=createPostgresDeliveryRepository({db:{query:async()=>({rows:[{status:'active',consented_at:new Date(),enabled:true,requires_approval:true}]})}});assert.equal((await repo.authorize(event)).allowed,false);});
test('approved permission allows delivery',async()=>{const repo=createPostgresDeliveryRepository({db:{query:async()=>({rows:[{status:'active',consented_at:new Date(),enabled:true,requires_approval:false}]})}});assert.equal((await repo.authorize(event)).allowed,true);});
test('lease completion returns DB result',async()=>{const repo=createPostgresDeliveryRepository({db:{query:async()=>({rows:[{updated:true}]})}});assert.equal(await repo.markDelivered(event),true);});
test('retry timestamp validated',async()=>{const repo=createPostgresDeliveryRepository({db:{query:async()=>({rows:[]})}});await assert.rejects(repo.markRetry(event,'x',new Date('invalid')),/retry date/);});
