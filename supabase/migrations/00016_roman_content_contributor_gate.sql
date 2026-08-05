-- Ajouter author_id pour tracer les contributions utilisateurs
ALTER TABLE roman_content
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Activer RLS si pas encore fait
ALTER TABLE roman_content ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques pour repartir proprement
DROP POLICY IF EXISTS "roman_content_select_all"    ON roman_content;
DROP POLICY IF EXISTS "roman_content_insert_members" ON roman_content;
DROP POLICY IF EXISTS "roman_content_insert"         ON roman_content;
DROP POLICY IF EXISTS "roman_content_update_author"  ON roman_content;
DROP POLICY IF EXISTS "roman_content_delete_author"  ON roman_content;

-- ── SELECT : tout le monde peut lire
CREATE POLICY "roman_content_select_all"
  ON roman_content FOR SELECT
  USING (true);

-- ── Helper SECURITY DEFINER : ancienneté du profil (évite self-loop RLS)
CREATE OR REPLACE FUNCTION is_member_since_days(days integer)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND created_at <= (now() - (days || ' days')::interval)
  );
$$;

-- ── INSERT : seulement membres inscrits depuis ≥3 jours
CREATE POLICY "roman_content_insert_members"
  ON roman_content FOR INSERT
  TO authenticated
  WITH CHECK (
    is_member_since_days(3)
    AND author_id = auth.uid()
  );

-- ── UPDATE : seulement l'auteur original, toujours membre ≥3 jours
CREATE POLICY "roman_content_update_author"
  ON roman_content FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid() AND is_member_since_days(3))
  WITH CHECK (author_id = auth.uid());

-- ── DELETE : seulement l'auteur original
CREATE POLICY "roman_content_delete_author"
  ON roman_content FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- Ajouter author_id avec DEFAULT auth.uid() pour les nouveaux inserts
ALTER TABLE roman_content
  ALTER COLUMN author_id SET DEFAULT auth.uid();