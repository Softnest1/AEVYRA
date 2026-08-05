// ============================================================
// Edge Function : honeypot
// Routes leurres qui piègent les scanners et attaquants.
// Toute requête ici = activité malveillante → ban immédiat.
// Routes leurres communes : /wp-admin, /.env, /config, /phpmyadmin...
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

// Routes leurres — toute correspondance = attaquant confirmé
// Cette liste est UNIQUEMENT déclarative : la fonction est dédiée honeypot,
// donc TOUTE requête qui l'atteint est par définition suspecte.
// On conserve la liste pour filtrer les fausses réponses et pour le logging.
const _HONEYPOT_ROUTES = new Set([
  '/wp-admin', '/wp-login.php', '/wordpress/wp-login.php',
  '/.env', '/.env.local', '/.env.production', '/.env.backup',
  '/config.php', '/config.json', '/configuration.php',
  '/phpmyadmin', '/pma', '/mysql', '/adminer',
  '/api/v1/admin', '/api/admin/users', '/api/admin/config',
  '/admin/config', '/admin/backup', '/admin/db',
  '/.git/config', '/.git/HEAD',
  '/backup.sql', '/dump.sql', '/database.sql',
  '/server-status', '/server-info',
  '/actuator', '/actuator/env', '/actuator/health',
  '/api/swagger.json', '/api-docs',
  '/shell.php', '/cmd.php', '/eval.php', '/exec.php',
]);

// Note d'architecture : cette Edge Function n'est appelée QUE si le routeur
// Supabase/Cloudflare la dirige explicitement vers /honeypot/*.
// Un utilisateur légitime ne l'atteint JAMAIS car l'app n'appelle aucune de ces routes.

// Fausses "données" retournées au scanner pour le faire perdre du temps
const FAKE_RESPONSES: Record<string, unknown> = {
  '/.env': {
    DB_HOST: '10.0.0.1', DB_USER: 'admin', DB_PASS: 'REDACTED',
    APP_SECRET: 'honey_' + Math.random().toString(36).slice(2),
    STRIPE_SECRET: 'sk_live_HONEY_TRAP_NOT_REAL',
  },
  '/wp-admin': '<html><body>WordPress Admin — Loading...</body></html>',
  '/phpmyadmin': '<html><body>phpMyAdmin — Connecting...</body></html>',
  '/config.json': { version: '2.1.0', debug: true, admin_token: 'HONEY_TRAP' },
};

// Délai artificiel pour faire perdre du temps à l'attaquant (tarpit)
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: makeCORS(req) });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/honeypot', '') || '/';
  const ip =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown';
  const userAgent = req.headers.get('user-agent') ?? '';

  // Initialiser le client Supabase (service_role pour écrire les logs)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Collecter le payload de manière sécurisée (sans crasher)
  let bodySnippet = '';
  try {
    if (req.method === 'POST') {
      const text = await req.text();
      // Tronquer à 500 chars — on n'a pas besoin de plus pour l'analyse
      bodySnippet = text.slice(0, 500);
    }
  } catch { /* ignore */ }

  // Enregistrer le déclenchement honeypot + ban automatique via la fonction SQL
  const [logResult] = await Promise.all([
    supabase.rpc('log_security_event', {
      p_event_type: 'honeypot_hit',
      p_ip: ip,
      p_user_id: null,
      p_endpoint: path,
      p_payload: {
        method: req.method,
        path,
        user_agent: userAgent.slice(0, 200),
        body_snippet: bodySnippet,
        headers: {
          accept: req.headers.get('accept'),
          referer: req.headers.get('referer'),
        },
      },
      p_severity: 'critical',
    }),
    // Enregistrer dans honeypot_triggers pour analyse séparée
    supabase.from('honeypot_triggers').insert({
      route: path,
      ip_address: ip,
      user_agent: userAgent.slice(0, 500),
    }),
  ]);

  console.log(`[HONEYPOT] IP=${ip} PATH=${path} EVENT=${logResult.data} BANNED=true`);

  // ── Tarpit : faire croire que la ressource existe, ralentir le scan ──
  // Délai de 3-8 secondes pour épuiser les ressources du scanner
  await sleep(3000 + Math.floor(Math.random() * 5000));

  // Retourner une fausse réponse convaincante selon la route
  const fakeData = FAKE_RESPONSES[path];
  if (fakeData) {
    const isHtml = typeof fakeData === 'string' && fakeData.includes('<html>');
    return new Response(
      typeof fakeData === 'string' ? fakeData : JSON.stringify(fakeData),
      {
        status: 200,
        headers: {
          ...makeCORS(req),
          'Content-Type': isHtml ? 'text/html' : 'application/json',
          'X-Powered-By': 'PHP/7.4.3', // Faux header pour tromper les scanners
          'Server': 'Apache/2.4.41',
        },
      },
    );
  }

  // Route générique : réponse 200 vide (ne pas laisser deviner si la route existe)
  return new Response(
    JSON.stringify({ status: 'ok', message: 'Processing...' }),
    {
      status: 200,
      headers: {
        ...makeCORS(req),
        'Content-Type': 'application/json',
        'X-Powered-By': 'PHP/7.4.3',
      },
    },
  );
});
