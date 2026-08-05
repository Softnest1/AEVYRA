
-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION SCALABILITÉ 200K — Index feed + dislikes + likes + connexions
-- ══════════════════════════════════════════════════════════════════════════════

-- Feed principal : ORDER BY boost_until DESC, created_at DESC avec filtres partiels
CREATE INDEX IF NOT EXISTS idx_profiles_feed_order
  ON public.profiles (boost_until DESC NULLS LAST, created_at DESC)
  WHERE inscription_complete = true AND is_banned = false;

-- Dislikes : lookup from_user_id + created_at (filtre 30 jours)
CREATE INDEX IF NOT EXISTS idx_dislikes_from_user_created
  ON public.dislikes (from_user_id, created_at DESC);

-- Likes : exclusion feed (from_user_id → to_user_id)
CREATE INDEX IF NOT EXISTS idx_likes_from_to
  ON public.likes (from_user_id, to_user_id);

-- Blocks : exclusion feed (blocker_id → blocked_id)
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_blocked
  ON public.blocks (blocker_id, blocked_id);

-- Matches : chargement boîte de réception
CREATE INDEX IF NOT EXISTS idx_matches_users
  ON public.matches (user1_id, created_at DESC);

-- Messages : pagination par match (curseur created_at)
CREATE INDEX IF NOT EXISTS idx_messages_match_cursor
  ON public.messages (match_id, created_at DESC);

-- Notifications : non-lues par user (is_read = false)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE is_read = false;

-- Profiles recherche prénom+pseudo
CREATE INDEX IF NOT EXISTS idx_profiles_prenom_pseudo
  ON public.profiles (prenom, pseudo)
  WHERE inscription_complete = true;
