
-- ══════════════════════════════════════════════════════════════════
-- Migration 053 — Réorganisation définitive : index manquants + RLS
-- Objectif : 0 doublon, 0 requête lente, 0 bug RLS silencieux
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Index FK manquants identifiés par audit ─────────────────

-- grace_requests.sanction_id (requêtes admin fréquentes)
CREATE INDEX IF NOT EXISTS idx_grace_requests_sanction_id
  ON public.grace_requests (sanction_id);

-- messages.sender_id (filtre par expéditeur, historique, suppression)
CREATE INDEX IF NOT EXISTS idx_messages_sender_id
  ON public.messages (sender_id);

-- referrals.referrer_id (tableau de bord parrainage, stats)
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id
  ON public.referrals (referrer_id);

-- temoignages.user_id (mon témoignage, suppression)
CREATE INDEX IF NOT EXISTS idx_temoignages_user_id
  ON public.temoignages (user_id);

-- ── 2. Index colonnes hot du feed principal (profiles) ─────────

-- signe_astro : filtre compatibilité astrologique (requête la plus fréquente)
CREATE INDEX IF NOT EXISTS idx_profiles_signe_astro
  ON public.profiles (signe_astro);

-- genre : filtre cherche/genre (toujours combiné avec inscription_complete)
CREATE INDEX IF NOT EXISTS idx_profiles_genre
  ON public.profiles (genre);

-- is_verified : badge vérification — filtré sur le feed
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified
  ON public.profiles (is_verified) WHERE is_verified = true;

-- notifications.user_id + is_read : lecture de la liste de notifs (tri DESC)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read
  ON public.notifications (user_id, is_read, created_at DESC);

-- messages.match_id + created_at : chat — curseur de pagination
CREATE INDEX IF NOT EXISTS idx_messages_match_created
  ON public.messages (match_id, created_at DESC);

-- matches.created_at : tri des matches par date (feed chat)
CREATE INDEX IF NOT EXISTS idx_matches_created_at
  ON public.matches (created_at DESC);

-- roman_content.created_at : fil littéraire trié par date
CREATE INDEX IF NOT EXISTS idx_roman_content_created
  ON public.roman_content (created_at DESC);

-- roman_likes.(content_id, user_id) : toggle like — lookup ultra fréquent
CREATE INDEX IF NOT EXISTS idx_roman_likes_content_user
  ON public.roman_likes (content_id, user_id);

-- ── 3. Supprimer la politique INSERT dupliquée sur reports ─────
-- reports a 2 politiques INSERT identiques : auth_insert_report + reports_insert_own
-- On supprime l'ancienne (auth_insert_report) pour ne garder que reports_insert_own

DROP POLICY IF EXISTS "auth_insert_report" ON public.reports;
DROP POLICY IF EXISTS "auth_select_own_reports" ON public.reports;

-- Recréer une politique SELECT unifiée propre
CREATE POLICY "reports_select_own_or_admin"
  ON public.reports FOR SELECT
  TO authenticated
  USING ((reporter_id = auth.uid()) OR is_admin());

-- ── 4. Fix daily_notif_log : role {public} → {authenticated} ──
-- daily_notif_log SELECT était sur role public (trop permissif)
DROP POLICY IF EXISTS "users_own_notif_log" ON public.daily_notif_log;

CREATE POLICY "users_own_notif_log"
  ON public.daily_notif_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Ajouter INSERT pour daily_notif_log (manquait — silencieusement bloqué sinon)
DROP POLICY IF EXISTS "users_insert_notif_log" ON public.daily_notif_log;
CREATE POLICY "users_insert_notif_log"
  ON public.daily_notif_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ── 5. Fix temoignages UPDATE manquant (UPDATE = silencieux sans policy) ─
DROP POLICY IF EXISTS "temoignages_update_own" ON public.temoignages;
CREATE POLICY "temoignages_update_own"
  ON public.temoignages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Ajouter admin SELECT sur temoignages
DROP POLICY IF EXISTS "temoignages_admin_all" ON public.temoignages;
CREATE POLICY "temoignages_admin_all"
  ON public.temoignages FOR ALL
  TO authenticated
  USING (is_admin());

-- ── 6. Fix sanctions : ajouter SELECT public (utile pour les listes perso) ─
-- Déjà couvert par user_read_own_sanction + admin_all_sanctions — OK

-- ── 7. Vérification finale : doublons résiduels ───────────────
-- (exécutée en dehors pour validation post-migration)
