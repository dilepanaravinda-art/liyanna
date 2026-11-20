-- Proposed dispatcher foundation. Do not grant membership or activate a worker automatically.
create role liyanna_review_dispatcher nologin;
create table public.liyanna_review_dispatches (
 preparation_id uuid primary key references public.liyanna_finbase_review_preparations(id) on delete cascade,
 status text not null check(status in ('leased','retry','staged','blocked','review')),
 attempt_count integer not null check(attempt_count between 1 and 8),
 lease_token uuid not null,lease_until timestamptz not null,next_retry timestamptz,
 receipt_id uuid,updated_at timestamptz not null default clock_timestamp()
);
create table public.liyanna_review_dispatch_attempts (
 preparation_id uuid not null references public.liyanna_review_dispatches(preparation_id) on delete cascade,
 attempt integer not null,lease_token uuid not null unique,
 started_at timestamptz not null default clock_timestamp(),finished_at timestamptz,result jsonb,
 primary key(preparation_id,attempt)
);
alter table public.liyanna_review_dispatches enable row level security;
alter table public.liyanna_review_dispatch_attempts enable row level security;
revoke all on public.liyanna_review_dispatches,public.liyanna_review_dispatch_attempts from public,anon,authenticated,liyanna_review_dispatcher;
create function public.liyanna_claim_review_dispatch(p_business uuid,p_preparation uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.liyanna_finbase_review_preparations;b public.liyanna_businesses;d public.liyanna_finbase_destinations;s public.liyanna_review_dispatches;token uuid;n integer;
begin
 select * into b from public.liyanna_businesses where id=p_business for update;
 select * into p from public.liyanna_finbase_review_preparations where id=p_preparation and business_id=p_business;
 if p.id is null or b.owner_id is distinct from p.prepared_by then return jsonb_build_object('status','blocked','code','SOURCE_NOT_AUTHORIZED');end if;
 select * into d from public.liyanna_finbase_destinations where business_id=p_business;
 if d.status is distinct from 'draft' or d.revision<>p.destination_revision or d.config<>p.destination_config then return jsonb_build_object('status','blocked','code','DESTINATION_CHANGED');end if;
 if not exists(select 1 from public.liyanna_documents where business_id=p_business and id=p.document_id and kind='invoice' and payload=p.source_document) then return jsonb_build_object('status','blocked','code','SOURCE_CHANGED');end if;
 if not exists(select 1 from public.liyanna_customers where business_id=p_business and id=p.customer_id and payload->>'name'=p.source_document#>>'{customer,name}' and coalesce(payload->>'email','')=coalesce(p.source_document#>>'{customer,email}','') and coalesce(payload->>'phone','')=coalesce(p.source_document#>>'{customer,phone}','')) then return jsonb_build_object('status','blocked','code','SOURCE_CHANGED');end if;
 select * into s from public.liyanna_review_dispatches where preparation_id=p_preparation;
 if s.status in ('staged','blocked','review') then return jsonb_build_object('status',s.status,'receiptId',s.receipt_id);end if;
 if s.status='leased' and s.lease_until>clock_timestamp() then return jsonb_build_object('status','busy');end if;
 if s.status='retry' and s.next_retry>clock_timestamp() then return jsonb_build_object('status','waiting');end if;
 if coalesce(s.attempt_count,0)>=8 then return jsonb_build_object('status','review','code','ATTEMPT_LIMIT');end if;
 token:=gen_random_uuid();n:=coalesce(s.attempt_count,0)+1;
 insert into public.liyanna_review_dispatches(preparation_id,status,attempt_count,lease_token,lease_until)
 values(p_preparation,'leased',n,token,clock_timestamp()+interval '60 seconds')
 on conflict(preparation_id) do update set status='leased',attempt_count=n,lease_token=token,lease_until=clock_timestamp()+interval '60 seconds',next_retry=null,updated_at=clock_timestamp();
 insert into public.liyanna_review_dispatch_attempts(preparation_id,attempt,lease_token) values(p_preparation,n,token);
 return jsonb_build_object('status','claimed','businessId',p_business,'event',p.event,'leaseToken',token,'attempt',n);
end $$;
create function public.liyanna_finish_review_dispatch(p_preparation uuid,p_lease uuid,p_result jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.liyanna_review_dispatches;a public.liyanna_review_dispatch_attempts;outcome_status text;receipt uuid;
begin
 if jsonb_typeof(p_result) is distinct from 'object' or octet_length(p_result::text)>2048 or p_result->'postingAuthorized' is distinct from 'false'::jsonb then raise exception 'invalid_dispatch_result';end if;
 outcome_status:=p_result->>'status';
 if outcome_status='staged' then
  if (p_result-array['status','receiptId','duplicate','payloadHash','postingAuthorized'])<>'{}'::jsonb or jsonb_typeof(p_result->'duplicate') is distinct from 'boolean' or coalesce(p_result->>'payloadHash','')!~'^[a-f0-9]{64}$' or coalesce(p_result->>'receiptId','')!~'^[a-f0-9-]{36}$' then raise exception 'invalid_dispatch_result';end if;
  receipt:=(p_result->>'receiptId')::uuid;
 elsif outcome_status in ('blocked','retry','review') then
  if (p_result-array['status','code','postingAuthorized'])<>'{}'::jsonb or coalesce(p_result->>'code','') not in ('SANDBOX_DISABLED','DESTINATION_NOT_ALLOWED','CREDENTIAL_REQUIRED','INVALID_EVENT','EVENT_TOO_LARGE','INVALID_TIMEOUT','REDIRECT_REJECTED','CREDENTIAL_OR_SCOPE_REJECTED','TEMPORARY_RECEIVER_FAILURE','EVENT_CONFLICT','EVENT_REJECTED','INVALID_RECEIPT','NETWORK_OR_TIMEOUT') then raise exception 'invalid_dispatch_result';end if;
 else raise exception 'invalid_dispatch_result';end if;
 select * into s from public.liyanna_review_dispatches where preparation_id=p_preparation for update;
 select * into a from public.liyanna_review_dispatch_attempts where preparation_id=p_preparation and lease_token=p_lease;
 if a.finished_at is not null then
  if a.result=p_result then return a.result;end if;
  raise exception 'dispatch_result_conflict';
 end if;
 if s.preparation_id is null or a.lease_token is null or s.lease_token is distinct from p_lease or s.status<>'leased' or s.lease_until<=clock_timestamp() then raise exception 'stale_dispatch_lease';end if;
 update public.liyanna_review_dispatch_attempts set finished_at=clock_timestamp(),result=p_result where preparation_id=p_preparation and lease_token=p_lease;
 update public.liyanna_review_dispatches set status=case when outcome_status='retry' and attempt_count>=8 then 'review' else outcome_status end,
 next_retry=case when outcome_status='retry' then clock_timestamp()+least(3600,30*power(2,attempt_count-1)) * interval '1 second' else null end,
 receipt_id=receipt,updated_at=clock_timestamp() where preparation_id=p_preparation;
 return p_result;
end $$;
revoke all on function public.liyanna_claim_review_dispatch(uuid,uuid),public.liyanna_finish_review_dispatch(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.liyanna_claim_review_dispatch(uuid,uuid),public.liyanna_finish_review_dispatch(uuid,uuid,jsonb) to liyanna_review_dispatcher;
