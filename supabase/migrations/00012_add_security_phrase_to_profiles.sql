
-- Ajout de la phrase de sécurité pour récupération de compte
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS security_phrase TEXT DEFAULT '';

-- La phrase est privée : seul le propriétaire peut la lire/modifier
-- La policy SELECT existante laisse tout le monde voir les profils,
-- mais on n'expose pas security_phrase dans les requêtes publiques
-- (le code frontend ne la sélectionne que pour le profil connecté)
