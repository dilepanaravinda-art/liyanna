import {describe,it,expect,vi} from 'vitest';
import {sendSandboxReview,type SandboxSenderConfig} from './sandbox-sender';
const config:SandboxSenderConfig={enabled:true,sandbox:true,endpoint:'https://receiver.example.invalid/api/integrations/liyanna/events',allowedOrigin:'https://receiver.example.invalid',credential:'fls_'+'x'.repeat(43)};
const event={schemaVersion:'1.0',eventId:'11111111-1111-4111-8111-111111111111',occurredAt:'2026-11-19T00:00:00Z',tenantId:'business',businessId:'business',source:'liyanna',documentId:'invoice',documentNumber:'INV-1',customerRef:'customer',currency:'LKR',issuedOn:'2026-11-19',dueOn:null,total:'100.00',taxTotal:'0.00',revision:1};
const result={mode:'staged-review-only',receiptId:'22222222-2222-4222-8222-222222222222',duplicate:false,postingAuthorized:false,sourceAuthenticated:false,ledgerEntriesCreated:0,deliveryAuthenticated:true,sourceOwnershipVerified:false};
const json=(value:unknown)=>new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});
describe('disabled-by-default sandbox sender',()=>{
 it('does not call transport when disabled or not a sandbox',async()=>{
  const f=vi.fn();for(const override of [{enabled:false},{sandbox:false}])expect((await sendSandboxReview(event,{...config,...override},f)).status).toBe('blocked');expect(f).not.toHaveBeenCalled();
 });
 it('rejects unapproved origins, insecure URLs, query secrets and local destinations',async()=>{
  const f=vi.fn();for(const endpoint of ['http://receiver.example.invalid/api/integrations/liyanna/events','https://evil.example.invalid/api/integrations/liyanna/events',config.endpoint+'?secret=x','https://receiver.example.invalid/other','https://127.0.0.1/api/integrations/liyanna/events'])expect((await sendSandboxReview(event,{...config,endpoint},f)).status).toBe('blocked');expect(f).not.toHaveBeenCalled();
 });
 it('sends identical payloads on retries with manual redirects and no cookies',async()=>{
  const f=vi.fn().mockImplementation(async()=>json(result));const first=await sendSandboxReview(event,config,f);const second=await sendSandboxReview(event,config,f);
  expect(first).toEqual(second);expect(first.status).toBe('staged');expect(f.mock.calls[0][1].body).toBe(f.mock.calls[1][1].body);expect(f.mock.calls[0][1]).toMatchObject({redirect:'manual',credentials:'omit',cache:'no-store'});
 });
 it('rejects redirects and authentication failures without following or exposing response text',async()=>{
  for(const status of [302,401,403]){const f=vi.fn().mockResolvedValue(new Response('private token',{status}));const r=await sendSandboxReview(event,config,f);expect(r.status).toBe('blocked');expect(JSON.stringify(r)).not.toContain('private');expect(f).toHaveBeenCalledTimes(1);}
 });
 it('requires operator review for conflicts and retries only temporary failures',async()=>{
  for(const [status,expected] of [[409,'review'],[400,'review'],[429,'retry'],[503,'retry']] as const)expect((await sendSandboxReview(event,config,vi.fn().mockResolvedValue(new Response('',{status})))).status).toBe(expected);
 });
 it('rejects invalid receipts, posting claims and oversized response bodies',async()=>{
  for(const value of [{...result,postingAuthorized:true},{...result,ledgerEntriesCreated:1},{...result,deliveryAuthenticated:false}])expect((await sendSandboxReview(event,config,vi.fn().mockResolvedValue(json(value)))).status).toBe('review');
  expect((await sendSandboxReview(event,config,vi.fn().mockResolvedValue(new Response('x'.repeat(9000),{headers:{'content-type':'application/json'}})))).status).toBe('review');
 });
 it('sanitizes network failures and rejects bad input before transport',async()=>{
  const f=vi.fn().mockRejectedValue(Error(config.credential));const r=await sendSandboxReview(event,config,f);expect(r.status).toBe('retry');expect(JSON.stringify(r)).not.toContain(config.credential);
  const unused=vi.fn();expect((await sendSandboxReview({...event,extra:true},config,unused)).status).toBe('blocked');expect(unused).not.toHaveBeenCalled();
 });
});
