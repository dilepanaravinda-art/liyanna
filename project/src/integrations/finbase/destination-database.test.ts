import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {beforeAll, afterAll, describe, it, expect} from 'vitest';
const owner='11111111-1111-4111-8111-111111111111',staff='22222222-2222-4222-8222-222222222222',outsider='33333333-3333-4333-8333-333333333333';
const business='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
let db:PGlite;
const config={companyId:'finbase-company',companyLabel:'Review company',currency:'LKR',revenueCategory:'services'};
async function asUser(user:string,role='authenticated') {
 await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]); await db.exec('set role '+role);
}
async function call(action:string,expected:number|null=null,value:unknown=null,confirmed=false,bid=business) {
 const result=await db.query<{result:any}>('select public.liyanna_finbase_destination($1,$2,$3,$4::jsonb,$5) as result',[bid,action,expected,value===null?null:JSON.stringify(value),confirmed]);
 return result.rows[0].result;
}
describe('owner-only persisted FINBASE destination',()=>{
 beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`create role authenticated; create role anon; create schema auth; create schema liyanna_private;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table public.liyanna_businesses(id uuid primary key,owner_id uuid not null);
    insert into public.liyanna_businesses values ('${business}','${owner}'),('${other}','${outsider}');
    create function liyanna_private.scope(b uuid) returns text language sql stable security definer set search_path='' as $$
      select case when owner_id=auth.uid() then 'owner' when auth.uid()='${staff}'::uuid then 'all' else null end from public.liyanna_businesses where id=b $$;
    grant usage on schema liyanna_private to authenticated;
    grant execute on function liyanna_private.scope(uuid) to authenticated;`);
  await db.exec(readFileSync(new URL('../../../../database/migrations/20261119100000_finbase_review_destinations.sql',import.meta.url),'utf8'));
  await asUser(owner);
 },30000);
 afterAll(async()=>{await db?.close();});
 it('saves, reloads and normalizes an owner-confirmed draft without granting posting',async()=>{
  expect((await call('read')).revision).toBe(0);
  const saved=await call('save',0,{...config,companyLabel:' Review company '},true);
  expect(saved).toMatchObject({businessId:business,revision:1,status:'draft',postingAuthorized:false,config});
  expect(await call('read')).toEqual(saved);
 });
 it('rejects stale writes without modifying the saved version or audit',async()=>{
  await expect(call('save',0,config,true)).rejects.toThrow(/revision_conflict/);
  expect((await call('read')).revision).toBe(1);
  expect((await db.query('select * from public.liyanna_finbase_destination_audit')).rows).toHaveLength(1);
 });
 it('rejects missing confirmation, unknown fields and invalid input',async()=>{
  await expect(call('save',1,config)).rejects.toThrow(/confirmation/);
  for(const bad of [{...config,postingAuthorized:true},{...config,apiKey:'never-store-credentials'},{...config,companyId:null},{...config,companyId:'x'.repeat(101)},{...config,currency:'usd'}]) await expect(call('save',1,bad,true)).rejects.toThrow(/invalid_destination/);
  expect((await call('read')).revision).toBe(1);
 });
 it('denies staff, outsiders, other businesses and anonymous RPC access',async()=>{
  for(const user of [staff,outsider]) {
   await asUser(user);
   for(const action of ['read','save','revoke']) await expect(call(action,1,config,true)).rejects.toThrow(/owner_required/);
   expect((await db.query('select * from public.liyanna_finbase_destinations')).rows).toHaveLength(0);
   expect((await db.query('select * from public.liyanna_finbase_destination_audit')).rows).toHaveLength(0);
  }
  await asUser(owner);await expect(call('read',null,null,false,other)).rejects.toThrow(/owner_required/);
  await asUser('', 'anon');await expect(call('read')).rejects.toThrow(/permission denied/);
  await asUser(owner);
 });
 it('prevents direct insert, update, delete and audit tampering even for the owner',async()=>{
  await expect(db.exec(`insert into public.liyanna_finbase_destinations (business_id,revision,status,config,confirmed_by) values ('${other}',1,'draft','{}','${owner}')`)).rejects.toThrow(/permission denied/);
  await expect(db.exec('update public.liyanna_finbase_destinations set revision=99')).rejects.toThrow(/permission denied/);
  await expect(db.exec('delete from public.liyanna_finbase_destinations')).rejects.toThrow(/permission denied/);
  await expect(db.exec('delete from public.liyanna_finbase_destination_audit')).rejects.toThrow(/permission denied/);
 });
 it('revokes with a monotonic revision and preserves immutable audit entries',async()=>{
  expect(await call('revoke',1)).toMatchObject({revision:2,status:'revoked',postingAuthorized:false});
  await expect(call('save',1,config,true)).rejects.toThrow(/revision_conflict/);
  const audit=await db.query<{revision:number;action:string;actor_id:string}>('select revision,action,actor_id from public.liyanna_finbase_destination_audit order by revision');
  expect(audit.rows.map(r=>r.action)).toEqual(['save','revoke']);expect(audit.rows.every(r=>r.actor_id===owner)).toBe(true);
  expect((await call('save',2,config,true)).revision).toBe(3);
 });
});
