
-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION : Isolation des utilisateurs bannis + anti-triche missions
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Vue sécurisée : profils NON bannis visibles dans le chat
-- Les utilisateurs avec un ban actif n'apparaissent PAS dans la liste des
-- partenaires de conversation des autres.
CREATE OR REPLACE VIEW public.active_chat_profiles AS
SELECT p.*
FROM public.profiles p
WHERE p.is_banned = false
  -- Aucun ban_temp ou ban_permanent actif en ce moment
  AND NOT EXISTS (
    SELECT 1 FROM public.sanctions s
    WHERE s.user_id = p.id
      AND s.type IN ('ban_temp', 'ban_permanent')
      AND s.status IN ('active', 'permanent')
  );

COMMENT ON VIEW public.active_chat_profiles IS
  'Profils accessibles en chat : exclut les utilisateurs bannis (ban_temp, ban_permanent actifs)';

-- Sécurité : pas de RLS sur la vue (hérite de la table), mais accès restreint
GRANT SELECT ON public.active_chat_profiles TO authenticated;

-- 2. Vue : sanction mute active de l'utilisateur courant (pour le frontend)
CREATE OR REPLACE VIEW public.my_active_mute AS
SELECT s.id, s.type, s.reason, s.expires_at,
       s.mission, s.mission_target, s.mission_progress, s.mission_done
FROM public.sanctions s
WHERE s.user_id = auth.uid()
  AND s.type = 'mute'
  AND s.status = 'active';

COMMENT ON VIEW public.my_active_mute IS
  'Mute actif de l''utilisateur connecté — utilisé pour bloquer l''envoi de messages';

GRANT SELECT ON public.my_active_mute TO authenticated;

-- 3. Fonction anti-triche : progress_mission SÉCURISÉE
-- On NE fait PLUS confiance à p_amount envoyé depuis le client.
-- Chaque type de mission a sa propre vérification DB.
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

  -- Récupérer la sanction active avec cette mission
  SELECT id, mission_progress, mission_target, mission_done
  INTO v_sanction_id, v_current, v_target, v_done
  FROM public.sanctions
  WHERE user_id = v_user_id
    AND mission = p_mission_type
    AND status IN ('active', 'permanent')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_sanction_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Aucune sanction avec cette mission');
  END IF;

  IF v_done THEN
    RETURN json_build_object('ok', true, 'already_done', true);
  END IF;

  -- ── Vérification anti-triche selon le type de mission ──────────────────
  CASE p_mission_type

    -- Témoignage : vérifier qu'il existe un témoignage soumis (pas supprimé)
    WHEN 'testimonial' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.testimonials
        WHERE user_id = v_user_id
          AND content IS NOT NULL
          AND length(trim(content)) >= 30
          AND created_at > (
            SELECT created_at FROM public.sanctions WHERE id = v_sanction_id
          )
      ) INTO v_verified;
      v_reason := 'Aucun témoignage trouvé (min. 30 caractères, soumis après la sanction)';

    -- Profil complété : vérifier les champs obligatoires remplis
    WHEN 'complete_profile' THEN
      SELECT (
        prenom IS NOT NULL AND length(trim(prenom)) >= 2
        AND age IS NOT NULL AND age >= 18
        AND genre IS NOT NULL
        AND photo_url IS NOT NULL
        AND signe_astro IS NOT NULL
        AND ville IS NOT NULL AND length(trim(ville)) >= 2
      )
      INTO v_verified
      FROM public.profiles
      WHERE id = v_user_id;
      v_reason := 'Profil incomplet — prénom, âge, genre, photo, signe, ville requis';

    -- Acceptation CGU : vérifier que cgu_accepted_at a été mis à jour après la sanction
    WHEN 'accept_cgu' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = v_user_id
          AND cgu_accepted_at > (
            SELECT created_at FROM public.sanctions WHERE id = v_sanction_id
          )
      ) INTO v_verified;
      v_reason := 'CGU non acceptées depuis la sanction';

    -- Invitation : vérifier qu'au moins 1 nouvel utilisateur a été invité
    WHEN 'invite_friends' THEN
      -- On compte les invitations envoyées après la date de sanction
      SELECT EXISTS (
        SELECT 1 FROM public.connections
        WHERE from_user_id = v_user_id
          AND status = 'accepted'
          AND created_at > (
            SELECT created_at FROM public.sanctions WHERE id = v_sanction_id
          )
      ) INTO v_verified;
      v_reason := 'Aucune connexion acceptée trouvée depuis la sanction';

    -- Message d'excuse : champ write_apology_text rempli dans profiles
    WHEN 'write_apology' THEN
      SELECT (
        write_apology_text IS NOT NULL
        AND length(trim(write_apology_text)) >= 20
      )
      INTO v_verified
      FROM public.profiles
      WHERE id = v_user_id;
      v_reason := 'Message d''excuse non trouvé (min. 20 caractères)';

    ELSE
      RETURN json_build_object('ok', false, 'error', 'Type de mission inconnu');
  END CASE;

  IF NOT v_verified THEN
    RETURN json_build_object('ok', false, 'error', v_reason, 'verified', false);
  END IF;

  -- ── Progression vérifiée : incrémenter ──────────────────────────────────
  v_current := v_current + 1;
  v_done    := v_current >= v_target;

  UPDATE public.sanctions
  SET mission_progress = v_current,
      mission_done     = v_done
  WHERE id = v_sanction_id;

  -- Si mission terminée et ban_permanent → pas de lift auto (grace requise)
  -- Si ban_temp ou mute → lever automatiquement si mission_done
  IF v_done THEN
    UPDATE public.sanctions
    SET status    = 'lifted',
        lifted_at = now()
    WHERE id = v_sanction_id
      AND type IN ('mute', 'ban_temp');

    -- Réactiver le profil si c'était un ban_temp
    UPDATE public.profiles
    SET is_banned = false,
        banned_reason = NULL
    WHERE id = v_user_id
      AND EXISTS (
        SELECT 1 FROM public.sanctions
        WHERE id = v_sanction_id AND type = 'ban_temp'
      );
  END IF;

  RETURN json_build_object(
    'ok', true,
    'progress', v_current,
    'target', v_target,
    'done', v_done,
    'auto_lifted', v_done AND p_mission_type NOT LIKE 'ban_permanent'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_and_progress_mission(text) TO authenticated;

-- 4. Colonne write_apology_text sur profiles (si elle n'existe pas)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS write_apology_text text;

-- 5. Index pour accélérer les lookups de sanctions actives
CREATE INDEX IF NOT EXISTS idx_sanctions_user_status
  ON public.sanctions (user_id, status, type);
