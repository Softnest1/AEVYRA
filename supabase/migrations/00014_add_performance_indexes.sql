
-- Index critiques pour les flux réels (requêtes les plus fréquentes)

-- likes : recherche par destinataire (getReceivedLikes, check match mutuel)
CREATE INDEX IF NOT EXISTS idx_likes_to_user_id      ON public.likes(to_user_id);
CREATE INDEX IF NOT EXISTS idx_likes_from_user_id    ON public.likes(from_user_id);

-- matches : recherche par user1 ou user2
CREATE INDEX IF NOT EXISTS idx_matches_user1         ON public.matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2         ON public.matches(user2_id);

-- messages : chargement d'une conversation par match + ordre chronologique
CREATE INDEX IF NOT EXISTS idx_messages_match_id     ON public.messages(match_id, created_at);

-- notifications : toutes les notifs d'un user triées par date
CREATE INDEX IF NOT EXISTS idx_notifs_user_date      ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifs_unread         ON public.notifications(user_id, is_read) WHERE is_read = false;

-- profiles : constellation (inscription_complete = true)
CREATE INDEX IF NOT EXISTS idx_profiles_complete     ON public.profiles(inscription_complete) WHERE inscription_complete = true;

-- connections : recherche bidirectionnelle
CREATE INDEX IF NOT EXISTS idx_connections_to_user   ON public.connections(to_user_id);

-- favoris : liste des favoris d'un user
CREATE INDEX IF NOT EXISTS idx_favoris_user_id       ON public.favoris(user_id);
