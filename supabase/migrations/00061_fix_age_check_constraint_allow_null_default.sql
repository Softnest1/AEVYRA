
-- Le trigger handle_new_user insère uniquement l'id dans profiles.
-- age DEFAULT 0 viole CHECK (age >= 18) → "Database error saving new user"
-- Fix : permettre age NULL ou 0 lors de l'INSERT initial (le trigger enforce_age_minimum
-- recalcule l'age lors du UPDATE avec date_naissance)

-- 1. Supprimer les contraintes CHECK redondantes sur age
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS chk_age_minimum,
  DROP CONSTRAINT IF EXISTS profiles_age_minimum;

-- 2. Remettre age DEFAULT NULL (pas 0) pour que l'INSERT initial ne viole rien
ALTER TABLE profiles ALTER COLUMN age SET DEFAULT NULL;

-- 3. Ajouter une contrainte souple : age >= 18 seulement quand age IS NOT NULL
ALTER TABLE profiles
  ADD CONSTRAINT chk_age_minimum_soft CHECK (age IS NULL OR age >= 18);
