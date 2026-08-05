// Edge Function : video-call-signal
// Gère la signalisation WebRTC : créer un appel, accepter, ICE candidates, raccrocher
// Sécurité : extraction IP Cloudflare + vérification ban avant tout traitement
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

/** Extraire l'IP réelle depuis les headers Cloudflare/proxy */
function getClientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown'
  );
}

const json = (data: unknown, status = 200, req: Request) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });

  // ── Extraction IP Cloudflare (avant toute auth) ───────────────────────
  const ip = getClientIp(req);

  // ── Authentifier l'utilisateur via JWT (anon key + Bearer) ───────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Non authentifié' }, 401, req);

  // Client anon + JWT utilisateur — seule façon correcte de valider un JWT utilisateur
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return json({ error: 'Token invalide' }, 401, req);

  // Client service_role — uniquement pour les opérations DB (bypass RLS contrôlé)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // ── Vérifier IP bannie (défense en profondeur après auth) ────────────
  if (ip !== 'unknown') {
    const { data: isBanned } = await supabase.rpc('is_ip_banned', { p_ip: ip });
    if (isBanned) {
      await supabase.rpc('log_security_event', {
        p_event_type: 'banned_ip_video_attempt',
        p_ip: ip,
        p_user_id: user.id,
        p_endpoint: 'video-call-signal',
        p_payload: { action: 'blocked' },
        p_severity: 'high',
      });
      return json({ error: 'Accès refusé.' }, 403, req);
    }
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: 'Corps JSON invalide' }, 400, req); }
  const { action } = body;

  // ── Action : initier un appel ─────────────────────────────────
  if (action === 'initiate') {
    const { callee_id } = body;
    if (!callee_id) return json({ error: 'callee_id requis' }, 400, req);
    if (callee_id === user.id) return json({ error: "Impossible d'appeler vous-même" }, 400, req);

    // Vérifier qu'il n'y a pas déjà un appel actif entre ces deux
    const { data: existing } = await supabase.from('video_calls')
      .select('id,status')
      .or(`and(caller_id.eq.${user.id},callee_id.eq.${callee_id}),and(caller_id.eq.${callee_id},callee_id.eq.${user.id})`)
      .in('status', ['ringing', 'challenge_pending', 'in_progress'])
      .maybeSingle();
    if (existing) return json({ error: 'Un appel est déjà en cours', call_id: existing.id }, 409, req);

    // Tirer 3 questions aléatoires pour chaque participant
    const { data: allQ, error: qErr } = await supabase
      .from('call_challenge_questions')
      .select('id,question,options,answer_idx,category');
    if (qErr || !allQ || allQ.length < 3) return json({ error: 'Questions insuffisantes' }, 500, req);
    const shuffle = (arr: unknown[]) => [...arr].sort(() => Math.random() - 0.5);
    const pick3 = () => shuffle(allQ).slice(0, 3).map((q: Record<string, unknown>) => ({
      id: q.id, question: q.question, options: q.options, answer_idx: q.answer_idx,
    }));

    // Créer l'appel
    const { data: call, error: callErr } = await supabase.from('video_calls')
      .insert({ caller_id: user.id, callee_id, status: 'ringing' })
      .select('id').single();
    if (callErr || !call) return json({ error: callErr?.message ?? 'Erreur création appel' }, 500, req);

    // Créer les épreuves pour les deux participants
    const { error: challengeErr } = await supabase.from('call_challenges').insert([
      { call_id: call.id, user_id: user.id,   questions: pick3() },
      { call_id: call.id, user_id: callee_id, questions: pick3() },
    ]);
    if (challengeErr) return json({ error: challengeErr.message }, 500, req);

    // Passer en challenge_pending
    await supabase.from('video_calls').update({ status: 'challenge_pending' }).eq('id', call.id);

    return json({ call_id: call.id }, 200, req);
  }

  // ── Action : soumettre les réponses à l'épreuve ───────────────
  if (action === 'submit_challenge') {
    const { call_id, answers } = body;
    if (!call_id || !answers) return json({ error: 'call_id et answers requis' }, 400, req);

    const { data: challenge } = await supabase.from('call_challenges')
      .select('id,questions,passed')
      .eq('call_id', call_id).eq('user_id', user.id).maybeSingle();
    if (!challenge) return json({ error: 'Épreuve introuvable' }, 404, req);
    if (challenge.passed !== null) return json({ error: 'Épreuve déjà soumise', passed: challenge.passed }, 409, req);

    const questions = challenge.questions as { answer_idx: number }[];
    let correct = 0;
    questions.forEach((q, i) => { if ((answers as Record<number, number>)[i] === q.answer_idx) correct++; });
    const passed = correct >= 2;

    await supabase.from('call_challenges')
      .update({ answers, passed, completed_at: new Date().toISOString() })
      .eq('id', challenge.id);

    const { data: call } = await supabase.from('video_calls')
      .select('caller_id,callee_id,caller_passed,callee_passed')
      .eq('id', call_id).maybeSingle();
    if (call) {
      const isCaller = call.caller_id === user.id;
      await supabase.from('video_calls')
        .update(isCaller ? { caller_passed: passed } : { callee_passed: passed })
        .eq('id', call_id);

      const callerOk = isCaller ? passed : call.caller_passed;
      const calleeOk = isCaller ? call.callee_passed : passed;
      if (callerOk === true && calleeOk === true) {
        await supabase.from('video_calls')
          .update({ status: 'in_progress', started_at: new Date().toISOString() })
          .eq('id', call_id);
      } else if (callerOk === false || calleeOk === false) {
        await supabase.from('video_calls')
          .update({ status: 'ended', ended_at: new Date().toISOString() })
          .eq('id', call_id);
      }
    }

    return json({ passed, correct, total: 3 }, 200, req);
  }

  // ── Action : envoyer l'offer SDP (appelant) ───────────────────
  if (action === 'send_offer') {
    const { call_id, offer_sdp } = body;
    if (!call_id || !offer_sdp) return json({ error: 'call_id et offer_sdp requis' }, 400, req);
    const { error } = await supabase.from('video_calls')
      .update({ offer_sdp })
      .eq('id', call_id)
      .eq('caller_id', user.id);
    if (error) return json({ error: error.message }, 500, req);
    return json({ ok: true }, 200, req);
  }

  // ── Action : envoyer l'answer SDP (appelé) ───────────────────
  if (action === 'send_answer') {
    const { call_id, answer_sdp } = body;
    if (!call_id || !answer_sdp) return json({ error: 'call_id et answer_sdp requis' }, 400, req);
    const { error } = await supabase.from('video_calls')
      .update({ answer_sdp })
      .eq('id', call_id)
      .eq('callee_id', user.id);
    if (error) return json({ error: error.message }, 500, req);
    return json({ ok: true }, 200, req);
  }

  // ── Action : ajouter un ICE candidate (RPC atomique) ─────────
  if (action === 'add_ice') {
    const { call_id, candidate } = body;
    if (!call_id || !candidate) return json({ error: 'call_id et candidate requis' }, 400, req);
    const { data: call } = await supabase.from('video_calls')
      .select('caller_id,callee_id')
      .eq('id', call_id).maybeSingle();
    if (!call) return json({ error: 'Appel introuvable' }, 404, req);
    const field = call.caller_id === user.id ? 'caller_ice' : 'callee_ice';
    // Append atomique via RPC — évite la race condition de lecture-modification-écriture
    const { error: iceErr } = await supabase.rpc('append_ice_candidate', {
      p_call_id: call_id,
      p_field: field,
      p_candidate: candidate,
    });
    if (iceErr) return json({ error: iceErr.message }, 500, req);
    return json({ ok: true }, 200, req);
  }

  // ── Action : raccrocher ───────────────────────────────────────
  if (action === 'hangup') {
    const { call_id } = body;
    if (!call_id) return json({ error: 'call_id requis' }, 400, req);
    await supabase.from('video_calls')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', call_id)
      .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`);
    return json({ ok: true }, 200, req);
  }

  // ── Action : rejeter l'appel ──────────────────────────────────
  if (action === 'reject') {
    const { call_id } = body;
    if (!call_id) return json({ error: 'call_id requis' }, 400, req);
    await supabase.from('video_calls')
      .update({ status: 'rejected', ended_at: new Date().toISOString() })
      .eq('id', call_id)
      .eq('callee_id', user.id);
    return json({ ok: true }, 200, req);
  }

  // ── Action : lire l'état de l'appel (polling) ─────────────────
  if (action === 'get_call') {
    const { call_id } = body;
    if (!call_id) return json({ error: 'call_id requis' }, 400, req);
    const { data: call } = await supabase.from('video_calls')
      .select('*').eq('id', call_id).maybeSingle();
    if (!call) return json({ error: 'Appel introuvable' }, 404, req);
    if (call.caller_id !== user.id && call.callee_id !== user.id)
      return json({ error: 'Accès refusé' }, 403, req);
    const { data: challenge } = await supabase.from('call_challenges')
      .select('questions,answers,passed')
      .eq('call_id', call_id).eq('user_id', user.id).maybeSingle();
    return json({ call, challenge }, 200, req);
  }

  // ── Action : appel entrant (polling depuis l'appelé) ─────────
  if (action === 'check_incoming') {
    const { data: incoming } = await supabase.from('video_calls')
      .select('id,caller_id,status,created_at')
      .eq('callee_id', user.id)
      .in('status', ['ringing', 'challenge_pending'])
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle();
    return json({ incoming }, 200, req);
  }

  return json({ error: 'Action inconnue' }, 400, req);
});
