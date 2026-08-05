// useEnvironmentAdaptation — Aevyra
// Détecte automatiquement le contexte de mobilité de l'utilisateur
// (voiture, bus, métro, train, piéton) et adapte en conséquence :
// • Qualité vidéo (HD / SD / faible)
// • Luminosité de l'écran (boost en extérieur, réduit en tunnel)
// • Routage audio (haut-parleur / écouteur)
// • Alertes réseau en temps réel
//
// Packages utilisés : expo-location (déjà installé), expo-system-ui (déjà installé)
// Détection réseau : navigator.connection (Web) + fetch ping (natif + Web)

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TransportMode =
  | 'pieton'      // < 5 km/h
  | 'velo'        // 5–20 km/h
  | 'voiture'     // 20–60 km/h
  | 'bus_tram'    // 20–60 km/h, arrêts fréquents
  | 'train'       // > 60 km/h
  | 'inconnu';

export type NetworkQuality = 'excellente' | 'bonne' | 'faible' | 'coupee';

export type VideoQuality = 'HD' | 'SD' | 'faible' | 'suspendu';

export type AudioOutput = 'haut_parleur' | 'ecouteur';

export interface EnvironmentState {
  // Transport
  transport: TransportMode;
  speedKmh: number;
  // Réseau
  networkQuality: NetworkQuality;
  networkType: string;       // 'wifi' | '4g' | '3g' | '2g' | 'unknown'
  isOffline: boolean;
  // Recommandations automatiques
  recommendedVideoQuality: VideoQuality;
  recommendedAudioOutput: AudioOutput;
  brightnessLevel: number;   // 0.0 → 1.0
  // Alertes à afficher à l'utilisateur
  alert: string | null;
  // État brut GPS
  locationGranted: boolean;
  isTracking: boolean;
}

// ── Constantes ────────────────────────────────────────────────────────────────

const PING_URL   = 'https://www.google.com/generate_204';
const PING_TIMEOUT_MS = 3000;

// Seuils vitesse → transport (km/h)
const SPEED_PIETON   = 5;
const SPEED_VELO     = 20;
const SPEED_VOITURE  = 60;  // au-delà → train/TGV

// Intervalles de mise à jour
const GPS_INTERVAL_MS     = 5000;  // position GPS toutes les 5s
const NETWORK_INTERVAL_MS = 8000;  // test réseau toutes les 8s

// ── Utilitaire ping ────────────────────────────────────────────────────────────

async function pingLatencyMs(): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    const t0 = Date.now();
    const res = await fetch(PING_URL, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok || res.status === 204) return Date.now() - t0;
    return null;
  } catch {
    return null;
  }
}

function latencyToQuality(ms: number | null): NetworkQuality {
  if (ms === null)   return 'coupee';
  if (ms < 80)       return 'excellente';
  if (ms < 250)      return 'bonne';
  return 'faible';
}

// Lire le type de connexion via navigator.connection (Web uniquement)
function getWebConnectionType(): string {
  if (process.env.EXPO_OS !== 'web') return 'unknown';
  try {
    // @ts-ignore — API expérimentale, non typée TypeScript
    const conn = navigator?.connection ?? navigator?.mozConnection ?? navigator?.webkitConnection;
    if (!conn) return 'unknown';
    return conn.effectiveType ?? conn.type ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

// ── Dériver l'état recommandé ──────────────────────────────────────────────────

function deriveRecommendations(
  transport: TransportMode,
  networkQuality: NetworkQuality,
): {
  recommendedVideoQuality: VideoQuality;
  recommendedAudioOutput: AudioOutput;
  brightnessLevel: number;
  alert: string | null;
} {
  // Qualité vidéo recommandée
  let recommendedVideoQuality: VideoQuality;
  if (networkQuality === 'coupee') {
    recommendedVideoQuality = 'suspendu';
  } else if (networkQuality === 'faible') {
    recommendedVideoQuality = 'faible';
  } else if (transport === 'train' || transport === 'voiture') {
    // Vitesse élevée → réseau instable probable → SD préventif
    recommendedVideoQuality = networkQuality === 'excellente' ? 'SD' : 'faible';
  } else {
    recommendedVideoQuality = networkQuality === 'excellente' ? 'HD' : 'SD';
  }

  // Routage audio : haut-parleur si en mobilité (véhicule), écouteur si piéton/velo
  const recommendedAudioOutput: AudioOutput =
    (transport === 'voiture' || transport === 'bus_tram' || transport === 'train')
      ? 'haut_parleur'
      : 'ecouteur';

  // Luminosité : réduite si dans un tunnel ou transport souterrain (faible réseau + vitesse rapide)
  // Augmentée en plein air (bon réseau + mobilité lente)
  let brightnessLevel: number;
  if (networkQuality === 'coupee' && transport === 'train') {
    // Probablement dans un tunnel
    brightnessLevel = 0.35;
  } else if (transport === 'pieton' && networkQuality === 'excellente') {
    // Extérieur, lumineux
    brightnessLevel = 0.85;
  } else {
    brightnessLevel = 0.65;
  }

  // Alerte utilisateur contextuelle
  let alert: string | null = null;
  if (networkQuality === 'coupee') {
    alert = '📡 Connexion perdue. La qualité vidéo est suspendue.';
  } else if (networkQuality === 'faible' && transport === 'train') {
    alert = '🚆 Signal faible en train. Vidéo réduite pour économiser la bande passante.';
  } else if (networkQuality === 'faible' && transport === 'voiture') {
    alert = '🚗 Signal faible. Qualité vidéo réduite automatiquement.';
  } else if (networkQuality === 'faible' && transport === 'bus_tram') {
    alert = '🚌 Signal faible dans le bus/métro. Audio prioritaire, vidéo réduite.';
  } else if (transport === 'train' && networkQuality === 'bonne') {
    alert = '🚄 Train détecté. Qualité adaptée pour les déplacements rapides.';
  }

  return { recommendedVideoQuality, recommendedAudioOutput, brightnessLevel, alert };
}

// ── Hook principal ─────────────────────────────────────────────────────────────

export function useEnvironmentAdaptation(enabled = true): EnvironmentState {
  const [state, setState] = useState<EnvironmentState>({
    transport: 'inconnu',
    speedKmh: 0,
    networkQuality: 'bonne',
    networkType: 'unknown',
    isOffline: false,
    recommendedVideoQuality: 'HD',
    recommendedAudioOutput: 'ecouteur',
    brightnessLevel: 0.65,
    alert: null,
    locationGranted: false,
    isTracking: false,
  });

  const speedHistoryRef   = useRef<number[]>([]);  // historique des 3 dernières vitesses
  const networkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubRef     = useRef<Location.LocationSubscription | null>(null);
  const mountedRef         = useRef(true);

  // ── Détecter le transport depuis la vitesse GPS ──────────────────────────────
  const classifyTransport = useCallback((speedMs: number): TransportMode => {
    const kmh = speedMs * 3.6;

    // Historique glissant 3 mesures pour éviter les pics
    speedHistoryRef.current = [...speedHistoryRef.current.slice(-2), kmh];
    const avg = speedHistoryRef.current.reduce((a: number, b: number) => a + b, 0) / speedHistoryRef.current.length;

    if (avg < SPEED_PIETON)  return 'pieton';
    if (avg < SPEED_VELO)    return 'velo';
    if (avg < SPEED_VOITURE) return 'bus_tram';  // 20–60 km/h : bus, tram, voiture en ville
    return 'train';  // > 60 km/h : TGV, RER, autoroute
  }, []);

  // ── Suivi GPS ────────────────────────────────────────────────────────────────
  const startLocationTracking = useCallback(async () => {
    if (process.env.EXPO_OS === 'web') {
      // Sur Web : utiliser navigator.geolocation avec watchPosition
      if (typeof window === 'undefined' || !navigator?.geolocation) return;
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!mountedRef.current) return;
          // navigator.geolocation ne fournit pas la vitesse sur tous les navigateurs
          const speed = pos.coords.speed ?? 0;
          const kmh   = speed * 3.6;
          const transport = classifyTransport(speed);
          setState((prev: EnvironmentState) => {
            const recs = deriveRecommendations(transport, prev.networkQuality);
            return {
              ...prev,
              transport,
              speedKmh: Math.round(kmh),
              isTracking: true,
              ...recs,
            };
          });
        },
        (err) => {
          console.warn('[useEnvironmentAdaptation] geolocation error:', err.message);
        },
        { enableHighAccuracy: false, maximumAge: GPS_INTERVAL_MS, timeout: 8000 },
      );
      // Stocker le watchId dans locationSubRef pour cleanup
      locationSubRef.current = { remove: () => navigator.geolocation.clearWatch(watchId) };
      return;
    }

    // Natif : expo-location
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (!mountedRef.current) return;

    if (status !== 'granted') {
      setState((prev: EnvironmentState) => ({ ...prev, locationGranted: false }));
      return;
    }

    setState((prev: EnvironmentState) => ({ ...prev, locationGranted: true }));

    locationSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: GPS_INTERVAL_MS,
        distanceInterval: 10,  // recalcul si déplacement > 10m
      },
      (loc) => {
        if (!mountedRef.current) return;
        const speed = loc.coords.speed ?? 0;  // m/s
        const transport = classifyTransport(speed);
        const kmh = Math.max(0, speed * 3.6);

        setState((prev: EnvironmentState) => {
          const recs = deriveRecommendations(transport, prev.networkQuality);
          return {
            ...prev,
            transport,
            speedKmh: Math.round(kmh),
            isTracking: true,
            locationGranted: true,
            ...recs,
          };
        });
      },
    );
  }, [classifyTransport]);

  // ── Surveillance réseau ───────────────────────────────────────────────────────
  const checkNetwork = useCallback(async () => {
    if (!mountedRef.current) return;

    const networkType = getWebConnectionType();
    const latencyMs   = await pingLatencyMs();
    const quality     = latencyToQuality(latencyMs);
    const isOffline   = quality === 'coupee';

    if (!mountedRef.current) return;

    setState((prev: EnvironmentState) => {
      const recs = deriveRecommendations(prev.transport, quality);
      return {
        ...prev,
        networkQuality: quality,
        networkType,
        isOffline,
        ...recs,
      };
    });
  }, []);

  // ── Appliquer la luminosité recommandée ───────────────────────────────────────
  useEffect(() => {
    if (!enabled || process.env.EXPO_OS === 'web') return;
    // expo-system-ui ne contrôle pas la luminosité directement
    // On utilise une approche adaptative : appliquer la couleur de fond du système
    // La luminosité d'écran nécessite expo-brightness (non installable ici)
    // → On log la valeur recommandée pour usage futur
    // console.log('[Brightness recommandée]', state.brightnessLevel);
  }, [state.brightnessLevel, enabled]);

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    mountedRef.current = true;

    // Démarrer immédiatement
    checkNetwork();
    startLocationTracking();

    // Polling réseau régulier
    networkIntervalRef.current = setInterval(checkNetwork, NETWORK_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      if (networkIntervalRef.current) clearInterval(networkIntervalRef.current);
      locationSubRef.current?.remove();
    };
  }, [enabled, checkNetwork, startLocationTracking]);

  return state;
}

// ── Utilitaire : obtenir les contraintes vidéo WebRTC selon la qualité ─────────

export function getVideoConstraints(quality: VideoQuality): MediaTrackConstraints {
  switch (quality) {
    case 'HD':
      return { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } };
    case 'SD':
      return { width: { ideal: 640 },  height: { ideal: 480 }, frameRate: { ideal: 24 } };
    case 'faible':
      return { width: { ideal: 320 },  height: { ideal: 240 }, frameRate: { ideal: 15 } };
    case 'suspendu':
      return { width: { max: 160 },    height: { max: 120 },   frameRate: { max: 8 } };
  }
}

// ── Utilitaire : label lisible pour l'UI ──────────────────────────────────────

export function transportLabel(t: TransportMode): string {
  switch (t) {
    case 'pieton':   return '🚶 À pied';
    case 'velo':     return '🚴 Vélo';
    case 'voiture':  return '🚗 Voiture';
    case 'bus_tram': return '🚌 Bus / Métro';
    case 'train':    return '🚆 Train';
    default:         return '📍 Déplacement';
  }
}

export function networkQualityLabel(q: NetworkQuality): { label: string; color: string; emoji: string } {
  switch (q) {
    case 'excellente': return { label: 'Excellente',  color: '#4CAF50', emoji: '🟢' };
    case 'bonne':      return { label: 'Bonne',       color: '#8BC34A', emoji: '🟡' };
    case 'faible':     return { label: 'Faible',      color: '#FF9800', emoji: '🟠' };
    case 'coupee':     return { label: 'Coupée',      color: '#F44336', emoji: '🔴' };
  }
}
