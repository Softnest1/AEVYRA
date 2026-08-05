
-- ── 1. Configuration timezone de l'app ───────────────────────────────────
CREATE TABLE IF NOT EXISTS app_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);
INSERT INTO app_config (key, value)
VALUES ('app_timezone', 'Europe/Paris')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cfg_select ON app_config;
CREATE POLICY cfg_select ON app_config FOR SELECT USING (true);

-- ── 2. RPC get_challenge_window() ────────────────────────────────────────
-- Retourne today (date locale), week_start, reset_at (prochain minuit UTC),
-- et le timezone. Le client utilise ces valeurs directement sans recalcul JS.
CREATE OR REPLACE FUNCTION get_challenge_window()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_tz         text;
  v_now_local  timestamp;
  v_today      date;
  v_dow        int;
  v_week_start date;
  v_reset_at   timestamptz;
BEGIN
  SELECT value INTO v_tz FROM app_config WHERE key = 'app_timezone';
  v_tz := COALESCE(v_tz, 'Europe/Paris');

  v_now_local  := now() AT TIME ZONE v_tz;
  v_today      := v_now_local::date;
  v_dow        := EXTRACT(isodow FROM v_today)::int; -- 1=lun … 7=dim
  v_week_start := v_today - (v_dow - 1);

  -- Prochain minuit local en UTC
  v_reset_at := timezone(v_tz, (v_today + 1)::timestamp);

  RETURN jsonb_build_object(
    'today',      v_today::text,
    'week_start', v_week_start::text,
    'reset_at',   v_reset_at,
    'tz',         v_tz
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_challenge_window() TO anon, authenticated;

-- ── 3. Nettoyage nocturne reload_offsets périmés ─────────────────────────
CREATE OR REPLACE FUNCTION cleanup_old_reload_offsets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tz   text;
  v_cutoff date;
BEGIN
  SELECT value INTO v_tz FROM app_config WHERE key = 'app_timezone';
  v_tz := COALESCE(v_tz, 'Europe/Paris');
  v_cutoff := (now() AT TIME ZONE v_tz)::date - 1;
  DELETE FROM user_reload_offsets WHERE date_key < v_cutoff;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_old_reload_offsets() TO authenticated;
