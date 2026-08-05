
-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION DB POWER — Indexes + search_path + Crons + RLS + Contraintes
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── PARTIE 1 : INDEX MANQUANTS CRITIQUES ────────────────────────────────────

-- Bannissement : lookup rapide is_banned
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned
  ON public.profiles (is_banned)
  WHERE is_banned = true;

-- Matchmaking : cherche + genre ensemble (requête hot page home)
CREATE INDEX IF NOT EXISTS idx_profiles_cherche_genre
  ON public.profiles (cherche, genre)
  WHERE inscription_complete = true AND is_banned = false;

-- Profils actifs compound (matchmaking complet)
CREATE INDEX IF NOT EXISTS idx_profiles_matchmaking
  ON public.profiles (inscription_complete, is_banned, genre, cherche)
  WHERE inscription_complete = true AND is_banned = false;

-- Likes récents (missions cosmic_kindness + home)
CREATE INDEX IF NOT EXISTS idx_likes_created_at
  ON public.likes (from_user_id, created_at DESC);

-- Messages non lus — read_at IS NULL
CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON public.messages (match_id, read_at)
  WHERE read_at IS NULL;

-- Admin logs chronologiques
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at
  ON public.admin_logs (created_at DESC);

-- Admin logs par opérateur
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id
  ON public.admin_logs (admin_id, created_at DESC);

-- Connections depuis un user
CREATE INDEX IF NOT EXISTS idx_connections_from_user
  ON public.connections (from_user_id, status);

-- Suppression index doublons notifications
DROP INDEX IF EXISTS idx_notifs_unread;
DROP INDEX IF EXISTS idx_notifs_user_date;

-- ─── PARTIE 2 : search_path SÉCURISÉ (faille injection schema) ───────────────

ALTER FUNCTION public.append_ice_candidate SET search_path = public;
ALTER FUNCTION public.apply_referrer_boost SET search_path = public;
ALTER FUNCTION public.check_auto_suspension SET search_path = public;
ALTER FUNCTION public.enforce_age_minimum SET search_path = public;
ALTER FUNCTION public.get_app_stats SET search_path = public;
ALTER FUNCTION public.get_matches_meta SET search_path = public;
ALTER FUNCTION public.get_matches_this_month SET search_path = public;
ALTER FUNCTION public.get_profile_completion_score SET search_path = public;
ALTER FUNCTION public.is_admin SET search_path = public;
ALTER FUNCTION public.is_member_since_days SET search_path = public;
ALTER FUNCTION public.is_super_admin SET search_path = public;
ALTER FUNCTION public.notify_on_connection_accepted SET search_path = public;
ALTER FUNCTION public.notify_on_connection_request SET search_path = public;
ALTER FUNCTION public.notify_on_match SET search_path = public;
ALTER FUNCTION public.notify_on_message SET search_path = public;
ALTER FUNCTION public.purge_old_notifications SET search_path = public;
ALTER FUNCTION public.refresh_stats_publiques SET search_path = public;
ALTER FUNCTION public.trg_validate_referral_on_first_message SET search_path = public;

-- ─── PARTIE 3 : RLS sur testimonials (table non protégée) ────────────────────

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "testimonials_public_read" ON public.testimonials;
CREATE POLICY "testimonials_public_read"
  ON public.testimonials FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "testimonials_admin_all" ON public.testimonials;
CREATE POLICY "testimonials_admin_all"
  ON public.testimonials FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── PARTIE 4 : CRONS automatiques ───────────────────────────────────────────

-- Purge notifications lues > 30 jours (nuit à 3h)
SELECT cron.schedule(
  'purge-old-notifications-nightly',
  '0 3 * * *',
  $$SELECT public.purge_old_notifications()$$
);

-- Refresh stats publiques (toutes les heures à H+30)
SELECT cron.schedule(
  'refresh-stats-publiques-hourly',
  '30 * * * *',
  $$SELECT public.refresh_stats_publiques()$$
);

-- ─── PARTIE 5 : CONTRAINTES d'intégrité ──────────────────────────────────────

-- age >= 18 (double verrou DB)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_age_minimum,
  ADD CONSTRAINT profiles_age_minimum
    CHECK (age = 0 OR age >= 18);

-- sanctions: mission_progress borné
ALTER TABLE public.sanctions
  DROP CONSTRAINT IF EXISTS sanctions_progress_bounds,
  ADD CONSTRAINT sanctions_progress_bounds
    CHECK (
      mission_progress >= 0
      AND (mission_target IS NULL OR mission_progress <= mission_target)
    );

-- ─── PARTIE 6 : ANALYZE ──────────────────────────────────────────────────────
ANALYZE public.profiles;
ANALYZE public.likes;
ANALYZE public.matches;
ANALYZE public.messages;
ANALYZE public.notifications;
ANALYZE public.sanctions;
ANALYZE public.connections;
