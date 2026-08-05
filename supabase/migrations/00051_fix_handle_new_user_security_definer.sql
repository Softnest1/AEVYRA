
-- ══════════════════════════════════════════════════════════════════════════════
-- CORRECTIF : "Database error saving new user"
-- 
-- CAUSE : Le trigger handle_new_user() s'exécute en tant que `postgres`,
--         mais la RLS INSERT sur profiles exige `id = auth.uid()`.
--         Pendant le trigger, auth.uid() = NULL → INSERT bloqué → erreur Auth.
--
-- SOLUTION : SECURITY DEFINER sur la fonction trigger = bypass RLS autorisé.
--            + set search_path = public, auth pour sécurité.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Recréer handle_new_user avec SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. S'assurer que le trigger existe et est actif
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Ajouter policy service_role pour INSERT sans restriction
--    (couvre tout accès interne Supabase avec service_role key)
DROP POLICY IF EXISTS "service_role_insert_profiles" ON public.profiles;
CREATE POLICY "service_role_insert_profiles"
  ON public.profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 4. Vérification immédiate
SELECT 
  proname, 
  prosecdef AS security_definer,
  proconfig AS search_path_config
FROM pg_proc 
WHERE proname = 'handle_new_user';
