
-- ============================================================
-- BUGFIX : connections RLS roles=public → authenticated
-- ============================================================
DROP POLICY IF EXISTS "Envoyer une demande"     ON public.connections;
DROP POLICY IF EXISTS "Répondre à une demande"  ON public.connections;
DROP POLICY IF EXISTS "Voir ses connexions"     ON public.connections;

CREATE POLICY "connections_select_own" ON public.connections
  FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "connections_insert_own" ON public.connections
  FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "connections_update_own" ON public.connections
  FOR UPDATE TO authenticated
  USING (to_user_id = auth.uid() OR from_user_id = auth.uid());

CREATE POLICY "connections_delete_own" ON public.connections
  FOR DELETE TO authenticated
  USING (from_user_id = auth.uid());

-- ============================================================
-- BUGFIX : notifications RLS roles=public → authenticated
-- ============================================================
DROP POLICY IF EXISTS "Notifs créées par système"              ON public.notifications;
DROP POLICY IF EXISTS "Notifs mises à jour par l'utilisateur" ON public.notifications;
DROP POLICY IF EXISTS "Notifs visibles par l'utilisateur"     ON public.notifications;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- INSERT reste ouvert au service_role (système) — pas de policy INSERT authenticated
-- pour permettre les triggers de notification
CREATE POLICY "notifications_insert_system" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
