-- Liyanna schema-only export, 2026-10-19. PostgreSQL 17 / fresh Supabase project.

-- No data, credentials, Auth users, or passwords are included.

-- Run as postgres only in a NEW EMPTY Supabase project. Not an upgrade migration.

BEGIN;

SET LOCAL search_path = public, pg_catalog;

SET LOCAL check_function_bodies = false;

CREATE SCHEMA IF NOT EXISTS liyanna_private AUTHORIZATION postgres;

REVOKE ALL ON SCHEMA liyanna_private FROM PUBLIC, anon, authenticated, service_role;

GRANT USAGE ON SCHEMA liyanna_private TO authenticated;

CREATE TABLE "public"."liyanna_backups" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "snapshot" jsonb NOT NULL
);

ALTER TABLE "public"."liyanna_backups" OWNER TO "postgres";

CREATE TABLE "public"."liyanna_businesses" (
  "id" uuid NOT NULL,
  "owner_id" uuid NOT NULL,
  "profile" jsonb NOT NULL,
  "revision" bigint DEFAULT 0 NOT NULL,
  "invoice_seq" integer DEFAULT 1 NOT NULL,
  "quote_seq" integer DEFAULT 1 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."liyanna_businesses" OWNER TO "postgres";

CREATE TABLE "public"."liyanna_customers" (
  "business_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "payload" jsonb NOT NULL
);

ALTER TABLE "public"."liyanna_customers" OWNER TO "postgres";

CREATE TABLE "public"."liyanna_documents" (
  "business_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "created_by" uuid NOT NULL,
  "kind" text NOT NULL,
  "number" text NOT NULL,
  "payload" jsonb NOT NULL
);

ALTER TABLE "public"."liyanna_documents" OWNER TO "postgres";

CREATE TABLE "public"."liyanna_members" (
  "business_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "email" text NOT NULL,
  "scope" text NOT NULL
);

ALTER TABLE "public"."liyanna_members" OWNER TO "postgres";

ALTER TABLE "public"."liyanna_backups" ADD CONSTRAINT "liyanna_backups_check" CHECK ((snapshot #>> '{business,id}'::text[]) = business_id::text);

ALTER TABLE "public"."liyanna_backups" ADD CONSTRAINT "liyanna_backups_snapshot_check" CHECK (octet_length(snapshot::text) <= 50000000);

ALTER TABLE "public"."liyanna_businesses" ADD CONSTRAINT "liyanna_businesses_check" CHECK ((profile ->> 'id'::text) = id::text);

ALTER TABLE "public"."liyanna_businesses" ADD CONSTRAINT "liyanna_businesses_profile_check" CHECK (jsonb_typeof(profile) = 'object'::text);

ALTER TABLE "public"."liyanna_customers" ADD CONSTRAINT "liyanna_customers_check" CHECK ((payload ->> 'businessId'::text) = business_id::text);

ALTER TABLE "public"."liyanna_documents" ADD CONSTRAINT "liyanna_documents_check" CHECK ((payload ->> 'businessId'::text) = business_id::text);

ALTER TABLE "public"."liyanna_documents" ADD CONSTRAINT "liyanna_documents_check1" CHECK ((payload ->> 'createdBy'::text) = created_by::text);

ALTER TABLE "public"."liyanna_documents" ADD CONSTRAINT "liyanna_documents_kind_check" CHECK (kind = ANY (ARRAY['invoice'::text, 'quote'::text]));

ALTER TABLE "public"."liyanna_members" ADD CONSTRAINT "liyanna_members_scope_check" CHECK (scope = ANY (ARRAY['own'::text, 'all'::text]));

ALTER TABLE "public"."liyanna_backups" ADD CONSTRAINT "liyanna_backups_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."liyanna_businesses" ADD CONSTRAINT "liyanna_businesses_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."liyanna_customers" ADD CONSTRAINT "liyanna_customers_pkey" PRIMARY KEY (business_id, id);

ALTER TABLE "public"."liyanna_documents" ADD CONSTRAINT "liyanna_documents_pkey" PRIMARY KEY (business_id, id);

ALTER TABLE "public"."liyanna_members" ADD CONSTRAINT "liyanna_members_pkey" PRIMARY KEY (business_id, user_id);

ALTER TABLE "public"."liyanna_documents" ADD CONSTRAINT "liyanna_documents_business_id_kind_number_key" UNIQUE (business_id, kind, number);

ALTER TABLE "public"."liyanna_backups" ADD CONSTRAINT "liyanna_backups_business_id_fkey" FOREIGN KEY (business_id) REFERENCES liyanna_businesses(id) ON DELETE CASCADE;

ALTER TABLE "public"."liyanna_businesses" ADD CONSTRAINT "liyanna_businesses_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id);

ALTER TABLE "public"."liyanna_customers" ADD CONSTRAINT "liyanna_customers_business_id_fkey" FOREIGN KEY (business_id) REFERENCES liyanna_businesses(id) ON DELETE CASCADE;

ALTER TABLE "public"."liyanna_documents" ADD CONSTRAINT "liyanna_documents_business_id_fkey" FOREIGN KEY (business_id) REFERENCES liyanna_businesses(id) ON DELETE CASCADE;

ALTER TABLE "public"."liyanna_documents" ADD CONSTRAINT "liyanna_documents_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE "public"."liyanna_members" ADD CONSTRAINT "liyanna_members_business_id_fkey" FOREIGN KEY (business_id) REFERENCES liyanna_businesses(id) ON DELETE CASCADE;

ALTER TABLE "public"."liyanna_members" ADD CONSTRAINT "liyanna_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX liyanna_members_user ON public.liyanna_members USING btree (user_id);

CREATE INDEX liyanna_backups_business ON public.liyanna_backups USING btree (business_id, created_at);

CREATE OR REPLACE FUNCTION liyanna_private.backup(p_snapshot jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare bid uuid:=(p_snapshot#>>'{business,id}')::uuid;result uuid;
begin
 if liyanna_private.scope(bid) is distinct from 'owner' then raise exception 'owner_required';end if;
 if p_snapshot->>'version' is distinct from '1' then raise exception 'invalid_snapshot';end if;
 insert into public.liyanna_backups(business_id,snapshot) values(bid,p_snapshot) returning id into result;return result;
end $function$;

ALTER FUNCTION "liyanna_private"."backup"(p_snapshot jsonb) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION liyanna_private.clear_shared(p_business uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 perform 1 from public.liyanna_businesses where id=p_business for update;
 if liyanna_private.scope(p_business) is distinct from 'owner' then raise exception 'owner_required';end if;
 delete from public.liyanna_documents where business_id=p_business;delete from public.liyanna_customers where business_id=p_business;delete from public.liyanna_members where business_id=p_business;
 update public.liyanna_businesses set revision=revision+1,updated_at=clock_timestamp() where id=p_business;
end $function$;

ALTER FUNCTION "liyanna_private"."clear_shared"(p_business uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION liyanna_private.create_business(p_business jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null then raise exception 'access_denied';end if;
 if jsonb_typeof(p_business)<>'object' or coalesce(length(p_business->>'name'),0)=0 or coalesce(length(p_business->>'currency'),0)<>3 then raise exception 'invalid_business';end if;
 insert into public.liyanna_businesses(id,owner_id,profile) values ((p_business->>'id')::uuid,auth.uid(),p_business) on conflict(id) do nothing;
 if liyanna_private.scope((p_business->>'id')::uuid) is distinct from 'owner' then raise exception 'owner_required';end if;
end $function$;

ALTER FUNCTION "liyanna_private"."create_business"(p_business jsonb) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION liyanna_private.member(p_business uuid, p_email text, p_scope text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare staff_id uuid;
begin
 perform 1 from public.liyanna_businesses where id=p_business for update;
 if liyanna_private.scope(p_business) is distinct from 'owner' then raise exception 'owner_required';end if;
 if p_scope not in ('own','all') then raise exception 'invalid_scope';end if;
 select id into staff_id from auth.users where lower(email)=lower(trim(p_email));
 if staff_id is null then raise exception 'staff_account_required';end if;
 if staff_id=auth.uid() then raise exception 'cannot_change_owner';end if;
 insert into public.liyanna_members(business_id,user_id,email,scope) values(p_business,staff_id,lower(trim(p_email)),p_scope) on conflict(business_id,user_id) do update set scope=excluded.scope;
 update public.liyanna_businesses set revision=revision+1,updated_at=clock_timestamp() where id=p_business;
end $function$;

ALTER FUNCTION "liyanna_private"."member"(p_business uuid, p_email text, p_scope text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION liyanna_private.read_workspace(p_business uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare access text:=liyanna_private.scope(p_business);b public.liyanna_businesses;docs jsonb;customers jsonb;
begin
 if access is null then raise exception 'access_denied';end if;
 select * into b from public.liyanna_businesses where id=p_business;
 select coalesce(jsonb_agg(d.payload order by d.id),'[]'::jsonb) into docs from public.liyanna_documents d where d.business_id=p_business and (access in ('owner','all') or d.created_by=auth.uid());
 select coalesce(jsonb_agg(c.payload order by c.id),'[]'::jsonb) into customers from public.liyanna_customers c where c.business_id=p_business;
 return jsonb_build_object('revision',b.revision,'role',case when access='owner' then 'owner' else 'staff' end,'scope',access,'snapshot',jsonb_build_object('version',1,'business',b.profile,'documents',docs,'customers',customers,'sequences',jsonb_build_object('invoice',b.invoice_seq,'quote',b.quote_seq),'updatedAt',to_char(b.updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
end $function$;

ALTER FUNCTION "liyanna_private"."read_workspace"(p_business uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION liyanna_private.remove_member(p_business uuid, p_user uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 perform 1 from public.liyanna_businesses where id=p_business for update;
 if liyanna_private.scope(p_business) is distinct from 'owner' then raise exception 'owner_required';end if;
 delete from public.liyanna_members where business_id=p_business and user_id=p_user;
 update public.liyanna_businesses set revision=revision+1,updated_at=clock_timestamp() where id=p_business;
end $function$;

ALTER FUNCTION "liyanna_private"."remove_member"(p_business uuid, p_user uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION liyanna_private.scope(p_business uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select case when b.owner_id=auth.uid() then 'owner' else (select m.scope from public.liyanna_members m where m.business_id=b.id and m.user_id=auth.uid()) end
 from public.liyanna_businesses b where b.id=p_business and auth.uid() is not null
$function$;

ALTER FUNCTION "liyanna_private"."scope"(p_business uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION liyanna_private.sync(p_business uuid, p_expected bigint, p_snapshot jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare access text;b public.liyanna_businesses;doc jsonb;customer jsonb;creator uuid;existing public.liyanna_documents;num text;nextnum integer;doc_kind text;
begin
 -- Lock first, then recheck membership, so revocation serialises with queued writes.
 select * into b from public.liyanna_businesses where id=p_business for update;
 access:=liyanna_private.scope(p_business);
 if access is null then raise exception 'access_denied';end if;
 if b.revision<>p_expected then raise exception 'revision_conflict' using errcode='40001';end if;
 if p_snapshot#>>'{business,id}' is distinct from p_business::text or p_snapshot->>'version' is distinct from '1' or jsonb_typeof(p_snapshot->'documents') is distinct from 'array' or jsonb_typeof(p_snapshot->'customers') is distinct from 'array' or octet_length(p_snapshot::text)>50000000 then raise exception 'invalid_snapshot';end if;
 if access='owner' then update public.liyanna_businesses set profile=p_snapshot->'business' where id=p_business;end if;
 for customer in select value from jsonb_array_elements(p_snapshot->'customers') loop
  if customer->>'businessId' is distinct from p_business::text or coalesce(length(customer->>'name'),0)=0 then raise exception 'invalid_customer';end if;
  insert into public.liyanna_customers(business_id,id,payload) values(p_business,(customer->>'id')::uuid,customer) on conflict(business_id,id) do update set payload=excluded.payload;
 end loop;
 if access='owner' then delete from public.liyanna_customers c where c.business_id=p_business and not exists(select 1 from jsonb_array_elements(p_snapshot->'customers') v where v->>'id'=c.id::text);end if;
 for doc in select value from jsonb_array_elements(p_snapshot->'documents') loop
  if doc->>'businessId' is distinct from p_business::text or doc->>'type' not in ('invoice','quote') or coalesce(length(doc->>'number'),0)=0 or jsonb_typeof(doc->'items') is distinct from 'array' or jsonb_array_length(doc->'items') not between 1 and 500 then raise exception 'invalid_document';end if;
  if exists(select 1 from jsonb_array_elements(doc->'items') i where coalesce(i->>'quantity','')!~'^\d+(\.\d{1,8})?$' or coalesce(i->>'rate','')!~'^\d+(\.\d{1,8})?$') then raise exception 'invalid_amount';end if;
  if exists(select 1 from jsonb_array_elements(doc->'items') i where (i->>'quantity')::numeric<=0) then raise exception 'invalid_quantity';end if;
  select * into existing from public.liyanna_documents where business_id=p_business and id=(doc->>'id')::uuid;
  if found then
   if access='own' and existing.created_by<>auth.uid() then raise exception 'access_denied';end if;
   creator:=existing.created_by;
  else creator:=auth.uid();end if;
  num:=doc->>'number';doc_kind:=doc->>'type';
  while exists(select 1 from public.liyanna_documents where business_id=p_business and kind=doc->>'type' and number=num and id<>(doc->>'id')::uuid) loop
   if doc_kind='invoice' then nextnum:=b.invoice_seq;b.invoice_seq:=b.invoice_seq+1;else nextnum:=b.quote_seq;b.quote_seq:=b.quote_seq+1;end if;
   num:=(case when doc_kind='invoice' then 'INV-' else 'QUO-' end)||extract(year from current_date)::text||'-'||lpad(nextnum::text,greatest(3,length(nextnum::text)),'0');
  end loop;
  doc:=jsonb_set(jsonb_set(doc,'{createdBy}',to_jsonb(creator::text)),'{number}',to_jsonb(num));
  if existing.id is null or doc is distinct from existing.payload then
   doc:=jsonb_set(doc,'{revision}',to_jsonb(coalesce((existing.payload->>'revision')::integer,0)+1));
   doc:=jsonb_set(doc,'{updatedAt}',to_jsonb(to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
  end if;
  insert into public.liyanna_documents(business_id,id,created_by,kind,number,payload) values(p_business,(doc->>'id')::uuid,creator,doc_kind,num,doc) on conflict(business_id,id) do update set kind=excluded.kind,number=excluded.number,payload=excluded.payload;
 end loop;
 delete from public.liyanna_documents d where d.business_id=p_business and (access in ('owner','all') or d.created_by=auth.uid()) and not exists(select 1 from jsonb_array_elements(p_snapshot->'documents') v where v->>'id'=d.id::text);
 update public.liyanna_businesses set revision=revision+1,updated_at=clock_timestamp(),invoice_seq=greatest(b.invoice_seq,coalesce((p_snapshot#>>'{sequences,invoice}')::integer,1)),quote_seq=greatest(b.quote_seq,coalesce((p_snapshot#>>'{sequences,quote}')::integer,1)) where id=p_business;
 return liyanna_private.read_workspace(p_business);
end $function$;

ALTER FUNCTION "liyanna_private"."sync"(p_business uuid, p_expected bigint, p_snapshot jsonb) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.liyanna_backup(p_snapshot jsonb)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$select liyanna_private.backup(p_snapshot)$function$;

ALTER FUNCTION "public"."liyanna_backup"(p_snapshot jsonb) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.liyanna_clear_shared(p_business uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$select liyanna_private.clear_shared(p_business)$function$;

ALTER FUNCTION "public"."liyanna_clear_shared"(p_business uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.liyanna_create_business(p_business jsonb)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$select liyanna_private.create_business(p_business)$function$;

ALTER FUNCTION "public"."liyanna_create_business"(p_business jsonb) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.liyanna_member(p_business uuid, p_email text, p_scope text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$select liyanna_private.member(p_business,p_email,p_scope)$function$;

ALTER FUNCTION "public"."liyanna_member"(p_business uuid, p_email text, p_scope text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.liyanna_read_workspace(p_business uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$select liyanna_private.read_workspace(p_business)$function$;

ALTER FUNCTION "public"."liyanna_read_workspace"(p_business uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.liyanna_remove_member(p_business uuid, p_user uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$select liyanna_private.remove_member(p_business,p_user)$function$;

ALTER FUNCTION "public"."liyanna_remove_member"(p_business uuid, p_user uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.liyanna_sync(p_business uuid, p_expected bigint, p_snapshot jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$select liyanna_private.sync(p_business,p_expected,p_snapshot)$function$;

ALTER FUNCTION "public"."liyanna_sync"(p_business uuid, p_expected bigint, p_snapshot jsonb) OWNER TO "postgres";

ALTER TABLE "public"."liyanna_backups" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."liyanna_backups" NO FORCE ROW LEVEL SECURITY;

ALTER TABLE "public"."liyanna_businesses" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."liyanna_businesses" NO FORCE ROW LEVEL SECURITY;

ALTER TABLE "public"."liyanna_customers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."liyanna_customers" NO FORCE ROW LEVEL SECURITY;

ALTER TABLE "public"."liyanna_documents" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."liyanna_documents" NO FORCE ROW LEVEL SECURITY;

ALTER TABLE "public"."liyanna_members" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."liyanna_members" NO FORCE ROW LEVEL SECURITY;

CREATE POLICY "business_read" ON "public"."liyanna_businesses" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((liyanna_private.scope(id) IS NOT NULL));

CREATE POLICY "member_read" ON "public"."liyanna_members" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((liyanna_private.scope(business_id) = 'owner'::text) OR (user_id = auth.uid())));

CREATE POLICY "document_read" ON "public"."liyanna_documents" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((liyanna_private.scope(business_id) = ANY (ARRAY['owner'::text, 'all'::text])) OR ((liyanna_private.scope(business_id) = 'own'::text) AND (created_by = auth.uid()))));

CREATE POLICY "customer_read" ON "public"."liyanna_customers" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((liyanna_private.scope(business_id) IS NOT NULL));

CREATE POLICY "backup_delete" ON "public"."liyanna_backups" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((liyanna_private.scope(business_id) = 'owner'::text));

CREATE POLICY "backup_read" ON "public"."liyanna_backups" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((liyanna_private.scope(business_id) = 'owner'::text));

REVOKE ALL PRIVILEGES ON TABLE "public"."liyanna_backups" FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL PRIVILEGES ON TABLE "public"."liyanna_businesses" FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL PRIVILEGES ON TABLE "public"."liyanna_customers" FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL PRIVILEGES ON TABLE "public"."liyanna_documents" FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL PRIVILEGES ON TABLE "public"."liyanna_members" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."liyanna_businesses" TO "postgres";

GRANT SELECT ON TABLE "public"."liyanna_businesses" TO "postgres";

GRANT UPDATE ON TABLE "public"."liyanna_businesses" TO "postgres";

GRANT DELETE ON TABLE "public"."liyanna_businesses" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."liyanna_businesses" TO "postgres";

GRANT REFERENCES ON TABLE "public"."liyanna_businesses" TO "postgres";

GRANT TRIGGER ON TABLE "public"."liyanna_businesses" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."liyanna_businesses" TO "postgres";

GRANT INSERT ON TABLE "public"."liyanna_businesses" TO "service_role";

GRANT SELECT ON TABLE "public"."liyanna_businesses" TO "service_role";

GRANT UPDATE ON TABLE "public"."liyanna_businesses" TO "service_role";

GRANT DELETE ON TABLE "public"."liyanna_businesses" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."liyanna_businesses" TO "service_role";

GRANT REFERENCES ON TABLE "public"."liyanna_businesses" TO "service_role";

GRANT TRIGGER ON TABLE "public"."liyanna_businesses" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."liyanna_businesses" TO "service_role";

GRANT SELECT ON TABLE "public"."liyanna_businesses" TO "authenticated";

GRANT INSERT ON TABLE "public"."liyanna_members" TO "postgres";

GRANT SELECT ON TABLE "public"."liyanna_members" TO "postgres";

GRANT UPDATE ON TABLE "public"."liyanna_members" TO "postgres";

GRANT DELETE ON TABLE "public"."liyanna_members" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."liyanna_members" TO "postgres";

GRANT REFERENCES ON TABLE "public"."liyanna_members" TO "postgres";

GRANT TRIGGER ON TABLE "public"."liyanna_members" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."liyanna_members" TO "postgres";

GRANT INSERT ON TABLE "public"."liyanna_members" TO "service_role";

GRANT SELECT ON TABLE "public"."liyanna_members" TO "service_role";

GRANT UPDATE ON TABLE "public"."liyanna_members" TO "service_role";

GRANT DELETE ON TABLE "public"."liyanna_members" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."liyanna_members" TO "service_role";

GRANT REFERENCES ON TABLE "public"."liyanna_members" TO "service_role";

GRANT TRIGGER ON TABLE "public"."liyanna_members" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."liyanna_members" TO "service_role";

GRANT SELECT ON TABLE "public"."liyanna_members" TO "authenticated";

GRANT INSERT ON TABLE "public"."liyanna_documents" TO "postgres";

GRANT SELECT ON TABLE "public"."liyanna_documents" TO "postgres";

GRANT UPDATE ON TABLE "public"."liyanna_documents" TO "postgres";

GRANT DELETE ON TABLE "public"."liyanna_documents" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."liyanna_documents" TO "postgres";

GRANT REFERENCES ON TABLE "public"."liyanna_documents" TO "postgres";

GRANT TRIGGER ON TABLE "public"."liyanna_documents" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."liyanna_documents" TO "postgres";

GRANT INSERT ON TABLE "public"."liyanna_documents" TO "service_role";

GRANT SELECT ON TABLE "public"."liyanna_documents" TO "service_role";

GRANT UPDATE ON TABLE "public"."liyanna_documents" TO "service_role";

GRANT DELETE ON TABLE "public"."liyanna_documents" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."liyanna_documents" TO "service_role";

GRANT REFERENCES ON TABLE "public"."liyanna_documents" TO "service_role";

GRANT TRIGGER ON TABLE "public"."liyanna_documents" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."liyanna_documents" TO "service_role";

GRANT SELECT ON TABLE "public"."liyanna_documents" TO "authenticated";

GRANT INSERT ON TABLE "public"."liyanna_customers" TO "postgres";

GRANT SELECT ON TABLE "public"."liyanna_customers" TO "postgres";

GRANT UPDATE ON TABLE "public"."liyanna_customers" TO "postgres";

GRANT DELETE ON TABLE "public"."liyanna_customers" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."liyanna_customers" TO "postgres";

GRANT REFERENCES ON TABLE "public"."liyanna_customers" TO "postgres";

GRANT TRIGGER ON TABLE "public"."liyanna_customers" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."liyanna_customers" TO "postgres";

GRANT INSERT ON TABLE "public"."liyanna_customers" TO "service_role";

GRANT SELECT ON TABLE "public"."liyanna_customers" TO "service_role";

GRANT UPDATE ON TABLE "public"."liyanna_customers" TO "service_role";

GRANT DELETE ON TABLE "public"."liyanna_customers" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."liyanna_customers" TO "service_role";

GRANT REFERENCES ON TABLE "public"."liyanna_customers" TO "service_role";

GRANT TRIGGER ON TABLE "public"."liyanna_customers" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."liyanna_customers" TO "service_role";

GRANT SELECT ON TABLE "public"."liyanna_customers" TO "authenticated";

GRANT INSERT ON TABLE "public"."liyanna_backups" TO "postgres";

GRANT SELECT ON TABLE "public"."liyanna_backups" TO "postgres";

GRANT UPDATE ON TABLE "public"."liyanna_backups" TO "postgres";

GRANT DELETE ON TABLE "public"."liyanna_backups" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."liyanna_backups" TO "postgres";

GRANT REFERENCES ON TABLE "public"."liyanna_backups" TO "postgres";

GRANT TRIGGER ON TABLE "public"."liyanna_backups" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."liyanna_backups" TO "postgres";

GRANT INSERT ON TABLE "public"."liyanna_backups" TO "service_role";

GRANT SELECT ON TABLE "public"."liyanna_backups" TO "service_role";

GRANT UPDATE ON TABLE "public"."liyanna_backups" TO "service_role";

GRANT DELETE ON TABLE "public"."liyanna_backups" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."liyanna_backups" TO "service_role";

GRANT REFERENCES ON TABLE "public"."liyanna_backups" TO "service_role";

GRANT TRIGGER ON TABLE "public"."liyanna_backups" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."liyanna_backups" TO "service_role";

GRANT SELECT ON TABLE "public"."liyanna_backups" TO "authenticated";

GRANT DELETE ON TABLE "public"."liyanna_backups" TO "authenticated";

REVOKE ALL PRIVILEGES ON FUNCTION "liyanna_private"."backup"(p_snapshot jsonb) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL PRIVILEGES ON FUNCTION "liyanna_private"."clear_shared"(p_business uuid) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL PRIVILEGES ON FUNCTION "liyanna_private"."create_business"(p_business jsonb) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL PRIVILEGES ON FUNCTION "liyanna_private"."member"(p_business uuid, p_email text, p_scope text) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL PRIVILEGES ON FUNCTION "liyanna_private"."read_workspace"(p_business uuid) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL PRIVILEGES ON FUNCTION "liyanna_private"."remove_member"(p_business uuid, p_user uuid) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL PRIVILEGES ON FUNCTION "liyanna_private"."scope"(p_business uuid) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL PRIVILEGES ON FUNCTION "liyanna_private"."sync"(p_business uuid, p_expected bigint, p_snapshot jsonb) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL PRIVILEGES ON FUNCTION "public"."liyanna_backup"(p_snapshot jsonb) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL PRIVILEGES ON FUNCTION "public"."liyanna_clear_shared"(p_business uuid) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL PRIVILEGES ON FUNCTION "public"."liyanna_create_business"(p_business jsonb) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL PRIVILEGES ON FUNCTION "public"."liyanna_member"(p_business uuid, p_email text, p_scope text) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL PRIVILEGES ON FUNCTION "public"."liyanna_read_workspace"(p_business uuid) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL PRIVILEGES ON FUNCTION "public"."liyanna_remove_member"(p_business uuid, p_user uuid) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL PRIVILEGES ON FUNCTION "public"."liyanna_sync"(p_business uuid, p_expected bigint, p_snapshot jsonb) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."liyanna_create_business"(p_business jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."liyanna_create_business"(p_business jsonb) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."liyanna_create_business"(p_business jsonb) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."liyanna_backup"(p_snapshot jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."liyanna_backup"(p_snapshot jsonb) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."liyanna_backup"(p_snapshot jsonb) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."liyanna_read_workspace"(p_business uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."liyanna_read_workspace"(p_business uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."liyanna_read_workspace"(p_business uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."liyanna_sync"(p_business uuid, p_expected bigint, p_snapshot jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."liyanna_sync"(p_business uuid, p_expected bigint, p_snapshot jsonb) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."liyanna_sync"(p_business uuid, p_expected bigint, p_snapshot jsonb) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."liyanna_member"(p_business uuid, p_email text, p_scope text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."liyanna_member"(p_business uuid, p_email text, p_scope text) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."liyanna_member"(p_business uuid, p_email text, p_scope text) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."liyanna_remove_member"(p_business uuid, p_user uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."liyanna_remove_member"(p_business uuid, p_user uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."liyanna_remove_member"(p_business uuid, p_user uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."liyanna_clear_shared"(p_business uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."liyanna_clear_shared"(p_business uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."liyanna_clear_shared"(p_business uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "liyanna_private"."scope"(p_business uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "liyanna_private"."scope"(p_business uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "liyanna_private"."create_business"(p_business jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "liyanna_private"."create_business"(p_business jsonb) TO "authenticated";

GRANT EXECUTE ON FUNCTION "liyanna_private"."backup"(p_snapshot jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "liyanna_private"."backup"(p_snapshot jsonb) TO "authenticated";

GRANT EXECUTE ON FUNCTION "liyanna_private"."read_workspace"(p_business uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "liyanna_private"."read_workspace"(p_business uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "liyanna_private"."remove_member"(p_business uuid, p_user uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "liyanna_private"."remove_member"(p_business uuid, p_user uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "liyanna_private"."sync"(p_business uuid, p_expected bigint, p_snapshot jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "liyanna_private"."sync"(p_business uuid, p_expected bigint, p_snapshot jsonb) TO "authenticated";

GRANT EXECUTE ON FUNCTION "liyanna_private"."clear_shared"(p_business uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "liyanna_private"."clear_shared"(p_business uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "liyanna_private"."member"(p_business uuid, p_email text, p_scope text) TO "postgres";

GRANT EXECUTE ON FUNCTION "liyanna_private"."member"(p_business uuid, p_email text, p_scope text) TO "authenticated";

COMMIT;
