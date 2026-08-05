// Aevyra – Carte de Compatibilité Cosmique Partageable
// Accessible depuis le profil public : router.push(`/(app)/compat-share/${userId}`)
// Affiche la résonance entre le visiteur et un autre profil avec tous les détails astro
// Bouton "Partager" (Share natif) + "Copier le lien"
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, Text, View,
} from 'react-native';
import { shareContent, copyToClipboard } from '@/lib/share-utils';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, router, type RelativePathString } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Share2, Copy, Check, Sparkles } from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import {
  getMyProfile,
  getPublicProfile,
  computeCompatibiliteDetail,
  type Profile,
  type CompatibiliteDetail,
} from '@/lib/amour-api';
import { SIGNES_ASTRO, getCouleurSigne } from '@/lib/amour-theme';
import { useResponsive } from '@/hooks/useResponsive';

// ── Barre de score animée ─────────────────────────────────
function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>{label}</Text>
        <Text style={{ color, fontSize: 11, fontWeight: '800' }}>{value}%</Text>
      </View>
      <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
        <View style={{ width: `${value}%` as `${number}%`, height: 4, borderRadius: 2, backgroundColor: color }} />
      </View>
    </View>
  );
}

// ── Mini avatar avec couronne de signe ───────────────────
function AvatarSigne({ profile, size = 72 }: { profile: Profile; size?: number }) {
  const couleur = getCouleurSigne(profile.signe_astro);
  const signeInfo = SIGNES_ASTRO[profile.signe_astro];
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ position: 'relative' }}>
        {profile.photo_url ? (
          <Image
            source={{ uri: profile.photo_url }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            contentFit="cover"
          />
        ) : (
          <LinearGradient
            colors={[couleur, '#1A0040']}
            style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: size * 0.38 }}>{signeInfo?.emoji ?? '🌟'}</Text>
          </LinearGradient>
        )}
        {/* Halo de couleur signe */}
        <View style={{
          position: 'absolute', inset: -3,
          borderRadius: (size / 2) + 3,
          borderWidth: 2, borderColor: `${couleur}80`,
        }} />
        {/* Badge signe en bas à droite */}
        <View style={{
          position: 'absolute', bottom: -2, right: -2,
          width: 22, height: 22, borderRadius: 11,
          backgroundColor: '#0D0D1A', borderWidth: 1.5, borderColor: couleur,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 11 }}>{signeInfo?.emoji ?? '⭐'}</Text>
        </View>
      </View>
      <Text style={{ color: '#F5E6C8', fontSize: 13, fontWeight: '800' }}>
        {profile.prenom}{profile.age ? `, ${profile.age}` : ''}
      </Text>
      <Text style={{ color: getCouleurSigne(profile.signe_astro), fontSize: 11, fontWeight: '700' }}>
        {profile.signe_astro}
      </Text>
    </View>
  );
}

// ── Libellé humain du score total ────────────────────────
function getLibelleScore(score: number): { label: string; emoji: string; desc: string } {
  if (score >= 90) return { label: 'Âmes Jumelles',      emoji: '💫', desc: 'Une connexion d\'une rare profondeur. Le cosmos vous a prédestinés.' };
  if (score >= 80) return { label: 'Résonance Profonde', emoji: '✨', desc: 'Une harmonie naturelle qui transcende les explications rationnelles.' };
  if (score >= 70) return { label: 'Alchimie Stellaire', emoji: '⭐', desc: 'Des énergies complémentaires qui créent quelque chose de grand ensemble.' };
  if (score >= 60) return { label: 'Attraction Cosmique', emoji: '🌟', desc: 'Une attraction réelle avec un beau potentiel à explorer.' };
  if (score >= 50) return { label: 'Curiosité Mutuelle', emoji: '🌙', desc: 'Des différences intéressantes qui peuvent devenir une force.' };
  return         { label: 'Contraste Magnétique', emoji: '🔮', desc: 'Vos différences sont aussi une source d\'apprentissage mutuel.' };
}

export default function CompatSharePage() {
  const insets = useSafeAreaInsets();
  const { px } = useResponsive();
  const { contentMaxWidth, isDesktop, isTablet, isTV } = useResponsive();
  const isWide = isDesktop || isTablet || isTV;
  const { id } = useLocalSearchParams<{ id: string }>();

  const [myProfile,    setMyProfile]    = useState<Profile | null>(null);
  const [theirProfile, setTheirProfile] = useState<Profile | null>(null);
  const [detail,       setDetail]       = useState<CompatibiliteDetail | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [sharing,      setSharing]      = useState(false);
  const [copied,       setCopied]       = useState(false);

  useFocusEffect(useCallback(() => {
    if (!id) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [me, them] = await Promise.all([getMyProfile(), getPublicProfile(id)]);
      if (!active) return;
      setMyProfile(me);
      setTheirProfile(them);
      if (me && them) setDetail(computeCompatibiliteDetail(me, them));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]));

  const score    = detail?.total ?? 0;
  const libelle  = getLibelleScore(score);
  const shareUrl = `https://aevyra.uk/profil/${id}`;

  // Couleur dégradée selon le score
  const scoreColor =
    score >= 85 ? '#FFD700' :
    score >= 70 ? '#C084FC' :
    score >= 55 ? '#87CEEB' : '#FF69B4';

  const handleShare = async () => {
    if (!myProfile || !theirProfile) return;
    setSharing(true);
    await shareContent({
      message:
        `✨ Compatibilité Aevyra ✨\n\n` +
        `${myProfile.prenom} ${SIGNES_ASTRO[myProfile.signe_astro]?.emoji ?? '🌟'} × ` +
        `${theirProfile.prenom} ${SIGNES_ASTRO[theirProfile.signe_astro]?.emoji ?? '🌟'}\n\n` +
        `${libelle.emoji} ${libelle.label} — ${score}% de résonance cosmique\n\n` +
        `${libelle.desc}\n\n` +
        `👉 Découvrir : ${shareUrl}\n🌙 aevyra.uk`,
      url:   shareUrl,
      title: `${myProfile.prenom} × ${theirProfile.prenom} — Compatibilité Aevyra`,
    });
    setSharing(false);
  };

  const handleCopy = async () => {
    const { success } = await copyToClipboard(
      `${myProfile?.prenom ?? '?'} × ${theirProfile?.prenom ?? '?'} — ${score}% de résonance cosmique ✨ ${shareUrl}`
    );
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0D1A' }}>
      <CosmicBackground>
        {/* En-tête */}
        <View style={{
          paddingTop: insets.top + 12, paddingHorizontal: px,
          paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
        }}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={20} color="#C084FC" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#C084FC', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 }}>
              CARTE DE COMPATIBILITÉ
            </Text>
            <Text style={{ color: 'rgba(255,182,193,0.5)', fontSize: 10, fontWeight: '600', letterSpacing: 2, marginTop: 1 }}>
              RÉSONANCE COSMIQUE
            </Text>
          </View>
          <Sparkles size={18} color="rgba(255,215,0,0.6)" />
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <ActivityIndicator size="large" color="#C084FC" />
            <Text style={{ color: 'rgba(192,132,252,0.6)', fontSize: 13, fontStyle: 'italic' }}>
              Calcul de la résonance en cours…
            </Text>
          </View>
        ) : !myProfile || !theirProfile ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: px }}>
            <Text style={{ fontSize: 48 }}>🌌</Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, textAlign: 'center' }}>
              Ce profil n'est plus disponible.
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={{ backgroundColor: 'rgba(192,132,252,0.15)', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10,
                borderWidth: 1, borderColor: 'rgba(192,132,252,0.3)'
              }}
            >
              <Text style={{ color: '#C084FC', fontWeight: '700' }}>Retour</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: px, paddingBottom: insets.bottom + 32, gap: 18,
              maxWidth: isWide ? contentMaxWidth : undefined,
              alignSelf: isWide ? 'center' as const : undefined,
              width: isWide ? '100%' : undefined,
            }}
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
            bounces={false}
            contentInsetAdjustmentBehavior="automatic"
          >
            {/* ── Carte principale : 2 avatars + score central ── */}
            <LinearGradient
              colors={['rgba(75,0,130,0.55)', 'rgba(13,13,26,0.9)']}
              style={{ borderRadius: 28, padding: 24, borderWidth: 1.5, borderColor: `${scoreColor}50`, gap: 20 }}
            >
              {/* Avatars côte à côte avec × central */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
                <AvatarSigne profile={myProfile} size={80} />
                {/* Score central */}
                <View style={{ alignItems: 'center', marginHorizontal: 16, gap: 4 }}>
                  <View style={{
                    width: 64, height: 64, borderRadius: 32,
                    backgroundColor: `${scoreColor}18`,
                    borderWidth: 2, borderColor: `${scoreColor}60`,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ color: scoreColor, fontSize: 20, fontWeight: '900' }}>{score}</Text>
                    <Text style={{ color: `${scoreColor}80`, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>%</Text>
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 18 }}>×</Text>
                </View>
                <AvatarSigne profile={theirProfile} size={80} />
              </View>

              {/* Libellé + description */}
              <View style={{ alignItems: 'center', gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 22 }}>{libelle.emoji}</Text>
                  <Text style={{ color: scoreColor, fontSize: 18, fontWeight: '900', textAlign: 'center' }}>
                    {libelle.label}
                  </Text>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: 280 }}>
                  {libelle.desc}
                </Text>
              </View>

              {/* Éléments des 2 signes */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[myProfile, theirProfile].map((p, i) => {
                  const c = getCouleurSigne(p.signe_astro);
                  const si = SIGNES_ASTRO[p.signe_astro];
                  return (
                    <React.Fragment key={i}><View style={{ flex: 1, alignItems: 'center', gap: 4,
                      backgroundColor: `${c}10`, borderRadius: 14, padding: 12,
                      borderWidth: 1, borderColor: `${c}30`
                    }}>
                      <Text style={{ color: c, fontSize: 11, fontWeight: '800' }}>
                        {si?.element ?? '—'}
                      </Text>
                      {p.ascendant ? (
                        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10 }}>
                          ⬆️ {p.ascendant}
                        </Text>
                      ) : null}
                      {p.energie_romantique ? (
                        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, textAlign: 'center' }} numberOfLines={2}>
                          {p.energie_romantique}
                        </Text>
                      ) : null}
                    </View>
                    </React.Fragment>
                  );
                })}
              </View>
            </LinearGradient>

            {/* ── Détail des 5 dimensions ── */}
            {detail && (
              <LinearGradient
                colors={['rgba(13,13,26,0.95)', 'rgba(75,0,130,0.2)']}
                style={{ borderRadius: 22, padding: 20, borderWidth: 1, borderColor: 'rgba(192,132,252,0.2)', gap: 16 }}
              >
                <Text style={{ color: 'rgba(192,132,252,0.5)', fontSize: 11, fontWeight: '800', letterSpacing: 2.5 }}>
                  🔬 ANALYSE DÉTAILLÉE DES 5 DIMENSIONS
                </Text>
                <ScoreBar label="Résonance Astrale"   value={detail.resonanceAstrale}  color="#FFD700" />
                <ScoreBar label="Alchimie d'Énergie"  value={detail.alchimieEnergie}   color="#C084FC" />
                <ScoreBar label="Accord des Âmes"     value={detail.accordDesAmes}     color="#87CEEB" />
                <ScoreBar label="Harmonie Désirée"    value={detail.harmonieDesirée}   color="#FF69B4" />
                <ScoreBar label="Synchronicité de Vie" value={detail.synchroniciteVie} color="#7FD99A" />
              </LinearGradient>
            )}

            {/* ── Boutons partage ── */}
            <View style={{ gap: 12 }}>
              <Pressable
                onPress={handleShare}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                  backgroundColor: 'rgba(192,132,252,0.15)', borderRadius: 16, paddingVertical: 16,
                  borderWidth: 1, borderColor: 'rgba(192,132,252,0.4)',
                  opacity: sharing ? 0.7 : 1,
                }}
              >
                {sharing
                  ? <ActivityIndicator size="small" color="#C084FC" />
                  : <Share2 size={18} color="#C084FC" />}
                <Text style={{ color: '#C084FC', fontWeight: '800', fontSize: 15 }}>
                  {sharing ? 'Préparation…' : 'Partager cette compatibilité'}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleCopy}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                  backgroundColor: copied ? 'rgba(127,217,154,0.10)' : 'rgba(255,215,0,0.07)',
                  borderRadius: 16, paddingVertical: 14,
                  borderWidth: 1, borderColor: copied ? 'rgba(127,217,154,0.4)' : 'rgba(255,215,0,0.2)',
                }}
              >
                {copied ? <Check size={16} color="#7FD99A" /> : <Copy size={16} color="#FFD700" />}
                <Text style={{ color: copied ? '#7FD99A' : '#FFD700', fontWeight: '700', fontSize: 13 }}>
                  {copied ? 'Lien copié !' : 'Copier le lien de compatibilité'}
                </Text>
              </Pressable>

              {/* Voir le profil complet */}
              <Pressable
                onPress={() => router.push(`/(app)/profile/${id}` as RelativePathString)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                  borderRadius: 16, paddingVertical: 13,
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontWeight: '600', fontSize: 13 }}>
                  Voir le profil complet de {theirProfile.prenom}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 16 }}>›</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </CosmicBackground>
    </View>
  );
}
