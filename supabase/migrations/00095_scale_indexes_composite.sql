-- Index composites scalabilité 500K–1M users
CREATE INDEX IF NOT EXISTS idx_profiles_feed
  ON profiles(inscription_complete, genre, cherche, boost_until DESC NULLS LAST)
  WHERE inscription_complete = true AND is_banned = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_pair
  ON likes(from_user_id, to_user_id);

CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON messages(match_id, sender_id, read_at)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_matches_user1_created
  ON matches(user1_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_matches_user2_created
  ON matches(user2_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_connections_accepted
  ON connections(from_user_id, to_user_id)
  WHERE status = 'accepted';

CREATE INDEX IF NOT EXISTS idx_dislikes_antijoin
  ON dislikes(from_user_id, to_user_id, created_at DESC);
