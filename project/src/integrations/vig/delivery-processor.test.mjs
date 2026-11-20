import test from 'node:test';
import assert from 'node:assert/strict';
import {processDeliveryBatch} from './delivery-processor.mjs';
const id='123e4567-e89b-12d3-a456-426614174000';
const event={id,leaseOwner:id,attempts:1};
const makeRepo=(events=[event],permission={allowed:true})=>({claim:async()=>events,authorize:async()=>permission,markDelivered:async()=>true,markRetry:async()=>true});
test('acknowledges successful delivery',async()=>{let count=0;const result=await processDeliveryBatch(makeRepo(),{deliver:async()=>{count++}},id);assert.equal(result.delivered,1);assert.equal(count,1)});
test('revoked connection dead-letters without sending',async()=>{let count=0;const result=await processDeliveryBatch(makeRepo([event],{allowed:false,reason:'revoked'}),{deliver:async()=>{count++}},id);assert.equal(result.deadLettered,1);assert.equal(count,0)});
test('failed delivery schedules retry',async()=>{let retry;const repo={...makeRepo(),markRetry:async(_e,_m,date)=>{retry=date;return true}};const result=await processDeliveryBatch(repo,{deliver:async()=>{throw Error('timeout')}},id,1,()=>new Date('2026-01-01T00:00:00Z'));assert.equal(result.retried,1);assert.equal(retry.toISOString(),'2026-01-01T00:01:00.000Z')});
test('attempt 8 dead-letters failed delivery',async()=>{let retry='unset';const repo={...makeRepo([{...event,attempts:8}]),markRetry:async(_e,_m,date)=>{retry=date;return true}};const result=await processDeliveryBatch(repo,{deliver:async()=>{throw Error('bad gateway')}},id);assert.equal(result.deadLettered,1);assert.equal(retry,null)});
test('lease mismatch skips event',async()=>{let count=0;const result=await processDeliveryBatch(makeRepo([{...event,leaseOwner:'other'}]),{deliver:async()=>{count++}},id);assert.equal(result.lostLease,1);assert.equal(count,0)});
test('failed acknowledgement records lost lease',async()=>{const result=await processDeliveryBatch({...makeRepo(),markDelivered:async()=>false},{deliver:async()=>{}},id);assert.equal(result.lostLease,1);assert.equal(result.delivered,0)});

test('rejects duplicate claims before any delivery',async()=>{let calls=0;await assert.rejects(()=>processDeliveryBatch(makeRepo([event,{...event}]),{deliver:async()=>{calls++}},id,2),/duplicate/);assert.equal(calls,0)});
test('rejects over-limit claims before any delivery',async()=>{let calls=0;await assert.rejects(()=>processDeliveryBatch(makeRepo([event,{...event,id:'123e4567-e89b-12d3-a456-426614174001'}]),{deliver:async()=>{calls++}},id,1),/batch/);assert.equal(calls,0)});
test('does not persist sensitive transport exception details',async()=>{let message;const repo={...makeRepo(),markRetry:async(_e,m)=>{message=m;return true}};await processDeliveryBatch(repo,{deliver:async()=>{throw Error('Bearer secret-token from https://private.example')}} ,id);assert.equal(message,'Delivery failed');assert.ok(!message.includes('secret-token'))});
test('does not persist authorization provider reason',async()=>{let message;const repo={...makeRepo([event],{allowed:false,reason:'secret vault token'}),markRetry:async(_e,m)=>{message=m;return true}};await processDeliveryBatch(repo,{deliver:async()=>{throw Error('should not send')}},id);assert.equal(message,'Authorization denied')});
