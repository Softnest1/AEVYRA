
-- ============================================================
-- RPC 1 : verify_security_phrase
-- Vérifie que le pseudo + phrase correspondent à un profil réel
-- Retourne TRUE si ok, FALSE sinon (pas d'info sur l'existence)
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_security_phrase(
  p_pseudo TEXT,
  p_phrase TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email  TEXT;
  v_user_id UUID;
  v_phrase TEXT;
BEGIN
  v_email := lower(trim(p_pseudo)) || '@miaoda.com';

  -- Trouver l'utilisateur via auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Vérifier la phrase de sécurité dans profiles
  SELECT security_phrase INTO v_phrase
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_phrase IS NULL OR trim(v_phrase) = '' THEN
    RETURN FALSE;
  END IF;

  RETURN lower(trim(v_phrase)) = lower(trim(p_phrase));
END;
$$;

-- ============================================================
-- RPC 2 : get_reset_token
-- Génère un mot de passe temporaire aléatoire, le définit sur
-- le compte, et le retourne pour que le client puisse se connecter
-- temporairement et changer le mot de passe via updateUser.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_reset_token(
  p_pseudo TEXT,
  p_phrase TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email     TEXT;
  v_user_id   UUID;
  v_phrase    TEXT;
  v_token     TEXT;
BEGIN
  v_email := lower(trim(p_pseudo)) || '@miaoda.com';

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT security_phrase INTO v_phrase
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_phrase IS NULL OR trim(v_phrase) = '' THEN
    RETURN NULL;
  END IF;

  IF lower(trim(v_phrase)) <> lower(trim(p_phrase)) THEN
    RETURN NULL;
  END IF;

  -- Générer un token temporaire unique (32 chars hex)
  v_token := encode(gen_random_bytes(16), 'hex');

  -- Mettre à jour le mot de passe temporairement
  UPDATE auth.users
  SET encrypted_password = crypt(v_token, gen_salt('bf'))
  WHERE id = v_user_id;

  RETURN v_token;
END;
$$;

-- Accès public pour les utilisateurs non connectés (reset flow)
GRANT EXECUTE ON FUNCTION public.verify_security_phrase(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_reset_token(TEXT, TEXT) TO anon, authenticated;
