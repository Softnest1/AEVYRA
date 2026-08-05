
-- ══════════════════════════════════════════════════════════════
-- Table dislikes : "Passer" silencieux — protège l'ego des 2 côtés
-- Stratégie : jamais notifié, jamais visible, juste exclus du feed
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.dislikes (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_user_id, to_user_id)
);

ALTER TABLE public.dislikes ENABLE ROW LEVEL SECURITY;

-- SELECT : seulement ses propres dislikes (jamais visible par la cible)
CREATE POLICY "dislikes_select_own" ON public.dislikes
  FOR SELECT TO authenticated
  USING (from_user_id = auth.uid());

-- INSERT : seulement pour soi-même
CREATE POLICY "dislikes_insert_own" ON public.dislikes
  FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid());

-- DELETE : retirer un dislike (si l'utilisateur change d'avis)
CREATE POLICY "dislikes_delete_own" ON public.dislikes
  FOR DELETE TO authenticated
  USING (from_user_id = auth.uid());

-- Index de performance pour exclusion du feed (requête très fréquente)
CREATE INDEX IF NOT EXISTS idx_dislikes_from_user
  ON public.dislikes (from_user_id, created_at DESC);

-- TTL auto : les dislikes expirent après 30 jours → le profil réapparaît
-- Cron job via pg_cron (si disponible) — sinon géré côté requête
CREATE INDEX IF NOT EXISTS idx_dislikes_created_at
  ON public.dislikes (created_at);
