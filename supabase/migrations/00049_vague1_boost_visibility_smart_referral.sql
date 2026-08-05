-- ══════════════════════════════════════════════════════════════
-- Vague 1 v2 — Boost visibilité + parrainage intelligent
-- ══════════════════════════════════════════════════════════════

-- 1. Colonnes boost + validation différée sur profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS boost_until       timestamptz,
  ADD COLUMN IF NOT EXISTS boost_reason      text;

-- 2. Colonne validation différée sur referrals
--    (NULL = en attente, NOT NULL = validé à cette date)
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS validated_at      timestamptz,
  ADD COLUMN IF NOT EXISTS validation_reason text;

-- 3. Index pour trier les profils boostés en premier dans la découverte
CREATE INDEX IF NOT EXISTS idx_profiles_boost_until
  ON profiles (boost_until DESC NULLS LAST);

-- 4. Fonction : calcule le score de complétion d'un profil (0–100)
CREATE OR REPLACE FUNCTION get_profile_completion_score(p_user_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_score int := 0;
  v_profile profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Photo         : 25 pts
  IF v_profile.photo_url IS NOT NULL AND v_profile.photo_url <> '' THEN v_score := v_score + 25; END IF;
  -- Bio           : 20 pts
  IF v_profile.bio IS NOT NULL AND length(trim(v_profile.bio)) >= 10 THEN v_score := v_score + 20; END IF;
  -- Signe astro   : 15 pts
  IF v_profile.signe_astro IS NOT NULL AND v_profile.signe_astro <> '' THEN v_score := v_score + 15; END IF;
  -- Genre         : 10 pts
  IF v_profile.genre IS NOT NULL AND v_profile.genre <> '' THEN v_score := v_score + 10; END IF;
  -- Cherche       : 10 pts
  IF v_profile.cherche IS NOT NULL AND v_profile.cherche <> '' THEN v_score := v_score + 10; END IF;
  -- Energie romantique : 10 pts
  IF v_profile.energie_romantique IS NOT NULL AND v_profile.energie_romantique <> '' THEN v_score := v_score + 10; END IF;
  -- Date de naissance : 10 pts
  IF v_profile.date_naissance IS NOT NULL THEN v_score := v_score + 10; END IF;

  RETURN LEAST(v_score, 100);
END;
$$;

-- 5. Fonction : applique boost au parrain quand un filleul est validé
--    Appelée manuellement depuis l'API après validation
CREATE OR REPLACE FUNCTION apply_referrer_boost(
  p_referrer_id  uuid,
  p_referral_count int
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_boost_days int;
  v_until      timestamptz;
  v_reason     text;
BEGIN
  -- Calcul durée selon palier
  IF    p_referral_count >= 15 THEN v_boost_days := 999; v_reason := 'Légende Aevyra — boost permanent';
  ELSIF p_referral_count >= 7  THEN v_boost_days := 30;  v_reason := 'Âme Gravitationnelle — 30j boost';
  ELSIF p_referral_count >= 3  THEN v_boost_days := 7;   v_reason := 'Cadre Arc-en-Ciel — 7j boost';
  ELSE                               v_boost_days := 1;   v_reason := '1 parrainage validé — 24h boost';
  END IF;

  -- Prolonger boost existant si déjà actif, sinon partir de maintenant
  SELECT GREATEST(COALESCE(boost_until, now()), now()) + (v_boost_days || ' days')::interval
  INTO v_until FROM profiles WHERE id = p_referrer_id;

  UPDATE profiles
  SET boost_until  = v_until,
      boost_reason = v_reason
  WHERE id = p_referrer_id;
END;
$$;

-- 6. Trigger : valide automatiquement le parrainage quand le filleul
--    envoie son 1er message (preuve d'activité réelle)
CREATE OR REPLACE FUNCTION trg_validate_referral_on_first_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ref         referrals%ROWTYPE;
  v_score       int;
  v_new_count   int;
BEGIN
  -- Chercher un parrainage en attente pour ce sender
  SELECT * INTO v_ref
  FROM referrals
  WHERE referred_id = NEW.sender_id
    AND validated_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Vérifier score de complétion du filleul (≥ 80%)
  v_score := get_profile_completion_score(NEW.sender_id);
  IF v_score < 80 THEN RETURN NEW; END IF;

  -- Valider le parrainage
  UPDATE referrals
  SET validated_at      = now(),
      validation_reason = 'Premier message + score ' || v_score || '%',
      rewarded          = true
  WHERE id = v_ref.id;

  -- Incrémenter compteur validé du parrain (seulement les validés)
  UPDATE profiles
  SET referral_count = referral_count + 1
  WHERE id = v_ref.referrer_id
  RETURNING referral_count INTO v_new_count;

  -- Appliquer le boost au parrain
  PERFORM apply_referrer_boost(v_ref.referrer_id, v_new_count);

  -- Boost 48h au filleul aussi (double récompense)
  UPDATE profiles
  SET boost_until  = GREATEST(COALESCE(boost_until, now()), now()) + interval '48 hours',
      boost_reason = 'Filleul actif — 48h boost de bienvenue'
  WHERE id = NEW.sender_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_referral_on_first_message ON messages;
CREATE TRIGGER trg_validate_referral_on_first_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION trg_validate_referral_on_first_message();

-- 7. RLS : permettre lecture boost_until en public (pour tri découverte)
-- (déjà couvert par la policy select existante sur profiles)

-- 8. Backfill : marquer les anciens parrainages existants comme validés
--    (migration douce — on ne pénalise pas les anciens utilisateurs)
UPDATE referrals
SET validated_at      = created_at,
    validation_reason = 'Backfill migration — anciens parrainages',
    rewarded          = true
WHERE validated_at IS NULL
  AND rewarded = true;
