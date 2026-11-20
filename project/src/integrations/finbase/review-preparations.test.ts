import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {beforeAll,beforeEach,afterAll,describe,it,expect} from 'vitest';
import {emptyWorkspace,blankDocument,type Document} from '../../domain/model';
import {calculate} from '../../domain/money';
import {invoiceIssuedV1} from './contracts';
const owner='11111111-1111-4111-8111-111111111111',staff='22222222-2222-4222-8222-222222222222';
let db:PGlite,bid:string,cid:string,doc:Document;
const config={companyId:'sandbox-company',companyLabel:'Sandbox',currency:'LKR',revenueCategory:'services'};
async function user(id:string,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role '+role);}
async function prepare(revision=1,destination=1,customer=cid,confirmed=true){return (await db.query<{result:any}>('select public.liyanna_finbase_review($1,$2,$3,$4,$5,$6,$7) result',[bid,'prepare',doc.id,revision,destination,customer,confirmed])).rows[0].result;}
async function mutate(change:(d:Document)=>void){await db.exec('reset role');change(doc);await db.query('update public.liyanna_documents set payload=$1::jsonb where business_id=$2 and id=$3',[JSON.stringify(doc),bid,doc.id]);await user(owner);}
describe('persisted draft-contract review preparations',()=>{
 beforeAll(async()=>{
  db=new PGlite();await db.exec(`create role authenticated;create role anon;create schema auth;create schema liyanna_private;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table public.liyanna_businesses(id uuid primary key,owner_id uuid not null);
   create table public.liyanna_documents(business_id uuid,id uuid,kind text,payload jsonb,primary key(business_id,id));
   create table public.liyanna_customers(business_id uuid,id uuid,payload jsonb,primary key(business_id,id));
   create function liyanna_private.scope(b uuid) returns text language sql stable security definer set search_path='' as $$select case when owner_id=auth.uid() then 'owner' else 'all' end from public.liyanna_businesses where id=b and auth.uid() is not null$$;
   grant usage on schema liyanna_private to authenticated;grant execute on function liyanna_private.scope(uuid) to authenticated;`);
  for(const name of ['20261119100000_finbase_review_destinations.sql','20261119110000_finbase_review_preparations.sql','20261120090000_finbase_dispatch_ledger.sql'])await db.exec(readFileSync(new URL('../../../../database/migrations/'+name,import.meta.url),'utf8'));
 },30000);
 beforeEach(async()=>{
  await db.exec('reset role');const ws=emptyWorkspace();bid=ws.business.id;cid=crypto.randomUUID();ws.business.currency='LKR';
  doc=blankDocument(ws.business,'invoice','INV-REVIEW');doc.revision=1;doc.customer={name:'Review customer',email:'review@example.invalid',phone:'',address:''};
  doc.items[0].quantity='2';doc.items[0].rate='125.50';doc.discount='10';doc.discountKind='percent';doc.tax='18';
  await db.query('insert into public.liyanna_businesses values($1,$2)',[bid,owner]);
  await db.query('insert into public.liyanna_documents values($1,$2,$3,$4::jsonb)',[bid,doc.id,'invoice',JSON.stringify(doc)]);
  await db.query('insert into public.liyanna_customers values($1,$2,$3::jsonb)',[bid,cid,JSON.stringify({id:cid,businessId:bid,...doc.customer})]);
  await user(owner);await db.query('select public.liyanna_finbase_destination($1,$2,0,$3::jsonb,true)',[bid,'save',JSON.stringify(config)]);
 });
 afterAll(async()=>{await db.close();});
 it('builds the agreed strict draft event from cloud source and exact rounded totals',async()=>{
  const result=await prepare(),event=invoiceIssuedV1.parse(result.receipt.event),totals=calculate(doc);
  expect(event).toMatchObject({businessId:bid,tenantId:bid,customerRef:cid,documentId:doc.id,revision:1,total:totals.total,taxTotal:totals.tax});
  expect(event.total).toBe('266.56');expect(result.postingAuthorized).toBe(false);expect(result.duplicate).toBe(false);
 });
 it('preserves event ID, timestamp and payload on exact retries and reload',async()=>{
  const first=await prepare(),retry=await prepare();expect(retry.duplicate).toBe(true);expect(retry.receipt).toEqual(first.receipt);
  const read=(await db.query<{result:any}>('select public.liyanna_finbase_review($1,$2) result',[bid,'read'])).rows[0].result;
  expect(read.receipts).toEqual([first.receipt]);
 });
 it('requires explicit confirmation, current source and current destination revisions',async()=>{
  await expect(prepare(1,1,cid,false)).rejects.toThrow(/confirmation/);
  await expect(prepare(0)).rejects.toThrow(/document_revision_conflict/);
  await expect(prepare(1,0)).rejects.toThrow(/destination_revision_conflict/);
 });
 it('requires a customer record belonging to this business and matching the invoice',async()=>{
  await expect(prepare(1,1,crypto.randomUUID())).rejects.toThrow(/matching_cloud_customer/);
  await mutate(d=>{d.customer.name='Other customer';});await expect(prepare()).rejects.toThrow(/matching_cloud_customer/);
 });
 it('rejects changed payloads and mappings for an already prepared document revision',async()=>{
  await prepare();await mutate(d=>{d.items[0].rate='999';});await expect(prepare()).rejects.toThrow(/preparation_conflict/);
  await mutate(d=>{d.items[0].rate='125.50';});
  await db.query('select public.liyanna_finbase_destination($1,$2,1,$3::jsonb,true)',[bid,'save',JSON.stringify(config)]);
  await expect(prepare(1,2)).rejects.toThrow(/preparation_conflict/);
 });
 it('blocks new preparation after revocation while retaining immutable history',async()=>{
  await prepare();await db.query('select public.liyanna_finbase_destination($1,$2,1)',[bid,'revoke']);await expect(prepare()).rejects.toThrow(/destination_required/);
  expect((await db.query('select * from public.liyanna_finbase_review_preparations where business_id=$1',[bid])).rows).toHaveLength(1);
  await expect(db.exec('update public.liyanna_finbase_review_preparations set event=\'{}\'')).rejects.toThrow(/permission denied/);
  await expect(db.exec('delete from public.liyanna_finbase_review_preparations')).rejects.toThrow(/permission denied/);
 });
 it('denies staff, outsiders and anonymous users even with valid document IDs',async()=>{
  await prepare();for(const id of [staff,crypto.randomUUID()]){await user(id);await expect(prepare()).rejects.toThrow(/owner_required/);expect((await db.query('select * from public.liyanna_finbase_review_preparations')).rows).toHaveLength(0);}
  await user('','anon');await expect(prepare()).rejects.toThrow(/permission denied/);
 });
 it('matches application rounding for fractional lines, percentage discount and fixed tax',async()=>{
  await mutate(d=>{d.items[0].quantity='1';d.items[0].rate='0.005';d.items.push({id:crypto.randomUUID(),description:'Extra',quantity:'3',rate:'12.345'});d.taxKind='fixed';d.tax='5';});
  const event=(await prepare()).receipt.event;expect(event.total).toBe(calculate(doc).total);expect(event.taxTotal).toBe(calculate(doc).tax);
 });
 it('rejects unsupported/mismatched currencies and invalid source dates/amounts',async()=>{
  await mutate(d=>{d.currency='JPY';});await expect(prepare()).rejects.toThrow(/currency_required/);
  await mutate(d=>{d.currency='LKR';d.issueDate='2026-02-30';});await expect(prepare()).rejects.toThrow();
  await mutate(d=>{d.issueDate='2026-11-19';d.items[0].quantity='0';});await expect(prepare()).rejects.toThrow(/amount/);
 });
 it('restricts dispatcher calls to its isolated role and preserves completed receipts',async()=>{
  const prepared=await prepare(),id=prepared.receipt.id;
  await expect(db.query('select public.liyanna_claim_review_dispatch($1,$2)',[bid,id])).rejects.toThrow(/permission denied/);
  await db.exec('reset role;set role liyanna_review_dispatcher');
  const claim=async()=> (await db.query<{result:any}>('select public.liyanna_claim_review_dispatch($1,$2) result',[bid,id])).rows[0].result;
  const first=await claim();expect(first.status).toBe('claimed');expect((await db.query<{allowed:boolean}>('select public.liyanna_authorize_review_dispatch($1,$2,$3) allowed',[bid,id,first.leaseToken])).rows[0].allowed).toBe(true);expect((await claim()).status).toBe('busy');
  const outcome={status:'staged',receiptId:crypto.randomUUID(),duplicate:false,payloadHash:'a'.repeat(64),postingAuthorized:false};
  const finish=()=>db.query('select public.liyanna_finish_review_dispatch($1,$2,$3::jsonb)',[id,first.leaseToken,JSON.stringify(outcome)]);
  await finish();await finish();expect((await claim()).status).toBe('staged');
  await expect(db.exec('delete from public.liyanna_review_dispatch_attempts')).rejects.toThrow(/permission denied/);
 });
 it('rejects expired worker completions and changed destinations before another claim',async()=>{
  const id=(await prepare()).receipt.id;await db.exec('reset role;set role liyanna_review_dispatcher');
  const first=(await db.query<{result:any}>('select public.liyanna_claim_review_dispatch($1,$2) result',[bid,id])).rows[0].result;
  await db.exec('reset role');await db.query("update public.liyanna_review_dispatches set lease_until=clock_timestamp()-interval '1 second' where preparation_id=$1",[id]);
  await db.exec('set role liyanna_review_dispatcher');
  expect((await db.query<{allowed:boolean}>('select public.liyanna_authorize_review_dispatch($1,$2,$3) allowed',[bid,id,first.leaseToken])).rows[0].allowed).toBe(false);
  await expect(db.query('select public.liyanna_finish_review_dispatch($1,$2,$3::jsonb)',[id,first.leaseToken,JSON.stringify({status:'retry',code:'NETWORK_OR_TIMEOUT',postingAuthorized:false})])).rejects.toThrow(/stale_dispatch_lease/);
  await user(owner);await db.query('select public.liyanna_finbase_destination($1,$2,1)',[bid,'revoke']);await db.exec('reset role;set role liyanna_review_dispatcher');
  const blocked=(await db.query<{result:any}>('select public.liyanna_claim_review_dispatch($1,$2) result',[bid,id])).rows[0].result;expect(blocked.code).toBe('DESTINATION_CHANGED');
 });

 it('persists retry backoff and rejects raw details or conflicting acknowledgements',async()=>{
  const id=(await prepare()).receipt.id;await db.exec('reset role;set role liyanna_review_dispatcher');
  const claim=async()=> (await db.query<{result:any}>('select public.liyanna_claim_review_dispatch($1,$2) result',[bid,id])).rows[0].result;
  const first=await claim();
  const finish=(r:unknown)=>db.query('select public.liyanna_finish_review_dispatch($1,$2,$3::jsonb)',[id,first.leaseToken,JSON.stringify(r)]);
  await expect(finish({status:'retry',code:'raw-secret',postingAuthorized:false})).rejects.toThrow(/invalid_dispatch_result/);
  await expect(finish({status:'retry',code:'NETWORK_OR_TIMEOUT',postingAuthorized:false,token:'secret'})).rejects.toThrow(/invalid_dispatch_result/);
  await finish({status:'retry',code:'NETWORK_OR_TIMEOUT',postingAuthorized:false});
  expect((await claim()).status).toBe('waiting');
  await expect(finish({status:'blocked',code:'CREDENTIAL_REQUIRED',postingAuthorized:false})).rejects.toThrow(/dispatch_result_conflict/);
 });

});
