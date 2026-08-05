
-- Drop + recreate get_admin_stats sans WHERE is_admin() (bloquait service_role)
DROP FUNCTION IF EXISTS get_admin_stats();
CREATE FUNCTION get_admin_stats()
RETURNS SETOF admin_stats
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM admin_stats;
$$;

-- admin_daily_signups — SECURITY DEFINER pour accès auth.users
DROP FUNCTION IF EXISTS admin_daily_signups(int);
CREATE FUNCTION admin_daily_signups(days int DEFAULT 30)
RETURNS TABLE(day date, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    date_trunc('day', created_at)::date AS day,
    count(*) AS count
  FROM auth.users
  WHERE created_at > now() - (days || ' days')::interval
  GROUP BY 1
  ORDER BY 1;
$$;

-- Policy SELECT sur admin_roles pour qu'un admin lise sa propre ligne (useAdminGuard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'admin_roles' AND policyname = 'admin_read_own_role'
  ) THEN
    EXECUTE 'CREATE POLICY admin_read_own_role ON admin_roles
      FOR SELECT TO authenticated
      USING (user_id = auth.uid())';
  END IF;
END$$;

-- Colonnes profiles défensives
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS banned_reason TEXT,
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;
