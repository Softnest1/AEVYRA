// Aevyra – Couche API Supabase
import { supabase } from '@/client/supabase';
import { cacheRegistry, clearAllCaches } from './cache-store';
import { syncQueue, type PendingAction } from './sync-queue';
import { localTodayStr, weekStartFromStr } from './dateUtils';
export { clearAllCaches }; // ré-exporter pour usage dans sign-out
// expo-file-system est natif uniquement — non disponible sur Web (pas de stub)
// L'import conditionnel dynamique est résolu au runtime, jamais bundlé sur Web
type FileSystemModule = typeof import('expo-file-system');
let _FileSystem: FileSystemModule | null = null;
if (process.env.EXPO_OS !== 'web') {
  // Import dynamique : résolu uniquement sur iOS/Android, jamais exécuté sur Web
  import('expo-file-system').then((m) => { _FileSystem = m; }).catch(() => {});
}

// ── Helper réseau cross-platform ─────────────────────────────────────────────
// navigator.onLine n'existe pas sur React Native iOS/Android — on utilise
// ce helper pour vérifier la connectivité sans crasher hors Web.
function isOnline(): boolean {
  if (typeof navigator === 'undefined' || !('onLine' in navigator)) return true;
  return navigator.onLine;
}

// ── Timeout réseau — évite l'attente infinie sur 3G/4G dégradé ──────────────
// Sur réseau mobile lent, un fetch Supabase peut pendre 30s+ (TCP timeout OS).
// withTimeout() annule la requête via AbortController après REQ_TIMEOUT_MS.
// Valeurs : lecture = 10s, écriture = 12s (opérations critiques tolèrent +2s)
export const REQ_TIMEOUT_MS  = 10_000; // lectures
export const WRITE_TIMEOUT_MS = 12_000; // écritures / upserts

/**
 * Exécute fn() avec un AbortController — annule automatiquement après `ms` ms.
 * Le signal est passé à fn pour être branché sur la requête Supabase.
 * Sur dépassement : lance AbortError (caught par withRetry → retry ou error state).
 */
export async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms = REQ_TIMEOUT_MS,
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error(`Timeout réseau (${ms}ms)`)), ms);
  try {
    return await fn(ctrl.signal);
  } finally {
    clearTimeout(timer);
  }
}

// ── Cache session — piloté par cacheRegistry.session (TTL 120s) ─────────────
// Sur 3G/4G, getUser() coûte 200-500ms — TTL 120s réduit ~70% des appels.
export async function getCurrentUserId(): Promise<string | null> {
  const cached = cacheRegistry.session.getFresh();
  if (cached) return cached;
  const { data: { user } } = await supabase.auth.getUser();
  const id = user?.id ?? null;
  if (id) cacheRegistry.session.set(id);
  else    cacheRegistry.session.clear();
  return id;
}

/** À appeler après signOut — invalide la session ET tous les caches */
export function clearSessionCache(): void {
  clearAllCaches();
  syncQueue.clear(); // vider les actions offline en attente à la déconnexion
}

/**
 * Déconnexion complète et sécurisée — point d'entrée unique pour toute l'app.
 *
 * Ordre d'opérations :
 *  1. Supprimer le push token en DB (stop notifications)
 *  2. Vider tous les caches mémoire + sync-queue offline
 *  3. signOut Supabase (invalide le JWT côté serveur)
 *  4. Nettoyer le localStorage Web (session Supabase + préférences sensibles)
 *
 * @param pushToken  Token Expo push à supprimer (optionnel — récupéré via usePushNotifications)
 * @returns { ok: true } en succès, { ok: false, error } en cas d'échec signOut
 */
export async function signOutComplet(pushToken?: string | null): Promise<{ ok: boolean; error?: string }> {
  // 1. Supprimer le push token AVANT signOut — encore authentifié pour la RLS
  if (pushToken) {
    await removePushToken(pushToken).catch(() => {}); // best-effort, non bloquant
  }

  // 2. Vider caches mémoire + sync-queue
  clearSessionCache();

  // 3. Invalider la session côté serveur
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { ok: false, error: error.message };
  }

  // 4. Sur Web : purger les clés de session Supabase du localStorage
  //    (Supabase JS le fait normalement, mais on s'en assure pour Chrome Android)
  if (typeof localStorage !== 'undefined') {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('sb-') || k.includes('supabase') || k.includes('aevyra-session'))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }

  return { ok: true };
}

export type Profile = {
  id: string;
  prenom: string;
  pseudo: string | null;
  security_phrase: string;
  date_naissance: string | null;
  signe_astro: string | null;
  age: number | null;
  genre: string | null;
  cherche: string | null;
  energie_romantique: string | null;
  reve_duo: string | null;
  style_amour: string | null;
  moment_prefere: string | null;
  devise: string | null;
  bio: string | null;
  tags: string[] | null;
  chanson_vie: string | null;
  lettre_secrete: string | null;
  empreinte_couleur: string | null;
  photo_url: string | null;
  is_mystery: boolean;
  is_verified: boolean;
  inscription_complete: boolean;
  etape_inscription: number;
  notif_enabled: boolean;
  synchronicite_enabled: boolean;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  ville: string | null;
  location_updated_at: string | null;
  cgu_accepted_at: string | null;
  cadre_id: string | null;
  // ── Astrologie avancée ────────────────────────────────
  ascendant: string | null;
  planete_dominante: string | null;
  element_astrologique: string | null;
  // ── Réhabilitation ───────────────────────────────────
  has_badge_rehabilite: boolean | null;
  soul_letter_text: string | null;
  mirror_oath_text: string | null;
  healing_poem: string | null;
  // ── Parrainage ───────────────────────────────────────
  referral_code: string | null;
  referral_count: number;
  premium_until: string | null;
  premium_frames: string[];
  // ── Fiabilité & Sécurité ─────────────────────────────
  score_fiabilite: number | null;
  nb_signalements: number | null;
  auto_suspended: boolean | null;
  photo_verified: boolean | null;
  couples_formed: boolean | null;
  // ── Boost ────────────────────────────────────────────
  boost_until: string | null;
};

// ══════════════════════════════════════════════════════════════
// ALGORITHME AEVYRA — 5 DIMENSIONS PROPRIÉTAIRES
// Chaque dimension est indépendante et retourne un score 0–100.
// Le score global est une moyenne pondérée.
// ══════════════════════════════════════════════════════════════

/** Résultat détaillé avec les 5 dimensions */
export type CompatibiliteDetail = {
  total: number;
  resonanceAstrale: number;    // D1 — Signe solaire + élément + polarité
  alchimieEnergie: number;     // D2 — Énergie romantique (attraction opposés / miroir)
  accordDesAmes: number;       // D3 — Style d'amour + rêve de duo
  harmonieDesirée: number;     // D4 — Ce que chacun cherche chez l'autre
  synchroniciteVie: number;    // D5 — Moment préféré + empreinte couleur
};

// D1 — Résonance Astrale : éléments + triplicités + polarité
function scoreResonanceAstrale(a: Profile, b: Profile): number {
  if (!a.signe_astro || !b.signe_astro) return 50;

  const ELEMENT: Record<string, string> = {
    Bélier:'Feu', Lion:'Feu', Sagittaire:'Feu',
    Taureau:'Terre', Vierge:'Terre', Capricorne:'Terre',
    Gémeaux:'Air', Balance:'Air', Verseau:'Air',
    Cancer:'Eau', Scorpion:'Eau', Poissons:'Eau',
  };
  const POLARITE: Record<string, string> = {
    Bélier:'+', Lion:'+', Sagittaire:'+',
    Gémeaux:'+', Balance:'+', Verseau:'+',
    Taureau:'-', Vierge:'-', Capricorne:'-',
    Cancer:'-', Scorpion:'-', Poissons:'-',
  };
  // Signes en trines (même élément) = forte résonance
  const TRINES: Record<string, string[]> = {
    Bélier:['Lion','Sagittaire'], Lion:['Bélier','Sagittaire'], Sagittaire:['Bélier','Lion'],
    Taureau:['Vierge','Capricorne'], Vierge:['Taureau','Capricorne'], Capricorne:['Taureau','Vierge'],
    Gémeaux:['Balance','Verseau'], Balance:['Gémeaux','Verseau'], Verseau:['Gémeaux','Balance'],
    Cancer:['Scorpion','Poissons'], Scorpion:['Cancer','Poissons'], Poissons:['Cancer','Scorpion'],
  };
  // Signes en sextile (éléments compatibles Feu/Air, Terre/Eau)
  const SEXTILES: Record<string, string[]> = {
    Bélier:['Gémeaux','Verseau'], Lion:['Balance','Gémeaux'], Sagittaire:['Balance','Verseau'],
    Taureau:['Cancer','Poissons'], Vierge:['Scorpion','Cancer'], Capricorne:['Scorpion','Poissons'],
    Gémeaux:['Bélier','Lion'], Balance:['Sagittaire','Lion'], Verseau:['Bélier','Sagittaire'],
    Cancer:['Taureau','Vierge'], Scorpion:['Capricorne','Vierge'], Poissons:['Taureau','Capricorne'],
  };
  // Oppositions magnétiques (attraction forte mais tension)
  const OPPOSITIONS: Record<string, string> = {
    Bélier:'Balance', Taureau:'Scorpion', Gémeaux:'Sagittaire',
    Cancer:'Capricorne', Lion:'Verseau', Vierge:'Poissons',
    Balance:'Bélier', Scorpion:'Taureau', Sagittaire:'Gémeaux',
    Capricorne:'Cancer', Verseau:'Lion', Poissons:'Vierge',
  };

  const ea = ELEMENT[a.signe_astro];
  const eb = ELEMENT[b.signe_astro];
  const pa = POLARITE[a.signe_astro];
  const pb = POLARITE[b.signe_astro];

  // FIX: signe inconnu (hors des 12) → fallback neutre au lieu de 62 par polarité undefined
  if (!ea || !eb) return 50;

  if (a.signe_astro === b.signe_astro) return 78; // même signe : miroir, fort mais risqué
  if (TRINES[a.signe_astro]?.includes(b.signe_astro)) return 92; // trine = harmonie naturelle
  if (SEXTILES[a.signe_astro]?.includes(b.signe_astro)) return 82; // sextile = complicité
  if (OPPOSITIONS[a.signe_astro] === b.signe_astro) return 70; // opposition = attraction magnétique
  if (ea === eb) return 75; // même élément hors trine
  if (pa && pb && pa !== pb) return 62; // polarités opposées = attraction (guard undefined)
  return 48; // éléments incompatibles
}

// D2 — Alchimie des Énergies : loi des contraires + résonance vibratoire
function scoreAlchimieEnergie(a: Profile, b: Profile): number {
  if (!a.energie_romantique || !b.energie_romantique) return 50;

  // Modèle Aevyra : 4 archétypes + table d'alchimie propriétaire
  type Energie = 'Soleil ardent' | 'Lune mystérieuse' | 'Étoile libre' | 'Comète passionnée';
  const ALCHIMIE: Record<string, Record<string, number>> = {
    'Soleil ardent':     { 'Soleil ardent':60, 'Lune mystérieuse':95, 'Étoile libre':80, 'Comète passionnée':70 },
    'Lune mystérieuse':  { 'Soleil ardent':95, 'Lune mystérieuse':65, 'Étoile libre':72, 'Comète passionnée':88 },
    'Étoile libre':      { 'Soleil ardent':80, 'Lune mystérieuse':72, 'Étoile libre':85, 'Comète passionnée':76 },
    'Comète passionnée': { 'Soleil ardent':70, 'Lune mystérieuse':88, 'Étoile libre':76, 'Comète passionnée':68 },
  };
  return ALCHIMIE[a.energie_romantique as Energie]?.[b.energie_romantique as Energie] ?? 55;
}

// D3 — Accord des Âmes : style d'amour + rêve de duo
function scoreAccordDesAmes(a: Profile, b: Profile): number {
  let score = 50;
  // Même style d'amour : forte résonance
  if (a.style_amour && b.style_amour) {
    if (a.style_amour === b.style_amour) score += 30;
    // Styles complémentaires Aevyra (table propriétaire)
    const COMPLEMENT_STYLE: Record<string, string[]> = {
      'Tendresse douce':   ['Paroles sincères', 'Présence totale'],
      'Paroles sincères':  ['Tendresse douce', 'Cadeaux du cœur'],
      'Présence totale':   ['Tendresse douce', 'Actes concrets'],
      'Actes concrets':    ['Présence totale', 'Paroles sincères'],
      'Cadeaux du cœur':   ['Paroles sincères', 'Tendresse douce'],
    };
    if (COMPLEMENT_STYLE[a.style_amour]?.includes(b.style_amour)) score += 18;
  }
  // Même rêve de duo : vision alignée
  if (a.reve_duo && b.reve_duo) {
    if (a.reve_duo === b.reve_duo) score += 20;
  }
  // Tiebreaker stable +4 si aucun critère renseigné (score reste à 50)
  // Remplace le micro-hash charCodeAt qui introduisait ±8 pts de bruit non sémantique
  if (score === 50) score += 4;
  return Math.min(100, Math.max(30, score));
}

// D4 — Harmonie des Désirs : réciprocité de ce que chacun cherche
// Règle inclusive : 'une_ame' = compatible tout genre, 'les_deux' = femme+homme+autre
// 'autre' genre est inclus dans 'les_deux' et 'une_ame' mais PAS dans 'femme'/'homme' strict
function scoreHarmonieDesirée(a: Profile, b: Profile): number {
  if (!a.cherche || !b.cherche || !a.genre || !b.genre) return 55;

  // A veut B : soit cherche exact, soit ouvert (les_deux/une_ame), soit B est non-binaire ET A est ouvert
  const aVeutB =
    a.cherche === b.genre ||
    a.cherche === 'une_ame' ||
    (a.cherche === 'les_deux' && (b.genre === 'femme' || b.genre === 'homme' || b.genre === 'autre'));

  // B veut A : même logique symétrique
  const bVeutA =
    b.cherche === a.genre ||
    b.cherche === 'une_ame' ||
    (b.cherche === 'les_deux' && (a.genre === 'femme' || a.genre === 'homme' || a.genre === 'autre'));

  if (aVeutB && bVeutA) return 95; // réciprocité parfaite
  if (aVeutB || bVeutA) return 65; // désir unilatéral
  return 25;
}

// D5 — Synchronicité de Vie : moments préférés + empreinte couleur
function scoreSynchroniciteVie(a: Profile, b: Profile): number {
  let score = 50;
  if (a.moment_prefere && b.moment_prefere) {
    if (a.moment_prefere === b.moment_prefere) score += 22; // même rythme de vie
    // Complémentarité jour/nuit
    const RYTHMIQUE: Record<string, string[]> = {
      'Lever du soleil': ['Coucher du soleil', 'Nuit étoilée'],
      'Coucher du soleil': ['Lever du soleil', 'Après-midi doré'],
      'Nuit étoilée': ['Lever du soleil', 'Minuit mystérieux'],
      'Après-midi doré': ['Coucher du soleil', 'Matin calme'],
      'Minuit mystérieux': ['Nuit étoilée', 'Après-midi doré'],
      'Matin calme': ['Après-midi doré', 'Lever du soleil'],
    };
    if (RYTHMIQUE[a.moment_prefere]?.includes(b.moment_prefere)) score += 14;
  }
  if (a.empreinte_couleur && b.empreinte_couleur) {
    // Couleurs complémentaires Aevyra (roue chromatique émotionnelle)
    const COULEURS_COMP: Record<string, string[]> = {
      'Violet profond':  ['Or doux', 'Rose pâle'],
      'Or doux':         ['Violet profond', 'Bleu nuit'],
      'Rose pâle':       ['Violet profond', 'Turquoise'],
      'Bleu nuit':       ['Or doux', 'Corail'],
      'Turquoise':       ['Rose pâle', 'Corail'],
      'Corail':          ['Bleu nuit', 'Turquoise'],
    };
    if (a.empreinte_couleur === b.empreinte_couleur) score += 8;
    if (COULEURS_COMP[a.empreinte_couleur]?.includes(b.empreinte_couleur)) score += 14;
  }
  // Tiebreaker stable +3 si aucun critère renseigné (score reste à 50)
  // Remplace le micro-hash charCodeAt(1) qui introduisait ±6 pts de bruit non sémantique
  if (score === 50) score += 3;
  return Math.min(100, Math.max(30, score));
}

/** Calcule le score global + les 5 dimensions détaillées */
export function computeCompatibiliteDetail(a: Profile, b: Profile): CompatibiliteDetail {
  const d1 = scoreResonanceAstrale(a, b);
  const d2 = scoreAlchimieEnergie(a, b);
  const d3 = scoreAccordDesAmes(a, b);
  const d4 = scoreHarmonieDesirée(a, b);
  const d5 = scoreSynchroniciteVie(a, b);
  // Pondération Aevyra v2 :
  // D1 Résonance Astrale   25% — attraction cosmique fondatrice
  // D2 Alchimie Énergies   22% — dynamique relationnelle
  // D3 Accord des Âmes     18% — vision commune du couple
  // D4 Harmonie Désirs     23% — réciprocité (critère bloquant, poids renforcé)
  // D5 Synchronicité Vie   12% — magie quotidienne
  // Total = 100% · D4 renforcé car c'est la dimension la plus binaire (95 vs 25)
  const total = Math.round(d1 * 0.25 + d2 * 0.22 + d3 * 0.18 + d4 * 0.23 + d5 * 0.12);
  return {
    total: Math.min(100, Math.max(35, total)),
    resonanceAstrale: d1,
    alchimieEnergie: d2,
    accordDesAmes: d3,
    harmonieDesirée: d4,
    synchroniciteVie: d5,
  };
}

/** Rétrocompatibilité — retourne uniquement le score total */
export function computeCompatibilite(a: Profile, b: Profile): number {
  return computeCompatibiliteDetail(a, b).total;
}

export type Match = {
  id: string;
  user1_id: string;
  user2_id: string;
  compatibilite: number;
  created_at: string;
  last_msg_at?: string;       // dernière activité — tri par activité récente
  last_msg_preview?: string;  // aperçu dernier message pour la liste
  unread_count?: number;      // messages non lus (badge rouge)
  source?: 'match' | 'connection';
  partner?: Profile;
};

export type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  is_whisper: boolean;
  capsule_time: string | null;
  is_capsule_delivered: boolean;
  read_at: string | null;
  created_at: string;
};

export type RomanContent = {
  id: string;
  type: 'citation' | 'poeme' | 'oracle' | 'histoire' | 'defi';
  titre: string;
  contenu: string;
  auteur: string;
  emoji: string;
  author_id: string | null;
  created_at: string;
};

export type Event = {
  id: string;
  titre: string;
  description: string;
  type: string;
  date_event: string;
  lieu: string;
  emoji: string;
  participants_max: number;
  participants_count: number;
};

// Cache profil courant — piloté par cacheRegistry.myProfile (TTL 60s)
// Sur 3G/4G une lecture profil coûte 300-800ms. TTL 60s réduit ~80% re-fetches.

export function invalidateMyProfileCache(): void {
  cacheRegistry.myProfile.clear();
}

// ── Profils ──────────────────────────────────────────────
export async function getMyProfile(): Promise<Profile | null> {
  try {
    const cached = cacheRegistry.myProfile.getFresh();
    if (cached) return cached;
    const userId = await getCurrentUserId();
    if (!userId) return null;
    const { data } = await supabase
      .from('profiles')
      .select(FEED_COLS)
      .eq('id', userId)
      .maybeSingle();
    const profile = (data as unknown as Profile) ?? null;
    if (profile) cacheRegistry.myProfile.set(profile);
    return profile;
  } catch (e) {
    console.error('[getMyProfile] Plan B — DB indisponible', e);
    return null;
  }
}

export async function upsertProfile(fields: Partial<Profile>): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) {
    console.error('[upsertProfile] Pas d\'utilisateur connecté');
    return;
  }
  // UPDATE (pas upsert) — la ligne profil est créée à l'inscription
  // upsert avec RLS peut tenter un INSERT bloqué si la ligne existe déjà
  await withRetry(async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) {
      console.error('[upsertProfile] ERREUR:', error.code, error.message, error.details);
      throw new Error(error.message);
    }
  });
}

// ── Initialisation du profil à l'inscription (INSERT + UPDATE) ───────────────
// Utilisé UNIQUEMENT lors de la création de compte pour garantir la persistance
// même si le trigger handle_new_user est légèrement plus lent que le client.
export async function upsertProfileInit(userId: string, fields: Partial<Profile>): Promise<void> {
  const payload = { id: userId, ...fields, updated_at: new Date().toISOString() };
  // upsert : INSERT si absent (trigger lent), UPDATE sinon — RLS l'autorise car id = auth.uid()
  const { error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' });
  if (error) {
    console.error('[upsertProfileInit] ERREUR:', error.code, error.message, error.details);
    throw new Error(error.message);
  }
}

// Colonnes affichées dans le feed — synchronisées avec le schéma DB réel
// (colonnes fantômes supprimées : photos, centre_interet, valeurs, qualites,
//  defauts, citation, langue, niveau_etudes, profession, situation_amoureuse,
//  enfants, fumeur, tatouage, religion, politique, ame_score)
const FEED_COLS = [
  'id','prenom','pseudo','photo_url','bio','age','genre','cherche',
  'signe_astro','ville','score_fiabilite','photo_verified','boost_until',
  'is_mystery','inscription_complete','created_at','date_naissance',
  'energie_romantique','reve_duo','style_amour','moment_prefere',
  'empreinte_couleur','ascendant','planete_dominante','element_astrologique',
  'cadre_id','premium_until','premium_frames','latitude','longitude',
].join(',');

export async function getProfilesForConstellation(): Promise<Profile[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    // 3 requêtes parallèles : profil courant + IDs exclus (likes bornés 500 + blocks + dislikes 30j)
    const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [profileRes, likedRes, blockedRes, dislikedRes] = await Promise.all([
      // FEED_COLS — nécessaire pour computeCompatibilite (signe_astro, style_amour, etc.)
      supabase.from('profiles').select(FEED_COLS).eq('id', userId).maybeSingle(),
      // Limité à 500 pour éviter un payload massif si un user a swipé des milliers de profils
      supabase.from('likes').select('to_user_id').eq('from_user_id', userId).limit(500),
      supabase.from('blocks').select('blocked_id').eq('blocker_id', userId).limit(200),
      // Dislikes des 30 derniers jours uniquement — après 30j le profil réapparaît
      supabase.from('dislikes').select('to_user_id')
        .eq('from_user_id', userId)
        .gte('created_at', cutoff30d)
        .limit(500),
    ]);

    const myProfile   = profileRes.data as unknown as Profile | null;
    const likedIds    = (likedRes.data    ?? []).map((l: { to_user_id: string }) => l.to_user_id);
    const blockedIds  = (blockedRes.data  ?? []).map((b: { blocked_id: string }) => b.blocked_id);
    const dislikedIds = (dislikedRes.data ?? []).map((d: { to_user_id: string }) => d.to_user_id);

    const allExcluded = [...new Set([...likedIds, ...blockedIds, ...dislikedIds])];
    const excludedIds = allExcluded.slice(0, 500);
    const hasExclusions = excludedIds.length > 0;

    let query = supabase
      .from('profiles')
      .select(FEED_COLS)
      .eq('inscription_complete', true)
      .eq('is_banned', false)
      .neq('id', userId)
      .order('boost_until', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(50);

    if (hasExclusions) {
      query = query.not('id', 'in', `(${excludedIds.join(',')})`);
    }

    // Filtre genre côté DB (index idx_profiles_cherche_genre)
    const cherche   = myProfile?.cherche ?? '';
    const myGenre   = myProfile?.genre   ?? '';
    const myCherche = cherche;

    if (cherche === 'femme' || cherche === 'homme') {
      if (myGenre !== 'autre') {
        query = query.eq('genre', cherche);
      }
    }
    // cherche='les_deux' ou 'une_ame' → pas de filtre genre DB

    const { data } = await query;
    if (!Array.isArray(data)) return [];

    // Filtre réciproque côté client — réciprocité stricte bidirectionnelle
    const jeVeuxP = (p: Profile) => {
      if (!myCherche || myCherche === '' || myCherche === 'une_ame') return true;
      if (myCherche === 'les_deux') return true;
      return myCherche === (p.genre ?? '');
    };

    const pVeutMoi = (p: Profile) => {
      const pCherche = p.cherche ?? '';
      if (!pCherche || pCherche === '' || pCherche === 'une_ame') return true;
      if (pCherche === 'les_deux') return true;
      return pCherche === myGenre;
    };

    // Filtrer + trier par score de compatibilité décroissant
    // Les profils boostés restent en tête (tri DB), puis on sous-trie par score Aevyra
    const myFullProfile = myProfile as unknown as Profile | null;
    const filtered = (data as unknown as Profile[]).filter((p: Profile) => jeVeuxP(p) && pVeutMoi(p));

    if (!myFullProfile) return filtered; // pas de profil courant → retour sans scoring

    // Calculer le score pour chaque candidat et trier
    const scored = filtered.map(p => ({
      profile: p,
      score: computeCompatibilite(myFullProfile, p),
    }));
    // Tri : boostés en tête (boost_until > now), puis par score Aevyra décroissant
    const now = new Date().toISOString();
    scored.sort((a, b) => {
      const aBoosted = (a.profile.boost_until ?? '') > now ? 1 : 0;
      const bBoosted = (b.profile.boost_until ?? '') > now ? 1 : 0;
      if (bBoosted !== aBoosted) return bBoosted - aBoosted;
      return b.score - a.score;
    });
    return scored.map(s => s.profile);
  } catch (e) {
    console.error('[getProfilesForConstellation] Plan B — DB indisponible', e);
    return [];
  }
}

/** Compte le nombre total de membres inscrits — cacheRegistry.membersCount (TTL 30s) */
export async function getTotalMembersCount(): Promise<number> {
  const cached = cacheRegistry.membersCount.getFresh();
  if (cached !== null) return cached;
  try {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('inscription_complete', true);
    const value = count ?? 0;
    cacheRegistry.membersCount.set(value);
    return value;
  } catch (e) {
    console.error('[getTotalMembersCount] Plan B', e);
    return cacheRegistry.membersCount.getFresh() ?? 0;
  }
}

// ── Profil public d'un utilisateur ─────────────────────────
// ── Recherche intelligente de profils ───────────────────────────────────────
// Stratégie multi-niveaux :
//   1. OR natif Supabase sur prénom + pseudo (index DB, pas de sur-fetch)
//   2. Filtres genre / signe côté DB
//   3. Scoring côté client : pertinence textuelle + compatibilité Aevyra
//   4. Résultats triés : profils boostés > score compatibilité > fiabilité
export async function searchProfiles(opts: {
  query?:  string;   // prénom ou pseudo
  genre?:  string;   // 'femme' | 'homme' | 'autre' | '' (tous)
  signe?:  string;   // signe astrologique exact
  limit?:  number;
}): Promise<Profile[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    // Charger profil courant + bloqués en parallèle
    // select(FEED_COLS) au lieu de select('*') : réduit de ~60% la taille du payload réseau
    const [meRes, blockedRes] = await Promise.all([
      supabase.from('profiles').select(FEED_COLS).eq('id', userId).maybeSingle(),
      supabase.from('blocks').select('blocked_id').eq('blocker_id', userId).limit(200),
    ]);
    const me         = meRes.data as unknown as Profile | null;
    const blockedIds = (blockedRes.data ?? []).map((b: { blocked_id: string }) => b.blocked_id);

    let q = supabase
      .from('profiles')
      .select(FEED_COLS)
      .eq('inscription_complete', true)
      .limit(opts.limit ?? 60);         // sur-fetch pour re-trier côté client

    // En mode recherche textuelle : inclure son propre profil + profils mystery
    // (un utilisateur doit pouvoir se trouver par son pseudo)
    // En mode découverte sans query : exclure soi-même + profils mystery
    const hasTextQuery = !!(opts.query && opts.query.trim() !== '');
    if (!hasTextQuery) {
      q = q
        .eq('is_mystery', false)        // exclure les profils en mode mystère
        .neq('id', userId);             // exclure soi-même en mode découverte
    }

    // Toujours exclure les profils bannis
    q = q.eq('is_banned', false);

    // Exclure bloqués
    if (blockedIds.length > 0) {
      q = q.not('id', 'in', `(${blockedIds.join(',')})`);
    }
    // Filtre genre exact côté DB (index eq)
    if (opts.genre && opts.genre !== '') {
      q = q.eq('genre', opts.genre);
    }
    // Filtre signe astrologique exact côté DB
    if (opts.signe && opts.signe !== '') {
      q = q.eq('signe_astro', opts.signe);
    }
    // Recherche textuelle — OR natif Supabase sur prénom + pseudo
    if (opts.query && opts.query.trim() !== '') {
      const t = opts.query.trim().replace(/'/g, "''"); // échapper apostrophes
      q = q.or(`prenom.ilike.%${t}%,pseudo.ilike.%${t}%`);
    }

    const { data } = await q;
    if (!Array.isArray(data)) return [];
    let results = (data as unknown[]) as Profile[];

    // ── Scoring côté client ─────────────────────────────────────────────────
    const term = opts.query?.trim().toLowerCase() ?? '';

    const scored = results.map(p => {
      let score = 0;

      // 1. Pertinence textuelle (priorité aux correspondances exactes en début)
      if (term) {
        const prenomLow = p.prenom?.toLowerCase() ?? '';
        const pseudoLow = p.pseudo?.toLowerCase()  ?? '';
        if (prenomLow === term || pseudoLow === term)           score += 100; // exact match
        else if (prenomLow.startsWith(term) || pseudoLow.startsWith(term)) score += 60; // préfixe
        else                                                    score += 20;  // contient
      }

      // 2. Compatibilité Aevyra (si profil courant disponible)
      if (me) {
        const compat = computeCompatibilite(me, p);
        score += compat * 0.6; // pondération 60% de la pertinence max
      }

      // 3. Boost actif — cast car boost_until est dans la table mais pas toujours dans le type
      const boostUntil = (p as Profile & { boost_until?: string | null }).boost_until;
      if (boostUntil && new Date(boostUntil) > new Date()) score += 40;

      // 4. Fiabilité
      score += (p.score_fiabilite ?? 0) * 0.3;

      // 5. Photo vérifiée + badge vérifié
      if (p.photo_verified) score += 15;
      if (p.is_verified)    score += 10;

      return { p, score };
    });

    // Trier par score décroissant
    scored.sort((a, b) => b.score - a.score);
    results = scored.map(s => s.p);

    return results;
  } catch (e) {
    console.error('[searchProfiles] Erreur', e);
    return [];
  }
}

// Retourne le profil courant pour l'affichage du score de compatibilité en recherche
export async function getMyProfileForSearch(): Promise<Profile | null> {
  // Réutilise le cache de getMyProfile (TTL 10 s) — évite un 2e select('*')
  return getMyProfile();
}

export async function getPublicProfile(userId: string): Promise<Profile | null> {
  // Réutilise le cache publicProfiles (TTL 2 min, keyed par userId) — évite des select('*') répétés
  const cached = cacheRegistry.publicProfiles.getFresh(userId);
  if (cached) return cached;
  try {
    const { data } = await supabase
      .from('profiles')
      .select(FEED_COLS)          // réduit ~60% payload vs select('*')
      .eq('id', userId)
      .maybeSingle();
    if (data) cacheRegistry.publicProfiles.set(userId, data as unknown as Profile);
    return (data ?? null) as unknown as Profile | null;
  } catch (e) {
    console.error('[getPublicProfile] Plan B', e);
    return null;
  }
}

// ── Connexions (demandes d'amitié romantique) ──────────────
export type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'declined' | 'blocked';

export interface Connection {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  created_at: string;
}

export async function getConnectionStatus(targetUserId: string): Promise<ConnectionStatus> {
  const userId = await getCurrentUserId();
  if (!userId) return 'none';
  const { data } = await supabase
    .from('connections')
    .select('status, from_user_id')
    .or(`and(from_user_id.eq.${userId},to_user_id.eq.${targetUserId}),and(from_user_id.eq.${targetUserId},to_user_id.eq.${userId})`)
    .maybeSingle();
  if (!data) return 'none';
  if (data.status === 'accepted') return 'accepted';
  if (data.status === 'declined') return 'declined';
  if (data.status === 'blocked')  return 'blocked';
  if (data.from_user_id === userId) return 'pending_sent';
  return 'pending_received';
}

export async function sendConnectionRequest(toUserId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  await withRetry(async () => {
    const { error } = await supabase.from('connections').upsert(
      { from_user_id: userId, to_user_id: toUserId, status: 'pending' },
      { onConflict: 'from_user_id,to_user_id' }
    );
    if (error) { console.error('[sendConnectionRequest]', error.code, error.message); throw new Error(error.message); }
  });
}

export async function respondToConnection(connectionId: string, accept: boolean): Promise<void> {
  await withRetry(async () => {
    const { error } = await supabase.from('connections')
      .update({ status: accept ? 'accepted' : 'declined', updated_at: new Date().toISOString() })
      .eq('id', connectionId);
    if (error) { console.error('[respondToConnection]', error.code, error.message); throw new Error(error.message); }
  });
}

// ── Dislikes (Passer) ───────────────────────────────────
// Stratégie anti-déception : silencieux, jamais notifié, TTL 30j
// → le profil disparaît du feed pendant 30j puis peut réapparaître
export async function sendDislike(toUserId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId || userId === toUserId) return;
  await withRetry(async () => {
    const { error } = await supabase.from('dislikes').upsert(
      { from_user_id: userId, to_user_id: toUserId },
      { onConflict: 'from_user_id,to_user_id' },
    );
    if (error) { console.error('[sendDislike] upsert échoué', error.code, error.message); throw new Error(error.message); }
  });
}

// ── Likes ──────────────────────────────────────────────
// ── Vérifier si l'utilisateur courant a déjà envoyé un signal à une cible ──
// Utilisé par la page profil pour décider si la vue est restreinte ou complète.
export async function hasSentSignal(targetUserId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId || userId === targetUserId) return true; // son propre profil = toujours débloqué
  const { data } = await supabase
    .from('likes')
    .select('id')
    .eq('from_user_id', userId)
    .eq('to_user_id', targetUserId)
    .maybeSingle();
  return !!data;
}

// ── Anti-double-tap likes : set des userId en cours d'envoi ──
const _likesInFlight = new Set<string>();

export async function sendLike(toUserId: string, actionType: string): Promise<{ matched: boolean }> {
  // Debounce anti-double-tap : ignore si un like vers ce user est déjà en vol
  if (_likesInFlight.has(toUserId)) return { matched: false };
  _likesInFlight.add(toUserId);

  const userId = await getCurrentUserId();
  if (!userId) { _likesInFlight.delete(toUserId); return { matched: false }; }

  try {
    const { error: likeError } = await supabase.from('likes').upsert(
      { from_user_id: userId, to_user_id: toUserId, action_type: actionType },
      { onConflict: 'from_user_id,to_user_id' },
    );
    if (likeError) {
      console.error('[sendLike] upsert échoué', likeError.code, likeError.message);
      return { matched: false };
    }

    // Vérification match mutuel AVANT de créer quoi que ce soit
    // 3 requêtes parallèles : réciproque + mes infos + ses infos
    const [reciproqueRes, myProfileRes, theirProfileRes] = await Promise.all([
      supabase.from('likes').select('id').eq('from_user_id', toUserId).eq('to_user_id', userId).maybeSingle(),
      supabase.from('profiles').select(FEED_COLS).eq('id', userId).maybeSingle(),
      supabase.from('profiles').select(FEED_COLS).eq('id', toUserId).maybeSingle(),
    ]);

    // Pas de like réciproque → pas de match, pas de connexion créée
    if (!reciproqueRes.data) return { matched: false };

    // ── Match mutuel confirmé ──────────────────────────────────────────────
    const u1 = userId < toUserId ? userId : toUserId;
    const u2 = userId < toUserId ? toUserId : userId;

    // Score déterministe basé sur les profils réels (pas de Math.random)
    const compatibilite = myProfileRes.data && theirProfileRes.data
      ? computeCompatibilite(
          myProfileRes.data as unknown as Profile,
          theirProfileRes.data as unknown as Profile
        )
      : 75;

    // Upsert du match (idempotent — safe en cas de double-tap réseau)
    const { error: matchError } = await supabase.from('matches').upsert(
      { user1_id: u1, user2_id: u2, compatibilite },
      { onConflict: 'user1_id,user2_id' },
    );
    if (matchError) {
      console.error('[sendLike] match upsert échoué', matchError.code, matchError.message);
      // Ne pas retourner false ici — le match a peut-être déjà été créé (race condition)
      // On considère matched=true car les 2 likes existent
    }
    return { matched: true };

  } finally {
    // Libérer après 1s — empêche double-tap accidentel mais autorise un 2e envoi voulu
    setTimeout(() => _likesInFlight.delete(toUserId), 1000);
  }
}

// ── Matches ──────────────────────────────────────────────
export async function getMyMatches(): Promise<Match[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    // RPC unique — retourne matches + connections triés par dernière activité
    // Remplace 2 requêtes parallèles + tri client par une seule RPC optimisée
    const { data: rows, error } = await supabase.rpc('get_matches_with_last_activity', {
      p_user_id: userId,
    });
    if (error) throw error;
    if (!rows || rows.length === 0) return [];

    // Dédupliquer par partner_id (un partenaire peut avoir match + connection)
    const seenPartners = new Set<string>();
    const unified: typeof rows = [];
    for (const row of rows) {
      if (!seenPartners.has(row.partner_id)) {
        seenPartners.add(row.partner_id);
        unified.push(row);
      }
    }

    // Charger les profils partenaires en une seule requête (sans les bannis)
    const partnerIds = unified.map(r => r.partner_id);
    const { data: partners } = await supabase
      .from('profiles')
      .select(FEED_COLS)
      .in('id', partnerIds)
      .eq('is_banned', false);

    const partnerMap = new Map<string, Profile>();
    (partners ?? []).forEach((p: unknown) => {
      const prof = p as Profile;
      partnerMap.set(prof.id, prof);
    });

    // Ne retourner que les matches dont le partenaire existe encore (non banni/supprimé)
    return unified
      .filter(r => partnerMap.has(r.partner_id))
      .map(r => ({
        id:               r.match_id,
        user1_id:         userId,
        user2_id:         r.partner_id,
        compatibilite:    r.compatibilite ?? 75,
        created_at:       r.match_created,
        last_msg_at:      r.last_msg_at   ?? r.match_created,
        last_msg_preview: r.last_msg_preview ?? '',
        unread_count:     r.unread_count  ?? 0,
        source:           (r.source as 'match' | 'connection'),
        partner:          partnerMap.get(r.partner_id),
      }));
  } catch (e) {
    console.error('[getMyMatches] Plan B — DB indisponible', e);
    return [];
  }
}

// ── Upload photo de profil vers Supabase Storage (bucket avatars) ─────────────
export async function uploadProfilePhoto(localUri: string): Promise<string | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  try {
    const ext = localUri.toLowerCase().includes('.png') ? 'png'
              : localUri.toLowerCase().includes('.webp') ? 'webp'
              : 'jpg';
    const fileName    = `${userId}/avatar_${Date.now()}.${ext}`;
    const contentType = ext === 'png' ? 'image/png'
                      : ext === 'webp' ? 'image/webp'
                      : 'image/jpeg';

    let uploadError: { message: string } | null = null;

    if (process.env.EXPO_OS === 'web') {
      // ── Web : fetch l'URI locale (blob/object URL) → ArrayBuffer ──────
      const resp = await fetch(localUri);
      if (!resp.ok) throw new Error(`fetch local URI: ${resp.status}`);
      const arrayBuffer = await resp.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, bytes, { contentType, upsert: true });
      uploadError = error;
    } else {
      // ── Native (iOS / Android) : FileSystem → base64 → Uint8Array ─────
      const base64 = await _FileSystem!.readAsStringAsync(localUri, {
        encoding: 'base64' as const,
      });
      if (!base64) throw new Error('FileSystem retourné vide');
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, bytes, { contentType, upsert: true });
      uploadError = error;
    }

    if (uploadError) {
      console.error('[uploadProfilePhoto]', uploadError.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    // Persister photo_url dans le profil
    await upsertProfile({ photo_url: urlData.publicUrl });
    return urlData.publicUrl;
  } catch (e: any) {
    console.error('[uploadProfilePhoto] exception', e?.message);
    return null;
  }
}

// ── Upload message vocal vers Supabase Storage ────────────
export async function uploadVoiceMessage(localUri: string): Promise<string | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  try {
    const { fetch: expoFetch } = await import('expo/fetch');
    const response = await expoFetch(localUri);
    const arrayBuffer = await response.arrayBuffer();
    const fileName = `${userId}/${Date.now()}.m4a`;

    const { error } = await supabase.storage
      .from('voice-messages')
      .upload(fileName, arrayBuffer, { contentType: 'audio/m4a', upsert: false });

    if (error) { console.error('[uploadVoiceMessage]', error.message); return null; }

    const { data: urlData } = supabase.storage.from('voice-messages').getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch (e: any) {
    console.error('[uploadVoiceMessage] exception', e?.message);
    return null;
  }
}

// ── Upload message vocal depuis un Blob Web (MediaRecorder) ──
// BUG FIX Web : expo/fetch ne peut pas lire un object URL (blob:http://...)
// On utilise le Blob directement via arrayBuffer() standard
export async function uploadVoiceMessageWeb(blob: Blob): Promise<string | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  try {
    const arrayBuffer = await blob.arrayBuffer();
    // Déterminer l'extension selon le mimeType du Blob
    const mime = blob.type || 'audio/webm';
    const ext  = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
    const fileName = `${userId}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('voice-messages')
      .upload(fileName, arrayBuffer, { contentType: mime, upsert: false });

    if (error) { console.error('[uploadVoiceMessageWeb]', error.message); return null; }

    const { data: urlData } = supabase.storage.from('voice-messages').getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch (e: any) {
    console.error('[uploadVoiceMessageWeb] exception', e?.message);
    return null;
  }
}

// ── Trouver ou créer un match à partir d'un userId ────────
export async function getMatchIdByUserId(targetUserId: string): Promise<string | null> {
  return getOrCreateConversation(targetUserId);
}

/**
 * Trouve ou crée une conversation avec targetUserId.
 * Stratégie :
 *  1. Match existant  → retourne son id
 *  2. Connexion existante (peu importe statut) → crée le match et retourne son id
 *  3. Aucune connexion → crée connexion pending + match → retourne l'id du match
 * Ainsi le bouton "Écrire" fonctionne toujours, même sans like mutuel.
 */
export async function getOrCreateConversation(targetUserId: string): Promise<string | null> {
  const userId = await getCurrentUserId();
  if (!userId || userId === targetUserId) return null;

  const u1 = userId < targetUserId ? userId : targetUserId;
  const u2 = userId < targetUserId ? targetUserId : userId;

  // 1. Match déjà existant ?
  const { data: existingMatch } = await supabase
    .from('matches')
    .select('id')
    .eq('user1_id', u1)
    .eq('user2_id', u2)
    .maybeSingle();
  if (existingMatch?.id) return existingMatch.id;

  // 2. Charger profils pour calcul compatibilité — FEED_COLS suffisent pour computeCompatibilite
  const [myRes, theirRes] = await Promise.all([
    supabase.from('profiles').select(FEED_COLS).eq('id', userId).maybeSingle(),
    supabase.from('profiles').select(FEED_COLS).eq('id', targetUserId).maybeSingle(),
  ]);
  const compatibilite = myRes.data && theirRes.data
    ? computeCompatibilite(myRes.data as unknown as Profile, theirRes.data as unknown as Profile)
    : 75;

  // 3. Vérifier connexion existante (peu importe le statut)
  const { data: existingConn } = await supabase
    .from('connections')
    .select('id')
    .or(`and(from_user_id.eq.${userId},to_user_id.eq.${targetUserId}),and(from_user_id.eq.${targetUserId},to_user_id.eq.${userId})`)
    .maybeSingle();

  // 4. Si pas de connexion → en créer une (pending) avec retry
  if (!existingConn) {
    await withRetry(async () => {
      const { error } = await supabase.from('connections').upsert(
        { from_user_id: userId, to_user_id: targetUserId, status: 'pending' },
        { onConflict: 'from_user_id,to_user_id' }
      );
      if (error) throw error;
    });
  }

  // 5. Créer (ou récupérer) le match avec retry
  let newMatchId: string | null = null;
  await withRetry(async () => {
    const { data, error } = await supabase.from('matches')
      .upsert({ user1_id: u1, user2_id: u2, compatibilite }, { onConflict: 'user1_id,user2_id' })
      .select('id')
      .maybeSingle();
    if (error) throw error;
    newMatchId = data?.id ?? null;
  });

  return newMatchId;
}

// ── Messages — pagination cursor-based ────────────────────
// beforeCursor = created_at ISO pour charger les messages plus anciens (scroll-up)
export const MESSAGES_PAGE_SIZE = 60;

export async function getMessages(matchId: string, beforeCursor?: string): Promise<Message[]> {
  try {
    let q = supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PAGE_SIZE);
    if (beforeCursor) q = q.lt('created_at', beforeCursor);
    const { data } = await q;
    // On retourne les messages en ordre chronologique (le plus ancien en premier)
    return Array.isArray(data) ? data.reverse() : [];
  } catch (e) {
    console.error('[getMessages] DB indisponible', e);
    return [];
  }
}

// ── Retry exponentiel — 0 perte silencieuse sur réseau instable ──
// backoff exponentiel doux — optimisé mobile 3G/4G dégradé
// retry 1: 200ms, retry 2: 300ms, retry 3: 450ms → total max ~950ms (était 2800ms)
async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try { return await fn(); } catch (e) {
      lastErr = e;
      if (i < retries - 1) await new Promise(r => setTimeout(r, 200 * (1.5 ** i)));
    }
  }
  throw lastErr;
}

// ── Constantes messages ────────────────────────────────────
export const MSG_MAX_LENGTH = 2000;
export const MSG_MIN_LENGTH = 1;
export const MSG_ICEBREAKER_MIN = 15; // 1er message : ≥ 15 chars obligatoire

// ── Quota progressif : vérifier avant envoi ──────────────────
// Retourne 'ok' | 'quota_j1' | 'quota_j2' | 'icebreaker_required' | 'not_in_match'
export async function checkCanSendMessage(matchId: string, content: string): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('can_send_message', {
      p_match_id: matchId,
      p_content: content,
    });
    if (error) return 'ok'; // fail open — ne pas bloquer si la RPC échoue
    return (data as string) ?? 'ok';
  } catch {
    return 'ok'; // fail open
  }
}

// ── Quota restant aujourd'hui pour un match ───────────────────
export interface MessageQuota {
  sent_today: number;
  daily_limit: number | null; // null = illimité (J3+)
  remaining: number | null;   // null = illimité
  match_age_days: number;
}

export async function getMessageQuota(matchId: string): Promise<MessageQuota | null> {
  try {
    const { data, error } = await supabase
      .from('my_message_quota')
      .select('match_age_days, sent_today, daily_limit, remaining')
      .eq('match_id', matchId)
      .maybeSingle();
    if (error || !data) return null;
    return data as MessageQuota;
  } catch {
    return null;
  }
}

export async function sendMessage(matchId: string, content: string, isWhisper = false, capsuleTime?: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  // Validation défensive avant INSERT — évite l'erreur 23514 (check_violation)
  const trimmed = content.trim();
  if (trimmed.length < MSG_MIN_LENGTH) throw new Error('Le message ne peut pas être vide.');
  if (trimmed.length > MSG_MAX_LENGTH) throw new Error(`Le message dépasse ${MSG_MAX_LENGTH} caractères.`);
  // Vérification quota + icebreaker (messages vocaux exemptés de l'icebreaker min-length)
  if (!trimmed.startsWith('[vocal:')) {
    const check = await checkCanSendMessage(matchId, trimmed);
    if (check === 'quota_j1') throw new Error('__quota_j1__');
    if (check === 'quota_j2') throw new Error('__quota_j2__');
    if (check === 'icebreaker_required') throw new Error('__icebreaker__');
  }
  await withRetry(async () => {
    const { error } = await supabase.from('messages').insert({
      match_id: matchId,
      sender_id: userId,
      content: trimmed,
      is_whisper: isWhisper,
      capsule_time: capsuleTime || null,
    });
    if (error) {
      console.error('[sendMessage]', error.code, error.message);
      throw new Error(error.message);
    }
  });
  // Invalider le cache matches meta — le dernier message a changé
  invalidateMatchesMetaCache();
}

// ── Supprimer un message (seul l'auteur peut) ─────────────
export async function deleteMessage(messageId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId)
    .eq('sender_id', userId);
  if (error) { console.error('[deleteMessage]', error.message); return false; }
  return true;
}

// ── Marquer les messages d'un match comme lus ─────────────
export async function markMessagesRead(matchId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('match_id', matchId)
    .neq('sender_id', userId)
    .is('read_at', null);
}

// ── Compter les messages non lus d'un match ───────────────
export async function countUnreadMessages(matchId: string): Promise<number> {
  const userId = await getCurrentUserId();
  if (!userId) return 0;
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('match_id', matchId)
    .neq('sender_id', userId)
    .is('read_at', null);
  return count ?? 0;
}

// ── Meta chat liste — lastMsg + unread en une seule RPC (0 N+1) ──
export type MatchMeta = {
  match_id: string;
  last_content: string | null;
  last_at: string | null;
  last_sender: string | null;
  unread_count: number;
};

// Cache matches meta — cacheRegistry.matchesMeta (TTL 15s)
export function invalidateMatchesMetaCache(): void { cacheRegistry.matchesMeta.clear(); }

export async function getMatchesMeta(): Promise<MatchMeta[]> {
  const cached = cacheRegistry.matchesMeta.getFresh();
  if (cached) return cached;
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data, error } = await supabase.rpc('get_matches_meta', { p_user_id: userId });
  if (error) { console.error('[getMatchesMeta]', error.message); return []; }
  const result = (data ?? []) as MatchMeta[];
  cacheRegistry.matchesMeta.set(result);
  return result;
}

// ── Dernier message d'un match (pour la liste Plume) ──────
export async function getLastMessage(matchId: string): Promise<Message | null> {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

// ── Contenu Roman des Âmes ──────────────────────────────────────────────
export type RomanLikeCounts = {
  coeur: number;
  etoile: number;
  partage: number;
};

export type RomanContentEnriched = RomanContent & {
  likeCounts: RomanLikeCounts;
  myReactions: Partial<Record<'coeur' | 'etoile' | 'partage', boolean>>;
};

export async function getRomanContent(): Promise<RomanContentEnriched[]> {
  try {
    const userId = await getCurrentUserId();
    // Colonnes réelles de la table : id, type, titre, contenu, auteur, emoji, author_id, created_at
    const { data: itemsRaw } = await supabase
      .from('roman_content')
      .select('id, type, titre, contenu, auteur, emoji, author_id, created_at')
      .order('created_at', { ascending: false })
      .limit(30);
    if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) return [];
    const items = itemsRaw as unknown as RomanContent[];

    const ids = items.map(i => i.id);

    // Une seule requête roman_likes pour les 30 contenus max (≤ 30×3 = 90 lignes plafonnées)
    // user_id inclus pour pouvoir filtrer myReactions côté client sans 2e aller-retour
    const { data: likesRaw } = await supabase
      .from('roman_likes')
      .select('content_id, reaction, user_id')
      .in('content_id', ids)
      .limit(2000); // ~30 contenus × 3 réactions × max users raisonnables

    // Séparer les likes globaux des likes de l'utilisateur courant en une seule passe
    const myRaw = userId
      ? (likesRaw ?? []).filter(l => l.user_id === userId)
      : [];

    const counts: Record<string, RomanLikeCounts> = {};
    const mine: Record<string, Partial<Record<'coeur' | 'etoile' | 'partage', boolean>>> = {};

    for (const id of ids) {
      counts[id] = { coeur: 0, etoile: 0, partage: 0 };
      mine[id] = {};
    }
    for (const l of (likesRaw ?? [])) {
      const r = l.reaction as 'coeur' | 'etoile' | 'partage';
      if (counts[l.content_id]) counts[l.content_id][r] = (counts[l.content_id][r] ?? 0) + 1;
    }
    for (const l of (myRaw ?? [])) {
      const r = l.reaction as 'coeur' | 'etoile' | 'partage';
      if (mine[l.content_id]) mine[l.content_id][r] = true;
    }

    return items.map(item => ({
      ...item,
      likeCounts: counts[item.id] ?? { coeur: 0, etoile: 0, partage: 0 },
      myReactions: mine[item.id] ?? {},
    }));
  } catch (e) {
    console.error('[getRomanContent] Plan B — DB indisponible', e);
    return [];
  }
}

/** Vérifie si l'utilisateur connecté est membre depuis ≥3 jours */
export async function canContributeRoman(): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  const { data } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('id', userId)
    .single();
  if (!data?.created_at) return false;
  const joinedAt = new Date(data.created_at);
  const diffDays = (Date.now() - joinedAt.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 3;
}

/** Soumet un nouveau contenu Roman (réservé aux membres ≥3 jours) */
export async function submitRomanContent(payload: {
  type: RomanContent['type'];
  titre?: string;
  contenu: string;
  auteur?: string;
  emoji?: string;
}): Promise<{ success: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Non connecté.' };
  const allowed = await canContributeRoman();
  if (!allowed) return { success: false, error: 'Réservé aux membres depuis ≥3 jours.' };
  // Colonnes réelles : auteur (pas auteur_pseudo), author_id pour la RLS INSERT policy
  const { error } = await supabase.from('roman_content').insert({
    type:      payload.type,
    titre:     payload.titre?.trim() || null,
    contenu:   payload.contenu.trim(),
    auteur:    payload.auteur?.trim() || 'Âme Anonyme',
    emoji:     payload.emoji || '💫',
    author_id: userId,  // requis par RLS policy roman_content_insert_members
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Supprime son propre parchemin Roman (auteur uniquement) */
export async function deleteRomanContent(id: string): Promise<{ success: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Non connecté.' };
  const { error } = await supabase
    .from('roman_content')
    .delete()
    .eq('id', id)
    .eq('author_id', userId); // double guard côté client (RLS applique aussi)
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Modifie son propre parchemin Roman (auteur, ≥3 jours) */
export async function updateRomanContent(
  id: string,
  payload: { titre?: string; contenu: string; auteur?: string; emoji?: string },
): Promise<{ success: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Non connecté.' };
  if (payload.contenu.trim().length < 20)
    return { success: false, error: 'Le contenu doit faire au moins 20 caractères.' };
  const { error } = await supabase
    .from('roman_content')
    .update({
      titre:   payload.titre?.trim()  || null,
      contenu: payload.contenu.trim(),
      auteur:  payload.auteur?.trim() || 'Âme Anonyme',
      emoji:   payload.emoji          || '💫',
    })
    .eq('id', id)
    .eq('author_id', userId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Notifications ─────────────────────────────────────────
export interface Notification {
  id: string;
  type: 'match' | 'message' | 'destin' | 'synchronicite' | 'evenement' | 'like';
  title: string;
  body: string;
  emoji: string;
  couleur: string;
  is_read: boolean;
  related_id: string | null;
  created_at: string;
}

// Cache notifications — cacheRegistry.notifications (TTL 15s)
export function invalidateNotifsCache(): void { cacheRegistry.notifications.clear(); }

export async function getMyNotifications(): Promise<Notification[]> {
  const cached = cacheRegistry.notifications.getFresh();
  if (cached) return cached;
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    const result = Array.isArray(data) ? data : [];
    cacheRegistry.notifications.set(result);
    return result;
  } catch (e) {
    console.error('[getMyNotifications] Plan B — DB indisponible', e);
    return [];
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  if (!isOnline()) {
    syncQueue.enqueue('mark_notif_read', { id });
    return;
  }
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  if (error) console.error('[markNotificationRead]', error.code, error.message);
  else invalidateNotifsCache();
}

export async function markAllNotificationsRead(): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  if (!isOnline()) {
    syncQueue.enqueue('mark_all_notifs_read', {});
    return;
  }
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
  if (error) console.error('[markAllNotificationsRead]', error.code, error.message);
  else invalidateNotifsCache();
}

export async function deleteNotification(id: string): Promise<void> {
  if (!isOnline()) {
    syncQueue.enqueue('delete_notif', { id });
    return;
  }
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) console.error('[deleteNotification]', error.code, error.message);
  else invalidateNotifsCache();
}

export async function deleteAllNotifications(): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  if (!isOnline()) {
    syncQueue.enqueue('delete_all_notifs', {});
    return;
  }
  const { error } = await supabase.from('notifications').delete().eq('user_id', userId);
  if (error) console.error('[deleteAllNotifications]', error.code, error.message);
  else invalidateNotifsCache();
}

// ── Likes roman ────────────────────────────────────────────
export async function toggleRomanLike(contentId: string, reaction: 'coeur' | 'etoile' | 'partage'): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  const { data: existing } = await supabase
    .from('roman_likes')
    .select('id')
    .eq('user_id', userId)
    .eq('content_id', contentId)
    .eq('reaction', reaction)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase.from('roman_likes').delete().eq('id', existing.id);
    if (error) console.error('[toggleRomanLike] delete échoué', error.code, error.message);
    return false;
  }
  const { error } = await supabase.from('roman_likes').insert({ user_id: userId, content_id: contentId, reaction });
  if (error) {
    console.error('[toggleRomanLike] insert échoué', error.code, error.message);
    return false;
  }
  return true;
}

// ── Paramètres profil ──────────────────────────────────────
export async function updateProfileSettings(fields: {
  is_mystery?: boolean;
  notif_enabled?: boolean;
  synchronicite_enabled?: boolean;
}): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Non connecté');
  await withRetry(async () => {
    // Pas de .select().single() — UPDATE sans retour évite PGRST116 si RLS filtre
    const { error } = await supabase
      .from('profiles')
      .update(fields)
      .eq('id', userId);
    if (error) {
      console.error('[updateProfileSettings] Erreur Supabase:', error.code, error.message, 'fields=', JSON.stringify(fields));
      throw new Error(error.message);
    }
    console.log('[updateProfileSettings] OK fields=', JSON.stringify(fields));
  });
}

// ── Système de Challenges Gamifié ────────────────────────────────────────────

export type ChallengeType = 'daily' | 'weekly' | 'social' | 'creative' | 'reflexion' | 'surprise';
export type ChallengeDiff = 'facile' | 'moyen' | 'difficile' | 'legendaire';
export type ChallengeActionType =
  | 'send_message' | 'send_like' | 'write_roman' | 'view_profiles'
  | 'update_bio'   | 'complete_profile' | 'share_song' | 'answer_quiz'
  | 'visit_map'    | 'manual'
  | 'astro_comment'   // 🌠 Commenter le profil astrologique d'un inconnu
  | 'write_intention'; // 🔮 Écrire une intention / réflexion du jour

export interface Challenge {
  id: string;
  slug: string;
  titre: string;
  description: string;
  emoji: string;
  type: ChallengeType;
  difficulte: ChallengeDiff;
  points: number;
  badge_reward: string | null;
  badge_color: string | null;
  action_type: ChallengeActionType;
  action_count: number;
  order_index: number;
}

export interface UserChallenge {
  id: string;
  challenge_id: string;
  progress: number;
  completed: boolean;
  completed_at: string | null;
  points_earned: number;
  date_assigned: string;
  challenge: Challenge;
  /** true si ce défi a été reporté depuis hier (non terminé J-1) */
  is_carry_over?: boolean;
}

export interface UserStreak {
  current_streak: number;
  longest_streak: number;
  last_active: string | null;
  total_points: number;
}

export interface UserBadge {
  id: string;
  badge_slug: string;
  badge_emoji: string;
  badge_label: string;
  badge_color: string | null;
  earned_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FENÊTRE TEMPORELLE DES DÉFIS — SOURCE UNIQUE DE VÉRITÉ
// ─────────────────────────────────────────────────────────────────────────────
// Toute la logique de "quelle date est-il ?" vit dans la RPC PostgreSQL
// get_challenge_window() qui applique le timezone Europe/Paris configuré en DB.
// Le client NE calcule PLUS de dates — il lit celles retournées par la RPC.
// Cela élimine tous les bugs UTC/local : un utilisateur à Paris, Tokyo ou
// New York voit toujours la MÊME fenêtre de défis.
// ─────────────────────────────────────────────────────────────────────────────

export interface ChallengeWindow {
  today:      string;       // YYYY-MM-DD en Europe/Paris
  week_start: string;       // lundi de la semaine courante
  reset_at:   string;       // ISO — prochain minuit Paris en UTC (pour countdown)
  tz:         string;       // 'Europe/Paris'
}

// Cache en mémoire valide jusqu'au prochain minuit (reset_at)
let _windowCache: ChallengeWindow | null = null;
let _windowCacheExpiry: number = 0;

/**
 * Retourne la fenêtre temporelle courante depuis la DB (avec cache jusqu'au minuit suivant).
 * Fallback : calcul JS local si la RPC échoue (mode offline / erreur réseau).
 */
export async function getChallengeWindow(): Promise<ChallengeWindow> {
  const now = Date.now();

  // Servir depuis le cache si encore valide
  if (_windowCache && now < _windowCacheExpiry) return _windowCache;

  // Détecter le timezone de l'appareil (Intl API — disponible partout)
  // Exemples : "Europe/Brussels", "America/Toronto", "Africa/Dakar"
  // La RPC valide ce timezone contre pg_timezone_names et utilise l'app_timezone si invalide.
  const clientTz = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null; }
    catch { return null; }
  })();

  try {
    const { data, error } = await supabase.rpc('get_challenge_window', { p_tz: clientTz });
    if (error || !data) throw error ?? new Error('no data');

    const w = data as ChallengeWindow;

    // Cache jusqu'à reset_at − 30s (marge pour recharger)
    const expiryMs = new Date(w.reset_at).getTime() - 30_000;
    _windowCache       = w;
    _windowCacheExpiry = expiryMs > now ? expiryMs : now + 60_000;

    return w;
  } catch {
    // Fallback JS local — uniquement si la RPC est indisponible (mode offline)
    const today      = localTodayStr();
    const week_start = weekStartFromStr(today);
    const [yN, moN, dyN] = today.split('-').map(Number);
    const tomorrow   = new Date(yN, moN - 1, dyN + 1);
    const fallbackTz = clientTz ?? 'Europe/Paris';
    return { today, week_start, reset_at: tomorrow.toISOString(), tz: fallbackTz };
  }
}

/** Invalide le cache de fenêtre (appelé après minuit pour forcer un rechargement) */
export function invalidateChallengeWindow(): void {
  _windowCache       = null;
  _windowCacheExpiry = 0;
}

/** Récupère les challenges du jour (daily) + hebdo actifs pour l'utilisateur.
 *  - daily/social/creative/reflexion : date_assigned = today (fuseau Europe/Paris, depuis DB)
 *  - weekly : date_assigned = lundi de la semaine (progression conservée toute la semaine)
 *  - Si tous les défis du jour sont complétés, rotation via reloadOffset
 */
export async function getDailyChallenges(reloadOffset = 0): Promise<UserChallenge[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    // SOURCE UNIQUE DE VÉRITÉ : dates viennent de la DB (timezone Europe/Paris)
    const window    = await getChallengeWindow();
    const today     = window.today;
    const weekStart = window.week_start;

    // Charger tous challenges actifs + progressions aujourd'hui + progressions semaine en parallèle
    // Calcul de la date d'hier (pour exclure les défis déjà vus J-1)
    const [yN, moN, dyN] = today.split('-').map(Number);
    const yesterdayDate = new Date(yN, moN - 1, dyN - 1);
    const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth()+1).padStart(2,'0')}-${String(yesterdayDate.getDate()).padStart(2,'0')}`;

    const [challengesRes, existingTodayRes, existingWeekRes, yesterdayRes] = await Promise.all([
      supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .in('type', ['daily', 'weekly', 'social', 'creative', 'reflexion'])
        .order('order_index', { ascending: true }),
      supabase
        .from('user_challenges')
        .select('*')
        .eq('user_id', userId)
        .eq('date_assigned', today),
      supabase
        .from('user_challenges')
        .select('*')
        .eq('user_id', userId)
        .eq('date_assigned', weekStart),
      // Défis d'hier complets → pour report des non-finis + anti-repeat J-1
      supabase
        .from('user_challenges')
        .select('challenge_id, completed')
        .eq('user_id', userId)
        .eq('date_assigned', yesterday),
    ]);

    const allChallenges = challengesRes.data;
    if (!Array.isArray(allChallenges) || allChallenges.length === 0) return [];

    // Défis d'hier : séparer complétés (anti-repeat) et non-complétés (à reporter)
    const yesterdayRows  = Array.isArray(yesterdayRes.data) ? yesterdayRes.data : [];
    const yesterdayIds   = new Set<string>(yesterdayRows.map(r => r.challenge_id as string));
    // Report J-1 : daily non terminés hier → réinjectés en priorité (max 3 slots)
    const MAX_CARRY = 3;
    const carryOverIds: string[] = yesterdayRows
      .filter(r => r.completed === false)
      .map(r => r.challenge_id as string)
      .slice(0, MAX_CARRY);

    // existingMap : daily/social/créatif → date today ; weekly → date weekStart
    const existingMap = new Map<string, Record<string, unknown>>();
    (Array.isArray(existingTodayRes.data) ? existingTodayRes.data : [])
      .forEach(uc => existingMap.set(uc.challenge_id, uc));
    (Array.isArray(existingWeekRes.data) ? existingWeekRes.data : [])
      .forEach(uc => existingMap.set(uc.challenge_id, uc));

    // IDs déjà complétés aujourd'hui → exclus des nouveaux lots si reloadOffset > 0
    const completedIds = new Set<string>(
      [...existingMap.entries()]
        .filter(([, uc]) => uc.completed === true)
        .map(([challenge_id]) => challenge_id)
    );

    // Sélection déterministe : 5 daily + 2 weekly + 1 social + 1 créatif + 1 réflexion
    const seed     = userId.slice(0, 8) + today;
    const hashSeed = seed.split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);

    const allDaily   = allChallenges.filter(c => c.type === 'daily');
    const weekly     = allChallenges.filter(c => c.type === 'weekly');
    // Chaque type a son propre pool → 1 slot garanti par type
    const socialPool    = allChallenges.filter(c => c.type === 'social');
    const creativePool  = allChallenges.filter(c => c.type === 'creative');
    const reflexionPool = allChallenges.filter(c => c.type === 'reflexion');
    const challengeById = new Map(allChallenges.map(c => [c.id, c]));

    // Fisher-Yates seedé — évite les collisions modulo qui renvoyaient les mêmes challenges
    const seededShuffle = <T,>(arr: T[], seed: number): T[] => {
      const a = [...arr];
      let s = (seed >>> 0) || 1;
      for (let i = a.length - 1; i > 0; i--) {
        s ^= s << 13; s >>>= 0;
        s ^= s >> 17; s >>>= 0;
        s ^= s << 5;  s >>>= 0;
        const j = s % (i + 1);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const pick = (arr: Challenge[], n: number, offset: number, excludeIds: Set<string>): Challenge[] => {
      // Priorité 1 : exclure anti-repeat J-1 et reportés (déjà injectés)
      const withoutExcluded = arr.filter(c => !excludeIds.has(c.id));
      const base = withoutExcluded.length >= n ? withoutExcluded : arr;
      // Priorité 2 : exclure complétés si reloadOffset > 0
      const pool = reloadOffset > 0 ? base.filter(c => !completedIds.has(c.id)) : base;
      const source = pool.length >= n ? pool : base;
      const shuffleSeed = (hashSeed ^ (offset * 2654435761) ^ (reloadOffset * 7919)) >>> 0;
      return seededShuffle(source, shuffleSeed).slice(0, n);
    };

    // ── REPORT DES DÉFIS NON TERMINÉS HIER (max MAX_CARRY slots daily) ──────
    // Les défis reportés occupent les premiers slots daily → l'utilisateur DOIT les finir
    const carryOverChallenges: Challenge[] = carryOverIds
      .map(id => challengeById.get(id))
      .filter((c): c is Challenge => !!c && c.type === 'daily');
    const carryCount    = carryOverChallenges.length;
    const freshDailyNeeded = Math.max(0, 5 - carryCount);

    // IDs à exclure du pool frais : reportés + tous les défis d'hier (anti-repeat)
    const excludeFromFresh = new Set<string>(yesterdayIds);

    const freshDaily: Challenge[] = freshDailyNeeded > 0
      ? pick(allDaily, freshDailyNeeded, 0, excludeFromFresh)
      : [];

    const daily = [...carryOverChallenges, ...freshDaily];

    // Weekly : sélection stable sur toute la semaine (seed = userId + weekStart)
    const weekSeed = userId.slice(0, 8) + weekStart;
    const weekHash = weekSeed.split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
    const pickWeekly = (arr: Challenge[], n: number): Challenge[] =>
      seededShuffle(arr, weekHash >>> 0).slice(0, n);

    const selected: Challenge[] = [
      ...daily,
      ...pickWeekly(weekly, 2),
      // 1 slot garanti par type → le filtre "Créatif" affiche toujours au moins 1 défi
      ...pick(socialPool,    1, 200, new Set()),
      ...pick(creativePool,  1, 300, new Set()),
      ...pick(reflexionPool, 1, 400, new Set()),
    ];

    // Insérer uniquement les user_challenges manquants
    // weekly → date_assigned = weekStart pour conserver la progression toute la semaine
    const toInsert = selected
      .filter(c => !existingMap.has(c.id))
      .map(c => ({
        user_id:       userId,
        challenge_id:  c.id,
        date_assigned: c.type === 'weekly' ? weekStart : today,
        progress:      0,
        completed:     false,
        points_earned: 0,
      }));

    if (toInsert.length > 0) {
      // upsert idempotent — ignoreDuplicates évite les doublons en cas de race multi-onglets
      // PAS de .insert() supplémentaire : le upsert seul suffit
      await supabase.from('user_challenges')
        .upsert(toInsert, { onConflict: 'user_id,challenge_id,date_assigned', ignoreDuplicates: true });
      // Re-charger après insertion
      const [fresh1, fresh2] = await Promise.all([
        supabase.from('user_challenges').select('*').eq('user_id', userId).eq('date_assigned', today),
        supabase.from('user_challenges').select('*').eq('user_id', userId).eq('date_assigned', weekStart),
      ]);
      [...(fresh1.data ?? []), ...(fresh2.data ?? [])].forEach(uc => {
        existingMap.set(uc.challenge_id, uc);
      });
    }

    // Construire le résultat final avec join local
    const carryOverSet = new Set(carryOverIds);
    return selected
      .map(challenge => {
        const uc = existingMap.get(challenge.id);
        if (!uc) return null;
        return {
          id:            uc.id,
          challenge_id:  uc.challenge_id,
          progress:      (uc.progress as number) ?? 0,
          completed:     (uc.completed as boolean) ?? false,
          completed_at:  (uc.completed_at as string) ?? null,
          points_earned: (uc.points_earned as number) ?? 0,
          date_assigned: uc.date_assigned as string,
          is_carry_over: carryOverSet.has(challenge.id),
          challenge,
        } as UserChallenge;
      })
      .filter(Boolean) as UserChallenge[];
  } catch (e) {
    console.error('[getDailyChallenges] Plan B — DB indisponible', e);
    return [];
  }
}

/** Lit le reloadOffset persisté pour l'utilisateur (survit à la déconnexion) */
export async function getReloadOffset(): Promise<number> {
  const userId = await getCurrentUserId();
  if (!userId) return 0;
  const { today } = await getChallengeWindow();
  const { data } = await supabase
    .from('user_reload_offsets')
    .select('offset_val')
    .eq('user_id', userId)
    .eq('date_key', today)
    .maybeSingle();
  return (data?.offset_val as number) ?? 0;
}

/** Persiste le reloadOffset pour l'utilisateur */
export async function saveReloadOffset(offset: number): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  const { today } = await getChallengeWindow();
  await supabase.from('user_reload_offsets').upsert({
    user_id:    userId,
    date_key:   today,
    offset_val: offset,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,date_key' });
}

/**
 * Incrémente la progression d'un challenge de +step et le complète si target atteinte.
 * Guard anti-concurrence : un seul appel par userChallengeId à la fois (évite double-incrément sur double-tap).
 * Retourne la nouvelle progression et si le challenge est complété.
 * Badge : déclenché si le challenge se complète ET que badgeReward est défini.
 */
const _progressInFlight = new Set<string>();

export async function progressChallenge(
  userChallengeId: string,
  target: number,
  points: number,
  step = 1,
  badgeReward: string | null = null,
  badgeSlug  = '',
  badgeLabel = '',
): Promise<{ completed: boolean; pointsEarned: number; newProgress: number }> {
  // Guard anti double-tap : si déjà en vol pour ce challenge, retourner immédiatement
  if (_progressInFlight.has(userChallengeId)) {
    return { completed: false, pointsEarned: 0, newProgress: 0 };
  }
  _progressInFlight.add(userChallengeId);

  try {
    const userId = await getCurrentUserId();
    if (!userId) return { completed: false, pointsEarned: 0, newProgress: 0 };

    const { today } = await getChallengeWindow();

    // Lire progression actuelle
    const { data: uc } = await supabase
      .from('user_challenges')
      .select('progress, completed')
      .eq('id', userChallengeId)
      .maybeSingle();

    // Guard idempotent : déjà complété → ne pas remettre à 0
    if (!uc) return { completed: false, pointsEarned: 0, newProgress: 0 };
    if (uc.completed) return { completed: true, pointsEarned: points, newProgress: target };

    const currentProgress = typeof uc.progress === 'number' ? uc.progress : 0;
    const newProgress = Math.min(currentProgress + step, target);
    const isNowComplete = newProgress >= target;

    const { error } = await supabase.from('user_challenges').update({
      progress:      newProgress,
      completed:     isNowComplete,
      completed_at:  isNowComplete ? new Date().toISOString() : null,
      points_earned: isNowComplete ? points : 0,
    }).eq('id', userChallengeId)
      .eq('completed', false); // guard DB : n'écrase pas si une autre requête a déjà complété

    if (error) {
      console.error('[progressChallenge] update échoué', error.code, error.message);
      return { completed: false, pointsEarned: 0, newProgress: currentProgress };
    }

    if (isNowComplete) {
      await _updateStreak(userId, today, points);
      // Débloquer le badge si défini — withRetry pour zéro perte
      if (badgeReward && badgeSlug) {
        await withRetry(async () => {
          const { error: be } = await supabase.from('user_badges').upsert({
            user_id:     userId,
            badge_slug:  badgeSlug,
            badge_emoji: badgeReward,
            badge_label: badgeLabel,
            badge_color: (await supabase.from('challenges').select('badge_color').eq('slug', badgeSlug).maybeSingle()).data?.badge_color ?? null,
          }, { onConflict: 'user_id,badge_slug', ignoreDuplicates: true });
          if (be) throw be;
        });
      }
    }

    return { completed: isNowComplete, pointsEarned: isNowComplete ? points : 0, newProgress };
  } finally {
    _progressInFlight.delete(userChallengeId);
  }
}

/**
 * Complète directement un challenge (action_type = manual, ou single-step non-manual).
 * Renvoie true si effectivement complété (false si déjà fait).
 */
export async function completeChallenge(
  userChallengeId: string,
  points: number,
  badgeReward: string | null,
  badgeSlug: string,
  badgeLabel: string,
): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { today } = await getChallengeWindow();

  const { data: uc } = await supabase
    .from('user_challenges')
    .select('completed')
    .eq('id', userChallengeId)
    .single();

  if (!uc || uc.completed) return false;

  const { error } = await supabase.from('user_challenges').update({
    progress:      1,
    completed:     true,
    completed_at:  new Date().toISOString(),
    points_earned: points,
  }).eq('id', userChallengeId);

  if (error) return false;

  await _updateStreak(userId, today, points);

  // Débloquer badge si récompense définie — withRetry pour zéro perte
  if (badgeReward && badgeSlug) {
    await withRetry(async () => {
      const { error: e } = await supabase.from('user_badges').upsert({
        user_id:     userId,
        badge_slug:  badgeSlug,
        badge_emoji: badgeReward,
        badge_label: badgeLabel,
        badge_color: (await supabase.from('challenges').select('badge_color').eq('slug', badgeSlug).maybeSingle()).data?.badge_color ?? null,
      }, { onConflict: 'user_id,badge_slug', ignoreDuplicates: true });
      if (e) throw e;
    });
  }

  return true;
}

/** Met à jour le streak de l'utilisateur — withRetry pour zéro perte de points */
/** Met à jour le streak + cumule les points — RPC atomique (FOR UPDATE, zéro doublon, zéro perte) */
async function _updateStreak(userId: string, today: string, pts: number): Promise<void> {
  await withRetry(async () => {
    const { error } = await supabase.rpc('update_streak', {
      p_user_id: userId,
      p_today:   today,
      p_pts:     pts,
    });
    if (error) throw error;
  });
}

/** Récupère le streak et les points de l'utilisateur */
export async function getUserStreak(): Promise<UserStreak> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { current_streak: 0, longest_streak: 0, last_active: null, total_points: 0 };
    const { data } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    return data ?? { current_streak: 0, longest_streak: 0, last_active: null, total_points: 0 };
  } catch (e) {
    console.error('[getUserStreak] Plan B — DB indisponible', e);
    return { current_streak: 0, longest_streak: 0, last_active: null, total_points: 0 };
  }
}

/** Récupère les badges débloqués — de l'utilisateur courant ou d'un autre user (profil public) */
export async function getUserBadges(targetUserId?: string): Promise<UserBadge[]> {
  try {
    const userId = targetUserId ?? await getCurrentUserId();
    if (!userId) return [];
    const { data } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('[getUserBadges] Plan B — DB indisponible', e);
    return [];
  }
}

/** Incrémente automatiquement un challenge par action_type (appelé depuis d'autres actions) */
// Anti-concurrence : un seul appel par actionType en vol à la fois
const _actionsInFlight = new Set<string>();

export async function triggerChallengeAction(actionType: ChallengeActionType): Promise<void> {
  // Debounce : ignore si déjà en cours pour ce type (évite double-incrément like/message rapide)
  if (_actionsInFlight.has(actionType)) return;
  _actionsInFlight.add(actionType);

  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { today, week_start } = await getChallengeWindow();

    // Calcul de la date d'hier (carry-overs gardent date_assigned = yesterday)
    const [yN, moN, dyN] = today.split('-').map(Number);
    const yest = new Date(yN, moN - 1, dyN - 1);
    const yesterday = `${yest.getFullYear()}-${String(yest.getMonth()+1).padStart(2,'0')}-${String(yest.getDate()).padStart(2,'0')}`;

    // Chercher les user_challenges non complétés : today + yesterday (carry-overs) + week_start (weekly)
    const { data: ucs } = await supabase
      .from('user_challenges')
      .select('id, progress, challenge_id, date_assigned')
      .eq('user_id', userId)
      .in('date_assigned', [today, yesterday, week_start])
      .eq('completed', false);

    if (!Array.isArray(ucs) || ucs.length === 0) return;

    // Charger les challenges correspondants à ce type d'action
    const ids = ucs.map(u => u.challenge_id);
    const { data: challenges } = await supabase
      .from('challenges')
      .select('id, action_type, action_count, points, badge_reward, slug, titre')
      .in('id', ids)
      .eq('action_type', actionType);

    if (!Array.isArray(challenges) || challenges.length === 0) return;

    // Incrémenter chaque challenge correspondant
    for (const ch of challenges) {
      const uc = ucs.find(u => u.challenge_id === ch.id);
      if (!uc) continue;
      await progressChallenge(uc.id, ch.action_count, ch.points);
    }
  } finally {
    // Libérer immédiatement après l'appel (pas de délai — c'est une action utilisateur volontaire)
    _actionsInFlight.delete(actionType);
  }
}
// ── Localisation GPS ────────────────────────────────────────────────────────

/** Enregistre la position GPS de l'utilisateur + ville (reverse geocoding côté client) */
export async function updateMyLocation(
  latitude: number,
  longitude: number,
  ville?: string,
): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  await withRetry(async () => {
    const { error } = await supabase.from('profiles').update({
      latitude,
      longitude,
      ville: ville ?? null,
      location_updated_at: new Date().toISOString(),
    }).eq('id', userId);
    if (error) { console.error('[updateMyLocation]', error.code, error.message); throw new Error(error.message); }
  });
}

export type NearbyProfile = Profile & { distance_km: number };

/** Récupère les profils géolocalisés triés par distance via RPC haversine Postgres.
 *  La fonction get_nearby_profiles filtre par bounding-box puis haversine côté DB —
 *  pas de sur-fetch côté client. Index idx_profiles_location accélère le filtrage.
 */
export async function getNearbyProfiles(
  myLat: number,
  myLng: number,
  radiusKm = 50,
  limit = 30,
): Promise<NearbyProfile[]> {
  const userId = await getCurrentUserId();

  // RPC Postgres : haversine + filtre + tri + LIMIT exécutés dans la DB
  const { data, error } = await supabase.rpc('get_nearby_profiles', {
    p_lat:       myLat,
    p_lng:       myLng,
    p_radius_km: radiusKm,
    p_limit:     limit,
    p_user_id:   userId ?? '',
  });

  if (error) {
    console.error('[getNearbyProfiles] RPC échouée', error.code, error.message);
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data as NearbyProfile[];
}

/** Haversine côté client (km) — FIX: guard null/NaN sur lat/lng */
function _haversineClient(lat1: number | null, lon1: number | null, lat2: number | null, lon2: number | null): number {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return Infinity;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return isNaN(c) ? Infinity : R * c;
}

// ── Témoignages (vrais avis membres vérifiés) ──────────────
// Conformité art. L.111-7-2 Code de la Consommation
export interface Temoignage {
  id: string;
  user_id: string;
  texte: string;
  consentement: boolean;
  approuve: boolean;
  created_at: string;
  // Champs joints depuis profiles
  prenom?: string;
  signe_astro?: string;
  ville?: string;
  age?: number;
}

/** Récupère les témoignages approuvés pour la landing (public, sans auth) */
export async function getPublicTemoignages(): Promise<Temoignage[]> {
  const { data, error } = await supabase
    .from('temoignages')
    .select(`
      id, user_id, texte, consentement, approuve, created_at,
      profiles!inner ( prenom, signe_astro, ville, age )
    `)
    .eq('approuve', true)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error || !Array.isArray(data)) return [];
  // Supabase renvoie profiles comme un tableau lors d'un join — on prend le premier élément
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((row) => {
    const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id:           row.id,
      user_id:      row.user_id,
      texte:        row.texte,
      consentement: row.consentement,
      approuve:     row.approuve,
      created_at:   row.created_at,
      prenom:       p?.prenom    ?? '',
      signe_astro:  p?.signe_astro ?? '',
      ville:        p?.ville     ?? '',
      age:          p?.age       ?? 0,
    };
  });
}

/** Soumet un témoignage — réservé aux membres connectés avec consentement explicite */
export async function submitTemoignage(texte: string): Promise<{ success: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Non connecté' };
  if (texte.trim().length < 30) return { success: false, error: 'Le témoignage doit faire au moins 30 caractères.' };
  if (texte.trim().length > 600) return { success: false, error: 'Le témoignage ne peut pas dépasser 600 caractères.' };

  const { error } = await supabase
    .from('temoignages')
    .insert({ user_id: userId, texte: texte.trim(), consentement: true, approuve: false });

  if (error) {
    // Erreur 23505 = violation unique (déjà soumis)
    if (error.code === '23505' || error.message?.includes('duplicate')) {
      return { success: false, error: 'Vous avez déjà soumis un témoignage.' };
    }
    return { success: false, error: 'Impossible de soumettre. Réessayez.' };
  }
  return { success: true };
}

/** Vérifie si le membre connecté a déjà soumis un témoignage */
export async function getMonTemoignage(): Promise<Temoignage | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const { data } = await supabase
    .from('temoignages')
    .select('id, user_id, texte, consentement, approuve, created_at')
    .eq('user_id', userId)
    .maybeSingle();
  return data ?? null;
}

/** Supprime son propre témoignage */
export async function deleteMonTemoignage(): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  const { error } = await supabase.from('temoignages').delete().eq('user_id', userId);
  return !error;
}

// ── Stats app (landing page) ───────────────────────────────
export interface AppStats {
  matches_this_month: number;
  total_users: number;
  total_matches: number;
  total_temoignages: number;
  total_roman: number;
  total_roman_likes: number;
}

export async function getAppStats(): Promise<AppStats> {
  const { data, error } = await supabase.rpc('get_app_stats');
  if (error || !data) {
    return { matches_this_month: 0, total_users: 0, total_matches: 0, total_temoignages: 0, total_roman: 0, total_roman_likes: 0 };
  }
  return data as AppStats;
}

// ── Événements ──────────────────────────────────────────────
export async function getEvents(): Promise<Event[]> {
  // Utiliser now() UTC — date_event est TIMESTAMPTZ stocké en UTC.
  // La comparaison .gte(now_utc) est correcte : un événement à 20h Paris = 18h UTC,
  // il reste visible jusqu'à sa date/heure UTC exacte, indépendamment du fuseau client.
  const { data } = await supabase
    .from('events')
    .select('*')
    .gte('date_event', new Date().toISOString())
    .order('date_event', { ascending: true })
    .limit(20);
  return Array.isArray(data) ? data : [];
}

export async function inscriptionEvent(eventId: string): Promise<void> {
  const { error } = await supabase.from('event_inscriptions').insert({ event_id: eventId });
  if (error) throw new Error(error.message);
}

// ── Likes reçus ──────────────────────────────────────────────
export interface ReceivedLike {
  id: string;
  from_user_id: string;
  action_type: string;
  created_at: string;
  profile?: Profile;
}

export async function getReceivedLikes(): Promise<ReceivedLike[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data } = await supabase
    .from('likes')
    .select('id, from_user_id, action_type, created_at')
    .eq('to_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!Array.isArray(data) || data.length === 0) return [];

  const fromIds = data.map((l: { from_user_id: string }) => l.from_user_id);
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', fromIds);

  const profileMap = new Map<string, Profile>();
  (profiles ?? []).forEach((p: Profile) => profileMap.set(p.id, p));

  return data.map((l: ReceivedLike) => ({ ...l, profile: profileMap.get(l.from_user_id) }));
}

// ── Stats profil (likes envoyés, reçus, matches) ─────────────
export interface ProfilStats {
  likesSent: number;
  likesReceived: number;
  matchesCount: number;
  favorisCount: number;
}

export async function getProfilStats(): Promise<ProfilStats> {
  const userId = await getCurrentUserId();
  if (!userId) return { likesSent: 0, likesReceived: 0, matchesCount: 0, favorisCount: 0 };

  const [sent, received, matchesData, favorisData] = await Promise.all([
    supabase.from('likes').select('id', { count: 'exact', head: true }).eq('from_user_id', userId),
    supabase.from('likes').select('id', { count: 'exact', head: true }).eq('to_user_id', userId),
    supabase.from('matches').select('id', { count: 'exact', head: true })
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`),
    supabase.from('favoris').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  return {
    likesSent:     sent.count ?? 0,
    likesReceived: received.count ?? 0,
    matchesCount:  matchesData.count ?? 0,
    favorisCount:  favorisData.count ?? 0,
  };
}

// ── Favoris ──────────────────────────────────────────────────
export interface Favori {
  id: string;
  user_id: string;
  profile_id: string;
  created_at: string;
  profile?: Profile;
}

export async function getMyFavoris(): Promise<Favori[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data } = await supabase
    .from('favoris')
    .select('id, user_id, profile_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!Array.isArray(data) || data.length === 0) return [];

  const profileIds = data.map((f: { profile_id: string }) => f.profile_id);
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', profileIds);

  const profileMap = new Map<string, Profile>();
  (profiles ?? []).forEach((p: Profile) => profileMap.set(p.id, p));

  return data.map((f: Favori) => ({ ...f, profile: profileMap.get(f.profile_id) }));
}

export async function toggleFavori(profileId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { data: existing } = await supabase
    .from('favoris')
    .select('id')
    .eq('user_id', userId)
    .eq('profile_id', profileId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('favoris').delete().eq('id', existing.id);
    if (error) console.error('[toggleFavori] delete échoué', error.code, error.message);
    return false;
  }
  const { error } = await supabase.from('favoris').insert({ user_id: userId, profile_id: profileId });
  if (error) {
    console.error('[toggleFavori] insert échoué', error.code, error.message);
    return false;
  }
  return true;
}

export async function isFavori(profileId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  const { data } = await supabase
    .from('favoris')
    .select('id')
    .eq('user_id', userId)
    .eq('profile_id', profileId)
    .maybeSingle();
  return !!data;
}

// ── Signalement (obligatoire stores) ────────────────────────

export type ReportReason =
  | 'fake_profile'
  | 'harassment'
  | 'inappropriate_content'
  | 'explicit_content'
  | 'spam'
  | 'underage'
  | 'scam'
  | 'ghosting_abusif'
  | 'impersonation'
  | 'other';

export const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'fake_profile',          label: '🎭 Faux profil',             description: 'Photos volées, identité inventée, bot' },
  { value: 'harassment',            label: '🚫 Harcèlement',             description: 'Messages répétés non désirés, menaces' },
  { value: 'explicit_content',      label: '🔞 Contenu explicite',       description: 'Photos ou messages à caractère sexuel non sollicités' },
  { value: 'inappropriate_content', label: '⚠️ Contenu inapproprié',     description: 'Insultes, contenu choquant ou offensant' },
  { value: 'underage',              label: '👶 Personne mineure',         description: 'Suspicion de moins de 18 ans' },
  { value: 'scam',                  label: '💸 Arnaque / Escroquerie',    description: 'Demandes d\'argent, liens suspects, phishing' },
  { value: 'impersonation',         label: '🪪 Usurpation d\'identité',  description: 'Se fait passer pour une célébrité ou quelqu\'un d\'autre' },
  { value: 'spam',                  label: '📨 Spam / Pub',              description: 'Messages commerciaux, liens externes répétés' },
  { value: 'ghosting_abusif',       label: '👻 Comportement toxique',    description: 'Ghosting répété, manipulation émotionnelle' },
  { value: 'other',                 label: '📋 Autre motif',             description: 'Préciser dans la description' },
];

export async function reportUser(
  reportedId: string,
  reason: ReportReason,
  details?: string,
): Promise<{ success: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Non connecté.' };
  const { error } = await supabase
    .from('reports')
    .insert({ reporter_id: userId, reported_id: reportedId, reason, details });
  if (error) {
    // 23505 = déjà signalé
    if (error.code === '23505') return { success: false, error: 'Vous avez déjà signalé ce profil.' };
    return { success: false, error: 'Impossible de signaler. Réessayez.' };
  }
  return { success: true };
}

// ── Blocage (obligatoire stores) ─────────────────────────────

export async function blockUser(blockedId: string): Promise<{ success: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Non connecté.' };
  const { error } = await supabase
    .from('blocks')
    .insert({ blocker_id: userId, blocked_id: blockedId });
  if (error) {
    if (error.code === '23505') return { success: false, error: 'Utilisateur déjà bloqué.' };
    return { success: false, error: 'Impossible de bloquer. Réessayez.' };
  }
  return { success: true };
}

export async function unblockUser(blockedId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', userId)
    .eq('blocked_id', blockedId);
  return !error;
}

export async function isBlocked(targetId: string): Promise<boolean> {
  const { data } = await supabase.rpc('is_blocked', { p_user_id: targetId });
  return data === true;
}

export async function getMyBlockedIds(): Promise<string[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', userId);
  return Array.isArray(data) ? data.map((b: { blocked_id: string }) => b.blocked_id) : [];
}

// ══════════════════════════════════════════════════════════════
// VAGUE 1 — PARRAINAGE
// ══════════════════════════════════════════════════════════════

export type ReferralStats = {
  referral_code: string;
  referral_count: number;
  premium_until: string | null;
  premium_frames: string[];
  referrals: { referred_id: string; created_at: string; rewarded: boolean }[];
};

/** Récupère le code de parrainage + stats du user courant */
export async function getReferralStats(): Promise<ReferralStats | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;
    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_code, referral_count, premium_until, premium_frames')
      .eq('id', userId)
      .maybeSingle();
    if (!profile) return null;
    const { data: referrals } = await supabase
      .from('referrals')
      .select('referred_id, created_at, rewarded')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });
    return {
      referral_code:  profile.referral_code ?? '',
      referral_count: profile.referral_count ?? 0,
      premium_until:  profile.premium_until ?? null,
      premium_frames: profile.premium_frames ?? [],
      referrals:      Array.isArray(referrals) ? referrals : [],
    };
  } catch (e) {
    console.error('[getReferralStats] Erreur', e);
    return null;
  }
}

/** Applique un code de parrainage lors de l'inscription.
 *  À appeler APRÈS upsertProfileInit avec l'userId du nouvel inscrit.
 *  Utilise un RPC atomique (FOR UPDATE) pour éviter toute race condition
 *  en cas d'inscriptions simultanées avec le même code. */
export async function applyReferralCode(code: string, newUserId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const clean = code.trim().toUpperCase();
    if (!clean.startsWith('AEVYRA-')) return { ok: false, error: 'Code invalide' };

    const { data, error } = await supabase.rpc('apply_referral', {
      p_code:        clean,
      p_new_user_id: newUserId,
    });

    if (error) {
      console.error('[applyReferralCode] RPC error', error.code, error.message);
      return { ok: false, error: error.message };
    }

    const result = data as { ok: boolean; error?: string; already?: boolean };
    return { ok: result.ok, error: result.error };
  } catch (e) {
    console.error('[applyReferralCode] Erreur', e);
    return { ok: false, error: 'Erreur serveur' };
  }
}

// ══════════════════════════════════════════════════════════════
// VAGUE 1 — PUSH TOKENS
// ══════════════════════════════════════════════════════════════

/** Enregistre ou met à jour le push token de l'utilisateur */
export async function savePushToken(token: string, platform?: string): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId || !token) return;
    await supabase.from('push_tokens').upsert(
      { user_id: userId, token, platform: platform ?? null },
      { onConflict: 'user_id,token' }
    );
  } catch (e) {
    console.error('[savePushToken] Erreur', e);
  }
}

/** Supprime le push token (à appeler au signOut) */
export async function removePushToken(token: string): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await supabase.from('push_tokens').delete()
      .eq('user_id', userId)
      .eq('token', token);
  } catch (e) {
    console.error('[removePushToken] Erreur', e);
  }
}

// ══════════════════════════════════════════════════════════════
// VAGUE 1 v2 — PARRAINAGE INTELLIGENT + BOOST VISIBILITÉ
// ══════════════════════════════════════════════════════════════

/** Score de complétion du profil (0–100) calculé côté client */
export function getProfileCompletionScore(p: Profile): number {
  let score = 0;
  if (p.photo_url && p.photo_url.trim() !== '')                   score += 25;
  if (p.bio       && p.bio.trim().length >= 10)                   score += 20;
  if (p.signe_astro && p.signe_astro !== '')                      score += 15;
  if (p.genre       && p.genre !== '')                            score += 10;
  if (p.cherche     && p.cherche !== '')                          score += 10;
  if (p.energie_romantique && p.energie_romantique !== '')        score += 10;
  if (p.date_naissance)                                           score += 10;
  return Math.min(score, 100);
}

export type ReferralStatsV2 = {
  referral_code:   string;
  referral_count:  number;          // parrainages validés (profil 80% + 1 message)
  boost_until:     string | null;   // ISO timestamp
  boost_reason:    string | null;
  premium_until:   string | null;
  premium_frames:  string[];
  referrals: {
    referred_id:       string;
    created_at:        string;
    rewarded:          boolean;
    validated_at:      string | null;
    validation_reason: string | null;
  }[];
};

/** Stats complètes parrainage v2 */
export async function getReferralStatsV2(): Promise<ReferralStatsV2 | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;
    const [profileRes, referralsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('referral_code, referral_count, boost_until, boost_reason, premium_until, premium_frames')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('referrals')
        .select('referred_id, created_at, rewarded, validated_at, validation_reason')
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false })
        .limit(200),   // cap à 200 filleuls — évite sur-fetch pour influenceurs
    ]);
    const profile = profileRes.data;
    if (!profile) return null;
    return {
      referral_code:  profile.referral_code  ?? '',
      referral_count: profile.referral_count ?? 0,
      boost_until:    profile.boost_until    ?? null,
      boost_reason:   profile.boost_reason   ?? null,
      premium_until:  profile.premium_until  ?? null,
      premium_frames: profile.premium_frames ?? [],
      referrals: Array.isArray(referralsRes.data) ? referralsRes.data : [],
    };
  } catch (e) {
    console.error('[getReferralStatsV2]', e);
    return null;
  }
}

/** Vérifie si le boost est encore actif */
export function isBoostActive(boostUntil: string | null): boolean {
  if (!boostUntil) return false;
  return new Date(boostUntil) > new Date();
}

/** Durée restante du boost en texte lisible */
export function boostRemainingLabel(boostUntil: string | null): string {
  if (!boostUntil) return '';
  const diff = new Date(boostUntil).getTime() - Date.now();
  if (diff <= 0) return '';
  const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 300) return '∞ permanent';
  if (days > 0)   return `${days}j ${hours}h restants`;
  return `${hours}h restantes`;
}

/* ══════════════════════════════════════════════════════════════════════════
   Enregistrement de l'executor sync-queue
   ─────────────────────────────────────────────────────────────────────────
   À faire UNE SEULE FOIS après que toutes les fonctions métier sont définies.
   syncQueue.register() reçoit une fonction qui sait exécuter chaque
   ActionType → elle rejoue les actions offline au reconnect.
   ══════════════════════════════════════════════════════════════════════════ */
syncQueue.register(async (action: PendingAction) => {
  const { type, payload } = action;
  try {
    switch (type) {
      case 'mark_notif_read':
        await supabase.from('notifications').update({ is_read: true }).eq('id', payload.id as string);
        invalidateNotifsCache();
        return 'success';
      case 'mark_all_notifs_read': {
        const uid = await getCurrentUserId();
        if (!uid) return 'skip';
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', uid);
        invalidateNotifsCache();
        return 'success';
      }
      case 'delete_notif':
        await supabase.from('notifications').delete().eq('id', payload.id as string);
        invalidateNotifsCache();
        return 'success';
      case 'delete_all_notifs': {
        const uid = await getCurrentUserId();
        if (!uid) return 'skip';
        await supabase.from('notifications').delete().eq('user_id', uid);
        invalidateNotifsCache();
        return 'success';
      }
      case 'mark_messages_read':
        await markMessagesRead(payload.matchId as string);
        return 'success';
      case 'send_like':
        await sendLike(payload.toUserId as string, payload.actionType as string);
        return 'success';
      case 'send_dislike':
        await sendDislike(payload.toUserId as string);
        return 'success';
      default:
        // Type non géré — abandonner sans comptabiliser comme échec
        return 'skip';
    }
  } catch {
    return 'failure';
  }
});
