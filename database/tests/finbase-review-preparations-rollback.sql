-- Administrator-run synthetic verification. All fixtures are rolled back.
begin;
do $test$
declare
 owner_id uuid:=gen_random_uuid();staff_id uuid:=gen_random_uuid();bid uuid:=gen_random_uuid();did uuid:=gen_random_uuid();cid uuid:=gen_random_uuid();snapshot jsonb;first_result jsonb;retry jsonb;blocked boolean;
 cfg jsonb:='{"companyId":"synthetic-sandbox-company","companyLabel":"Review sandbox","currency":"LKR","revenueCategory":"services"}'::jsonb;
begin
 insert into auth.users(id,email) values(owner_id,'review-prep-owner-'||owner_id||'@example.invalid'),(staff_id,'review-prep-staff-'||staff_id||'@example.invalid');
 execute 'set local role authenticated';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 perform public.liyanna_create_business(jsonb_build_object('id',bid,'name','Review preparation rollback','currency','LKR'));
 snapshot:=public.liyanna_read_workspace(bid)->'snapshot';
 snapshot:=jsonb_set(snapshot,'{customers}',jsonb_build_array(jsonb_build_object('id',cid,'businessId',bid,'name','Review customer','email','','phone','','address','')));
 snapshot:=jsonb_set(snapshot,'{documents}',jsonb_build_array(jsonb_build_object('id',did,'businessId',bid,'type','invoice','number','INV-SYNTHETIC-001','currency','LKR','issueDate','2026-11-19','dueDate','','discountKind','percent','discount','10','taxKind','percent','tax','18','customer',jsonb_build_object('name','Review customer','email','','phone','','address',''),'items',jsonb_build_array(jsonb_build_object('quantity','2','rate','125.50')))));
 perform public.liyanna_sync(bid,0,snapshot);
 perform public.liyanna_finbase_destination(bid,'save',0,cfg,true);
 first_result:=public.liyanna_finbase_review(bid,'prepare',did,1,1,cid,true);
 retry:=public.liyanna_finbase_review(bid,'prepare',did,1,1,cid,true);
 if retry->>'duplicate'<>'true' or retry->'receipt' is distinct from first_result->'receipt' then raise exception 'retry_identity_failed';end if;
 if first_result#>>'{receipt,event,total}'<>'266.56' or first_result#>>'{receipt,event,taxTotal}'<>'40.66' or first_result#>>'{receipt,event,tenantId}'<>bid::text or first_result->>'postingAuthorized'<>'false' then raise exception 'source_totals_or_scope_failed';end if;
 blocked:=false;
 begin perform public.liyanna_finbase_review(bid,'prepare',did,0,1,cid,true);exception when serialization_failure then blocked:=true;end;
 if not blocked then raise exception 'stale_document_permitted';end if;
 if jsonb_array_length(public.liyanna_finbase_review(bid,'read')->'receipts')<>1 then raise exception 'history_failed';end if;
 blocked:=false;
 begin delete from public.liyanna_finbase_review_preparations where business_id=bid;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'history_delete_permitted';end if;
 perform public.liyanna_member(bid,'review-prep-staff-'||staff_id||'@example.invalid','all');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',staff_id,'role','authenticated')::text,true);
 blocked:=false;
 begin perform public.liyanna_finbase_review(bid,'read');exception when insufficient_privilege then blocked:=true;end;
 if not blocked or exists(select 1 from public.liyanna_finbase_review_preparations where business_id=bid) then raise exception 'staff_isolation_failed';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 perform public.liyanna_finbase_destination(bid,'revoke',1);
 blocked:=false;
 begin perform public.liyanna_finbase_review(bid,'prepare',did,1,1,cid,true);exception when raise_exception then if sqlerrm<>'review_destination_required' then raise;end if;blocked:=true;end;
 if not blocked then raise exception 'revoked_preparation_permitted';end if;
 execute 'reset role';
end $test$;
select 'passed: exact cloud totals, durable retry identity, stale rejection, immutable history, staff isolation and destination revocation; fixtures rolled back' as verification;
rollback;
