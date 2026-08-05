-- ── 1. Activer RLS sur event_inscriptions (table non protégée)
ALTER TABLE event_inscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_inscriptions_select_own"  ON event_inscriptions;
DROP POLICY IF EXISTS "event_inscriptions_insert_auth" ON event_inscriptions;
DROP POLICY IF EXISTS "event_inscriptions_delete_own"  ON event_inscriptions;

CREATE POLICY "event_inscriptions_select_own"
  ON event_inscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "event_inscriptions_insert_auth"
  ON event_inscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "event_inscriptions_delete_own"
  ON event_inscriptions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ── 2. Supprimer la politique SELECT dupliquée sur roman_content
DROP POLICY IF EXISTS "Contenu visible par tous les connectés" ON roman_content;