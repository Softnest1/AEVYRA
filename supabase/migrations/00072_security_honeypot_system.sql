
-- ============================================================
-- SYSTÈME HONEYPOT & DÉTECTION D'INTRUSION — Aevyra Security
-- ============================================================

-- 1. Table des événements de sécurité (toutes tentatives suspectes)
CREATE TABLE IF NOT EXISTS public.security_events (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type    TEXT        NOT NULL, -- 'brute_force', 'honeypot_hit', 'unauthorized_admin', 'sql_injection_attempt', 'invalid_jwt', 'rate_limit_exceeded'
  ip_address    TEXT,
  user_id       UUID,                 -- NULL si non authentifié
  endpoint      TEXT,                 -- Quelle fonction / route visée
  payload       JSONB,                -- Données de la requête (anonymisées)
  severity      TEXT        NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  auto_banned   BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Table des IPs bannies (persistante, consultée par toutes les Edge Functions)
CREATE TABLE IF NOT EXISTS public.banned_ips (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address    TEXT        NOT NULL UNIQUE,
  reason        TEXT        NOT NULL,
  banned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ,          -- NULL = permanent
  ban_count     INT         NOT NULL DEFAULT 1,
  last_event_id UUID        REFERENCES public.security_events(id)
);

-- 3. Table honeypot : routes leurres qui ne doivent JAMAIS être appelées légitimement
CREATE TABLE IF NOT EXISTS public.honeypot_triggers (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  route         TEXT        NOT NULL, -- ex: '/api/admin/config', '/wp-admin', '/.env'
  ip_address    TEXT,
  user_agent    TEXT,
  triggered_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_security_events_ip      ON public.security_events(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type    ON public.security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_uid     ON public.security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_banned_ips_ip           ON public.banned_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_banned_ips_expires      ON public.banned_ips(expires_at);

-- RLS : seuls les admins peuvent lire, le système peut écrire via SECURITY DEFINER
ALTER TABLE public.security_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banned_ips       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.honeypot_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_security_events"   ON public.security_events   FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_read_banned_ips"        ON public.banned_ips         FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_read_honeypot_triggers" ON public.honeypot_triggers  FOR SELECT USING (public.is_admin());
-- Aucun utilisateur ne peut écrire directement — uniquement via SECURITY DEFINER
CREATE POLICY "no_direct_insert_security"    ON public.security_events   FOR INSERT WITH CHECK (false);
CREATE POLICY "no_direct_insert_banned"      ON public.banned_ips         FOR INSERT WITH CHECK (false);
CREATE POLICY "no_direct_insert_honeypot"    ON public.honeypot_triggers  FOR INSERT WITH CHECK (false);

-- 4. Fonction SECURITY DEFINER : enregistrer un événement de sécurité
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type  TEXT,
  p_ip          TEXT,
  p_user_id     UUID DEFAULT NULL,
  p_endpoint    TEXT DEFAULT NULL,
  p_payload     JSONB DEFAULT '{}',
  p_severity    TEXT DEFAULT 'medium'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id    UUID;
  v_ban_count   INT;
  v_should_ban  BOOLEAN := false;
  v_ban_reason  TEXT;
  v_ban_hours   INT;
BEGIN
  -- Insérer l'événement
  INSERT INTO public.security_events(event_type, ip_address, user_id, endpoint, payload, severity)
  VALUES (p_event_type, p_ip, p_user_id, p_endpoint, p_payload, p_severity)
  RETURNING id INTO v_event_id;

  -- Compter les événements récents pour cette IP (dernière heure)
  SELECT COUNT(*) INTO v_ban_count
  FROM public.security_events
  WHERE ip_address = p_ip
    AND created_at > now() - interval '1 hour';

  -- Logique d'auto-ban selon le type et la fréquence
  IF p_event_type = 'honeypot_hit' THEN
    -- Frapper une route honeypot = ban immédiat 48h
    v_should_ban  := true;
    v_ban_reason  := 'Honeypot déclenché — accès à une route leurre';
    v_ban_hours   := 48;
  ELSIF p_event_type = 'brute_force' AND v_ban_count >= 3 THEN
    v_should_ban  := true;
    v_ban_reason  := 'Brute force détecté — ' || v_ban_count || ' tentatives en 1h';
    v_ban_hours   := 24;
  ELSIF p_event_type = 'unauthorized_admin' AND v_ban_count >= 2 THEN
    v_should_ban  := true;
    v_ban_reason  := 'Tentatives répétées d''accès admin non autorisé';
    v_ban_hours   := 72;
  ELSIF p_severity = 'critical' THEN
    v_should_ban  := true;
    v_ban_reason  := 'Événement critique : ' || p_event_type;
    v_ban_hours   := 168; -- 7 jours
  ELSIF v_ban_count >= 10 THEN
    -- Toute IP générant 10+ événements suspects en 1h est bannie
    v_should_ban  := true;
    v_ban_reason  := 'Volume d''activité suspecte : ' || v_ban_count || ' événements en 1h';
    v_ban_hours   := 12;
  END IF;

  -- Appliquer le ban si nécessaire (upsert — incrémente si déjà banni)
  IF v_should_ban AND p_ip IS NOT NULL AND p_ip != 'unknown' THEN
    INSERT INTO public.banned_ips(ip_address, reason, expires_at, ban_count, last_event_id)
    VALUES (p_ip, v_ban_reason, now() + (v_ban_hours || ' hours')::interval, 1, v_event_id)
    ON CONFLICT (ip_address) DO UPDATE
      SET reason        = EXCLUDED.reason,
          expires_at    = GREATEST(banned_ips.expires_at, EXCLUDED.expires_at),
          ban_count     = banned_ips.ban_count + 1,
          last_event_id = EXCLUDED.last_event_id;

    -- Marquer l'événement comme ayant déclenché un ban
    UPDATE public.security_events SET auto_banned = true WHERE id = v_event_id;
  END IF;

  RETURN v_event_id;
END;
$$;

-- 5. Fonction : vérifier si une IP est bannie (appelée par les Edge Functions)
CREATE OR REPLACE FUNCTION public.is_ip_banned(p_ip TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.banned_ips
    WHERE ip_address = p_ip
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- 6. Fonction : statistiques de sécurité pour le dashboard admin
CREATE OR REPLACE FUNCTION public.get_security_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_events_24h',    (SELECT COUNT(*) FROM security_events WHERE created_at > now() - interval '24 hours'),
    'total_events_7d',     (SELECT COUNT(*) FROM security_events WHERE created_at > now() - interval '7 days'),
    'active_bans',         (SELECT COUNT(*) FROM banned_ips WHERE expires_at > now() OR expires_at IS NULL),
    'honeypot_hits_24h',   (SELECT COUNT(*) FROM security_events WHERE event_type = 'honeypot_hit' AND created_at > now() - interval '24 hours'),
    'brute_force_24h',     (SELECT COUNT(*) FROM security_events WHERE event_type = 'brute_force' AND created_at > now() - interval '24 hours'),
    'top_ips',             (
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT ip_address, COUNT(*) as hits, MAX(created_at) as last_seen
        FROM security_events
        WHERE created_at > now() - interval '24 hours'
        GROUP BY ip_address ORDER BY hits DESC LIMIT 10
      ) t
    ),
    'critical_events',     (
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT event_type, ip_address, endpoint, created_at
        FROM security_events
        WHERE severity = 'critical' AND created_at > now() - interval '24 hours'
        ORDER BY created_at DESC LIMIT 20
      ) t
    )
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- Grants pour les Edge Functions (service_role uniquement)
GRANT EXECUTE ON FUNCTION public.log_security_event(TEXT,TEXT,UUID,TEXT,JSONB,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_ip_banned(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_security_stats() TO service_role;
GRANT INSERT ON public.security_events   TO service_role;
GRANT INSERT ON public.banned_ips        TO service_role;
GRANT INSERT ON public.honeypot_triggers TO service_role;
GRANT SELECT ON public.banned_ips        TO service_role;
GRANT SELECT ON public.security_events   TO service_role;

-- Nettoyage automatique des anciens événements (>90 jours) via pg_cron si disponible
SELECT cron.schedule(
  'cleanup-security-events',
  '0 3 * * 0', -- Chaque dimanche à 3h UTC
  $$DELETE FROM public.security_events WHERE created_at < now() - interval '90 days'$$
) WHERE EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron');
