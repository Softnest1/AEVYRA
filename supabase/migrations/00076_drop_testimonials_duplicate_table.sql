-- ══════════════════════════════════════════════════════════════════
-- Migration 00076 : supprimer la table testimonials (doublon de temoignages)
-- 
-- CONTEXTE :
--   - testimonials (5 cols, vide) était un doublon non utilisé côté app
--   - temoignages (7 cols, version officielle) est utilisée par :
--       * amour-api.ts : getPublicTemoignages(), addTemoignage(), etc.
--       * parametres.tsx : formulaire utilisateur
--   - admin-api a été migré pour pointer sur temoignages (migration code)
-- ══════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS public.testimonials CASCADE;

-- Commentaire d'architecture sur temoignages
COMMENT ON TABLE public.temoignages IS 
  'Table unifiée des témoignages utilisateurs. 
   Remplace testimonials (supprimée migration 00076).
   approuve=false par défaut, mis à true par admin via admin-api.';

COMMENT ON COLUMN public.temoignages.approuve IS 
  'Validé par admin avant affichage public (Hero landing page)';