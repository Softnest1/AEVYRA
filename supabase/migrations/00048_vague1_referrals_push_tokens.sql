
-- ── Vague 1 : Parrainage + Push Tokens ─────────────────────────────────────

-- 1. Colonnes parrainage sur profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code   text UNIQUE,
  ADD COLUMN IF NOT EXISTS referral_count  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS premium_until   timestamptz,
  ADD COLUMN IF NOT EXISTS premium_frames  text[] NOT NULL DEFAULT '{}';

-- 2. Table des parrainages
CREATE TABLE IF NOT EXISTS referrals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code          text NOT NULL,
  rewarded      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referred_id) -- un invité ne peut utiliser qu'un seul code
);

-- 3. Table push tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token      text NOT NULL,
  platform   text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

-- 4. RLS referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_select_own" ON referrals
  FOR SELECT USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE POLICY "referrals_insert_self" ON referrals
  FOR INSERT WITH CHECK (referred_id = auth.uid());

-- 5. RLS push_tokens
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_tokens_manage_own" ON push_tokens
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 6. Génération automatique de referral_code à l'inscription
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  new_code text;
  collision boolean := true;
BEGIN
  WHILE collision LOOP
    new_code := 'AEVYRA-' || upper(substring(md5(NEW.id::text || random()::text), 1, 6));
    collision := EXISTS (SELECT 1 FROM profiles WHERE referral_code = new_code);
  END LOOP;
  NEW.referral_code := new_code;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_code ON profiles;
CREATE TRIGGER trg_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION generate_referral_code();

-- 7. Backfill codes manquants pour profils existants
DO $$
DECLARE
  rec record;
  new_code text;
  collision boolean;
BEGIN
  FOR rec IN SELECT id FROM profiles WHERE referral_code IS NULL LOOP
    collision := true;
    WHILE collision LOOP
      new_code := 'AEVYRA-' || upper(substring(md5(rec.id::text || random()::text), 1, 6));
      collision := EXISTS (SELECT 1 FROM profiles WHERE referral_code = new_code);
    END LOOP;
    UPDATE profiles SET referral_code = new_code WHERE id = rec.id;
  END LOOP;
END;
$$;
