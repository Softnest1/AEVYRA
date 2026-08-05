
-- FIX 1 : Contrainte UNIQUE vibration_answers (un seul insert par sanction)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vibration_answers_user_sanction_unique'
  ) THEN
    ALTER TABLE public.vibration_answers
      ADD CONSTRAINT vibration_answers_user_sanction_unique
      UNIQUE (user_id, sanction_id);
  END IF;
END$$;

-- FIX 2 : RLS uc_insert avec WITH CHECK
DROP POLICY IF EXISTS uc_insert ON public.user_challenges;
CREATE POLICY uc_insert ON public.user_challenges
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- FIX 3 : RLS badges_insert avec WITH CHECK
DROP POLICY IF EXISTS badges_insert ON public.user_badges;
CREATE POLICY badges_insert ON public.user_badges
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- FIX 4 : RLS streak_insert avec WITH CHECK
DROP POLICY IF EXISTS streak_insert ON public.user_streaks;
CREATE POLICY streak_insert ON public.user_streaks
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- FIX 5 : Table user_reload_offsets — persister reloadOffset par user/date
CREATE TABLE IF NOT EXISTS public.user_reload_offsets (
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_key    date        NOT NULL DEFAULT CURRENT_DATE,
  offset_val  integer     NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date_key)
);

ALTER TABLE public.user_reload_offsets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS uro_select ON public.user_reload_offsets;
CREATE POLICY uro_select ON public.user_reload_offsets
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS uro_upsert ON public.user_reload_offsets;
CREATE POLICY uro_upsert ON public.user_reload_offsets
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS uro_update ON public.user_reload_offsets;
CREATE POLICY uro_update ON public.user_reload_offsets
  FOR UPDATE USING (user_id = auth.uid());
