
-- ════════════════════════════════════════════════════════════
-- AEVYRA — STRATÉGIE DOMINATION V2
-- Score fiabilité, auto-suspension, stats publiques, transparence
-- ════════════════════════════════════════════════════════════

-- 1. Colonnes score_fiabilite et compteurs sur profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS score_fiabilite   INTEGER DEFAULT 100 CHECK (score_fiabilite >= 0 AND score_fiabilite <= 100),
  ADD COLUMN IF NOT EXISTS nb_signalements   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nb_ghostings      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_suspended    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS photo_verified    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS photo_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS couples_formed    BOOLEAN DEFAULT FALSE;

-- 2. Table stats_publiques
CREATE TABLE IF NOT EXISTS stats_publiques (
  id                    SERIAL PRIMARY KEY,
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  membres_verifies      INTEGER DEFAULT 0,
  membres_actifs        INTEGER DEFAULT 0,
  bots_supprimes        INTEGER DEFAULT 0,
  faux_profils_bloques  INTEGER DEFAULT 0,
  couples_formes        INTEGER DEFAULT 0,
  signalements_traites  INTEGER DEFAULT 0,
  uptime_pct            NUMERIC(5,2) DEFAULT 99.9,
  taux_profils_reels    NUMERIC(5,2) DEFAULT 0,
  ratio_hommes_pct      NUMERIC(5,2) DEFAULT 0,
  ratio_femmes_pct      NUMERIC(5,2) DEFAULT 0
);

INSERT INTO stats_publiques DEFAULT VALUES ON CONFLICT DO NOTHING;

ALTER TABLE stats_publiques ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stats_publiques_read_all"    ON stats_publiques;
DROP POLICY IF EXISTS "stats_publiques_admin_write" ON stats_publiques;
CREATE POLICY "stats_publiques_read_all"    ON stats_publiques FOR SELECT USING (true);
CREATE POLICY "stats_publiques_admin_write" ON stats_publiques FOR ALL
  USING  (is_admin())
  WITH CHECK (is_admin());

-- 3. Trigger auto-suspension : 3 signalements = suspension 72h
CREATE OR REPLACE FUNCTION public.check_auto_suspension()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INTEGER;
  v_score INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM reports
  WHERE reported_id = NEW.reported_id
    AND created_at > NOW() - INTERVAL '30 days'
    AND status != 'dismissed';

  IF v_count >= 3 THEN
    SELECT score_fiabilite INTO v_score FROM profiles WHERE id = NEW.reported_id;
    v_score := GREATEST(0, COALESCE(v_score, 100) - 15);

    UPDATE profiles SET
      auto_suspended    = TRUE,
      auto_suspended_at = NOW(),
      suspension_reason = 'Auto-suspension : 3 signalements en 30 jours',
      nb_signalements   = v_count,
      score_fiabilite   = v_score
    WHERE id = NEW.reported_id;

    INSERT INTO admin_logs (admin_id, action, target_user_id, details)
    VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'auto_suspend',
      NEW.reported_id,
      json_build_object('nb_signalements', v_count, 'score', v_score)::text
    );
  ELSE
    UPDATE profiles SET nb_signalements = v_count WHERE id = NEW.reported_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_suspension ON reports;
CREATE TRIGGER trg_auto_suspension
  AFTER INSERT OR UPDATE OF status ON reports
  FOR EACH ROW EXECUTE FUNCTION public.check_auto_suspension();

-- 4. Fonction RPC refresh stats publiques
CREATE OR REPLACE FUNCTION public.refresh_stats_publiques()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_verifies INTEGER; v_actifs INTEGER; v_bots INTEGER;
  v_couples  INTEGER; v_reports INTEGER;
  v_hommes NUMERIC;   v_femmes NUMERIC; v_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_verifies FROM profiles WHERE is_verified = TRUE AND inscription_complete = TRUE;
  SELECT COUNT(*) INTO v_actifs   FROM profiles WHERE last_seen_at > NOW() - INTERVAL '7 days';
  SELECT COUNT(*) INTO v_bots     FROM profiles WHERE is_banned = TRUE;
  SELECT COUNT(*) INTO v_couples  FROM temoignages WHERE approved = TRUE;
  SELECT COUNT(*) INTO v_reports  FROM reports WHERE status = 'resolved';
  SELECT COUNT(*) INTO v_total    FROM profiles WHERE inscription_complete = TRUE;

  SELECT
    ROUND(100.0 * SUM(CASE WHEN genre='homme' THEN 1 ELSE 0 END) / NULLIF(v_total,0), 1),
    ROUND(100.0 * SUM(CASE WHEN genre='femme' THEN 1 ELSE 0 END) / NULLIF(v_total,0), 1)
  INTO v_hommes, v_femmes
  FROM profiles WHERE inscription_complete = TRUE;

  UPDATE stats_publiques SET
    updated_at           = NOW(),
    membres_verifies     = v_verifies,
    membres_actifs       = v_actifs,
    bots_supprimes       = v_bots,
    couples_formes       = v_couples,
    signalements_traites = v_reports,
    taux_profils_reels   = ROUND(100.0 * v_verifies / NULLIF(v_total,0), 1),
    ratio_hommes_pct     = COALESCE(v_hommes, 0),
    ratio_femmes_pct     = COALESCE(v_femmes, 0)
  WHERE id = (SELECT id FROM stats_publiques ORDER BY id LIMIT 1);
END;
$$;

-- 5. Index
CREATE INDEX IF NOT EXISTS idx_profiles_score_fiabilite ON profiles (score_fiabilite);
CREATE INDEX IF NOT EXISTS idx_profiles_auto_suspended  ON profiles (auto_suspended) WHERE auto_suspended = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_photo_verified  ON profiles (photo_verified);
