
-- Enrichir check_auto_suspension :
-- - 3 signalements → auto_suspended + alerte WhatsApp via pg_net → report-alert
-- - 5 signalements → alerte rouge WhatsApp (suspension déjà active)
-- - Mise à jour nb_signalements à chaque signalement (pas seulement à 3)

CREATE OR REPLACE FUNCTION public.check_auto_suspension()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count   INTEGER;
  v_score   INTEGER;
  v_url     TEXT;
  v_token   TEXT;
  v_payload TEXT;
BEGIN
  -- Compter les signalements actifs (non dismissés) sur 30 jours
  SELECT COUNT(*) INTO v_count
  FROM reports
  WHERE reported_id = NEW.reported_id
    AND created_at > NOW() - INTERVAL '30 days'
    AND status != 'dismissed';

  -- Toujours mettre à jour le compteur
  UPDATE profiles
  SET nb_signalements = v_count
  WHERE id = NEW.reported_id;

  -- Récupérer les secrets Vault pour pg_net
  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;

  SELECT decrypted_secret INTO v_token
  FROM vault.decrypted_secrets WHERE name = 'INTERNAL_MONITOR_TOKEN' LIMIT 1;

  -- ── Seuil 3 : première suspension auto + alerte WhatsApp ──────────────────
  IF v_count = 3 THEN
    SELECT score_fiabilite INTO v_score FROM profiles WHERE id = NEW.reported_id;
    v_score := GREATEST(0, COALESCE(v_score, 100) - 15);

    UPDATE profiles SET
      auto_suspended    = TRUE,
      auto_suspended_at = NOW(),
      suspension_reason = 'Auto-suspension : 3 signalements en 30 jours',
      score_fiabilite   = v_score
    WHERE id = NEW.reported_id
      AND auto_suspended = FALSE;  -- Idempotent : ne ré-applique pas si déjà suspendu

    INSERT INTO admin_logs (admin_id, action, target_user_id, details)
    VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'auto_suspend',
      NEW.reported_id,
      json_build_object('nb_signalements', v_count, 'score', v_score, 'seuil', 3)::text
    );

    -- Alerte WhatsApp via pg_net → Edge Function report-alert
    IF v_url IS NOT NULL AND v_token IS NOT NULL THEN
      v_payload := json_build_object(
        'reported_id',     NEW.reported_id::text,
        'nb_signalements', v_count,
        'score',           v_score
      )::text;

      PERFORM net.http_post(
        url     := v_url || '/functions/v1/report-alert',
        headers := json_build_object(
          'Content-Type',      'application/json',
          'x-internal-token',  v_token
        )::jsonb,
        body    := v_payload::jsonb
      );
    END IF;

  -- ── Seuil 5 : alerte rouge (déjà suspendu, décision admin urgente) ─────────
  ELSIF v_count = 5 THEN
    SELECT score_fiabilite INTO v_score FROM profiles WHERE id = NEW.reported_id;
    v_score := GREATEST(0, COALESCE(v_score, 100) - 25);

    UPDATE profiles SET score_fiabilite = v_score WHERE id = NEW.reported_id;

    INSERT INTO admin_logs (admin_id, action, target_user_id, details)
    VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'alert_5_reports',
      NEW.reported_id,
      json_build_object('nb_signalements', v_count, 'score', v_score, 'seuil', 5)::text
    );

    IF v_url IS NOT NULL AND v_token IS NOT NULL THEN
      v_payload := json_build_object(
        'reported_id',     NEW.reported_id::text,
        'nb_signalements', v_count,
        'score',           v_score
      )::text;

      PERFORM net.http_post(
        url     := v_url || '/functions/v1/report-alert',
        headers := json_build_object(
          'Content-Type',      'application/json',
          'x-internal-token',  v_token
        )::jsonb,
        body    := v_payload::jsonb
      );
    END IF;

  -- ── Au-delà de 5 : mise à jour score seulement ───────────────────────────
  ELSIF v_count > 5 THEN
    SELECT score_fiabilite INTO v_score FROM profiles WHERE id = NEW.reported_id;
    v_score := GREATEST(0, COALESCE(v_score, 100) - 5);
    UPDATE profiles SET score_fiabilite = v_score WHERE id = NEW.reported_id;
  END IF;

  RETURN NEW;
END;
$$;
