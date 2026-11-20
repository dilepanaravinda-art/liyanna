-- Independent of the optional commercial/worker migrations. Draft settings only.
create table public.liyanna_finbase_destinations (
 business_id uuid primary key references public.liyanna_businesses(id) on delete cascade,
 revision bigint not null check (revision > 0),
 status text not null check (status in ('draft','revoked')),
 config jsonb not null,
 confirmed_by uuid not null,
 updated_at timestamptz not null default clock_timestamp(),
 posting_authorized boolean not null default false check (posting_authorized = false)
);
create table public.liyanna_finbase_destination_audit (
 business_id uuid not null references public.liyanna_businesses(id) on delete cascade,
 revision bigint not null,
 action text not null check (action in ('save','revoke')),
 actor_id uuid not null,
 changed_at timestamptz not null default clock_timestamp(),
 config jsonb not null,
 primary key (business_id, revision)
);
alter table public.liyanna_finbase_destinations enable row level security;
alter table public.liyanna_finbase_destination_audit enable row level security;
create policy destination_owner_read on public.liyanna_finbase_destinations for select to authenticated
 using (liyanna_private.scope(business_id) = 'owner');
create policy destination_audit_owner_read on public.liyanna_finbase_destination_audit for select to authenticated
 using (liyanna_private.scope(business_id) = 'owner');
revoke all on public.liyanna_finbase_destinations, public.liyanna_finbase_destination_audit from public, anon, authenticated;
grant select on public.liyanna_finbase_destinations, public.liyanna_finbase_destination_audit to authenticated;

create function public.liyanna_finbase_destination(
 p_business uuid, p_action text, p_expected bigint default null,
 p_config jsonb default null, p_confirmed boolean default false
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare current_row public.liyanna_finbase_destinations; next_revision bigint; result jsonb;
begin
 -- Same business lock as membership changes; recheck the owner after locking.
 perform 1 from public.liyanna_businesses where id = p_business for update;
 if liyanna_private.scope(p_business) is distinct from 'owner' then
   raise exception 'owner_required' using errcode = '42501';
 end if;
 if p_action is null or p_action not in ('read','save','revoke') then raise exception 'invalid_action'; end if;
 select * into current_row from public.liyanna_finbase_destinations where business_id = p_business;
 if p_action <> 'read' then
   if p_expected is null or p_expected <> coalesce(current_row.revision,0) then
     raise exception 'destination_revision_conflict' using errcode = '40001';
   end if;
   if p_action = 'save' then
     if p_confirmed is distinct from true or jsonb_typeof(p_config) is distinct from 'object' then raise exception 'review_confirmation_required'; end if;
     if (p_config - array['companyId','companyLabel','currency','revenueCategory']) <> '{}'::jsonb
       or jsonb_typeof(p_config->'companyId') is distinct from 'string'
       or jsonb_typeof(p_config->'companyLabel') is distinct from 'string'
       or jsonb_typeof(p_config->'currency') is distinct from 'string'
       or jsonb_typeof(p_config->'revenueCategory') is distinct from 'string'
       or length(btrim(p_config->>'companyId')) not between 1 and 100
       or length(btrim(p_config->>'companyLabel')) not between 1 and 100
       or length(btrim(p_config->>'revenueCategory')) not between 1 and 100
       or (p_config->>'currency') !~ '^[A-Z]{3}$'
       then raise exception 'invalid_destination'; end if;
     p_config := jsonb_build_object('companyId',btrim(p_config->>'companyId'),'companyLabel',btrim(p_config->>'companyLabel'),
       'currency',p_config->>'currency','revenueCategory',btrim(p_config->>'revenueCategory'));
   else
     if current_row.business_id is null then raise exception 'destination_not_saved'; end if;
     p_config := current_row.config;
   end if;
   next_revision := coalesce(current_row.revision,0) + 1;
   insert into public.liyanna_finbase_destinations (business_id,revision,status,config,confirmed_by)
     values (p_business,next_revision,case when p_action='save' then 'draft' else 'revoked' end,p_config,auth.uid())
     on conflict (business_id) do update set revision=excluded.revision,status=excluded.status,config=excluded.config,
       confirmed_by=excluded.confirmed_by,updated_at=clock_timestamp();
   insert into public.liyanna_finbase_destination_audit (business_id,revision,action,actor_id,config)
     values (p_business,next_revision,p_action,auth.uid(),p_config);
   select * into current_row from public.liyanna_finbase_destinations where business_id=p_business;
 end if;
 result := jsonb_build_object('businessId',p_business,'revision',coalesce(current_row.revision,0),
   'status',coalesce(current_row.status,'not_saved'),'config',current_row.config,'postingAuthorized',false,
   'updatedAt',current_row.updated_at);
 return result;
end $$;
revoke all on function public.liyanna_finbase_destination(uuid,text,bigint,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.liyanna_finbase_destination(uuid,text,bigint,jsonb,boolean) to authenticated;
