-- Administrator-run verification with synthetic users. No committed fixture data.
begin;
do $test$
declare
 owner_id uuid:=gen_random_uuid(); staff_id uuid:=gen_random_uuid(); outsider_id uuid:=gen_random_uuid(); bid uuid:=gen_random_uuid();
 cfg jsonb:='{"companyId":"synthetic-finbase-company","companyLabel":"Rollback review","currency":"LKR","revenueCategory":"services"}'::jsonb;
 result jsonb; blocked boolean;
begin
 insert into auth.users(id,email) values (owner_id,'owner-'||owner_id||'@example.invalid'),(staff_id,'staff-'||staff_id||'@example.invalid'),(outsider_id,'outsider-'||outsider_id||'@example.invalid');
 execute 'set local role authenticated';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 perform public.liyanna_create_business(jsonb_build_object('id',bid,'name','Destination rollback test','currency','LKR'));
 result:=public.liyanna_finbase_destination(bid,'save',0,cfg,true);
 if result->>'status'<>'draft' or result->>'revision'<>'1' or result->>'postingAuthorized'<>'false' then raise exception 'save_verification_failed';end if;
 result:=public.liyanna_finbase_destination(bid,'read');
 if result->'config' is distinct from cfg then raise exception 'reload_verification_failed';end if;
 blocked:=false;
 begin perform public.liyanna_finbase_destination(bid,'save',0,cfg,true);exception when serialization_failure then blocked:=true;end;
 if not blocked then raise exception 'stale_write_permitted';end if;
 blocked:=false;
 begin update public.liyanna_finbase_destinations set revision=99 where business_id=bid;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'direct_write_permitted';end if;
 perform public.liyanna_member(bid,'staff-'||staff_id||'@example.invalid','all');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',staff_id,'role','authenticated')::text,true);
 blocked:=false;
 begin perform public.liyanna_finbase_destination(bid,'read');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'staff_access_permitted';end if;
 if exists(select 1 from public.liyanna_finbase_destinations where business_id=bid) then raise exception 'staff_rls_failed';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',outsider_id,'role','authenticated')::text,true);
 blocked:=false;
 begin perform public.liyanna_finbase_destination(bid,'revoke',1);exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'outsider_revoke_permitted';end if;
 if exists(select 1 from public.liyanna_finbase_destination_audit where business_id=bid) then raise exception 'outsider_audit_rls_failed';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 result:=public.liyanna_finbase_destination(bid,'revoke',1);
 if result->>'status'<>'revoked' or result->>'revision'<>'2' then raise exception 'revoke_failed';end if;
 if (select count(*) from public.liyanna_finbase_destination_audit where business_id=bid)<>2 then raise exception 'audit_failed';end if;
 execute 'reset role';
end $test$;
select 'passed: owner save/reload, stale rejection, direct write denial, staff and outsider isolation, revoke and audit; fixtures rolled back' as verification;
rollback;
