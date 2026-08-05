// Aevyra – Ciel / Constellation (page principale)
// Architecture réécriture complète v2 :
// - Swipe natif gauche/droite via Gesture Handler + Reanimated (60fps, zéro bridge)
// - Mode feed vertical (desktop/tablette) vs swipe stack (mobile)
// - Mode recherche avec grille responsive
// - Zéro doublon, zéro FlatList imbriquée dans ScrollView
// - Compatible : téléphone, tablette, desktop, 4K, TV, voiture, cinéma
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { useFocusEffect, router, type RelativePathString } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, X, SlidersHorizontal, Heart, ArrowLeft } from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import PageHeader from '@/components/PageHeader';
import {
  getProfilesForConstellation, getTotalMembersCount,
  getChallengeWindow,
  getDailyChallenges,
  sendLike, sendDislike, getUserStreak, getMyProfile, computeCompatibilite,
  searchProfiles, triggerChallengeAction,
  type Profile, type UserStreak,
} from '@/lib/amour-api';
import { isFuture } from '@/lib/dateUtils';
import { useResponsive } from '@/hooks/useResponsive';
import { usePillBottomPad } from '@/hooks/usePillBottomPad';
import { supabase } from '@/client/supabase';
import * as Haptics from 'expo-haptics';

// ── Constantes ────────────────────────────────────────────
const SIGNAUX = [
  { id: 'rose',   emoji: '🌹', label: 'Rose',    color: '#FF69B4', phrase: 'a déposé une rose' },
  { id: 'etoile', emoji: '⭐', label: 'Étoile',  color: '#FFD700', phrase: 'vous a étoilé·e' },
  { id: 'coeur',  emoji: '💎', label: 'Cristal', color: '#87CEEB', phrase: 'a envoyé un cristal' },
  { id: 'plume',  emoji: '🪶', label: 'Plume',   color: '#DDA0DD', phrase: 'a soufflé une plume' },
  { id: 'flamme', emoji: '🔥', label: 'Flamme',  color: '#FF6B35', phrase: 'a allumé une flamme' },
];

const SIGNES = ['Bélier','Taureau','Gémeaux','Cancer','Lion','Vierge','Balance','Scorpion','Sagittaire','Capricorne','Verseau','Poissons'];


// ── Barre de résonance animée ─────────────────────────────
function ResonanceBar({ value, color }: { value: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  const started = useRef(false);
  const onLayout = useCallback(() => {
    if (started.current) return;
    started.current = true;
    Animated.spring(anim, { toValue: value / 100, useNativeDriver: false, friction: 6, tension: 40 }).start();
  }, [anim, value]);
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View onLayout={onLayout} style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
      <Animated.View style={{ height: 4, width, backgroundColor: color, borderRadius: 2 }} />
    </View>
  );
}

// ── Carte Swipe (mobile) — Gesture Handler + Reanimated ──
const SWIPE_THRESHOLD = 90;
const ROTATION_FACTOR = 0.08;

interface SwipeCardProps {
  profile: Profile;
  myProfile: Profile | null;
  onLike: (id: string) => void;
  onPass: (id: string) => void;
  isTop: boolean;
  stackIndex: number; // 0=top, 1=derrière, 2=encore derrière
}

const SwipeCard = React.memo(function SwipeCard({ profile, myProfile, onLike, onPass, isTop, stackIndex }: SwipeCardProps) { 
  const { h3Size, bodySize, captionSize, cardRadius, gap, tapTarget, iconSize, avatarSize  } = useResponsive();
  const [signalEnvoye, setSignalEnvoye] = useState('');
  const [ouvert, setOuvert] = useState(false);
  const accent = profile.empreinte_couleur || '#9B59B6';
  const resonance = myProfile ? computeCompatibilite(myProfile, profile) : 65;

  // Reanimated shared values — tout sur le thread UI
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const revealAnim = useSharedValue(0);

  const niveauLabel =
    resonance >= 90 ? '🌌 Âmes sœurs' :
    resonance >= 78 ? '✨ Résonance profonde' :
    resonance >= 65 ? '💫 Vibration commune' :
                      '🌱 Connexion naissante';

  // Style animé de la carte (swipe) — `as any` requis : RN transform ne supporte pas rotate + translate ensemble en types stricts
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${translateX.value * ROTATION_FACTOR}deg` },
    ] as any,
    opacity: cardOpacity.value,
    zIndex: isTop ? 10 : 10 - stackIndex,
  }));

  // Style hint Like/Pass qui apparaît selon direction
  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD * 0.5], [0, 1], 'clamp'),
  }));
  const passStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD * 0.5, 0], [1, 0], 'clamp'),
  }));

  // Style reveal du contenu détaillé
  const revealStyle = useAnimatedStyle(() => ({
    opacity: revealAnim.value,
    transform: [
      { scale: interpolate(revealAnim.value, [0, 1], [0.94, 1]) },
      { translateY: interpolate(revealAnim.value, [0, 1], [12, 0]) },
    ] as any,
  }));

  const _triggerHaptic = useCallback(() => {
    if (process.env.EXPO_OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);
  const triggerHapticMed = useCallback(() => {
    if (process.env.EXPO_OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);

  const handleLikeJS = useCallback(() => { onLike(profile.id); }, [onLike, profile.id]);
  const handlePassJS = useCallback(() => { onPass(profile.id); }, [onPass, profile.id]);

  // Geste swipe — 100% thread UI via Gesture Handler
  const gesture = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.25;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        // Swipe droite → Like
        translateX.value = withTiming(500, { duration: 280, easing: Easing.out(Easing.quad) });
        cardOpacity.value = withTiming(0, { duration: 260 }, () => { runOnJS(handleLikeJS)(); });
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        // Swipe gauche → Pass
        translateX.value = withTiming(-500, { duration: 280, easing: Easing.out(Easing.quad) });
        cardOpacity.value = withTiming(0, { duration: 260 }, () => { runOnJS(handlePassJS)(); });
      } else {
        // Retour au centre
        translateX.value = withSpring(0, { damping: 18, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      }
    });

  const handleOuvrir = () => {
    runOnJS(triggerHapticMed)();
    setOuvert(true);
    revealAnim.value = withSpring(1, { damping: 18, stiffness: 130 });
  };

  const handleSignal = async (signalId: string) => {
    setSignalEnvoye(signalId);
    runOnJS(triggerHapticMed)();
    try {
      const res = await sendLike(profile.id, signalId);
      if (res.matched) {
        setSignalEnvoye('matched');
        if (process.env.EXPO_OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setTimeout(() => setSignalEnvoye(''), 5000);
      } else {
        setTimeout(() => setSignalEnvoye(''), 3000);
      }
    } catch { setSignalEnvoye(''); }
  };

  // Offset visuel des cartes en dessous (stack effect)
  const stackOffset = stackIndex * 6;
  const stackScale  = 1 - stackIndex * 0.04;

  return (
    <GestureDetector gesture={gesture}>
      <Reanimated.View style={[
        {
          position: 'absolute', left: 0, right: 0,
          transform: [{ scale: isTop ? 1 : stackScale }, { translateY: isTop ? 0 : stackOffset }] as any,
        },
        isTop ? cardStyle : undefined,
      ] as any}>
        <LinearGradient
          colors={ouvert
            ? ['rgba(18,8,38,0.99)', accent + '18', 'rgba(10,6,24,0.99)']
            : [accent + '22', 'rgba(13,10,30,0.96)', accent + '12']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: cardRadius, overflow: 'hidden', borderWidth: 1, borderColor: accent + (ouvert ? '55' : '45') }}
        >
          {/* Hints Like / Pass visibles pendant le swipe */}
          {isTop && (
            <>
              <Reanimated.View style={[{
                position: 'absolute', top: 20, left: 20, zIndex: 20,
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                borderWidth: 2, borderColor: '#4ADE80', backgroundColor: 'rgba(74,222,128,0.15)',
                transform: [{ rotate: '-8deg' }],
              }, likeStyle]}>
                <Text style={{ color: '#4ADE80', fontWeight: '900', fontSize: h3Size }}>💚 OUI</Text>
              </Reanimated.View>
              <Reanimated.View style={[{
                position: 'absolute', top: 20, right: 20, zIndex: 20,
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                borderWidth: 2, borderColor: '#FF6B6B', backgroundColor: 'rgba(255,107,107,0.15)',
                transform: [{ rotate: '8deg' }],
              }, passStyle]}>
                <Text style={{ color: '#FF6B6B', fontWeight: '900', fontSize: h3Size }}>✕ PASSER</Text>
              </Reanimated.View>
            </>
          )}

          {/* ── Portail fermé ── */}
          {!ouvert ? (
            <Pressable onPress={handleOuvrir} accessibilityRole="button" accessibilityLabel={`Révéler ${profile.prenom}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: gap, gap: gap * 0.9 }}>
                {/* Orbe */}
                <View style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, alignItems: 'center', justifyContent: 'center' }}>
                  <LinearGradient colors={[accent, accent + '44', 'rgba(13,10,30,0)']}
                    style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, alignItems: 'center', justifyContent: 'center' }}>
                    {profile.photo_url
                      ? <Image source={{ uri: profile.photo_url }} style={{ width: avatarSize * 0.88, height: avatarSize * 0.88, borderRadius: avatarSize * 0.44 }} contentFit="cover" transition={400} />
                      : <Text style={{ fontSize: 28 }}>🌟</Text>}
                  </LinearGradient>
                  <View style={{ position: 'absolute', width: avatarSize + 4, height: avatarSize + 4, borderRadius: (avatarSize + 4) / 2, borderWidth: 1.5, borderColor: accent + '60' }} />
                </View>
                {/* Identité */}
                <View style={{ flex: 1, gap: gap * 0.35 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: gap * 0.35 }}>
                    <Text style={{ color: '#F5E6C8', fontSize: h3Size * 1.3, fontWeight: '900', letterSpacing: 0.3 }}>{profile.prenom}</Text>
                    {profile.age ? <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: bodySize }}>{profile.age} ans</Text> : null}
                  </View>
                  {profile.energie_romantique ? (
                    <View style={{ alignSelf: 'flex-start', paddingHorizontal: gap * 0.55, paddingVertical: 3, borderRadius: 20, backgroundColor: accent + '20', borderWidth: 1, borderColor: accent + '50' }}>
                      <Text style={{ color: accent, fontSize: captionSize, fontWeight: '700' }}>{profile.energie_romantique}</Text>
                    </View>
                  ) : null}
                  <View style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize }}>Résonance vibratoire</Text>
                      <Text style={{ color: accent, fontSize: captionSize, fontWeight: '800' }}>{resonance}%</Text>
                    </View>
                    <ResonanceBar value={resonance} color={accent} />
                  </View>
                </View>
                {/* Bouton révéler */}
                <View style={{ alignItems: 'center', gap: gap * 0.2 }}>
                  <View style={{ width: tapTarget, height: tapTarget, borderRadius: tapTarget / 2, backgroundColor: accent + '18', borderWidth: 1.5, borderColor: accent + '50', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: iconSize }}>✦</Text>
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize }}>Révéler</Text>
                </View>
              </View>
              {/* Bande niveau */}
              <View style={{ marginHorizontal: gap, marginBottom: gap * 0.8, paddingHorizontal: gap * 0.65, paddingVertical: 5, borderRadius: cardRadius * 0.6, backgroundColor: accent + '12', flexDirection: 'row', alignItems: 'center', gap: gap * 0.4 }}>
                <Text style={{ color: accent, fontSize: captionSize }}>{niveauLabel}</Text>
                {profile.ville ? <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize, marginLeft: 'auto' }}>📍 {profile.ville}</Text> : null}
              </View>
              {/* Hint swipe (mobile) */}
              <View style={{ paddingBottom: gap * 0.8, alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: captionSize }}>← Glissez pour passer · Glissez → pour envoyer un signal</Text>
              </View>
            </Pressable>
          ) : (
            /* ── Portail ouvert — révélation ── */
            <Reanimated.View style={revealStyle as any}>
              {/* En-tête cliquable → profil complet */}
              <Pressable
                onPress={() => { triggerChallengeAction('view_profiles'); router.push(`/(app)/profile/${profile.id}` as RelativePathString); }}
                accessibilityRole="button"
              >
                <View style={{ flexDirection: 'row', padding: gap, gap: gap * 0.8, alignItems: 'flex-start' }}>
                  <View style={{ position: 'relative' }}>
                    {profile.photo_url
                      ? <Image source={{ uri: profile.photo_url }} style={{ width: avatarSize, height: avatarSize, borderRadius: cardRadius * 0.85 }} contentFit="cover" transition={300} />
                      : <LinearGradient colors={[accent, accent + '44']} style={{ width: avatarSize, height: avatarSize, borderRadius: cardRadius * 0.85, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: iconSize * 1.6 }}>🌟</Text>
                        </LinearGradient>}
                    {profile.signe_astro ? (
                      <View style={{ position: 'absolute', bottom: -8, right: -8, paddingHorizontal: gap * 0.4, paddingVertical: 2, borderRadius: 10, backgroundColor: '#0D0A1E', borderWidth: 1, borderColor: accent + '60' }}>
                        <Text style={{ color: accent, fontSize: captionSize, fontWeight: '800' }}>{profile.signe_astro}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ flex: 1, gap: gap * 0.3, paddingTop: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: gap * 0.4, flexWrap: 'wrap' }}>
                      <Text style={{ color: '#F5E6C8', fontSize: h3Size * 1.4, fontWeight: '900' }}>{profile.prenom}</Text>
                      {profile.age ? <Text style={{ color: 'rgba(255,255,255,0.80)', fontSize: bodySize }}>{profile.age}</Text> : null}
                      {profile.is_verified && (
                        <View style={{ paddingHorizontal: gap * 0.35, paddingVertical: 1, borderRadius: 8, backgroundColor: 'rgba(100,255,180,0.12)', borderWidth: 1, borderColor: 'rgba(100,255,180,0.35)' }}>
                          <Text style={{ color: '#64FFB4', fontSize: captionSize, fontWeight: '800' }}>VÉRIFIÉ</Text>
                        </View>
                      )}
                    </View>
                    {profile.energie_romantique ? <Text style={{ color: accent, fontSize: captionSize, fontWeight: '700' }}>✦ {profile.energie_romantique}</Text> : null}
                    <View style={{ flexDirection: 'row', gap: gap * 0.6, flexWrap: 'wrap' }}>
                      {profile.ville ? <Text style={{ color: 'rgba(255,255,255,0.80)', fontSize: captionSize }}>📍 {profile.ville}</Text> : null}
                      {profile.style_amour ? <Text style={{ color: 'rgba(255,182,193,0.75)', fontSize: captionSize, fontStyle: 'italic' }}>Aime {profile.style_amour.toLowerCase()}</Text> : null}
                    </View>
                  </View>
                  <Text style={{ color: accent + '80', fontSize: h3Size, paddingTop: 4 }}>›</Text>
                </View>
              </Pressable>

              {/* Résonance */}
              <View style={{ marginHorizontal: gap, marginBottom: gap, padding: gap * 0.8, borderRadius: cardRadius * 0.7, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: accent + '25', gap: gap * 0.45 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.90)', fontSize: captionSize, fontWeight: '600', letterSpacing: 0.8 }}>RÉSONANCE VIBRATOIRE</Text>
                  <Text style={{ color: accent, fontSize: h3Size, fontWeight: '900' }}>{resonance}%</Text>
                </View>
                <ResonanceBar value={resonance} color={accent} />
                <Text style={{ color: accent, fontSize: bodySize, fontWeight: '700' }}>{niveauLabel}</Text>
              </View>

              {/* Devise / Bio */}
              {(profile.devise || profile.bio) ? (
                <View style={{ marginHorizontal: gap, marginBottom: gap * 0.8, borderLeftWidth: 2, borderLeftColor: accent + '60', paddingLeft: gap * 0.65 }}>
                  {profile.devise ? (
                    <Text style={{ color: '#F5E6C8', fontSize: bodySize, fontStyle: 'italic', fontWeight: '600', lineHeight: bodySize * 1.6 }}>« {profile.devise} »</Text>
                  ) : (
                    <Text style={{ color: 'rgba(255,255,255,0.80)', fontSize: bodySize, fontStyle: 'italic', lineHeight: bodySize * 1.55 }} numberOfLines={3}>{profile.bio?.replace(/\\n/g, '\n')}</Text>
                  )}
                </View>
              ) : null}

              {profile.reve_duo ? (
                <View style={{ marginHorizontal: gap, marginBottom: gap * 0.8, flexDirection: 'row', gap: gap * 0.5, alignItems: 'center' }}>
                  <Text style={{ fontSize: iconSize }}>🌠</Text>
                  <Text style={{ flex: 1, color: 'rgba(255,215,150,0.85)', fontSize: captionSize, fontStyle: 'italic', lineHeight: captionSize * 1.55 }} numberOfLines={2}>{profile.reve_duo}</Text>
                </View>
              ) : null}

              <View style={{ height: 1, marginHorizontal: gap, backgroundColor: accent + '20', marginBottom: gap * 0.8 }} />

              {/* Signaux d'attraction */}
              <View style={{ paddingHorizontal: gap, paddingBottom: gap }}>
                {signalEnvoye === 'matched' ? (
                  <LinearGradient colors={[accent + '40', '#4B008255']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ borderRadius: cardRadius * 0.8, padding: gap, alignItems: 'center', gap: gap * 0.4 }}>
                    <Text style={{ fontSize: iconSize * 1.5 }}>🌌</Text>
                    <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: h3Size }}>Connexion Cosmique établie !</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.90)', fontSize: captionSize, textAlign: 'center' }}>Votre lien avec {profile.prenom} existe maintenant dans les étoiles</Text>
                  </LinearGradient>
                ) : signalEnvoye ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: gap * 0.5, paddingVertical: gap * 0.6, borderRadius: cardRadius * 0.7, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                    <Text style={{ fontSize: iconSize * 1.2 }}>{SIGNAUX.find(s => s.id === signalEnvoye)?.emoji}</Text>
                    <Text style={{ color: '#F5E6C8', fontWeight: '700', fontSize: bodySize }}>Vous {SIGNAUX.find(s => s.id === signalEnvoye)?.phrase} {profile.prenom}</Text>
                  </View>
                ) : (
                  <>
                    <Text style={{ color: 'rgba(255,255,255,0.80)', fontSize: captionSize, textAlign: 'center', marginBottom: gap * 0.6, letterSpacing: 1 }}>ENVOYER UN SIGNAL</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                      {SIGNAUX.map((s) => (
                        <Pressable key={s.id} onPress={() => handleSignal(s.id)} accessibilityRole="button"
                          style={{ alignItems: 'center', gap: gap * 0.3, minWidth: tapTarget, minHeight: tapTarget, justifyContent: 'center' }}>
                          <View style={{ width: tapTarget, height: tapTarget, borderRadius: tapTarget / 2, backgroundColor: s.color + '18', borderWidth: 1.5, borderColor: s.color + '45', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: iconSize * 1.15 }}>{s.emoji}</Text>
                          </View>
                          <Text style={{ color: s.color + 'BB', fontSize: captionSize, fontWeight: '600' }}>{s.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                    {/* Boutons action swipe sous les signaux */}
                    <View style={{ flexDirection: 'row', gap: gap * 0.6, marginTop: gap * 0.8 }}>
                      <Pressable onPress={() => onPass(profile.id)} accessibilityRole="button"
                        style={{ flex: 1, paddingVertical: gap * 0.6, borderRadius: cardRadius * 0.7, backgroundColor: 'rgba(255,100,100,0.10)', borderWidth: 1, borderColor: 'rgba(255,100,100,0.28)', alignItems: 'center' }}>
                        <Text style={{ color: '#FF9090', fontWeight: '700', fontSize: bodySize }}>✕ Passer</Text>
                      </Pressable>
                      <Pressable onPress={() => handleSignal('etoile')} accessibilityRole="button"
                        style={{ flex: 1, paddingVertical: gap * 0.6, borderRadius: cardRadius * 0.7, backgroundColor: 'rgba(255,215,0,0.12)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.35)', alignItems: 'center' }}>
                        <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: bodySize }}>⭐ Étoiler</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            </Reanimated.View>
          )}
        </LinearGradient>
      </Reanimated.View>
    </GestureDetector>
  );
});

// ── Stack de cartes mobile (swipe) ───────────────────────
interface SwipeStackProps {
  profiles: Profile[];
  myProfile: Profile | null;
  onLike: (id: string) => void;
  onPass: (id: string) => void;
  cardHeight: number;
}

function SwipeStack({ profiles, myProfile, onLike, onPass, cardHeight }: SwipeStackProps) {
  // On affiche max 3 cartes en stack
  const visible = profiles.slice(0, 3);
  return (
    <View style={{ height: cardHeight, position: 'relative' }}>
      {visible.map((p, i) => (
        <SwipeCard
          key={p.id}
          profile={p}
          myProfile={myProfile}
          onLike={onLike}
          onPass={onPass}
          isTop={i === 0}
          stackIndex={i}
        />
      ))}
    </View>
  );
}

// ── Coup du Destin ────────────────────────────────────────
function CoupDuDestin({ profile, myProfile }: { profile: Profile; myProfile: Profile | null }) { 
  const accent = profile.empreinte_couleur || '#9B59B6';
  const resonance = myProfile ? computeCompatibilite(myProfile, profile) : 65;
  const { h3Size, bodySize, captionSize, cardRadius, gap, tapTarget, iconSize, avatarSize  } = useResponsive();
  return (
    <Pressable onPress={() => { triggerChallengeAction('view_profiles'); router.push(`/(app)/profile/${profile.id}` as RelativePathString); }} accessibilityRole="button">
      <LinearGradient colors={['rgba(75,0,130,0.6)', 'rgba(114,47,55,0.55)', 'rgba(75,0,130,0.45)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ borderRadius: cardRadius, padding: gap, marginBottom: gap, borderWidth: 1.5, borderColor: 'rgba(255,215,0,0.35)' }}>
        <View style={{ alignSelf: 'flex-start', marginBottom: gap * 0.8, flexDirection: 'row', alignItems: 'center', gap: gap * 0.4 }}>
          <Text style={{ fontSize: iconSize }}>🔮</Text>
          <Text style={{ color: '#FFD700', fontSize: captionSize * 0.9, fontWeight: '900', letterSpacing: 2 }}>COUP DU DESTIN · ÂME DU JOUR</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: gap * 0.8, alignItems: 'center' }}>
          <View style={{ position: 'relative' }}>
            {profile.photo_url
              ? <Image source={{ uri: profile.photo_url }} style={{ width: avatarSize, height: avatarSize, borderRadius: cardRadius * 0.85 }} contentFit="cover" />
              : <LinearGradient colors={[accent, '#4B0082']} style={{ width: avatarSize, height: avatarSize, borderRadius: cardRadius * 0.85, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: iconSize * 1.5 }}>🌟</Text></LinearGradient>}
            <View style={{ position: 'absolute', inset: -3, borderRadius: cardRadius * 0.85 + 3, borderWidth: 2, borderColor: 'rgba(255,215,0,0.5)' }} />
          </View>
          <View style={{ flex: 1, gap: gap * 0.25 }}>
            <Text style={{ color: '#FFD700', fontSize: h3Size * 1.3, fontWeight: '900' }}>{profile.prenom}{profile.age ? `, ${profile.age}` : ''}</Text>
            {profile.energie_romantique ? <Text style={{ color: 'rgba(255,215,0,0.85)', fontSize: captionSize }}>✦ {profile.energie_romantique}</Text> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: gap * 0.25 }}>
              <Text style={{ color: 'rgba(255,255,255,0.80)', fontSize: captionSize }}>Résonance</Text>
              <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: captionSize }}>{resonance}%</Text>
            </View>
            <ResonanceBar value={resonance} color="#FFD700" />
          </View>
        </View>
        {profile.devise ? (
          <Text style={{ color: 'rgba(255,230,180,0.90)', fontStyle: 'italic', fontSize: bodySize, marginTop: gap * 0.8, lineHeight: bodySize * 1.6, textAlign: 'center' }}>« {profile.devise} »</Text>
        ) : profile.bio ? (
          <Text style={{ color: 'rgba(255,230,180,0.80)', fontStyle: 'italic', fontSize: bodySize, marginTop: gap * 0.8, lineHeight: bodySize * 1.6, textAlign: 'center' }} numberOfLines={2}>{profile.bio}</Text>
        ) : null}
        <View style={{ marginTop: gap * 0.8, paddingTop: gap * 0.8, borderTopWidth: 1, borderTopColor: 'rgba(255,215,0,0.15)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: gap * 0.4, minHeight: tapTarget * 0.7 }}>
          <Text style={{ color: 'rgba(255,215,0,0.80)', fontSize: bodySize }}>Ouvrir ce portail d'âme</Text>
          <Text style={{ color: 'rgba(255,215,0,0.80)', fontSize: h3Size }}>›</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// ── Carte résultat recherche (grille) ─────────────────────
function SearchCard({ item, myProfile }: { item: Profile; myProfile: Profile | null }) { 
  const { h3Size, captionSize, cardRadius, gap, iconSize, avatarSize  } = useResponsive();
  const compat = myProfile ? computeCompatibilite(myProfile, item) : null;
  const isBoost = (item as Profile & { boost_until?: string | null }).boost_until && isFuture((item as Profile & { boost_until?: string | null }).boost_until);
  const compatColor = compat !== null && compat >= 80 ? '#FFD700' : 'rgba(255,255,255,0.65)';
  return (
    <Pressable onPress={() => { triggerChallengeAction('view_profiles'); router.push(`/(app)/profile/${item.id}` as RelativePathString); }} style={{ flex: 1 }}>
      <LinearGradient
        colors={compat !== null && compat >= 80 ? ['rgba(255,215,0,0.10)', 'rgba(75,0,130,0.35)'] : ['rgba(75,0,130,0.35)', 'rgba(13,5,30,0.55)']}
        style={{ borderRadius: cardRadius, padding: gap * 0.7, alignItems: 'center', gap: gap * 0.4, borderWidth: 1, borderColor: compat !== null && compat >= 80 ? 'rgba(255,215,0,0.30)' : 'rgba(255,255,255,0.08)' }}>
        <View style={{ position: 'relative', alignSelf: 'center' }}>
          {item.photo_url
            ? <Image source={{ uri: item.photo_url }} style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }} contentFit="cover" />
            : <View style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, backgroundColor: 'rgba(75,0,130,0.5)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: iconSize * 1.4 }}>🌟</Text></View>}
          {item.is_verified && (
            <View style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFD700', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(13,5,30,0.9)' }}>
              <Text style={{ fontSize: iconSize * 0.55 }}>✓</Text>
            </View>
          )}
          {isBoost && (
            <View style={{ position: 'absolute', top: -4, left: -4, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 8, backgroundColor: 'rgba(255,120,0,0.85)' }}>
              <Text style={{ fontSize: captionSize * 0.75, color: '#FFF', fontWeight: '800' }}>⚡</Text>
            </View>
          )}
        </View>
        <View style={{ alignItems: 'center', gap: gap * 0.25, width: '100%' }}>
          <Text style={{ color: '#F5E6C8', fontWeight: '800', fontSize: h3Size }} numberOfLines={1}>{item.prenom}{item.age ? `, ${item.age}` : ''}</Text>
          {item.pseudo ? <Text style={{ color: 'rgba(255,215,0,0.65)', fontSize: captionSize * 0.9 }} numberOfLines={1}>@{item.pseudo}</Text> : null}
          {item.ville ? <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: captionSize }} numberOfLines={1}>📍 {item.ville}</Text> : null}
          {item.signe_astro ? <Text style={{ color: 'rgba(192,132,252,0.80)', fontSize: captionSize }} numberOfLines={1}>✦ {item.signe_astro}</Text> : null}
          {compat !== null && (
            <View style={{ marginTop: gap * 0.25, flexDirection: 'row', alignItems: 'center', gap: gap * 0.25, paddingHorizontal: gap * 0.5, paddingVertical: 3, borderRadius: 10, backgroundColor: compat >= 80 ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: compat >= 80 ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.08)' }}>
              <Text style={{ color: compatColor, fontSize: captionSize, fontWeight: '800' }}>{compat}%</Text>
              <Text style={{ color: compatColor, fontSize: captionSize * 0.85 }}>{compat >= 80 ? '💫' : compat >= 60 ? '✨' : '⚡'}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// ── Écran principal Constellation (Ciel) ─────────────────
export default function Constellation() { 
  const {
    px, isPhone, isDesktop,
    h3Size, bodySize, captionSize, cardRadius, gap,
    tapTarget, iconSize, contentMaxWidth,
   } = useResponsive();
  const pillReservedH = usePillBottomPad();

  // ── État ──────────────────────────────────────────────
  const [profiles,     setProfiles]     = useState<Profile[]>([]);
  const [myProfile,    setMyProfile]    = useState<Profile | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);
  const [coupDuDestin, setCoupDuDestin] = useState<Profile | null>(null);
  const [streak,       setStreak]       = useState<UserStreak>({ current_streak: 0, longest_streak: 0, last_active: null, total_points: 0 });
  const [totalMembers, setTotalMembers] = useState(0);
  // Progression défis du jour — chargée en parallèle avec le reste
  const [challengeDone,  setChallengeDone]  = useState<number | null>(null);
  const [challengeTotal, setChallengeTotal] = useState<number | null>(null);

  // ── Recherche & filtres ───────────────────────────────
  const [searchQuery,   setSearchQuery]   = useState('');
  const [filtreGenre,   setFiltreGenre]   = useState('');
  const [filtreSigne,   setFiltreSigne]   = useState('');
  const [showFilters,   setShowFilters]   = useState(false);
  const [searchResults, setSearchResults] = useState<Profile[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSearchMode    = searchResults !== null;

  const triggerSearch = useCallback((query: string, genre: string, signe: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const isActive = query.trim() !== '' || genre !== '' || signe !== '';
    if (!isActive) { setSearchResults(null); return; }
    setSearchLoading(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await searchProfiles({ query: query.trim() || undefined, genre: genre || undefined, signe: signe || undefined, limit: 50 });
        setSearchResults(res);
      } catch { setSearchResults([]); }
      finally   { setSearchLoading(false); }
    }, 350);
  }, []);

  const handleSearchChange = (text: string) => { setSearchQuery(text); triggerSearch(text, filtreGenre, filtreSigne); };
  const handleGenreFilter  = (g: string)    => { const n = filtreGenre === g ? '' : g; setFiltreGenre(n); triggerSearch(searchQuery, n, filtreSigne); Haptics.selectionAsync().catch(() => {}); };
  const handleSigneFilter  = (s: string)    => { const n = filtreSigne === s ? '' : s; setFiltreSigne(n); triggerSearch(searchQuery, filtreGenre, n); };
  const clearSearch        = ()             => { setSearchQuery(''); setFiltreGenre(''); setFiltreSigne(''); setSearchResults(null); setShowFilters(false); };

  // ── Chargement ────────────────────────────────────────
  const loadConstellation = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setLoadError(false);
    try {
      const [data, st, total, me, dailyCh] = await Promise.all([
        getProfilesForConstellation(),
        getUserStreak(),
        getTotalMembersCount(),
        getMyProfile(),
        getDailyChallenges(),
      ]);
      // Progression défis du jour pour le bouton raccourci
      setChallengeDone(dailyCh.filter(c => c.completed).length);
      setChallengeTotal(dailyCh.length);
      setProfiles(data);
      setMyProfile(me);
      if (data.length > 0 && me) {
        // Seed déterministe basé sur la date locale du fuseau de l'utilisateur
        // (via getChallengeWindow) — même résultat toute la journée, partout dans le monde
        const win = await getChallengeWindow();
        const dayOfYear = dayOfYearFromStr(win.today);
        const scored = data.map(p => ({ p, score: computeCompatibilite(me, p) })).sort((a, b) => b.score - a.score);
        const topN = scored.slice(0, Math.min(3, scored.length));
        setCoupDuDestin(topN[dayOfYear % topN.length].p);
      } else if (data.length > 0) {
        setCoupDuDestin(data[0]);
      }
      setStreak(st);
      setTotalMembers(total);
    } catch (e) {
      console.error('[Constellation] Chargement échoué', e);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void supabase.rpc('expire_own_sanction');
    loadConstellation(true);
  }, [loadConstellation]));

  // ── Actions swipe / pass ──────────────────────────────
  const handleLike = useCallback(async (profileId: string) => {
    setProfiles(prev => prev.filter(p => p.id !== profileId));
    if (process.env.EXPO_OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try { await sendLike(profileId, 'etoile'); } catch { loadConstellation(false); }
  }, [loadConstellation]);

  const handlePass = useCallback(async (profileId: string) => {
    setProfiles(prev => prev.filter(p => p.id !== profileId));
    if (process.env.EXPO_OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try { await sendDislike(profileId); } catch { loadConstellation(false); }
  }, [loadConstellation]);

  // Profils pour le feed (sans coup du destin)
  const portails = coupDuDestin && profiles.length > 1
    ? profiles.filter(p => p.id !== coupDuDestin.id)
    : profiles.filter(p => p.id !== coupDuDestin?.id);

  const constellationVide = !isSearchMode && profiles.length === 0;

  // Hauteur estimée d'une SwipeCard (mobile) — assez grande pour révéler le contenu ouvert
  const cardHeight = 520;

  // ── Rendu bandeau guidage ──────────────────────────────
  const renderGuidance = () => {
    if (loading || loadError || isSearchMode || !myProfile) return null;
    if (!myProfile.photo_url || !myProfile.bio) {
      return (
        <Pressable onPress={() => router.push('/(app)/(tabs)/profil' as RelativePathString)} style={{ paddingHorizontal: px, marginBottom: gap * 0.5 }}>
          <LinearGradient colors={['rgba(192,132,252,0.18)', 'rgba(75,0,130,0.22)']} style={{ borderRadius: cardRadius * 0.8, padding: gap * 0.7, borderWidth: 1, borderColor: 'rgba(192,132,252,0.30)', flexDirection: 'row', alignItems: 'center', gap: gap * 0.6 }}>
            <Text style={{ fontSize: iconSize * 1.4 }}>{!myProfile.photo_url ? '📸' : '✍️'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#C084FC', fontWeight: '800', fontSize: h3Size }}>{!myProfile.photo_url ? 'Ajoutez une photo' : 'Complétez votre bio'}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.60)', fontSize: captionSize }}>{!myProfile.photo_url ? 'Les profils avec photo reçoivent 5× plus de connexions' : 'Une phrase sincère attire les vraies âmes'}</Text>
            </View>
            <Text style={{ color: 'rgba(192,132,252,0.7)', fontSize: h3Size }}>›</Text>
          </LinearGradient>
        </Pressable>
      );
    }
    if (myProfile.created_at && (Date.now() - new Date(myProfile.created_at).getTime()) > 3 * 24 * 60 * 60 * 1000) {
      return (
        <Pressable onPress={() => router.push('/(app)/parrainage' as RelativePathString)} style={{ paddingHorizontal: px, marginBottom: gap * 0.5 }}>
          <LinearGradient colors={['rgba(255,215,0,0.12)', 'rgba(255,140,0,0.10)']} style={{ borderRadius: cardRadius * 0.8, padding: gap * 0.7, borderWidth: 1, borderColor: 'rgba(255,215,0,0.28)', flexDirection: 'row', alignItems: 'center', gap: gap * 0.6 }}>
            <Text style={{ fontSize: iconSize * 1.4 }}>🌟</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: h3Size }}>Invitez vos amis, gagnez ensemble</Text>
              <Text style={{ color: 'rgba(255,255,255,0.60)', fontSize: captionSize }}>{myProfile.referral_count > 0 ? `${myProfile.referral_count} ami${myProfile.referral_count > 1 ? 's' : ''} parrainé${myProfile.referral_count > 1 ? 's' : ''} ✨` : 'Parrainez un ami et débloquez des cadres exclusifs'}</Text>
            </View>
            <Text style={{ color: 'rgba(255,215,0,0.7)', fontSize: h3Size }}>›</Text>
          </LinearGradient>
        </Pressable>
      );
    }
    return null;
  };

  // ── Barre recherche + filtres ──────────────────────────
  const renderSearchBar = () => (
    <View style={{ paddingHorizontal: px, marginBottom: gap * 0.5, gap: gap * 0.5 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: gap * 0.5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: cardRadius * 0.8, paddingHorizontal: gap * 0.6, paddingVertical: 2, borderWidth: 1, borderColor: isSearchMode ? 'rgba(255,215,0,0.35)' : 'rgba(255,255,255,0.1)', minHeight: tapTarget }}>
        {searchLoading ? <ActivityIndicator size="small" color="#FFD700" style={{ width: iconSize }} /> : <Search size={iconSize} color="rgba(255,215,0,0.7)" />}
        <TextInput value={searchQuery} onChangeText={handleSearchChange} placeholder="Rechercher un prénom, un pseudo…" placeholderTextColor="rgba(255,255,255,0.35)" style={{ flex: 1, color: '#F5F5F5', fontSize: bodySize, paddingVertical: 10 }} returnKeyType="search" clearButtonMode="never" autoCorrect={false} autoCapitalize="none" />
        <Pressable onPress={() => { setShowFilters(v => !v); Haptics.selectionAsync().catch(() => {}); }} style={{ padding: 6, borderRadius: 8, backgroundColor: showFilters ? 'rgba(255,215,0,0.15)' : 'transparent', minWidth: tapTarget * 0.7, minHeight: tapTarget * 0.7, alignItems: 'center', justifyContent: 'center' }}>
          <SlidersHorizontal size={iconSize} color={showFilters ? '#FFD700' : 'rgba(255,255,255,0.65)'} />
        </Pressable>
        {isSearchMode && (
          <Pressable onPress={clearSearch} style={{ padding: 4, minWidth: tapTarget * 0.6, minHeight: tapTarget * 0.6, alignItems: 'center', justifyContent: 'center' }}>
            <X size={iconSize} color="rgba(255,255,255,0.5)" />
          </Pressable>
        )}
      </View>
      {showFilters && (
        <View style={{ gap: gap * 0.5 }}>
          <View style={{ flexDirection: 'row', gap: gap * 0.4, flexWrap: 'wrap' }}>
            <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: captionSize, fontWeight: '700', letterSpacing: 1.2, alignSelf: 'center' }}>Genre :</Text>
            {[{ key: 'femme', label: '♀ Femme' }, { key: 'homme', label: '♂ Homme' }, { key: 'autre', label: '⚧ Autre' }].map(({ key, label }) => {
              const active = filtreGenre === key;
              return (
                <Pressable key={key} onPress={() => handleGenreFilter(key)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: active ? 'rgba(255,215,0,0.18)' : 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: active ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.12)' }}>
                  <Text style={{ color: active ? '#FFD700' : 'rgba(255,255,255,0.55)', fontSize: captionSize, fontWeight: active ? '700' : '400' }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginLeft: -px }} contentContainerStyle={{ paddingHorizontal: px, gap: 6, flexDirection: 'row' }}>
            {SIGNES.map(s => {
              const active = filtreSigne === s;
              return (
                <Pressable key={s} onPress={() => handleSigneFilter(s)} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: active ? 'rgba(192,132,252,0.22)' : 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: active ? 'rgba(192,132,252,0.6)' : 'rgba(255,255,255,0.1)' }}>
                  <Text style={{ color: active ? '#C084FC' : 'rgba(255,255,255,0.65)', fontSize: captionSize, fontWeight: active ? '700' : '400' }}>{s}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );

  // ── Raccourcis Défis / Cosmos ──────────────────────────
  // Toujours visibles (même pendant le chargement) pour garder la navigation accessible
  const renderShortcuts = () => {
    // Signe astro de l'utilisateur pour personnaliser le bouton Cosmos
    const signeEmojis: Record<string, string> = {
      'Bélier': '♈', 'Taureau': '♉', 'Gémeaux': '♊', 'Cancer': '♋',
      'Lion': '♌', 'Vierge': '♍', 'Balance': '♎', 'Scorpion': '♏',
      'Sagittaire': '♐', 'Capricorne': '♑', 'Verseau': '♒', 'Poissons': '♓',
    };
    const signe = myProfile?.signe_astro ?? '';
    const signeEmoji = signe ? (signeEmojis[signe] ?? '🌙') : '🌙';
    const cosmosLabel = signe ? `${signe} · Horoscope` : 'Horoscope du jour';
    const streakLabel = loading
      ? '…'
      : (() => {
          // Progression des défis : X/N défis · Ypts (streak si > 0)
          if (challengeTotal !== null && challengeTotal > 0) {
            const pts = streak.total_points > 0 ? ` · ${streak.total_points}pts` : '';
            const fire = streak.current_streak > 0 ? ` 🔥${streak.current_streak}j` : '';
            return `${challengeDone}/${challengeTotal} défis${pts}${fire}`;
          }
          // Fallback : streak seul ou invitation
          if (streak.current_streak > 0) return `${streak.current_streak}j · ${streak.total_points}pts`;
          return 'Commencer les défis';
        })();

    return (
      <View style={{ paddingHorizontal: px, marginBottom: gap * 0.7, flexDirection: 'row', gap: gap * 0.6 }}>
        {/* ── Défis du jour ── */}
        <Pressable
          onPress={() => router.push('/(app)/challenges' as RelativePathString)}
          style={{ flex: 1 }}
          accessibilityRole="button"
          accessibilityLabel="Accéder aux défis du jour"
        >
          <LinearGradient
            colors={['rgba(255,69,0,0.22)', 'rgba(255,215,0,0.09)']}
            style={{ borderRadius: cardRadius, padding: gap * 0.75, borderWidth: 1, borderColor: 'rgba(255,120,0,0.35)', flexDirection: 'row', alignItems: 'center', gap: gap * 0.5 }}
          >
            <Text style={{ fontSize: iconSize * 1.2 }}>🔥</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: h3Size }}>Défis</Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize }} numberOfLines={1}>{streakLabel}</Text>
            </View>
          </LinearGradient>
        </Pressable>

        {/* ── Cosmos / Éphémérides ── */}
        <Pressable
          onPress={() => router.push('/(app)/ephemerides' as RelativePathString)}
          style={{ flex: 1 }}
          accessibilityRole="button"
          accessibilityLabel="Accéder aux éphémérides et horoscope du jour"
        >
          <LinearGradient
            colors={['rgba(75,0,130,0.32)', 'rgba(192,132,252,0.11)']}
            style={{ borderRadius: cardRadius, padding: gap * 0.75, borderWidth: 1, borderColor: 'rgba(192,132,252,0.35)', flexDirection: 'row', alignItems: 'center', gap: gap * 0.5 }}
          >
            <Text style={{ fontSize: iconSize * 1.2 }}>{signeEmoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#C084FC', fontWeight: '800', fontSize: h3Size }}>Cosmos</Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize }} numberOfLines={1}>{cosmosLabel}</Text>
            </View>
          </LinearGradient>
        </Pressable>
      </View>
    );
  };

  // ── État vide poétique ────────────────────────────────
  const renderEmptyState = () => (
    <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never" contentContainerStyle={{ paddingHorizontal: px, paddingBottom: pillReservedH }}>
      <View style={{ alignItems: 'center', paddingTop: 24, gap: gap * 1.2 }}>
        <Text style={{ fontSize: iconSize * 4 }}>🌌</Text>
        <View style={{ alignItems: 'center', gap: gap * 0.6 }}>
          <Text style={{ color: '#F5E6C8', fontSize: h3Size * 1.2, fontWeight: '900', textAlign: 'center' }}>
            {totalMembers <= 1 ? 'Vous tracez le chemin ✦' : 'Votre âme sœur n\'est pas encore là'}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: bodySize * 1.6, fontSize: bodySize, maxWidth: contentMaxWidth * 0.8 }}>
            {totalMembers <= 1
              ? 'Vous faites partie des âmes fondatrices d\'Aevyra. Dès qu\'une âme compatible rejoint la constellation, elle apparaît instantanément.'
              : `${totalMembers} âme${totalMembers > 1 ? 's' : ''} ont rejoint Aevyra. La vôtre n'a pas encore croisé son reflet cosmique. Revenez — la constellation grandit chaque jour.`}
          </Text>
        </View>
        <LinearGradient colors={['rgba(155,89,182,0.15)', 'rgba(75,0,130,0.20)']} style={{ borderRadius: cardRadius, padding: gap, width: '100%', borderWidth: 1, borderColor: 'rgba(155,89,182,0.25)', alignItems: 'center', gap: gap * 0.4 }}>
          <Text style={{ color: '#9B59B6', fontSize: iconSize * 2.5, fontWeight: '900' }}>{totalMembers}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: captionSize }}>âme{totalMembers > 1 ? 's' : ''} inscrite{totalMembers > 1 ? 's' : ''} sur Aevyra</Text>
          <View style={{ marginTop: gap * 0.25, paddingHorizontal: gap * 0.75, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(155,89,182,0.15)', borderWidth: 1, borderColor: 'rgba(155,89,182,0.3)' }}>
            <Text style={{ color: 'rgba(155,89,182,0.95)', fontSize: captionSize, fontWeight: '800' }}>✦ Communauté en pleine croissance</Text>
          </View>
        </LinearGradient>
        {/* Améliorer son profil → plus visible dans la constellation */}
        <Pressable onPress={() => router.push('/(app)/(tabs)/profil' as RelativePathString)} style={{ width: '100%' }}>
          <LinearGradient colors={['rgba(155,89,182,0.25)', 'rgba(75,0,130,0.35)']} style={{ borderRadius: cardRadius, padding: gap, borderWidth: 1, borderColor: 'rgba(155,89,182,0.35)', flexDirection: 'row', alignItems: 'center', gap: gap * 0.75 }}>
            <Text style={{ fontSize: iconSize * 1.5 }}>✨</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#F5E6C8', fontWeight: '800', fontSize: h3Size }}>Affinez votre empreinte d'âme</Text>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: captionSize }}>Un profil profond attire les vraies résonances</Text>
            </View>
            <Text style={{ color: 'rgba(155,89,182,0.8)', fontSize: h3Size + 4 }}>›</Text>
          </LinearGradient>
        </Pressable>
        {/* Parrainer → accélérer l'arrivée d'âmes compatibles */}
        <Pressable onPress={() => router.push('/(app)/parrainage' as RelativePathString)} style={{ width: '100%' }}>
          <LinearGradient colors={['rgba(255,215,0,0.12)', 'rgba(75,0,130,0.25)']} style={{ borderRadius: cardRadius, padding: gap, borderWidth: 1, borderColor: 'rgba(255,215,0,0.22)', flexDirection: 'row', alignItems: 'center', gap: gap * 0.75 }}>
            <Text style={{ fontSize: iconSize * 1.5 }}>🌟</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: h3Size }}>Invitez vos amis sur Aevyra</Text>
              <Text style={{ color: 'rgba(255,255,255,0.60)', fontSize: captionSize }}>Plus la constellation grandit, plus vos chances augmentent</Text>
            </View>
            <Text style={{ color: 'rgba(255,215,0,0.8)', fontSize: h3Size + 4 }}>›</Text>
          </LinearGradient>
        </Pressable>
        {/* Roman des Âmes → rester engagé en attendant */}
        <Pressable onPress={() => router.push('/(app)/(tabs)/roman' as RelativePathString)} style={{ width: '100%' }}>
          <LinearGradient colors={['rgba(255,182,193,0.10)', 'rgba(75,0,130,0.20)']} style={{ borderRadius: cardRadius, padding: gap, borderWidth: 1, borderColor: 'rgba(255,182,193,0.20)', flexDirection: 'row', alignItems: 'center', gap: gap * 0.75 }}>
            <Text style={{ fontSize: iconSize * 1.5 }}>📖</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFB6C1', fontWeight: '800', fontSize: h3Size }}>Roman des Âmes</Text>
              <Text style={{ color: 'rgba(255,255,255,0.60)', fontSize: captionSize }}>Histoires vraies de la communauté · Inspirez-vous</Text>
            </View>
            <Text style={{ color: 'rgba(255,182,193,0.8)', fontSize: h3Size + 4 }}>›</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </ScrollView>
  );

  // ── Contenu principal selon mode ──────────────────────
  const renderContent = () => {
    if (loading) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: gap }}>
          <ActivityIndicator color="#9B59B6" size="large" />
          <Text style={{ color: 'rgba(155,89,182,0.90)', fontSize: bodySize, fontStyle: 'italic' }}>Les étoiles s'alignent pour vous…</Text>
        </View>
      );
    }
    if (loadError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: gap, paddingHorizontal: px }}>
          <Text style={{ fontSize: iconSize * 3 }}>🌩️</Text>
          <Text style={{ color: '#F5E6C8', fontSize: h3Size, fontWeight: '900', textAlign: 'center' }}>Connexion perdue</Text>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: bodySize, textAlign: 'center', lineHeight: bodySize * 1.6 }}>Les étoiles sont temporairement inaccessibles. Vérifiez votre connexion et réessayez.</Text>
          <Pressable onPress={() => loadConstellation(true)} style={{ marginTop: gap * 0.5 }}>
            <LinearGradient colors={['rgba(114,47,55,0.7)', 'rgba(75,0,130,0.6)']} style={{ borderRadius: cardRadius, paddingVertical: gap * 0.6, paddingHorizontal: gap * 1.2, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' }}>
              <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: h3Size }}>✦ Réessayer</Text>
            </LinearGradient>
          </Pressable>
        </View>
      );
    }

    // ── Mode recherche : grille ──────────────────────────
    // numColumns change entre mobile/desktop → FlatList doit être remontée via un state gridKey
    if (isSearchMode) {
      return (
        <FlatList
          data={searchResults ?? []}
          keyExtractor={item => item.id}
          numColumns={isDesktop ? 4 : 2}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: px, paddingBottom: pillReservedH, gap: 10 }}
          columnWrapperStyle={{ gap: 10 }}
          ListEmptyComponent={
            searchLoading
              ? <View style={{ alignItems: 'center', paddingTop: 40, gap: 12 }}><ActivityIndicator color="#9B59B6" size="large" /><Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: bodySize, fontStyle: 'italic' }}>Recherche en cours…</Text></View>
              : <View style={{ alignItems: 'center', paddingTop: 40, gap: 12 }}><Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: bodySize, textAlign: 'center', fontWeight: '700' }}>Aucun résultat trouvé</Text><Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: bodySize, textAlign: 'center', maxWidth: 260 }}>Essayez un autre prénom, retirez les filtres ou attendez que de nouvelles âmes rejoignent Aevyra</Text></View>
          }
          renderItem={({ item }) => <SearchCard item={item} myProfile={myProfile} />}
        />
      );
    }

    // ── Constellation vide ───────────────────────────────
    if (constellationVide) return renderEmptyState();

    // ── Mode mobile : SwipeStack ─────────────────────────
    if (isPhone) {
      return (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: px, paddingBottom: pillReservedH, gap: gap }}
        >
          {coupDuDestin && <CoupDuDestin profile={coupDuDestin} myProfile={myProfile} />}
          {portails.length > 0 && (
            <>
              <Text style={{ color: 'rgba(255,215,0,0.60)', fontSize: captionSize, fontWeight: '700', letterSpacing: 1.5, marginBottom: gap * 0.3 }}>✦ PORTAILS D'ÂMES</Text>
              <SwipeStack profiles={portails} myProfile={myProfile} onLike={handleLike} onPass={handlePass} cardHeight={cardHeight} />
            </>
          )}
          {portails.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: gap * 2, gap: gap * 1.1 }}>
              <Text style={{ fontSize: iconSize * 3 }}>🌌</Text>
              <Text style={{ color: '#FFD700', fontSize: h3Size * 1.1, fontWeight: '900', textAlign: 'center' }}>
                Vous avez vu toute la constellation !
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: bodySize, textAlign: 'center', lineHeight: bodySize * 1.65, maxWidth: contentMaxWidth * 0.85 }}>
                {'C\'est rare — revenez demain.\nDe nouvelles âmes rejoignent Aevyra chaque jour.'}
              </Text>
              {/* Suggestions d'actions pour garder l'utilisateur engagé */}
              <Pressable onPress={() => router.push('/(app)/(tabs)/roman' as RelativePathString)} style={{ width: '100%' }}>
                <LinearGradient colors={['rgba(155,89,182,0.20)', 'rgba(75,0,130,0.35)']}
                  style={{ borderRadius: cardRadius, padding: gap, borderWidth: 1, borderColor: 'rgba(155,89,182,0.35)', flexDirection: 'row', alignItems: 'center', gap: gap * 0.75 }}>
                  <Text style={{ fontSize: iconSize * 1.4 }}>📖</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#F5E6C8', fontWeight: '800', fontSize: h3Size }}>Lisez le Roman des Âmes</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.60)', fontSize: captionSize }}>Des histoires vraies écrites par la communauté</Text>
                  </View>
                  <Text style={{ color: 'rgba(155,89,182,0.8)', fontSize: h3Size + 4 }}>›</Text>
                </LinearGradient>
              </Pressable>
              <Pressable onPress={() => router.push('/(app)/challenges' as RelativePathString)} style={{ width: '100%' }}>
                <LinearGradient colors={['rgba(255,215,0,0.12)', 'rgba(75,0,130,0.30)']}
                  style={{ borderRadius: cardRadius, padding: gap, borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)', flexDirection: 'row', alignItems: 'center', gap: gap * 0.75 }}>
                  <Text style={{ fontSize: iconSize * 1.4 }}>🔥</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: h3Size }}>Vos défis du jour</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.60)', fontSize: captionSize }}>Gagnez des points · Montez en visibilité</Text>
                  </View>
                  <Text style={{ color: 'rgba(255,215,0,0.8)', fontSize: h3Size + 4 }}>›</Text>
                </LinearGradient>
              </Pressable>
              <Pressable onPress={() => loadConstellation(true)} style={{ width: '100%', marginTop: gap * 0.25 }}>
                <LinearGradient colors={['rgba(114,47,55,0.45)', 'rgba(75,0,130,0.40)']}
                  style={{ borderRadius: cardRadius, paddingVertical: gap * 0.8, paddingHorizontal: gap, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', flexDirection: 'row', alignItems: 'center', gap: gap * 0.6 }}>
                  <Text style={{ fontSize: iconSize * 1.2 }}>🔄</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.80)', fontWeight: '700', fontSize: bodySize }}>Actualiser la constellation</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: captionSize }}>Vérifier si de nouvelles âmes ont rejoint</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </ScrollView>
      );
    }

    // ── Mode desktop/tablette : feed vertical ─────────────
    return (
      <FlatList<Profile>
        data={portails}
        keyExtractor={item => item.id}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces
        refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); loadConstellation(false); }}
        removeClippedSubviews={false}
        windowSize={5}
        contentContainerStyle={{
          paddingHorizontal: px,
          paddingBottom: pillReservedH,
          paddingTop: 4,
          maxWidth: Math.min(contentMaxWidth, 900) + px * 2,
          alignSelf: 'center' as const,
          width: '100%',
        }}
        ListHeaderComponent={coupDuDestin ? <CoupDuDestin profile={coupDuDestin} myProfile={myProfile} /> : null}
        ListFooterComponent={
          portails.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: gap * 2, gap: gap * 1.1 }}>
              <Text style={{ fontSize: iconSize * 3 }}>✨</Text>
              <Text style={{ color: '#F5E6C8', fontSize: h3Size, fontWeight: '900', textAlign: 'center' }}>Vous avez tout exploré</Text>
              <Pressable onPress={() => loadConstellation(true)} style={{ width: '100%', marginTop: gap * 0.5 }}>
                <LinearGradient colors={['rgba(114,47,55,0.55)', 'rgba(75,0,130,0.50)']} style={{ borderRadius: cardRadius, paddingVertical: gap * 0.8, paddingHorizontal: gap, borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)', flexDirection: 'row', alignItems: 'center', gap: gap * 0.6 }}>
                  <Text style={{ fontSize: iconSize * 1.3 }}>🔄</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: h3Size }}>Actualiser la constellation</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.60)', fontSize: captionSize }}>De nouvelles âmes ont peut-être rejoint votre ciel</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            <View style={{ alignItems: 'center', marginTop: gap * 0.5, gap: gap * 0.9, paddingVertical: gap * 1.5, paddingHorizontal: px }}>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: iconSize }}>✦ ✦ ✦</Text>
              <Text style={{ color: 'rgba(255,255,255,0.60)', fontSize: captionSize, fontStyle: 'italic', textAlign: 'center' }}>
                Tous les portails ont été révélés
              </Text>
              {/* Invitations à rester engagé */}
              <Pressable onPress={() => router.push('/(app)/(tabs)/roman' as RelativePathString)}
                style={{ width: '100%', maxWidth: Math.min(contentMaxWidth, 560) }}>
                <LinearGradient colors={['rgba(155,89,182,0.15)', 'rgba(75,0,130,0.25)']}
                  style={{ borderRadius: cardRadius, padding: gap * 0.9, borderWidth: 1, borderColor: 'rgba(155,89,182,0.25)', flexDirection: 'row', alignItems: 'center', gap: gap * 0.7 }}>
                  <Text style={{ fontSize: iconSize * 1.2 }}>📖</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#F5E6C8', fontWeight: '800', fontSize: bodySize }}>Roman des Âmes</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: captionSize }}>Histoires vraies de la communauté</Text>
                  </View>
                  <Text style={{ color: 'rgba(155,89,182,0.8)', fontSize: h3Size }}>›</Text>
                </LinearGradient>
              </Pressable>
              <Pressable onPress={() => router.push('/(app)/challenges' as RelativePathString)}
                style={{ width: '100%', maxWidth: Math.min(contentMaxWidth, 560) }}>
                <LinearGradient colors={['rgba(255,215,0,0.10)', 'rgba(75,0,130,0.20)']}
                  style={{ borderRadius: cardRadius, padding: gap * 0.9, borderWidth: 1, borderColor: 'rgba(255,215,0,0.20)', flexDirection: 'row', alignItems: 'center', gap: gap * 0.7 }}>
                  <Text style={{ fontSize: iconSize * 1.2 }}>🔥</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: bodySize }}>Défis du jour</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: captionSize }}>Montez en visibilité · Gagnez des points</Text>
                  </View>
                  <Text style={{ color: 'rgba(255,215,0,0.8)', fontSize: h3Size }}>›</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )
        }
        renderItem={useCallback(({ item, _index }: { item: Profile; _index: number }) => {
          // Desktop feed : portail statique cliquable (pas de swipe)
          const accent = item.empreinte_couleur || '#9B59B6';
          const resonance = myProfile ? computeCompatibilite(myProfile, item) : 65;
          const niveauLabel =
            resonance >= 90 ? '🌌 Âmes sœurs' :
            resonance >= 78 ? '✨ Résonance profonde' :
            resonance >= 65 ? '💫 Vibration commune' : '🌱 Connexion naissante';
          return (
            <Pressable
              key={item.id}
              onPress={() => { triggerChallengeAction('view_profiles'); router.push(`/(app)/profile/${item.id}` as RelativePathString); }}
              style={{ marginBottom: gap * 0.8 }}
            >
              <LinearGradient colors={[accent + '22', 'rgba(13,10,30,0.96)', accent + '12']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ borderRadius: cardRadius, overflow: 'hidden', borderWidth: 1, borderColor: accent + '45' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: gap, gap: gap * 0.9 }}>
                  <View style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' }}>
                    <LinearGradient colors={[accent, accent + '44', 'rgba(13,10,30,0)']} style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' }}>
                      {item.photo_url ? <Image source={{ uri: item.photo_url }} style={{ width: 64, height: 64, borderRadius: 32 }} contentFit="cover" /> : <Text style={{ fontSize: 28 }}>🌟</Text>}
                    </LinearGradient>
                  </View>
                  <View style={{ flex: 1, gap: gap * 0.35 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: gap * 0.35 }}>
                      <Text style={{ color: '#F5E6C8', fontSize: h3Size * 1.2, fontWeight: '900' }}>{item.prenom}</Text>
                      {item.age ? <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: bodySize }}>{item.age} ans</Text> : null}
                      {item.is_verified && <Text style={{ color: '#64FFB4', fontSize: captionSize, fontWeight: '800' }}>✓</Text>}
                    </View>
                    <Text style={{ color: accent, fontSize: captionSize }}>{niveauLabel}</Text>
                    {item.ville ? <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: captionSize }}>📍 {item.ville}</Text> : null}
                    <View style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize }}>Résonance</Text>
                        <Text style={{ color: accent, fontSize: captionSize, fontWeight: '800' }}>{resonance}%</Text>
                      </View>
                      <ResonanceBar value={resonance} color={accent} />
                    </View>
                  </View>
                  <View style={{ alignItems: 'center', gap: gap * 0.3 }}>
                    <Pressable onPress={(e) => { e.stopPropagation(); handleLike(item.id); }} style={{ width: tapTarget, height: tapTarget, borderRadius: tapTarget / 2, backgroundColor: 'rgba(74,222,128,0.12)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.35)', alignItems: 'center', justifyContent: 'center' }}>
                      <Heart size={iconSize} color="#4ADE80" />
                    </Pressable>
                    <Pressable onPress={(e) => { e.stopPropagation(); handlePass(item.id); }} style={{ width: tapTarget, height: tapTarget, borderRadius: tapTarget / 2, backgroundColor: 'rgba(255,100,100,0.08)', borderWidth: 1, borderColor: 'rgba(255,100,100,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                      <ArrowLeft size={iconSize} color="#FF9090" />
                    </Pressable>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          );
        }, [myProfile, handleLike, handlePass, gap, cardRadius, h3Size, bodySize, captionSize, tapTarget, iconSize])}
      />
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground>
        <PageHeader
          title="💫 Constellation"
          subtitle={
            loading ? 'Alignement en cours…'
              : isSearchMode
                ? searchLoading ? 'Recherche en cours…' : `${searchResults?.length ?? 0} résultat${(searchResults?.length ?? 0) !== 1 ? 's' : ''}`
                : profiles.length > 0
                  ? `${profiles.length} âme${profiles.length !== 1 ? 's' : ''} dans votre ciel`
                  : totalMembers > 0
                    ? `${totalMembers} membre${totalMembers > 1 ? 's' : ''} · aucune correspondance`
                    : 'Vous êtes parmi les premiers ✨'
          }
          actions={[{ emoji: '🔔', onPress: () => router.push('/(app)/notifications' as RelativePathString), testID: 'notifications-btn' }]}
        />
        {renderGuidance()}
        {renderShortcuts()}
        {renderSearchBar()}
        {renderContent()}
      </CosmicBackground>
    </View>
  );
}
