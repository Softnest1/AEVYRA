// Edge Function : reset-password-by-phrase
// Reçoit { email, new_password } — déjà validé par get_email_by_phrase côté client.
// Utilise le service_role pour updateUserById sans session active.
// Rate limiting : 5 tentatives / 15 min par IP stockées en mémoire Deno.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = new Set([
  'https://aevyra.uk',
  'https://www.aevyra.uk',
  'https://app.aevyra.uk',
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : 'https://aevyra.uk';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

// ── Rate limiter in-memory ──────────────────────────────────────────────────
// Chaque instance Deno partage cet état — suffisant pour limiter les abus.
// 5 tentatives / 15 minutes par IP.
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 min
const RATE_MAX       = 5;
const ipBucket = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipBucket.get(ip);
  if (!entry || now >= entry.resetAt) {
    ipBucket.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true; // autorisé
  }
  if (entry.count >= RATE_MAX) return false; // bloqué
  entry.count++;
  return true;
}

const json = (body: unknown, status: number, req: Request) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405, req);

  // ── Extraction IP ─────────────────────────────────────────────────────────
  const ip =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown';

  // Client service_role pour les logs et la blacklist
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // ── Vérifier blacklist IP persistante (DB) ────────────────────────────────
  // Seulement si on a une vraie IP (éviter de bannir tous les appels sans Cloudflare)
  if (ip !== 'unknown') {
    const { data: isBanned } = await supabaseAdmin.rpc('is_ip_banned', { p_ip: ip });
    if (isBanned) {
      await new Promise(r => setTimeout(r, 4000)); // Tarpit IPs bannies
      return json({ error: 'Trop de tentatives. Contactez le support.' }, 429, req);
    }
  }

  // ── Rate limiting in-memory (première barrière, rapide) ───────────────────
  if (!checkRateLimit(ip)) {
    // Log l'événement brute-force en DB pour déclencher le ban auto
    await supabaseAdmin.rpc('log_security_event', {
      p_event_type: 'brute_force',
      p_ip: ip,
      p_user_id: null,
      p_endpoint: 'reset-password-by-phrase',
      p_payload: { reason: 'rate_limit_in_memory_exceeded' },
      p_severity: 'high',
    });
    return json(
      { error: 'Trop de tentatives. Veuillez patienter 15 minutes.' },
      429,
      req,
    );
  }

  try {
    const body = await req.json();
    const { email, new_password } = body as { email?: string; new_password?: string };

    // Validation de base
    if (!email || !new_password) {
      return json({ error: 'Paramètres manquants.' }, 400, req);
    }
    if (typeof new_password !== 'string' || new_password.length < 6) {
      return json({ error: 'Mot de passe : 6 caractères minimum.' }, 400, req);
    }
    // Vérifier que l'email correspond au domaine interne — jamais d'email réel accepté
    if (!email.endsWith('@amour-app.fr')) {
      return json({ error: 'Domaine non autorisé.' }, 403, req);
    }

    const { data: authUser, error: authUserErr } = await supabaseAdmin.auth.admin
      .getUserByEmail(email);

    // Réponse identique si l'utilisateur n'existe pas → pas d'énumération d'emails
    if (authUserErr || !authUser?.user) {
      // Log tentative sur email inexistant/invalide (signal de scan)
      await supabaseAdmin.rpc('log_security_event', {
        p_event_type: 'brute_force',
        p_ip: ip,
        p_user_id: null,
        p_endpoint: 'reset-password-by-phrase',
        p_payload: { reason: 'unknown_email_attempt', domain: email.split('@')[1] ?? '' },
        p_severity: 'medium',
      });
      return json({ success: true }, 200, req);
    }

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      authUser.user.id,
      { password: new_password },
    );
    if (updateErr) throw updateErr;

    return json({ success: true }, 200, req);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur interne.';
    return json({ error: msg }, 500, req);
  }
});
