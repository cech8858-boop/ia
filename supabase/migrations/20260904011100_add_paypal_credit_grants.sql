CREATE TABLE public.paypal_credit_grants (
  paypal_order_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits integer NOT NULL CHECK (credits > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.paypal_credit_grants ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.paypal_credit_grants TO service_role;

CREATE OR REPLACE FUNCTION public.grant_paypal_credits(
  _paypal_order_id text,
  _user_id uuid,
  _credits integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer;
BEGIN
  IF _credits <= 0 THEN
    RAISE EXCEPTION 'Credits must be positive';
  END IF;

  INSERT INTO public.user_credits (user_id, balance)
  VALUES (_user_id, 100)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.paypal_credit_grants (paypal_order_id, user_id, credits)
  VALUES (_paypal_order_id, _user_id, _credits)
  ON CONFLICT (paypal_order_id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count = 1 THEN
    UPDATE public.user_credits
    SET balance = balance + _credits, updated_at = now()
    WHERE user_id = _user_id;
    RETURN _credits;
  END IF;

  RETURN 0;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_paypal_credits(text, uuid, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_paypal_credits(text, uuid, integer) TO service_role;
