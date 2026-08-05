-- Politique DELETE manquante sur notifications
DROP POLICY IF EXISTS "Notifs supprimées par l'utilisateur" ON notifications;
CREATE POLICY "Notifs supprimées par l'utilisateur"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());
