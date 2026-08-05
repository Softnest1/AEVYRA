-- Fonction SECURITY DEFINER : vérifie la phrase de sécurité
-- et retourne l'email interne du compte pour permettre la reconnexion.
-- Accessible par les utilisateurs anonymes (pas de session active).
-- Ne retourne RIEN si pseudo ou phrase incorrects (protection brute-force).
CREATE OR REPLACE FUNCTION public.get_email_by_phrase(
  p_pseudo TEXT,
  p_phrase  TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID;
  v_email     TEXT;
BEGIN
  -- Normaliser le pseudo (minuscules, caractères autorisés)
  p_pseudo := lower(regexp_replace(trim(p_pseudo), '[^a-z0-9_]', '', 'g'));

  -- Trouver l'utilisateur via son pseudo + phrase de sécurité (insensible à la casse, trimmed)
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE pseudo = p_pseudo
    AND lower(trim(security_phrase)) = lower(trim(p_phrase))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN NULL; -- Pseudo ou phrase incorrects
  END IF;

  -- Récupérer l'email interne (pseudo@miaoda.com) via auth.users
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_user_id
  LIMIT 1;

  RETURN v_email;
END;
$$;

-- Autoriser les utilisateurs anonymes à appeler cette fonction
GRANT EXECUTE ON FUNCTION public.get_email_by_phrase(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_phrase(TEXT, TEXT) TO authenticated;