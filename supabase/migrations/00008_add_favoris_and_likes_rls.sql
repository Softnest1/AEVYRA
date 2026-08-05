
-- Table favoris (étoiles sauvegardées)
CREATE TABLE IF NOT EXISTS public.favoris (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, profile_id)
);

ALTER TABLE public.favoris ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favoris_select_own" ON public.favoris
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "favoris_insert_own" ON public.favoris
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favoris_delete_own" ON public.favoris
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS likes (drop + recreate pour éviter les doublons)
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='likes' AND policyname='likes_select_participants'
  ) THEN
    CREATE POLICY "likes_select_participants" ON public.likes
      FOR SELECT TO authenticated
      USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='likes' AND policyname='likes_insert_own'
  ) THEN
    CREATE POLICY "likes_insert_own" ON public.likes
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id);
  END IF;
END $$;
