
-- Supprimer l'ancienne policy restrictive SELECT sur user_badges
DROP POLICY IF EXISTS badges_select ON user_badges;

-- Nouvelle policy : tout utilisateur connecté peut lire les badges de n'importe quel user
-- (nécessaire pour afficher les badges sur les profils publics)
CREATE POLICY badges_select ON user_badges
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
