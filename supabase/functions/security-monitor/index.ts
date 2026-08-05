// ============================================================
// Edge Function : security-monitor
// Détection brute-force cross-fonctions + consultation blacklist IP.
// Appelée par toutes les autres Edge Functions pour vérifier une IP.
// Peut aussi être appelée directement par le dashboard admin.
// ============================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = new Set([
  'https://aevyra.uk',
  'https://www.aevyra.uk',
  'https://app.aevyra.uk',
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

// Token interne pour que les autres Edge Functions appellent ce monitor
// sans exposer la service_role key — configuré en secret Supabase
function isInternalCall(req: Request): boolean {
  const token = req.headers.get('x-internal-token');
  const expected = Deno.env.get('INTERNAL_MONITOR_TOKEN');
  return !!expected && token === expected;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: makeCORS(req) });
  if (req.method !== 'POST') return json({ error: 'POST requis' }, 405, req);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const action = (body.action as string) ?? 'check_ip';

  // ── Action : vérifier si une IP est bannie ────────────────────────────────
  // Requiert le token interne OU une auth admin — ne jamais exposer publiquement
  if (action === 'check_ip') {
    const authHeader = req.headers.get('Authorization');
    const isInternal = isInternalCall(req);
    if (!isInternal) {
      // Vérifier auth admin si pas d'appel interne
      if (!authHeader) return json({ error: 'Non autorisé' }, 401, req);
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) return json({ error: 'Token invalide' }, 401, req);
      const { data: adminRow } = await supabase.from('admin_roles').select('role').eq('user_id', user.id).maybeSingle();
      if (!adminRow) return json({ error: 'Accès refusé' }, 403, req);
    }

    const ip = (body.ip as string) ?? '';
    if (!ip) return json({ banned: false }, 200, req);

    const { data: banned } = await supabase.rpc('is_ip_banned', { p_ip: ip });
    return json({ banned: !!banned, ip }, 200, req);
  }

  // ── Action : enregistrer un événement (depuis une autre Edge Function) ────
  if (action === 'log_event') {
    // Vérifier le token interne OU l'auth admin
    const authHeader = req.headers.get('Authorization');
    const isInternal = isInternalCall(req);
    if (!isInternal && !authHeader) {
      return json({ error: 'Non autorisé' }, 401, req);
    }

    // Si appel admin authentifié, vérifier le rôle
    if (!isInternal && authHeader) {
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) return json({ error: 'Token invalide' }, 401, req);
      const { data: adminRow } = await supabase.from('admin_roles').select('role').eq('user_id', user.id).maybeSingle();
      if (!adminRow) return json({ error: 'Accès refusé' }, 403, req);
    }

    const { data: eventId, error } = await supabase.rpc('log_security_event', {
      p_event_type: body.event_type as string ?? 'unknown',
      p_ip:         body.ip as string ?? 'unknown',
      p_user_id:    (body.user_id as string) ?? null,
      p_endpoint:   (body.endpoint as string) ?? null,
      p_payload:    (body.payload as Record<string, unknown>) ?? {},
      p_severity:   (body.severity as string) ?? 'medium',
    });

    if (error) return json({ error: error.message }, 500, req);
    return json({ event_id: eventId, logged: true }, 200, req);
  }

  // ── Action : statistiques de sécurité (admin uniquement) ─────────────────
  if (action === 'stats') {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Non authentifié' }, 401, req);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Token invalide' }, 401, req);
    const { data: adminRow } = await supabase.from('admin_roles').select('role').eq('user_id', user.id).maybeSingle();
    if (!adminRow) return json({ error: 'Accès refusé' }, 403, req);

    const { data: stats } = await supabase.rpc('get_security_stats');
    return json({ stats }, 200, req);
  }

  // ── Action : lever un ban (super_admin uniquement) ────────────────────────
  if (action === 'unban_ip') {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Non authentifié' }, 401, req);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Token invalide' }, 401, req);
    const { data: adminRow } = await supabase.from('admin_roles').select('role').eq('user_id', user.id).maybeSingle();
    if (adminRow?.role !== 'super_admin') return json({ error: 'super_admin requis' }, 403, req);

    const ip = body.ip as string;
    if (!ip) return json({ error: 'ip requis' }, 400, req);

    await supabase.from('banned_ips').delete().eq('ip_address', ip);
    return json({ unban: true, ip }, 200, req);
  }

  return json({ error: 'Action inconnue' }, 400, req);
});
