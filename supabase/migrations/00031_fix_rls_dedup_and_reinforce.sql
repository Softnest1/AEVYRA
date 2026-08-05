
-- ═══════════════════════════════════════════════════════════════
-- Migration 00031 : Suppression doublons RLS + renforcement sécurité
-- ═══════════════════════════════════════════════════════════════

-- ── 1. event_inscriptions — supprimer les 3 doublons (noms français) ──
DROP POLICY IF EXISTS "Se désinscrire"            ON event_inscriptions;
DROP POLICY IF EXISTS "S'inscrire à un événement" ON event_inscriptions;
DROP POLICY IF EXISTS "Voir ses inscriptions"      ON event_inscriptions;

-- ── 2. events — ouvrir la lecture aux anon pour la landing publique ──
DROP POLICY IF EXISTS "Événements visibles par tous" ON events;
CREATE POLICY events_select_all
  ON events FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── 3. temoignages — corriger INSERT/DELETE de public → authenticated ──
DROP POLICY IF EXISTS temoignages_insert_own ON temoignages;
DROP POLICY IF EXISTS temoignages_delete_own ON temoignages;
DROP POLICY IF EXISTS temoignages_select_own ON temoignages;

CREATE POLICY temoignages_select_own
  ON temoignages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY temoignages_insert_own
  ON temoignages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND consentement = true);

CREATE POLICY temoignages_delete_own
  ON temoignages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ── 4. matches — renforcer UPDATE : seuls les participants ──
DROP POLICY IF EXISTS matches_update ON matches;
CREATE POLICY matches_update
  ON matches FOR UPDATE
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id)
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ── 5. notifications — INSERT : réservé aux triggers SECURITY DEFINER ──
DROP POLICY IF EXISTS notifications_insert_system ON notifications;
CREATE POLICY notifications_insert_system
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- ── 6. user_badges — INSERT : réservé aux triggers internes ──
DROP POLICY IF EXISTS badges_insert ON user_badges;
CREATE POLICY badges_insert
  ON user_badges FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- ── 7. Index de performance manquants ──
CREATE INDEX IF NOT EXISTS idx_blocks_blocker       ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked       ON blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_connections_status   ON connections(status);
CREATE INDEX IF NOT EXISTS idx_temoignages_approuve ON temoignages(approuve) WHERE approuve = true;
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
