-- ══════════════════════════════════════════════════════════════
-- Vague 2 — Push notifs intelligentes + éphémérides
-- ══════════════════════════════════════════════════════════════

-- pg_cron + pg_net pour la notif quotidienne à 9h
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Table : empêche les doublons de notif quotidienne
CREATE TABLE IF NOT EXISTS daily_notif_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notif_date date NOT NULL DEFAULT CURRENT_DATE,
  notif_type text NOT NULL DEFAULT 'daily_match',
  sent_at    timestamptz DEFAULT now(),
  UNIQUE(user_id, notif_date, notif_type)
);
ALTER TABLE daily_notif_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_notif_log" ON daily_notif_log
  FOR SELECT USING (auth.uid() = user_id);

-- Table : âme du jour pré-calculée (optim perf)
-- seed quotidien calculé côté client, pas besoin de table

-- Planifier l'envoi des notifs à 9h (UTC+1 Paris = 8h UTC)
SELECT cron.schedule(
  'aevyra-daily-match-notif',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/daily-match-notif',
    headers := jsonb_build_object(
      'Content-type', 'application/json',
      'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'publishable_key')
    ),
    body := concat('{"scheduled_at": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);
