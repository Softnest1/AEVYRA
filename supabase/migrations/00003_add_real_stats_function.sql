-- Fonction RPC publique : compte les matches du mois en cours
-- Accessible sans authentification (pour la landing page visiteurs)
CREATE OR REPLACE FUNCTION get_matches_this_month()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer
  FROM matches
  WHERE created_at >= date_trunc('month', NOW());
$$;

-- Accorder l'exécution à tous (visiteurs non connectés inclus)
GRANT EXECUTE ON FUNCTION get_matches_this_month() TO anon;
GRANT EXECUTE ON FUNCTION get_matches_this_month() TO authenticated;

-- Fonction RPC : stats globales de l'app (inscriptions + matches)
CREATE OR REPLACE FUNCTION get_app_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'matches_this_month', (
      SELECT COUNT(*)::integer FROM matches
      WHERE created_at >= date_trunc('month', NOW())
    ),
    'total_users', (
      SELECT COUNT(*)::integer FROM profiles
      WHERE inscription_complete = true
    ),
    'total_matches', (
      SELECT COUNT(*)::integer FROM matches
    )
  );
$$;

GRANT EXECUTE ON FUNCTION get_app_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_app_stats() TO authenticated;