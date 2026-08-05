
-- ============================================================
-- BUGFIX : roman_likes RLS roles=public → authenticated
-- ============================================================
DROP POLICY IF EXISTS "Likes créés par l'utilisateur"    ON public.roman_likes;
DROP POLICY IF EXISTS "Likes supprimés par l'utilisateur" ON public.roman_likes;
DROP POLICY IF EXISTS "Likes visibles par tous"          ON public.roman_likes;

CREATE POLICY "roman_likes_select" ON public.roman_likes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "roman_likes_insert" ON public.roman_likes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "roman_likes_delete" ON public.roman_likes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
