
-- 1. Ajouter colonne pseudo sur profiles (identifiant unique visible)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pseudo TEXT DEFAULT '';

-- 2. Contrainte UNIQUE sur le pseudo (insensible à la casse via index partiel)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_pseudo_unique
  ON public.profiles (lower(pseudo))
  WHERE pseudo <> '';

-- 3. Fonction RPC pour vérifier disponibilité pseudo (appelée en temps réel)
CREATE OR REPLACE FUNCTION public.check_pseudo_available(p_pseudo TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean TEXT := lower(trim(p_pseudo));
  v_count INT;
BEGIN
  IF length(v_clean) < 3 THEN RETURN FALSE; END IF;
  SELECT COUNT(*) INTO v_count
  FROM public.profiles
  WHERE lower(pseudo) = v_clean;
  RETURN v_count = 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_pseudo_available(TEXT) TO anon, authenticated;
