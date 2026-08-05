-- RPC feed anti-join scalable — remplace NOT IN(500 IDs) côté client
CREATE OR REPLACE FUNCTION public.get_feed_candidates(
  p_user_id UUID,
  p_genre   TEXT,
  p_cherche TEXT,
  p_limit   INTEGER DEFAULT 60,
  p_offset  INTEGER DEFAULT 0
)
RETURNS TABLE(
  id                   UUID,
  prenom               TEXT,
  pseudo               TEXT,
  photo_url            TEXT,
  bio                  TEXT,
  age                  INTEGER,
  genre                TEXT,
  cherche              TEXT,
  signe_astro          TEXT,
  ville                TEXT,
  score_fiabilite      INTEGER,
  photo_verified       BOOLEAN,
  boost_until          TIMESTAMPTZ,
  is_mystery           BOOLEAN,
  inscription_complete BOOLEAN,
  created_at           TIMESTAMPTZ,
  date_naissance       DATE,
  energie_romantique   TEXT,
  reve_duo             TEXT,
  style_amour          TEXT,
  moment_prefere       TEXT,
  empreinte_couleur    TEXT,
  ascendant            TEXT,
  planete_dominante    TEXT,
  element_astrologique TEXT,
  cadre_id             TEXT,
  premium_until        TIMESTAMPTZ,
  latitude             DOUBLE PRECISION,
  longitude            DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.prenom, p.pseudo, p.photo_url, p.bio,
    p.age, p.genre, p.cherche, p.signe_astro, p.ville,
    p.score_fiabilite, p.photo_verified, p.boost_until,
    p.is_mystery, p.inscription_complete, p.created_at,
    p.date_naissance, p.energie_romantique, p.reve_duo,
    p.style_amour, p.moment_prefere, p.empreinte_couleur,
    p.ascendant, p.planete_dominante, p.element_astrologique,
    p.cadre_id::TEXT, p.premium_until,
    p.latitude, p.longitude
  FROM profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM likes l
    WHERE l.from_user_id = p_user_id AND l.to_user_id = p.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM dislikes d
    WHERE d.from_user_id = p_user_id
      AND d.to_user_id   = p.id
      AND d.created_at   > NOW() - INTERVAL '30 days'
  )
  AND NOT EXISTS (
    SELECT 1 FROM blocks b
    WHERE b.blocker_id = p_user_id AND b.blocked_id = p.id
  )
  AND p.id <> p_user_id
  AND p.inscription_complete = true
  AND p.is_banned = false
  AND (p_cherche IS NULL OR p_cherche IN ('une_ame','les_deux','')
       OR p.genre = p_cherche)
  AND (p.cherche IS NULL OR p.cherche IN ('une_ame','les_deux','')
       OR p.cherche = p_genre)
  ORDER BY
    CASE WHEN p.boost_until > NOW() THEN 0 ELSE 1 END,
    CASE WHEN p.photo_verified = true THEN 0 ELSE 1 END,
    p.created_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_feed_candidates(UUID, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;

-- Cleanup likes non matchés > 6 mois (appelable manuellement ou via pg_cron)
CREATE OR REPLACE FUNCTION public.cleanup_old_unmatched_likes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM likes l
  WHERE l.created_at < NOW() - INTERVAL '6 months'
    AND NOT EXISTS (
      SELECT 1 FROM matches m
      WHERE (m.user1_id = l.from_user_id AND m.user2_id = l.to_user_id)
         OR (m.user1_id = l.to_user_id   AND m.user2_id = l.from_user_id)
    );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.cleanup_old_unmatched_likes() TO authenticated;
