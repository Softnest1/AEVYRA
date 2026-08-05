
-- ============================================================
-- Correction critique : domaine email interne miaoda.com → amour-app.fr
-- Les utilisateurs sont créés avec pseudo@amour-app.fr (register.tsx)
-- Les fonctions SQL utilisaient @miaoda.com → incohérence totale
-- ============================================================

-- RPC 1 : verify_security_phrase — corrigé
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
  v_email := lower(trim(p_pseudo)) || '@amour-app.fr';

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT security_phrase INTO v_phrase
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_phrase IS NULL OR trim(v_phrase) = '' THEN
    RETURN FALSE;
  END IF;

  RETURN lower(trim(v_phrase)) = lower(trim(p_phrase));
END;
$$;

-- RPC 2 : get_reset_token — corrigé
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
  v_email := lower(trim(p_pseudo)) || '@amour-app.fr';

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

  v_token := encode(gen_random_bytes(16), 'hex');

  UPDATE auth.users
  SET encrypted_password = crypt(v_token, gen_salt('bf'))
  WHERE id = v_user_id;

  RETURN v_token;
END;
$$;

-- RPC 3 : get_email_by_phrase — corrigé
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
  p_pseudo := lower(regexp_replace(trim(p_pseudo), '[^a-z0-9_]', '', 'g'));

  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE pseudo = p_pseudo
    AND lower(trim(security_phrase)) = lower(trim(p_phrase))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_user_id
  LIMIT 1;

  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_security_phrase(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_reset_token(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_phrase(TEXT, TEXT) TO anon, authenticated;
