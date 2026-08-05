
-- Renforcer expire_own_sanction avec FOR UPDATE SKIP LOCKED
-- Évite la double-expiration si l'utilisateur a 2 onglets ouverts
CREATE OR REPLACE FUNCTION public.expire_own_sanction()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_has_active boolean;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  -- Expirer les sanctions échues avec SKIP LOCKED (anti race-condition multi-tabs)
  UPDATE sanctions
  SET status = 'expired', lifted_at = now()
  WHERE user_id = v_uid
    AND status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at <= now()
    AND ctid = ANY(ARRAY(
      SELECT ctid FROM sanctions
      WHERE user_id = v_uid
        AND status = 'active'
        AND expires_at IS NOT NULL
        AND expires_at <= now()
      FOR UPDATE SKIP LOCKED
    ));

  -- Vérifier s'il reste encore un ban actif APRÈS expiration
  SELECT EXISTS (
    SELECT 1 FROM sanctions
    WHERE user_id = v_uid
      AND status IN ('active', 'permanent')
      AND type IN ('ban_temp', 'ban_permanent')
  ) INTO v_has_active;

  -- Mettre à jour profiles seulement si plus aucun ban actif
  IF NOT v_has_active THEN
    UPDATE profiles
    SET is_banned     = false,
        banned_reason = NULL,
        banned_at     = NULL
    WHERE id = v_uid
      AND is_banned = true;
  END IF;
END;
$$;
