
-- ══════════════════════════════════════════════════════════════════════════════
-- CORRECTIF 1 : verify_and_progress_mission
-- Bug : UPDATE profiles SET is_banned=false utilise EXISTS sur sanctions
--       APRÈS que le statut a été changé à 'lifted' → la condition échoue
--       car status='lifted' ≠ 'active'/'permanent' → is_banned reste true
--       → utilisateur définitivement bloqué malgré mission terminée
--
-- FIX : mémoriser le type avant UPDATE, utiliser variable v_type
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.verify_and_progress_mission(
  p_mission_type text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_sanction_id uuid;
  v_current     int;
  v_target      int;
  v_done        boolean;
  v_type        text;                        -- ← mémorisé AVANT UPDATE
  v_user_id     uuid := auth.uid();
  v_verified    boolean := false;
  v_reason      text := '';
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Non authentifié');
  END IF;

  -- Récupérer la sanction active + son type
  SELECT id, mission_progress, mission_target, mission_done, type::text
  INTO v_sanction_id, v_current, v_target, v_done, v_type
  FROM public.sanctions
  WHERE user_id = v_user_id
    AND mission = p_mission_type::mission_type
    AND status IN ('active', 'permanent')
  ORDER BY created_at DESC LIMIT 1;

  IF v_sanction_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Aucune sanction avec cette mission');
  END IF;

  IF v_done THEN
    -- Guard : si is_banned incohérent, le corriger
    IF v_type IN ('ban_temp', 'mute') THEN
      UPDATE public.profiles SET is_banned = false, banned_reason = NULL
      WHERE id = v_user_id AND is_banned = true;
    END IF;
    RETURN json_build_object('ok', true, 'already_done', true);
  END IF;

  -- Vérification selon le type de mission
  CASE p_mission_type

    WHEN 'soul_letter' THEN
      SELECT (soul_letter_text IS NOT NULL AND length(trim(soul_letter_text)) >= 100)
      INTO v_verified FROM public.profiles WHERE id = v_user_id;
      v_reason := 'Lettre absente ou trop courte (min. 100 caractères)';

    WHEN 'vibration_reset' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.vibration_answers
        WHERE user_id = v_user_id AND sanction_id = v_sanction_id
      ) INTO v_verified;
      v_reason := 'Questionnaire vibratoire non complété';

    WHEN 'star_reading' THEN
      SELECT (
        SELECT COUNT(*) FROM public.star_readings
        WHERE author_id = v_user_id
          AND created_at > (SELECT created_at FROM public.sanctions WHERE id = v_sanction_id)
      ) >= v_target INTO v_verified;
      v_reason := format('Commenter au moins %s profils d''âmes inconnues', v_target);

    WHEN 'cosmic_kindness' THEN
      SELECT (
        SELECT COUNT(DISTINCT to_user_id) FROM public.likes
        WHERE from_user_id = v_user_id
          AND created_at > (SELECT created_at FROM public.sanctions WHERE id = v_sanction_id)
      ) >= v_target INTO v_verified;
      v_reason := format('Envoyer de la bienveillance à %s nouvelles âmes', v_target);

    WHEN 'mirror_oath' THEN
      SELECT (mirror_oath_text IS NOT NULL AND length(trim(mirror_oath_text)) >= 80)
      INTO v_verified FROM public.profiles WHERE id = v_user_id;
      v_reason := 'Serment du miroir vide ou trop court (min. 80 caractères)';

    WHEN 'constellation_builder' THEN
      SELECT (
        signe_astro IS NOT NULL
        AND ascendant IS NOT NULL AND length(trim(ascendant)) >= 2
        AND planete_dominante IS NOT NULL AND length(trim(planete_dominante)) >= 2
        AND element_astrologique IS NOT NULL
      ) INTO v_verified FROM public.profiles WHERE id = v_user_id;
      v_reason := 'Profil astrologique incomplet — signe, ascendant, planète, élément requis';

    WHEN 'healing_poem' THEN
      SELECT (
        healing_poem IS NOT NULL
        AND length(trim(healing_poem)) >= 50
        AND array_length(string_to_array(trim(healing_poem), E'\n'), 1) >= 3
      ) INTO v_verified FROM public.profiles WHERE id = v_user_id;
      v_reason := 'Poème vide ou trop court (min. 3 lignes et 50 caractères)';

    ELSE
      RETURN json_build_object('ok', false, 'error', 'Type de mission inconnu');
  END CASE;

  IF NOT v_verified THEN
    RETURN json_build_object('ok', false, 'error', v_reason, 'verified', false);
  END IF;

  v_current := v_current + 1;
  v_done    := v_current >= v_target;

  -- Mettre à jour la progression
  UPDATE public.sanctions
  SET mission_progress = v_current, mission_done = v_done
  WHERE id = v_sanction_id;

  -- Mission terminée : lever la sanction (mute et ban_temp seulement, pas ban_permanent)
  IF v_done AND v_type IN ('mute', 'ban_temp') THEN
    UPDATE public.sanctions
    SET status = 'lifted', lifted_at = now()
    WHERE id = v_sanction_id;

    -- FIX CRITIQUE : is_banned basé sur v_type mémorisé, pas sur sanctions (déjà lifted)
    UPDATE public.profiles
    SET is_banned     = false,
        banned_reason = NULL,
        banned_at     = NULL
    WHERE id = v_user_id;
  END IF;

  RETURN json_build_object(
    'ok', true, 'progress', v_current, 'target', v_target,
    'done', v_done, 'auto_lifted', v_done AND v_type != 'ban_permanent'
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- CORRECTIF 2 : apply_sanction — forcer expires_at pour mute sans mission
-- Un mute sans durée ni mission = blocage définitif impossible à lever
-- FIX : si type=mute, durée NULL, mission NULL → forcer 7 jours par défaut
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.apply_sanction(
  p_user_id  uuid,
  p_admin_id uuid,
  p_type     sanction_type,
  p_reason   text,
  p_duration int         DEFAULT NULL,
  p_mission  mission_type DEFAULT NULL,
  p_target   int          DEFAULT 1
)
RETURNS sanctions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_rec        sanctions;
  v_expires    timestamptz;
  v_new_status sanction_status;
  v_is_admin   boolean;
  v_duration   int := p_duration;
BEGIN
  -- Garde 1 : protéger les admins
  SELECT EXISTS (SELECT 1 FROM admin_roles WHERE user_id = p_user_id) INTO v_is_admin;
  IF v_is_admin THEN
    RAISE EXCEPTION 'PROTECTED_USER: Impossible de sanctionner un membre de l''équipe admin';
  END IF;

  -- Garde 2 : anti self-ban
  IF p_user_id = p_admin_id THEN
    RAISE EXCEPTION 'SELF_BAN: Un admin ne peut pas se sanctionner lui-même';
  END IF;

  -- Garde 3 : raison minimale (10 chars)
  IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'REASON_TOO_SHORT: La raison doit faire au moins 10 caractères';
  END IF;

  -- Garde 4 : anti-spam (max 3 sanctions en 24h sur le même user)
  IF (SELECT COUNT(*) FROM sanctions WHERE user_id = p_user_id AND created_at > now() - interval '24 hours') >= 3 THEN
    RAISE EXCEPTION 'RATE_LIMIT: Trop de sanctions en 24h sur cet utilisateur';
  END IF;

  -- CORRECTIF ANTI-BLOCAGE : mute sans durée ni mission → 7 jours par défaut
  IF p_type = 'mute' AND v_duration IS NULL AND p_mission IS NULL THEN
    v_duration := 7;
  END IF;

  IF p_type = 'ban_permanent' THEN
    v_expires    := NULL;
    v_new_status := 'permanent';
  ELSE
    v_expires    := CASE WHEN v_duration IS NOT NULL THEN now() + (v_duration || ' days')::interval ELSE NULL END;
    v_new_status := 'active';
  END IF;

  -- Expirer les sanctions actives précédentes
  UPDATE sanctions SET status = 'expired', lifted_at = now()
  WHERE user_id = p_user_id AND status = 'active';

  -- Incrémenter le compteur
  UPDATE profiles SET sanction_count = COALESCE(sanction_count, 0) + 1
  WHERE id = p_user_id;

  -- Créer la nouvelle sanction
  INSERT INTO sanctions(user_id, admin_id, type, reason, duration_days, expires_at, status, mission, mission_target)
  VALUES (p_user_id, p_admin_id, p_type, p_reason, v_duration, v_expires, v_new_status, p_mission, COALESCE(p_target, 1))
  RETURNING * INTO v_rec;

  -- Mettre à jour le profil
  UPDATE profiles SET
    is_banned     = (p_type IN ('ban_temp','ban_permanent')),
    banned_reason = p_reason,
    banned_at     = now()
  WHERE id = p_user_id;

  RETURN v_rec;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- CORRECTIF 3 : Cron — expirer les bans automatiquement toutes les heures
-- Sans ce cron, les bans temporaires ne s'expirent QUE quand l'utilisateur
-- se connecte et déclenche expire_own_sanction (i.e. jamais pour les inactifs)
-- ══════════════════════════════════════════════════════════════════════════════
SELECT cron.schedule(
  'expire-sanctions-hourly',
  '0 * * * *',
  $$SELECT public.expire_all_elapsed_sanctions()$$
);

-- ══════════════════════════════════════════════════════════════════════════════
-- CORRECTIF 4 : Resynchronisation immédiate — corriger les is_banned désync
-- Cas : is_banned=true mais aucune sanction ban active (anomalie existante)
-- ══════════════════════════════════════════════════════════════════════════════
UPDATE public.profiles p
SET is_banned     = false,
    banned_reason = NULL,
    banned_at     = NULL
WHERE p.is_banned = true
  AND NOT EXISTS (
    SELECT 1 FROM public.sanctions s
    WHERE s.user_id = p.id
      AND s.status IN ('active', 'permanent')
      AND s.type IN ('ban_temp', 'ban_permanent')
  );
