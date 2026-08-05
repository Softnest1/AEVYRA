// Aevyra – Carte Astrale Partageable (Vague 1)
// Génère une image cosmique partageable : prénom, signe, énergie, compatibilités
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, Text, View,
} from 'react-native';
import { shareContent, copyToClipboard } from '@/lib/share-utils';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Share2, Download, Sparkles } from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import { AvatarFrame } from '@/components/AvatarFrame';
import { Image } from 'expo-image';
import { getMyProfile, type Profile } from '@/lib/amour-api';
import { SIGNES_ASTRO, getEmpreinteCouleur, getCouleurSigne } from '@/lib/amour-theme';
import { useResponsive } from '@/hooks/useResponsive';

// Compatibilités astrales simplifiées (5 meilleurs signes par signe)
const COMPAT: Record<string, string[]> = {
  'Bélier':     ['Lion', 'Sagittaire', 'Gémeaux', 'Verseau', 'Balance'],
  'Taureau':    ['Vierge', 'Capricorne', 'Cancer', 'Poissons', 'Scorpion'],
  'Gémeaux':    ['Balance', 'Verseau', 'Bélier', 'Lion', 'Sagittaire'],
  'Cancer':     ['Scorpion', 'Poissons', 'Taureau', 'Vierge', 'Capricorne'],
  'Lion':       ['Bélier', 'Sagittaire', 'Gémeaux', 'Balance', 'Verseau'],
  'Vierge':     ['Taureau', 'Capricorne', 'Cancer', 'Scorpion', 'Poissons'],
  'Balance':    ['Gémeaux', 'Verseau', 'Lion', 'Sagittaire', 'Bélier'],
  'Scorpion':   ['Cancer', 'Poissons', 'Vierge', 'Capricorne', 'Taureau'],
  'Sagittaire': ['Bélier', 'Lion', 'Balance', 'Verseau', 'Gémeaux'],
  'Capricorne': ['Taureau', 'Vierge', 'Scorpion', 'Poissons', 'Cancer'],
  'Verseau':    ['Gémeaux', 'Balance', 'Bélier', 'Sagittaire', 'Lion'],
  'Poissons':   ['Cancer', 'Scorpion', 'Capricorne', 'Taureau', 'Vierge'],
};

export default function CarteAstralePage() { 
  const insets  = useSafeAreaInsets();
  const { px, captionSize, bodySize, h3Size: _h3Size, iconSize: _iconSize, gap: _gap, cardRadius: _cardRadius, tapTarget: _tapTarget  } = useResponsive();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const p = await getMyProfile();
      if (active) { setProfile(p); setLoading(false); }
    })();
    return () => { active = false; };
  }, []));

  const signe     = profile?.signe_astro ?? '';
  const signeInfo = SIGNES_ASTRO[signe];
  // BUG FIX : couleur basée sur le signe, pas sur l'énergie romantique
  const empreinte = profile?.empreinte_couleur
    ? getEmpreinteCouleur(profile.empreinte_couleur)
    : getCouleurSigne(signe);
  const compats   = COMPAT[signe] ?? [];
  const profileUrl = profile?.pseudo
    ? `https://aevyra.uk/profil/${encodeURIComponent(profile.pseudo)}`
    : 'https://aevyra.uk';

  const handleShare = async () => {
    if (!profile) return;
    setSharing(true);
    await shareContent({
      message:
        `✨ Mon Cosmos Aevyra ✨\n\n` +
        `${signeInfo?.emoji ?? '🌟'} ${signe} — ${profile.energie_romantique ?? 'Âme libre'}\n` +
        (profile.ascendant       ? `⬆️ Ascendant ${profile.ascendant}\n`       : '') +
        (profile.planete_dominante ? `🪐 ${profile.planete_dominante}\n`       : '') +
        `\n💫 Compatibilités : ${compats.slice(0, 3).join(', ')}\n` +
        `\n👉 ${profileUrl}\n🌙 aevyra.uk`,
      url:   profileUrl,
      title: `Carte Astrale de ${profile.prenom}`,
    });
    setSharing(false);
  };

  const handleCopyLink = async () => {
    if (!profile) return;
    const { success } = await copyToClipboard(profileUrl);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
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
            <ChevronLeft size={20} color="#FFD700" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFD700', fontSize: 18, fontWeight: '900', letterSpacing: 1 }}>
              MA CARTE ASTRALE
            </Text>
            <Text style={{ color: 'rgba(255,182,193,0.6)', fontSize: captionSize, fontWeight: '600', letterSpacing: 1.5, marginTop: 1 }}>
              PARTAGE TON COSMOS · ATTIRE LES ÂMES
            </Text>
          </View>
          <Sparkles size={20} color="rgba(192,132,252,0.7)" />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: px, paddingBottom: insets.bottom + 32, gap: 20 }}
          showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          {loading ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
              <ActivityIndicator size="large" color="#C084FC" />
            </View>
          ) : !profile ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>Profil introuvable</Text>
            </View>
          ) : (
            <>
              {/* ── Carte visuelle cosmique ─────────────────────── */}
              <LinearGradient
                colors={[`${empreinte}25`, 'rgba(75,0,130,0.55)', 'rgba(13,13,26,0.9)']}
                style={{
                  borderRadius: 28, padding: 28,
                  borderWidth: 1.5, borderColor: `${empreinte}40`,
                  gap: 20, alignItems: 'center',
                }}
              >
                {/* Avatar */}
                <View style={{ alignItems: 'center', gap: 12 }}>
                  <AvatarFrame cadreId={profile.cadre_id} size={100}>
                    {profile.photo_url ? (
                      <Image
                        source={{ uri: profile.photo_url }}
                        style={{ width: 100, height: 100, borderRadius: 50 }}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: `${empreinte}30`, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 40 }}>{signeInfo?.emoji ?? '🌟'}</Text>
                      </View>
                    )}
                  </AvatarFrame>
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: '#FFD700', fontSize: 24, fontWeight: '900', letterSpacing: 1 }}>
                      {profile.prenom}
                    </Text>
                    {profile.is_verified && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(127,217,154,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                        <Text style={{ fontSize: 12 }}>💚</Text>
                        <Text style={{ color: '#7FD99A', fontSize: captionSize, fontWeight: '800', letterSpacing: 1 }}>VÉRIFIÉ</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Signe + énergie */}
                <View style={{ alignItems: 'center', gap: 8, width: '100%' }}>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    backgroundColor: `${empreinte}15`, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 10,
                    borderWidth: 1, borderColor: `${empreinte}30`,
                  }}>
                    <Text style={{ fontSize: 28 }}>{signeInfo?.emoji ?? '⭐'}</Text>
                    <View>
                      <Text style={{ color: empreinte, fontSize: 18, fontWeight: '900' }}>{signe}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize }}>{signeInfo?.element ?? ''}</Text>
                    </View>
                  </View>

                  {/* Énergie romantique */}
                  {profile.energie_romantique && (
                    <Text style={{ color: 'rgba(255,182,193,0.8)', fontSize: bodySize, fontStyle: 'italic', fontWeight: '600' }}>
                      ✦ {profile.energie_romantique}
                    </Text>
                  )}
                </View>

                {/* Astrologie avancée */}
                  {(profile.ascendant || profile.planete_dominante || profile.element_astrologique || signeInfo?.element) && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                    {signeInfo?.element && (
                      <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(135,206,235,0.08)', borderWidth: 1, borderColor: 'rgba(135,206,235,0.2)', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 12 }}>🌊</Text>
                        <Text style={{ color: 'rgba(135,206,235,0.8)', fontSize: captionSize, fontWeight: '700' }}>Élément {signeInfo.element}</Text>
                      </View>
                    )}
                    {profile.ascendant && (
                      <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,182,193,0.08)', borderWidth: 1, borderColor: 'rgba(255,182,193,0.2)', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 12 }}>⬆️</Text>
                        <Text style={{ color: 'rgba(255,182,193,0.8)', fontSize: captionSize, fontWeight: '700' }}>Asc. {profile.ascendant}</Text>
                      </View>
                    )}
                    {profile.planete_dominante && (
                      <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(192,132,252,0.08)', borderWidth: 1, borderColor: 'rgba(192,132,252,0.2)', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 12 }}>🪐</Text>
                        <Text style={{ color: 'rgba(192,132,252,0.8)', fontSize: captionSize, fontWeight: '700' }}>{profile.planete_dominante}</Text>
                      </View>
                    )}
                    {profile.element_astrologique && !signeInfo?.element && (
                      <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(135,206,235,0.08)', borderWidth: 1, borderColor: 'rgba(135,206,235,0.2)', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 12 }}>🌊</Text>
                        <Text style={{ color: 'rgba(135,206,235,0.8)', fontSize: captionSize, fontWeight: '700' }}>{profile.element_astrologique}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Top 3 compatibilités */}
                {compats.length > 0 && (
                  <View style={{ width: '100%', gap: 8 }}>
                    <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: captionSize, fontWeight: '800', letterSpacing: 2.5, textAlign: 'center' }}>
                      💫 MEILLEURES COMPATIBILITÉS
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
                      {compats.slice(0, 3).map((s, i) => (
                        // @ts-ignore
                        <View key={s} style={{ alignItems: 'center', gap: 4 }}>
                          <View style={{
                            width: 44, height: 44, borderRadius: 22,
                            backgroundColor: `${empreinte}18`,
                            borderWidth: i === 0 ? 1.5 : 1,
                            borderColor: i === 0 ? empreinte : `${empreinte}40`,
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Text style={{ fontSize: 20 }}>{SIGNES_ASTRO[s]?.emoji ?? '⭐'}</Text>
                          </View>
                          <Text style={{ color: i === 0 ? empreinte : 'rgba(255,255,255,0.45)', fontSize: captionSize, fontWeight: '700' }}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Watermark Aevyra */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.5 }}>
                  <Text style={{ fontSize: 12 }}>🌌</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize, fontWeight: '800', letterSpacing: 2 }}>AEVYRA.UK</Text>
                </View>
              </LinearGradient>

              {/* ── Boutons de partage ──────────────────────────── */}
              <View style={{ gap: 12 }}>
                <Pressable
                  onPress={handleShare}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                    backgroundColor: 'rgba(192,132,252,0.15)', borderRadius: 16, paddingVertical: 16,
                    borderWidth: 1, borderColor: 'rgba(192,132,252,0.35)',
                    opacity: sharing ? 0.7 : 1,
                  }}
                >
                  {sharing
                    ? <ActivityIndicator size="small" color="#C084FC" />
                    : <Share2 size={18} color="#C084FC" />}
                  <Text style={{ color: '#C084FC', fontWeight: '800', fontSize: 15 }}>
                    {sharing ? 'Préparation…' : 'Partager mon Cosmos'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleCopyLink}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                    backgroundColor: copiedLink ? 'rgba(127,217,154,0.12)' : 'rgba(255,215,0,0.08)',
                    borderRadius: 16, paddingVertical: 14,
                    borderWidth: 1, borderColor: copiedLink ? 'rgba(127,217,154,0.4)' : 'rgba(255,215,0,0.2)',
                  }}
                >
                  <Download size={16} color={copiedLink ? '#7FD99A' : '#FFD700'} />
                  <Text style={{ color: copiedLink ? '#7FD99A' : '#FFD700', fontWeight: '700', fontSize: bodySize }}>
                    {copiedLink ? 'Lien copié !' : 'Copier le lien de profil'}
                  </Text>
                </Pressable>
              </View>

              {/* Conseil */}
              <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 6 }}>
                <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: captionSize, fontWeight: '800', letterSpacing: 2 }}>
                  💡 ASTUCE
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: bodySize, lineHeight: bodySize * 1.55 }}>
                  Partagez votre carte astrale en story Instagram ou WhatsApp pour attirer les âmes compatibles. Plus de partages = plus de connexions cosmiques !
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </CosmicBackground>
    </View>
  );
}
