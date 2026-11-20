-- LIYANNA Phase A: additive commercial foundation. REVIEW BEFORE APPLYING.
-- Does not change existing documents, numbering or cloud-sync functions.
BEGIN;
CREATE TABLE IF NOT EXISTS public.liyanna_document_counters (
 business_id uuid NOT NULL REFERENCES public.liyanna_businesses(id) ON DELETE CASCADE,
 document_type text NOT NULL CHECK(document_type IN ('invoice','quote')),
 sequence_year integer NOT NULL CHECK(sequence_year BETWEEN 2000 AND 9999),
 last_number bigint NOT NULL DEFAULT 0 CHECK(last_number >= 0),
 PRIMARY KEY(business_id,document_type,sequence_year)
);
CREATE TABLE IF NOT EXISTS public.liyanna_document_reservations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES public.liyanna_businesses(id) ON DELETE CASCADE,
 document_type text NOT NULL CHECK(document_type IN ('invoice','quote')),
 sequence_year integer NOT NULL,
 sequence_number bigint NOT NULL,
 document_number text NOT NULL,
 request_key uuid NOT NULL,
 created_by uuid NOT NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(business_id,document_type,sequence_year,sequence_number),
 UNIQUE(business_id,document_type,request_key),
 UNIQUE(business_id,document_type,document_number)
);
CREATE TABLE IF NOT EXISTS public.liyanna_quotation_conversions (
 business_id uuid NOT NULL REFERENCES public.liyanna_businesses(id) ON DELETE CASCADE,
 quotation_id uuid NOT NULL,
 invoice_id uuid NOT NULL,
 converted_by uuid NOT NULL DEFAULT auth.uid(),
 converted_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(business_id,quotation_id),
 UNIQUE(business_id,invoice_id)
);
CREATE TABLE IF NOT EXISTS public.liyanna_payment_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES public.liyanna_businesses(id) ON DELETE CASCADE,
 invoice_id uuid NOT NULL,
 amount numeric(20,4) NOT NULL CHECK(amount > 0),
 currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
 paid_at timestamptz NOT NULL,
 reference text NOT NULL DEFAULT '',
 reconciliation text NOT NULL DEFAULT 'unreconciled' CHECK(reconciliation IN ('unreconciled','reconciled','rejected')),
 created_by uuid NOT NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS liyanna_payment_invoice_idx ON public.liyanna_payment_entries(business_id,invoice_id);
DO $$ DECLARE tbl text; BEGIN
 FOREACH tbl IN ARRAY ARRAY['liyanna_document_counters','liyanna_document_reservations','liyanna_quotation_conversions','liyanna_payment_entries'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tbl);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated',tbl);
 END LOOP;
END $$;
-- Number reservation is idempotent for each business/type/request key.
-- Only the existing owner or all-scope staff may reserve numbers.
CREATE OR REPLACE FUNCTION liyanna_private.reserve_document_number(
 p_business uuid,p_type text,p_year integer,p_request_key uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE n bigint; existing text; prefix text;
BEGIN
 IF auth.uid() IS NULL OR liyanna_private.scope(p_business) NOT IN ('owner','all') THEN RAISE EXCEPTION 'access_denied'; END IF;
 IF p_type NOT IN ('invoice','quote') OR p_year NOT BETWEEN 2000 AND 9999 OR p_request_key IS NULL THEN RAISE EXCEPTION 'invalid_request'; END IF;
 -- Serialize all allocations for a business; also serializes retries.
 PERFORM 1 FROM public.liyanna_businesses WHERE id=p_business FOR UPDATE;
 SELECT document_number INTO existing FROM public.liyanna_document_reservations
  WHERE business_id=p_business AND document_type=p_type AND request_key=p_request_key;
 IF existing IS NOT NULL THEN RETURN existing; END IF;
 -- Seed from existing payload numbers to avoid reusing old finalized numbers.
 -- Requires migration-time verification of the actual stored document number format.
 INSERT INTO public.liyanna_document_counters(business_id,document_type,sequence_year,last_number)
 VALUES(p_business,p_type,p_year,0) ON CONFLICT DO NOTHING;
 UPDATE public.liyanna_document_counters SET last_number=last_number+1
 WHERE business_id=p_business AND document_type=p_type AND sequence_year=p_year
 RETURNING last_number INTO n;
 prefix:=CASE WHEN p_type='invoice' THEN 'INV' ELSE 'QUO' END;
 existing:=prefix||'-'||p_year::text||'-'||lpad(n::text,3,'0');
 INSERT INTO public.liyanna_document_reservations(business_id,document_type,sequence_year,sequence_number,document_number,request_key)
 VALUES(p_business,p_type,p_year,n,existing,p_request_key);
 RETURN existing;
END $$;
REVOKE ALL ON FUNCTION liyanna_private.reserve_document_number(uuid,text,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION liyanna_private.reserve_document_number(uuid,text,integer,uuid) TO authenticated;
COMMIT;
