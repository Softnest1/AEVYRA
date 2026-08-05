/* ═══════════════════════════════════════════════════════════════════════════
   Aevyra — File de synchronisation offline
   ───────────────────────────────────────────────────────────────────────────
   PROBLÈME résolu : avant ce fichier, les actions effectuées hors-ligne
   (like, message) étaient silencieusement perdues. Aucune file d'attente,
   aucun retry au reconnect.

   SOLUTION : une queue persistée en localStorage qui :
     • enqueue() : sauvegarde l'action avant de l'envoyer
     • flush()   : rejoue les actions en attente dès que le réseau revient
     • s'active automatiquement sur 'online' + visibilitychange
     • est typée (ActionType enum strict)
     • est idempotente (déduplique par actionId)

   ───────────────────────────────────────────────────────────────────────────
   PLAN DU FICHIER
   ─────────────────────────────────────────────────────────────────────────
   § 1  Types            PendingAction, ActionType
   § 2  Persistence      read/write localStorage
   § 3  SyncQueue        classe principale (enqueue, flush, drain)
   § 4  Instance         export singleton + auto-flush au reconnect
   ═══════════════════════════════════════════════════════════════════════════ */


/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  § 1  Types                                                             ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

/** Types d'actions pouvant être mises en file offline. */
export type ActionType =
  | 'send_like'
  | 'send_dislike'
  | 'send_message'
  | 'mark_notif_read'
  | 'mark_all_notifs_read'
  | 'delete_notif'
  | 'delete_all_notifs'
  | 'mark_messages_read'
  | 'toggle_roman_like';

export interface PendingAction {
  /** Identifiant unique — utilisé pour déduplication */
  id: string;
  type: ActionType;
  /** Payload sérialisé (JSON-compatible) */
  payload: Record<string, unknown>;
  /** Timestamp de création (ms) */
  createdAt: number;
  /** Nombre de tentatives échouées */
  attempts: number;
}

/** Résultat d'exécution d'une action */
type ExecutorResult = 'success' | 'failure' | 'skip';

/** Fonction exécutrice fournie par amour-api.ts */
export type ActionExecutor = (action: PendingAction) => Promise<ExecutorResult>;


/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  § 2  Persistence — localStorage (Web) / mémoire (natif)              ║
   ║                                                                          ║
   ║  Sur Web : localStorage est synchrone et persistant entre refreshs.     ║
   ║  Sur natif (Expo) : expo-sqlite/localStorage/install est installé       ║
   ║    dans supabase.ts → même API synchrone disponible.                    ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

const STORAGE_KEY = 'aevyra:sync-queue';
const MAX_ATTEMPTS = 3; // abandon après 3 échecs consécutifs
const MAX_AGE_MS   = 24 * 60 * 60 * 1000; // 24h — purge les actions trop vieilles

function readQueue(): PendingAction[] {
  try {
    const raw = (typeof localStorage !== 'undefined')
      ? localStorage.getItem(STORAGE_KEY)
      : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingAction[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    }
  } catch {
    // Quota exceeded ou environnement SSR — ignorer silencieusement
  }
}

function purgeStale(queue: PendingAction[]): PendingAction[] {
  const now = Date.now();
  return queue.filter(a =>
    (now - a.createdAt) < MAX_AGE_MS && a.attempts < MAX_ATTEMPTS
  );
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}


/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  § 3  SyncQueue — Classe principale                                    ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

export class SyncQueue {
  private executor: ActionExecutor | null = null;
  private flushing = false;

  /**
   * Enregistre l'exécuteur fourni par amour-api.ts.
   * Appelé une seule fois au démarrage de l'app.
   */
  register(executor: ActionExecutor): void {
    this.executor = executor;
  }

  /**
   * Ajoute une action dans la file.
   * Déduplique par (type + JSON(payload)) pour éviter les doubles enqueues.
   */
  enqueue(type: ActionType, payload: Record<string, unknown>): void {
    const queue   = purgeStale(readQueue());
    const dedupKey = `${type}:${JSON.stringify(payload)}`;
    const exists   = queue.some(a => `${a.type}:${JSON.stringify(a.payload)}` === dedupKey);
    if (exists) return; // déjà en attente

    const action: PendingAction = {
      id: generateId(), type, payload, createdAt: Date.now(), attempts: 0,
    };
    writeQueue([...queue, action]);
  }

  /** Retourne le nombre d'actions en attente. */
  size(): number {
    return purgeStale(readQueue()).length;
  }

  /** Retourne les actions en attente (lecture seule). */
  peek(): PendingAction[] {
    return purgeStale(readQueue());
  }

  /** Vide la queue (ex: après signOut). */
  clear(): void {
    writeQueue([]);
  }

  /**
   * Rejoue toutes les actions en attente.
   * - Idempotent : si flush() est déjà en cours, retourne immédiatement.
   * - Chaque action est retirée de la queue seulement après succès.
   * - Après MAX_ATTEMPTS échecs, l'action est abandonnée (purgeStale).
   */
  async flush(): Promise<void> {
    if (this.flushing || !this.executor) return;
    if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) return;

    this.flushing = true;
    try {
      let queue = purgeStale(readQueue());
      if (queue.length === 0) return;

      const remaining: PendingAction[] = [];

      for (const action of queue) {
        try {
          const result = await this.executor(action);
          if (result === 'success' || result === 'skip') {
            // Action réussie ou ignorée — retirer de la queue
            continue;
          }
          // Échec — incrémenter et conserver si sous MAX_ATTEMPTS
          remaining.push({ ...action, attempts: action.attempts + 1 });
        } catch {
          remaining.push({ ...action, attempts: action.attempts + 1 });
        }
      }

      writeQueue(remaining);
    } finally {
      this.flushing = false;
    }
  }
}


/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  § 4  Instance singleton + auto-flush                                  ║
   ║                                                                          ║
   ║  syncQueue est l'unique instance utilisée dans toute l'app.            ║
   ║  Auto-flush sur :                                                        ║
   ║    • 'online'         → reconnexion réseau (mobile revient du tunnel)   ║
   ║    • visibilitychange → l'app revient au premier plan (tab focus)       ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

export const syncQueue = new SyncQueue();

// Auto-flush sur reconnect réseau (mobile, WiFi, etc.)
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncQueue.flush().catch(() => {});
  });

  // Auto-flush quand l'utilisateur revient sur l'onglet / l'app au premier plan (Web uniquement)
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      const online = typeof navigator === 'undefined' || !('onLine' in navigator) || navigator.onLine;
      if (document.visibilityState === 'visible' && online) {
        syncQueue.flush().catch(() => {});
      }
    });
  }
}
