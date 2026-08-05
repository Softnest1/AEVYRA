
-- Mettre à jour verify_and_progress_mission avec les 5 nouvelles missions créatives
CREATE OR REPLACE FUNCTION public.verify_and_progress_mission(
  p_mission_type text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sanction_id uuid;
  v_current     int;
  v_target      int;
  v_done        boolean;
  v_user_id     uuid := auth.uid();
  v_verified    boolean := false;
  v_reason      text := '';
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Non authentifié');
  END IF;

  SELECT id, mission_progress, mission_target, mission_done
  INTO v_sanction_id, v_current, v_target, v_done
  FROM public.sanctions
  WHERE user_id = v_user_id
    AND mission = p_mission_type::mission_type
    AND status IN ('active', 'permanent')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_sanction_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Aucune sanction avec cette mission');
  END IF;

  IF v_done THEN
    RETURN json_build_object('ok', true, 'already_done', true);
  END IF;

  CASE p_mission_type

    -- ── MISSIONS CLASSIQUES ───────────────────────────────────────────────
    WHEN 'testimonial' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.testimonials
        WHERE user_id = v_user_id
          AND content IS NOT NULL AND length(trim(content)) >= 30
          AND created_at > (SELECT created_at FROM public.sanctions WHERE id = v_sanction_id)
      ) INTO v_verified;
      v_reason := 'Aucun témoignage trouvé (min. 30 caractères, soumis après la sanction)';

    WHEN 'complete_profile' THEN
      SELECT (
        prenom IS NOT NULL AND length(trim(prenom)) >= 2
        AND age IS NOT NULL AND age >= 18
        AND genre IS NOT NULL AND photo_url IS NOT NULL
        AND signe_astro IS NOT NULL
        AND ville IS NOT NULL AND length(trim(ville)) >= 2
      ) INTO v_verified FROM public.profiles WHERE id = v_user_id;
      v_reason := 'Profil incomplet — prénom, âge, genre, photo, signe, ville requis';

    WHEN 'accept_cgu' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = v_user_id
          AND cgu_accepted_at > (SELECT created_at FROM public.sanctions WHERE id = v_sanction_id)
      ) INTO v_verified;
      v_reason := 'CGU non acceptées depuis la sanction';

    WHEN 'invite_friends' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.connections
        WHERE from_user_id = v_user_id AND status = 'accepted'
          AND created_at > (SELECT created_at FROM public.sanctions WHERE id = v_sanction_id)
      ) INTO v_verified;
      v_reason := 'Aucune connexion acceptée depuis la sanction';

    WHEN 'write_apology' THEN
      SELECT (write_apology_text IS NOT NULL AND length(trim(write_apology_text)) >= 20)
      INTO v_verified FROM public.profiles WHERE id = v_user_id;
      v_reason := 'Message d''excuse non trouvé (min. 20 caractères)';

    -- ── NOUVELLES MISSIONS CRÉATIVES ──────────────────────────────────────

    -- 🌠 Lecture des étoiles : lire et commenter 3 profils d'inconnus
    WHEN 'star_reading' THEN
      SELECT (
        SELECT COUNT(*) FROM public.star_readings
        WHERE author_id = v_user_id
          AND created_at > (SELECT created_at FROM public.sanctions WHERE id = v_sanction_id)
      ) >= v_target INTO v_verified;
      v_reason := format('Il faut commenter au moins %s profils d''âmes inconnues', v_target);

    -- 💜 Bienveillance cosmique : envoyer X likes à des profils jamais likés
    WHEN 'cosmic_kindness' THEN
      SELECT (
        SELECT COUNT(DISTINCT to_user_id) FROM public.likes
        WHERE from_user_id = v_user_id
          AND created_at > (SELECT created_at FROM public.sanctions WHERE id = v_sanction_id)
      ) >= v_target INTO v_verified;
      v_reason := format('Envoyer de la bienveillance à %s nouvelles âmes (likes)', v_target);

    -- 🪞 Serment du miroir : réflexion personnelle min. 80 chars
    WHEN 'mirror_oath' THEN
      SELECT (
        mirror_oath_text IS NOT NULL AND length(trim(mirror_oath_text)) >= 80
      ) INTO v_verified FROM public.profiles WHERE id = v_user_id;
      v_reason := 'Serment du miroir vide ou trop court (min. 80 caractères)';

    -- ✨ Bâtisseur de constellation : remplir 4 champs astrologiques
    WHEN 'constellation_builder' THEN
      SELECT (
        signe_astro IS NOT NULL
        AND ascendant IS NOT NULL AND length(trim(ascendant)) >= 2
        AND planete_dominante IS NOT NULL AND length(trim(planete_dominante)) >= 2
        AND element_astrologique IS NOT NULL
      ) INTO v_verified FROM public.profiles WHERE id = v_user_id;
      v_reason := 'Profil astrologique incomplet — signe, ascendant, planète dominante et élément requis';

    -- 📿 Poème de guérison : haïku/poème min. 3 lignes et 50 chars dans healing_poem
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

  UPDATE public.sanctions
  SET mission_progress = v_current, mission_done = v_done
  WHERE id = v_sanction_id;

  IF v_done THEN
    UPDATE public.sanctions
    SET status = 'lifted', lifted_at = now()
    WHERE id = v_sanction_id AND type IN ('mute', 'ban_temp');

    UPDATE public.profiles
    SET is_banned = false, banned_reason = NULL
    WHERE id = v_user_id
      AND EXISTS (SELECT 1 FROM public.sanctions WHERE id = v_sanction_id AND type = 'ban_temp');
  END IF;

  RETURN json_build_object(
    'ok', true, 'progress', v_current, 'target', v_target,
    'done', v_done,
    'auto_lifted', v_done AND p_mission_type <> 'ban_permanent'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_and_progress_mission(text) TO authenticated;
