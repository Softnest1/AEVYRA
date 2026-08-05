-- ═══════════════════════════════════════════════════════════
-- MATCHING — Index manquants + vues optimisées
-- Résout: scans full-table sur likes/dislikes/matches/messages
-- ═══════════════════════════════════════════════════════════

-- 1. Index matches (lookup bidirectionnel rapide)
CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user2_id);
-- Index composite pour le lookup u1+u2 (getOrCreateConversation, sendLike)
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_pair ON matches(user1_id, user2_id);

-- 2. Index likes (sendLike + check réciproque)
CREATE INDEX IF NOT EXISTS idx_likes_from     ON likes(from_user_id);
CREATE INDEX IF NOT EXISTS idx_likes_to       ON likes(to_user_id);
CREATE INDEX IF NOT EXISTS idx_likes_from_to  ON likes(from_user_id, to_user_id);

-- 3. Index dislikes (cutoff 30j — getProfilesForConstellation)
CREATE INDEX IF NOT EXISTS idx_dislikes_from_date ON dislikes(from_user_id, created_at DESC);

-- 4. Index messages (tri + quota par match+sender+date)
CREATE INDEX IF NOT EXISTS idx_messages_match_created ON messages(match_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_match_sender  ON messages(match_id, sender_id, created_at);

-- 5. Index connections (lookup bidirectionnel)
CREATE INDEX IF NOT EXISTS idx_connections_from ON connections(from_user_id);
CREATE INDEX IF NOT EXISTS idx_connections_to   ON connections(to_user_id);

-- 6. RPC : dernier message d'un match (pour trier les matches par activité récente)
CREATE OR REPLACE FUNCTION public.get_matches_with_last_activity(p_user_id UUID)
RETURNS TABLE(
  match_id        UUID,
  partner_id      UUID,
  compatibilite   INTEGER,
  match_created   TIMESTAMPTZ,
  last_msg_at     TIMESTAMPTZ,
  last_msg_preview TEXT,
  unread_count    INTEGER,
  source          TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH my_matches AS (
    SELECT
      m.id                                                        AS match_id,
      CASE WHEN m.user1_id = p_user_id THEN m.user2_id
           ELSE m.user1_id END                                    AS partner_id,
      m.compatibilite,
      m.created_at                                                AS match_created,
      'match'::TEXT                                               AS source
    FROM matches m
    WHERE m.user1_id = p_user_id OR m.user2_id = p_user_id
    UNION ALL
    SELECT
      c.id,
      CASE WHEN c.from_user_id = p_user_id THEN c.to_user_id
           ELSE c.from_user_id END,
      70,
      c.created_at,
      'connection'::TEXT
    FROM connections c
    WHERE (c.from_user_id = p_user_id OR c.to_user_id = p_user_id)
      AND c.status = 'accepted'
  ),
  last_msgs AS (
    SELECT DISTINCT ON (msg.match_id)
      msg.match_id,
      msg.created_at  AS last_msg_at,
      LEFT(msg.content, 80) AS last_msg_preview
    FROM messages msg
    WHERE msg.match_id IN (SELECT match_id FROM my_matches)
    ORDER BY msg.match_id, msg.created_at DESC
  ),
  unread AS (
    SELECT
      msg.match_id,
      COUNT(*)::INTEGER AS unread_count
    FROM messages msg
    WHERE msg.match_id IN (SELECT match_id FROM my_matches)
      AND msg.sender_id <> p_user_id
      AND msg.read_at IS NULL
    GROUP BY msg.match_id
  )
  SELECT
    mm.match_id,
    mm.partner_id,
    mm.compatibilite,
    mm.match_created,
    COALESCE(lm.last_msg_at, mm.match_created)  AS last_msg_at,
    COALESCE(lm.last_msg_preview, '')            AS last_msg_preview,
    COALESCE(u.unread_count, 0)                  AS unread_count,
    mm.source
  FROM my_matches mm
  LEFT JOIN last_msgs lm ON lm.match_id = mm.match_id
  LEFT JOIN unread u     ON u.match_id  = mm.match_id
  ORDER BY last_msg_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_matches_with_last_activity(UUID) TO authenticated;
