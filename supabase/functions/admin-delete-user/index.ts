// Edge Function — suppression complète d'un compte utilisateur (RGPD art. 17)
// Usage : POST { "user_id": "uuid" }
// Sécurité : seul l'utilisateur lui-même peut supprimer son propre compte
// Ordre : 1) purge Storage → 2) deleteUser auth (cascade DB automatique)
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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

const json = (body: unknown, status: number, req: Request) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...makeCORS(req), 'Content-Type': 'application/json' },
  });

// Buckets Storage à purger pour cet utilisateur
const BUCKETS = ['avatars', 'assets', 'voice-messages'];

// Purge tous les fichiers d'un bucket dont le chemin commence par user_id/
async function purgeUserBucket(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  userId: string,
): Promise<{ bucket: string; deleted: number; errors: string[] }> {
  const errors: string[] = [];
  let deleted = 0;

  // Lister les fichiers dans le dossier userId/
  const { data: files, error: listErr } = await admin.storage
    .from(bucket)
    .list(userId, { limit: 1000 });

  if (listErr) {
    // Dossier inexistant = pas de fichiers → non bloquant
    return { bucket, deleted: 0, errors: [] };
  }
  if (!files || files.length === 0) return { bucket, deleted: 0, errors: [] };

  const paths = files.map(f => `${userId}/${f.name}`);
  const { error: removeErr } = await admin.storage.from(bucket).remove(paths);

  if (removeErr) {
    errors.push(`${bucket}: ${removeErr.message}`);
  } else {
    deleted = paths.length;
  }

  return { bucket, deleted, errors };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: makeCORS(req) });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405, req);

  try {
    const { user_id } = await req.json() as { user_id?: string };
    if (!user_id || typeof user_id !== 'string') {
      return json({ error: 'user_id requis.' }, 400, req);
    }

    const authHeader = req.headers.get('authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Non authentifié.' }, 401, req);

    // Client admin service_role — uniquement côté serveur, jamais exposé au client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 1. Vérifier l'identité de l'appelant via son JWT
    const jwt = authHeader.slice(7);
    const { data: { user: caller }, error: callerErr } = await supabaseAdmin.auth.getUser(jwt);
    if (callerErr || !caller) return json({ error: 'Non authentifié.' }, 401, req);

    // 2. Autorisation : seul l'utilisateur peut supprimer son propre compte
    if (caller.id !== user_id) return json({ error: 'Accès refusé.' }, 403, req);

    // 3. Purger les fichiers Storage avant la suppression auth
    //    (après deleteUser, le service_role ne peut plus lister les fichiers orphelins)
    const storageResults = await Promise.all(
      BUCKETS.map(bucket => purgeUserBucket(supabaseAdmin, bucket, user_id))
    );
    const storageErrors = storageResults.flatMap(r => r.errors);
    const totalFilesDeleted = storageResults.reduce((sum, r) => sum + r.deleted, 0);

    // 4. Supprimer le compte auth — la cascade FK supprime automatiquement :
    //    profiles, messages, likes, matches, connections, notifications, blocks,
    //    reports, user_badges, user_challenges, user_streaks, user_reload_offsets,
    //    grace_requests, video_calls, call_challenges, roman_likes, sanctions,
    //    favoris, referrals, star_readings, temoignages, vibration_answers,
    //    event_inscriptions, daily_notif_log, push_tokens
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (deleteErr) {
      return json({
        error: `Échec suppression auth : ${deleteErr.message}`,
        storage_purged: totalFilesDeleted,
        storage_errors: storageErrors,
      }, 500, req);
    }

    return json({
      success: true,
      deleted_user_id: user_id,
      storage: {
        files_deleted: totalFilesDeleted,
        buckets: storageResults.map(r => ({ bucket: r.bucket, deleted: r.deleted })),
        errors: storageErrors.length > 0 ? storageErrors : undefined,
      },
      db: 'cascade automatique via FK auth.users → toutes les tables',
    }, 200, req);

  } catch (e) {
    return json({ error: String(e) }, 500, req);
  }
});
