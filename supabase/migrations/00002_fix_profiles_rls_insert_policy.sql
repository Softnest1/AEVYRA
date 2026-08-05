-- Supprimer l'ancienne politique INSERT sans WITH CHECK
DROP POLICY IF EXISTS "Profil créé par l'utilisateur lui-même" ON profiles;

-- Recréer avec WITH CHECK correct : l'utilisateur ne peut créer que SON propre profil
CREATE POLICY "Profil créé par l'utilisateur lui-même"
  ON profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- S'assurer que updated_at se met à jour automatiquement
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();