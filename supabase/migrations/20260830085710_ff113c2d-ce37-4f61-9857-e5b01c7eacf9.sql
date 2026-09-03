
CREATE TABLE public.video_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'apidot',
  family text NOT NULL,
  label text NOT NULL,
  model_id text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('text_to_video','image_to_video')),
  resolution text,
  duration integer NOT NULL,
  aspect_ratios text[] NOT NULL DEFAULT ARRAY['16:9','9:16'],
  credits_required integer NOT NULL,
  api_cost numeric(10,4) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.video_models TO anon, authenticated;
GRANT ALL ON public.video_models TO service_role;
ALTER TABLE public.video_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active video models" ON public.video_models FOR SELECT TO anon, authenticated USING (active);

CREATE TABLE public.user_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 100 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_credits TO authenticated;
GRANT ALL ON public.user_credits TO service_role;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own credits" ON public.user_credits FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.video_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'apidot',
  model text NOT NULL,
  mode text NOT NULL,
  prompt text NOT NULL,
  image_url text,
  duration integer NOT NULL,
  resolution text,
  aspect_ratio text,
  credits_used integer NOT NULL DEFAULT 0,
  api_cost numeric(10,4) NOT NULL DEFAULT 0,
  task_id text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  output_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.video_generations TO authenticated;
GRANT ALL ON public.video_generations TO service_role;
ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own generations" ON public.video_generations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX video_generations_user_idx ON public.video_generations(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_credits
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();

CREATE OR REPLACE FUNCTION public.reserve_credits(_user_id uuid, _amount integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated integer;
BEGIN
  INSERT INTO public.user_credits (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.user_credits
     SET balance = balance - _amount, updated_at = now()
   WHERE user_id = _user_id AND balance >= _amount;
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_credits(_user_id uuid, _amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_credits
     SET balance = balance + _amount, updated_at = now()
   WHERE user_id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_credits(uuid, integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_credits(uuid, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_credits(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_credits(uuid, integer) TO service_role;

INSERT INTO public.video_models (family, label, model_id, mode, resolution, duration, aspect_ratios, credits_required, api_cost, sort_order) VALUES
  ('kling','Kling 2.1 Standard','kling-2.1/standard','image_to_video', NULL, 5, ARRAY['16:9'], 15, 0.1500, 10),
  ('kling','Kling 2.1 Standard','kling-2.1/standard','image_to_video', NULL, 10, ARRAY['16:9'], 30, 0.3000, 11),
  ('veo','Veo 3.1 Lite','veo3.1-lite','text_to_video','720p', 8, ARRAY['16:9','9:16'], 15, 0.1440, 20),
  ('sora','Sora 2','sora-2-official','text_to_video','720p', 4, ARRAY['16:9','9:16'], 24, 0.2400, 30),
  ('sora','Sora 2','sora-2-official','text_to_video','720p', 8, ARRAY['16:9','9:16'], 48, 0.4800, 31),
  ('sora','Sora 2','sora-2-official','text_to_video','720p', 12, ARRAY['16:9','9:16'], 72, 0.7200, 32),
  ('sora','Sora 2','sora-2-official','image_to_video','720p', 4, ARRAY['16:9','9:16'], 24, 0.2400, 33),
  ('sora','Sora 2','sora-2-official','image_to_video','720p', 8, ARRAY['16:9','9:16'], 48, 0.4800, 34);
