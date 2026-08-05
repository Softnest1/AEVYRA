-- Colonne d'acceptation des CGU — obligatoire pour les stores (Google Play / Apple / Microsoft)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cgu_accepted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.profiles.cgu_accepted_at IS
  'Horodatage de l''acceptation des CGU et politique de confidentialité. NULL = pas encore accepté.';
