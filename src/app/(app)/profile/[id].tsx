// Aevyra – Profil immersif : expérience cosmique unique (v311 — renforcement complet)
import React, { useCallback, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect, router, type RelativePathString } from 'expo-router';
import { useResponsive } from '@/hooks/useResponsive';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft, MessageCircle, UserPlus, UserCheck,
  Clock, Sparkles, Star, Bookmark, BookmarkCheck,
  Music, Zap, Moon, Sun, Flag, ShieldOff, MapPin, Award,
  TrendingUp, Camera,
} from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import {
  getPublicProfile,
  getConnectionStatus,
  sendConnectionRequest,
  respondToConnection,
  sendLike,
  hasSentSignal,
  getOrCreateConversation,
  toggleFavori,
  isFavori,
  getCurrentUserId,
  reportUser,
  blockUser,
  unblockUser,
  isBlocked,
  triggerChallengeAction,
  getUserBadges,
  REPORT_REASONS,
  type ReportReason,
  type Profile,
  type ConnectionStatus,
  type UserBadge,
} from '@/lib/amour-api';
import { SIGNES_ASTRO } from '@/lib/amour-theme';

// ── Compatibilité stable depuis les IDs ─────────────────────
function computeCompat(id1: string, id2: string): number {
  const combined = (id1 + id2).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return 65 + (combined % 35);
}

// ── Labels personnalité ──────────────────────────────────────
const STYLE_LABELS: Record<string, { emoji: string; label: string }> = {
  romantique:   { emoji: '🌹', label: 'Romantique' },
  passionné:    { emoji: '🔥', label: 'Passionné(e)' },
  doux:         { emoji: '🕊️', label: 'Doux/Douce' },
  aventurier:   { emoji: '🌍', label: 'Aventurier(ère)' },
  mystérieux:   { emoji: '🎭', label: 'Mystérieux(se)' },
  intellectuel: { emoji: '📚', label: 'Intellectuel(le)' },
};

const CHERCHE_LABELS: Record<string, string> = {
  homme:    '🌌 Étoile d\'Obsidienne · Homme',
  femme:    '🌹 Lune de Rose · Femme',
  les_deux: '💫 Dualité Cosmique · Femme ou Homme',
  une_ame:  '🕊️ Âme Miroir · Au-delà du genre',
  autre:    '✨ Âme Libre · Non-binaire',
};

// ── Anneau aura animé ────────────────────────────────────────
function AuraRing({ color, size, delay }: { color: string; size: number; delay: number }) {
  const { captionSize: _captionSize } = useResponsive();
  const pulse = useRef(new Animated.Value(0.25)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(pulse, { toValue: 0.65, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.25, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute',
      width: size, height: size, borderRadius: size / 2,
      borderWidth: 1, borderColor: color,
      opacity: pulse,
      top: -(size - 110) / 2, left: -(size - 110) / 2,
    }} />
  );
}

// ── Particule flottante ──────────────────────────────────────
function FloatingParticle({ color, x, delay }: { key?: React.Key; color: string; x: number; delay: number }) {
  const { captionSize: _captionSize2 } = useResponsive();
  const y  = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(y,  { toValue: -55, duration: 2400, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(op, { toValue: 0.8, duration: 500,  useNativeDriver: true }),
            Animated.timing(op, { toValue: 0,   duration: 1900, useNativeDriver: true }),
          ]),
        ]),
        Animated.timing(y, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute', bottom: 0, left: x,
      width: 4, height: 4, borderRadius: 2,
      backgroundColor: color,
      opacity: op, transform: [{ translateY: y }],
    }} />
  );
}

// ── Barre compatibilité animée ───────────────────────────────
function CompatBar({ value, color }: { value: number; color: string }) {
  const { captionSize, gap: _gap4, h3Size: _h3Size4 } = useResponsive();
  const anim = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(anim, { toValue: value / 100, duration: 1200, useNativeDriver: false }).start();
  }, [value]);
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: captionSize, fontWeight: '600' }}>
          ✦ Compatibilité cosmique
        </Text>
        <Text style={{ color, fontWeight: '900', fontSize: 26 }}>{value}%</Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <Animated.View style={{
          height: 8, borderRadius: 4,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          backgroundColor: color,
        }} />
      </View>
      <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: captionSize, textAlign: 'center', fontStyle: 'italic' }}>
        {value >= 90 ? '🌌 Connexion cosmique exceptionnelle'
          : value >= 80 ? '💫 Forte résonance des âmes'
          : value >= 70 ? '✨ Belle harmonie potentielle'
          : '🌱 Une belle découverte vous attend'}
      </Text>
    </View>
  );
}

// ── Chip trait personnalité ──────────────────────────────────
function TraitChip({ emoji, label, color }: { emoji: string; label: string; color: string }) {
  const { captionSize, gap: _gap5, cardRadius: _cardRadius5 } = useResponsive();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 13, paddingVertical: 8,
      borderRadius: 20, borderWidth: 1,
      borderColor: color + '50', backgroundColor: color + '12',
    }}>
      <Text style={{ fontSize: 14 }}>{emoji}</Text>
      <Text style={{ color, fontSize: captionSize, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

// ── Séparateur section ───────────────────────────────────────
function Section({ title, children, mt = 16 }: { title: string; children?: React.ReactNode; mt?: number }) {
  const { captionSize, gap, bodySize: _bodySize2, tapTarget: _tapTarget6, iconSize: _iconSize6, h3Size: _h3Size6, cardRadius: _cardRadius6, px: _px2, isDesktop: _iD2, isTablet: _iT2, isTV: _iTV2, h2Size: _h2Size2, avatarSize: _avatarSize2, buttonFontSize: _bFS2, buttonPadV: _bPV2, buttonPadH: _bPH2, contentMaxWidth: _cMW2 } = useResponsive();
  return (
    <View style={{ marginTop: mt }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: gap * 0.4, marginBottom: gap * 0.6 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,215,0,0.1)' }} />
        <Text style={{ color: 'rgba(255,215,0,0.90)', fontSize: captionSize * 0.9, fontWeight: '800', letterSpacing: 2 }}>
          {title}
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,215,0,0.1)' }} />
      </View>
      {children}
    </View>
  );
}

// ── Bouton action romantique avec animation ──────────────────
function ActionBtn({
  emoji, label, color, sent, onPress,
}: { key?: React.Key; emoji: string; label: string; color: string; sent: boolean; onPress: () => void }) {
  const { captionSize, tapTarget, iconSize, cardRadius: _cR195, bodySize: _bS195 } = useResponsive();
  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.4,  duration: 110, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.0,  duration: 200, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${sent ? 'envoyé' : ''}`}
      style={{ alignItems: 'center', gap: 5, minWidth: tapTarget, minHeight: tapTarget + 16 }}
    >
      <Animated.View style={{
        width: tapTarget, height: tapTarget, borderRadius: tapTarget / 2,
        backgroundColor: sent ? color + '28' : color + '12',
        borderWidth: sent ? 2 : 1.5,
        borderColor: sent ? color : color + '55',
        alignItems: 'center', justifyContent: 'center',
        transform: [{ scale }],
      }}>
        <Text style={{ fontSize: sent ? iconSize * 1.3 : iconSize * 1.1 }}>{emoji}</Text>
      </Animated.View>
      <Text style={{ color: sent ? color : color + '90', fontSize: captionSize, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

// ── Bouton connexion principal ───────────────────────────────
function ConnectionButton({
  status, loading, onSend, onChat, onAccept, onLike,
}: {
  status: ConnectionStatus; loading: boolean;
  onSend: () => void; onChat: () => void; onAccept: () => void; onLike: () => void;
}) {
  const { captionSize, tapTarget, iconSize, cardRadius, bodySize, gap, h3Size } = useResponsive();
  if (loading) return <ActivityIndicator color="#FFD700" size="large" />;

  // Connexion acceptée → bouton Écrire plein
  if (status === 'accepted') {
    return (
      <Pressable
        onPress={onChat}
        accessibilityRole="button"
        accessibilityLabel="Envoyer un message"
      >
        <LinearGradient
          colors={['#722F37', '#4B0082']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ borderRadius: cardRadius, paddingVertical: tapTarget * 0.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: gap * 0.5, minHeight: tapTarget }}
        >
          <MessageCircle size={iconSize} color="#FFD700" />
          <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: h3Size }}>Envoyer un message</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  // Demande envoyée → peut déjà écrire (message en attente d'acceptation)
  if (status === 'pending_sent') {
    return (
      <View style={{ gap: gap * 0.5 }}>
        <View style={{
          borderRadius: cardRadius, paddingVertical: gap * 0.5,
          borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)',
          backgroundColor: 'rgba(255,215,0,0.05)',
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: gap * 0.4,
          minHeight: tapTarget * 0.7,
        }}>
          <Clock size={iconSize * 0.85} color="rgba(255,215,0,0.65)" />
          <Text style={{ color: 'rgba(255,215,0,0.90)', fontWeight: '600', fontSize: captionSize }}>
            Demande envoyée — en attente de réponse
          </Text>
        </View>
        <Pressable
          onPress={onChat}
          accessibilityRole="button"
          accessibilityLabel="Écrire un premier message"
        >
          <LinearGradient
            colors={['rgba(114,47,55,0.5)', 'rgba(75,0,130,0.45)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{
              borderRadius: cardRadius, paddingVertical: tapTarget * 0.4,
              borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)',
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: gap * 0.5,
              minHeight: tapTarget,
            }}
          >
            <MessageCircle size={iconSize} color="#FFD700" />
            <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: h3Size }}>
              Écrire un premier mot
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  // Demande reçue → Accepter + possibilité d'écrire
  if (status === 'pending_received') {
    return (
      <View style={{ gap: gap * 0.5 }}>
        <Pressable
          onPress={onAccept}
          accessibilityRole="button"
          accessibilityLabel="Accepter la connexion"
        >
          <LinearGradient
            colors={['#4B0082', '#722F37']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ borderRadius: cardRadius, paddingVertical: tapTarget * 0.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: gap * 0.5, minHeight: tapTarget }}
          >
            <UserCheck size={iconSize} color="#FFD700" />
            <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: h3Size }}>Accepter la connexion</Text>
          </LinearGradient>
        </Pressable>
        <Pressable
          onPress={onChat}
          accessibilityRole="button"
          accessibilityLabel="Répondre par un message"
        >
          <View style={{
            borderRadius: cardRadius, paddingVertical: tapTarget * 0.35,
            borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)',
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: gap * 0.45,
            minHeight: tapTarget * 0.85,
          }}>
            <MessageCircle size={iconSize * 0.9} color="rgba(255,215,0,0.75)" />
            <Text style={{ color: 'rgba(255,215,0,0.90)', fontWeight: '700', fontSize: bodySize }}>
              Répondre par un message
            </Text>
          </View>
        </Pressable>
      </View>
    );
  }

  // Aucune connexion → Connecter + Étoile
  return (
    <View style={{ flexDirection: 'row', gap: gap * 0.5 }}>
      <Pressable
        onPress={onSend}
        accessibilityRole="button"
        accessibilityLabel="Connecter nos âmes"
        style={{ flex: 1 }}
      >
        <LinearGradient
          colors={['#722F37', '#4B0082']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ borderRadius: cardRadius, paddingVertical: tapTarget * 0.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: gap * 0.5, minHeight: tapTarget }}
        >
          <UserPlus size={iconSize} color="#FFD700" />
          <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: h3Size }}>Connecter nos âmes</Text>
        </LinearGradient>
      </Pressable>
      <Pressable
        onPress={onLike}
        accessibilityRole="button"
        accessibilityLabel="Ajouter aux favoris"
        style={{
          width: tapTarget, height: tapTarget, borderRadius: cardRadius * 0.8,
          backgroundColor: 'rgba(255,182,193,0.15)',
          borderWidth: 1.5, borderColor: 'rgba(255,182,193,0.4)',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Star size={iconSize} color="#FFB6C1" />
      </Pressable>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// Écran principal ProfileDetail
// ══════════════════════════════════════════════════════════════
export default function ProfileDetail() {
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const { captionSize, gap, bodySize, tapTarget, iconSize, h3Size, cardRadius, px, isDesktop, isTablet, isTV, contentMaxWidth, avatarSize } = useResponsive();
  const isWide = isDesktop || isTablet || isTV;

  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile,     setProfile]     = useState<Profile | null>(null);
  const [connStatus,  setConnStatus]  = useState<ConnectionStatus>('none');
  const [showReport,    _setShowReport]    = useState(false);
  const [myUserId,    setMyUserId]    = useState('');
  const [loading,     setLoading]     = useState(true);
  const [connLoading, setConnLoading] = useState(false);
  const [favori,      setFavori]      = useState(false);
  const [sentActions, setSentActions] = useState<Set<string>>(new Set());
  const [matched,     setMatched]     = useState(false);
  const [pubBadges,   setPubBadges]   = useState<UserBadge[]>([]);
  // ── Accès profil : débloqué si signal déjà envoyé, match ou connexion acceptée ──
  const [signalSent,  setSignalSent]  = useState(false);

  // ── Signalement / Blocage ─────────────────────────────────
  const [_reportModal,    setReportModal]    = useState(false);
  const [reportReason,   setReportReason]   = useState<ReportReason | null>(null);
  const [reportLoading,  setReportLoading]  = useState(false);
  const [reportDone,     setReportDone]     = useState(false);
  const [reportError,    setReportError]    = useState('');
  const [blockLoading,   setBlockLoading]   = useState(false);
  const [unblockLoading, setUnblockLoading] = useState(false);
  const [isUserBlocked,  setIsUserBlocked]  = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const heroScale = useRef(new Animated.Value(0.88)).current;

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      // Réinitialiser les actions envoyées à chaque visite de profil
      setSentActions(new Set());
      setMatched(false);
      (async () => {
        setLoading(true);
        try {
          const [p, userId, status, fav] = await Promise.all([
            getPublicProfile(id),
            getCurrentUserId(),
            getConnectionStatus(id),
            isFavori(id),
          ]);
          setProfile(p);
          setMyUserId(userId ?? '');
          setConnStatus(status);
          setFavori(fav);
          // Vérifier si un signal a déjà été envoyé (débloque la vue complète)
          hasSentSignal(id).then(setSignalSent).catch(() => {});
          // Badges gamification publics du profil visité
          if (p?.id) getUserBadges(p.id).then(setPubBadges).catch(() => {});
          // Défi view_profiles : incrémenter à chaque visite de profil
          triggerChallengeAction('view_profiles').catch(() => {});
          // Défi astro_comment : si le profil visité a un signe astro (découverte cosmique)
          if (p?.signe_astro) triggerChallengeAction('astro_comment').catch(() => {});
          // Vérifier blocage
          const blocked = await isBlocked(id);
          setIsUserBlocked(blocked);
          Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
            Animated.spring(heroScale, { toValue: 1, friction: 6,   useNativeDriver: true }),
          ]).start();
        } catch (e) {
          console.error('[ProfileDetail] Chargement échoué', e);
        } finally {
          setLoading(false);
        }
      })();
    }, [id])
  );

  const handleSend = async () => {
    if (!id) return;
    setConnLoading(true);
    try {
      await sendConnectionRequest(id);
      setConnStatus('pending_sent');
    } catch (e) {
      console.error('[ProfileDetail] sendConnectionRequest échoué', e);
    } finally {
      setConnLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!id) return;
    setConnLoading(true);
    try {
      const { supabase } = await import('@/client/supabase');
      const { data: conn } = await supabase
        .from('connections')
        .select('id')
        .eq('from_user_id', id)
        .eq('to_user_id', myUserId)
        .maybeSingle();
      if (conn?.id) {
        await respondToConnection(conn.id, true);
        setConnStatus('accepted');
      }
    } catch (e) {
      console.error('[ProfileDetail] handleAccept échoué', e);
    } finally {
      setConnLoading(false);
    }
  };

  const handleChat = async () => {
    if (!id) return;
    setConnLoading(true);
    try {
      const matchId = await getOrCreateConversation(id);
      if (matchId) router.push(`/(app)/chat/${matchId}` as RelativePathString);
    } catch (e) {
      console.error('[ProfileDetail] handleChat échoué', e);
    } finally {
      setConnLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!id) return;
    setSentActions((prev: Set<string>) => new Set(prev).add(action));
    try {
      const res = await sendLike(id, action);
      // Signal envoyé → débloquer la vue complète immédiatement
      setSignalSent(true);
      // Incrémenter défi send_like en arrière-plan
      triggerChallengeAction('send_like').catch(() => {});
      // Match mutuel détecté → on met à jour l'UI immédiatement
      if (res.matched) {
        setMatched(true);
        // connStatus → accepted : révèle la lettre secrète + affiche bouton "Écrire"
        setConnStatus('accepted');
        if (process.env.EXPO_OS !== 'web') {
          const { default: Haptics } = await import('expo-haptics');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        // Auto-reset du state matched après 5s
        setTimeout(() => setMatched(false), 5000);
      }
    } catch (e) {
      console.error('[ProfileDetail] sendLike échoué', e);
      setSentActions((prev: Set<string>) => { const n = new Set(prev); n.delete(action); return n; });
    }
  };

  const handleFavori = async () => {
    if (!id) return;
    try {
      const added = await toggleFavori(id);
      setFavori(added);
    } catch (e) {
      console.error('[ProfileDetail] toggleFavori échoué', e);
    }
  };

  // ── Signalement ──────────────────────────────────────────
  const handleReport = async () => {
    if (!reportReason) { setReportError('Choisissez un motif.'); return; }
    setReportLoading(true); setReportError('');
    const result = await reportUser(id ?? '', reportReason);
    setReportLoading(false);
    if (result.success) {
      setReportDone(true);
    } else {
      setReportError(result.error ?? 'Erreur.');
    }
  };

  const handleCloseReport = () => {
    setReportModal(false);
    setReportReason(null);
    setReportDone(false);
    setReportError('');
  };

  // ── Blocage ──────────────────────────────────────────────
  const handleBlock = async () => {
    if (!id) return;
    setBlockLoading(true);
    const result = await blockUser(id);
    setBlockLoading(false);
    if (result.success) {
      setIsUserBlocked(true);
      setReportModal(false);
      // Ne pas naviguer — l'utilisateur peut vouloir débloquer immédiatement
    } else {
      setReportError(result.error ?? 'Erreur.');
    }
  };

  const handleUnblock = async () => {
    if (!id) return;
    setUnblockLoading(true);
    const ok = await unblockUser(id);
    setUnblockLoading(false);
    if (ok) {
      setIsUserBlocked(false);
      setReportModal(false);
    } else {
      setReportError('Impossible de débloquer. Réessayez.');
    }
  };

  // ── Loading ─────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D0D1A', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <ActivityIndicator color="#FFD700" size="large" />
        <Text style={{ color: 'rgba(255,215,0,0.75)', fontStyle: 'italic', fontSize: 14 }}>
          Lecture des étoiles…
        </Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D0D1A', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <Text style={{ fontSize: 52, marginBottom: 16 }}>🌌</Text>
        <Text style={{ color: '#FFD700', fontSize: 20, fontWeight: '800', textAlign: 'center' }}>Âme introuvable</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: 14 }}>← Retour</Text>
        </Pressable>
      </View>
    );
  }

  const compat       = myUserId ? computeCompat(myUserId, profile.id) : 77;
  const empreinte    = profile.empreinte_couleur || '#FFD700';
  const isOwnProfile = myUserId === profile.id;
  // Profil débloqué si : son propre profil OU signal envoyé OU connexion acceptée/match
  const isUnlocked   = isOwnProfile || signalSent || connStatus === 'accepted' || matched;
  const signeInfo    = profile.signe_astro ? SIGNES_ASTRO[profile.signe_astro] : null;
  const styleConf    = profile.style_amour ? STYLE_LABELS[profile.style_amour] : null;
  const compatColor  = compat >= 90 ? '#FFD700' : compat >= 80 ? '#FF85A2' : compat >= 70 ? '#C084FC' : '#87CEEB';
  // Avatar responsive — proportionnel à l'écran mais capé
  const heroSize     = Math.min(avatarSize * 1.8, Math.min(W * 0.42, 240));

  // Énergie → icône + couleur
  const ENERGIE_MAP: Record<string, { node: React.ReactNode; color: string }> = {
    'Soleil ardent':     { node: <Sun  size={15} color="#FFD700" />, color: '#FFD700' },
    'Lune mystérieuse':  { node: <Moon size={15} color="#C0C0FF" />, color: '#C0C0FF' },
    'Étoile libre':      { node: <Star size={15} color="#87CEEB" />, color: '#87CEEB' },
    'Comète passionnée': { node: <Zap  size={15} color="#FF4500" />, color: '#FF4500' },
  };
  const energieConf = profile.energie_romantique ? ENERGIE_MAP[profile.energie_romantique] : null;

  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground>

        {/* ── Header ────────────────────────────────────────── */}
        <View style={{
          paddingTop: insets.top + 8, paddingHorizontal: px, paddingBottom: 8,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 20,
        }}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            style={{
              width: tapTarget, height: tapTarget, borderRadius: tapTarget / 2,
              backgroundColor: 'rgba(255,215,0,0.08)',
              borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)',
              alignItems: 'center', justifyContent: 'center',
            }}>
            <ChevronLeft size={iconSize} color="#FFD700" />
          </Pressable>

          <Text style={{ color: '#FFD700', fontSize: h3Size, fontWeight: '800', flex: 1, textAlign: 'center' }}>
            {profile.prenom}
            {profile.pseudo ? (
              <Text style={{ fontWeight: '400', color: 'rgba(255,215,0,0.75)' }}> @{profile.pseudo}</Text>
            ) : null}
          </Text>

          {/* Favori + Signaler */}
          <View style={{ flexDirection: 'row', gap: gap * 0.4 }}>
            {!isOwnProfile && (
              <Pressable
                onPress={() => setReportModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Signaler ce profil"
                style={{
                  width: tapTarget, height: tapTarget, borderRadius: tapTarget / 2,
                  backgroundColor: 'rgba(255,80,80,0.08)',
                  borderWidth: 1, borderColor: 'rgba(255,80,80,0.2)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                <Flag size={iconSize * 0.8} color="rgba(255,100,100,0.7)" />
              </Pressable>
            )}
            <Pressable
              onPress={handleFavori}
              accessibilityRole="button"
              accessibilityLabel={favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              style={{
                width: tapTarget, height: tapTarget, borderRadius: tapTarget / 2,
                backgroundColor: favori ? 'rgba(255,215,0,0.15)' : 'rgba(255,215,0,0.06)',
                borderWidth: 1, borderColor: favori ? 'rgba(255,215,0,0.5)' : 'rgba(255,215,0,0.15)',
                alignItems: 'center', justifyContent: 'center',
              }}>
              {favori
                ? <BookmarkCheck size={iconSize} color="#FFD700" />
                : <Bookmark size={iconSize} color="rgba(255,215,0,0.45)" />
              }
            </Pressable>
          </View>
        </View>

        {/* ── Modal Signalement / Blocage ───────────────────── */}
        {/* Modal signalement */}
        {showReport && (
          <Modal transparent animationType="slide" onRequestClose={handleCloseReport}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }} onPress={handleCloseReport} />
            <View style={{
              backgroundColor: '#13132A', borderTopLeftRadius: cardRadius, borderTopRightRadius: cardRadius,
              padding: gap * 1.2, paddingBottom: Math.max(gap * 2, 40), gap: gap * 0.8,
              borderWidth: 1, borderColor: 'rgba(255,80,80,0.2)',
            }}>
              {reportDone ? (
                <View style={{ alignItems: 'center', gap: gap * 0.6, paddingVertical: gap }}>
                  <Text style={{ fontSize: iconSize * 2.8 }}>✅</Text>
                  <Text style={{ color: '#F5E6C8', fontSize: h3Size * 1.1, fontWeight: '900', textAlign: 'center' }}>
                    Signalement envoyé
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: captionSize, textAlign: 'center', lineHeight: captionSize * 1.55 }}>
                    Notre équipe examinera ce profil dans les plus brefs délais. Merci de contribuer à la sécurité de la communauté.
                  </Text>
                    <Pressable
                      onPress={handleCloseReport}
                      accessibilityRole="button"
                      accessibilityLabel="Fermer le signalement"
                      style={{
                        marginTop: gap * 0.4, backgroundColor: 'rgba(255,215,0,0.12)',
                        borderRadius: cardRadius * 0.7, paddingVertical: tapTarget * 0.4, paddingHorizontal: gap * 1.6,
                        borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)',
                        minHeight: tapTarget,
                      }}
                    >
                      <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: bodySize }}>Fermer</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <Text style={{ color: '#F5E6C8', fontSize: h3Size * 1.05, fontWeight: '900', textAlign: 'center' }}>
                      🚩 Signaler ce profil
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: captionSize, textAlign: 'center', marginTop: -gap * 0.4 }}>
                      Votre signalement est confidentiel
                    </Text>

                    {/* Motifs */}
                    <View style={{ gap: gap * 0.4 }}>
                      {REPORT_REASONS.map(r => (
                        <Pressable
                          key={r.value}
                          onPress={() => setReportReason(r.value)}
                          accessibilityRole="radio"
                          accessibilityLabel={r.label}
                          accessibilityState={{ checked: reportReason === r.value }}
                          style={{
                            flexDirection: 'row', alignItems: 'flex-start', gap: gap * 0.6,
                            padding: gap * 0.7, borderRadius: cardRadius * 0.7,
                            backgroundColor: reportReason === r.value
                              ? 'rgba(255,80,80,0.15)' : 'rgba(255,255,255,0.04)',
                            borderWidth: 1,
                            borderColor: reportReason === r.value
                              ? 'rgba(255,80,80,0.4)' : 'rgba(255,255,255,0.08)',
                          }}
                        >
                          <View style={{
                            width: iconSize, height: iconSize, borderRadius: iconSize / 2, marginTop: 2,
                            borderWidth: 2,
                            borderColor: reportReason === r.value ? '#FF5050' : 'rgba(255,255,255,0.3)',
                            backgroundColor: reportReason === r.value ? '#FF5050' : 'transparent',
                            flexShrink: 0,
                          }} />
                          <View style={{ flex: 1, gap: gap * 0.1 }}>
                            <Text style={{ color: '#F5E6C8', fontSize: bodySize, fontWeight: '700' }}>{r.label}</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize, lineHeight: captionSize * 1.45 }}>{r.description}</Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>

                    {!!reportError && (
                      <Text style={{ color: '#FF6B6B', fontSize: captionSize, textAlign: 'center' }}>{reportError}</Text>
                    )}

                    {/* Boutons */}
                    <Pressable
                      onPress={handleReport}
                      accessibilityRole="button"
                      accessibilityLabel="Envoyer le signalement"
                      disabled={reportLoading || !reportReason}
                      style={{
                        backgroundColor: reportReason ? 'rgba(255,80,80,0.8)' : 'rgba(255,80,80,0.25)',
                        borderRadius: cardRadius * 0.7, paddingVertical: tapTarget * 0.4, alignItems: 'center',
                        minHeight: tapTarget,
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '900', fontSize: h3Size }}>
                        {reportLoading ? 'Envoi…' : 'Envoyer le signalement'}
                      </Text>
                    </Pressable>

                    {/* Blocage / Déblocage */}
                    {isUserBlocked ? (
                      <Pressable
                        onPress={handleUnblock}
                        accessibilityRole="button"
                        accessibilityLabel="Débloquer cet utilisateur"
                        disabled={unblockLoading}
                        style={{
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: gap * 0.4,
                          paddingVertical: tapTarget * 0.35,
                          backgroundColor: 'rgba(100,200,100,0.08)',
                          borderRadius: cardRadius * 0.6, marginTop: gap * 0.2,
                          borderWidth: 1, borderColor: 'rgba(100,200,100,0.2)',
                          minHeight: tapTarget * 0.85,
                        }}
                      >
                        <ShieldOff size={iconSize} color="rgba(100,220,100,0.8)" />
                        <Text style={{ color: 'rgba(100,220,100,0.9)', fontSize: bodySize, fontWeight: '700' }}>
                          {unblockLoading ? 'Déblocage…' : 'Débloquer cet utilisateur'}
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={handleBlock}
                        accessibilityRole="button"
                        accessibilityLabel="Bloquer et ne plus voir ce profil"
                        disabled={blockLoading}
                        style={{
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: gap * 0.4,
                          paddingVertical: tapTarget * 0.35,
                          minHeight: tapTarget * 0.85,
                        }}
                      >
                        <ShieldOff size={iconSize} color="rgba(255,150,150,0.7)" />
                        <Text style={{ color: 'rgba(255,150,150,0.7)', fontSize: bodySize, fontWeight: '700' }}>
                          {blockLoading ? 'Blocage…' : 'Bloquer et ne plus voir ce profil'}
                        </Text>
                      </Pressable>
                    )}

                    <Pressable
                      onPress={handleCloseReport}
                      accessibilityRole="button"
                      accessibilityLabel="Annuler le signalement"
                      style={{ alignItems: 'center', paddingVertical: tapTarget * 0.2, minHeight: tapTarget * 0.7 }}
                    >
                      <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: bodySize }}>Annuler</Text>
                    </Pressable>
                  </>
                )}
              </View>
          </Modal>
        )}

        <Animated.View style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
            bounces={false}
            contentContainerStyle={{
              paddingBottom: Math.max(48, insets.bottom + 20),
              maxWidth: isWide ? contentMaxWidth : undefined,
              alignSelf: isWide ? 'center' as const : undefined,
              width: isWide ? '100%' : undefined,
            }}
          >
            {/* ════════════════════════════════════════════════
                ZONE 1 — IDENTITÉ : Avatar + nom + badges compacts
                ════════════════════════════════════════════════ */}
            <View style={{ alignItems: 'center', paddingTop: gap, paddingBottom: gap * 1.2 }}>

              {/* Avatar avec anneaux aura */}
              <Animated.View style={{
                transform: [{ scale: heroScale }],
                alignItems: 'center', justifyContent: 'center',
                width: heroSize + 80, height: heroSize + 80,
              }}>
                <AuraRing color={empreinte + '80'} size={heroSize + 72} delay={0} />
                <AuraRing color={empreinte + '55'} size={heroSize + 48} delay={600} />
                <AuraRing color={empreinte + '35'} size={heroSize + 24} delay={1200} />

                <LinearGradient
                  colors={[empreinte, '#4B0082', '#0D0D1A']}
                  style={{
                    width: heroSize + 8, height: heroSize + 8,
                    borderRadius: (heroSize + 8) / 2,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 3, borderColor: empreinte + '90',
                  }}
                >
                  {profile.photo_url ? (
                    <Image
                      source={{ uri: profile.photo_url }}
                      style={{ width: heroSize, height: heroSize, borderRadius: heroSize / 2 }}
                      contentFit="cover"
                      transition={300}
                      blurRadius={isUnlocked ? 0 : 22}
                    />
                  ) : (
                    <LinearGradient
                      colors={[empreinte + 'CC', '#1a0a2e']}
                      style={{
                        width: heroSize, height: heroSize, borderRadius: heroSize / 2,
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: heroSize * 0.42 }}>{signeInfo?.emoji ?? '🌟'}</Text>
                    </LinearGradient>
                  )}
                </LinearGradient>

                {/* Particules flottantes */}
                {[empreinte, '#FFB6C1', '#C084FC', '#87CEEB', empreinte].map((c, i) => (
                  // @ts-ignore
                  <FloatingParticle
                    key={i} color={c as string}
                    x={(heroSize + 80) / 2 + ([-28, 28, -14, 14, 0][i])}
                    delay={i * 480}
                  />
                ))}

                {/* Badge vérifié positionné sur l'avatar */}
                {profile.is_verified && (
                  <View style={{
                    position: 'absolute', bottom: 14, right: 14,
                    backgroundColor: '#FFD700', borderRadius: 14,
                    paddingHorizontal: 9, paddingVertical: 4,
                    borderWidth: 2, borderColor: '#0D0D1A',
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                  }}>
                    <Sparkles size={10} color="#000000" />
                    <Text style={{ color: '#000000', fontSize: captionSize, fontWeight: '900' }}>VÉRIFIÉ</Text>
                  </View>
                )}
              </Animated.View>

              {/* Nom + âge */}
              <Text style={{
                color: '#FFD700', fontSize: 30, fontWeight: '900',
                letterSpacing: 0.5, marginTop: 8, textAlign: 'center',
              }}>
                {profile.prenom}
                {profile.age ? (
                  <Text style={{ fontSize: 20, fontWeight: '400', color: 'rgba(255,215,0,0.65)' }}>, {profile.age}</Text>
                ) : null}
              </Text>

              {/* Ville + Signe astro sur une seule ligne */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: gap * 0.5, marginTop: gap * 0.2, flexWrap: 'wrap', justifyContent: 'center' }}>
                {profile.ville ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: gap * 0.2 }}>
                    <MapPin size={iconSize * 0.75} color="rgba(255,215,0,0.65)" />
                    <Text style={{ color: 'rgba(255,215,0,0.90)', fontSize: captionSize }}>{profile.ville}</Text>
                  </View>
                ) : null}
                {profile.ville && signeInfo ? (
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: captionSize }}>·</Text>
                ) : null}
                {signeInfo ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: gap * 0.25 }}>
                    <Text style={{ fontSize: iconSize }}>{signeInfo.emoji}</Text>
                    <Text style={{ color: 'rgba(255,182,193,0.95)', fontSize: captionSize, fontWeight: '700' }}>{profile.signe_astro}</Text>
                  </View>
                ) : null}
              </View>

              {/* Badges en ligne compacte */}
              <View style={{ flexDirection: 'row', gap: gap * 0.35, marginTop: gap * 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                {energieConf ? (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: gap * 0.25,
                    paddingHorizontal: gap * 0.6, paddingVertical: gap * 0.25, borderRadius: tapTarget / 2,
                    borderWidth: 1, borderColor: energieConf.color + '55',
                    backgroundColor: energieConf.color + '12',
                  }}>
                    {energieConf.node}
                    <Text style={{ color: energieConf.color, fontSize: captionSize, fontWeight: '800' }}>
                      {profile.energie_romantique}
                    </Text>
                  </View>
                ) : null}
                {typeof profile.score_fiabilite === 'number' && (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: gap * 0.2,
                    paddingHorizontal: gap * 0.5, paddingVertical: gap * 0.25, borderRadius: tapTarget / 2,
                    borderWidth: 1,
                    borderColor: profile.score_fiabilite >= 80 ? 'rgba(74,222,128,0.4)' : profile.score_fiabilite >= 50 ? 'rgba(251,191,36,0.4)' : 'rgba(255,80,80,0.4)',
                    backgroundColor: profile.score_fiabilite >= 80 ? 'rgba(74,222,128,0.1)' : profile.score_fiabilite >= 50 ? 'rgba(251,191,36,0.1)' : 'rgba(255,80,80,0.1)',
                  }}>
                    <TrendingUp size={iconSize * 0.65} color={profile.score_fiabilite >= 80 ? '#4ADE80' : profile.score_fiabilite >= 50 ? '#FBBF24' : '#FF5050'} />
                    <Text style={{ fontSize: captionSize, fontWeight: '800', color: profile.score_fiabilite >= 80 ? '#4ADE80' : profile.score_fiabilite >= 50 ? '#FBBF24' : '#FF5050' }}>
                      {profile.score_fiabilite}/100
                    </Text>
                  </View>
                )}
                {profile.photo_verified && (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: gap * 0.2,
                    paddingHorizontal: gap * 0.5, paddingVertical: gap * 0.25, borderRadius: tapTarget / 2,
                    borderWidth: 1, borderColor: 'rgba(96,165,250,0.4)',
                    backgroundColor: 'rgba(96,165,250,0.1)',
                  }}>
                    <Camera size={iconSize * 0.65} color="#60A5FA" />
                    <Text style={{ color: '#60A5FA', fontSize: captionSize, fontWeight: '800' }}>Photo ✓</Text>
                  </View>
                )}
                {profile.has_badge_rehabilite && (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: gap * 0.2,
                    paddingHorizontal: gap * 0.5, paddingVertical: gap * 0.25, borderRadius: tapTarget / 2,
                    borderWidth: 1, borderColor: 'rgba(72,187,120,0.35)',
                    backgroundColor: 'rgba(72,187,120,0.1)',
                  }}>
                    <Award size={iconSize * 0.65} color="#48BB78" />
                    <Text style={{ color: '#48BB78', fontSize: captionSize, fontWeight: '700' }}>Réhabilité ✦</Text>
                  </View>
                )}
              </View>
            </View>

            {/* ════════════════════════════════════════════════
                ZONE 2 — ESSENCE : Bio + Empreinte romantique
                ════════════════════════════════════════════════ */}
            <View style={{ paddingHorizontal: px, gap: gap * 0.6 }}>

              {/* ── Vue restreinte : CTA signal si profil non débloqué ── */}
              {!isUnlocked && (
                <LinearGradient
                  colors={['rgba(75,0,130,0.55)', 'rgba(255,215,0,0.08)']}
                  style={{ borderRadius: cardRadius, padding: gap * 1.2, borderWidth: 1.5, borderColor: 'rgba(255,215,0,0.35)', alignItems: 'center', gap: gap * 0.7 }}
                >
                  <Text style={{ fontSize: iconSize * 2 }}>✨</Text>
                  <Text style={{ color: '#FFD700', fontSize: bodySize * 1.05, fontWeight: '900', textAlign: 'center', letterSpacing: 0.5 }}>
                    Révélez cette âme
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.70)', fontSize: captionSize, textAlign: 'center', lineHeight: captionSize * 1.6 }}>
                    Envoyez un signal pour découvrir la bio, les passions et la chanson de vie de {profile.prenom}.
                  </Text>
                  {/* Aperçu flou de la bio si elle existe */}
                  {!!profile.bio && (
                    <View style={{ width: '100%', overflow: 'hidden', borderRadius: cardRadius * 0.6 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.18)', fontSize: bodySize, fontStyle: 'italic', textAlign: 'center' }} numberOfLines={2}>
                        "{profile.bio.replace(/\n/g, ' ')}"
                      </Text>
                    </View>
                  )}
                  <Text style={{ color: 'rgba(255,255,255,0.40)', fontSize: captionSize * 0.85, textAlign: 'center' }}>
                    👇 Utilisez les signaux ci-dessous
                  </Text>
                </LinearGradient>
              )}

              {/* Bio — visible uniquement si débloqué */}
              {isUnlocked && !!profile.bio && (
                <LinearGradient
                  colors={['rgba(75,0,130,0.35)', 'rgba(13,13,26,0.55)']}
                  style={{ borderRadius: cardRadius, padding: gap, borderWidth: 1, borderColor: 'rgba(255,215,0,0.12)' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: gap * 0.4, marginBottom: gap * 0.5 }}>
                    <Text style={{ fontSize: iconSize }}>✍️</Text>
                    <Text style={{ color: 'rgba(255,215,0,0.90)', fontSize: captionSize * 0.9, fontWeight: '800', letterSpacing: 2 }}>
                      SON UNIVERS
                    </Text>
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.95)', fontSize: bodySize, lineHeight: bodySize * 1.7, fontStyle: 'italic' }}>
                    "{profile.bio.replace(/\n/g, '\n')}"
                  </Text>
                </LinearGradient>
              )}

              {/* Empreinte romantique — visible uniquement si débloqué */}
              {isUnlocked && (styleConf || profile.moment_prefere || profile.cherche || profile.reve_duo) ? (
                <Section title="EMPREINTE ROMANTIQUE">
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gap * 0.4 }}>
                    {styleConf && <TraitChip emoji={styleConf.emoji} label={styleConf.label} color={empreinte} />}
                    {!!profile.moment_prefere && <TraitChip emoji="🌙" label={profile.moment_prefere} color="#C084FC" />}
                    {!!profile.cherche && <TraitChip emoji="🎯" label={CHERCHE_LABELS[profile.cherche] ?? profile.cherche} color="#87CEEB" />}
                    {!!profile.reve_duo && <TraitChip emoji="✈️" label={profile.reve_duo} color="#FFB6C1" />}
                  </View>
                </Section>
              ) : null}

              {/* Devise */}
              {!!profile.devise && (
                <LinearGradient
                  colors={['rgba(13,13,26,0.8)', 'rgba(75,0,130,0.35)']}
                  style={{ borderRadius: cardRadius, padding: gap, borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)', alignItems: 'center' }}
                >
                  <Text style={{ fontSize: iconSize * 1.5, marginBottom: gap * 0.4 }}>🌙</Text>
                  <Text style={{ color: '#FFD700', fontSize: bodySize, fontStyle: 'italic', fontWeight: '800', textAlign: 'center', lineHeight: bodySize * 1.6 }}>
                    "{profile.devise}"
                  </Text>
                  <Text style={{ color: 'rgba(255,182,193,0.65)', fontSize: captionSize, marginTop: gap * 0.3 }}>
                    — Devise de {profile.prenom}
                  </Text>
                </LinearGradient>
              )}
            </View>

            {/* ════════════════════════════════════════════════
                ZONE 3 — UNIVERS : Astral + Passions + Badges + Chanson + Lettre
                ════════════════════════════════════════════════ */}
            <View style={{ paddingHorizontal: px, gap: gap * 0.6, marginTop: gap * 0.6 }}>

              {/* Carte astrale */}
              {(profile.ascendant || profile.planete_dominante || profile.element_astrologique || signeInfo) ? (
                <Section title="CARTE ASTRALE">
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gap * 0.4 }}>
                    {signeInfo ? (
                      <View style={{
                        paddingHorizontal: gap * 0.65, paddingVertical: gap * 0.35, borderRadius: tapTarget / 2,
                        backgroundColor: 'rgba(255,215,0,0.07)',
                        borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)',
                        flexDirection: 'row', alignItems: 'center', gap: gap * 0.25,
                      }}>
                        <Text style={{ fontSize: iconSize }}>{signeInfo.emoji}</Text>
                        <View>
                          <Text style={{ color: 'rgba(255,215,0,0.65)', fontSize: captionSize * 0.85, fontWeight: '800' }}>SIGNE</Text>
                          <Text style={{ color: 'rgba(255,215,0,0.95)', fontSize: captionSize, fontWeight: '700' }}>{profile.signe_astro}</Text>
                        </View>
                      </View>
                    ) : null}
                    {profile.ascendant ? (
                      <View style={{
                        paddingHorizontal: gap * 0.65, paddingVertical: gap * 0.35, borderRadius: tapTarget / 2,
                        backgroundColor: 'rgba(255,182,193,0.08)',
                        borderWidth: 1, borderColor: 'rgba(255,182,193,0.3)',
                        flexDirection: 'row', alignItems: 'center', gap: gap * 0.25,
                      }}>
                        <Text style={{ fontSize: iconSize }}>⬆️</Text>
                        <View>
                          <Text style={{ color: 'rgba(255,182,193,0.65)', fontSize: captionSize * 0.85, fontWeight: '800' }}>ASCENDANT</Text>
                          <Text style={{ color: 'rgba(255,182,193,0.95)', fontSize: captionSize, fontWeight: '700' }}>{profile.ascendant}</Text>
                        </View>
                      </View>
                    ) : null}
                    {profile.planete_dominante ? (
                      <View style={{
                        paddingHorizontal: gap * 0.65, paddingVertical: gap * 0.35, borderRadius: tapTarget / 2,
                        backgroundColor: 'rgba(192,132,252,0.08)',
                        borderWidth: 1, borderColor: 'rgba(192,132,252,0.3)',
                        flexDirection: 'row', alignItems: 'center', gap: gap * 0.25,
                      }}>
                        <Text style={{ fontSize: iconSize }}>🪐</Text>
                        <View>
                          <Text style={{ color: 'rgba(192,132,252,0.65)', fontSize: captionSize * 0.85, fontWeight: '800' }}>PLANÈTE</Text>
                          <Text style={{ color: 'rgba(192,132,252,0.95)', fontSize: captionSize, fontWeight: '700' }}>{profile.planete_dominante}</Text>
                        </View>
                      </View>
                    ) : null}
                    {profile.element_astrologique ? (
                      <View style={{
                        paddingHorizontal: gap * 0.65, paddingVertical: gap * 0.35, borderRadius: tapTarget / 2,
                        backgroundColor: 'rgba(135,206,235,0.08)',
                        borderWidth: 1, borderColor: 'rgba(135,206,235,0.3)',
                        flexDirection: 'row', alignItems: 'center', gap: gap * 0.25,
                      }}>
                        <Text style={{ fontSize: iconSize }}>🌊</Text>
                        <View>
                          <Text style={{ color: 'rgba(135,206,235,0.65)', fontSize: captionSize * 0.85, fontWeight: '800' }}>ÉLÉMENT</Text>
                          <Text style={{ color: 'rgba(135,206,235,0.95)', fontSize: captionSize, fontWeight: '700' }}>{profile.element_astrologique}</Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                </Section>
              ) : null}

              {/* Passions & univers — visible uniquement si débloqué */}
              {isUnlocked && profile.tags?.length > 0 && (
                <Section title="PASSIONS & UNIVERS">
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gap * 0.4 }}>
                    {profile.tags.map((tag: string) => (
                      // @ts-ignore
                      <View key={tag} style={{
                        paddingHorizontal: gap * 0.7, paddingVertical: gap * 0.35,
                        borderRadius: tapTarget / 2, borderWidth: 1,
                        borderColor: empreinte + '45', backgroundColor: empreinte + '10',
                      }}>
                        <Text style={{ color: empreinte, fontSize: captionSize, fontWeight: '700' }}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </Section>
              )}

              {/* Badges gamification — visible uniquement si débloqué */}
              {isUnlocked && pubBadges.length > 0 && (
                <Section title="BADGES DÉBLOQUÉS">
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gap * 0.5 }}>
                    {[...pubBadges].sort((a: UserBadge, b: UserBadge) =>
                      new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime()
                    ).map((b: UserBadge) => {
                      const color  = b.badge_color ?? '#FFD700';
                      const bgRgba = `${color}1F`;
                      const brRgba = `${color}55`;
                      return (
                        // @ts-ignore
                        <View key={b.id} style={{
                          alignItems: 'center', gap: gap * 0.15,
                          paddingHorizontal: gap * 0.65, paddingVertical: gap * 0.45,
                          borderRadius: cardRadius * 0.75,
                          backgroundColor: bgRgba,
                          borderWidth: 1.5, borderColor: brRgba,
                          minWidth: tapTarget * 1.2,
                          // @ts-ignore
                          boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 10, color: `${color}2A` }],
                        }}>
                          <Text style={{ fontSize: iconSize * 1.5 }}>{b.badge_emoji}</Text>
                          <Text style={{ color, fontSize: captionSize, fontWeight: '800', textAlign: 'center' }} numberOfLines={2}>
                            {b.badge_label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </Section>
              )}

              {/* Chanson de vie — visible uniquement si débloqué */}
              {isUnlocked && !!profile.chanson_vie && (
                <LinearGradient
                  colors={['rgba(75,0,130,0.35)', 'rgba(114,47,55,0.25)']}
                  style={{ borderRadius: cardRadius, padding: gap, borderWidth: 1, borderColor: 'rgba(255,182,193,0.15)', flexDirection: 'row', alignItems: 'center', gap: gap * 0.7 }}
                >
                    <Music size={iconSize} color="#FFB6C1" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: 'rgba(255,182,193,0.80)', fontSize: captionSize * 0.85, fontWeight: '800', letterSpacing: 2, marginBottom: gap * 0.15 }}>
                      CHANSON DE VIE
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.95)', fontSize: bodySize, fontWeight: '700' }}>
                      {profile.chanson_vie}
                    </Text>
                  </View>
                </LinearGradient>
              )}

              {/* Lettre secrète */}
              <LinearGradient
                colors={['rgba(90,48,0,0.5)', 'rgba(75,0,130,0.35)', 'rgba(13,13,26,0.65)']}
                style={{ borderRadius: cardRadius, padding: gap, borderWidth: 1, borderColor: 'rgba(255,215,0,0.18)', alignItems: 'center' }}
              >
                <Text style={{ fontSize: iconSize * 1.75, marginBottom: gap * 0.4 }}>💌</Text>
                <Text style={{ color: 'rgba(255,215,0,0.92)', fontSize: bodySize, fontWeight: '800', marginBottom: gap * 0.4 }}>
                  Lettre secrète de {profile.prenom}
                </Text>
                <View style={{ backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: cardRadius * 0.6, padding: gap * 0.7, alignItems: 'center', width: '100%' }}>
                  <Text style={{ fontSize: iconSize, marginBottom: gap * 0.3 }}>🔒</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: captionSize, textAlign: 'center', fontStyle: 'italic', lineHeight: captionSize * 1.55 }}>
                    {(connStatus === 'accepted' || matched) && profile.lettre_secrete
                      ? profile.lettre_secrete
                      : 'Révélée uniquement après un match mutuel'}
                  </Text>
                </View>
              </LinearGradient>
            </View>

            {/* ════════════════════════════════════════════════
                ZONE 4 — CONNEXION : Compat + Émotions + CTA groupés
                ════════════════════════════════════════════════ */}
            {!isOwnProfile && (
              <View style={{ paddingHorizontal: px, gap: gap * 0.6, marginTop: gap * 0.8, marginBottom: gap * 0.4 }}>

                {/* Barre de compatibilité */}
                <LinearGradient
                  colors={['rgba(114,47,55,0.5)', 'rgba(75,0,130,0.4)', 'rgba(13,13,26,0.6)']}
                  style={{ borderRadius: cardRadius, padding: gap, borderWidth: 1, borderColor: compatColor + '35' }}
                >
                  <CompatBar value={compat} color={compatColor} />
                </LinearGradient>

                {/* Émotions à envoyer — seulement si pas encore matchés */}
                {connStatus !== 'accepted' && (
                  <Section title="ENVOYER UNE ÉMOTION" mt={0}>
                    {/* Bannière match mutuel */}
                    {matched && (
                      <View style={{
                        backgroundColor: 'rgba(255,215,0,0.15)', borderRadius: cardRadius,
                        borderWidth: 1, borderColor: 'rgba(255,215,0,0.5)',
                        padding: gap, marginBottom: gap * 0.6, alignItems: 'center', gap: gap * 0.3,
                      }}>
                        <Text style={{ fontSize: 28 }}>✨💞✨</Text>
                        <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 16, textAlign: 'center' }}>
                          C&apos;est un Match !
                        </Text>
                        <Text style={{ color: '#CCCCE0', fontSize: 13, textAlign: 'center' }}>
                          Vous et {profile?.prenom} vous êtes mutuellement attirés — vous pouvez maintenant vous écrire !
                        </Text>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: gap * 0.2 }}>
                      {[
                        { emoji: '🌹', label: 'Rose',   action: 'rose',   color: '#FF69B4' },
                        { emoji: '⭐', label: 'Étoile', action: 'etoile', color: '#FFD700' },
                        { emoji: '💎', label: 'Cœur',   action: 'coeur',  color: '#C084FC' },
                        { emoji: '🪶', label: 'Plume',  action: 'plume',  color: '#87CEEB' },
                        { emoji: '🔥', label: 'Flamme', action: 'flamme', color: '#FF4500' },
                      ].map(item => (
                        // @ts-ignore
                        <ActionBtn
                          key={item.action}
                          emoji={item.emoji}
                          label={item.label}
                          color={item.color}
                          sent={Boolean(sentActions.has(item.action))}
                          onPress={() => { handleAction(item.action).catch(() => {}); }}
                        />
                      ))}
                    </View>
                  </Section>
                )}

                {/* Bannière match mutuel — visible à tout moment (même après accepted) */}
                {matched && (
                  <View style={{
                    backgroundColor: 'rgba(255,215,0,0.15)', borderRadius: cardRadius,
                    borderWidth: 1, borderColor: 'rgba(255,215,0,0.5)',
                    padding: gap, alignItems: 'center', gap: gap * 0.3,
                  }}>
                    <Text style={{ fontSize: 28 }}>✨💞✨</Text>
                    <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 16, textAlign: 'center' }}>
                      C&apos;est un Match !
                    </Text>
                    <Text style={{ color: '#CCCCE0', fontSize: 13, textAlign: 'center' }}>
                      Vous et {profile?.prenom} vous êtes mutuellement attirés — vous pouvez maintenant vous écrire !
                    </Text>
                  </View>
                )}

                {/* Bouton principal de connexion / chat */}
                <ConnectionButton
                  status={connStatus}
                  loading={connLoading}
                  onSend={handleSend}
                  onChat={handleChat}
                  onAccept={handleAccept}
                  onLike={() => handleAction('etoile')}
                />

                {/* Compatibilité cosmique partageable */}
                <Pressable
                  onPress={() => router.push(`/(app)/compat-share/${id}` as RelativePathString)}
                  accessibilityRole="button"
                  accessibilityLabel="Voir notre compatibilité cosmique"
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: gap * 0.4,
                    backgroundColor: 'rgba(192,132,252,0.10)', borderRadius: cardRadius, paddingVertical: tapTarget * 0.4,
                    borderWidth: 1, borderColor: 'rgba(192,132,252,0.25)',
                    minHeight: tapTarget,
                  }}
                >
                  <Text style={{ fontSize: iconSize }}>✨</Text>
                  <Text style={{ color: '#C084FC', fontWeight: '700', fontSize: bodySize }}>
                    Voir notre compatibilité cosmique
                  </Text>
                  <Text style={{ color: 'rgba(192,132,252,0.65)', fontSize: h3Size }}>›</Text>
                </Pressable>
              </View>
            )}
            {/* Espace bas pour le scroll */}
            <View style={{ height: gap * 1.2 }} />
          </ScrollView>
        </Animated.View>
      </CosmicBackground>
    </View>
  );
}
