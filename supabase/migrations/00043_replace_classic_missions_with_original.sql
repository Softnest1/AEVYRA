
-- ══════════════════════════════════════════════════════════════════════
-- REMPLACEMENT MISSIONS CLASSIQUES → MISSIONS ORIGINALES AEVYRA
-- Supprime: testimonial, invite_friends, complete_profile, accept_cgu, write_apology
-- Ajoute:   soul_letter, vibration_reset
-- Conserve: star_reading, cosmic_kindness, mirror_oath, constellation_builder, healing_poem
-- ══════════════════════════════════════════════════════════════════════

-- 1. Ajouter les nouveaux types (ADD VALUE est idempotent avec IF NOT EXISTS)
ALTER TYPE public.mission_type ADD VALUE IF NOT EXISTS 'soul_letter';
ALTER TYPE public.mission_type ADD VALUE IF NOT EXISTS 'vibration_reset';

-- 2. Table vibration_answers — réponses au questionnaire d'introspection
CREATE TABLE IF NOT EXISTS public.vibration_answers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sanction_id  uuid NOT NULL REFERENCES public.sanctions(id) ON DELETE CASCADE,
  q1           text NOT NULL CHECK (length(trim(q1)) >= 10),
  q2           text NOT NULL CHECK (length(trim(q2)) >= 10),
  q3           text NOT NULL CHECK (length(trim(q3)) >= 10),
  q4           text NOT NULL CHECK (length(trim(q4)) >= 10),
  q5           text NOT NULL CHECK (length(trim(q5)) >= 10),
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.vibration_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_insert_own_vibration" ON public.vibration_answers
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_read_own_vibration" ON public.vibration_answers
  FOR SELECT USING (user_id = auth.uid());
GRANT INSERT, SELECT ON public.vibration_answers TO authenticated;

-- 3. Colonne soul_letter_text dans profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS soul_letter_text text;

-- 4. Index perf
CREATE INDEX IF NOT EXISTS idx_vibration_answers_user ON public.vibration_answers(user_id);
