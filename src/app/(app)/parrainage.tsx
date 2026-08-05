// Aevyra – Parrainage Cosmique v3 — "La Constellation de Lumière"
// Système de missions progressives : chaque filleul = une étoile dans votre constellation
// Récompenses originales : Aura d'avatar, Titre cosmique, Énergie d'attraction, Séance oraculaire
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, Text, View,
} from 'react-native';
import { shareContent, copyToClipboard } from '@/lib/share-utils';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft, Copy, Share2, Star, Check, Crown,
  Zap, Sparkles, Lock,
} from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import {
  getReferralStatsV2, isBoostActive, boostRemainingLabel, type ReferralStatsV2,
} from '@/lib/amour-api';
import { useResponsive } from '@/hooks/useResponsive';

// ── Missions que chaque filleul doit accomplir ──────────────────────────────
const MISSIONS_FILLEUL = [
  { id: 'm1', emoji: '🌱', label: 'Inscription',       desc: 'A créé son compte Aevyra' },
  { id: 'm2', emoji: '🌿', label: 'Profil complet',    desc: 'A complété son profil à 80%+' },
  { id: 'm3', emoji: '💬', label: 'Premier message',   desc: 'A envoyé son premier message' },
  { id: 'm4', emoji: '💫', label: 'Premier échange',   desc: 'A reçu une réponse — connexion établie !' },
];

// ── Récompenses par palier — originales et thématiques Aevyra ───────────────
const RECOMPENSES = [
  {
    count: 1,
    emoji: '🌟',
    titre: 'Étoile Naissante',
    badge: 'badge_etoile',
    couleur: '#87CEEB',
    gradient: ['rgba(135,206,235,0.25)', 'rgba(135,206,235,0.08)', 'transparent'] as [string, string, string],
    reward_title: 'Aura Céleste',
    reward_desc: 'Un halo bleu lumineux entoure votre avatar dans toutes les découvertes',
    reward_icon: '✦',
    type: 'aura',
  },
  {
    count: 3,
    emoji: '🌠',
    titre: 'Tisseur d\'Étoiles',
    badge: 'badge_tisseur',
    couleur: '#C084FC',
    gradient: ['rgba(192,132,252,0.25)', 'rgba(192,132,252,0.08)', 'transparent'] as [string, string, string],
    reward_title: 'Titre Cosmique',
    reward_desc: '"Tisseur d\'Étoiles" s\'affiche sous votre prénom — visible par tous',
    reward_icon: '✧',
    type: 'titre',
  },
  {
    count: 7,
    emoji: '🪐',
    titre: 'Architecte de Galaxie',
    badge: 'badge_architecte',
    couleur: '#FFD700',
    gradient: ['rgba(255,215,0,0.25)', 'rgba(255,215,0,0.08)', 'transparent'] as [string, string, string],
    reward_title: 'Énergie d\'Attraction ×3',
    reward_desc: 'Vos compatibilités sont pondérées ×3 — vous êtes recommandé aux âmes les plus proches de vous',
    reward_icon: '⚡',
    type: 'attraction',
  },
  {
    count: 15,
    emoji: '🌌',
    titre: 'Gardien de la Constellation',
    badge: 'badge_gardien',
    couleur: '#FF69B4',
    gradient: ['rgba(255,105,180,0.25)', 'rgba(255,105,180,0.08)', 'transparent'] as [string, string, string],
    reward_title: 'Séance Oraculaire ∞',
    reward_desc: 'L\'IA d\'Aevyra révèle votre profil d\'âme complet — accès permanent à l\'Oracle',
    reward_icon: '🔮',
    type: 'oracle',
  },
];

// ── Calcul progression missions d'un filleul ────────────────────────────────
function getMissionProgress(filleul: ReferralStatsV2['referrals'][0]): number {
  // m1 = inscrit (toujours vrai si le filleul existe)
  // m2 = validated_at ou validation_reason contient 'profil'
  // m3 = validated_at renseigné
  // m4 = rewarded = true
  if (filleul.rewarded) return 4;
  if (filleul.validated_at) return 3;
  if (filleul.validation_reason?.toLowerCase().includes('profil')) return 2;
  return 1;
}

export default function ParrainagePage() { 
  const insets = useSafeAreaInsets();
  const { px, captionSize, bodySize, h3Size, h2Size, iconSize, gap: _gap, cardRadius: _cardRadius, tapTarget, contentMaxWidth, isDesktop, isTablet, isTV  } = useResponsive();
  const isWide = isDesktop || isTablet || isTV;
  const [stats,      setStats]      = useState<ReferralStatsV2 | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [copied,     setCopied]     = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [expanded,   setExpanded]   = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const s = await getReferralStatsV2();
      if (active) { setStats(s); setLoading(false); }
    })();
    return () => { active = false; };
  }, []));

  const referralLink = stats?.referral_code
    ? `https://aevyra.uk/join?ref=${stats.referral_code.replace('AEVYRA-', '')}`
    : null;

  const handleCopyCode = async () => {
    if (!stats?.referral_code) return;
    const { success } = await copyToClipboard(stats.referral_code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopyLink = async () => {
    if (!referralLink) return;
    const { success } = await copyToClipboard(referralLink);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleShare = async () => {
    if (!stats?.referral_code || !referralLink) return;
    await shareContent({
      message:
        `🌌 Rejoins-moi sur Aevyra — l'app des âmes authentiques !\n\n` +
        `✨ En t'inscrivant avec mon lien, tu reçois un badge d'arrivée exclusif et tu rejoins ma constellation.\n\n` +
        `👉 ${referralLink}\n\n` +
        `Ou entre mon code : ${stats.referral_code}\n\n` +
        `🌙 Ensemble on construit quelque chose de rare — aevyra.uk`,
      url:   referralLink,
      title: 'Rejoins ma Constellation Aevyra',
    });
  };

  const count       = stats?.referral_count ?? 0;
  const boostOn     = isBoostActive(stats?.boost_until ?? null);
  const boostLeft   = boostRemainingLabel(stats?.boost_until ?? null);
  const nextPalier  = RECOMPENSES.find(r => r.count > count);
  const progress    = nextPalier ? Math.min(count / nextPalier.count, 1) : 1;
  const currentTier = [...RECOMPENSES].reverse().find(r => count >= r.count);

  // Filleuls triés : rewarded > validés > en cours > en attente
  const filleulsSorted = useMemo(() => {
    if (!stats?.referrals) return [];
    return [...stats.referrals].sort((a, b) => {
      return getMissionProgress(b) - getMissionProgress(a);
    });
  }, [stats]);

  // ── Étoiles de constellation (animation cosmétique) ──────────────────────
  const stars = useMemo(() =>
    Array.from({ length: Math.max(count, 1) }, (_, i) => ({
      id: i,
      x: 15 + (i % 5) * 18 + (Math.floor(i / 5) % 2 === 0 ? 0 : 9),
      y: 12 + Math.floor(i / 5) * 20,
      size: i < count ? 8 : 5,
      filled: i < count,
    }))
  , [count]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0D1A' }}>
      <CosmicBackground>
        {/* ── En-tête ────────────────────────────────────────────────── */}
        <View style={{
          paddingTop: insets.top + 12, paddingHorizontal: px,
          paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
        }}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: tapTarget, height: tapTarget, borderRadius: tapTarget / 2, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={iconSize} color="#FFD700" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFD700', fontSize: h2Size, fontWeight: '900', letterSpacing: 1 }}>
              CONSTELLATION DE LUMIÈRE
            </Text>
            <Text style={{ color: 'rgba(255,182,193,0.6)', fontSize: captionSize, fontWeight: '600', letterSpacing: 1.5, marginTop: 1 }}>
              {currentTier ? `${currentTier.emoji} ${currentTier.titre}` : '✦ TISSEZ VOTRE GALAXIE PERSONNELLE'}
            </Text>
          </View>
          <Star size={22} color="rgba(255,215,0,0.7)" />
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: px, paddingBottom: insets.bottom + 40, gap: 20,
            maxWidth: isWide ? contentMaxWidth : undefined,
            alignSelf: isWide ? 'center' as const : undefined,
            width: isWide ? '100%' : undefined,
          }}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          bounces={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          {loading ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
              <ActivityIndicator size="large" color="#C084FC" />
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: captionSize, marginTop: 12, fontStyle: 'italic' }}>
                Alignement cosmique en cours…
              </Text>
            </View>
          ) : (
            <>
              {/* ── Boost actif ─────────────────────────────────────── */}
              {boostOn && (
                <LinearGradient
                  colors={['rgba(255,215,0,0.18)', 'rgba(255,165,0,0.10)', 'transparent']}
                  style={{ borderRadius: 18, padding: 16, borderWidth: 1.5, borderColor: 'rgba(255,215,0,0.5)', flexDirection: 'row', alignItems: 'center', gap: 12 }}
                >
                  <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,215,0,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={20} color="#FFD700" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFD700', fontSize: h3Size, fontWeight: '900' }}>
                      ⚡ Énergie d'attraction active
                    </Text>
                    <Text style={{ color: 'rgba(255,215,0,0.7)', fontSize: captionSize, marginTop: 2 }}>
                      Vous brillez en tête des découvertes — {boostLeft}
                    </Text>
                  </View>
                </LinearGradient>
              )}

              {/* ── Carte constellation + code ──────────────────────── */}
              <LinearGradient
                colors={['rgba(75,0,130,0.60)', 'rgba(13,13,26,0.75)']}
                style={{ borderRadius: 26, padding: 24, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)', gap: 18 }}
              >
                {/* Constellation visuelle */}
                <View style={{ alignItems: 'center', gap: 10 }}>
                  <View style={{ width: '100%', height: count > 5 ? 70 : 44, position: 'relative' }}>
                    {stars.map((s: { id: number; x: number; y: number; size: number; filled: boolean }) => (
                      // @ts-ignore
                      <View key={s.id} style={{
                        position: 'absolute',
                        left: `${s.x}%` as unknown as number,
                        top: s.y,
                        width: s.size,
                        height: s.size,
                        borderRadius: s.size / 2,
                        backgroundColor: s.filled ? '#FFD700' : 'rgba(255,255,255,0.12)',
                        shadowColor: s.filled ? '#FFD700' : 'transparent',
                        shadowOffset: { width: 0, height: 0 },
                        shadowRadius: s.filled ? 4 : 0,
                        shadowOpacity: s.filled ? 0.9 : 0,
                      }} />
                    ))}
                  </View>
                  <Text style={{ color: '#FFD700', fontSize: h2Size * 1.2, fontWeight: '900' }}>
                    {count === 0 ? '0' : count} étoile{count > 1 ? 's' : ''}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: captionSize, textAlign: 'center' }}>
                    {count === 0
                      ? 'Votre constellation n\'a pas encore d\'étoiles'
                      : `Votre constellation brille de ${count} âme${count > 1 ? 's' : ''} parrainée${count > 1 ? 's' : ''}`}
                  </Text>
                </View>

                {/* Séparateur */}
                <View style={{ height: 1, backgroundColor: 'rgba(255,215,0,0.12)' }} />

                {/* Code cosmique */}
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: 'rgba(255,215,0,0.55)', fontSize: captionSize, fontWeight: '800', letterSpacing: 3 }}>
                    VOTRE CODE COSMIQUE
                  </Text>
                  <Text style={{ color: '#FFD700', fontSize: 24, fontWeight: '900', letterSpacing: 4 }}>
                    {stats?.referral_code ?? '…'}
                  </Text>
                </View>

                {/* Lien */}
                <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(192,132,252,0.18)', gap: 4 }}>
                  <Text style={{ color: 'rgba(192,132,252,0.5)', fontSize: captionSize * 0.85, fontWeight: '800', letterSpacing: 2 }}>LIEN DIRECT</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: bodySize * 0.9 }} numberOfLines={1}>
                    {referralLink ?? '…'}
                  </Text>
                </View>

                {/* Boutons d'action */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={handleCopyLink}
                    disabled={!referralLink}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                      backgroundColor: copiedLink ? 'rgba(127,217,154,0.15)' : 'rgba(192,132,252,0.12)',
                      borderRadius: 14, paddingVertical: 12,
                      borderWidth: 1, borderColor: copiedLink ? 'rgba(127,217,154,0.4)' : 'rgba(192,132,252,0.3)',
                      opacity: referralLink ? 1 : 0.4,
                    }}
                  >
                    {copiedLink ? <Check size={14} color="#7FD99A" /> : <Copy size={14} color="#C084FC" />}
                    <Text style={{ color: copiedLink ? '#7FD99A' : '#C084FC', fontWeight: '800', fontSize: bodySize }}>
                      {copiedLink ? 'Copié !' : 'Lien'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleCopyCode}
                    disabled={!stats?.referral_code}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                      backgroundColor: copied ? 'rgba(127,217,154,0.15)' : 'rgba(255,215,0,0.08)',
                      borderRadius: 14, paddingVertical: 12,
                      borderWidth: 1, borderColor: copied ? 'rgba(127,217,154,0.4)' : 'rgba(255,215,0,0.25)',
                      opacity: stats?.referral_code ? 1 : 0.4,
                    }}
                  >
                    {copied ? <Check size={14} color="#7FD99A" /> : <Copy size={14} color="#FFD700" />}
                    <Text style={{ color: copied ? '#7FD99A' : '#FFD700', fontWeight: '800', fontSize: bodySize }}>
                      {copied ? 'Copié !' : 'Code'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleShare}
                    disabled={!referralLink}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                      backgroundColor: 'rgba(255,105,180,0.1)', borderRadius: 14, paddingVertical: 12,
                      borderWidth: 1, borderColor: 'rgba(255,105,180,0.3)',
                      opacity: referralLink ? 1 : 0.4,
                    }}
                  >
                    <Share2 size={14} color="#FF69B4" />
                    <Text style={{ color: '#FF69B4', fontWeight: '800', fontSize: bodySize }}>Partager</Text>
                  </Pressable>
                </View>

                {/* Message d'invitation inspirant */}
                <View style={{ backgroundColor: 'rgba(255,105,180,0.06)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,105,180,0.15)' }}>
                  <Text style={{ color: 'rgba(255,182,193,0.75)', fontSize: captionSize, lineHeight: captionSize * 1.6, textAlign: 'center', fontStyle: 'italic' }}>
                    "Chaque âme que tu invites ajoute une étoile à ta constellation — et à la mienne. Ensemble on grandit."
                  </Text>
                </View>
              </LinearGradient>

              {/* ── Progression vers le prochain palier ─────────────── */}
              {nextPalier ? (
                <LinearGradient
                  colors={['rgba(13,13,26,0.9)', `${nextPalier.couleur}18`, 'transparent']}
                  style={{ borderRadius: 20, padding: 18, borderWidth: 1, borderColor: `${nextPalier.couleur}30`, gap: 14 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 28 }}>{nextPalier.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: captionSize, fontWeight: '700' }}>PROCHAIN PALIER</Text>
                      <Text style={{ color: nextPalier.couleur, fontSize: h3Size, fontWeight: '900' }}>
                        {nextPalier.titre}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: nextPalier.couleur, fontSize: 22, fontWeight: '900' }}>{count}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: captionSize }}>/ {nextPalier.count}</Text>
                    </View>
                  </View>
                  {/* Barre progression */}
                  <View style={{ gap: 6 }}>
                    <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
                      <LinearGradient
                        colors={[nextPalier.couleur, `${nextPalier.couleur}88`]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={{ height: 8, borderRadius: 4, width: `${progress * 100}%` as unknown as number }}
                      />
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: captionSize, textAlign: 'right' }}>
                      encore {nextPalier.count - count} invitation{nextPalier.count - count > 1 ? 's' : ''} pour débloquer
                    </Text>
                  </View>
                  {/* Récompense à débloquer */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: `${nextPalier.couleur}12`, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: `${nextPalier.couleur}25` }}>
                    <Text style={{ fontSize: 20 }}>{nextPalier.reward_icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: nextPalier.couleur, fontSize: bodySize, fontWeight: '800' }}>
                        Récompense : {nextPalier.reward_title}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: captionSize, marginTop: 2, lineHeight: captionSize * 1.5 }}>
                        {nextPalier.reward_desc}
                      </Text>
                    </View>
                    <Lock size={16} color={`${nextPalier.couleur}99`} />
                  </View>
                </LinearGradient>
              ) : (
                <LinearGradient
                  colors={['rgba(255,215,0,0.2)', 'rgba(255,105,180,0.15)', 'transparent']}
                  style={{ borderRadius: 20, padding: 18, borderWidth: 1.5, borderColor: 'rgba(255,215,0,0.5)', flexDirection: 'row', alignItems: 'center', gap: 14 }}
                >
                  <Crown size={28} color="#FFD700" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFD700', fontSize: h3Size, fontWeight: '900' }}>Gardien de la Constellation</Text>
                    <Text style={{ color: 'rgba(255,215,0,0.7)', fontSize: captionSize, marginTop: 3 }}>
                      Tous les pouvoirs cosmiques sont débloqués ✨
                    </Text>
                  </View>
                </LinearGradient>
              )}

              {/* ── Récompenses / Paliers ────────────────────────────── */}
              <View style={{ gap: 8 }}>
                <Text style={{ color: 'rgba(255,215,0,0.65)', fontSize: captionSize, fontWeight: '800', letterSpacing: 2.5, marginBottom: 2 }}>
                  🏆 POUVOIRS COSMIQUES À DÉBLOQUER
                </Text>
                {RECOMPENSES.map(r => {
                  const unlocked  = count >= r.count;
                  const isCurrent = !unlocked && r.count === nextPalier?.count;
                  return (
                    // @ts-ignore
                    <Pressable key={r.count} onPress={() => setExpanded(expanded === r.badge ? null : r.badge)}>
                      <LinearGradient
                        colors={unlocked ? r.gradient : ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)', 'transparent']}
                        style={{
                          borderRadius: 18, padding: 16,
                          borderWidth: isCurrent ? 1.5 : 1,
                          borderColor: unlocked ? `${r.couleur}55` : isCurrent ? `${r.couleur}45` : 'rgba(255,255,255,0.07)',
                          gap: 10,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                          <View style={{ width: 50, alignItems: 'center', gap: 3 }}>
                            <Text style={{ fontSize: 24, opacity: unlocked ? 1 : 0.3 }}>{r.emoji}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                              <Star size={9} color={unlocked ? r.couleur : 'rgba(255,255,255,0.25)'} />
                              <Text style={{ color: unlocked ? r.couleur : 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '900' }}>×{r.count}</Text>
                            </View>
                          </View>
                          <View style={{ flex: 1, gap: 3 }}>
                            <Text style={{ color: unlocked ? r.couleur : isCurrent ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)', fontSize: bodySize, fontWeight: '900' }}>
                              {r.titre}{unlocked ? '  ✦' : ''}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                              <Text style={{ fontSize: 11 }}>{r.reward_icon}</Text>
                              <Text style={{ color: unlocked ? r.couleur : isCurrent ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)', fontSize: captionSize, fontWeight: '700' }}>
                                {r.reward_title}
                              </Text>
                            </View>
                          </View>
                          {unlocked
                            ? <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: `${r.couleur}22`, alignItems: 'center', justifyContent: 'center' }}>
                                <Check size={14} color={r.couleur} />
                              </View>
                            : <Lock size={14} color="rgba(255,255,255,0.2)" />
                          }
                        </View>
                        {/* Détail déroulable */}
                        {(expanded === r.badge || unlocked) && (
                          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: captionSize, lineHeight: captionSize * 1.55, marginLeft: 64 }}>
                            {r.reward_desc}
                          </Text>
                        )}
                      </LinearGradient>
                    </Pressable>
                  );
                })}
              </View>

              {/* ── Filleuls — missions et progression ──────────────── */}
              {filleulsSorted.length > 0 && (
                <View style={{ gap: 10 }}>
                  <Text style={{ color: 'rgba(192,132,252,0.65)', fontSize: captionSize, fontWeight: '800', letterSpacing: 2.5 }}>
                    🌟 VOS ÉTOILES — {filleulsSorted.length} ÂME{filleulsSorted.length > 1 ? 'S' : ''} INVITÉE{filleulsSorted.length > 1 ? 'S' : ''}
                  </Text>
                  {filleulsSorted.map((f: (typeof filleulsSorted)[0], i: number) => {
                    const missionsDone = getMissionProgress(f);
                    const completed    = f.rewarded;
                    return (
                      // @ts-ignore
                      <View key={f.referred_id} style={{
                        borderRadius: 16, overflow: 'hidden',
                        borderWidth: 1, borderColor: completed ? 'rgba(127,217,154,0.3)' : 'rgba(192,132,252,0.15)',
                      }}>
                        <LinearGradient
                          colors={completed ? ['rgba(127,217,154,0.08)', 'rgba(13,13,26,0.6)'] : ['rgba(192,132,252,0.06)', 'rgba(13,13,26,0.6)']}
                          style={{ padding: 14, gap: 10 }}
                        >
                          {/* En-tête filleul */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={{
                              width: 36, height: 36, borderRadius: 18,
                              backgroundColor: completed ? 'rgba(127,217,154,0.15)' : 'rgba(192,132,252,0.12)',
                              alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Text style={{ fontSize: 16 }}>{completed ? '🌟' : missionsDone >= 3 ? '🌿' : missionsDone >= 2 ? '🌱' : '✦'}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: completed ? '#7FD99A' : 'rgba(255,255,255,0.75)', fontSize: bodySize, fontWeight: '800' }}>
                                Étoile #{i + 1}
                              </Text>
                              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: captionSize }}>
                                Invité le {new Date(f.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                              </Text>
                            </View>
                            {completed
                              ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <Sparkles size={12} color="#7FD99A" />
                                  <Text style={{ color: '#7FD99A', fontSize: captionSize, fontWeight: '700' }}>Complet</Text>
                                </View>
                              : <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: captionSize }}>
                                  {missionsDone}/4
                                </Text>
                            }
                          </View>

                          {/* Missions */}
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            {MISSIONS_FILLEUL.map((m, mi) => {
                              const done = mi < missionsDone;
                              return (
                                // @ts-ignore
                                <View key={m.id} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                                  <View style={{
                                    width: 32, height: 32, borderRadius: 16,
                                    backgroundColor: done ? 'rgba(127,217,154,0.15)' : 'rgba(255,255,255,0.05)',
                                    alignItems: 'center', justifyContent: 'center',
                                    borderWidth: 1, borderColor: done ? 'rgba(127,217,154,0.4)' : 'rgba(255,255,255,0.08)',
                                  }}>
                                    <Text style={{ fontSize: 13, opacity: done ? 1 : 0.3 }}>{m.emoji}</Text>
                                  </View>
                                  <Text style={{ color: done ? 'rgba(127,217,154,0.8)' : 'rgba(255,255,255,0.2)', fontSize: 8.5, fontWeight: '700', textAlign: 'center' }}>
                                    {m.label}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        </LinearGradient>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* ── Comment fonctionne le système ───────────────────── */}
              <LinearGradient
                colors={['rgba(13,13,26,0.9)', 'rgba(75,0,130,0.2)']}
                style={{ borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(135,206,235,0.12)', gap: 14 }}
              >
                <Text style={{ color: '#87CEEB', fontSize: bodySize, fontWeight: '800', letterSpacing: 2 }}>
                  ✦ COMMENT FONCTIONNE LA CONSTELLATION ?
                </Text>
                {[
                  { icon: '🌌', text: 'Partagez votre lien ou code — chaque ami qui s\'inscrit devient une étoile dans votre constellation' },
                  { icon: '🎯', text: 'Ils accomplissent 4 missions : s\'inscrire, compléter leur profil, envoyer un message, recevoir une réponse' },
                  { icon: '⚡', text: 'Chaque mission accomplie fait progresser votre jauge vers le palier suivant' },
                  { icon: '🏆', text: 'Atteignez les paliers pour débloquer Aura, Titre cosmique, Énergie d\'attraction et Séance oraculaire' },
                  { icon: '🎁', text: 'Votre filleul reçoit aussi un badge d\'arrivée exclusif — un incentive fort pour rejoindre' },
                ].map((item, idx) => (
                  // @ts-ignore
                  <View key={idx} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: bodySize, lineHeight: bodySize * 1.55, flex: 1 }}>{item.text}</Text>
                  </View>
                ))}
              </LinearGradient>

              {/* ── CTA si 0 filleuls ────────────────────────────────── */}
              {filleulsSorted.length === 0 && (
                <Pressable onPress={handleShare}>
                  <LinearGradient
                    colors={['rgba(192,132,252,0.3)', 'rgba(75,0,130,0.4)']}
                    style={{ borderRadius: 20, padding: 22, borderWidth: 1.5, borderColor: 'rgba(192,132,252,0.45)', alignItems: 'center', gap: 10 }}
                  >
                    <Text style={{ fontSize: 36 }}>🌌</Text>
                    <Text style={{ color: '#C084FC', fontSize: h3Size, fontWeight: '900', textAlign: 'center' }}>
                      Lancez votre constellation
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: bodySize, textAlign: 'center', maxWidth: 260, lineHeight: bodySize * 1.55 }}>
                      Invitez votre première âme et regardez votre galaxie personnelle grandir
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, backgroundColor: 'rgba(192,132,252,0.15)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
                      <Share2 size={16} color="#C084FC" />
                      <Text style={{ color: '#C084FC', fontWeight: '900', fontSize: bodySize }}>Partager maintenant</Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>
      </CosmicBackground>
    </View>
  );
}

