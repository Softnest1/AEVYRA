-- ============================================================
-- Signalement & Blocage — obligatoire pour Google Play / Apple / Microsoft
-- ============================================================

-- 1. Table des signalements
CREATE TABLE IF NOT EXISTS public.reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason        TEXT NOT NULL CHECK (reason IN (
    'fake_profile', 'harassment', 'inappropriate_content',
    'spam', 'underage', 'scam', 'other'
  )),
  details       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_report CHECK (reporter_id != reported_id),
  UNIQUE (reporter_id, reported_id)
);

-- 2. Table des blocages
CREATE TABLE IF NOT EXISTS public.blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id),
  UNIQUE (blocker_id, blocked_id)
);

-- 3. Index de performance
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON public.reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker   ON public.blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked   ON public.blocks(blocked_id);

-- 4. RLS — chaque utilisateur ne voit et ne modifie que ses propres données
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks  ENABLE ROW LEVEL SECURITY;

-- Reports : insérer son propre signalement, voir les siens
CREATE POLICY "reports_insert_own" ON public.reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "reports_select_own" ON public.reports
  FOR SELECT TO authenticated USING (reporter_id = auth.uid());

-- Blocks : CRUD sur ses propres blocages
CREATE POLICY "blocks_insert_own" ON public.blocks
  FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "blocks_select_own" ON public.blocks
  FOR SELECT TO authenticated USING (blocker_id = auth.uid());
CREATE POLICY "blocks_delete_own" ON public.blocks
  FOR DELETE TO authenticated USING (blocker_id = auth.uid());

-- 5. Fonction : est-ce que je bloque ou suis-je bloqué par cet utilisateur ?
CREATE OR REPLACE FUNCTION public.is_blocked(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = auth.uid() AND blocked_id = p_user_id)
       OR (blocker_id = p_user_id  AND blocked_id = auth.uid())
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_blocked(UUID) TO authenticated;

-- 6. Exclure les profils bloqués de la constellation
-- (Mise à jour de getProfilesForConstellation via RLS implicite — filtre côté API)
-- La fonction is_blocked() est appelée côté client dans amour-api.ts