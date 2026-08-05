
-- Corriger get_email_by_phrase : SECURITY DEFINER pour accès auth.users
-- Sans SECURITY DEFINER, la RPC s'exécute avec les droits de l'appelant (anon)
-- qui ne peut pas lire auth.users → retourne toujours NULL → "phrase incorrecte"
CREATE OR REPLACE FUNCTION public.get_email_by_phrase(
  p_pseudo TEXT,
  p_phrase TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_email   TEXT;
BEGIN
  p_pseudo := lower(regexp_replace(trim(p_pseudo), '[^a-z0-9_]', '', 'g'));

  -- Trouver l'utilisateur par pseudo + phrase (comparaison insensible à la casse)
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE pseudo = p_pseudo
    AND lower(trim(security_phrase)) = lower(trim(p_phrase))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Récupérer l'email interne (auth.users) — nécessite SECURITY DEFINER
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_user_id
  LIMIT 1;

  RETURN v_email;
END;
$$;

-- Vérification
SELECT proname, prosecdef AS security_definer, proconfig
FROM pg_proc WHERE proname = 'get_email_by_phrase';
