// Aevyra – Edge Function : Envoi push Expo temps-réel
// Déclenchée par pg_net depuis les triggers notify_on_match / notify_on_message
// POST { event: 'match'|'message', user_id, title, body, data }
// Sécurité : vérification IP bannie + token interne obligatoire
import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/** Extraire l'IP réelle depuis les headers Cloudflare/proxy */
function getClientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown'
  );
}

interface PushPayload {
  event:   'match' | 'message';
  user_id: string;
  title:   string;
  body:    string;
  data?:   Record<string, string>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  // ── Vérification token interne (pg_net → Edge Function) ────────────────
  // Cette fonction est déclenchée uniquement par pg_net, jamais par le client.
  // On exige un token interne pour éviter qu'un appelant externe puisse spammer.
  const internalToken = req.headers.get('x-internal-token');
  const expectedToken = Deno.env.get('INTERNAL_MONITOR_TOKEN');
  if (expectedToken && internalToken !== expectedToken) {
    // Appel externe non autorisé — log silencieux, réponse neutre
    console.warn('[send-push] token interne invalide — rejeté');
    return new Response(JSON.stringify({ sent: 0, reason: 'unauthorized' }), { status: 401 });
  }

  const ip = getClientIp(req);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // ── Vérifier IP bannie (défense en profondeur) ─────────────────────────
  if (ip !== 'unknown') {
    const { data: isBanned } = await supabase.rpc('is_ip_banned', { p_ip: ip });
    if (isBanned) {
      await supabase.rpc('log_security_event', {
        p_event_type: 'banned_ip_push_attempt',
        p_ip: ip,
        p_user_id: null,
        p_endpoint: 'send-push-on-event',
        p_payload: { method: req.method },
        p_severity: 'high',
      });
      return new Response(JSON.stringify({ sent: 0, reason: 'banned' }), { status: 403 });
    }
  }

  let payload: PushPayload;
  try {
    payload = await req.json() as PushPayload;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { user_id, title, body, data } = payload;
  if (!user_id || !title || !body) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
  }

  // Récupérer tous les tokens actifs de l'utilisateur
  const { data: tokens, error: tokErr } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', user_id)
    .order('updated_at', { ascending: false })
    .limit(5);

  if (tokErr || !tokens?.length) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no_tokens' }), { status: 200 });
  }

  // Vérifier que les notifs sont activées pour cet utilisateur
  const { data: profile } = await supabase
    .from('profiles')
    .select('notif_enabled')
    .eq('id', user_id)
    .maybeSingle();

  if (profile?.notif_enabled === false) {
    return new Response(JSON.stringify({ sent: 0, reason: 'notif_disabled' }), { status: 200 });
  }

  // Construire les messages Expo
  const messages = tokens.map((t: { token: string }) => ({
    to:    t.token,
    title,
    body,
    data:  data ?? {},
    sound: 'default',
    badge: 1,
    channelId: 'aevyra-default',
    priority: 'high',
  }));

  // Envoi vers l'API Expo Push (batch)
  const res = await fetch(EXPO_PUSH_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body:    JSON.stringify(messages),
  });

  const result = await res.json();
  return new Response(JSON.stringify({ sent: messages.length, result }), {
    status:  200,
    headers: { 'Content-Type': 'application/json' },
  });
});
