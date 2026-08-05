
-- ── Témoignages : INSERT doit forcer user_id = auth.uid() ─────────────────────
DROP POLICY IF EXISTS temoignages_insert_own ON temoignages;
CREATE POLICY temoignages_insert_own ON temoignages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── Témoignages : UPDATE doit empêcher de changer user_id ────────────────────
DROP POLICY IF EXISTS temoignages_update_own ON temoignages;
CREATE POLICY temoignages_update_own ON temoignages
  FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Roman content : INSERT doit forcer author_id = auth.uid() ────────────────
DROP POLICY IF EXISTS roman_content_insert_members ON roman_content;
CREATE POLICY roman_content_insert_members ON roman_content
  FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND is_member_since_days(3)
  );
