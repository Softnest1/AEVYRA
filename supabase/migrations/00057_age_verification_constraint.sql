
-- ════════════════════════════════════════════════════════════════
-- SÉCURITÉ ÂGE : Triple verrou base de données
-- Empêche tout contournement client d'inscrire un mineur
-- ════════════════════════════════════════════════════════════════

-- 1. Contrainte CHECK sur la table profiles
--    Bloque tout INSERT ou UPDATE si age < 18 ou date < 18 ans révolus
ALTER TABLE profiles
  ADD CONSTRAINT chk_age_minimum
    CHECK (age >= 18),
  ADD CONSTRAINT chk_date_naissance_minimum
    CHECK (
      date_naissance IS NULL OR
      date_naissance <= (CURRENT_DATE - INTERVAL '18 years')
    );

-- 2. Trigger BEFORE INSERT/UPDATE — recalcule et vérifie l'âge depuis la date
--    (ne fait pas confiance au champ `age` envoyé par le client)
CREATE OR REPLACE FUNCTION public.enforce_age_minimum()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_age INTEGER;
BEGIN
  -- Calculer l'âge exact depuis la date de naissance
  IF NEW.date_naissance IS NOT NULL THEN
    v_age := DATE_PART('year', AGE(CURRENT_DATE, NEW.date_naissance));

    -- Bloquer si moins de 18 ans
    IF v_age < 18 THEN
      RAISE EXCEPTION 'MINEUR_DETECTE: Inscription refusée — âge minimum 18 ans requis (âge calculé: % ans)', v_age
        USING ERRCODE = 'P0001';
    END IF;

    -- Synchroniser le champ age avec la valeur calculée (pas celle envoyée par le client)
    NEW.age := v_age;
  END IF;

  RETURN NEW;
END;
$$;

-- Attacher le trigger sur INSERT et UPDATE
DROP TRIGGER IF EXISTS trg_enforce_age_minimum ON profiles;
CREATE TRIGGER trg_enforce_age_minimum
  BEFORE INSERT OR UPDATE OF date_naissance, age
  ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_age_minimum();

-- 3. Index pour recherche rapide par date de naissance (audit admin)
CREATE INDEX IF NOT EXISTS idx_profiles_date_naissance ON profiles (date_naissance);
