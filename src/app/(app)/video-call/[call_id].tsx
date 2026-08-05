// Aevyra – Appel Vidéo des Âmes ✨
// WebRTC freecam HD — signalisation via Supabase Edge Function
// Épreuve romantique (3 questions) requise pour les DEUX participants

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { PhoneOff, Mic, MicOff, Video, VideoOff, ChevronLeft, Star } from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import { useVideoCall, type CallChallenge } from '@/hooks/useVideoCall';
import { getMyProfile } from '@/lib/amour-api';
import { supabase } from '@/client/supabase';
import {
  useEnvironmentAdaptation,
  networkQualityLabel,
  transportLabel,
  type VideoQuality,
} from '@/hooks/useEnvironmentAdaptation';

// ── Épreuve romantique ────────────────────────────────────────
function ChallengeScreen({
  challenge,
  onSubmit,
  isLoading,
  partnerName,
}: {
  challenge: CallChallenge;
  onSubmit: (answers: Record<number, number>) => void;
  isLoading: boolean;
  partnerName: string;
}) {
  const [answers, setAnswers]   = useState<Record<number, number>>({});
  const [current, setCurrent]   = useState(0);

  const question = challenge.questions[current];
  const total    = challenge.questions.length;
  const answered = Object.keys(answers).length;

  const selectAnswer = (qIdx: number, aIdx: number) => {
    setAnswers((prev: Record<number, number>) => ({ ...prev, [qIdx]: aIdx }));
    // Auto-avancer à la question suivante
    setTimeout(() => {
      if (qIdx < total - 1) setCurrent(qIdx + 1);
    }, 350);
  };

  const canSubmit = answered === total;

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 24 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      overScrollMode="never"
      bounces={false}>
      {/* En-tête */}
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 34 }}>✨</Text>
        <Text style={{ color: '#FFD700', fontSize: 20, fontWeight: '900', textAlign: 'center' }}>
          Épreuve des Âmes
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center' }}>
          Pour vous connecter avec {partnerName}, répondez correctement à {total} questions romantiques.
        </Text>
      </View>

      {/* Progress */}
      <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
        {challenge.questions.map((_, i) => (
          // @ts-ignore
          <View key={i} style={{
            width: 32, height: 4, borderRadius: 2,
            backgroundColor: i < current ? '#FFD700' : i === current ? '#C77DFF' : 'rgba(255,255,255,0.15)',
          }} />
        ))}
      </View>

      {/* Question */}
      <View style={{
        backgroundColor: 'rgba(199,125,255,0.12)', borderRadius: 20,
        borderWidth: 1, borderColor: 'rgba(199,125,255,0.25)',
        padding: 20, gap: 16,
      }}>
        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>
          QUESTION {current + 1}/{total}
        </Text>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', lineHeight: 24 }}>
          {question.question}
        </Text>
        <View style={{ gap: 10 }}>
          {(question.options as string[]).map((opt, i) => {
            const selected = answers[current] === i;
            return (
              <Pressable
                key={i}
                onPress={() => selectAnswer(current, i)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: selected ? '#FFD700' : 'rgba(255,255,255,0.12)',
                  backgroundColor: selected ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.04)',
                  padding: 14,
                }}
              >
                <View style={{
                  width: 24, height: 24, borderRadius: 12,
                  backgroundColor: selected ? '#FFD700' : 'rgba(255,255,255,0.1)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {selected && <Star size={12} color="#0D0D1A" />}
                </View>
                <Text style={{ color: selected ? '#FFD700' : 'rgba(255,255,255,0.75)', fontSize: 14, flex: 1 }}>
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Navigation entre questions */}
      {current > 0 && (
        <Pressable onPress={() => setCurrent((c: number) => c - 1)} style={{ alignItems: 'center' }}>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>← Question précédente</Text>
        </Pressable>
      )}

      {/* Valider */}
      {canSubmit && (
        <Pressable
          onPress={() => !isLoading && onSubmit(answers)}
          style={{ borderRadius: 16, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            style={{ padding: 16, alignItems: 'center', gap: 4 }}
          >
            {isLoading
              ? <ActivityIndicator color="#0D0D1A" />
              : <Text style={{ color: '#0D0D1A', fontWeight: '900', fontSize: 16 }}>
                  ✨ Valider mes réponses
                </Text>
            }
          </LinearGradient>
        </Pressable>
      )}
    </ScrollView>
  );
}

// ── Résultat de l'épreuve ─────────────────────────────────────
function ChallengeResult({
  passed, correct, total, partnerPassed, partnerName,
}: { passed: boolean; correct: number; total: number; partnerPassed: boolean | null; partnerName: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24 }}>
      <Text style={{ fontSize: 60 }}>{passed ? '🌟' : '💔'}</Text>
      <Text style={{ color: '#FFD700', fontSize: 22, fontWeight: '900', textAlign: 'center' }}>
        {passed ? 'Épreuve réussie !' : 'Épreuve non réussie'}
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
        {passed
          ? `Vous avez obtenu ${correct}/${total} bonnes réponses. Bravo ! ✨`
          : `Vous avez obtenu ${correct}/${total}. Il faut 2/3 pour continuer.`}
      </Text>
      {passed && (
        <View style={{
          backgroundColor: 'rgba(199,125,255,0.12)', borderRadius: 16,
          padding: 16, alignItems: 'center', gap: 8,
        }}>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
            EN ATTENTE DE {partnerName.toUpperCase()}
          </Text>
          {partnerPassed === null
            ? <><ActivityIndicator color="#C77DFF" /><Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4 }}>
                {partnerName} répond à son épreuve…
              </Text></>
            : partnerPassed
              ? <Text style={{ color: '#4CAF50', fontSize: 14 }}>✅ {partnerName} a réussi ! Démarrage…</Text>
              : <Text style={{ color: '#FF6B6B', fontSize: 14 }}>❌ {partnerName} n'a pas réussi.</Text>
          }
        </View>
      )}
    </View>
  );
}

// ── Écran appel en cours — WebRTC ─────────────────────────────
function ActiveCallScreen({
  localStream, remoteStream, isMuted, isCameraOff, onHangup, onToggleMute, onToggleCamera, partnerName,
  envAlert, envTransport, envNetQuality, envVideoQuality, getPeerConnection,
}: {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  onHangup: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  partnerName: string;
  envAlert: string | null;
  envTransport: string;
  envNetQuality: string;
  envVideoQuality: VideoQuality;
  getPeerConnection: () => RTCPeerConnection | null;
}) {
  const { width, height } = useWindowDimensions();
  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  // Stats réseau WebRTC locales (complètent l'adaptation d'environnement)
  const [rtcQuality, setRtcQuality] = useState<'HD' | 'SD' | 'faible' | null>(null);
  // Stats réseau : qualité audio/vidéo en temps réel
  const [_netQuality, setNetQuality] = useState<'HD' | 'SD' | 'faible' | null>(null);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Attacher les streams aux éléments vidéo HTML
  // BUG FIX Android Chrome : autoPlay bloqué par autoplay policy → forcer play() manuellement
  useEffect(() => {
    const el = localVideoRef.current;
    if (el && localStream) {
      el.srcObject = localStream;
      // muted=true obligatoire pour autoplay local (évite l'écho de sa propre voix)
      el.muted = true;
      el.play().catch(() => { /* ignoré — l'utilisateur verra le bouton play natif */ });
    }
  }, [localStream]);

  useEffect(() => {
    const el = remoteVideoRef.current;
    if (el && remoteStream) {
      el.srcObject = remoteStream;
      // BUG FIX Safari iOS : setAttribute('playsinline','') requis AVANT play()
      // sinon Safari iOS refuse le playback et reste silencieux sans erreur
      el.setAttribute('playsinline', '');
      el.setAttribute('webkit-playsinline', '');
      // BUG FIX Safari iOS : muted=false explicitement pour entendre l'audio distant
      el.muted = false;
      // BUG FIX Android : play() forcé car autoPlay seul ne suffit pas sur certains Android WebView
      el.play().catch(() => {
        // Fallback : certains navigateurs bloquent play() sans geste utilisateur
        // → on met un état pour afficher un bouton "Activer le son"
      });
    }
  }, [remoteStream]);

  // ── Stats réseau : RTCStatsReport polling toutes les 3s ────────
  useEffect(() => {
    if (process.env.EXPO_OS !== 'web') return;
    const checkStats = async () => {
      const pc = getPeerConnection();
      if (!pc) return;
      try {
        const stats = await pc.getStats();
        let packetsLostRatio = 0;
        let roundTripTime    = 0;
        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            const total = (report.packetsReceived ?? 0) + (report.packetsLost ?? 0);
            if (total > 0) packetsLostRatio = (report.packetsLost ?? 0) / total;
          }
          if (report.type === 'remote-candidate') {
            roundTripTime = report.roundTripTime ?? 0;
          }
        });
        if (packetsLostRatio > 0.1 || roundTripTime > 0.3) setRtcQuality('faible');
        else if (packetsLostRatio > 0.03 || roundTripTime > 0.15) setRtcQuality('SD');
        else setRtcQuality('HD');
        if (packetsLostRatio > 0.1 || roundTripTime > 0.3) setNetQuality('faible');
        else if (packetsLostRatio > 0.03 || roundTripTime > 0.15) setNetQuality('SD');
        else setNetQuality('HD');
      } catch { /* ignore */ }
    };
    statsIntervalRef.current = setInterval(checkStats, 3000);
    return () => { if (statsIntervalRef.current) clearInterval(statsIntervalRef.current); };
  }, [getPeerConnection]);

  // Sur natif — message indicatif
  if (process.env.EXPO_OS !== 'web') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <Text style={{ fontSize: 48 }}>📱</Text>
        <Text style={{ color: '#FFD700', fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
          Ouvrez Aevyra sur votre navigateur pour l'appel vidéo
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center' }}>
          La vidéo en direct nécessite un navigateur web (Chrome, Firefox, Safari)
        </Text>
        <Pressable onPress={onHangup} style={{ marginTop: 16 }}>
          <LinearGradient colors={['#FF4444', '#CC0000']} style={{ borderRadius: 40, padding: 20 }}>
            <PhoneOff size={28} color="#fff" />
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  // Couleur badge qualité : priorité au réseau d'environnement, fallback RTC local
  const displayQuality = rtcQuality ?? envVideoQuality;
  const qualityColor = displayQuality === 'HD' ? '#4CAF50'
    : displayQuality === 'SD' ? '#FFD700'
    : displayQuality === 'faible' ? '#FF9800'
    : '#FF4444';  // suspendu

  const netInfo = networkQualityLabel(envNetQuality as Parameters<typeof networkQualityLabel>[0]);

  return (
    <View style={{ flex: 1, position: 'relative' }}>

      {/* Bannière d'alerte environnement (voiture / tunnel / signal faible) */}
      {envAlert && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
          backgroundColor: 'rgba(255,120,0,0.92)',
          paddingHorizontal: 16, paddingVertical: 8,
          flexDirection: 'row', alignItems: 'center', gap: 8,
        }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', flex: 1 }}>{envAlert}</Text>
        </View>
      )}
      {/* Vidéo distante (plein écran) */}
      {/* BUG FIX : 'inset: 0' non supporté React Native Web → top/left/right/bottom */}
      <View style={{ width, height, backgroundColor: '#000', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {remoteStream
          ? (
            // @ts-ignore — balise HTML <video> dans branche web
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )
          : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <ActivityIndicator color="#C77DFF" size="large" />
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>
                Connexion avec {partnerName}…
              </Text>
            </View>
          )
        }
      </View>

      {/* Overlay gradient bas */}
      {/* BUG FIX : pointerEvents prop (pas style) pour React Native Web */}
      <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 }}>
        <LinearGradient
          colors={['transparent', 'rgba(13,13,26,0.95)']}
          style={{ flex: 1 }}
        />
      </View>

      {/* Nom du partenaire + badges qualité réseau + transport */}
      <View style={{ position: 'absolute', top: envAlert ? 44 : 20, left: 20, gap: 4 }}>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 8 }}>
          {partnerName}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: netInfo.color }} />
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>En direct</Text>
          {/* Badge qualité vidéo */}
          <View style={{
            paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
            backgroundColor: `${qualityColor}25`,
            borderWidth: 1, borderColor: `${qualityColor}60`,
          }}>
            <Text style={{ color: qualityColor, fontSize: 10, fontWeight: '700' }}>
              {displayQuality === 'HD' ? '🎙 HD'
                : displayQuality === 'SD' ? '🎙 SD'
                : displayQuality === 'faible' ? '⚠️ Signal faible'
                : '⏸ Vidéo suspendue'}
            </Text>
          </View>
          {/* Badge transport (voiture / train / métro…) */}
          {envTransport !== 'inconnu' && envTransport !== 'pieton' && (
            <View style={{
              paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
            }}>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600' }}>
                {transportLabel(envTransport as Parameters<typeof transportLabel>[0])}

              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Vidéo locale (mini, coin bas-droite) */}
      <View style={{
        position: 'absolute', bottom: 100, right: 16,
        width: 100, height: 140, borderRadius: 16, overflow: 'hidden',
        borderWidth: 2, borderColor: '#FFD700',
      }}>
        {localStream && !isCameraOff
          ? (
            // @ts-ignore — balise <video> web
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
          )
          : (
            <View style={{ flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' }}>
              <VideoOff size={24} color="rgba(255,255,255,0.4)" />
            </View>
          )
        }
      </View>

      {/* Contrôles */}
      <View style={{
        position: 'absolute', bottom: 36, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'center', gap: 20,
      }}>
        {/* Micro */}
        <Pressable onPress={onToggleMute} style={{
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: isMuted ? '#FF4444' : 'rgba(255,255,255,0.15)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {isMuted ? <MicOff size={24} color="#fff" /> : <Mic size={24} color="#fff" />}
        </Pressable>

        {/* Raccrocher */}
        <Pressable onPress={onHangup} style={{
          width: 68, height: 68, borderRadius: 34,
          backgroundColor: '#FF3B30',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 12,
          elevation: 8,
        }}>
          <PhoneOff size={28} color="#fff" />
        </Pressable>

        {/* Caméra */}
        <Pressable onPress={onToggleCamera} style={{
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: isCameraOff ? '#FF4444' : 'rgba(255,255,255,0.15)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {isCameraOff ? <VideoOff size={24} color="#fff" /> : <Video size={24} color="#fff" />}
        </Pressable>
      </View>
    </View>
  );
}

// ── Écran de fin d'appel avec auto-redirect 3s ───────────────
function EndedScreen({
  status,
  partnerName,
  partnerPhoto,
  onBack,
}: {
  status: 'ended' | 'rejected' | 'missed';
  partnerName: string;
  partnerPhoto: string | null;
  onBack: () => void;
}) {
  const [countdown, setCountdown] = useState(3);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fondu entrant
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    // Countdown + auto-redirect
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(t); onBack(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emoji   = status === 'rejected' ? '💔' : status === 'missed' ? '📵' : '✨';
  const label   = status === 'rejected' ? 'Appel refusé'
                : status === 'missed'   ? 'Appel manqué'
                : 'Appel terminé';
  const sublabel = status === 'rejected'
    ? `${partnerName} n'était pas disponible`
    : status === 'missed'
    ? `${partnerName} n'a pas répondu`
    : `Vous avez raccroché`;

  return (
    <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center',
      gap: 18, padding: 24, opacity: fadeAnim }}>
      {/* Photo partenaire avec overlay */}
      {partnerPhoto ? (
        <View style={{ width: 90, height: 90, borderRadius: 45, overflow: 'hidden',
          borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' }}>
          <Image source={{ uri: partnerPhoto }} style={{ width: 90, height: 90 }} contentFit="cover" />
          <View style={{ ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 28 }}>{emoji}</Text>
          </View>
        </View>
      ) : (
        <Text style={{ fontSize: 64 }}>{emoji}</Text>
      )}

      <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' }}>
        {label}
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center' }}>
        {sublabel}
      </Text>

      {/* Barre countdown */}
      <View style={{ width: 200, height: 3, backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
        <View style={{ height: 3, borderRadius: 2, backgroundColor: '#FFD700',
          width: `${(countdown / 3) * 100}%` }} />
      </View>
      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
        Retour dans {countdown}s…
      </Text>

      {/* Bouton retour immédiat */}
      <Pressable onPress={onBack} style={{ borderRadius: 14, overflow: 'hidden', marginTop: 4 }}>
        <LinearGradient colors={['#FFD700', '#FFA500']}
          style={{ paddingHorizontal: 28, paddingVertical: 13 }}>
          <Text style={{ color: '#0D0D1A', fontWeight: '900', fontSize: 15 }}>
            Retour maintenant
          </Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

// ── Écran de sonnerie immersif ────────────────────────────────
const RINGING_MSGS = [
  '✨ Votre connexion cosmique s\'établit…',
  '💫 Les étoiles alignent vos âmes…',
  '🌙 En route vers votre rendez-vous…',
  '💜 Votre âme sœur est appelée…',
  '🔮 La magie opère en ce moment…',
];
const RING_TIMEOUT_S = 45;

function RingingScreen({
  partnerName,
  partnerPhoto,
  myPhoto,
  onCancel,
  onTimeout,
}: {
  partnerName: string;
  partnerPhoto: string | null;
  myPhoto: string | null;
  onCancel: () => void;
  onTimeout: () => void;  // hangup propre avec signal DB missed
}) {
  const [seconds, setSeconds]   = useState(0);
  const [msgIdx, setMsgIdx]     = useState(0);
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const fadeAnim   = useRef(new Animated.Value(1)).current;

  // Compteur secondes + timeout 45s → appelle hangup proprement (signal DB missed)
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => {
      if (s + 1 >= RING_TIMEOUT_S) { clearInterval(t); onTimeout(); }
      return s + 1;
    }), 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rotation messages romantiques toutes les 4s
  useEffect(() => {
    const t = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      setMsgIdx((i) => (i + 1) % RINGING_MSGS.length);
    }, 4000);
    return () => clearInterval(t);
  }, [fadeAnim]);

  // Pulse double anneau
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(450),
        Animated.timing(pulseAnim2, { toValue: 1.32, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim2, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start(); loop2.start();
    return () => { loop.stop(); loop2.stop(); };
  }, [pulseAnim, pulseAnim2]);

  const remaining = RING_TIMEOUT_S - seconds;
  const progress  = seconds / RING_TIMEOUT_S; // 0→1

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 0, paddingHorizontal: 24 }}>

      {/* Photos côte-à-côte : moi ↔ partenaire */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 36 }}>
        {/* Ma photo */}
        <View style={{ width: 72, height: 72, borderRadius: 36, overflow: 'hidden',
          borderWidth: 2, borderColor: 'rgba(199,125,255,0.6)' }}>
          {myPhoto
            ? <Image source={{ uri: myPhoto }} style={{ width: 72, height: 72 }} contentFit="cover" />
            : <View style={{ flex: 1, backgroundColor: 'rgba(199,125,255,0.2)',
                alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 28 }}>💜</Text>
              </View>}
        </View>

        {/* Icône appel animée */}
        <View style={{ gap: 4, alignItems: 'center' }}>
          <Text style={{ fontSize: 20 }}>📹</Text>
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {[0, 1, 2].map((i) => (
              <React.Fragment key={i}>
                <View style={{
                  width: 5, height: 5, borderRadius: 3,
                  backgroundColor: i * 0.33 < progress ? '#FFD700' : 'rgba(255,255,255,0.2)',
                }} />
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Photo partenaire avec double pulse */}
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{
            position: 'absolute',
            width: 104, height: 104, borderRadius: 52,
            borderWidth: 1.5, borderColor: 'rgba(255,215,0,0.25)',
            transform: [{ scale: pulseAnim2 }],
          }} />
          <Animated.View style={{
            position: 'absolute',
            width: 88, height: 88, borderRadius: 44,
            borderWidth: 2, borderColor: 'rgba(255,215,0,0.45)',
            transform: [{ scale: pulseAnim }],
          }} />
          <View style={{ width: 80, height: 80, borderRadius: 40, overflow: 'hidden',
            borderWidth: 3, borderColor: '#FFD700' }}>
            {partnerPhoto
              ? <Image source={{ uri: partnerPhoto }} style={{ width: 80, height: 80 }} contentFit="cover" />
              : <View style={{ flex: 1, backgroundColor: 'rgba(255,215,0,0.15)',
                  alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 32 }}>✨</Text>
                </View>}
          </View>
        </View>
      </View>

      {/* Nom partenaire */}
      <Text style={{ color: '#FFD700', fontSize: 26, fontWeight: '900', letterSpacing: 0.5, marginBottom: 6 }}>
        {partnerName}
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 28 }}>
        Appel vidéo romantique • {remaining}s
      </Text>

      {/* Message romantique rotatif */}
      <Animated.Text style={{
        color: 'rgba(199,125,255,0.9)', fontSize: 14, textAlign: 'center',
        fontStyle: 'italic', marginBottom: 40, opacity: fadeAnim,
        paddingHorizontal: 16,
      }}>
        {RINGING_MSGS[msgIdx]}
      </Animated.Text>

      {/* Bouton raccrocher */}
      <Pressable onPress={onCancel}>
        <LinearGradient
          colors={['#FF4444', '#CC0000']}
          style={{ borderRadius: 40, padding: 22,
            shadowColor: '#FF0000', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5, shadowRadius: 12 }}>
          <PhoneOff size={30} color="#fff" />
        </LinearGradient>
      </Pressable>
      <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 12 }}>
        Annuler l'appel
      </Text>
    </View>
  );
}

// ── Page principale ───────────────────────────────────────────
export default function VideoCallPage() {
  const { callee_id, call_id: existingCallId, callee_name } = useLocalSearchParams<{
    callee_id?: string; call_id?: string; callee_name?: string;
  }>();
  const insets = useSafeAreaInsets();
  const [myProfile,      setMyProfile]      = useState<{ prenom?: string; photo_url?: string | null } | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<{ prenom?: string; photo_url?: string | null } | null>(null);
  const [partnerName, setPartnerName]       = useState(callee_name ?? 'Votre âme');
  const [challengeResult, setChallengeResult] = useState<{ passed: boolean; correct: number } | null>(null);
  const [submitting, setSubmitting]           = useState(false);
  const [partnerPassed, setPartnerPassed]     = useState<boolean | null>(null);
  const calledJoined = useRef(false);

  // ── Adaptation d'environnement : actif seulement pendant l'appel ──
  const env = useEnvironmentAdaptation(true);

  const {
    callId: _callId, status, challenge,
    localStream, remoteStream,
    isMuted, isCameraOff,
    initiateCall, joinCall, submitChallenge, hangup,
    toggleMute, toggleCamera, error,
    getPeerConnection,
  } = useVideoCall(existingCallId ?? null);

  // Charger mon profil + le profil du partenaire en parallèle
  useEffect(() => {
    (async () => {
      const me = await getMyProfile();
      setMyProfile(me);
    })();
  }, []);

  useEffect(() => {
    const partnerId = callee_id ?? (() => {
      // appelé : retrouver le caller_id depuis la DB
      return null;
    })();
    if (!partnerId) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('prenom, photo_url')
          .eq('user_id', partnerId)
          .maybeSingle();
        if (data) {
          setPartnerProfile(data);
          if (data.prenom) setPartnerName(data.prenom);
        }
      } catch { /* ignore — partnerName déjà initialisé depuis param URL */ }
    })();
  }, [callee_id]);

  // Pour l'appelé : charger le profil du caller depuis l'appel en DB
  useEffect(() => {
    if (!existingCallId || callee_id) return;
    (async () => {
      try {
        const { data: call } = await supabase
          .from('video_calls')
          .select('caller_id')
          .eq('id', existingCallId)
          .maybeSingle();
        if (!call?.caller_id) return;
        const { data } = await supabase
          .from('profiles')
          .select('prenom, photo_url')
          .eq('user_id', call.caller_id)
          .maybeSingle();
        if (data) {
          setPartnerProfile(data);
          if (data.prenom) setPartnerName(data.prenom);
        }
      } catch { /* ignore */ }
    })();
  }, [existingCallId, callee_id]);

  // Appelant : initier l'appel au montage
  useEffect(() => {
    if (callee_id && status === 'idle') {
      initiateCall(callee_id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callee_id]);

  // Appelé : rejoindre un appel existant au montage
  useEffect(() => {
    if (existingCallId && !callee_id && !calledJoined.current && status === 'idle') {
      calledJoined.current = true;
      joinCall(existingCallId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingCallId]);

  // Surveiller si le partenaire a passé son épreuve
  useEffect(() => {
    if (status === 'in_progress') setPartnerPassed(true);
  }, [status]);

  const handleSubmit = useCallback(async (answers: Record<number, number>) => {
    setSubmitting(true);
    try {
      const result = await submitChallenge(answers);
      setChallengeResult(result);
      if (!result.passed) {
        // Épreuve ratée → on laisse le polling terminer l'appel
        setTimeout(hangup, 3000);
      }
    } catch (e) {
      console.error('[VideoCall] submitChallenge failed', e);
    } finally {
      setSubmitting(false);
    }
  }, [submitChallenge, hangup]);

  const handleHangup = useCallback(async () => {
    await hangup();
    router.back();
  }, [hangup]);

  // ── Rendu selon l'état ────────────────────────────────────────
  const renderContent = () => {
    // Erreur
    if (error || status === 'error') {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
          <Text style={{ fontSize: 48 }}>⚠️</Text>
          <Text style={{ color: '#FF6B6B', fontSize: 16, textAlign: 'center' }}>{error ?? 'Erreur inattendue'}</Text>
          <Pressable onPress={() => router.back()} style={{ borderRadius: 14, overflow: 'hidden' }}>
            <LinearGradient colors={['#C77DFF', '#8B2FC9']} style={{ paddingHorizontal: 24, paddingVertical: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Retour</Text>
            </LinearGradient>
          </Pressable>
        </View>
      );
    }

    // Appel terminé / rejeté / manqué → auto-redirect 3s pour éviter l'écran figé
    if (status === 'ended' || status === 'rejected' || status === 'missed') {
      return (
        <EndedScreen
          status={status}
          partnerName={partnerName}
          partnerPhoto={partnerProfile?.photo_url ?? null}
          onBack={() => router.back()}
        />
      );
    }

    // Sonnerie
    if (status === 'ringing') {
      return (
        <RingingScreen
          partnerName={partnerName}
          partnerPhoto={partnerProfile?.photo_url ?? null}
          myPhoto={myProfile?.photo_url ?? null}
          onCancel={handleHangup}
          onTimeout={handleHangup}  // hangup propre → signal DB missed + router.back()
        />
      );
    }

    // Épreuve en attente — afficher l'épreuve ou son résultat
    if (status === 'challenge_pending' || status === 'challenge_done') {
      if (!challenge) {
        return (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <ActivityIndicator color="#C77DFF" size="large" />
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>Préparation de votre épreuve…</Text>
          </View>
        );
      }
      if (challengeResult !== null) {
        return (
          <ChallengeResult
            passed={challengeResult.passed}
            correct={challengeResult.correct}
            total={3}
            partnerPassed={partnerPassed}
            partnerName={partnerName}
          />
        );
      }
      // Épreuve non encore soumise
      if (challenge.passed === null) {
        return (
          <ChallengeScreen
            challenge={challenge}
            onSubmit={handleSubmit}
            isLoading={submitting}
            partnerName={partnerName}
          />
        );
      }
      // Challenge déjà soumis mais en attente partenaire
      return (
        <ChallengeResult
          passed={challenge.passed}
          correct={0}
          total={3}
          partnerPassed={partnerPassed}
          partnerName={partnerName}
        />
      );
    }

    // Appel actif — WebRTC
    if (status === 'in_progress') {
      return (
        <ActiveCallScreen
          localStream={localStream}
          remoteStream={remoteStream}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          onHangup={handleHangup}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          partnerName={partnerName}
          envAlert={env.alert}
          envTransport={env.transport}
          envNetQuality={env.networkQuality}
          envVideoQuality={env.recommendedVideoQuality}
          getPeerConnection={getPeerConnection}
        />
      );
    }

    // État initial / chargement
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <ActivityIndicator color="#C77DFF" size="large" />
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>Initialisation…</Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <CosmicBackground>
        {/* Header minimal */}
        {status !== 'in_progress' && (
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 16, paddingVertical: 12, gap: 12,
          }}>
            <Pressable
              onPress={handleHangup}
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
            >
              <ChevronLeft size={24} color="rgba(255,255,255,0.7)" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: 16 }}>
                📹 Appel Vidéo des Âmes
              </Text>
              {myProfile && (
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>
                  {myProfile.prenom} × {partnerName}
                </Text>
              )}
            </View>
          </View>
        )}

        {renderContent()}
      </CosmicBackground>
    </View>
  );
}
