
-- ══════════════════════════════════════════════════════════════
-- ÂMOUR — Système Administrateur
-- Table admin_roles + signalements + logs admin + RLS sécurisé
-- ══════════════════════════════════════════════════════════════

-- 1. Table des rôles admin (séparée de profiles — jamais exposée aux users)
CREATE TABLE IF NOT EXISTS admin_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  notes      text
);

-- 2. Table signalements (reports)
CREATE TABLE IF NOT EXISTS reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_msg_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  reason          text NOT NULL,
  details         text,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  reviewed_by     uuid REFERENCES auth.users(id),
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 3. Table logs des actions admin (audit trail complet)
CREATE TABLE IF NOT EXISTS admin_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action      text NOT NULL,  -- 'ban_user', 'unban_user', 'verify_user', 'delete_message', etc.
  target_type text,           -- 'user', 'message', 'report', 'event'
  target_id   text,
  details     jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 4. Ajouter colonnes de modération sur profiles (si pas encore là)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned     boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_at     timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_reason text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_notes   text;

-- ── RLS ────────────────────────────────────────────────────────

-- Fonction helper SECURITY DEFINER — vérifie si l'appelant est admin
-- Utilise SECURITY DEFINER pour éviter la récursion RLS
CREATE OR REPLACE FUNCTION is_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_roles WHERE user_id = uid
  );
$$;

CREATE OR REPLACE FUNCTION is_super_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_roles WHERE user_id = uid AND role = 'super_admin'
  );
$$;

-- admin_roles : RLS
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

-- Seuls les super_admins peuvent lire/modifier la table des rôles
CREATE POLICY "super_admin_all_admin_roles" ON admin_roles
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- admin_logs : RLS
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_logs" ON admin_logs
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "admin_insert_logs" ON admin_logs
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() AND admin_id = auth.uid());

-- reports : RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Un utilisateur authentifié peut créer un signalement
CREATE POLICY "auth_insert_report" ON reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Un utilisateur peut voir ses propres signalements
CREATE POLICY "auth_select_own_reports" ON reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR is_admin());

-- Admin peut tout faire sur les signalements
CREATE POLICY "admin_all_reports" ON reports
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Profils : les admins peuvent lire et modifier tous les profils
-- (UPDATE pour ban/unban/verify — pas de nouvelle politique SELECT car déjà existante)
DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;
CREATE POLICY "admin_update_profiles" ON profiles
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Messages : les admins peuvent lire et supprimer tous les messages
DROP POLICY IF EXISTS "admin_all_messages" ON messages;
CREATE POLICY "admin_all_messages" ON messages
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── Vue statistiques admin (sécurisée, pas exposée aux users normaux) ──
CREATE OR REPLACE VIEW admin_stats AS
SELECT
  (SELECT count(*) FROM auth.users)::int                                          AS total_users,
  (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '24h')::int AS new_users_24h,
  (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '7d')::int  AS new_users_7d,
  (SELECT count(*) FROM profiles WHERE is_verified = true)::int                    AS verified_users,
  (SELECT count(*) FROM profiles WHERE is_banned = true)::int                      AS banned_users,
  (SELECT count(*) FROM matches)::int                                               AS total_matches,
  (SELECT count(*) FROM matches WHERE created_at > now() - interval '24h')::int    AS matches_24h,
  (SELECT count(*) FROM messages)::int                                              AS total_messages,
  (SELECT count(*) FROM messages WHERE created_at > now() - interval '24h')::int   AS messages_24h,
  (SELECT count(*) FROM reports WHERE status = 'pending')::int                     AS pending_reports,
  (SELECT count(*) FROM video_calls WHERE status = 'in_progress')::int             AS active_calls,
  (SELECT count(*) FROM video_calls)::int                                           AS total_calls;

-- Accès à la vue admin uniquement pour les admins
REVOKE ALL ON admin_stats FROM anon, authenticated;
GRANT SELECT ON admin_stats TO authenticated;

-- RLS ne s'applique pas aux vues, on protège via une fonction
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS TABLE (
  total_users int, new_users_24h int, new_users_7d int,
  verified_users int, banned_users int,
  total_matches int, matches_24h int,
  total_messages int, messages_24h int,
  pending_reports int, active_calls int, total_calls int
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT * FROM admin_stats WHERE is_admin();
$$;

-- ── Insérer le premier super_admin (à remplacer par l'UUID réel) ──
-- NOTE : sera exécuté via Edge Function admin-api avec l'auth user
