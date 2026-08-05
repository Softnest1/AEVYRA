
-- ══════════════════════════════════════════════════════════════
-- Migration 054 — Crédibilité : roman_content branding Aevyra
--                + get_app_stats enrichi
-- ══════════════════════════════════════════════════════════════

-- 1. Corriger le branding : "Âmour" → "Aevyra" dans roman_content
UPDATE roman_content SET auteur = 'Aevyra' WHERE auteur = 'Âmour';
UPDATE roman_content SET auteur = 'L''Oracle Aevyra' WHERE auteur = 'L''Oracle des Âmes';

-- 2. Corriger "histoire vraie" Léa & Thomas : retirer référence à l'ancien nom
UPDATE roman_content 
SET contenu = 'Ils se sont rencontrés un soir de novembre. Leur première conversation a duré 8 heures. Aujourd''hui, ils préparent leur avenir ensemble.',
    auteur = 'Histoire inspirante'
WHERE id = '279addd8-4edf-4e5f-a0b3-55c4d2a8a5fe';

-- 3. Remplacer get_app_stats par une version enrichie — retourne plus de données
CREATE OR REPLACE FUNCTION get_app_stats()
RETURNS json
LANGUAGE sql
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
    ),
    'total_temoignages', (
      SELECT COUNT(*)::integer FROM temoignages
      WHERE approuve = true
    ),
    'total_roman', (
      SELECT COUNT(*)::integer FROM roman_content
    ),
    'total_roman_likes', (
      SELECT COUNT(*)::integer FROM roman_likes
    )
  );
$$;
