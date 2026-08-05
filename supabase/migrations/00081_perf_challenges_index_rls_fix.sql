
-- ── 1. Index composite sur challenges pour les requêtes fréquentes ─────────────
-- Couvre: WHERE is_active=true AND type IN (...) ORDER BY order_index
CREATE INDEX IF NOT EXISTS idx_challenges_active_type
  ON challenges (is_active, type, order_index)
  WHERE is_active = true;

-- ── 2. Index sur user_challenges.challenge_id (FK lookup) ────────────────────
-- Évite seq-scan sur la table enfant lors de suppressions / joins
CREATE INDEX IF NOT EXISTS idx_user_challenges_challenge_id
  ON user_challenges (challenge_id);

-- ── 3. RLS uc_update : ajouter WITH CHECK pour empêcher changement de user_id ─
DROP POLICY IF EXISTS uc_update ON user_challenges;
CREATE POLICY uc_update ON user_challenges
  FOR UPDATE
  USING     (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 4. Index dédupliqué : supprimer l'index en double idx_user_challenges_user_date
-- (déjà couvert par idx_user_challenges_user) pour réduire overhead d'écriture
DROP INDEX IF EXISTS idx_user_challenges_user_date;
