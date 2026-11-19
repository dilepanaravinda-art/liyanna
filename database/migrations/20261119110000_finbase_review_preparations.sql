-- Owner-confirmed preparation only. Never dispatches or authorizes accounting.
create table public.liyanna_finbase_review_preparations (
 id uuid primary key,
 business_id uuid not null references public.liyanna_businesses(id) on delete cascade,
 document_id uuid not null,
 document_revision integer not null,
 destination_revision bigint not null,
 destination_config jsonb not null,
 customer_id uuid not null,
 source_document jsonb not null,
 event jsonb not null,
 prepared_by uuid not null,
 prepared_at timestamptz not null default clock_timestamp(),
 posting_authorized boolean not null default false check (posting_authorized=false),
 unique (business_id,document_id,document_revision)
);
alter table public.liyanna_finbase_review_preparations enable row level security;
create policy preparation_owner_read on public.liyanna_finbase_review_preparations for select to authenticated
 using (liyanna_private.scope(business_id)='owner');
revoke all on public.liyanna_finbase_review_preparations from public,anon,authenticated;
grant select on public.liyanna_finbase_review_preparations to authenticated;
create function public.liyanna_finbase_review(
 p_business uuid,p_action text,p_document uuid default null,p_document_revision integer default null,
 p_destination_revision bigint default null,p_customer uuid default null,p_confirmed boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 d jsonb;c jsonb;destination public.liyanna_finbase_destinations;existing public.liyanna_finbase_review_preparations;
 item jsonb; subtotal numeric:=0;discount numeric;tax numeric;total numeric;amount numeric; event_data jsonb;eid uuid;
begin
 perform 1 from public.liyanna_businesses where id=p_business for update;
 if liyanna_private.scope(p_business) is distinct from 'owner' then raise exception 'owner_required' using errcode='42501';end if;
 if p_action='read' then
  return jsonb_build_object('businessId',p_business,'postingAuthorized',false,'receipts',coalesce((
   select jsonb_agg(jsonb_build_object('id',r.id,'destinationRevision',r.destination_revision,'destination',r.destination_config,'event',r.event,'preparedAt',r.prepared_at) order by r.prepared_at desc,r.id)
   from (select * from public.liyanna_finbase_review_preparations where business_id=p_business order by prepared_at desc,id limit 30) r),'[]'::jsonb));
 end if;
 if p_action is distinct from 'prepare' or p_confirmed is distinct from true then raise exception 'review_confirmation_required';end if;
 select * into destination from public.liyanna_finbase_destinations where business_id=p_business;
 if destination.status is distinct from 'draft' then raise exception 'review_destination_required';end if;
 if p_destination_revision is null or destination.revision<>p_destination_revision then raise exception 'destination_revision_conflict' using errcode='40001';end if;
 select payload into d from public.liyanna_documents where business_id=p_business and id=p_document and kind='invoice';
 if d is null or p_document_revision is null or (d->>'revision')::integer is distinct from p_document_revision then raise exception 'document_revision_conflict' using errcode='40001';end if;
 if d->>'businessId' is distinct from p_business::text or d->>'id' is distinct from p_document::text then raise exception 'invalid_review_source';end if;
 select payload into c from public.liyanna_customers where business_id=p_business and id=p_customer;
 if c is null or coalesce(btrim(c->>'name'),'')='' or d#>>'{customer,name}' is distinct from c->>'name'
  or coalesce(d#>>'{customer,email}','')<>coalesce(c->>'email','') or coalesce(d#>>'{customer,phone}','')<>coalesce(c->>'phone','') then raise exception 'matching_cloud_customer_required';end if;
 select * into existing from public.liyanna_finbase_review_preparations where business_id=p_business and document_id=p_document and document_revision=p_document_revision;
 if existing.id is not null then
  if existing.destination_revision<>destination.revision or existing.destination_config<>destination.config or existing.customer_id<>p_customer or existing.source_document<>d then raise exception 'review_preparation_conflict' using errcode='40001';end if;
  return jsonb_build_object('businessId',p_business,'postingAuthorized',false,'duplicate',true,'receipt',jsonb_build_object('id',existing.id,'destinationRevision',existing.destination_revision,'destination',existing.destination_config,'event',existing.event,'preparedAt',existing.prepared_at));
 end if;
 if d->>'currency' not in ('LKR','USD','EUR','GBP','AUD','CAD','NZD','SGD','INR','CNY','AED','SAR') or d->>'currency' is distinct from destination.config->>'currency' then raise exception 'review_currency_required';end if;
 if coalesce(btrim(d->>'number'),'')='' or length(d->>'number')>160 or jsonb_typeof(d->'items') is distinct from 'array' or jsonb_array_length(d->'items') not between 1 and 500 then raise exception 'invalid_review_source';end if;
 if coalesce(d->>'issueDate','')!~'^\d{4}-\d{2}-\d{2}$' or (d->>'issueDate')::date::text<>d->>'issueDate' then raise exception 'invalid_review_date';end if;
 if coalesce(d->>'dueDate','')<>'' and ((d->>'dueDate')!~'^\d{4}-\d{2}-\d{2}$' or (d->>'dueDate')::date::text<>d->>'dueDate' or (d->>'dueDate')::date<(d->>'issueDate')::date) then raise exception 'invalid_review_date';end if;
 for item in select value from jsonb_array_elements(d->'items') loop
  if coalesce(item->>'quantity','')!~'^\d+(\.\d{1,8})?$' or coalesce(item->>'rate','')!~'^\d+(\.\d{1,8})?$' or length(item->>'quantity')>20 or length(item->>'rate')>20 then raise exception 'invalid_review_amount';end if;
  if (item->>'quantity')::numeric<=0 then raise exception 'invalid_review_amount';end if;
  subtotal:=subtotal+round((item->>'quantity')::numeric*(item->>'rate')::numeric,2);
 end loop;
 if subtotal>1000000000000 then raise exception 'invalid_review_amount';end if;
 if coalesce(d->>'discount','')!~'^\d+(\.\d{1,8})?$' or coalesce(d->>'tax','')!~'^\d+(\.\d{1,8})?$' or length(d->>'discount')>20 or length(d->>'tax')>20 then raise exception 'invalid_review_amount';end if;
 if coalesce(d->>'discountKind','') not in ('fixed','percent') or coalesce(d->>'taxKind','') not in ('fixed','percent') then raise exception 'invalid_review_amount';end if;
 amount:=(d->>'discount')::numeric;
 discount:=round(least(subtotal,case when d->>'discountKind'='percent' then subtotal*least(amount,100)/100 else amount end),2);
 amount:=(d->>'tax')::numeric;
 if d->>'taxKind'='percent' and amount>100 then raise exception 'invalid_review_amount';end if;
 tax:=round(case when d->>'taxKind'='fixed' then amount else (subtotal-discount)*amount/100 end,2);
 total:=subtotal-discount+tax;
 if total<=0 or total>1000000000000 then raise exception 'invalid_review_amount';end if;
 eid:=gen_random_uuid();
 event_data:=jsonb_build_object('schemaVersion','1.0','eventId',eid,'occurredAt',to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'tenantId',p_business,'businessId',p_business,'source','liyanna','documentId',p_document,'documentNumber',btrim(d->>'number'),'customerRef',p_customer,
  'currency',d->>'currency','issuedOn',d->>'issueDate','dueOn',nullif(d->>'dueDate',''),'total',to_char(total,'FM999999999999999990.00'),'taxTotal',to_char(tax,'FM999999999999999990.00'),'revision',p_document_revision);
 insert into public.liyanna_finbase_review_preparations(id,business_id,document_id,document_revision,destination_revision,destination_config,customer_id,source_document,event,prepared_by)
 values(eid,p_business,p_document,p_document_revision,destination.revision,destination.config,p_customer,d,event_data,auth.uid()) returning * into existing;
 return jsonb_build_object('businessId',p_business,'postingAuthorized',false,'duplicate',false,'receipt',jsonb_build_object('id',existing.id,'destinationRevision',existing.destination_revision,'destination',existing.destination_config,'event',existing.event,'preparedAt',existing.prepared_at));
end $$;
revoke all on function public.liyanna_finbase_review(uuid,text,uuid,integer,bigint,uuid,boolean) from public,anon,authenticated;
grant execute on function public.liyanna_finbase_review(uuid,text,uuid,integer,bigint,uuid,boolean) to authenticated;
