
-- ═══════════════════════════════════════════════════════════════════════════
-- get_challenge_window v2 : accepte le timezone du client (optionnel)
-- ─────────────────────────────────────────────────────────────────────────
-- Stratégie de priorité pour le timezone :
--   1. p_tz fourni par le client (ex: "America/Montreal", "Europe/Brussels")
--      → validé dans pg_timezone_names, sinon ignoré
--   2. app_config.app_timezone (valeur par défaut globale de l'app)
--   3. 'Europe/Paris' (fallback ultime)
--
-- Cela permet à un utilisateur belge, québécois ou sénégalais d'avoir
-- la BONNE fenêtre de défis calée sur son minuit local, sans rien coder
-- de spécial côté client : il envoie juste son Intl timezone.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_challenge_window(p_tz text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_tz         text;
  v_app_tz     text;
  v_now_local  timestamp;
  v_today      date;
  v_dow        int;
  v_week_start date;
  v_reset_at   timestamptz;
BEGIN
  -- Lire le timezone par défaut de l'app
  SELECT value INTO v_app_tz FROM app_config WHERE key = 'app_timezone';
  v_app_tz := COALESCE(v_app_tz, 'Europe/Paris');

  -- Valider le timezone client (doit exister dans pg_timezone_names)
  IF p_tz IS NOT NULL AND EXISTS (
    SELECT 1 FROM pg_timezone_names WHERE name = p_tz
  ) THEN
    v_tz := p_tz;
  ELSE
    v_tz := v_app_tz;
  END IF;

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

GRANT EXECUTE ON FUNCTION get_challenge_window(text) TO anon, authenticated;
