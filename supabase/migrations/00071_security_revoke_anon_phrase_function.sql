
-- Sécurité : retirer l'accès anonyme à get_email_by_phrase
-- Un appelant non authentifié ne doit jamais pouvoir énumérer des emails internes
-- via la phrase de sécurité. Seuls les utilisateurs authentifiés sont autorisés.
REVOKE EXECUTE ON FUNCTION public.get_email_by_phrase(TEXT, TEXT) FROM anon;

-- Idem pour les fonctions de réinitialisation liées
REVOKE EXECUTE ON FUNCTION public.verify_security_phrase(TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_reset_token(TEXT, TEXT) FROM anon;

-- Confirmer les grants authenticated (idempotent)
GRANT EXECUTE ON FUNCTION public.get_email_by_phrase(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_security_phrase(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_reset_token(TEXT, TEXT) TO authenticated;
