// Aevyra – Mon Âme : page profil personnelle (v311 — renforcement complet)
import React, { useCallback, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, router, type RelativePathString } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Settings, Bell, Bookmark, BookmarkCheck,
  Pencil, Camera, Music, Moon, Sun, Star, Zap, MapPin,
  Award, Gift, Sparkles,
} from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import { AvatarFrame } from '@/components/AvatarFrame';
import {
  getMyProfile,
  getReceivedLikes,
  getMyFavoris,
  getProfilStats,
  getUserBadges,
  toggleFavori,
  computeCompatibilite,
  signOutComplet,
  type Profile,
  type ReceivedLike,
  type Favori,
  type ProfilStats,
  type UserBadge,
} from '@/lib/amour-api';
import { SIGNES_ASTRO } from '@/lib/amour-theme';
import { supabase as _supabase } from '@/client/supabase';
import { useResponsive } from '@/hooks/useResponsive';
import { usePillBottomPad } from '@/hooks/usePillBottomPad';
import * as Haptics from 'expo-haptics';

// ── Labels poétiques genre & cherche ────────────────────────
const GENRE_LABELS: Record<string, { emoji: string; label: string; sub: string; color: string }> = {
  femme:  { emoji: '🌹', label: 'Lune de Rose',         sub: 'Femme',       color: '#FF85A2' },
  homme:  { emoji: '🌌', label: 'Étoile d\'Obsidienne', sub: 'Homme',       color: '#6EC6FF' },
  autre:  { emoji: '✨', label: 'Âme Libre',             sub: 'Non-binaire', color: '#C77DFF' },
};
const CHERCHE_LABELS: Record<string, string> = {
  femme:    '🌹 Lune de Rose · Femme',
  homme:    '🌌 Étoile d\'Obsidienne · Homme',
  les_deux: '💫 Dualité Cosmique',
  une_ame:  '🕊️ Âme Miroir',
};
const ACTION_EMOJIS: Record<string, string> = {
  rose: '🌹', etoile: '⭐', coeur: '💎', plume: '🪶', flamme: '🔥',
};
const ENERGIE_ICON: Record<string, React.ReactNode> = {
  'Soleil ardent':     <Sun  size={12} color="#FFD700" />,
  'Lune mystérieuse':  <Moon size={12} color="#C0C0FF" />,
  'Étoile libre':      <Star size={12} color="#87CEEB" />,
  'Comète passionnée': <Zap  size={12} color="#FF4500" />,
};

// ── Mini carte profil ─────────────────────────────────────────
function MiniCard({
  p, extraInfo, profileId, isFav, onToggleFav, myProfile,
}: {
  key?: React.Key;
  p: Profile; extraInfo?: string; profileId: string;
  isFav: boolean; onToggleFav: (id: string) => void; myProfile: Profile | null;
}) {
  const compat = myProfile ? computeCompatibilite(myProfile, p) : 0;
  const compatColor = compat >= 80 ? '#FFD700' : compat >= 65 ? '#FF85A2' : '#87CEEB';
  const signeEmoji = p.signe_astro ? (SIGNES_ASTRO[p.signe_astro]?.emoji ?? '🌟') : '🌟';
  return (
    <Pressable
      onPress={() => router.push(`/(app)/profile/${p.id}` as RelativePathString)}
      style={{ marginBottom: 8 }}
    >
      <View style={{
        borderRadius: 18, padding: 12,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1, borderColor: 'rgba(255,215,0,0.1)',
      }}>
        {/* Avatar */}
        {p.photo_url ? (
          <Image
            source={{ uri: p.photo_url }}
            style={{ width: 52, height: 52, borderRadius: 26 }}
            contentFit="cover" transition={200}
          />
        ) : (
          <LinearGradient
            colors={[p.empreinte_couleur || '#FFD700', '#4B0082']}
            style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 22 }}>{signeEmoji}</Text>
          </LinearGradient>
        )}

        {/* Infos */}
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: '#F5E6C8', fontWeight: '800', fontSize: 15 }}>
            {p.prenom}{p.age ? `, ${p.age}` : ''}
          </Text>
          {p.signe_astro ? (
            <Text style={{ color: 'rgba(255,182,193,0.6)', fontSize: 11 }}>
              {signeEmoji} {p.signe_astro}
            </Text>
          ) : null}
          {/* Barre compatibilité */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <View style={{ width: `${compat}%` as `${number}%`, height: 3, borderRadius: 2, backgroundColor: compatColor }} />
            </View>
            <Text style={{ color: compatColor, fontSize: 10, fontWeight: '800', minWidth: 28 }}>
              {compat}%
            </Text>
          </View>
          {extraInfo ? (
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10 }}>{extraInfo}</Text>
          ) : null}
        </View>

        {/* Favori */}
        <Pressable
          onPress={() => onToggleFav(profileId)}
          style={{ padding: 8 }}
          hitSlop={8}
        >
          {isFav
            ? <BookmarkCheck size={18} color="#FFD700" />
            : <Bookmark size={18} color="rgba(255,215,0,0.25)" />
          }
        </Pressable>
      </View>
    </Pressable>
  );
}

// ══════════════════════════════════════════════════════════════
// Page principale Mon Âme
// ══════════════════════════════════════════════════════════════
export default function MonAme() { 
  const insets = useSafeAreaInsets();
  const pillBottomPad = usePillBottomPad();
  const { px, avatarSize: respAvatar, bodySize: _bodySize, h3Size: _h3Size, captionSize: _captionSize, gap, contentMaxWidth, is4K, isCinema, isFullHD, isLargeDesktop, isDesktop, isTablet, isCar, isLandscapeMobile  } = useResponsive();

  // Avatar adaptatif selon surface (TV 4K → 220px, cinéma → 260px)
  const AVATAR_DYN = isCinema ? 260 : is4K ? 220 : isFullHD ? 160 : isLargeDesktop ? 130 : respAvatar;

  const [profile,       setProfile]       = useState<Profile | null>(null);
  const [receivedLikes, setReceivedLikes] = useState<ReceivedLike[]>([]);
  const [favoris,       setFavoris]       = useState<Favori[]>([]);
  const [stats,         setStats]         = useState<ProfilStats | null>(null);
  const [badges,        setBadges]        = useState<UserBadge[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState<'likes' | 'favoris'>('likes');
  const [favorisSet,    setFavorisSet]    = useState<Set<string>>(new Set());
  const [signingOut,    setSigningOut]    = useState(false); // guard anti-double-clic

  const loadProfil = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [p, likes, favs, st, bg] = await Promise.all([
        getMyProfile(),
        getReceivedLikes(),
        getMyFavoris(),
        getProfilStats(),
        getUserBadges(),
      ]);
      setProfile(p);
      setReceivedLikes(likes);
      setFavoris(favs);
      setStats(st);
      setBadges(bg);
      setFavorisSet(new Set(favs.map((f: Favori) => f.profile_id)));
    } catch (e) {
      console.error('[Profil] Chargement échoué', e);
    } finally {
      // Toujours stopper le spinner — même si showSpinner=false (premier appel au focus)
      setLoading(false);
    }
  }, []);

  // Poll léger 30s — ne recharge que si l'écran est bien au focus (évite les re-renders inutiles en background)
  const isFocusedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      loadProfil(true);
      isFocusedRef.current = true;
      const poll = setInterval(() => {
        if (isFocusedRef.current) loadProfil(false);
      }, 30_000);
      return () => {
        isFocusedRef.current = false;
        clearInterval(poll);
      };
    }, [loadProfil])
  );

  const handleLogout = async () => {
    if (signingOut) return; // guard double-clic
    setSigningOut(true);
    await signOutComplet(); // cache + pushToken + supabase.signOut + localStorage
    // Redirection explicite vers la landing — Stack.Protected ne redirige pas
    // toujours automatiquement sur Web après signOut
    router.replace('/' as RelativePathString);
  };

  const handleToggleFavori = async (profileId: string) => {
    if (process.env.EXPO_OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    try {
      const added = await toggleFavori(profileId);
      setFavorisSet((prev: Set<string>) => {
        const next = new Set(prev);
        if (added) next.add(profileId); else next.delete(profileId);
        return next;
      });
      if (!added) setFavoris((prev: typeof favoris) => prev.filter((f: Favori) => f.profile_id !== profileId));
    } catch (e) {
      console.error('[Profil] toggleFavori échoué', e);
    }
  };

  // ── Loading ─────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D0D1A', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <ActivityIndicator color="#FFD700" size="large" />
        <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: 13, fontStyle: 'italic' }}>
          Chargement de votre âme…
        </Text>
      </View>
    );
  }

  const signeInfo  = profile?.signe_astro ? SIGNES_ASTRO[profile.signe_astro] : null;
  const empreinte  = profile?.empreinte_couleur || '#FFD700';
  const genreInfo  = profile?.genre ? GENRE_LABELS[profile.genre] : null;
  // Avatar adaptatif selon surface d'affichage
  const AVATAR_SIZE = AVATAR_DYN ?? 96;

  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground>
        {/* ── Barre de navigation ──────────────────────────── */}
        <View style={{
          paddingTop: insets.top + 8,
          paddingBottom: 10,
          paddingHorizontal: px,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Contenu centré sur grand écran */}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: contentMaxWidth, alignSelf: 'center' }}>
          <Text style={{ color: '#FFD700', fontSize: isCinema ? 40 : is4K ? 32 : isFullHD ? 26 : isDesktop ? 22 : isTablet ? 21 : isCar ? 16 : 20, fontWeight: '900' }}>✦ Mon Âme</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { route: '/(app)/notifications', color: '#FFD700', icon: <Bell size={isCinema ? 28 : is4K ? 24 : isFullHD ? 20 : 17} color="#FFD700" /> },
              { route: '/(app)/parrainage',    color: '#C084FC', icon: <Gift size={isCinema ? 28 : is4K ? 24 : isFullHD ? 20 : 17} color="#C084FC" /> },
              { route: '/(app)/parametres',    color: '#FFD700', icon: <Settings size={isCinema ? 28 : is4K ? 24 : isFullHD ? 20 : 17} color="#FFD700" /> },
            ].map(({ route, color, icon }) => {
              const btnW = isCinema ? 72 : is4K ? 60 : isFullHD ? 52 : isDesktop ? 48 : 44;
              return (
                <Pressable
                  key={route}
                  onPress={() => router.push(route as RelativePathString)}
                  style={{
                    width: btnW, height: btnW, borderRadius: btnW / 2,
                    backgroundColor: color + '1A',
                    borderWidth: 1, borderColor: color + '33',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                  hitSlop={6}
                >
                  {icon}
                </Pressable>
              );
            })}
          </View>
          </View>
        </View>

        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={{
            paddingBottom: pillBottomPad,
            paddingHorizontal: px,
            gap: gap,
            // Paysage mobile : 2 colonnes (carte identité | stats + favoris)
            flexDirection: isLandscapeMobile ? 'row' : 'column',
            alignItems: isLandscapeMobile ? 'flex-start' : undefined,
          }}
        >
          {/* Wrapper centrant pour grands écrans */}
          <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', gap: gap }}>
          {/* ── Carte identité ─────────────────────────────── */}
          <LinearGradient
            colors={['rgba(114,47,55,0.5)', 'rgba(75,0,130,0.45)', 'rgba(13,13,26,0.7)']}
            style={{
              borderRadius: 24, padding: 22,
              borderWidth: 1, borderColor: empreinte + '30',
              alignItems: 'center', gap: 10,
            }}
          >
            {/* Avatar + badge vérifié + bouton photo */}
            <View style={{ position: 'relative', marginBottom: 4 }}>
              <AvatarFrame cadreId={profile?.cadre_id} size={AVATAR_SIZE}>
                {profile?.photo_url ? (
                  <Image
                    source={{ uri: profile.photo_url }}
                    style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }}
                    contentFit="cover" transition={200}
                  />
                ) : (
                  <View style={{
                    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                  }}>
                    <Text style={{ fontSize: 42 }}>{signeInfo?.emoji ?? '🌟'}</Text>
                  </View>
                )}
              </AvatarFrame>

              {/* Badge Cœur Vérifié */}
              {profile?.is_verified && (
                <View style={{
                  position: 'absolute', bottom: 0, right: -2,
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: '#00C896',
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 2, borderColor: '#0D0D1A',
                }}>
                  <Text style={{ fontSize: 13 }}>💚</Text>
                </View>
              )}

              {/* Bouton photo */}
              <Pressable
                onPress={() => router.push('/(app)/edit-profil' as RelativePathString)}
                style={{
                  position: 'absolute', bottom: 0, left: -2,
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: '#FFD700',
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 2, borderColor: '#0D0D1A',
                }}
                hitSlop={4}
              >
                <Camera size={13} color="#0D0D1A" />
              </Pressable>
            </View>

            {/* Nom + âge */}
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Text style={{ color: '#FFD700', fontSize: 26, fontWeight: '900', letterSpacing: 0.3 }}>
                {profile?.prenom || 'Votre Âme'}
                {profile?.age ? (
                  <Text style={{ fontSize: 17, fontWeight: '400', color: 'rgba(255,215,0,0.75)' }}>
                    {', '}{profile.age}
                  </Text>
                ) : null}
              </Text>
              {profile?.pseudo ? (
                <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: 12 }}>@{profile.pseudo}</Text>
              ) : null}
              {/* Ville */}
              {profile?.ville ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <MapPin size={11} color="rgba(255,215,0,0.45)" />
                  <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: 12 }}>{profile.ville}</Text>
                </View>
              ) : null}
            </View>

            {/* Badge réhabilité */}
            {profile?.has_badge_rehabilite && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
                backgroundColor: 'rgba(72,187,120,0.12)',
                borderWidth: 1, borderColor: 'rgba(72,187,120,0.35)',
              }}>
                <Award size={13} color="#48BB78" />
                <Text style={{ color: '#48BB78', fontSize: 11, fontWeight: '700' }}>Âme Réhabilitée ✦</Text>
              </View>
            )}

            {/* Boutons d'action — Modifier + Carte astrale */}
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Pressable
                onPress={() => router.push('/(app)/edit-profil' as RelativePathString)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 18, paddingVertical: 8,
                  borderRadius: 14,
                  backgroundColor: 'rgba(255,215,0,0.08)',
                  borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)',
                }}
              >
                <Pencil size={12} color="#FFD700" />
                <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '700' }}>Modifier mon profil</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/(app)/carte-astrale-share' as RelativePathString)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 18, paddingVertical: 8,
                  borderRadius: 14,
                  backgroundColor: 'rgba(192,132,252,0.1)',
                  borderWidth: 1, borderColor: 'rgba(192,132,252,0.3)',
                }}
              >
                <Sparkles size={12} color="#C084FC" />
                <Text style={{ color: '#C084FC', fontSize: 13, fontWeight: '700' }}>Mon Cosmos</Text>
              </Pressable>
            </View>

            {/* Badges genre + cherche */}
            {(genreInfo || profile?.cherche) ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {genreInfo ? (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                    backgroundColor: genreInfo.color + '15',
                    borderWidth: 1, borderColor: genreInfo.color + '45',
                  }}>
                    <Text style={{ fontSize: 13 }}>{genreInfo.emoji}</Text>
                    <View>
                      <Text style={{ color: genreInfo.color, fontSize: 11, fontWeight: '700', lineHeight: 14 }}>
                        {genreInfo.label}
                      </Text>
                      <Text style={{ color: genreInfo.color + '80', fontSize: 10, lineHeight: 13 }}>
                        {genreInfo.sub}
                      </Text>
                    </View>
                  </View>
                ) : null}
                {profile?.cherche && CHERCHE_LABELS[profile.cherche] ? (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                  }}>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10 }}>cherche</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' }}>
                      {CHERCHE_LABELS[profile.cherche]}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Signe astro + énergie */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {signeInfo ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 14 }}>{signeInfo.emoji}</Text>
                  <Text style={{ color: 'rgba(255,182,193,0.8)', fontSize: 12, fontWeight: '600' }}>
                    {profile?.signe_astro}
                  </Text>
                </View>
              ) : null}
              {signeInfo && profile?.energie_romantique ? (
                <Text style={{ color: 'rgba(255,255,255,0.65)' }}>·</Text>
              ) : null}
              {profile?.energie_romantique ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {ENERGIE_ICON[profile.energie_romantique] ?? null}
                  <Text style={{ color: empreinte, fontSize: 11, fontWeight: '600' }}>
                    {profile.energie_romantique}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Bio */}
            {profile?.bio ? (
              <Text style={{
                color: 'rgba(255,255,255,0.65)', textAlign: 'center',
                fontStyle: 'italic', fontSize: 13, lineHeight: 20,
                paddingHorizontal: 6,
              }}>
                "{profile.bio.replace(/\\n/g, '\n')}"
              </Text>
            ) : null}

            {/* Chanson de vie */}
            {profile?.chanson_vie ? (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 7,
                paddingHorizontal: 14, paddingVertical: 7,
                borderRadius: 14, backgroundColor: 'rgba(255,182,193,0.07)',
                borderWidth: 1, borderColor: 'rgba(255,182,193,0.18)',
              }}>
                <Music size={13} color="#FFB6C1" />
                <Text style={{ color: 'rgba(255,182,193,0.8)', fontSize: 12, fontWeight: '600' }}>
                  {profile.chanson_vie}
                </Text>
              </View>
            ) : null}
          </LinearGradient>

          {/* ── Stats cosmos ──────────────────────────────────── */}
          <LinearGradient
            colors={['rgba(75,0,130,0.28)', 'rgba(13,13,26,0.45)']}
            style={{ borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(255,215,0,0.1)' }}
          >
            <Text style={{
              color: 'rgba(255,215,0,0.75)', fontSize: 11, fontWeight: '800',
              letterSpacing: 2.5, textAlign: 'center', marginBottom: 14,
            }}>
              ✦ VOTRE COSMOS
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              {([
                { emoji: '⭐', value: stats?.likesSent,      label: 'Envoyés',  color: '#FFD700' },
                { emoji: '💌', value: stats?.likesReceived,  label: 'Reçus',    color: '#FF85A2' },
                { emoji: '💫', value: stats?.matchesCount,   label: 'Matches',  color: '#C084FC' },
                { emoji: '🔖', value: stats?.favorisCount,   label: 'Favoris',  color: '#87CEEB' },
              ] as const).map(({ emoji, value, label, color }) => (
                <React.Fragment key={label}>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <View style={{
                    width: 44, height: 44, borderRadius: 14,
                    backgroundColor: color + '15',
                    borderWidth: 1, borderColor: color + '35',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 20 }}>{emoji}</Text>
                  </View>
                  <Text style={{ color, fontWeight: '900', fontSize: 18 }}>
                    {value ?? '—'}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10 }}>{label}</Text>
                </View>
                </React.Fragment>
              ))}
            </View>
          </LinearGradient>

          {/* ── Astrologie avancée ────────────────────────────── */}
          {(profile?.ascendant || profile?.planete_dominante || profile?.element_astrologique) ? (
            <LinearGradient
              colors={['rgba(75,0,130,0.3)', 'rgba(13,13,26,0.5)']}
              style={{ borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(255,182,193,0.15)', gap: 12 }}
            >
              <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: 11, fontWeight: '800', letterSpacing: 2.5, textAlign: 'center' }}>
                ✦ CARTE ASTRALE
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {profile?.ascendant ? (
                  <View style={{
                    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20,
                    backgroundColor: 'rgba(255,182,193,0.08)',
                    borderWidth: 1, borderColor: 'rgba(255,182,193,0.25)',
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                  }}>
                    <Text style={{ fontSize: 12 }}>⬆️</Text>
                    <View>
                      <Text style={{ color: 'rgba(255,182,193,0.5)', fontSize: 11, fontWeight: '800' }}>ASCENDANT</Text>
                      <Text style={{ color: 'rgba(255,182,193,0.9)', fontSize: 12, fontWeight: '700' }}>{profile.ascendant}</Text>
                    </View>
                  </View>
                ) : null}
                {profile?.planete_dominante ? (
                  <View style={{
                    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20,
                    backgroundColor: 'rgba(192,132,252,0.08)',
                    borderWidth: 1, borderColor: 'rgba(192,132,252,0.25)',
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                  }}>
                    <Text style={{ fontSize: 12 }}>🪐</Text>
                    <View>
                      <Text style={{ color: 'rgba(192,132,252,0.5)', fontSize: 11, fontWeight: '800' }}>PLANÈTE</Text>
                      <Text style={{ color: 'rgba(192,132,252,0.9)', fontSize: 12, fontWeight: '700' }}>{profile.planete_dominante}</Text>
                    </View>
                  </View>
                ) : null}
                {profile?.element_astrologique ? (
                  <View style={{
                    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20,
                    backgroundColor: 'rgba(135,206,235,0.08)',
                    borderWidth: 1, borderColor: 'rgba(135,206,235,0.25)',
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                  }}>
                    <Text style={{ fontSize: 12 }}>🌊</Text>
                    <View>
                      <Text style={{ color: 'rgba(135,206,235,0.5)', fontSize: 11, fontWeight: '800' }}>ÉLÉMENT</Text>
                      <Text style={{ color: 'rgba(135,206,235,0.9)', fontSize: 12, fontWeight: '700' }}>{profile.element_astrologique}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </LinearGradient>
          ) : null}

          {/* ── Badges gamification ─────────────────────────── */}
          {badges.length > 0 && (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: 'rgba(255,215,0,0.85)', fontSize: 11, fontWeight: '800', letterSpacing: 2.5 }}>
                  🏅 MES BADGES
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>
                  {badges.length} débloqué{badges.length > 1 ? 's' : ''}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[...badges].sort((a: any, b: any) =>
                  new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime()
                ).map((b: any) => {
                  const color  = b.badge_color ?? '#FFD700';
                  const bgRgba = `${color}1F`;
                  const brRgba = `${color}55`;
                  return (
                    <React.Fragment key={b.id}>
                      <View style={{
                        alignItems: 'center', gap: 3,
                        paddingHorizontal: 12, paddingVertical: 9,
                        borderRadius: 16,
                        backgroundColor: bgRgba,
                        borderWidth: 1.5, borderColor: brRgba,
                        minWidth: 68, maxWidth: 100,
                        // @ts-ignore
                        boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 8, color: `${color}2A` }],
                      }}>
                        <Text style={{ fontSize: 24 }}>{b.badge_emoji}</Text>
                        <Text
                          style={{ color, fontSize: 10, fontWeight: '800', textAlign: 'center' }}
                          numberOfLines={2}
                        >
                          {b.badge_label}
                        </Text>
                      </View>
                    </React.Fragment>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Tags / Passions ───────────────────────────────── */}
          {profile?.tags && profile.tags.length > 0 ? (
            <View style={{ gap: 10 }}>
              <Text style={{
                color: 'rgba(255,215,0,0.75)', fontSize: 11, fontWeight: '800',
                letterSpacing: 2.5,
              }}>
                ✦ MES PASSIONS
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {profile.tags.map((tag: string) => (
                  <React.Fragment key={tag}><View style={{
                    paddingHorizontal: 13, paddingVertical: 7,
                    borderRadius: 20, borderWidth: 1,
                    borderColor: empreinte + '45', backgroundColor: empreinte + '10',
                  }}>
                    <Text style={{ color: empreinte, fontSize: 12, fontWeight: '700' }}>{tag}</Text>
                  </View>
                  </React.Fragment>
                ))}
              </View>
            </View>
          ) : null}

          {/* ── Essence (traits) ──────────────────────────────── */}
          {profile && (profile.reve_duo || profile.style_amour || profile.moment_prefere || profile.devise) ? (
            <View style={{ gap: 8 }}>
              <Text style={{
                color: 'rgba(255,215,0,0.75)', fontSize: 11, fontWeight: '800',
                letterSpacing: 2.5, marginBottom: 2,
              }}>
                ✦ VOTRE ESSENCE
              </Text>
              {[
                { label: 'Rêve à deux',     value: profile.reve_duo,       emoji: '✈️' },
                { label: 'Style d\'amour',  value: profile.style_amour,    emoji: '💕' },
                { label: 'Moment préféré',  value: profile.moment_prefere, emoji: '🌙' },
                { label: 'Devise',          value: profile.devise,         emoji: '✍️' },
              ].filter(i => i.value).map((item, idx) => (
                <React.Fragment key={idx}>
                <View
                  style={{
                    borderRadius: 14, padding: 12,
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderWidth: 1, borderColor: 'rgba(255,215,0,0.08)',
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10 }}>{item.label}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13, marginTop: 1 }}>
                      {item.value}
                    </Text>
                  </View>
                </View>
                </React.Fragment>
              ))}
            </View>
          ) : null}

          {/* ── Onglets Likes / Favoris ───────────────────────── */}
          <View style={{ gap: 10 }}>
            {/* Sélecteur */}
            <View style={{
              flexDirection: 'row', gap: 8,
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderRadius: 14, padding: 4,
            }}>
              {([
                { key: 'likes',   label: `💌 Qui m'a aimé`, count: receivedLikes.length },
                { key: 'favoris', label: '🔖 Mes Favoris',  count: favoris.length },
              ] as const).map(tab => (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 11,
                    alignItems: 'center',
                    backgroundColor: activeTab === tab.key
                      ? 'rgba(255,215,0,0.15)'
                      : 'transparent',
                    borderWidth: activeTab === tab.key ? 1 : 0,
                    borderColor: 'rgba(255,215,0,0.3)',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Text style={{
                    color: activeTab === tab.key ? '#FFD700' : 'rgba(255,255,255,0.65)',
                    fontSize: 12, fontWeight: '700',
                  }}>
                    {tab.label}
                  </Text>
                  {tab.count > 0 ? (
                    <View style={{
                      minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
                      backgroundColor: activeTab === tab.key ? '#FFD700' : 'rgba(255,255,255,0.12)',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{
                        color: activeTab === tab.key ? '#000000' : 'rgba(255,255,255,0.6)',
                        fontSize: 10, fontWeight: '800',
                      }}>
                        {tab.count}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </View>

            {/* Contenu onglet Likes */}
            {activeTab === 'likes' && (
              receivedLikes.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
                  <Text style={{ fontSize: 38 }}>💌</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, fontStyle: 'italic', textAlign: 'center' }}>
                    Les âmes qui vous ont aimé apparaîtront ici…
                  </Text>
                </View>
              ) : (
                receivedLikes.map((like: any) => like.profile ? (
                  <MiniCard
                    key={like.id}
                    p={like.profile}
                    profileId={like.from_user_id}
                    extraInfo={`${ACTION_EMOJIS[like.action_type] ?? '✦'} ${new Date(like.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`}
                    isFav={favorisSet.has(like.from_user_id)}
                    onToggleFav={handleToggleFavori}
                    myProfile={profile}
                  />
                ) : null)
              )
            )}

            {/* Contenu onglet Favoris */}
            {activeTab === 'favoris' && (
              favoris.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
                  <Text style={{ fontSize: 38 }}>🔖</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, fontStyle: 'italic', textAlign: 'center' }}>
                    Marquez des profils en favori pour les retrouver ici.
                  </Text>
                </View>
              ) : (
                favoris.map((fav: Favori) => fav.profile ? (
                  <MiniCard
                    key={fav.id}
                    p={fav.profile}
                    profileId={fav.profile_id}
                    isFav={favorisSet.has(fav.profile_id)}
                    onToggleFav={handleToggleFavori}
                    myProfile={profile}
                  />
                ) : null)
              )
            )}
          </View>

          {/* ── Déconnexion ───────────────────────────────────── */}
          <Pressable
            onPress={handleLogout}
            style={{
              borderRadius: 14, paddingVertical: 14,
              borderWidth: 1, borderColor: 'rgba(255,107,107,0.2)',
              alignItems: 'center',
              backgroundColor: 'rgba(255,107,107,0.04)',
            }}
          >
            <Text style={{ color: 'rgba(255,107,107,0.6)', fontSize: 13, fontWeight: '600' }}>
              Se déconnecter
            </Text>
          </Pressable>
          </View>{/* fin wrapper centrant */}
        </ScrollView>
      </CosmicBackground>
    </View>
  );
}
