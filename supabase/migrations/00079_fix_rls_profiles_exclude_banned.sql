-- Remplacer la politique SELECT profiles pour exclure les bannis
DROP POLICY IF EXISTS "Profil visible par tous les utilisateurs connectés" ON public.profiles;

CREATE POLICY "Profil visible par tous les utilisateurs connectés"
  ON public.profiles
  FOR SELECT
  USING (
    -- Son propre profil : toujours visible même si banni
    id = auth.uid()
    OR
    -- Profils des autres : exclure les bannis
    (is_banned = false OR is_banned IS NULL)
  );
