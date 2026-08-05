
-- ══════════════════════════════════════════════════════════
-- Migration 055 — Realtime notifications + likes + REPLICA IDENTITY
-- messages et matches sont déjà dans supabase_realtime
-- ══════════════════════════════════════════════════════════

-- Activer Realtime sur les tables manquantes
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE likes;

-- REPLICA IDENTITY FULL pour envoyer les données complètes dans les events
ALTER TABLE messages      REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE matches       REPLICA IDENTITY FULL;
ALTER TABLE likes         REPLICA IDENTITY FULL;

-- RPC chat meta — remplace N+1 (lastMsg + unread en une seule query par match)
CREATE OR REPLACE FUNCTION get_matches_meta(p_user_id uuid)
RETURNS TABLE (
  match_id     uuid,
  last_content text,
  last_at      timestamptz,
  last_sender  uuid,
  unread_count bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    m.id          AS match_id,
    lm.content    AS last_content,
    lm.created_at AS last_at,
    lm.sender_id  AS last_sender,
    COALESCE(u.cnt, 0) AS unread_count
  FROM matches m
  LEFT JOIN LATERAL (
    SELECT content, created_at, sender_id
    FROM messages
    WHERE match_id = m.id
    ORDER BY created_at DESC
    LIMIT 1
  ) lm ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt
    FROM messages
    WHERE match_id = m.id
      AND sender_id <> p_user_id
      AND read_at IS NULL
  ) u ON true
  WHERE m.user1_id = p_user_id OR m.user2_id = p_user_id;
$$;
