/* ═══════════════════════════════════════════════════════════════════════════
   Aevyra — Service Worker v8  ·  Architecture réseau stratégique
   ───────────────────────────────────────────────────────────────────────────
   PLAN DU FICHIER (7 sections indépendantes, aucun mélange)
   ───────────────────────────────────────────────────────────────────────────
   § 1  CONFIG           Constantes : version, caches, URLs, TTL
   § 2  RÉSEAU           Détection qualité : fibre · VDSL · ADSL · 4G · 3G · 2G
   § 3  STRATÉGIES       Primitives de cache réutilisables (5 stratégies)
   § 4  LIFECYCLE        install · activate · prefetch prédictif
   § 5  ROUTAGE FETCH    Aiguillage par type de ressource × qualité réseau
   § 6  ÉVÉNEMENTS       push · notificationclick · sync · message · periodicsync
   § 7  UTILITAIRES      offlineFallback · helpers partagés
   ═══════════════════════════════════════════════════════════════════════════ */


/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  § 1  CONFIG — Constantes globales                                      ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

const SW_VERSION  = 'aevyra-sw-v10'; // fix: refresh 1000% — anti-reload-loop, prefetch timestampé, manifest Network-First
const OFFLINE_URL = '/offline.html';

/** Espaces de cache nommés — un par catégorie de ressource */
const CACHE = {
  STATIC : `${SW_VERSION}-static`,   // shell app + précache
  ASSETS : `${SW_VERSION}-assets`,   // JS/CSS Expo bundlés (immutables)
  IMAGES : `${SW_VERSION}-images`,   // images statiques (TTL 7j)
  PAGES  : `${SW_VERSION}-pages`,    // HTML navigation SPA
  API    : `${SW_VERSION}-api`,      // réponses Supabase
  FONT   : `${SW_VERSION}-font`,     // Google Fonts (TTL longue durée)
};

/** Ressources précachées à l'installation (shell minimal offline) */
const PRECACHE_URLS = [
  '/', '/index.html', '/offline.html', '/manifest.json',
  '/favicon.ico', '/icon-96.png', '/icon-180.png',
  '/icon-192.png', '/icon-192-maskable.png',
  '/icon-512.png', '/icon-512-maskable.png',
  '/robots.txt',
];

/** Routes prefetchées en idle selon palier réseau (voir § 4) */
const PREFETCH = {
  // Medium+ (ADSL/4G+) : pages critiques seulement
  BASE: ['/register', '/sign-in', '/compatibilite-astrologique'],
  // Fast/Ultra-fast (fibre/câble) : pages + toutes les OG images pour partage instantané
  AGGRESSIVE: [
    '/rencontre-astrologique', '/app-rencontre-gratuite',
    '/og-image.jpg', '/og-image-share.jpg',
    '/og-rencontre-astro.jpg', '/og-compatibilite.jpg', '/og-spirituel.jpg',
  ],
};

/** TTL cache par catégorie de donnée */
const TTL = {
  API_ULTRA : 30  * 1000,            // fibre : 30s (données très fraîches)
  API_FAST  : 60  * 1000,            // 4G/VDSL : 60s
  API_MEDIUM: 3   * 60 * 1000,       // ADSL/3G : 3 min
  API_SLOW  : 5   * 60 * 1000,       // 2G/save-data : 5 min
  IMAGE     : 7   * 24 * 3600 * 1000,// images statiques : 7 jours
  FONT      : 30  * 24 * 3600 * 1000,// polices : 30 jours
};


/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  § 2  RÉSEAU — Détection qualité fine par palier                        ║
   ║                                                                          ║
   ║  Pourquoi downlink+RTT et pas seulement effectiveType ?                  ║
   ║  → effectiveType rapporte '4g' sur fibre ET ADSL ET câble indifférement ║
   ║  → downlink (Mbps) + rtt (ms) permettent la distinction fibre vs DSL    ║
   ║                                                                          ║
   ║  Paliers et stratégies associées :                                       ║
   ║  ┌─────────────────┬──────────────┬──────────┬──────┬────────────────┐  ║
   ║  │ Palier          │ Connexion    │ downlink │ rtt  │ Timeout SW     │  ║
   ║  ├─────────────────┼──────────────┼──────────┼──────┼────────────────┤  ║
   ║  │ ultra-fast      │ Fibre ≥100M  │ ≥50 Mbps │ ≤20ms│ 2 000 ms      │  ║
   ║  │ fast            │ VDSL/câble   │ ≥10 Mbps │ ≤50ms│ 4 000 ms      │  ║
   ║  │ medium          │ ADSL/4G std  │ ≥2 Mbps  │ ≤150 │ 8 000 ms      │  ║
   ║  │ slow            │ 3G/ADSL dég. │ <2 Mbps  │ >150 │ 15 000 ms     │  ║
   ║  │ save-data       │ Mode économie│ any      │ any  │ 10 000 ms     │  ║
   ║  │ unknown         │ API absente  │ n/a      │ n/a  │ 5 000 ms      │  ║
   ║  └─────────────────┴──────────────┴──────────┴──────┴────────────────┘  ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Retourne le palier réseau courant.
 * Appelé à chaque requête fetch (valeur fraîche, pas de cache de résultat).
 * @returns {'ultra-fast'|'fast'|'medium'|'slow'|'save-data'|'unknown'}
 */
function getNetworkTier() {
  const conn = self.navigator?.connection
    || self.navigator?.mozConnection
    || self.navigator?.webkitConnection;

  if (!conn)            return 'unknown';
  if (conn.saveData)    return 'save-data';

  const ect      = conn.effectiveType || '';
  const downlink = conn.downlink || 0;  // Mbps
  const rtt      = conn.rtt      || 0;  // ms

  // — Paliers lents (effectiveType suffisant) —
  if (ect === 'slow-2g' || ect === '2g') return 'slow';
  if (ect === '3g')                       return 'medium';

  // — ect === '4g' ou absent : affiner par downlink + rtt —
  if (downlink >= 50 && rtt <=  20) return 'ultra-fast'; // fibre 100Mbps+
  if (downlink >= 10 && rtt <=  50) return 'fast';       // VDSL / câble
  if (downlink >=  2 && rtt <= 150) return 'medium';     // ADSL / 4G standard
  if (downlink >   0 && downlink < 2) return 'slow';     // ADSL dégradé
  return 'fast'; // fallback Safari / Firefox sans API Network Information
}

/**
 * Timeout fetch adaptatif selon palier réseau (voir tableau § 2).
 * @returns {number} millisecondes
 */
function getTimeout() {
  switch (getNetworkTier()) {
    case 'ultra-fast': return  2_000;
    case 'fast':       return  4_000;
    case 'medium':     return  8_000;
    case 'slow':       return 15_000;
    case 'save-data':  return 10_000;
    default:           return  5_000;
  }
}

/**
 * TTL Supabase API adaptatif selon palier réseau.
 * Plus le réseau est rapide, plus on accepte des données fraîches.
 * @returns {number} millisecondes
 */
function getApiTTL() {
  switch (getNetworkTier()) {
    case 'ultra-fast': return TTL.API_ULTRA;
    case 'fast':       return TTL.API_FAST;
    case 'medium':     return TTL.API_MEDIUM;
    case 'slow':
    case 'save-data':  return TTL.API_SLOW;
    default:           return TTL.API_FAST;
  }
}


/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  § 3  STRATÉGIES DE CACHE — 5 primitives réutilisables                  ║
   ║                                                                          ║
   ║  Chaque stratégie est une fonction pure : request × cacheName → Response ║
   ║  Le routage (§ 5) choisit la bonne stratégie selon le contexte.          ║
   ║                                                                          ║
   ║  ┌─────────────────────────────────┬──────────────────────────────────┐  ║
   ║  │ Stratégie                       │ Usage typique                    │  ║
   ║  ├─────────────────────────────────┼──────────────────────────────────┤  ║
   ║  │ cacheFirst()                    │ Assets immutables Expo, fonts    │  ║
   ║  │ cacheFirstTTL()                 │ Images statiques (TTL 7 jours)   │  ║
   ║  │ networkFirst()                  │ API Supabase sur réseau rapide   │  ║
   ║  │ cacheFirstNetworkFallback()     │ API Supabase sur réseau lent     │  ║
   ║  │ staleWhileRevalidate()          │ Manifest, robots, pages SPA      │  ║
   ║  └─────────────────────────────────┴──────────────────────────────────┘  ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

// ── Helpers partagés entre stratégies ──────────────────────────────────────

/** Fetch avec AbortController — annule après `ms` ms. */
function fetchWithTimeout(request, ms) {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), ms);
  return fetch(new Request(request, { signal: ctrl.signal }))
    .finally(() => clearTimeout(tid));
}

/** Stocke une réponse en cache avec timestamp X-SW-Cached-At. */
async function storeWithTimestamp(cache, request, response) {
  const headers = new Headers(response.headers);
  headers.set('X-SW-Cached-At', Date.now().toString());
  const clone = new Response(await response.clone().blob(), {
    status: response.status, statusText: response.statusText, headers,
  });
  cache.put(request, clone);
}

/** Vérifie si une entrée cache est encore fraîche (dans le TTL). */
function isFresh(cached, ttl) {
  if (!cached) return false;
  const age = Date.now() - parseInt(cached.headers.get('X-SW-Cached-At') || '0', 10);
  return age < ttl;
}

// ── Stratégie 1 : Cache-First (assets immutables) ──────────────────────────
/** Cache → réseau. Idéal pour les bundles Expo hachés (/_expo/static/). */
async function cacheFirst(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetchWithTimeout(request, getTimeout());
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return errorResponse(503, 'Ressource indisponible hors-ligne.');
  }
}

// ── Stratégie 2 : Cache-First avec TTL ─────────────────────────────────────
/** Cache valide → réseau → cache expiré. Idéal pour images (TTL 7j). */
async function cacheFirstTTL(request, cacheName, ttl) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (isFresh(cached, ttl)) return cached;
  try {
    const res = await fetchWithTimeout(request, getTimeout());
    if (res.ok) { await storeWithTimestamp(cache, request, res); return res; }
    return cached || res;
  } catch {
    return cached || errorResponse(503, 'Image indisponible hors-ligne.');
  }
}

// ── Stratégie 3 : Network-First avec TTL ───────────────────────────────────
/** Réseau → cache TTL → erreur JSON. Idéal pour API Supabase réseau rapide. */
async function networkFirst(request, cacheName, ttl) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetchWithTimeout(request, getTimeout());
    if (res.ok) { await storeWithTimestamp(cache, request, res); return res; }
    throw new Error('response not ok');
  } catch {
    const cached = await cache.match(request);
    if (isFresh(cached, ttl)) return cached;
    return errorResponse(503, JSON.stringify({ error: 'Hors-ligne' }), 'application/json');
  }
}

// ── Stratégie 4 : Cache-First avec fallback réseau ─────────────────────────
/** Cache valide → réseau → cache expiré → erreur JSON.
 *  Idéal pour API Supabase sur réseau lent/économie (préférer données cachées). */
async function cacheFirstNetworkFallback(request, cacheName, ttl) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (isFresh(cached, ttl)) return cached;
  try {
    const res = await fetchWithTimeout(request, getTimeout());
    if (res.ok) { await storeWithTimestamp(cache, request, res); return res; }
    return cached || res;
  } catch {
    return cached || errorResponse(503, JSON.stringify({ error: 'Hors-ligne' }), 'application/json');
  }
}

// ── Stratégie 5 : Stale-While-Revalidate ───────────────────────────────────
/** Cache immédiat + MAJ en arrière-plan. Idéal pour manifest, pages SPA. */
async function _staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then(r => { if (r.ok) cache.put(request, r.clone()); return r; })
    .catch(() => null);
  return cached || (await refresh) || offlineFallback();
}


/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  § 4  LIFECYCLE — install · activate · prefetch prédictif               ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

/** INSTALL : précache le shell minimal + skipWaiting immédiat. */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE.STATIC);
    await Promise.allSettled(PRECACHE_URLS.map(u => cache.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

/** ACTIVATE : purge les anciens caches versionnés + claim toutes les tabs. */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys    = await caches.keys();
    const current = new Set(Object.values(CACHE));
    await Promise.all(
      keys.filter(k => k.startsWith('aevyra-sw-') && !current.has(k))
          .map(k => caches.delete(k))
    );
    await self.clients.claim();
    // Préfetch prédictif en idle — ne bloque PAS l'activation
    // eslint-disable-next-line no-unused-expressions
    void (('requestIdleCallback' in self)
      ? self.requestIdleCallback(prefetchOnIdle)
      : setTimeout(prefetchOnIdle, 3_000));
  })());
});

/**
 * Prefetch prédictif selon palier réseau :
 * - ultra-fast / fast : toutes routes + OG images (préparation partage)
 * - medium            : routes critiques seulement
 * - slow / save-data  : rien (économie bande passante)
 */
async function prefetchOnIdle() {
  const tier = getNetworkTier();
  if (tier === 'slow' || tier === 'save-data') return;

  const cache = await caches.open(CACHE.PAGES);
  const urls  = (tier === 'ultra-fast' || tier === 'fast')
    ? [...PREFETCH.BASE, ...PREFETCH.AGGRESSIVE]
    : PREFETCH.BASE;

  await Promise.allSettled(
    urls.map(u =>
      fetch(u, { priority: 'low' })
        .then(async r => {
          if (!r.ok) return;
          // Stocker avec timestamp pour que networkFirst (TTL) sache que c'est frais
          await storeWithTimestamp(cache, u, r);
        })
        .catch(() => {})
    )
  );
}


/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  § 5  ROUTAGE FETCH — Aiguillage par type × palier réseau               ║
   ║                                                                          ║
   ║  Arbre de décision :                                                     ║
   ║  1. Assets Expo immutables    → cacheFirst (ASSETS)                      ║
   ║  2. Google Fonts              → cacheFirst (FONT)                        ║
   ║  3. Images statiques          → cacheFirstTTL 7j (IMAGES)               ║
   ║  4. Supabase API                                                         ║
   ║     ├─ ultra-fast / fast / medium → networkFirst + TTL adaptatif        ║
   ║     └─ slow / save-data           → cacheFirstNetworkFallback + TTL     ║
   ║  5. Manifest / robots / sitemap   → staleWhileRevalidate (STATIC)       ║
   ║  6. Navigation SPA                                                       ║
   ║     ├─ slow / save-data : cache immédiat + revalidation fond            ║
   ║     └─ fast / unknown   : networkFirst + fallback cache                 ║
   ║  7. Tout le reste         → networkFirst (PAGES, TTL 3min)               ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les non-GET, non-HTTP et outils navigateur
  if (request.method !== 'GET')                                 return;
  if (!url.protocol.startsWith('http'))                         return;
  if (/chrome-extension|devtools/.test(url.href))               return;

  const tier = getNetworkTier();

  // — Règle 1 : Assets Expo immutables (hachés — jamais stale) ─────────────
  if (url.pathname.startsWith('/_expo/static/') || url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, CACHE.ASSETS));
    return;
  }

  // — Règle 2 : Polices Google Fonts ─────────────────────────────────────────
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(cacheFirstTTL(request, CACHE.FONT, TTL.FONT));
    return;
  }

  // — Règle 3 : Images statiques (origin propre) — TTL 7 jours ──────────────
  if (/\.(png|jpg|jpeg|webp|svg|ico|gif|avif)$/.test(url.pathname) && url.origin === self.location.origin) {
    event.respondWith(cacheFirstTTL(request, CACHE.IMAGES, TTL.IMAGE));
    return;
  }

  // — Règle 4 : Supabase API — stratégie selon palier réseau ─────────────────
  if (url.hostname.includes('supabase.co')) {
    const ttl = getApiTTL();
    if (tier === 'slow' || tier === 'save-data') {
      // Réseau lent : données cachées en priorité → économie bande passante
      event.respondWith(cacheFirstNetworkFallback(request, CACHE.API, ttl));
    } else {
      // Réseau rapide/medium : données fraîches en priorité → fallback cache
      event.respondWith(networkFirst(request, CACHE.API, ttl));
    }
    return;
  }

  // — Règle 5 : Ressources SEO / PWA — Network-First (toujours fraîches) ──────
  // manifest.json / robots.txt / sitemap.xml ne sont PAS des assets immutables.
  // staleWhileRevalidate retournerait une ancienne version au refresh → Network-First.
  if (['/manifest.json', '/robots.txt', '/sitemap.xml'].includes(url.pathname)) {
    event.respondWith(networkFirst(request, CACHE.STATIC, TTL.API_MEDIUM));
    return;
  }

  // — Règle 6 : Navigation SPA ───────────────────────────────────────────────
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request, tier));
    return;
  }

  // — Règle 7 : Tout le reste — Network-First pour les ressources dynamiques ──
  // ⚠ Stale-While-Revalidate ne convient PAS ici : sur un refresh, le SW
  // retournerait une ancienne version JS/CSS depuis le cache PAGES sans
  // attendre le réseau → l'utilisateur verrait des données obsolètes.
  // Network-First garantit que le réseau est toujours consulté en premier.
  event.respondWith(networkFirst(request, CACHE.PAGES, TTL.API_MEDIUM));
});

/**
 * Navigation SPA adaptative selon palier réseau.
 *
 * RÈGLE FONDAMENTALE : sur un refresh (Ctrl+R / F5), le navigateur envoie
 * mode:'navigate' avec cache:'no-cache'. Le SW DOIT aller chercher une
 * réponse fraîche — jamais retourner le cache sans aller au réseau d'abord.
 *
 * slow/save-data : Stale-While-Revalidate (cache immédiat + fond réseau).
 * ultra-fast/fast/medium/unknown : Network-First avec timeout étendu 8s
 *   (pas le timeout adaptatif 2s/4s qui expire trop vite sur fibre CDN).
 */
async function handleNavigation(request, tier) {
  const pagesCache  = await caches.open(CACHE.PAGES);
  const staticCache = await caches.open(CACHE.STATIC);

  // Détecte si c'est un vrai refresh (navigateur pose Cache-Control: no-cache)
  const isHardRefresh = request.headers.get('cache-control') === 'no-cache';

  if ((tier === 'slow' || tier === 'save-data') && !isHardRefresh) {
    // Réseau lent sans refresh forcé : cache immédiat + revalidation fond
    const hit = await pagesCache.match(request)
      || await staticCache.match('/index.html')
      || await staticCache.match('/');
    if (hit) {
      fetch(request).then(r => { if (r.ok) pagesCache.put(request, r.clone()); }).catch(() => {});
      return hit;
    }
  }

  // Tous les autres cas (rapide/medium/inconnu ET tout refresh) : Network-First
  // Timeout 8s fixe — indépendant du palier réseau pour éviter qu'un timeout
  // 2s (fibre) ne serve une page cachée obsolète depuis des semaines.
  try {
    const res = await fetchWithTimeout(request, 8_000);
    if (res.ok) { pagesCache.put(request, res.clone()); return res; }
    throw new Error('not ok');
  } catch {
    // Fallback cache uniquement si le réseau échoue vraiment
    return (
      await pagesCache.match(request)
      || await staticCache.match('/index.html')
      || await staticCache.match('/')
      || offlineFallback()
    );
  }
}


/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  § 6  ÉVÉNEMENTS — push · notificationclick · sync · message            ║
   ║        periodicsync                                                      ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

// ── Push Notifications ──────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try   { payload = event.data.json(); }
  catch { payload = { title: 'Aevyra ✨', body: event.data.text() }; }

  const { title = 'Aevyra ✨', body = '', icon, badge, url = '/', data = {} } = payload;
  const notifTag  = data.tag || `aevyra-${data.type || 'notif'}`;
  const isHaptic  = /mobile|android|iphone|ipad/i.test(self.navigator?.userAgent || '');
  const vibration = isHaptic ? [150, 80, 150] : undefined;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:               icon  || '/icon-192.png',
      badge:              badge || '/icon-96.png',
      image:              data.image,
      tag:                notifTag,
      renotify:           false,
      silent:             false,
      vibrate:            vibration,
      requireInteraction: false,
      data:               { url, ...data },
      actions:            data.actions || [],
    })
  );
});

// ── Clic sur notification ───────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(async clients => {
        for (const c of clients) {
          if (new URL(c.url).origin === self.location.origin) {
            await c.focus();
            c.postMessage({ type: 'NAVIGATE', url: targetUrl });
            return;
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});

// ── Background Sync — retry actions offline (likes, messages) ──────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-actions' || event.tag === 'sync-messages') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' })
        .then(clients => clients.forEach(c =>
          c.postMessage({ type: 'SYNC_COMPLETE', tag: event.tag })
        ))
    );
  }
});

// ── Periodic Background Sync — refresh cache toutes les 24h ────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'refresh-stats') {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE.STATIC);
      const urls  = ['/', '/manifest.json', '/offline.html'];
      await Promise.allSettled(
        urls.map(u =>
          fetch(u, { cache: 'no-cache' })
            .then(r => { if (r.ok) cache.put(u, r.clone()); })
            .catch(() => {})
        )
      );
    })());
  }
});

// ── Message API — communication bidirectionnelle page ↔ SW ─────────────────
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys()
          .then(keys => Promise.all(keys.map(k => caches.delete(k))))
          .then(() => event.ports[0]?.postMessage({ ok: true }))
      );
      break;

    case 'CACHE_URLS':
      if (Array.isArray(payload?.urls)) {
        event.waitUntil(
          caches.open(CACHE.PAGES).then(c =>
            Promise.allSettled(payload.urls.map(u => c.add(u).catch(() => {})))
          )
        );
      }
      break;

    case 'GET_VERSION':
      event.ports[0]?.postMessage({ version: SW_VERSION });
      break;

    case 'GET_NETWORK_QUALITY': {
      const conn = self.navigator?.connection
        || self.navigator?.mozConnection
        || self.navigator?.webkitConnection;
      event.ports[0]?.postMessage({
        tier:          getNetworkTier(),
        effectiveType: conn?.effectiveType || 'unknown',
        downlink:      conn?.downlink      || null,
        rtt:           conn?.rtt           || null,
        saveData:      conn?.saveData      || false,
      });
      break;
    }

    case 'GET_CACHE_STATS':
      event.waitUntil((async () => {
        const stats = {};
        for (const [key, name] of Object.entries(CACHE)) {
          const c    = await caches.open(name);
          const keys = await c.keys();
          stats[key] = keys.length;
        }
        event.ports[0]?.postMessage({ stats });
      })());
      break;

    case 'PREFETCH_ROUTES':
      event.waitUntil(prefetchOnIdle());
      break;
  }
});


/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  § 7  UTILITAIRES — helpers partagés                                    ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

/** Retourne la page offline précachée ou un fallback HTML minimal. */
async function offlineFallback() {
  const cache = await caches.open(CACHE.STATIC);
  const page  = await cache.match(OFFLINE_URL);
  if (page) return page;
  return new Response(
    `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Aevyra — Hors-ligne</title>
    <style>
      body{background:#0D0D1A;color:#FFD700;font-family:sans-serif;
           display:flex;align-items:center;justify-content:center;
           min-height:100vh;margin:0;text-align:center;padding:24px}
      h1{font-size:2rem;margin-bottom:16px}
      p{color:#CCCCE0;line-height:1.6}
    </style></head>
    <body>
      <div><h1>✨ Aevyra</h1>
      <p>Vous êtes hors-ligne.<br>Reconnectez-vous pour retrouver vos étoiles.</p></div>
    </body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

/** Crée une Response d'erreur avec le bon Content-Type. */
function errorResponse(status, body, contentType = 'text/plain; charset=utf-8') {
  return new Response(body, { status, headers: { 'Content-Type': contentType } });
}

