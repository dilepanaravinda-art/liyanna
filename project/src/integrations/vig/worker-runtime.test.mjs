import test from 'node:test';
import assert from 'node:assert/strict';
import { runWorkerOnce, validateWorkerConfiguration } from './worker-runtime.mjs';
const config={workerId:'123e4567-e89b-12d3-a456-426614174000',batchLimit:5,allowedOrigins:['https://finbase.example.com']};
const repository={claim(){},authorize(){},markDelivered(){},markRetry(){}};
test('rejects missing destination allowlist',()=>assert.throws(()=>validateWorkerConfiguration({...config,allowedOrigins:[]})));
test('rejects HTTP destinations',()=>assert.throws(()=>validateWorkerConfiguration({...config,allowedOrigins:['http://finbase.example.com']})));
test('rejects excessive batches',()=>assert.throws(()=>validateWorkerConfiguration({...config,batchLimit:101})));
test('requires a persistent repository',async()=>await assert.rejects(runWorkerOnce({config,repository:{},processBatch:()=>{},fetchImpl:()=>{},resolveConnection:()=>{}})));
test('wires processor with configured worker ID and limit',async()=>{
  const output=await runWorkerOnce({config,repository,fetchImpl:async()=>({ok:true}),resolveConnection:async()=>null,processBatch:async(repo,transport,id,limit)=>{
    assert.equal(repo,repository);assert.equal(id,config.workerId);assert.equal(limit,5);assert.equal(typeof transport.deliver,'function');return {claimed:0};
  }});
  assert.equal(output.claimed,0);
});
test('central allowlist prevents connector-provided arbitrary origin',async()=>{
  const event={connectionId:'c',tenantId:'t',businessId:'b',eventType:'invoice.issued',envelope:{id:'event_123456'}};
  await runWorkerOnce({config,repository,fetchImpl:async()=>{throw Error('network should not be called')},resolveConnection:async()=>({status:'active',tenantId:'t',businessId:'b',endpoint:'https://evil.example.com/hook',allowedOrigins:['https://evil.example.com'],token:'secret'}),processBatch:async(_repo,transport)=>{
    await assert.rejects(transport.deliver(event),/Endpoint not authorized/);return {claimed:1};
  }});
});
