-- Iteration 15 proposal. Apply ONLY after private_connections and event_queue migrations.
-- Functions are SECURITY INVOKER, in a non-exposed schema; execute only from a reviewed server worker.
BEGIN;
CREATE OR REPLACE FUNCTION liyanna_integrations.claim_events(p_worker uuid, p_limit integer DEFAULT 10)
RETURNS SETOF liyanna_integrations.event_outbox
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
 IF p_worker IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid claim parameters'; END IF;
 RETURN QUERY
 WITH due AS (
  SELECT q.id FROM liyanna_integrations.event_outbox q
  WHERE (q.status='pending' AND q.next_attempt_at<=now())
     OR (q.status='processing' AND q.lease_until<now())
  ORDER BY q.next_attempt_at,q.created_at
  LIMIT p_limit FOR UPDATE SKIP LOCKED
 )
 UPDATE liyanna_integrations.event_outbox q SET status='processing',
  lease_owner=p_worker, lease_until=now()+interval '2 minutes',
  attempts=q.attempts+1, updated_at=now()
 FROM due WHERE q.id=due.id RETURNING q.*;
END $$;
CREATE OR REPLACE FUNCTION liyanna_integrations.finish_event(p_id uuid,p_worker uuid,p_success boolean,p_error text DEFAULT NULL,p_retry_at timestamptz DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE changed integer;
BEGIN
 IF p_id IS NULL OR p_worker IS NULL OR p_success IS NULL THEN RAISE EXCEPTION 'Invalid finish parameters'; END IF;
 UPDATE liyanna_integrations.event_outbox SET
 status=CASE WHEN p_success THEN 'delivered' WHEN p_retry_at IS NULL THEN 'dead_letter' ELSE 'pending' END,
 delivered_at=CASE WHEN p_success THEN now() ELSE NULL END,
 next_attempt_at=COALESCE(p_retry_at,next_attempt_at),
 last_error=CASE WHEN p_success THEN NULL ELSE left(COALESCE(p_error,'Delivery failed'),300) END,
 lease_owner=NULL,lease_until=NULL,updated_at=now()
 WHERE id=p_id AND status='processing' AND lease_owner=p_worker AND lease_until>now();
 GET DIAGNOSTICS changed=ROW_COUNT;
 RETURN changed=1;
END $$;
REVOKE ALL ON FUNCTION liyanna_integrations.claim_events(uuid,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION liyanna_integrations.finish_event(uuid,uuid,boolean,text,timestamptz) FROM PUBLIC,anon,authenticated;
-- Grant to a dedicated least-privilege worker role after deployment security review.
COMMIT;
