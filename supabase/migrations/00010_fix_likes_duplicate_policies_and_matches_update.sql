
-- ============================================================
-- BUGFIX : Supprimer policies likes dupliquées
-- ============================================================
DROP POLICY IF EXISTS "Envoyer un like"      ON public.likes;
DROP POLICY IF EXISTS "Supprimer son like"   ON public.likes;
DROP POLICY IF EXISTS "Voir ses propres likes" ON public.likes;
DROP POLICY IF EXISTS "likes_insert_own"     ON public.likes;
DROP POLICY IF EXISTS "likes_select_participants" ON public.likes;

-- Recréer proprement (une seule par action)
CREATE POLICY "likes_select" ON public.likes
  FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "likes_insert" ON public.likes
  FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "likes_update" ON public.likes
  FOR UPDATE TO authenticated
  USING (from_user_id = auth.uid());

CREATE POLICY "likes_delete" ON public.likes
  FOR DELETE TO authenticated
  USING (from_user_id = auth.uid());

-- ============================================================
-- BUGFIX : matches — ajouter UPDATE policy (manquante)
-- upsert dans sendLike + getMatchIdByUserId nécessite UPDATE
-- ============================================================
DROP POLICY IF EXISTS "Mettre à jour un match" ON public.matches;

CREATE POLICY "matches_update" ON public.matches
  FOR UPDATE TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid());
