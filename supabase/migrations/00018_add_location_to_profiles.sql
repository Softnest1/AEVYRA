-- Colonnes de localisation sur profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS ville     TEXT,
  ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- Fonction haversine : distance en km entre deux points GPS
CREATE OR REPLACE FUNCTION haversine_km(
  lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION LANGUAGE sql IMMUTABLE AS $$
  SELECT 6371 * 2 * ASIN(SQRT(
    POWER(SIN(RADIANS(lat2 - lat1) / 2), 2) +
    COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
    POWER(SIN(RADIANS(lon2 - lon1) / 2), 2)
  ));
$$;

-- Index pour requêtes de proximité rapides
CREATE INDEX IF NOT EXISTS idx_profiles_location
  ON profiles (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;