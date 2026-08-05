
-- 1. Supprimer la policy SELECT redondante sur reports (doublon de reports_select_own_or_admin)
DROP POLICY IF EXISTS "reports_select_own" ON reports;

-- 2. notifications INSERT : with_check=false bloque les Edge Functions (triggers server-side)
-- Remplacer par une policy qui autorise le service_role (triggers) à insérer
DROP POLICY IF EXISTS "notifications_insert_system" ON notifications;
CREATE POLICY "notifications_insert_system" ON notifications
  FOR INSERT WITH CHECK (
    (auth.uid() IS NULL)  -- service_role / triggers (pas de JWT)
    OR (user_id = auth.uid())  -- insert direct par l'utilisateur lui-même (cas UI)
  );
