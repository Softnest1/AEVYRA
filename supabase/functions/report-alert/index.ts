// Edge Function : report-alert
// Déclenchée par pg_net depuis check_auto_suspension quand nb_signalements atteint 3 ou 5.
// Stratégie 100% maison : push Expo natif aux admins + log DB admin_logs.
// Zéro dépendance externe — INTERNAL_MONITOR_TOKEN requis.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = new Set([
  'https://aevyra.uk',
  'https://www.aevyra.uk',
]);

function makeCORS(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : 'https://aevyra.uk';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-token',
    'Vary': 'Origin',
  };
}

const json = (data: unknown, status: number, req: Request) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...makeCORS(req), 'Content-Type': 'application/json' },
  });

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: makeCORS(req) });
  if (req.method !== 'POST') return json({ error: 'POST requis' }, 405, req);

  // Token interne obligatoire — jamais appelé par le client
  const token = req.headers.get('x-internal-token');
  const expected = Deno.env.get('INTERNAL_MONITOR_TOKEN');
  if (!expected || token !== expected) {
    return json({ error: 'Non autorisé' }, 401, req);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const reportedId     = body.reported_id as string | undefined;
  const nbSignalements = body.nb_signalements as number | undefined ?? 0;
  const scoreInit      = body.score as number | undefined;

  if (!reportedId) return json({ error: 'reported_id requis' }, 400, req);

  // Récupérer la fiche complète du suspect
  const { data: profile } = await supabase
    .from('profiles')
    .select('prenom, pseudo, genre, signe_astro, score_fiabilite, nb_signalements, auto_suspended')
    .eq('id', reportedId)
    .maybeSingle();

  const nom   = profile ? `${profile.prenom} (@${profile.pseudo})` : `ID:${reportedId.slice(0, 8)}`;
  const score = scoreInit ?? profile?.score_fiabilite ?? 100;
  const isUrgent = nbSignalements >= 5;

  // Récupérer tous les admins avec leur push_token (bypass notif_enabled = false pour alertes critiques)
  const { data: admins } = await supabase
    .from('admin_roles')
    .select('user_id');

  if (!admins?.length) {
    console.warn('[report-alert] Aucun admin trouvé');
    return json({ ok: true, sent: 0, reason: 'no_admins' }, 200, req);
  }

  const adminIds = admins.map((a: { user_id: string }) => a.user_id);

  // Récupérer les push_tokens de tous les admins (bypass : on prend tous leurs tokens)
  const { data: tokenRows } = await supabase
    .from('push_tokens')
    .select('token, user_id')
    .in('user_id', adminIds)
    .order('updated_at', { ascending: false });

  if (!tokenRows?.length) {
    // Pas de token push mais log quand même
    console.log(`[report-alert] ${isUrgent ? '🚨' : '⚠️'} ${nom} — ${nbSignalements} signalements (score ${score}) — pas de token push admin`);
    return json({ ok: true, sent: 0, reason: 'no_push_tokens' }, 200, req);
  }

  // Construire les messages push Expo pour chaque admin
  const title = isUrgent
    ? `🚨 5 signalements — Décision urgente`
    : `⚠️ 3 signalements — Action requise`;

  const pushBody = isUrgent
    ? `${nom} est très signalé (score ${score}/100). Ban définitif ou libérer ?`
    : `${nom} suspendu auto (score ${score}/100). Vérifiez les signalements.`;

  const messages = tokenRows.map((t: { token: string; user_id: string }) => ({
    to:        t.token,
    title,
    body:      pushBody,
    sound:     'default',
    badge:     1,
    priority:  'high',
    channelId: 'aevyra-default',
    data: {
      screen:      'reports',
      reported_id: reportedId,
      nb:          String(nbSignalements),
    },
  }));

  // Envoi push Expo (batch, max 100 par appel)
  const res = await fetch(EXPO_PUSH_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body:    JSON.stringify(messages),
  });

  const result = await res.json();
  console.log(`[report-alert] Push envoyé à ${messages.length} token(s) admin — ${nbSignalements} signalements sur ${nom}`);

  return json({ ok: true, sent: messages.length, result }, 200, req);
});
