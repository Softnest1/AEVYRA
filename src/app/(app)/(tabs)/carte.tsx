// Aevyra – Carte des Étoiles v2 — GPS réel + radar cosmique interactif
//
// STRATÉGIE multi-device :
//   📱 Mobile   : carte radar plein-écran, étoiles positionnées par distance réelle
//   📟 Tablette : carte plus grande + liste côte à côte
//   🖥️ Desktop  : sidebar profil + carte centrale élargie
//
// MÉCANIQUE :
//   1. Demander permission GPS → récupérer lat/lng
//   2. Sauvegarder position en DB (throttlé 5 min)
//   3. Charger profiles proches (haversine)
//   4. Projeter sur le radar avec distance réelle (cercles concentriques)
//   5. Tap sur une étoile → fiche profil avec distance + compat
//   6. Bouton refresh + rayon ajustable (5 / 20 / 50 km)
//
// DESIGN : radar cosmique animé, cercles de distance pulsants, étoiles
//          colorées selon empreinte_couleur, trails scintillants
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, router, type RelativePathString } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { fetch } from 'expo/fetch';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CosmicBackground from '@/components/CosmicBackground';
import PageHeader from '@/components/PageHeader';
import ProfileCard from '@/components/ProfileCard';
import { useResponsive } from '@/hooks/useResponsive';
import { usePillBottomPad } from '@/hooks/usePillBottomPad';import {
  getNearbyProfiles,
  updateMyLocation,
  computeCompatibilite,
  getMyProfile,
  triggerChallengeAction,
  type Profile,
  type NearbyProfile,
} from '@/lib/amour-api';

// ── Rayons disponibles ────────────────────────────────────────────────────────
const RADIUS_OPTIONS = [5, 20, 50] as const;
type Radius = typeof RADIUS_OPTIONS[number];

// ── Projection d'un profil sur le radar ──────────────────────────────────────
// Chaque profil est positionné selon sa distance réelle (r) et un angle
// déterministe basé sur son id (pas de Math.random pour stabilité)
function projectOnRadar(
  profile: NearbyProfile,
  radiusKm: Radius,
  radarR: number, // rayon en pixels du radar
): { cx: number; cy: number } {
  const hash = profile.id.split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
  const angleDeg = hash % 360;
  const angleRad = (angleDeg * Math.PI) / 180;
  // distance normalisée [0, 1] sur le rayon
  const distRatio = Math.min(profile.distance_km / radiusKm, 0.95);
  // Légère variation angulaire par index pour éviter superposition
  const cx = Math.cos(angleRad) * distRatio * (radarR - 16);
  const cy = Math.sin(angleRad) * distRatio * (radarR - 16);
  return { cx, cy };
}

// ── Étoile animée sur le radar ────────────────────────────────────────────────
function StarDot({
  profile,
  focused,
  cx,
  cy,
  center,
  onPress,
}: {
  key?: React.Key;
  profile: NearbyProfile;
  focused: boolean;
  cx: number;
  cy: number;
  center: number;
  onPress: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  const color = profile.empreinte_couleur || '#9B59B6';

  useEffect(() => {
    if (focused) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.6, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,   duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(1);
    }
  }, [focused, pulse]);

  const dotSize = focused ? 18 : 11;

  return (
    <Pressable
      onPress={onPress}
      style={{
        position: 'absolute',
        left: center + cx - dotSize / 2,
        top:  center + cy - dotSize / 2,
        width: dotSize,
        height: dotSize,
        alignItems: 'center',
        zIndex: focused ? 10 : 5,
      }}
    >
      {/* Halo pulsant */}
      {focused && (
        <Animated.View style={{
          position: 'absolute',
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: color + '40',
          transform: [{ scale: pulse }],
        }} />
      )}
      <View style={{
        width: dotSize,
        height: dotSize,
        borderRadius: dotSize / 2,
        backgroundColor: color,
        borderWidth: focused ? 2 : 0,
        borderColor: '#FFD700',
        boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: focused ? 10 : 4, color }],
      } as any} />
      {/* Label prénom si sélectionné */}
      {focused && (
        <Text style={{
          position: 'absolute',
          top: dotSize + 2,
          color: '#FFD700',
          fontSize: 11,
          fontWeight: '800',
          textAlign: 'center',
          width: 60,
          left: -(60 - dotSize) / 2,
        }} numberOfLines={1}>
          {profile.prenom}
        </Text>
      )}
    </Pressable>
  );
}

// ── Radar cosmique ────────────────────────────────────────────────────────────
function CosmicRadar({
  profiles,
  selectedId,
  onSelect,
  radiusKm,
  radarSize,
  scanRotation,
}: {
  profiles: NearbyProfile[];
  selectedId: string | null;
  onSelect: (p: NearbyProfile | null) => void;
  radiusKm: Radius;
  radarSize: number;
  scanRotation: Animated.Value;
}) {
  const radarR  = radarSize / 2;
  const circleR = [0.33, 0.66, 1.0];
  const ringLabels = [
    `${Math.round(radiusKm * 0.33)} km`,
    `${Math.round(radiusKm * 0.66)} km`,
    `${radiusKm} km`,
  ];

  return (
    <View
      style={{
        width: radarSize,
        height: radarSize,
        borderRadius: radarR,
        backgroundColor: 'rgba(13,13,26,0.95)',
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.25)',
        overflow: 'hidden',
        alignSelf: 'center',
        boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 30, color: 'rgba(75,0,130,0.6)' }],
      } as any}
    >
      {/* Cercles concentriques de distance */}
      {circleR.map((ratio, i) => (
        <React.Fragment key={i}><View
          style={{
            position: 'absolute',
            width: radarSize * ratio,
            height: radarSize * ratio,
            borderRadius: (radarSize * ratio) / 2,
            borderWidth: 1,
            borderColor: i === 2
              ? 'rgba(255,215,0,0.2)'
              : 'rgba(255,215,0,0.1)',
            left: radarR - (radarSize * ratio) / 2,
            top:  radarR - (radarSize * ratio) / 2,
          }}
        />
        </React.Fragment>
      ))}

      {/* Croix cardinale */}
      <View style={{ position: 'absolute', left: radarR - 0.5, top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,215,0,0.07)' }} />
      <View style={{ position: 'absolute', top: radarR - 0.5, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,215,0,0.07)' }} />

      {/* Labels de distance — positionnés sur l'axe horizontal droit */}
      {ringLabels.map((lbl, i) => (
        <React.Fragment key={i}>
          <Text
            style={{
              position: 'absolute',
              // Centre du cercle + rayon du cercle i − décalage texte
              left: radarR + (radarSize * circleR[i]) / 2 - (lbl.length * 5.5 + 4),
              top: radarR - 9,
              color: 'rgba(255,215,0,0.75)',
              fontSize: 10,
              fontWeight: '600',
            }}
          >
            {lbl}
          </Text>
        </React.Fragment>
      ))}

      {/* Balayage radar animé */}
      <Animated.View
        style={{
          position: 'absolute',
          left: radarR,
          top: radarR,
          width: radarR,
          height: radarR,
          transformOrigin: '0% 100%',
          transform: [
            { translateX: 0 },
            { translateY: -radarR },
            { rotate: scanRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
            { translateY: radarR },
          ],
        }}
      >
        <LinearGradient
          colors={['rgba(255,215,0,0.0)', 'rgba(255,215,0,0.18)']}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={{
            width: radarR,
            height: radarR,
          }}
        />
      </Animated.View>

      {/* Point central — VOUS */}
      <Pressable
        onPress={() => onSelect(null)}
        style={{
          position: 'absolute',
          left: radarR - 12,
          top:  radarR - 12,
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: '#FFD700',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 14, color: '#FFD700' }],
        } as any}
      >
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#0D0D1A' }} />
      </Pressable>
      <Text style={{
        position: 'absolute',
        left: radarR - 14,
        top: radarR + 16,
        color: '#FFD700',
        fontSize: 11,
        fontWeight: '900',
        zIndex: 20,
      }}>
        VOUS
      </Text>

      {/* Étoiles des profils */}
      {profiles.map(p => {
        const { cx, cy } = projectOnRadar(p, radiusKm, radarR);
        return (
          <StarDot
            key={p.id}
            profile={p}
            focused={selectedId === p.id}
            cx={cx}
            cy={cy}
            center={radarR}
            onPress={() => onSelect(selectedId === p.id ? null : p)}
          />
        );
      })}
    </View>
  );
}

// ── Carte item de liste ───────────────────────────────────────────────────────
function NearbyItem({
  profile,
  myProfile,
  onPress,
  focused,
}: {
  key?: React.Key;
  profile: NearbyProfile;
  myProfile: Profile | null;
  onPress: () => void;
  focused: boolean;
}) {
  const compat = myProfile ? computeCompatibilite(myProfile, profile) : null;
  const color  = profile.empreinte_couleur || '#9B59B6';
  const km     = profile.distance_km < 1
    ? `${Math.round(profile.distance_km * 1000)} m`
    : `${profile.distance_km.toFixed(1)} km`;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: 8,
        borderRadius: 16,
        backgroundColor: focused ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: focused ? 'rgba(255,215,0,0.35)' : 'rgba(255,255,255,0.06)',
        gap: 12,
      }}
    >
      {/* Pastille couleur + initiale */}
      <View style={{
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: color + '30',
        borderWidth: 2, borderColor: color,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ color, fontSize: 16, fontWeight: '900' }}>
          {profile.prenom?.[0] ?? '?'}
        </Text>
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
          {profile.prenom}, {profile.age} ans
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }} numberOfLines={1}>
          {(profile.devise || profile.bio || '…').replace(/\\n/g, ' ')}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Text style={{ fontSize: 10 }}>📍</Text>
          <Text style={{ color: '#FFD700', fontSize: 11, fontWeight: '800' }}>{km}</Text>
        </View>
        {compat !== null && (
          <Text style={{ color: color, fontSize: 10, fontWeight: '700' }}>
            {compat}% ✦
          </Text>
        )}
      </View>
    </Pressable>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function CarteDesEtoiles() {
  const {
    px, isTablet, isDesktop, isFullHD, isQHD, is4K, isCinema, isCar,
    gap, cardRadius, h3Size, bodySize, captionSize, isLandscapeMobile,
  } = useResponsive();
  const _insets   = useSafeAreaInsets();
  const pillBottomPad = usePillBottomPad();
  const { width: W, height: H } = useWindowDimensions();

  // ── Taille du radar selon surface d'affichage ──────────────────────────
  // Principe : sur grand écran le radar est une colonne fixe à gauche ;
  // sur mobile il occupe toute la largeur disponible.
  const radarSize: number = (() => {
    if (isCinema)  return Math.min(W * 0.35, 900);  // 5K : radar majestueux
    if (is4K)      return Math.min(W * 0.36, 780);  // 4K TV / écran cinéma
    if (isQHD)     return Math.min(W * 0.38, 620);  // QHD / iMac Retina
    if (isFullHD)  return Math.min(W * 0.38, 520);  // 1080p TV/projecteur
    if (isDesktop) return Math.min(W * 0.40, 440);  // bureau / laptop
    if (isCar)     return Math.min(Math.min(W, H) - 24, 300); // voiture : limité par hauteur
    if (isTablet)  return Math.min(W - 80, 420);    // tablette portrait/paysage
    return Math.min(W - px * 2, Math.floor(W * 0.92)); // mobile : bord à bord
  })();

  // Sur desktop+ OU paysage mobile : layout 2 colonnes (radar | liste+profil)
  const isTwoCol = isDesktop || isLandscapeMobile;
  // Largeur de la colonne liste (droite)
  const listColW = isTwoCol
    ? isLandscapeMobile
      ? W - radarSize - px * 2 - 16           // paysage mobile : colonnes compactes
      : W - radarSize - px * 3 - (isCinema ? 80 : is4K ? 60 : isFullHD ? 40 : 32)
    : 0;

  // Refs stables pour éviter la closure stale dans useFocusEffect
  const myLatRef    = useRef<number | null>(null);
  const myLngRef    = useRef<number | null>(null);
  const radiusKmRef = useRef<Radius>(20);

  // États GPS
  const [locStatus, setLocStatus]   = useState<'idle'|'requesting'|'granted'|'denied'|'error'>('idle');
  const [myLat, setMyLat]           = useState<number | null>(null); // eslint-disable-line no-unused-vars
  const [myLng, setMyLng]           = useState<number | null>(null); // eslint-disable-line no-unused-vars
  const [myVille, setMyVille]       = useState<string>('');

  // États données
  const [profiles, setProfiles]     = useState<NearbyProfile[]>([]);
  const [myProfile, setMyProfile]   = useState<Profile | null>(null);
  const [selected, setSelected]     = useState<NearbyProfile | null>(null);
  const [loading, setLoading]       = useState(false);
  const [radiusKm, setRadiusKm]     = useState<Radius>(20);

  // Animation radar — démarre une fois au montage
  const scanAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(scanAnim, { toValue: 1, duration: 3000, useNativeDriver: false })
    ).start();
    return () => scanAnim.stopAnimation();
  }, [scanAnim]);

  // Demander GPS + charger au focus
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const me = await getMyProfile();
          setMyProfile(me);

          // Coords déjà disponibles → juste recharger (utiliser les refs pour éviter la closure stale)
          if (myLatRef.current !== null && myLngRef.current !== null) {
            await loadNearby(myLatRef.current, myLngRef.current, radiusKmRef.current);
            triggerChallengeAction('visit_map').catch(() => {});
            return;
          }

          setLocStatus('requesting');

          if (process.env.EXPO_OS === 'web') {
            // ── Web : géoloc navigateur avec fallback IP ─────────────────────
            // Certains contextes (HTTP non-HTTPS, iframes, TV browsers, CarPlay)
            // refusent navigator.geolocation → on détecte et bascule sur IP.
            const canGeolocate =
              typeof navigator !== 'undefined' &&
              'geolocation' in navigator &&
              window.location.protocol === 'https:';

            if (!canGeolocate) {
              // Fallback : position approximative via IP (précision ~20 km, suffisant pour le radar)
              try {
                const r = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(8000) });
                if (r.ok) {
                  const d = await r.json() as { latitude?: number; longitude?: number; city?: string };
                  if (d.latitude && d.longitude) {
                    setMyLat(d.latitude); myLatRef.current = d.latitude;
                    setMyLng(d.longitude); myLngRef.current = d.longitude;
                    if (d.city) setMyVille(d.city);
                    setLocStatus('granted');
                    await updateMyLocation(d.latitude, d.longitude, d.city ?? '');
                    await loadNearby(d.latitude, d.longitude, radiusKmRef.current);
                    triggerChallengeAction('visit_map').catch(() => {});
                    return;
                  }
                }
              } catch { /* silencieux */ }
              setLocStatus('denied');
              return;
            }

            // GPS navigateur disponible (HTTPS, desktop, mobile, tablette)
            navigator.geolocation.getCurrentPosition(
              async pos => {
                try {
                  const { latitude, longitude } = pos.coords;
                  setMyLat(latitude); myLatRef.current = latitude;
                  setMyLng(longitude); myLngRef.current = longitude;
                  setLocStatus('granted');
                  await updateMyLocation(latitude, longitude);
                  await loadNearby(latitude, longitude, radiusKmRef.current);
                  triggerChallengeAction('visit_map').catch(() => {});
                } catch { setLocStatus('error'); }
              },
              async () => {
                // Refus utilisateur → fallback IP silencieux
                try {
                  const r = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(8000) });
                  if (r.ok) {
                    const d = await r.json() as { latitude?: number; longitude?: number; city?: string };
                    if (d.latitude && d.longitude) {
                      setMyLat(d.latitude); myLatRef.current = d.latitude;
                      setMyLng(d.longitude); myLngRef.current = d.longitude;
                      if (d.city) setMyVille(d.city + ' (approximatif)');
                      setLocStatus('granted');
                      await updateMyLocation(d.latitude, d.longitude, d.city ?? '');
                      await loadNearby(d.latitude, d.longitude, radiusKmRef.current);
                      triggerChallengeAction('visit_map').catch(() => {});
                      return;
                    }
                  }
                } catch { /* silencieux */ }
                setLocStatus('denied');
              },
              { timeout: 12000, maximumAge: 300000 }
            );
            return;
          }

          // ── Native iOS / Android ─────────────────────────────────────────
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') { setLocStatus('denied'); return; }
          setLocStatus('granted');
          try {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude, longitude } = pos.coords;
            setMyLat(latitude); myLatRef.current = latitude;
            setMyLng(longitude); myLngRef.current = longitude;
            const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
            const ville = geo?.city || geo?.subregion || geo?.region || '';
            setMyVille(ville);
            await updateMyLocation(latitude, longitude, ville);
            await loadNearby(latitude, longitude, radiusKmRef.current);
            triggerChallengeAction('visit_map').catch(() => {});
          } catch { setLocStatus('error'); }

        } catch (e) {
          console.error('[Carte] Erreur initialisation', e);
          setLocStatus('error');
        }
      })();
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
  );

  async function loadNearby(lat: number, lng: number, radius: Radius) {
    setLoading(true);
    try {
      const data = await getNearbyProfiles(lat, lng, radius, 30);
      setProfiles(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleRadiusChange(r: Radius) {
    setRadiusKm(r);
    radiusKmRef.current = r;
    setSelected(null);
    if (myLatRef.current !== null && myLngRef.current !== null) {
      await loadNearby(myLatRef.current, myLngRef.current, r);
    }
  }

  async function handleRefresh() {
    if (myLatRef.current !== null && myLngRef.current !== null) {
      await loadNearby(myLatRef.current, myLngRef.current, radiusKmRef.current);
    }
  }

  // ── Écran chargement permission ───────────────────────────────────────────
  if (locStatus === 'idle' || locStatus === 'requesting') {
    return (
      <View style={{ flex: 1 }}>
        <CosmicBackground>
          <PageHeader title="🗺️ Carte des Étoiles" subtitle="Localisation en cours…" />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 32 }}>
            <Text style={{ fontSize: isCinema ? 96 : is4K ? 80 : isFullHD ? 64 : 56 }}>📡</Text>
            <ActivityIndicator color="#FFD700" size="large" />
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: bodySize, textAlign: 'center' }}>
              Recherche des étoiles proches de vous…
            </Text>
          </View>
        </CosmicBackground>
      </View>
    );
  }

  if (locStatus === 'denied') {
    return (
      <View style={{ flex: 1 }}>
        <CosmicBackground>
          <PageHeader title="🗺️ Carte des Étoiles" subtitle="Permission refusée" />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: gap, paddingHorizontal: px }}>
            <Text style={{ fontSize: isCinema ? 96 : is4K ? 80 : isFullHD ? 64 : 56 }}>🚫</Text>
            <Text style={{ color: '#FFD700', fontSize: h3Size * 1.1, fontWeight: '800', textAlign: 'center' }}>
              Permission de localisation refusée
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: bodySize, textAlign: 'center', lineHeight: bodySize * 1.55, maxWidth: 480 }}>
              Pour découvrir les âmes près de vous, activez la localisation dans les réglages de votre navigateur ou appareil.
            </Text>
            <Pressable
              onPress={() => setLocStatus('idle')}
              style={{
                marginTop: 8, paddingHorizontal: 28, paddingVertical: 14,
                borderRadius: cardRadius, backgroundColor: 'rgba(255,215,0,0.15)',
                borderWidth: 1, borderColor: 'rgba(255,215,0,0.4)',
              }}
            >
              <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: bodySize }}>Réessayer</Text>
            </Pressable>
          </View>
        </CosmicBackground>
      </View>
    );
  }

  // ── Blocs réutilisables ───────────────────────────────────────────────────
  const selectedFull = selected;

  // Sélecteur de rayon — taille des pills adaptative
  const RadiusSelector = (
    <View style={{ flexDirection: 'row', justifyContent: isTwoCol ? 'flex-start' : 'center', gap: gap * 0.6, marginBottom: gap, paddingHorizontal: isTwoCol ? 0 : px, flexWrap: 'wrap' }}>
      {RADIUS_OPTIONS.map(r => (
        <Pressable
          key={r}
          onPress={() => handleRadiusChange(r)}
          style={{
            paddingHorizontal: isCinema ? 28 : is4K ? 24 : isFullHD ? 20 : 16,
            paddingVertical: isCinema ? 12 : is4K ? 10 : isFullHD ? 8 : 7,
            borderRadius: 24,
            backgroundColor: radiusKm === r ? 'rgba(255,215,0,0.18)' : 'rgba(255,255,255,0.04)',
            borderWidth: 1,
            borderColor: radiusKm === r ? 'rgba(255,215,0,0.55)' : 'rgba(255,255,255,0.1)',
          }}
        >
          <Text style={{ color: radiusKm === r ? '#FFD700' : 'rgba(255,255,255,0.65)', fontSize: captionSize, fontWeight: radiusKm === r ? '800' : '400' }}>
            📡 {r} km
          </Text>
        </Pressable>
      ))}
    </View>
  );

  // Légende
  const Legend = (
    <View style={{ flexDirection: 'row', justifyContent: isTwoCol ? 'flex-start' : 'center', gap: gap, marginBottom: gap, flexWrap: 'wrap' }}>
      {[
        { color: '#FFD700', label: 'Vous' },
        { color: '#9B59B6', label: 'Célibataires' },
      ].map(({ color, label }) => (
        <React.Fragment key={label}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: captionSize, height: captionSize, borderRadius: captionSize / 2, backgroundColor: color }} />
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize }}>{label}</Text>
          </View>
        </React.Fragment>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: captionSize }}>💛</Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize }}>Sélectionné·e</Text>
      </View>
    </View>
  );

  // Radar + spinner
  const RadarBlock = (
    <View style={{ marginBottom: gap, alignItems: 'center' }}>
      {loading ? (
        <View style={{ width: radarSize, height: radarSize, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: radarSize / 2, backgroundColor: 'rgba(13,13,26,0.95)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)' }}>
          <ActivityIndicator color="#FFD700" size="large" />
          <Text style={{ color: 'rgba(255,215,0,0.75)', marginTop: 12, fontSize: captionSize }}>Scan en cours…</Text>
        </View>
      ) : (
        <CosmicRadar
          profiles={profiles}
          selectedId={selected?.id ?? null}
          onSelect={p => setSelected(p)}
          radiusKm={radiusKm}
          radarSize={radarSize}
          scanRotation={scanAnim}
        />
      )}
    </View>
  );

  // Liste + fiche + état vide
  const ListBlock = (
    <>
      {selectedFull && (
        <View style={{ marginBottom: gap }}>
          <LinearGradient
            colors={['rgba(75,0,130,0.3)', 'rgba(13,13,26,0.6)']}
            style={{ borderRadius: cardRadius, padding: gap * 0.8, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)' }}
          >
            <ProfileCard
              profile={selectedFull}
              compatPercent={myProfile ? computeCompatibilite(myProfile, selectedFull) : undefined}
              extraInfo={selectedFull.distance_km < 1
                ? `📍 ${Math.round(selectedFull.distance_km * 1000)} m`
                : `📍 ${selectedFull.distance_km.toFixed(1)} km`}
            />
          </LinearGradient>
        </View>
      )}

      {profiles.length > 0 && (
        <View style={{ marginBottom: gap }}>
          <Text style={{ color: 'rgba(255,215,0,0.7)', fontSize: captionSize, fontWeight: '700', marginBottom: gap * 0.6, letterSpacing: 1 }}>
            ✦ ÉTOILES PROCHES — triées par distance
          </Text>
          {profiles.map((p) => (
            <NearbyItem
              key={p.id}
              profile={p}
              myProfile={myProfile}
              focused={selected?.id === p.id}
              onPress={() => setSelected(prev => prev?.id === p.id ? null : p)}
            />
          ))}
        </View>
      )}

      {!loading && profiles.length === 0 && locStatus === 'granted' && (
        <View style={{ alignItems: 'center', paddingVertical: gap * 2 }}>
          <Text style={{ fontSize: isCinema ? 80 : is4K ? 64 : isFullHD ? 56 : 48, marginBottom: gap * 0.6 }}>🌌</Text>
          <Text style={{ color: '#FFD700', fontSize: h3Size, fontWeight: '800', textAlign: 'center', marginBottom: gap * 0.4 }}>
            Aucune étoile dans ce rayon
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: bodySize, textAlign: 'center', lineHeight: bodySize * 1.55, maxWidth: 420 }}>
            Essayez un rayon plus large ou revenez plus tard.{'\n'}Les âmes s'éveillent à leur propre rythme.
          </Text>
          <Pressable
            onPress={() => handleRadiusChange(50)}
            style={{ marginTop: gap * 0.8, paddingHorizontal: gap, paddingVertical: gap * 0.5, borderRadius: cardRadius, backgroundColor: 'rgba(255,215,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' }}
          >
            <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: bodySize }}>📡 Élargir à 50 km</Text>
          </Pressable>
        </View>
      )}
    </>
  );

  // ── Vue principale ─────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          {/* En-tête */}
          <PageHeader
            title="🗺️ Carte des Étoiles"
            subtitle={loading ? 'Scan en cours…' : `${profiles.length} âme${profiles.length !== 1 ? 's' : ''} dans un rayon de ${radiusKm} km${myVille ? ` · ${myVille}` : ''}`}
            actions={[
              { emoji: '🔄', onPress: handleRefresh },
              { emoji: '🔔', onPress: () => router.push('/(app)/notifications' as RelativePathString) },
            ]}
          />

          {isTwoCol ? (
            // ── Layout 2 colonnes : desktop / TV / projecteur / 4K / cinéma ──
            <View style={{ flexDirection: 'row', paddingHorizontal: px, gap: is4K || isCinema ? 48 : isFullHD ? 40 : 28, alignItems: 'flex-start' }}>
              {/* Colonne gauche : radar */}
              <View style={{ width: radarSize }}>
                {RadiusSelector}
                {RadarBlock}
                {Legend}
              </View>
              {/* Colonne droite : liste + fiche profil sélectionné */}
              <View style={{ width: listColW, paddingTop: 4 }}>
                {ListBlock}
              </View>
            </View>
          ) : (
            // ── Layout 1 colonne : mobile / tablette / écran voiture ──────────
            <View>
              <View style={{ paddingHorizontal: px }}>
                {RadiusSelector}
              </View>
              {RadarBlock}
              <View style={{ paddingHorizontal: px }}>
                {Legend}
                {ListBlock}
              </View>
            </View>
          )}

          <View style={{ height: pillBottomPad }} />
        </ScrollView>
      </CosmicBackground>
    </View>
  );
}


