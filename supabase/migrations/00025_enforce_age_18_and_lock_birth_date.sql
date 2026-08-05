-- ============================================================
-- Verrouillage date de naissance + vérification âge minimum 18 ans
-- ============================================================

-- 1. CHECK DB : age doit être >= 18 si renseigné (défense en profondeur)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_age_minimum;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_age_minimum
  CHECK (age IS NULL OR age >= 18);

-- 2. CHECK DB : date_naissance doit correspondre à 18+ ans minimum
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_date_naissance_minimum;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_date_naissance_minimum
  CHECK (
    date_naissance IS NULL
    OR date_naissance <= (CURRENT_DATE - INTERVAL '18 years')
  );

-- 3. Trigger : verrouille date_naissance après inscription complète
--    (inscription_complete = TRUE → la date ne peut plus jamais changer)
CREATE OR REPLACE FUNCTION public.lock_birth_date_after_inscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si l'inscription est déjà complète et que date_naissance change → bloquer
  IF OLD.inscription_complete = TRUE
     AND NEW.date_naissance IS DISTINCT FROM OLD.date_naissance THEN
    RAISE EXCEPTION 'La date de naissance ne peut pas être modifiée après inscription.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_lock_birth_date ON public.profiles;
CREATE TRIGGER trig_lock_birth_date
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.lock_birth_date_after_inscription();