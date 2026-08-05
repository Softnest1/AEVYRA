
-- Table des témoignages soumis par de vrais membres Âmour
-- Conformité : art. L.111-7-2 Code de la Consommation
CREATE TABLE IF NOT EXISTS public.temoignages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  texte         text NOT NULL CHECK (char_length(texte) BETWEEN 30 AND 600),
  consentement  boolean NOT NULL DEFAULT false,
  approuve      boolean NOT NULL DEFAULT false,  -- modération manuelle avant affichage public
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Index pour la landing (seulement les approuvés, triés par date)
CREATE INDEX IF NOT EXISTS idx_temoignages_approuves ON public.temoignages(approuve, created_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_temoignages_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_temoignages_updated_at ON public.temoignages;
CREATE TRIGGER trig_temoignages_updated_at
  BEFORE UPDATE ON public.temoignages
  FOR EACH ROW EXECUTE FUNCTION public.set_temoignages_updated_at();

-- RLS
ALTER TABLE public.temoignages ENABLE ROW LEVEL SECURITY;

-- Lecture publique : uniquement les témoignages approuvés (landing + app)
CREATE POLICY "temoignages_select_public"
  ON public.temoignages FOR SELECT
  USING (approuve = true);

-- Insertion : membres connectés uniquement (1 témoignage par membre max)
CREATE POLICY "temoignages_insert_own"
  ON public.temoignages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND consentement = true
    AND NOT EXISTS (
      SELECT 1 FROM public.temoignages t2
      WHERE t2.user_id = auth.uid()
    )
  );

-- Lecture de son propre témoignage (pour afficher le statut de modération)
CREATE POLICY "temoignages_select_own"
  ON public.temoignages FOR SELECT
  USING (auth.uid() = user_id);

-- Suppression : l'auteur peut retirer son témoignage
CREATE POLICY "temoignages_delete_own"
  ON public.temoignages FOR DELETE
  USING (auth.uid() = user_id);
