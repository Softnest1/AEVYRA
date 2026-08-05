-- Table dédiée aux signalements "problème app" (bug, comportement, contenu, autre)
-- Séparée de public.reports (profils signalés) pour éviter la contrainte no_self_report
CREATE TABLE IF NOT EXISTS public.app_reports (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categorie    TEXT        NOT NULL DEFAULT 'autre'
                           CHECK (categorie IN ('bug', 'comportement', 'contenu', 'autre')),
  details      TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_reports_reporter  ON public.app_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_app_reports_status    ON public.app_reports(status);
CREATE INDEX IF NOT EXISTS idx_app_reports_created   ON public.app_reports(created_at DESC);

ALTER TABLE public.app_reports ENABLE ROW LEVEL SECURITY;

-- Tout utilisateur authentifié peut insérer son propre signalement
CREATE POLICY "app_reports_insert_own" ON public.app_reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());

-- Chaque utilisateur voit ses propres signalements
CREATE POLICY "app_reports_select_own" ON public.app_reports
  FOR SELECT TO authenticated USING (reporter_id = auth.uid());

-- Admin peut tout faire
CREATE POLICY "app_reports_admin_all" ON public.app_reports
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());