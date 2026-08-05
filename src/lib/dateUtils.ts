/**
 * dateUtils.ts — Source unique de vérité pour toutes les opérations de date/heure
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * RÈGLES D'ARCHITECTURE :
 *
 *  A. HORODATAGES PRÉCIS (TIMESTAMPTZ) — ex: expires_at, boost_until, premium_until
 *     → Toujours comparer en UTC avec Date.now() ou new Date(iso).getTime()
 *     → new Date(isoString) > new Date()  ✅ correct
 *     → Jamais de conversion de fuseau nécessaire
 *
 *  B. DATES CALENDAIRES (YYYY-MM-DD) — ex: défis du jour, horoscope, oracle
 *     → Toujours utiliser getChallengeWindow() depuis amour-api
 *     → Retourne { today, week_start, reset_at, tz } calés sur le fuseau local
 *     → Jamais new Date().toISOString().slice(0,10) (retourne UTC, pas local)
 *
 *  C. DURÉES RELATIVES — ex: "Il y a 3j", "membre depuis X jours"
 *     → Date.now() - new Date(isoString).getTime()  ✅ toujours correct
 *     → Résultat en ms, convertir en min/h/j selon besoin
 *
 *  D. SEEDS DÉTERMINISTES (contenu du jour) — ex: oracle, coup du destin
 *     → Toujours dériver depuis getChallengeWindow().today (YYYY-MM-DD local)
 *     → Utiliser dayOfYearFromStr() ou dayOfMonthFromStr() ci-dessous
 *
 *  E. EDGE FUNCTIONS (Deno/Supabase — runtime UTC)
 *     → new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
 *     → Jamais toISOString().split('T')[0]
 */

// ── A. Comparaisons TIMESTAMPTZ ──────────────────────────────────────────────

/** Retourne true si la date ISO est dans le futur (boost, premium, ban actif…) */
export function isFuture(isoString: string | null | undefined): boolean {
  if (!isoString) return false;
  return new Date(isoString).getTime() > Date.now();
}

/** Nombre de jours restants jusqu'à une date ISO (>=0, null si permanent) */
export function daysUntil(isoString: string | null | undefined): number | null {
  if (!isoString) return null;
  const diff = new Date(isoString).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

/** Durée restante en texte lisible : "2j 3h", "45 min", "∞ permanent", "" si expiré */
export function remainingLabel(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const diff = new Date(isoString).getTime() - Date.now();
  if (diff <= 0) return '';
  if (diff > 300 * 24 * 3_600_000) return '∞ permanent';
  const days  = Math.floor(diff / (24 * 3_600_000));
  const hours = Math.floor((diff % (24 * 3_600_000)) / 3_600_000);
  if (days > 0) return `${days}j ${hours}h`;
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${mins}min`;
  return `${mins} min`;
}

// ── C. Durées relatives ──────────────────────────────────────────────────────

/** Date relative lisible depuis un ISO timestamp : "À l'instant", "Il y a 3j", etc. */
export function relativeDate(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)   return "À l'instant";
  if (m < 60)  return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `Il y a ${d}j`;
  return new Date(isoString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/** Nombre de jours depuis une date ISO (membre depuis X jours, etc.) */
export function daysSince(isoString: string): number {
  return (Date.now() - new Date(isoString).getTime()) / 86_400_000;
}

// ── D. Seeds déterministes depuis YYYY-MM-DD ─────────────────────────────────

/**
 * Numéro du jour dans l'année (1–366) depuis une chaîne YYYY-MM-DD locale.
 * Usage : sélectionner l'horoscope, le conseil, l'oracle du jour.
 * JAMAIS utiliser new Date().getFullYear() + Date.now() directement.
 */
export function dayOfYearFromStr(yyyymmdd: string): number {
  const [y, mo, dy] = yyyymmdd.split('-').map(Number);
  const date   = new Date(y, mo - 1, dy);
  const jan0   = new Date(y, 0, 0);
  return Math.floor((date.getTime() - jan0.getTime()) / 86_400_000);
}

/**
 * Numéro du jour dans le mois (1–31) depuis une chaîne YYYY-MM-DD locale.
 * Usage : seed oracle, index dans un tableau de contenu.
 */
export function dayOfMonthFromStr(yyyymmdd: string): number {
  return parseInt(yyyymmdd.split('-')[2], 10);
}

/**
 * Jour de la semaine (0=dim … 6=sam) depuis une chaîne YYYY-MM-DD locale.
 * Usage : sélectionner le thème du jour, le texte horoscope, etc.
 */
export function dayOfWeekFromStr(yyyymmdd: string): number {
  const [y, mo, dy] = yyyymmdd.split('-').map(Number);
  return new Date(y, mo - 1, dy).getDay();
}

/**
 * Convertit une chaîne YYYY-MM-DD en objet Date JS LOCAL (midi pour éviter DST).
 * Usage : toLocaleDateString(), affichage formaté.
 * JAMAIS new Date('2026-08-05') — parsé en UTC → décalage d'1 jour possible.
 */
export function localDateFromStr(yyyymmdd: string): Date {
  const [y, mo, dy] = yyyymmdd.split('-').map(Number);
  return new Date(y, mo - 1, dy, 12, 0, 0); // midi → stable face au DST
}

// ── E. Fallback JS local (hors RPC) ─────────────────────────────────────────

/**
 * Date locale de l'appareil en YYYY-MM-DD.
 * UNIQUEMENT pour le fallback offline de getChallengeWindow().
 * Partout ailleurs → utiliser getChallengeWindow().today.
 */
export function localTodayStr(): string {
  const d = new Date();
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${dy}`;
}

/**
 * Lundi de la semaine courante en YYYY-MM-DD depuis une date locale.
 * UNIQUEMENT pour le fallback offline de getChallengeWindow().
 */
export function weekStartFromStr(yyyymmdd: string): string {
  const [y, mo, dy] = yyyymmdd.split('-').map(Number);
  const d   = new Date(y, mo - 1, dy);
  const dow = d.getDay() === 0 ? 7 : d.getDay(); // 1=lun…7=dim
  d.setDate(d.getDate() - (dow - 1));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
