// Aevyra – Cœur Vérifié : badge de confiance avec vrai calcul des critères
// Vérifie les données réelles du profil Supabase et met à jour is_verified
import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router, type RelativePathString } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  CheckCircle,
  XCircle,
  Clock,
  Heart,
  Camera,
  User,
  Star,
  Sparkles,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import { supabase } from '@/client/supabase';
import { getMyProfile, getCurrentUserId, type Profile } from '@/lib/amour-api';
import { useResponsive } from '@/hooks/useResponsive';

// ── Calcul des critères de vérification ─────────────────────
// Aucun email requis — vérification 100% profil + ancienneté
export type Critere = {
  id:      string;
  label:   string;
  detail:  string;
  icon:    React.ReactNode;
  ok:      boolean;
  points:  number; // poids pour la barre de progression
};

const JOURS_ANCIENNETE = 3;

function computeCriteres(p: Profile): Critere[] {
  // Critère 1 : Photo de profil
  const hasPhoto = !!(p.photo_url && p.photo_url.trim().length > 0);
  // Critère 2 : Prénom renseigné
  const hasPrenom = !!(p.prenom && p.prenom.trim().length >= 2);
  // Critère 3 : Bio rédigée (min 20 caractères)
  const hasBio = !!(p.bio && p.bio.trim().length >= 20);
  // Critère 4 : Genre + ce qu'on cherche renseignés
  const hasGenreCherche = !!(p.genre && p.genre.trim() && p.cherche && p.cherche.trim());
  // Critère 5 : Signe astrologique
  const hasAstro = !!(p.signe_astro && p.signe_astro.trim().length > 0);
  // Critère 6 : Ancienneté ≥ 3 jours
  let ancienOk = false;
  if (p.created_at) {
    const diff = Date.now() - new Date(p.created_at).getTime();
    ancienOk = diff >= JOURS_ANCIENNETE * 24 * 60 * 60 * 1000;
  }
  // Critère 7 : Mode Mystère désactivé
  const mystereOk = !p.is_mystery;

  return [
    {
      id:     'photo',
      label:  'Photo de profil',
      detail: hasPhoto
        ? 'Votre photo est bien renseignée ✨'
        : 'Ajoutez une photo sur votre profil',
      icon:   <Camera size={18} color={hasPhoto ? '#64FFB4' : 'rgba(255,255,255,0.35)'} />,
      ok:     hasPhoto,
      points: 25,
    },
    {
      id:     'prenom',
      label:  'Prénom renseigné',
      detail: hasPrenom
        ? `Prénom "${p.prenom}" enregistré`
        : 'Complétez votre prénom dans votre profil',
      icon:   <User size={18} color={hasPrenom ? '#64FFB4' : 'rgba(255,255,255,0.35)'} />,
      ok:     hasPrenom,
      points: 15,
    },
    {
      id:     'bio',
      label:  'Présentation rédigée',
      detail: hasBio
        ? `Bio complète (${p.bio.trim().length} caractères)`
        : 'Rédigez votre bio (minimum 20 caractères)',
      icon:   <Sparkles size={18} color={hasBio ? '#64FFB4' : 'rgba(255,255,255,0.35)'} />,
      ok:     hasBio,
      points: 20,
    },
    {
      id:     'genre',
      label:  'Genre & préférences',
      detail: hasGenreCherche
        ? 'Genre et préférences renseignés'
        : 'Indiquez votre genre et ce que vous cherchez',
      icon:   <Heart size={18} color={hasGenreCherche ? '#64FFB4' : 'rgba(255,255,255,0.35)'} />,
      ok:     hasGenreCherche,
      points: 15,
    },
    {
      id:     'astro',
      label:  'Signe astrologique',
      detail: hasAstro
        ? `Signe ${p.signe_astro} enregistré 🌟`
        : 'Renseignez votre signe astrologique',
      icon:   <Star size={18} color={hasAstro ? '#64FFB4' : 'rgba(255,255,255,0.35)'} />,
      ok:     hasAstro,
      points: 10,
    },
    {
      id:     'anciennete',
      label:  `${JOURS_ANCIENNETE} jours d’ancienneté`,
      detail: ancienOk
        ? `Compte créé depuis plus de ${JOURS_ANCIENNETE} jours`
        : `Revenez dans quelques jours — le badge se débloque après ${JOURS_ANCIENNETE} jours`,
      icon:   <Clock size={18} color={ancienOk ? '#64FFB4' : 'rgba(255,255,255,0.35)'} />,
      ok:     ancienOk,
      points: 10,
    },
    {
      id:     'mystere',
      label:  'Mode Mystère désactivé',
      detail: mystereOk
        ? 'Votre profil est visible — parfait !'
        : 'Désactivez le Mode Mystère dans les Paramètres',
      icon:   <ShieldCheck size={18} color={mystereOk ? '#64FFB4' : 'rgba(255,255,255,0.35)'} />,
      ok:     mystereOk,
      points: 5,
    },
  ];
}

function scoreFromCriteres(criteres: Critere[]): number {
  const total   = criteres.reduce((s, c) => s + c.points, 0);
  const reached = criteres.filter((c: Critere) => c.ok).reduce((s, c) => s + c.points, 0);
  return Math.round((reached / total) * 100);
}

// ── Anneau pulsant pour le badge obtenu ─────────────────────
function PulseRing({ color, size, delay }: { color: string; size: number; delay: number }) {
  const anim = useRef(new Animated.Value(0.3)).current;
  React.useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, { toValue: 1,   duration: 1200, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
    ])).start();
  }, [anim, delay]);
  return (
    <Animated.View style={{
      position: 'absolute',
      width: size, height: size,
      borderRadius: size / 2,
      borderWidth: 2,
      borderColor: color,
      opacity: anim,
    }} />
  );
}

// ── Barre de progression animée ──────────────────────────────
function ProgressBar({ score }: { score: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: score / 100,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [anim, score]);

  const color = score >= 100 ? '#64FFB4' : score >= 70 ? '#FFD700' : '#FF8C42';

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '700' }}>
          PROGRESSION
        </Text>
        <Text style={{ color, fontSize: 15, fontWeight: '900' }}>
          {score}%
        </Text>
      </View>
      <View style={{
        height: 8, borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}>
        <Animated.View style={{
          height: '100%',
          borderRadius: 4,
          backgroundColor: color,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }} />
      </View>
    </View>
  );
}

// ── Ligne critère ────────────────────────────────────────────
function CritereRow({ c }: { c: Critere }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    }}>
      {/* Icône */}
      <View style={{
        width: 36, height: 36, borderRadius: 12,
        backgroundColor: c.ok ? 'rgba(100,255,180,0.12)' : 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: c.ok ? 'rgba(100,255,180,0.30)' : 'rgba(255,255,255,0.08)',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {c.icon}
      </View>

      {/* Texte */}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{
          color: c.ok ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.55)',
          fontSize: 14, fontWeight: '600',
        }}>
          {c.label}
        </Text>
        <Text style={{
          color: c.ok ? 'rgba(100,255,180,0.70)' : 'rgba(255,255,255,0.35)',
          fontSize: 14,
        }}>
          {c.detail}
        </Text>
      </View>

      {/* Statut */}
      {c.ok
        ? <CheckCircle size={20} color="#64FFB4" />
        : <XCircle    size={20} color="rgba(255,100,100,0.55)" />
      }
    </View>
  );
}

// ── PAGE PRINCIPALE ──────────────────────────────────────────
export default function CoeurVerifie() {
  const insets     = useSafeAreaInsets();
  const { px, captionSize, bodySize, h3Size: _h3Size, gap: _gap, cardRadius: _cardRadius } = useResponsive();
  const { width }  = useWindowDimensions();
  const maxW       = width >= 768 ? 660 : undefined;

  const [_profile,   setProfile]   = useState<Profile | null>(null);
  const [criteres,  setCriteres]  = useState<Critere[]>([]);
  const [score,     setScore]     = useState(0);
  const [verified,  setVerified]  = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [saved,     setSaved]     = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);

    const p = await getMyProfile();
    if (!p) {
      setLoading(false); setRefreshing(false); return;
    }
    setProfile(p);

    const crits = computeCriteres(p);
    setCriteres(crits);
    const s = scoreFromCriteres(crits);
    setScore(s);

    // Un profil est "Cœur Vérifié" si tous les critères sont OK
    const allOk = crits.every(c => c.ok);
    setVerified(allOk);

    // Synchroniser is_verified dans Supabase si la valeur a changé
    if (allOk !== p.is_verified) {
      const userId = await getCurrentUserId();
      if (userId) {
        await supabase
          .from('profiles')
          .update({ is_verified: allOk })
          .eq('id', userId);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    }

    setLoading(false); setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground>

        {/* ── En-tête ── */}
        <View style={{
          paddingTop: insets.top + 8, paddingHorizontal: px, paddingBottom: 12,
          flexDirection: 'row', alignItems: 'center', gap: 12,
        }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: 'rgba(100,255,180,0.10)',
              borderWidth: 1, borderColor: 'rgba(100,255,180,0.22)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ChevronLeft size={20} color="#64FFB4" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#F5E6C8', fontSize: 20, fontWeight: '900' }}>
              Cœur Vérifié
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: captionSize, marginTop: 1 }}>
              Badge de confiance Aevyra
            </Text>
          </View>
          {/* Bouton rafraîchir */}
          <Pressable
            onPress={() => load(true)}
            style={{
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: 'rgba(255,215,0,0.10)',
              borderWidth: 1, borderColor: 'rgba(255,215,0,0.22)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <RefreshCw size={17} color={refreshing ? '#64FFB4' : '#FFD700'} />
          </Pressable>
        </View>

        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={{
            paddingHorizontal: px,
            paddingBottom: insets.bottom + 48,
            alignSelf: width >= 768 ? ('center' as const) : undefined,
            width: maxW,
            gap: 20,
          }}
        >
          {loading ? (
            <View style={{ paddingTop: 60, alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 32 }}>💫</Text>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: bodySize }}>
                Analyse de votre profil en cours…
              </Text>
            </View>
          ) : (
            <>
              {/* ── Sauvegarde confirmée ── */}
              {saved && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  backgroundColor: 'rgba(100,255,180,0.12)',
                  borderRadius: 12, padding: 12,
                  borderWidth: 1, borderColor: 'rgba(100,255,180,0.25)',
                }}>
                  <CheckCircle size={16} color="#64FFB4" />
                  <Text style={{ color: '#64FFB4', fontSize: captionSize, fontWeight: '700' }}>
                    Statut mis à jour dans votre profil Supabase ✓
                  </Text>
                </View>
              )}

              {/* ── Badge hero ── */}
              <View style={{ alignItems: 'center', paddingVertical: 28 }}>
                {verified ? (
                  /* Badge obtenu : anneaux pulsants + icône cœur doré */
                  <View style={{ alignItems: 'center', justifyContent: 'center', width: 120, height: 120 }}>
                    <PulseRing color="rgba(100,255,180,0.30)" size={118} delay={0} />
                    <PulseRing color="rgba(100,255,180,0.18)" size={140} delay={400} />
                    <PulseRing color="rgba(255,215,0,0.12)"   size={162} delay={800} />
                    <LinearGradient
                      colors={['#64FFB4', '#00C896', '#007A5E']}
                      style={{
                        width: 96, height: 96, borderRadius: 48,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: 3, borderColor: 'rgba(100,255,180,0.5)',
                      }}
                    >
                      <Text style={{ fontSize: 40 }}>💚</Text>
                    </LinearGradient>
                    {/* Étoiles cosmiques */}
                    {[{ top: -6, left: 10 }, { top: 8, right: -6 }, { bottom: -4, left: 30 }].map((pos, i) => (
                      // @ts-ignore
                      // @ts-ignore
                      <Text key={i} style={{ position: 'absolute', fontSize: captionSize, ...pos }}>✨</Text>
                    ))}
                  </View>
                ) : (
                  /* Badge en cours : visuel premium avec gradient + anneaux + ShieldCheck */
                  <View style={{ alignItems: 'center', justifyContent: 'center', width: 160, height: 160 }}>
                    {/* Anneau externe tournant — halo doré */}
                    <PulseRing
                      color={score >= 70 ? 'rgba(255,215,0,0.28)' : 'rgba(199,125,255,0.22)'}
                      size={154} delay={0}
                    />
                    <PulseRing
                      color={score >= 70 ? 'rgba(255,180,0,0.15)' : 'rgba(120,60,220,0.15)'}
                      size={136} delay={600}
                    />
                    {/* Fond outer ring décoratif */}
                    <View style={{
                      width: 118, height: 118, borderRadius: 59,
                      borderWidth: 1.5,
                      borderColor: score >= 70 ? 'rgba(255,215,0,0.35)' : 'rgba(199,125,255,0.25)',
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: 'transparent',
                    }}>
                      {/* Gradient principal */}
                      <LinearGradient
                        colors={
                          score >= 70
                            ? ['rgba(255,200,0,0.28)', 'rgba(160,80,0,0.38)', 'rgba(30,10,60,0.92)']
                            : ['rgba(199,125,255,0.22)', 'rgba(75,0,130,0.45)', 'rgba(18,6,40,0.95)']
                        }
                        style={{
                          width: 100, height: 100, borderRadius: 50,
                          alignItems: 'center', justifyContent: 'center',
                          borderWidth: 2,
                          borderColor: score >= 70 ? 'rgba(255,215,0,0.55)' : 'rgba(199,125,255,0.45)',
                        }}
                      >
                        {/* Icône ShieldCheck lucide-react-native */}
                        <ShieldCheck
                          size={44}
                          color={score >= 70 ? '#FFD700' : '#C77DFF'}
                          strokeWidth={1.6}
                        />
                        {/* Score mini en bas de l'icône */}
                        <Text style={{
                          color: score >= 70 ? '#FFD700' : '#C77DFF',
                          fontSize: 11, fontWeight: '900', letterSpacing: 0.5,
                          marginTop: 2, opacity: 0.9,
                        }}>
                          {score}%
                        </Text>
                      </LinearGradient>
                    </View>
                    {/* Étoiles cosmiques positionnées */}
                    {[
                      { top: 2,  left: 22,  size: 10 },
                      { top: 18, right: 14, size: 8  },
                      { bottom: 8, left: 36, size: 9 },
                    ].map((pos, i) => (
                      // @ts-ignore
                      // @ts-ignore
                      <Text key={i} style={{ position: 'absolute', fontSize: pos.size, opacity: 0.7, ...pos }}>✦</Text>
                    ))}
                  </View>
                )}

                {/* Titre + sous-titre badge */}
                <Text style={{
                  marginTop: 18,
                  color: verified ? '#64FFB4' : '#FFD700',
                  fontSize: 22, fontWeight: '900', textAlign: 'center',
                }}>
                  {verified ? '💚 Cœur Vérifié' : '🛡️ Badge en cours'}
                </Text>
                <Text style={{
                  color: 'rgba(255,255,255,0.75)', fontSize: bodySize,
                  textAlign: 'center', marginTop: 5, lineHeight: 19,
                }}>
                  {verified
                    ? 'Votre profil est authentifié et digne de confiance'
                    : `Complétez les critères ci-dessous pour obtenir le badge`
                  }
                </Text>
              </View>

              {/* ── Barre de progression ── */}
              <LinearGradient
                colors={['rgba(75,0,130,0.25)', 'rgba(13,13,26,0.40)']}
                style={{
                  borderRadius: 18, padding: 18,
                  borderWidth: 1, borderColor: 'rgba(255,215,0,0.10)',
                }}
              >
                <ProgressBar score={score} />
                <Text style={{
                  color: 'rgba(255,255,255,0.65)', fontSize: captionSize,
                  textAlign: 'center', marginTop: 10,
                }}>
                  {criteres.filter((c: Critere) => c.ok).length} / {criteres.length} critères satisfaits
                </Text>
              </LinearGradient>

              {/* ── Liste des critères ── */}
              <LinearGradient
                colors={['rgba(75,0,130,0.22)', 'rgba(13,13,26,0.42)']}
                style={{
                  borderRadius: 20, paddingHorizontal: 16,
                  borderWidth: 1, borderColor: 'rgba(100,255,180,0.10)',
                }}
              >
                <View style={{ paddingTop: 14, paddingBottom: 4 }}>
                  <Text style={{
                    color: 'rgba(100,255,180,0.65)', fontSize: captionSize * 0.85,
                    fontWeight: '900', letterSpacing: 2, marginBottom: 4,
                  }}>
                    CRITÈRES DE VÉRIFICATION
                  </Text>
                </View>
                {criteres.map((c: Critere, i: number) => (
                  // @ts-ignore
                  <View key={c.id} style={i === criteres.length - 1 ? {
                    borderBottomWidth: 0,
                  } : {}}>
                    <CritereRow c={c} />
                  </View>
                ))}
              </LinearGradient>

              {/* ── Explications / CTA ── */}
              {!verified && (
                <LinearGradient
                  colors={['rgba(255,140,66,0.12)', 'rgba(13,13,26,0.25)']}
                  style={{
                    borderRadius: 18, padding: 18, gap: 12,
                    borderWidth: 1, borderColor: 'rgba(255,140,66,0.22)',
                  }}
                >
                  <Text style={{ color: '#FF8C42', fontWeight: '800', fontSize: 14 }}>
                    ✦ Comment obtenir le badge ?
                  </Text>
                  {criteres.filter((c: Critere) => !c.ok).map((c: Critere) => (
                    // @ts-ignore
                    <View key={c.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <Text style={{ color: '#FF8C42', fontSize: 13, lineHeight: 20 }}>•</Text>
                      <Text style={{ color: '#FF8C42', fontSize: bodySize, lineHeight: bodySize * 1.55 }}>•</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: bodySize, lineHeight: bodySize * 1.55, flex: 1 }}>
                        {c.detail}
                      </Text>
                    </View>
                  ))}
                  <Pressable
                    onPress={() => router.push('/(app)/edit-profil' as RelativePathString)}
                    style={{
                      marginTop: 4, paddingVertical: 13,
                      borderRadius: 14, alignItems: 'center',
                      backgroundColor: 'rgba(255,215,0,0.12)',
                      borderWidth: 1, borderColor: 'rgba(255,215,0,0.28)',
                    }}
                  >
                    <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: bodySize }}>
                      ✏️ Compléter mon profil
                    </Text>
                  </Pressable>
                </LinearGradient>
              )}

              {/* ── Avantages du badge ── */}
              <LinearGradient
                colors={['rgba(100,255,180,0.08)', 'rgba(13,13,26,0.25)']}
                style={{
                  borderRadius: 18, padding: 18, gap: 10,
                  borderWidth: 1, borderColor: 'rgba(100,255,180,0.15)',
                }}
              >
                <Text style={{ color: '#64FFB4', fontWeight: '800', fontSize: 14 }}>
                  💚 Avantages du badge Cœur Vérifié
                </Text>
                {[
                  { e: '🌟', t: 'Profil mis en avant dans la Constellation' },
                  { e: '🛡️', t: 'Badge visible sur votre profil et dans les matchs' },
                  { e: '💬', t: 'Confiance accrue — plus de messages reçus' },
                  { e: '✨', t: 'Priorité dans les suggestions de rencontres' },
                  { e: '🤝', t: 'Communauté de confiance Aevyra' },
                ].map(({ e, t }) => (
                  // @ts-ignore
                  <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 16 }}>{e}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.70)', fontSize: bodySize, flex: 1 }}>{t}</Text>
                  </View>
                ))}
              </LinearGradient>

              {/* ── Pied de page ── */}
              <Text style={{
                color: 'rgba(255,255,255,0.65)', fontSize: captionSize * 0.85,
                textAlign: 'center', lineHeight: 16, paddingBottom: 8,
              }}>
                Le badge est vérifié automatiquement à chaque visite de cette page.{'\n'}
                Aucune adresse e-mail requise — vérification 100% profil.
              </Text>
            </>
          )}
        </ScrollView>
      </CosmicBackground>
    </View>
  );
}
