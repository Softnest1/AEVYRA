
-- ══════════════════════════════════════════════════════════════
-- v450 — Sécurité anti-harcèlement : RLS blocage bidirectionnel
-- ══════════════════════════════════════════════════════════════

-- ── 1. Fonction helper is_blocked_by_either (SECURITY DEFINER) ──
-- Vérifie si un blocage existe dans LES DEUX SENS entre l'utilisateur
-- connecté et la cible. SECURITY DEFINER pour RLS sans exposer blocks.
CREATE OR REPLACE FUNCTION public.is_blocked_by_either(p_other_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
    WHERE
      (blocker_id = auth.uid() AND blocked_id = p_other_id)
      OR
      (blocker_id = p_other_id AND blocked_id = auth.uid())
  );
$$;

-- ── 2. Recréer is_blocked pour cohérence bidirectionnelle ───────
CREATE OR REPLACE FUNCTION public.is_blocked(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_blocked_by_either(p_user_id);
$$;

-- ── 3. RLS sur la table messages ────────────────────────────────
-- messages : match_id (référence matches) + sender_id (expéditeur)
-- Pour filtrer par blocage, on joint matches pour récupérer le partenaire.
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_own"    ON public.messages;
DROP POLICY IF EXISTS "messages_insert_own"    ON public.messages;
DROP POLICY IF EXISTS "messages_delete_own"    ON public.messages;
DROP POLICY IF EXISTS "messages_select"        ON public.messages;
DROP POLICY IF EXISTS "messages_insert"        ON public.messages;
DROP POLICY IF EXISTS "messages_delete"        ON public.messages;

-- SELECT : lire les messages de ses propres matches, sauf si blocage mutuel
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
        AND NOT public.is_blocked_by_either(
          CASE WHEN m.user1_id = auth.uid() THEN m.user2_id ELSE m.user1_id END
        )
    )
  );

-- INSERT : envoyer un message seulement si pas de blocage mutuel
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
        AND NOT public.is_blocked_by_either(
          CASE WHEN m.user1_id = auth.uid() THEN m.user2_id ELSE m.user1_id END
        )
    )
  );

-- DELETE : seul l'expéditeur supprime ses propres messages
CREATE POLICY "messages_delete" ON public.messages
  FOR DELETE
  USING (sender_id = auth.uid());

-- ── 4. RLS sur la table blocks ──────────────────────────────────
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocks_select_own" ON public.blocks;
DROP POLICY IF EXISTS "blocks_insert_own" ON public.blocks;
DROP POLICY IF EXISTS "blocks_delete_own" ON public.blocks;

CREATE POLICY "blocks_select_own" ON public.blocks
  FOR SELECT USING (blocker_id = auth.uid());

CREATE POLICY "blocks_insert_own" ON public.blocks
  FOR INSERT WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "blocks_delete_own" ON public.blocks
  FOR DELETE USING (blocker_id = auth.uid());

-- ── 5. RLS sur la table reports ────────────────────────────────
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert_own" ON public.reports;
DROP POLICY IF EXISTS "reports_select_own" ON public.reports;

CREATE POLICY "reports_insert_own" ON public.reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "reports_select_own" ON public.reports
  FOR SELECT USING (reporter_id = auth.uid());
