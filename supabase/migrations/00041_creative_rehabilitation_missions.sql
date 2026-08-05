
-- ══════════════════════════════════════════════════════════════════════════════
-- MISSION DE RÉHABILITATION CRÉATIVES — 5 nouvelles missions originales Aevyra
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Étendre l'enum mission_type
ALTER TYPE public.mission_type ADD VALUE IF NOT EXISTS 'star_reading';
ALTER TYPE public.mission_type ADD VALUE IF NOT EXISTS 'cosmic_kindness';
ALTER TYPE public.mission_type ADD VALUE IF NOT EXISTS 'mirror_oath';
ALTER TYPE public.mission_type ADD VALUE IF NOT EXISTS 'constellation_builder';
ALTER TYPE public.mission_type ADD VALUE IF NOT EXISTS 'healing_poem';

-- 2. Table star_readings — lectures astrologiques d'inconnus
CREATE TABLE IF NOT EXISTS public.star_readings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     text NOT NULL CHECK (length(trim(content)) >= 20),
  created_at  timestamptz DEFAULT now(),
  UNIQUE(author_id, target_id) -- 1 lecture par profil
);
ALTER TABLE public.star_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_insert_own_reading" ON public.star_readings
  FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "user_read_own_readings" ON public.star_readings
  FOR SELECT USING (author_id = auth.uid());
GRANT INSERT, SELECT ON public.star_readings TO authenticated;

-- 3. Colonnes supplémentaires dans profiles pour les nouvelles missions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mirror_oath_text     text,         -- serment du miroir
  ADD COLUMN IF NOT EXISTS healing_poem         text,         -- poème de guérison
  ADD COLUMN IF NOT EXISTS ascendant            text,         -- signe ascendant
  ADD COLUMN IF NOT EXISTS planete_dominante    text,         -- planète dominante
  ADD COLUMN IF NOT EXISTS element_astrologique text;        -- feu/terre/air/eau

-- 4. Index pour perf
CREATE INDEX IF NOT EXISTS idx_star_readings_author ON public.star_readings(author_id);
CREATE INDEX IF NOT EXISTS idx_star_readings_created ON public.star_readings(created_at);
