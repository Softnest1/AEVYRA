// Edge Function : admin-api
// Actions : stats, list_users, ban, unban, verify, delete_user,
//           list_reports, resolve_report, list_messages, delete_message,
//           list_events, grant_admin, revoke_admin,
//           apply_sanction, lift_sanction, list_sanctions,
//           list_grace_requests, review_grace
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Origines autorisées — jamais de wildcard sur une fonction admin
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

const json = (data: unknown, status: number, req: Request) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });

  const ip =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown';

  // Client service_role — contourne RLS pour les actions admin
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // ── Vérifier si l'IP est bannie avant tout traitement ────────────
  // Seulement si on a une vraie IP (pas 'unknown' = pas de header CF)
  if (ip !== 'unknown') {
    const { data: isBanned } = await supabase.rpc('is_ip_banned', { p_ip: ip });
    if (isBanned) {
      await sleep(5000); // Tarpit : ralentir les IPs bannies
      return json({ error: 'Accès refusé.' }, 403, req);
    }
  }

  // ── Authentifier l'appelant ───────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    // Appel sans aucun token sur une route admin → très suspect, log immédiat
    await supabase.rpc('log_security_event', {
      p_event_type: 'unauthorized_admin',
      p_ip: ip,
      p_user_id: null,
      p_endpoint: 'admin-api',
      p_payload: { method: req.method, user_agent: req.headers.get('user-agent')?.slice(0, 200) },
      p_severity: 'high',
    });
    await sleep(3000); // Tarpit
    return json({ error: 'Non authentifié' }, 401, req);
  }

  // Client avec JWT utilisateur pour vérifier son identité
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    // Distinguer token expiré (erreur attendue) d'un JWT forgé (suspect)
    const isExpired = authErr?.message?.toLowerCase().includes('expired') ||
                      authErr?.message?.toLowerCase().includes('jwt');
    if (!isExpired) {
      // JWT structurellement invalide = forgé → log uniquement dans ce cas
      await supabase.rpc('log_security_event', {
        p_event_type: 'invalid_jwt',
        p_ip: ip,
        p_user_id: null,
        p_endpoint: 'admin-api',
        p_payload: { error: authErr?.message },
        p_severity: 'high',
      });
    }
    return json({ error: 'Non authentifié — reconnectez-vous.' }, 401, req);
  }

  // ── Vérifier que l'utilisateur est admin ─────────────────────────
  const { data: adminRow } = await supabase
    .from('admin_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!adminRow) {
    // Utilisateur authentifié qui tente d'accéder à l'API admin → log critique
    await supabase.rpc('log_security_event', {
      p_event_type: 'unauthorized_admin',
      p_ip: ip,
      p_user_id: user.id,
      p_endpoint: 'admin-api',
      p_payload: { email: user.email?.replace(/(.{2}).*@/, '$1***@') }, // anonymisé
      p_severity: 'critical',
    });
    await sleep(5000); // Tarpit 5s pour ralentir le brute-force de rôles
    return json({ error: 'Accès refusé — non admin' }, 403, req);
  }
  const isSuperAdmin = adminRow.role === 'super_admin';

  // ── Parser l'action ──────────────────────────────────────────────
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* GET sans body */ }
  const action = (body.action ?? new URL(req.url).searchParams.get('action') ?? '') as string;

  // ── Logger l'action admin ────────────────────────────────────────
  const log = async (act: string, targetType?: string, targetId?: string, details?: unknown) => {
    await supabase.from('admin_logs').insert({
      admin_id: user.id, action: act,
      target_type: targetType, target_id: targetId,
      details: details ?? {},
    });
  };

  // ════════════════════════════════════════════════════════════════
  // ACTIONS
  // ════════════════════════════════════════════════════════════════

  // ── Statistiques globales ────────────────────────────────────────
  if (action === 'stats') {
    const { data } = await supabase.rpc('get_admin_stats');
    // Courbe inscriptions par jour (30 derniers jours)
    const { data: dailySignups } = await supabase.rpc('admin_daily_signups', { days: 30 }).catch(() => ({ data: [] }));
    return json({ stats: data?.[0] ?? null, dailySignups: dailySignups ?? [] }, 200, req);
  }

  // ── Liste utilisateurs ───────────────────────────────────────────
  if (action === 'list_users') {
    const page   = Number(body.page ?? 0);
    const limit  = Number(body.limit ?? 50);
    const search = (body.search as string | undefined) ?? '';
    const filter = (body.filter as string | undefined) ?? 'all'; // all | banned | verified | unverified

    let query = supabase
      .from('profiles')
      .select('id, prenom, age, genre, ville, photo_url, is_verified, is_banned, banned_reason, banned_at, admin_notes, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    if (search) query = query.ilike('prenom', `%${search}%`);
    if (filter === 'banned')     query = query.eq('is_banned', true);
    if (filter === 'verified')   query = query.eq('is_verified', true);
    if (filter === 'unverified') query = query.eq('is_verified', false);

    const { data, count, error } = await query;
    if (error) return json({ error: error.message }, 500, req);
    return json({ users: data, total: count }, 200, req);
  }

  // ── Bannir un utilisateur (legacy + nouveau système unifié) ─────
  if (action === 'ban_user') {
    const targetId = body.user_id as string;
    const reason   = (body.reason as string | undefined) ?? 'Violation des conditions';
    if (!targetId) return json({ error: 'user_id requis' }, 400, req);

    // Toutes les gardes (admin, self-ban, raison) sont dans apply_sanction()
    // → passer directement par la fonction SECURITY DEFINER, source unique de vérité.
    // apply_sanction() gère : expire les actives, insert la nouvelle, met à jour profiles.
    const { data: sanction, error: sanctionErr } = await supabase.rpc('apply_sanction', {
      p_user_id:  targetId,
      p_admin_id: user.id,
      p_type:     'ban_permanent',
      p_reason:   reason.trim(),
      p_duration: null,
      p_mission:  null,
      p_target:   1,
    });

    if (sanctionErr) {
      // Extraire le message métier de l'exception SQL (ex: PROTECTED_USER, REASON_TOO_SHORT)
      const msg = sanctionErr.message?.match(/: (.+)$/)?.[1] ?? sanctionErr.message;
      return json({ error: msg }, 400, req);
    }

    await log('ban_user', 'user', targetId, { reason, sanction_id: sanction?.id });
    return json({ success: true }, 200, req);
  }

  // ── Débannir un utilisateur ──────────────────────────────────────
  if (action === 'unban_user') {
    const targetId = body.user_id as string;
    if (!targetId) return json({ error: 'user_id requis' }, 400, req);

    // Récupérer toutes les sanctions ban actives
    const { data: activeSanctions } = await supabase
      .from('sanctions')
      .select('id')
      .eq('user_id', targetId)
      .in('status', ['active', 'permanent'])
      .in('type', ['ban_temp', 'ban_permanent']);

    // Lever chaque sanction via lift_sanction() — qui gère la sync profil
    if (activeSanctions && activeSanctions.length > 0) {
      await Promise.all(
        activeSanctions.map(s =>
          supabase.rpc('lift_sanction', { p_sanction_id: s.id, p_admin_id: user.id })
        )
      );
    }

    // Forcer la sync profil (double sécurité — trigger + update direct)
    await supabase.from('profiles').update({
      is_banned: false, banned_at: null, banned_reason: null,
    }).eq('id', targetId);

    await log('unban_user', 'user', targetId, { sanctions_lifted: activeSanctions?.length ?? 0 });
    return json({ success: true }, 200, req);
  }

  // ── Vérifier un utilisateur (coeur vérifié) ──────────────────────
  if (action === 'verify_user') {
    const targetId = body.user_id as string;
    const verified = body.verified as boolean ?? true;
    if (!targetId) return json({ error: 'user_id requis' }, 400, req);
    const { error } = await supabase.from('profiles').update({ is_verified: verified }).eq('id', targetId);
    if (error) return json({ error: error.message }, 500, req);
    await log(verified ? 'verify_user' : 'unverify_user', 'user', targetId);
    return json({ success: true }, 200, req);
  }

  // ── Ajouter une note admin sur un profil ─────────────────────────
  if (action === 'note_user') {
    const targetId = body.user_id as string;
    const note     = body.note as string;
    if (!targetId) return json({ error: 'user_id requis' }, 400, req);
    const { error } = await supabase.from('profiles').update({ admin_notes: note }).eq('id', targetId);
    if (error) return json({ error: error.message }, 500, req);
    await log('note_user', 'user', targetId, { note });
    return json({ success: true }, 200, req);
  }

  // ── Supprimer un utilisateur ─────────────────────────────────────
  if (action === 'delete_user') {
    if (!isSuperAdmin) return json({ error: 'Réservé aux super admins' }, 403, req);
    const targetId = body.user_id as string;
    if (!targetId) return json({ error: 'user_id requis' }, 400, req);
    const { error } = await supabase.auth.admin.deleteUser(targetId);
    if (error) return json({ error: error.message }, 500, req);
    await log('delete_user', 'user', targetId);
    return json({ success: true }, 200, req);
  }

  // ── Liste signalements ───────────────────────────────────────────
  if (action === 'list_reports') {
    const status = (body.status as string | undefined) ?? 'pending';
    // Inclut nb_signalements + auto_suspended + score_fiabilite du signalé pour décision admin éclairée
    const { data, error } = await supabase
      .from('reports')
      .select(`
        id, reason, details, status, created_at, reviewed_at, reviewed_by,
        reporter:reporter_id(prenom, photo_url),
        reported:reported_id(id, prenom, pseudo, photo_url, nb_signalements, auto_suspended, score_fiabilite, is_banned)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return json({ error: error.message }, 500, req);
    return json({ reports: data }, 200, req);
  }

  // ── Résoudre un signalement ──────────────────────────────────────
  if (action === 'resolve_report') {
    const reportId  = body.report_id as string;
    const newStatus = (body.status as string | undefined) ?? 'resolved';
    if (!reportId) return json({ error: 'report_id requis' }, 400, req);
    const { error } = await supabase.from('reports').update({
      status: newStatus, reviewed_by: user.id, reviewed_at: new Date().toISOString(),
    }).eq('id', reportId);
    if (error) return json({ error: error.message }, 500, req);
    await log('resolve_report', 'report', reportId, { status: newStatus });
    return json({ success: true }, 200, req);
  }

  // ── Liste messages (avec filtre) ─────────────────────────────────
  if (action === 'list_messages') {
    const convId  = body.conversation_id as string | undefined;
    const userId2 = body.user_id as string | undefined;
    const page    = Number(body.page ?? 0);
    let query = supabase
      .from('messages')
      .select('id, content, sender_id, created_at, is_deleted, sender:sender_id(prenom)')
      .order('created_at', { ascending: false })
      .range(page * 50, (page + 1) * 50 - 1);
    if (convId)  query = query.eq('conversation_id', convId);
    if (userId2) query = query.eq('sender_id', userId2);
    const { data, error } = await query;
    if (error) return json({ error: error.message }, 500, req);
    return json({ messages: data }, 200, req);
  }

  // ── Supprimer un message ─────────────────────────────────────────
  if (action === 'delete_message') {
    const msgId = body.message_id as string;
    if (!msgId) return json({ error: 'message_id requis' }, 400, req);
    const { error } = await supabase.from('messages').update({ is_deleted: true, content: '[Message supprimé par admin]' }).eq('id', msgId);
    if (error) return json({ error: error.message }, 500, req);
    await log('delete_message', 'message', msgId);
    return json({ success: true }, 200, req);
  }

  // ── Événements ───────────────────────────────────────────────────
  if (action === 'list_events') {
    const { data, error } = await supabase
      .from('events').select('*').order('date', { ascending: false }).limit(50);
    if (error) return json({ error: error.message }, 500, req);
    return json({ events: data }, 200, req);
  }

  if (action === 'create_event') {
    const { titre, description, date, lieu, image_url } = body as Record<string, string>;
    const { data, error } = await supabase.from('events').insert({ titre, description, date, lieu, image_url }).select().single();
    if (error) return json({ error: error.message }, 500, req);
    await log('create_event', 'event', data.id);
    return json({ event: data }, 200, req);
  }

  if (action === 'delete_event') {
    const evtId = body.event_id as string;
    if (!evtId) return json({ error: 'event_id requis' }, 400, req);
    const { error } = await supabase.from('events').delete().eq('id', evtId);
    if (error) return json({ error: error.message }, 500, req);
    await log('delete_event', 'event', evtId);
    return json({ success: true }, 200, req);
  }

  // ── Témoignages (table unifiée : temoignages) ────────────────────
  if (action === 'list_testimonials') {
    const { data, error } = await supabase
      .from('temoignages')
      .select('*, user:user_id(prenom, photo_url)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return json({ error: error.message }, 500, req);
    // Normaliser les champs pour compatibilité avec le frontend admin
    const testimonials = (data ?? []).map((t: Record<string, unknown>) => ({
      id:          t.id,
      user_id:     t.user_id,
      content:     t.texte,          // temoignages.texte → content
      is_approved: t.approuve,       // temoignages.approuve → is_approved
      created_at:  t.created_at,
      user:        t.user,
    }));
    return json({ testimonials }, 200, req);
  }

  if (action === 'approve_testimonial') {
    const tId  = body.testimonial_id as string;
    const approved = body.approved as boolean ?? true;
    if (!tId) return json({ error: 'testimonial_id requis' }, 400, req);
    const { error } = await supabase.from('temoignages').update({ approuve: approved }).eq('id', tId);
    if (error) return json({ error: error.message }, 500, req);
    await log(approved ? 'approve_testimonial' : 'reject_testimonial', 'testimonial', tId);
    return json({ success: true }, 200, req);
  }

  // ── Logs admin ───────────────────────────────────────────────────
  if (action === 'list_logs') {
    const { data, error } = await supabase
      .from('admin_logs')
      .select('*, admin:admin_id(prenom)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return json({ error: error.message }, 500, req);
    return json({ logs: data }, 200, req);
  }

  // ── Gestion des admins (super_admin uniquement) ──────────────────
  if (action === 'grant_admin') {
    if (!isSuperAdmin) return json({ error: 'Réservé aux super admins' }, 403, req);
    const targetId = body.user_id as string;
    const role     = (body.role as string | undefined) ?? 'admin';
    if (!targetId) return json({ error: 'user_id requis' }, 400, req);
    const { error } = await supabase.from('admin_roles').upsert({
      user_id: targetId, role, granted_by: user.id,
    }, { onConflict: 'user_id' });
    if (error) return json({ error: error.message }, 500, req);
    await log('grant_admin', 'user', targetId, { role });
    return json({ success: true }, 200, req);
  }

  if (action === 'revoke_admin') {
    if (!isSuperAdmin) return json({ error: 'Réservé aux super admins' }, 403, req);
    const targetId = body.user_id as string;
    if (!targetId) return json({ error: 'user_id requis' }, 400, req);
    const { error } = await supabase.from('admin_roles').delete().eq('user_id', targetId);
    if (error) return json({ error: error.message }, 500, req);
    await log('revoke_admin', 'user', targetId);
    return json({ success: true }, 200, req);
  }

  // ── Appliquer une sanction (nouveau système) ─────────────────────
  if (action === 'apply_sanction') {
    const targetId = body.user_id as string;
    const sType    = body.type as string;   // warning | mute | ban_temp | ban_permanent
    const reason   = (body.reason as string | undefined) ?? 'Comportement inapproprié';
    const duration = body.duration_days != null ? Number(body.duration_days) : null;
    const mission  = (body.mission as string | undefined) ?? null;
    const mTarget  = body.mission_target != null ? Number(body.mission_target) : 1;
    if (!targetId || !sType) return json({ error: 'user_id et type requis' }, 400, req);
    const { data, error } = await supabase.rpc('apply_sanction', {
      p_user_id: targetId, p_admin_id: user.id,
      p_type: sType, p_reason: reason,
      p_duration: duration, p_mission: mission, p_target: mTarget,
    });
    if (error) return json({ error: error.message }, 500, req);
    await log('apply_sanction', 'user', targetId, { type: sType, reason, duration, mission });
    return json({ sanction: data }, 200, req);
  }

  // ── Lever une sanction manuellement ─────────────────────────────
  if (action === 'lift_sanction') {
    const sanctionId = body.sanction_id as string;
    if (!sanctionId) return json({ error: 'sanction_id requis' }, 400, req);
    const { error } = await supabase.rpc('lift_sanction', {
      p_sanction_id: sanctionId, p_admin_id: user.id,
    });
    if (error) return json({ error: error.message }, 500, req);
    await log('lift_sanction', 'sanction', sanctionId);
    return json({ success: true }, 200, req);
  }

  // ── Liste des sanctions avec progression ─────────────────────────
  if (action === 'list_sanctions') {
    const statusFilter = (body.status as string | undefined) ?? 'active';
    const page  = Number(body.page ?? 0);
    const limit = 50;
    const { data, count, error } = await supabase
      .from('sanctions')
      .select(`
        id, type, reason, duration_days, expires_at, status,
        mission, mission_target, mission_progress, mission_done,
        created_at, lifted_at,
        user:user_id(id, prenom, photo_url, age, genre),
        admin:admin_id(prenom)
      `, { count: 'exact' })
      .eq('status', statusFilter)
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    if (error) return json({ error: error.message }, 500, req);
    return json({ sanctions: data, total: count }, 200, req);
  }

  // ── Demandes de grâce en attente ─────────────────────────────────
  if (action === 'list_grace_requests') {
    const { data, error } = await supabase
      .from('grace_requests')
      .select(`
        id, message, status, created_at,
        user:user_id(id, prenom, photo_url),
        sanction:sanction_id(type, reason, expires_at, mission_done)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) return json({ error: error.message }, 500, req);
    return json({ requests: data }, 200, req);
  }

  // ── Valider ou refuser une demande de grâce ──────────────────────
  if (action === 'review_grace') {
    const graceId  = body.grace_id as string;
    const approved = body.approved as boolean;
    if (!graceId || approved === undefined) return json({ error: 'grace_id et approved requis' }, 400, req);

    // Récupérer sanction_id
    const { data: graceRow, error: graceErr } = await supabase
      .from('grace_requests')
      .select('sanction_id, user_id')
      .eq('id', graceId)
      .single();
    if (graceErr || !graceRow) return json({ error: 'Demande introuvable' }, 404, req);

    // Mettre à jour la demande
    await supabase.from('grace_requests').update({
      status: approved ? 'approved' : 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    }).eq('id', graceId);

    if (approved) {
      // Lever la sanction
      await supabase.rpc('lift_sanction', {
        p_sanction_id: graceRow.sanction_id, p_admin_id: user.id,
      });
      // Attribuer badge réhabilité
      await supabase.from('profiles').update({ has_badge_rehabilite: true })
        .eq('id', graceRow.user_id);
    }

    await log(approved ? 'grace_approved' : 'grace_rejected', 'grace_request', graceId);
    return json({ success: true }, 200, req);
  }

  // ── Stats sanctions ──────────────────────────────────────────────
  if (action === 'sanctions_stats') {
    const { data, error } = await supabase.rpc('get_sanctions_stats');
    if (error) return json({ error: error.message }, 500, req);
    return json({ stats: data?.[0] ?? null }, 200, req);
  }

  return json({ error: `Action inconnue: ${action}` }, 400, req);
});
