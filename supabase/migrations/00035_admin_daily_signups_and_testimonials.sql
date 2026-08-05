
-- RPC pour courbe inscriptions par jour
CREATE OR REPLACE FUNCTION admin_daily_signups(days int DEFAULT 30)
RETURNS TABLE (day date, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    date_trunc('day', created_at)::date AS day,
    count(*) AS count
  FROM auth.users
  WHERE created_at > now() - (days || ' days')::interval
  GROUP BY 1
  ORDER BY 1;
$$;

-- Table testimonials si pas encore créée
CREATE TABLE IF NOT EXISTS testimonials (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     text NOT NULL,
  is_approved boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Tout utilisateur peut soumettre
CREATE POLICY "auth_insert_testimonial" ON testimonials
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Tout le monde peut lire les approuvés
CREATE POLICY "public_select_approved" ON testimonials
  FOR SELECT USING (is_approved = true OR (auth.uid() = user_id) OR is_admin());

-- Admin peut tout faire
CREATE POLICY "admin_all_testimonials" ON testimonials
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
