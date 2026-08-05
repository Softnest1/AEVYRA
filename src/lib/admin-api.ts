// Aevyra — API Admin (appels vers Edge Function admin-api)
// Toutes les actions passent par l'Edge Function — jamais en client direct
import { supabase } from '@/client/supabase';

async function callAdmin<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-api', {
    body: { action, ...body },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as T;
}

// ── Stats ────────────────────────────────────────────────────────
export type AdminStats = {
  total_users: number; new_users_24h: number; new_users_7d: number;
  verified_users: number; banned_users: number;
  total_matches: number; matches_24h: number;
  total_messages: number; messages_24h: number;
  pending_reports: number; active_calls: number; total_calls: number;
};
export type DailySignup = { day: string; count: number };

export async function getAdminStats(): Promise<{ stats: AdminStats; dailySignups: DailySignup[] }> {
  return callAdmin('stats');
}

// ── Utilisateurs ─────────────────────────────────────────────────
export type AdminUser = {
  id: string; prenom: string; age: number; genre: string; ville: string;
  photo_url: string; is_verified: boolean; is_banned: boolean;
  banned_reason: string | null; banned_at: string | null;
  admin_notes: string | null; created_at: string;
  // Fiabilité & sécurité
  score_fiabilite: number | null;
  nb_signalements: number | null;
  auto_suspended: boolean | null;
  photo_verified: boolean | null;
};

export async function listAdminUsers(opts: {
  page?: number; search?: string; filter?: 'all' | 'banned' | 'verified' | 'unverified';
}): Promise<{ users: AdminUser[]; total: number }> {
  return callAdmin('list_users', { page: opts.page ?? 0, limit: 50, ...opts });
}

export async function banUser(userId: string, reason: string)    { return callAdmin('ban_user',    { user_id: userId, reason }); }
export async function unbanUser(userId: string)                   { return callAdmin('unban_user',  { user_id: userId }); }
export async function verifyUser(userId: string, v = true)        { return callAdmin('verify_user', { user_id: userId, verified: v }); }
export async function noteUser(userId: string, note: string)      { return callAdmin('note_user',   { user_id: userId, note }); }
export async function deleteUser(userId: string)                  { return callAdmin('delete_user', { user_id: userId }); }

// ── Signalements ─────────────────────────────────────────────────
export type Report = {
  id: string; reason: string; details: string | null; status: string; created_at: string;
  reviewed_at: string | null; reviewed_by: string | null;
  reporter: { prenom: string; photo_url: string } | null;
  reported: { prenom: string; photo_url: string } | null;
};

export async function listReports(status = 'pending'): Promise<{ reports: Report[] }> {
  return callAdmin('list_reports', { status });
}
export async function resolveReport(reportId: string, status: string) {
  return callAdmin('resolve_report', { report_id: reportId, status });
}

// ── Messages ─────────────────────────────────────────────────────
export type AdminMessage = {
  id: string; content: string; sender_id: string; created_at: string;
  is_deleted: boolean; sender: { prenom: string } | null;
};
export async function listMessages(opts: { user_id?: string; page?: number }): Promise<{ messages: AdminMessage[] }> {
  return callAdmin('list_messages', opts);
}
export async function deleteAdminMessage(messageId: string) {
  return callAdmin('delete_message', { message_id: messageId });
}

// ── Événements ───────────────────────────────────────────────────
export type AdminEvent = {
  id: string; titre: string; description: string; date: string; lieu: string; image_url: string;
};
export async function listEvents(): Promise<{ events: AdminEvent[] }>  { return callAdmin('list_events'); }
export async function createEvent(e: Omit<AdminEvent, 'id'>)            { return callAdmin('create_event', e as Record<string,unknown>); }
export async function deleteEvent(eventId: string)                      { return callAdmin('delete_event', { event_id: eventId }); }

// ── Témoignages ──────────────────────────────────────────────────
export type AdminTestimonial = {
  id: string; content: string; is_approved: boolean; created_at: string;
  user: { prenom: string; photo_url: string } | null;
};
export async function listTestimonials(): Promise<{ testimonials: AdminTestimonial[] }> {
  return callAdmin('list_testimonials');
}
export async function approveTestimonial(id: string, approved: boolean) {
  return callAdmin('approve_testimonial', { testimonial_id: id, approved });
}

// ── Logs ─────────────────────────────────────────────────────────
export type AdminLog = {
  id: string; action: string; target_type: string | null; target_id: string | null;
  details: Record<string,unknown>; created_at: string;
  admin: { prenom: string } | null;
};
export async function listAdminLogs(): Promise<{ logs: AdminLog[] }> { return callAdmin('list_logs'); }

// ── Gestion admins ────────────────────────────────────────────────
export async function grantAdmin(userId: string, role = 'admin') {
  return callAdmin('grant_admin', { user_id: userId, role });
}
export async function revokeAdmin(userId: string) {
  return callAdmin('revoke_admin', { user_id: userId });
}

// ── Sanctions & Réhabilitation ────────────────────────────────────
export type SanctionType = 'warning' | 'mute' | 'ban_temp' | 'ban_permanent';
export type MissionType =
  // ── Missions originales Aevyra ── (jamais vues ailleurs)
  | 'soul_letter'            // 💌 Lettre adressée à sa propre âme
  | 'vibration_reset'        // 🔮 Questionnaire d'introspection en 5 questions
  | 'star_reading'           // 🌠 Lire & commenter 3 profils inconnus
  | 'cosmic_kindness'        // 💜 Envoyer 5 likes sincères à de nouvelles âmes
  | 'mirror_oath'            // 🪞 Serment du miroir — réflexion profonde min. 80 chars
  | 'constellation_builder'  // ✨ Compléter son profil astrologique complet (4 champs)
  | 'healing_poem';          // 📿 Écrire un poème de guérison 3 lignes

export const MISSION_LABELS: Record<MissionType, string> = {
  soul_letter:           'Écrire une lettre à ton âme',
  vibration_reset:       'Réinitialisation vibratoire',
  star_reading:          'Lire l\'âme de 3 inconnu(e)s',
  cosmic_kindness:       'Répandre la bienveillance cosmique',
  mirror_oath:           'Le serment du miroir',
  constellation_builder: 'Bâtir sa constellation complète',
  healing_poem:          'Écrire un poème de guérison',
};

export const MISSION_EMOJIS: Record<MissionType, string> = {
  soul_letter:           '💌',
  vibration_reset:       '🔮',
  star_reading:          '🌠',
  cosmic_kindness:       '💜',
  mirror_oath:           '🪞',
  constellation_builder: '✨',
  healing_poem:          '📿',
};

// Description courte affichée dans l'écran de réhabilitation
export const MISSION_DESCRIPTIONS: Record<MissionType, string> = {
  soul_letter:
    'Écris une lettre sincère adressée à ta propre âme. Pas aux autres, pas aux admins — à toi. Qu\'est-ce que tu veux lui dire ? (min. 100 caractères)',
  vibration_reset:
    'Réponds à 5 questions d\'introspection Aevyra sur ton comportement et ce que tu as compris. Chaque réponse doit être sincère.',
  star_reading:
    'Visite 3 profils d\'inconnu(e)s et laisse un commentaire astrologique sincère sur chacun — signe, énergie, ressenti.',
  cosmic_kindness:
    'Envoie de la bienveillance sincère à 5 âmes que tu n\'as jamais approchées. Pas de spam — des likes authentiques.',
  mirror_oath:
    'Regarde-toi dans le miroir de ton âme et écris ce que tu as vraiment compris sur toi-même. Min. 80 caractères.',
  constellation_builder:
    'Complète ton profil astrologique à 100% : signe, ascendant, planète dominante et élément. Qui es-tu vraiment ?',
  healing_poem:
    'Écris un poème ou haïku de guérison — au moins 3 lignes. Laisse les mots te libérer.',
};

export const SANCTION_LABELS: Record<SanctionType, string> = {
  warning:       'Avertissement',
  mute:          'Mute temporaire',
  ban_temp:      'Ban temporaire',
  ban_permanent: 'Ban permanent',
};

export type AdminSanction = {
  id: string;
  type: SanctionType;
  reason: string;
  duration_days: number | null;
  expires_at: string | null;
  status: 'active' | 'expired' | 'lifted' | 'permanent';
  mission: MissionType | null;
  mission_target: number;
  mission_progress: number;
  mission_done: boolean;
  created_at: string;
  lifted_at: string | null;
  user: { id: string; prenom: string; photo_url: string; age: number; genre: string } | null;
  admin: { prenom: string } | null;
};

export type GraceRequest = {
  id: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user: { id: string; prenom: string; photo_url: string } | null;
  sanction: { type: SanctionType; reason: string; expires_at: string | null; mission_done: boolean } | null;
};

export type SanctionsStats = {
  total_active: number; total_bans: number; total_mutes: number;
  total_warnings: number; pending_graces: number;
};

export async function applySanction(opts: {
  user_id: string; type: SanctionType; reason: string;
  duration_days?: number | null; mission?: MissionType | null; mission_target?: number;
}): Promise<{ sanction: AdminSanction }> {
  return callAdmin('apply_sanction', opts as Record<string, unknown>);
}

export async function liftSanction(sanctionId: string): Promise<void> {
  return callAdmin('lift_sanction', { sanction_id: sanctionId });
}

export async function listSanctions(opts: {
  status?: 'active' | 'expired' | 'lifted' | 'permanent'; page?: number;
}): Promise<{ sanctions: AdminSanction[]; total: number }> {
  return callAdmin('list_sanctions', opts as Record<string, unknown>);
}

export async function listGraceRequests(): Promise<{ requests: GraceRequest[] }> {
  return callAdmin('list_grace_requests');
}

export async function reviewGrace(graceId: string, approved: boolean): Promise<void> {
  return callAdmin('review_grace', { grace_id: graceId, approved });
}

export async function getSanctionsStats(): Promise<{ stats: SanctionsStats }> {
  return callAdmin('sanctions_stats');
}
