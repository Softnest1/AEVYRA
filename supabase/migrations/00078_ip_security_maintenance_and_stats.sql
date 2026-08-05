-- ════════════════════════════════════════════════════════════════════════════
-- Migration : Maintenance IP + statistiques stratégiques
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Nettoyage automatique des bans expirés (appelé par pg_cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_bans()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count INT;
BEGIN
  DELETE FROM public.banned_ips
  WHERE expires_at IS NOT NULL AND expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 2. Statistiques IP stratégiques pour le dashboard admin
CREATE OR REPLACE FUNCTION public.get_ip_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    -- Total IPs bannies actives
    'banned_ips_total',        (SELECT COUNT(*) FROM public.banned_ips WHERE (expires_at IS NULL OR expires_at > now())),
    -- Bans permanents
    'banned_ips_permanent',    (SELECT COUNT(*) FROM public.banned_ips WHERE expires_at IS NULL),
    -- Bans temporaires encore actifs
    'banned_ips_temporary',    (SELECT COUNT(*) FROM public.banned_ips WHERE expires_at IS NOT NULL AND expires_at > now()),
    -- Top 10 IPs les plus actives (events)
    'top_ips_24h',             (
      SELECT jsonb_agg(r) FROM (
        SELECT ip_address, COUNT(*) as hits, MAX(severity) as max_severity
        FROM public.security_events
        WHERE created_at > now() - INTERVAL '24 hours'
          AND ip_address != 'unknown'
        GROUP BY ip_address
        ORDER BY hits DESC
        LIMIT 10
      ) r
    ),
    -- Events par sévérité (24h)
    'events_by_severity_24h',  (
      SELECT jsonb_object_agg(severity, cnt) FROM (
        SELECT severity, COUNT(*) as cnt
        FROM public.security_events
        WHERE created_at > now() - INTERVAL '24 hours'
        GROUP BY severity
      ) s
    ),
    -- Honeypot hits (7 jours)
    'honeypot_hits_7d',        (SELECT COUNT(*) FROM public.honeypot_triggers WHERE triggered_at > now() - INTERVAL '7 days'),
    -- Top routes honeypot
    'honeypot_top_routes',     (
      SELECT jsonb_agg(r) FROM (
        SELECT route, COUNT(*) as hits
        FROM public.honeypot_triggers
        WHERE triggered_at > now() - INTERVAL '7 days'
        GROUP BY route ORDER BY hits DESC LIMIT 5
      ) r
    ),
    -- Bans auto déclenchés (24h)
    'auto_bans_24h',           (SELECT COUNT(*) FROM public.banned_ips WHERE banned_at > now() - INTERVAL '24 hours'),
    -- Timestamp de la stat
    'generated_at',            now()
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- 3. Fonction : vérifier + rafraîchir un ban si IP déjà bannie mais expirée
--    Évite de garder des fantômes dans la table
CREATE OR REPLACE FUNCTION public.is_ip_banned(p_ip TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row public.banned_ips%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.banned_ips WHERE ip_address = p_ip LIMIT 1;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  -- Si le ban a expiré, supprimer l'entrée et retourner false
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN
    DELETE FROM public.banned_ips WHERE ip_address = p_ip;
    RETURN FALSE;
  END IF;
  RETURN TRUE;
END;
$$;

-- 4. Index composite pour accélération des requêtes stats (évite seq scan)
CREATE INDEX IF NOT EXISTS idx_security_events_severity_date
  ON public.security_events(severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_honeypot_triggers_date
  ON public.honeypot_triggers(triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_banned_ips_expires_at
  ON public.banned_ips(expires_at)
  WHERE expires_at IS NOT NULL;

-- 5. Planifier le nettoyage automatique toutes les heures via pg_cron
-- (pg_cron doit être activé sur le projet Supabase)
SELECT cron.schedule(
  'cleanup-expired-bans',
  '0 * * * *',   -- toutes les heures
  $$SELECT public.cleanup_expired_bans();$$
) WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-bans'
);