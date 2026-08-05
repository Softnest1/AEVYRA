
-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION : Système de bannissement intelligent & sécurisé
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Expiration automatique côté utilisateur (appelée à chaque connexion)
CREATE OR REPLACE FUNCTION public.expire_own_sanction()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  UPDATE sanctions
  SET status = 'expired', lifted_at = now()
  WHERE user_id = v_uid
    AND status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at <= now();

  UPDATE profiles
  SET is_banned     = false,
      banned_reason = NULL,
      banned_at     = NULL
  WHERE id = v_uid
    AND NOT EXISTS (
      SELECT 1 FROM sanctions
      WHERE user_id = v_uid
        AND status IN ('active', 'permanent')
        AND type IN ('ban_temp', 'ban_permanent')
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.expire_own_sanction() TO authenticated;

-- 2. Expiration globale (appelée par Edge Function stats)
CREATE OR REPLACE FUNCTION public.expire_all_elapsed_sanctions()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_count int;
BEGIN
  WITH expired AS (
    UPDATE sanctions
    SET status = 'expired', lifted_at = now()
    WHERE status = 'active'
      AND expires_at IS NOT NULL
      AND expires_at <= now()
    RETURNING user_id
  )
  UPDATE profiles p
  SET is_banned     = false,
      banned_reason = NULL,
      banned_at     = NULL
  FROM (SELECT DISTINCT user_id FROM expired) u
  WHERE p.id = u.user_id
    AND NOT EXISTS (
      SELECT 1 FROM sanctions s
      WHERE s.user_id = p.id
        AND s.status IN ('active', 'permanent')
        AND s.type IN ('ban_temp', 'ban_permanent')
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.expire_all_elapsed_sanctions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_all_elapsed_sanctions() FROM authenticated;

-- 3. Corriger lift_sanction : badge réhabilité seulement si mission accomplie
CREATE OR REPLACE FUNCTION public.lift_sanction(p_sanction_id uuid, p_admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user         uuid;
  v_mission_done boolean;
BEGIN
  SELECT user_id, mission_done
  INTO v_user, v_mission_done
  FROM sanctions WHERE id = p_sanction_id;

  IF v_user IS NULL THEN RETURN; END IF;

  UPDATE sanctions
  SET status    = 'lifted',
      lifted_at = now(),
      lifted_by = p_admin_id
  WHERE id = p_sanction_id;

  UPDATE profiles
  SET is_banned     = false,
      banned_reason = NULL,
      banned_at     = NULL,
      -- Badge SEULEMENT si mission réellement accomplie
      has_badge_rehabilite = CASE
        WHEN v_mission_done = true THEN true
        ELSE has_badge_rehabilite
      END
  WHERE id = v_user;
END;
$$;

-- 4. apply_sanction avec protections anti-abus
CREATE OR REPLACE FUNCTION public.apply_sanction(
  p_user_id    uuid,
  p_admin_id   uuid,
  p_type       sanction_type,
  p_reason     text,
  p_duration   integer DEFAULT NULL,
  p_mission    mission_type DEFAULT NULL,
  p_target     integer DEFAULT 1
)
RETURNS sanctions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rec        sanctions;
  v_expires    timestamptz;
  v_new_status sanction_status;
  v_is_admin   boolean;
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

  IF p_type = 'ban_permanent' THEN
    v_expires    := NULL;
    v_new_status := 'permanent';
  ELSE
    v_expires    := CASE WHEN p_duration IS NOT NULL THEN now() + (p_duration || ' days')::interval ELSE NULL END;
    v_new_status := 'active';
  END IF;

  UPDATE sanctions SET status = 'expired', lifted_at = now()
  WHERE user_id = p_user_id AND status = 'active';

  UPDATE profiles SET sanction_count = COALESCE(sanction_count, 0) + 1
  WHERE id = p_user_id;

  INSERT INTO sanctions(user_id, admin_id, type, reason, duration_days, expires_at, status, mission, mission_target)
  VALUES (p_user_id, p_admin_id, p_type, p_reason, p_duration, v_expires, v_new_status, p_mission, COALESCE(p_target, 1))
  RETURNING * INTO v_rec;

  UPDATE profiles SET
    is_banned     = (p_type IN ('ban_temp','ban_permanent')),
    banned_reason = p_reason,
    banned_at     = now()
  WHERE id = p_user_id;

  RETURN v_rec;
END;
$$;

-- 5. Vue active_sanction corrigée (renommage de colonnes conflit)
DROP VIEW IF EXISTS public.active_sanction;
CREATE VIEW public.active_sanction AS
SELECT
  s.id,
  s.user_id,
  s.type          AS sanction_type,
  s.reason,
  s.duration_days,
  s.expires_at,
  s.status,
  s.mission,
  s.mission_target,
  s.mission_progress,
  s.mission_done,
  s.created_at,
  s.lifted_at,
  CASE
    WHEN s.status = 'permanent' THEN true
    WHEN s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > now()) THEN true
    ELSE false
  END AS is_currently_active,
  CASE
    WHEN s.expires_at IS NULL THEN NULL
    ELSE GREATEST(0, EXTRACT(EPOCH FROM (s.expires_at - now())) / 86400)::int
  END AS days_remaining
FROM public.sanctions s
WHERE s.user_id = auth.uid()
  AND s.status IN ('active', 'permanent')
ORDER BY s.created_at DESC
LIMIT 1;

GRANT SELECT ON public.active_sanction TO authenticated;

-- 6. Index de performance
CREATE INDEX IF NOT EXISTS idx_sanctions_expires_at
  ON public.sanctions (expires_at)
  WHERE status = 'active' AND expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sanctions_user_active
  ON public.sanctions (user_id)
  WHERE status IN ('active','permanent');
