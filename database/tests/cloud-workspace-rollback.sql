-- Run as the database administrator. All fixtures are rolled back.
-- Tests the real authenticated role and JWT claims; does not test password login.
BEGIN;
INSERT INTO auth.users(id,email) VALUES
 ('cd549ea1-93fe-4cf9-99af-6052e2a40311','liyanna-test-owner@example.invalid'),
 ('cd549ea1-93fe-4cf9-99af-6052e2a40312','liyanna-test-staff@example.invalid'),
 ('cd549ea1-93fe-4cf9-99af-6052e2a40313','liyanna-test-outsider@example.invalid');
SET LOCAL ROLE authenticated;
DO $test$
DECLARE
 bid uuid := 'cd549ea1-93fe-4cf9-99af-6052e2a40314';
 owner_id text := 'cd549ea1-93fe-4cf9-99af-6052e2a40311';
 staff_id text := 'cd549ea1-93fe-4cf9-99af-6052e2a40312';
 outsider_id text := 'cd549ea1-93fe-4cf9-99af-6052e2a40313';
 business jsonb;
 snapshot jsonb;
 result jsonb;
 blocked boolean;
BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 business := jsonb_build_object('id',bid,'name','Rollback verification','currency','LKR');
 PERFORM public.liyanna_create_business(business);
 result := public.liyanna_read_workspace(bid);
 IF result->>'role' <> 'owner' OR (result->>'revision')::int <> 0 THEN RAISE EXCEPTION 'initial workspace mismatch'; END IF;
 snapshot := result->'snapshot';
 snapshot := jsonb_set(snapshot,'{customers}',jsonb_build_array(jsonb_build_object('id','cd549ea1-93fe-4cf9-99af-6052e2a40315','businessId',bid,'name','Test customer')));
 snapshot := jsonb_set(snapshot,'{documents}',jsonb_build_array(
 jsonb_build_object('id','cd549ea1-93fe-4cf9-99af-6052e2a40316','businessId',bid,'type','quote','number','QUO-TEST-001','items',jsonb_build_array(jsonb_build_object('quantity','2','rate','125.50'))),
 jsonb_build_object('id','cd549ea1-93fe-4cf9-99af-6052e2a40317','businessId',bid,'type','invoice','number','INV-TEST-001','items',jsonb_build_array(jsonb_build_object('quantity','2','rate','125.50')))));
 result := public.liyanna_sync(bid,0,snapshot);
 IF (result->>'revision')::int <> 1 OR jsonb_array_length(result#>'{snapshot,documents}') <> 2 THEN RAISE EXCEPTION 'save failed'; END IF;
 result := public.liyanna_read_workspace(bid);
 IF jsonb_array_length(result#>'{snapshot,customers}') <> 1 OR jsonb_array_length(result#>'{snapshot,documents}') <> 2 THEN RAISE EXCEPTION 'reload failed'; END IF;
 blocked := false;
 BEGIN PERFORM public.liyanna_sync(bid,0,snapshot);
 EXCEPTION WHEN serialization_failure THEN blocked := true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'stale revision accepted'; END IF;
 PERFORM public.liyanna_backup(result->'snapshot');
 PERFORM public.liyanna_member(bid,'liyanna-test-staff@example.invalid','own');
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',staff_id,'role','authenticated')::text,true);
 result := public.liyanna_read_workspace(bid);
 IF result->>'scope' <> 'own' OR jsonb_array_length(result#>'{snapshot,documents}') <> 0 THEN RAISE EXCEPTION 'staff document isolation failed'; END IF;
 blocked := false;
 BEGIN PERFORM public.liyanna_backup(snapshot);
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'owner_required' THEN RAISE; END IF; blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'staff backup permitted'; END IF;
 blocked := false;
 BEGIN PERFORM public.liyanna_sync(bid,(result->>'revision')::bigint,snapshot);
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'access_denied' THEN RAISE; END IF; blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'staff overwrote owner documents'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',outsider_id,'role','authenticated')::text,true);
 IF EXISTS(SELECT 1 FROM public.liyanna_businesses WHERE id=bid) OR EXISTS(SELECT 1 FROM public.liyanna_documents WHERE business_id=bid) OR EXISTS(SELECT 1 FROM public.liyanna_backups WHERE business_id=bid) THEN RAISE EXCEPTION 'outsider RLS failed'; END IF;
 blocked := false;
 BEGIN PERFORM public.liyanna_read_workspace(bid);
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'access_denied' THEN RAISE; END IF; blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'outsider workspace permitted'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 PERFORM public.liyanna_remove_member(bid,staff_id::uuid);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',staff_id,'role','authenticated')::text,true);
 blocked := false;
 BEGIN PERFORM public.liyanna_read_workspace(bid);
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'access_denied' THEN RAISE; END IF; blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'revoked member retained access'; END IF;
END $test$;
RESET ROLE;
SELECT 'passed: create, quote/invoice save and reload, stale revision, backup, staff ownership, outsider RLS, revocation' AS verification;
ROLLBACK;
