
-- ── 1. RLS UPDATE : interdire toute modification client directe de referrals ──
-- Seul le service_role (Edge Functions) peut modifier rewarded/validated_at
-- Les clients ne peuvent que lire leurs propres lignes → pas de UPDATE policy publique
-- (déjà sans policy UPDATE = seul service_role peut modifier)

-- ── 2. RPC atomique pour incrémenter referral_count + déclencher récompense ──
-- Évite la race condition lecture-puis-écriture côté client
CREATE OR REPLACE FUNCTION apply_referral(
  p_code        text,
  p_new_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer       record;
  v_new_count      int;
  v_frames         text[];
  v_premium_until  timestamptz;
  v_already        boolean;
BEGIN
  -- Normaliser le code
  p_code := upper(trim(p_code));
  IF p_code NOT LIKE 'AEVYRA-%' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Code invalide');
  END IF;

  -- Trouver le parrain (verrou FOR UPDATE pour éviter double-incrément concurrent)
  SELECT id, referral_count, premium_until, premium_frames
  INTO v_referrer
  FROM profiles
  WHERE referral_code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Code introuvable');
  END IF;

  IF v_referrer.id = p_new_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Auto-parrainage interdit');
  END IF;

  -- Idempotent : déjà parrainé ?
  SELECT EXISTS(
    SELECT 1 FROM referrals WHERE referred_id = p_new_user_id
  ) INTO v_already;
  IF v_already THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;

  -- Insérer le parrainage
  INSERT INTO referrals (referrer_id, referred_id, code, rewarded)
  VALUES (v_referrer.id, p_new_user_id, p_code, false)
  ON CONFLICT (referred_id) DO NOTHING;

  -- Incrémenter atomiquement
  v_new_count := coalesce(v_referrer.referral_count, 0) + 1;

  -- Récompense palier 3 : cadre arc-en-ciel + 7j premium
  v_frames := coalesce(v_referrer.premium_frames, ARRAY[]::text[]);
  IF v_new_count >= 3 AND NOT ('arc' = ANY(v_frames)) THEN
    v_frames := array_append(v_frames, 'arc');
    v_premium_until := now() + interval '7 days';
    UPDATE referrals SET rewarded = true WHERE referrer_id = v_referrer.id;
    UPDATE profiles SET
      referral_count = v_new_count,
      premium_frames = v_frames,
      premium_until  = v_premium_until
    WHERE id = v_referrer.id;
  ELSE
    UPDATE profiles SET referral_count = v_new_count WHERE id = v_referrer.id;
  END IF;

  -- Badge "Âme Découverte" pour le filleul
  INSERT INTO user_badges (user_id, badge_slug, badge_emoji, badge_label)
  VALUES (p_new_user_id, 'ame_decouverte', '🌟', 'Âme Découverte')
  ON CONFLICT (user_id, badge_slug) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'new_count', v_new_count);
END;
$$;

-- Accorder l'exécution à tous les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION apply_referral(text, uuid) TO authenticated;

-- ── 3. Index sur profiles.referral_code pour lookup rapide ──────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code
  ON profiles (referral_code)
  WHERE referral_code IS NOT NULL;
