
-- Corriger check_auto_suspension : target_user_id → target_id (colonne réelle admin_logs)
CREATE OR REPLACE FUNCTION public.check_auto_suspension()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count     INTEGER;
  v_score     INTEGER;
  v_url       TEXT;
  v_token     TEXT;
  v_payload   JSONB;
  v_admin_id  UUID;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM reports
  WHERE reported_id = NEW.reported_id
    AND created_at > NOW() - INTERVAL '30 days'
    AND status != 'dismissed';

  UPDATE profiles SET nb_signalements = v_count WHERE id = NEW.reported_id;

  SELECT decrypted_secret INTO v_url  FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL'           LIMIT 1;
  SELECT decrypted_secret INTO v_token FROM vault.decrypted_secrets WHERE name = 'INTERNAL_MONITOR_TOKEN' LIMIT 1;

  -- ── Seuil 3 ──────────────────────────────────────────────────────────────
  IF v_count = 3 THEN
    SELECT score_fiabilite INTO v_score FROM profiles WHERE id = NEW.reported_id;
    v_score := GREATEST(0, COALESCE(v_score, 100) - 15);

    UPDATE profiles SET
      auto_suspended    = TRUE,
      auto_suspended_at = NOW(),
      suspension_reason = 'Auto-suspension : 3 signalements en 30 jours',
      score_fiabilite   = v_score
    WHERE id = NEW.reported_id AND auto_suspended = FALSE;

    INSERT INTO admin_logs (admin_id, action, target_type, target_id, details)
    VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'auto_suspend',
      'user',
      NEW.reported_id::text,
      json_build_object('nb_signalements', v_count, 'score', v_score, 'seuil', 3)
    );

    IF v_url IS NOT NULL AND v_token IS NOT NULL THEN
      FOR v_admin_id IN SELECT user_id FROM admin_roles LOOP
        v_payload := jsonb_build_object(
          'event',   'report_alert',
          'user_id', v_admin_id::text,
          'title',   '⚠️ 3 signalements — Action requise',
          'body',    'Un profil a été suspendu automatiquement. Vérifiez les signalements.',
          'data',    jsonb_build_object('screen','reports','reported_id',NEW.reported_id::text,'nb',v_count)
        );
        PERFORM net.http_post(
          url     := v_url || '/functions/v1/send-push-on-event',
          headers := jsonb_build_object('Content-Type','application/json','x-internal-token',v_token),
          body    := v_payload
        );
      END LOOP;
    END IF;

  -- ── Seuil 5 ──────────────────────────────────────────────────────────────
  ELSIF v_count = 5 THEN
    SELECT score_fiabilite INTO v_score FROM profiles WHERE id = NEW.reported_id;
    v_score := GREATEST(0, COALESCE(v_score, 100) - 25);
    UPDATE profiles SET score_fiabilite = v_score WHERE id = NEW.reported_id;

    INSERT INTO admin_logs (admin_id, action, target_type, target_id, details)
    VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'alert_5_reports',
      'user',
      NEW.reported_id::text,
      json_build_object('nb_signalements', v_count, 'score', v_score, 'seuil', 5)
    );

    IF v_url IS NOT NULL AND v_token IS NOT NULL THEN
      FOR v_admin_id IN SELECT user_id FROM admin_roles LOOP
        v_payload := jsonb_build_object(
          'event',   'report_alert',
          'user_id', v_admin_id::text,
          'title',   '🚨 5 signalements — Décision urgente',
          'body',    'Ce profil est très signalé. Ban définitif ou libérer ?',
          'data',    jsonb_build_object('screen','reports','reported_id',NEW.reported_id::text,'nb',v_count)
        );
        PERFORM net.http_post(
          url     := v_url || '/functions/v1/send-push-on-event',
          headers := jsonb_build_object('Content-Type','application/json','x-internal-token',v_token),
          body    := v_payload
        );
      END LOOP;
    END IF;

  -- ── Au-delà de 5 ─────────────────────────────────────────────────────────
  ELSIF v_count > 5 THEN
    SELECT score_fiabilite INTO v_score FROM profiles WHERE id = NEW.reported_id;
    v_score := GREATEST(0, COALESCE(v_score, 100) - 5);
    UPDATE profiles SET score_fiabilite = v_score WHERE id = NEW.reported_id;
  END IF;

  RETURN NEW;
END;
$$;
