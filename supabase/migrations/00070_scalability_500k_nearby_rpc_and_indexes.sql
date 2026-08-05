
-- ════════════════════════════════════════════════════════════════
-- Migration scalabilité 500K — index géo + RPC haversine DB-side
-- ════════════════════════════════════════════════════════════════

-- 1. Index composite sur les profils géolocalisés
CREATE INDEX IF NOT EXISTS idx_profiles_location
  ON profiles (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 2. Index sur roman_likes(content_id)
CREATE INDEX IF NOT EXISTS idx_roman_likes_content_id
  ON roman_likes (content_id);

-- 3. Index sur roman_likes(user_id, content_id)
CREATE INDEX IF NOT EXISTS idx_roman_likes_user_content
  ON roman_likes (user_id, content_id);

-- 4. Index sur user_challenges(user_id, date_assigned)
CREATE INDEX IF NOT EXISTS idx_user_challenges_user_date
  ON user_challenges (user_id, date_assigned);

-- 5. Index partiel user_challenges non-complétés
CREATE INDEX IF NOT EXISTS idx_user_challenges_incomplete
  ON user_challenges (user_id, date_assigned, completed)
  WHERE completed = false;

-- 6. RPC haversine DB-side — colonnes réelles uniquement (schéma vérifié)
CREATE OR REPLACE FUNCTION get_nearby_profiles(
  p_lat       float8,
  p_lng       float8,
  p_radius_km float8,
  p_limit     int,
  p_user_id   uuid
)
RETURNS TABLE (
  id                   uuid,
  prenom               text,
  pseudo               text,
  photo_url            text,
  bio                  text,
  age                  integer,
  genre                text,
  cherche              text,
  signe_astro          text,
  ville                text,
  score_fiabilite      integer,
  photo_verified       boolean,
  boost_until          timestamptz,
  is_mystery           boolean,
  inscription_complete boolean,
  created_at           timestamptz,
  date_naissance       date,
  energie_romantique   text,
  reve_duo             text,
  style_amour          text,
  moment_prefere       text,
  empreinte_couleur    text,
  ascendant            text,
  planete_dominante    text,
  element_astrologique text,
  cadre_id             text,
  premium_until        timestamptz,
  premium_frames       text[],
  latitude             float8,
  longitude            float8,
  distance_km          float8
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    p.id, p.prenom, p.pseudo, p.photo_url, p.bio, p.age,
    p.genre, p.cherche, p.signe_astro, p.ville, p.score_fiabilite,
    p.photo_verified, p.boost_until, p.is_mystery, p.inscription_complete,
    p.created_at, p.date_naissance, p.energie_romantique, p.reve_duo,
    p.style_amour, p.moment_prefere, p.empreinte_couleur,
    p.ascendant, p.planete_dominante, p.element_astrologique,
    p.cadre_id, p.premium_until, p.premium_frames,
    p.latitude, p.longitude,
    (2 * 6371 * asin(sqrt(
      sin(radians((p.latitude - p_lat) / 2))^2 +
      cos(radians(p_lat)) * cos(radians(p.latitude)) *
      sin(radians((p.longitude - p_lng) / 2))^2
    ))) AS distance_km
  FROM profiles p
  WHERE p.id            <> p_user_id
    AND p.latitude      IS NOT NULL
    AND p.longitude     IS NOT NULL
    AND p.inscription_complete = true
    AND p.is_banned     = false
    AND p.latitude  BETWEEN p_lat - (p_radius_km / 111.0)
                        AND p_lat + (p_radius_km / 111.0)
    AND p.longitude BETWEEN p_lng - (p_radius_km / (111.0 * cos(radians(p_lat))))
                        AND p_lng + (p_radius_km / (111.0 * cos(radians(p_lat))))
    AND (2 * 6371 * asin(sqrt(
      sin(radians((p.latitude - p_lat) / 2))^2 +
      cos(radians(p_lat)) * cos(radians(p.latitude)) *
      sin(radians((p.longitude - p_lng) / 2))^2
    ))) <= p_radius_km
  ORDER BY distance_km ASC
  LIMIT p_limit;
$$;
