/* ═══════════════════════════════════════════════════════════════════════════
   Aevyra — Registre centralisé des caches mémoire (in-process)
   ───────────────────────────────────────────────────────────────────────────
   PROBLÈME résolu : avant ce fichier, les caches étaient définis comme
   variables locales éparpillées dans amour-api.ts (let _xxxCache, TTL inline).
   Impossible de savoir en un coup d'œil quels caches existent, leur TTL,
   ni quelles fonctions les invalident.

   SOLUTION : un registre unique où chaque cache est :
     • nommé (clé string)
     • typé (générique <T>)
     • configuré (TTL explicite)
     • invalidable (clearStore / clearAll)
     • introspectable (listAll pour debug)

   ───────────────────────────────────────────────────────────────────────────
   PLAN DU FICHIER
   ─────────────────────────────────────────────────────────────────────────
   § 1  TTL_MS          Toutes les durées de cache en un seul endroit
   § 2  CacheEntry<T>   Type interne d'une entrée cache
   § 3  CacheStore<T>   Classe générique : get / set / isFresh / clear
   § 4  REGISTRY        Instance globale — tous les stores nommés
   § 5  Helpers         clearAll(), listAll() pour debug / logout
   ═══════════════════════════════════════════════════════════════════════════ */


/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  § 1  TTL_MS — Durées de cache (source de vérité unique)               ║
   ║                                                                          ║
   ║  Règle : plus la donnée mute souvent → TTL court.                       ║
   ║  Règle : plus le réseau est lent → TTL long (réduit les requêtes).      ║
   ║  Le TTL court-circuit s'applique en mémoire (processus).                ║
   ║  Le SW (sw.js) gère un second niveau de cache réseau indépendant.       ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */
export const TTL_MS = {
  /** Session userId — coûteuse (200-500ms sur 3G), change rarement */
  SESSION         : 120_000,  // 2 min

  /** Profil courant — affiché sur quasi toutes les pages */
  MY_PROFILE      :  60_000,  // 1 min

  /** Meta chat (dernier msg + non-lus) — mise à jour à chaque envoi */
  MATCHES_META    :  15_000,  // 15 s

  /** Notifications — badge doit rester quasi-temps-réel */
  NOTIFICATIONS   :  15_000,  // 15 s

  /** Compteur membres landing page — peu critique, évite COUNT(*) répété */
  MEMBERS_COUNT   :  30_000,  // 30 s

  /** Profil public d'un autre utilisateur — rarement modifié */
  PUBLIC_PROFILE  : 120_000,  // 2 min

  /** Statut de connexion entre deux users */
  CONNECTION_STATUS:  30_000, // 30 s
} as const;


/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  § 2  CacheEntry<T> — Structure interne d'une valeur cachée            ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */
interface CacheEntry<T> {
  data: T;
  storedAt: number; // Date.now() au moment du set()
}


/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  § 3  CacheStore<T> — Classe générique par entité                      ║
   ║                                                                          ║
   ║  Usage :                                                                 ║
   ║    const store = new CacheStore<Profile>(TTL_MS.MY_PROFILE);            ║
   ║    store.set(profile);           // stocke avec timestamp               ║
   ║    const p = store.getFresh();   // null si expiré                      ║
   ║    store.clear();                // invalidation immédiate              ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */
export class CacheStore<T> {
  private entry: CacheEntry<T> | null = null;
  private readonly ttl: number;
  readonly name: string;

  constructor(name: string, ttl: number) {
    this.name = name;
    this.ttl  = ttl;
  }

  /** Vérifie si l'entrée existe ET est encore dans le TTL. */
  isFresh(): boolean {
    if (!this.entry) return false;
    return Date.now() - this.entry.storedAt < this.ttl;
  }

  /**
   * Retourne la valeur si fraîche, null sinon.
   * Pattern idéal : const cached = store.getFresh(); if (cached) return cached;
   */
  getFresh(): T | null {
    return this.isFresh() ? this.entry!.data : null;
  }

  /** Stocke la valeur avec timestamp courant. */
  set(data: T): void {
    this.entry = { data, storedAt: Date.now() };
  }

  /** Invalide le cache immédiatement (forçe un refetch au prochain appel). */
  clear(): void {
    this.entry = null;
  }

  /** Âge de l'entrée en ms. Null si aucune entrée. */
  ageMs(): number | null {
    return this.entry ? Date.now() - this.entry.storedAt : null;
  }
}

/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  § 3b CacheStoreKeyed<T> — Cache par clé (ex: profils publics)         ║
   ║                                                                          ║
   ║  Usage :                                                                 ║
   ║    const store = new CacheStoreKeyed<Profile>(TTL_MS.PUBLIC_PROFILE);   ║
   ║    store.set(userId, profile);                                           ║
   ║    const p = store.getFresh(userId); // null si expiré ou absent        ║
   ║    store.clearKey(userId);           // invalide une clé précise        ║
   ║    store.clear();                    // invalide tout                   ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */
export class CacheStoreKeyed<T> {
  private map = new Map<string, CacheEntry<T>>();
  private readonly ttl: number;
  readonly name: string;

  constructor(name: string, ttl: number) {
    this.name = name;
    this.ttl  = ttl;
  }

  private isFreshEntry(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.storedAt < this.ttl;
  }

  getFresh(key: string): T | null {
    const entry = this.map.get(key);
    if (!entry || !this.isFreshEntry(entry)) return null;
    return entry.data;
  }

  set(key: string, data: T): void {
    this.map.set(key, { data, storedAt: Date.now() });
  }

  clearKey(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  size(): number {
    return this.map.size;
  }
}


/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  § 4  REGISTRY — Tous les stores nommés de l'application              ║
   ║                                                                          ║
   ║  Ajouter ici tout nouveau cache — JAMAIS de let _xxxCache dans         ║
   ║  les fichiers métier.                                                    ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

import type { Profile, MatchMeta, Notification } from './amour-api';

export const cacheRegistry = {
  /** userId courant (supabase.auth.getUser) */
  session: new CacheStore<string>('session', TTL_MS.SESSION),

  /** Profil complet de l'utilisateur connecté */
  myProfile: new CacheStore<Profile>('myProfile', TTL_MS.MY_PROFILE),

  /** Meta chat : dernier message + compteur non-lus par match */
  matchesMeta: new CacheStore<MatchMeta[]>('matchesMeta', TTL_MS.MATCHES_META),

  /** Liste des notifications */
  notifications: new CacheStore<Notification[]>('notifications', TTL_MS.NOTIFICATIONS),

  /** Compteur total des membres (landing page) */
  membersCount: new CacheStore<number>('membersCount', TTL_MS.MEMBERS_COUNT),

  /** Profils publics des autres utilisateurs (par userId) */
  publicProfiles: new CacheStoreKeyed<Profile>('publicProfiles', TTL_MS.PUBLIC_PROFILE),

  /** Statut de connexion courant → cible (par targetUserId) */
  connectionStatus: new CacheStoreKeyed<string>('connectionStatus', TTL_MS.CONNECTION_STATUS),
} as const;

export type CacheRegistryKey = keyof typeof cacheRegistry;


/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  § 5  Helpers globaux                                                   ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Vide TOUS les caches — à appeler sur signOut ou changement de compte.
 * Garantit qu'aucune donnée d'un utilisateur précédent ne fuite.
 */
export function clearAllCaches(): void {
  for (const store of Object.values(cacheRegistry)) {
    store.clear();
  }
}

/**
 * Retourne un snapshot debug de tous les caches (nom, âge, fraîcheur).
 * À afficher dans un panneau dev ou logguer sur Sentry.
 */
export function listAllCaches(): Array<{
  name: string;
  fresh: boolean;
  ageMs: number | null;
}> {
  return Object.values(cacheRegistry).map((store) => {
    const isCacheStore = store instanceof CacheStore;
    return {
      name  : store.name,
      fresh : isCacheStore ? store.isFresh() : false,
      ageMs : isCacheStore ? store.ageMs()   : null,
    };
  });
}
