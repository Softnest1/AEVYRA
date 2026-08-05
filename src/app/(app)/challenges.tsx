// Aevyra – Hub des Challenges 🔥
// Gamification complète : défis quotidiens/hebdo, streak, badges, progression
// v2 : completion optimiste locale, reload au retour, barre animée en temps réel
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, router, type RelativePathString } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CosmicBackground from '@/components/CosmicBackground';
import PageHeader from '@/components/PageHeader';
import { useResponsive } from '@/hooks/useResponsive';
import { supabase } from '@/client/supabase';
import {
  getDailyChallenges,
  getReloadOffset,
  saveReloadOffset,
  completeChallenge,
  getUserStreak,
  getUserBadges,
  getChallengeWindow,
  invalidateChallengeWindow,
  type UserChallenge,
  type UserStreak,
  type UserBadge,
  type ChallengeDiff,
  type ChallengeActionType,
} from '@/lib/amour-api';

// ── Couleurs par difficulté ──────────────────────────────────────────────────
const DIFF_STYLE: Record<ChallengeDiff, { color: string; bg: string; label: string }> = {
  facile:     { color: '#4CAF50', bg: 'rgba(76,175,80,0.15)',    label: 'Facile'         },
  moyen:      { color: '#FFD700', bg: 'rgba(255,215,0,0.15)',    label: 'Moyen'          },
  difficile:  { color: '#FF69B4', bg: 'rgba(255,105,180,0.15)', label: 'Difficile'      },
  legendaire: { color: '#FF4500', bg: 'rgba(255,69,0,0.18)',     label: '⚡ Légendaire'  },
};

const TYPE_LABEL: Record<string, string> = {
  daily:        '📅 Quotidien',
  weekly:       '📆 Hebdomadaire',
  social:       '💑 Social',
  creative:     '🎨 Créatif',
  reflexion:    '🔮 Réflexion',
  surprise:     '🎲 Surprise',
  astro_comment:   '🌠 Astrologie',
  write_intention: '🔮 Intention',
};

// ── Timer compte à rebours jusqu'au prochain minuit Paris ───────────────────
// Utilise reset_at de la RPC get_challenge_window (Europe/Paris) — pas minuit JS local.
// Au passage de minuit : invalide le cache fenêtre + recharge les défis.
function useCountdown(onMidnight?: () => void) {
  const [timeLeft, setTimeLeft]   = useState('');
  const [resetAt,  setResetAt]    = useState<number>(0);
  const midnightFired = useRef(false);

  // Récupérer reset_at depuis la RPC une seule fois au montage
  useEffect(() => {
    getChallengeWindow().then(w => {
      setResetAt(new Date(w.reset_at).getTime());
      midnightFired.current = false;
    });
  }, []);

  useEffect(() => {
    if (!resetAt) return;
    const update = () => {
      const diff = resetAt - Date.now();
      if (diff <= 0) {
        setTimeLeft('00:00:00');
        if (!midnightFired.current) {
          midnightFired.current = true;
          // Invalider le cache → prochain appel getDailyChallenges rechargerera la fenêtre
          invalidateChallengeWindow();
          onMidnight?.();
        }
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000)    / 1_000);
      setTimeLeft(
        `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [resetAt, onMidnight]);

  return timeLeft;
}

// ── Barre de progression animée ──────────────────────────────────────────────
// Accepte une valeur [0..1] directement pour éviter divisions par zéro
function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.min(Math.max(pct, 0), 1),
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [pct, anim]);
  return (
    <View style={{ height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
      <Animated.View
        style={{
          height: 5,
          borderRadius: 3,
          backgroundColor: color,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ emoji, msg }: { emoji: string; msg: string }) { 
  const fade = useRef(new Animated.Value(0)).current;
  const { iconSize  } = useResponsive();
  useEffect(() => {
    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(fade, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [fade]);
  return (
    <Animated.View
      style={{
        position: 'absolute', top: 80, left: 16, right: 16, zIndex: 200,
        opacity: fade,
        backgroundColor: 'rgba(13,13,26,0.97)',
        borderRadius: 16, padding: 14,
        flexDirection: 'row', alignItems: 'center', gap: 10,
        borderWidth: 1, borderColor: 'rgba(255,215,0,0.45)',
        boxShadow: [{ offsetX: 0, offsetY: 4, blurRadius: 20, color: 'rgba(255,215,0,0.75)' }],
      } as any}
    >
      <Text style={{ fontSize: iconSize }}>{emoji}</Text>
      <Text style={{ color: '#FFD700', fontWeight: '800', flex: 1 }}>{msg}</Text>
    </Animated.View>
  );
}

// ── Carte challenge ──────────────────────────────────────────────────────────
function ChallengeCard({
  uc,
  onAction,
}: {
  uc: UserChallenge;
  onAction: (uc: UserChallenge) => Promise<void>;
}) { 
  const { captionSize, bodySize, gap, contentMaxWidth: _contentMaxWidth, h3Size, px: _px, iconSize  } = useResponsive();
  const c      = uc.challenge;
  const diff   = DIFF_STYLE[c.difficulte] ?? DIFF_STYLE.facile;
  const done   = uc.completed;
  const pct    = c.action_count > 0 ? uc.progress / c.action_count : done ? 1 : 0;

  const bounce  = useRef(new Animated.Value(1)).current;
  const [busy, setBusy] = useState(false);

  const triggerBounce = () => {
    Animated.sequence([
      Animated.timing(bounce, { toValue: 0.93, duration: 70,  useNativeDriver: true }),
      Animated.spring(bounce,  { toValue: 1,   speed: 18, bounciness: 14, useNativeDriver: true }),
    ]).start();
  };

  const handlePress = async () => {
    if (done || busy) return;
    triggerBounce();
    setBusy(true);
    try {
      await onAction(uc);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: bounce }], marginBottom: 12 }}>
      <LinearGradient
        colors={
          done
            ? ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.015)']
            : ['rgba(26,10,46,0.92)', 'rgba(13,13,26,0.97)']
        }
        style={{
          borderRadius: 20,
          padding: 16,
          borderWidth: 1,
          borderColor: done ? 'rgba(255,255,255,0.07)' : diff.color + '38',
        }}
      >
        {/* En-tête : emoji + titre + points */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
          <View style={{
            width: 48, height: 48, borderRadius: 14,
            backgroundColor: done ? 'rgba(255,255,255,0.04)' : diff.bg,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: done ? 'rgba(255,255,255,0.07)' : diff.color + '55',
          }}>
            <Text style={{ fontSize: iconSize, opacity: done ? 0.35 : 1 }}>{c.emoji}</Text>
          </View>

          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{
              color: done ? 'rgba(255,255,255,0.3)' : '#fff',
              fontSize: h3Size, fontWeight: '800',
            }} numberOfLines={2}>
              {done ? '✅ ' : ''}{c.titre}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' }}>
                <Text style={{ color: diff.color, fontSize: captionSize, fontWeight: '700' }}>{diff.label}</Text>
              </View>
              <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' }}>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: captionSize }}>
                  {TYPE_LABEL[c.type] ?? c.type}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ alignItems: 'center', minWidth: 36 }}>
            <Text style={{ color: done ? 'rgba(255,215,0,0.3)' : '#FFD700', fontSize: h3Size, fontWeight: '900' }}>
              +{c.points}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: captionSize }}>pts</Text>
          </View>
        </View>

        {/* Description */}
        <Text style={{
          color: done ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.65)',
          fontSize: bodySize, lineHeight: bodySize * 1.45, marginBottom: gap * 0.7,
        }}>
          {c.description}
        </Text>

        {/* Barre de progression (toujours visible si action_count > 1, sinon quand en cours) */}
        {(c.action_count > 1 || (!done && pct > 0)) && (
          <View style={{ gap: 4, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: captionSize * 0.85 }}>Progression</Text>
              <Text style={{ color: diff.color, fontSize: captionSize * 0.85, fontWeight: '700' }}>
                {done ? c.action_count : uc.progress}/{c.action_count}
              </Text>
            </View>
            <ProgressBar pct={pct} color={diff.color} />
          </View>
        )}

        {/* Badge reward — emoji unique + label */}
        {c.badge_reward && !done && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Text style={{ fontSize: bodySize }}>{c.badge_reward}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: captionSize, fontStyle: 'italic' }}>
              Badge débloqué à la complétion
            </Text>
          </View>
        )}

        {/* Bouton */}
        {!done ? (
          <Pressable
            onPress={handlePress}
            disabled={busy}
            style={{
              borderRadius: 12, padding: 12, alignItems: 'center',
              backgroundColor: busy ? 'rgba(255,255,255,0.04)' : diff.bg,
              borderWidth: 1, borderColor: busy ? 'rgba(255,255,255,0.1)' : diff.color + '65',
              flexDirection: 'row', justifyContent: 'center', gap: 8,
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy
              ? <ActivityIndicator color={diff.color} size="small" />
              : <Text style={{ fontSize: 15 }}>{c.emoji}</Text>
            }
            <Text style={{ color: busy ? 'rgba(255,255,255,0.4)' : diff.color, fontWeight: '800', fontSize: bodySize }}>
              {busy
                ? 'En cours…'
                : c.action_type === 'manual'
                  ? 'Marquer complété ✓'
                  : c.action_count > 1
                    ? `Progresser (${uc.progress}/${c.action_count}) →`
                    : 'Relever le défi →'}
            </Text>
          </Pressable>
        ) : (
          <View style={{
            borderRadius: 12, padding: 10, alignItems: 'center',
            backgroundColor: 'rgba(76,175,80,0.08)',
            borderWidth: 1, borderColor: 'rgba(76,175,80,0.2)',
          }}>
            <Text style={{ color: '#4CAF50', fontSize: bodySize, fontWeight: '700' }}>
              ✓ Complété · +{uc.points_earned} pts gagnés
            </Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

// ── Bandeau streak ───────────────────────────────────────────────────────────
function StreakBanner({ streak }: { streak: UserStreak }) { 
  const { bodySize: _bodySize3, captionSize, gap: _gap3  } = useResponsive();
  const flameScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(flameScale, { toValue: 1.18, duration: 650, useNativeDriver: true }),
        Animated.timing(flameScale, { toValue: 1,    duration: 650, useNativeDriver: true }),
      ])
    ).start();
    return () => flameScale.stopAnimation();
  }, [flameScale]);
  return (
    <LinearGradient
      colors={['rgba(255,69,0,0.22)', 'rgba(255,215,0,0.1)']}
      style={{
        borderRadius: 18, padding: 16, marginBottom: 16,
        borderWidth: 1, borderColor: 'rgba(255,120,0,0.38)',
        flexDirection: 'row', alignItems: 'center', gap: 14,
      }}
    >
      <Animated.Text style={{ fontSize: 36, transform: [{ scale: flameScale }] }}>🔥</Animated.Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#FFD700', fontSize: 20, fontWeight: '900' }}>
          {streak.current_streak} jour{streak.current_streak !== 1 ? 's' : ''} de suite
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize }}>
          Record : {streak.longest_streak} · Total : {streak.total_points} pts
        </Text>
      </View>
      {streak.current_streak >= 7 && (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 24 }}>👑</Text>
          <Text style={{ color: '#FFD700', fontSize: captionSize, fontWeight: '700' }}>SÉRIE</Text>
        </View>
      )}
    </LinearGradient>
  );
}

// ── Grille badges ────────────────────────────────────────────────────────────
// Triés par earned_at DESC (les plus récents en premier) + date affiché sous le label
function BadgeGrid({ badges }: { badges: UserBadge[] }) { 
  const { bodySize, captionSize, gap  } = useResponsive();
  if (badges.length === 0) return null;

  // Tri : plus récent en tête (zéro risque de perte — tableau filtré, pas muté)
  const sorted = [...badges].sort(
    (a, b) => new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime(),
  );

  const fmtDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    } catch { return ''; }
  };

  return (
    <View style={{ marginBottom: 20 }}>
      {/* En-tête : titre + compteur */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: gap * 0.5 }}>
        <Text style={{ color: 'rgba(255,215,0,0.85)', fontSize: bodySize, fontWeight: '700', letterSpacing: 1 }}>
          🏅 MES BADGES
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: captionSize }}>
          {sorted.length} débloqué{sorted.length > 1 ? 's' : ''}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {sorted.map(b => (
          <View
            // @ts-ignore
            key={b.id}
            style={{
              alignItems: 'center', gap: 2,
              paddingHorizontal: 12, paddingVertical: 10,
              borderRadius: 16,
              backgroundColor: 'rgba(255,215,0,0.09)',
              borderWidth: 1, borderColor: 'rgba(255,215,0,0.28)',
              minWidth: 72, maxWidth: 100,
            }}
          >
            <Text style={{ fontSize: 26 }}>{b.badge_emoji}</Text>
            <Text
              style={{ color: '#FFD700', fontSize: captionSize, fontWeight: '700', textAlign: 'center' }}
              numberOfLines={2}
            >
              {b.badge_label}
            </Text>
            {/* Date d'obtention — repère visuel pour l'utilisateur */}
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: captionSize * 0.82, textAlign: 'center' }}>
              {fmtDate(b.earned_at)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Filtres ───────────────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all',       label: 'Tous',        emoji: '⭐' },
  { key: 'daily',     label: 'Daily',       emoji: '📅' },
  { key: 'weekly',    label: 'Hebdo',       emoji: '📆' },
  { key: 'social',    label: 'Social',      emoji: '💑' },
  { key: 'creative',  label: 'Créatif',     emoji: '🎨' },
  { key: 'reflexion', label: 'Réflexion',   emoji: '🔮' },
] as const;

// ── Page principale ──────────────────────────────────────────────────────────
export default function ChallengesPage() { 
  const { px, captionSize, bodySize, h3Size: _h3Size2, iconSize: _iconSize2, gap: _gap2, cardRadius: _cardRadius2, tapTarget: _tapTarget2, contentMaxWidth, isDesktop, isTablet, isTV  } = useResponsive();
  const isWide = isDesktop || isTablet || isTV;
  const insets   = useSafeAreaInsets();

  const [challenges,    setChallenges]    = useState<UserChallenge[]>([]);
  const [streak,        setStreak]        = useState<UserStreak>({
    current_streak: 0, longest_streak: 0, last_active: null, total_points: 0,
  });
  const [badges,        setBadges]        = useState<UserBadge[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [reloading,     setReloading]     = useState(false);
  const [filter,        setFilter]        = useState<string>('all');
  const [toast,         setToast]         = useState<{ msg: string; emoji: string; key: number } | null>(null);
  const [reloadOffset,  setReloadOffset]  = useState(0);

  // Tous les défis du jour sont-ils complétés ?
  const allDone = challenges.length > 0 && challenges.every((c: UserChallenge) => c.completed);

  // ── Toast (déclaré EN PREMIER — utilisé par loadAll, handleReload, handleMidnight) ──
  const showToast = useCallback((msg: string, emoji: string) => {
    setToast({ msg, emoji, key: Date.now() });
    setTimeout(() => setToast(null), 2800);
  }, []);

  // ── Chargement complet (au focus) ─────────────────────────────────────────
  const loadAll = useCallback(async (offset = 0) => {
    setLoading(true);
    try {
      // Guard ban : si l'utilisateur a une sanction active, rediriger immédiatement
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: ban } = await supabase
          .from('sanctions')
          .select('id, expires_at')
          .eq('user_id', user.id)
          .in('type', ['ban_temp', 'ban_permanent'])
          .in('status', ['active', 'permanent'])
          .limit(1)
          .maybeSingle();
        const isReallyBanned = !!ban && (
          ban.expires_at === null ||
          new Date(ban.expires_at).getTime() > Date.now()
        );
        if (isReallyBanned) {
          router.replace('/(app)/rehabilitation' as RelativePathString);
          return;
        }
      }
      const [ch, st, bg] = await Promise.all([
        getDailyChallenges(offset),
        getUserStreak(),
        getUserBadges(),
      ]);
      setChallenges(ch);
      setStreak(st);
      setBadges(bg);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    // Restaurer l'offset persisté depuis la DB (survit à la déconnexion)
    (async () => {
      const savedOffset = await getReloadOffset();
      setReloadOffset(savedOffset);
      await loadAll(savedOffset);
    })();
  }, [loadAll]));

  // ── Rechargement de nouvelles missions quand tout est complété ────────────
  const handleReload = useCallback(async () => {
    setReloading(true);
    const nextOffset = reloadOffset + 1;
    setReloadOffset(nextOffset);
    try {
      // Persister l'offset dans la DB → survit à la déconnexion
      await saveReloadOffset(nextOffset);
      const ch = await getDailyChallenges(nextOffset);
      setChallenges(ch);
      showToast('✨ Nouvelles missions chargées ! Bonne chance !', '🌟');
    } finally {
      setReloading(false);
    }
  }, [reloadOffset, showToast]);

  // Minuit Paris → invalider cache fenêtre + recharger les défis du jour automatiquement
  const handleMidnight = useCallback(() => {
    setReloadOffset(0);
    loadAll(0);
    showToast('🌙 Nouveaux défis du jour disponibles !', '✨');
  }, [loadAll, showToast]);

  const countdown = useCountdown(handleMidnight);

  // ── Mise à jour optimiste locale ──────────────────────────────────────────
  const applyLocalUpdate = useCallback((
    ucId: string,
    newProgress: number,
    completed: boolean,
    pointsEarned: number,
    target: number,
  ) => {
    setChallenges((prev: UserChallenge[]) =>
      prev.map(uc => {
        if (uc.id !== ucId) return uc;
        return {
          ...uc,
          progress:      completed ? target : newProgress,
          completed,
          completed_at:  completed ? new Date().toISOString() : null,
          points_earned: completed ? pointsEarned : 0,
        };
      })
    );
  }, []);

  // ── Vérifie si TOUS les défis sont maintenant complétés ─────────────────
  const checkAllDone = useCallback((updatedChallenges: UserChallenge[]) => {
    const allDone = updatedChallenges.length > 0 && updatedChallenges.every(c => c.completed);
    if (allDone) {
      // Toast spécial "Journée parfaite" avec délai pour laisser le dernier toast s'afficher
      setTimeout(() => {
        showToast('🏆 Journée parfaite ! Revenez demain pour de nouveaux défis !', '🌟');
      }, 2500);
    }
  }, [showToast]);

  // ── Action principale : tap sur "Relever le défi" ─────────────────────────
  const handleAction = useCallback(async (uc: UserChallenge) => {
    if (uc.completed) return;
    const c = uc.challenge;

    // Défis manual : complétion directe
    if (c.action_type === 'manual') {
      // Optimiste local
      applyLocalUpdate(uc.id, 1, true, c.points, c.action_count);
      const ok = await completeChallenge(
        uc.id, c.points, c.badge_reward, c.slug, c.titre,
      );
      if (ok) {
        showToast(`+${c.points} pts ! ${c.badge_reward ?? '✨'}`, c.badge_reward ?? '🏆');
        const [st, bg] = await Promise.all([getUserStreak(), getUserBadges()]);
        setStreak(st);
        setBadges(bg);
        // Vérifier si tous complétés après mise à jour
        setChallenges((prev: UserChallenge[]) => {
          const updated = prev.map((x: UserChallenge) => x.id === uc.id ? { ...x, completed: true, progress: 1, points_earned: c.points } : x);
          checkAllDone(updated);
          return updated;
        });
      } else {
        await loadAll();
      }
      return;
    }

    // visit_map : naviguer vers la carte — triggerChallengeAction('visit_map') crédite au focus
    if (c.action_type === 'visit_map') {
      router.push('/(app)/(tabs)/carte' as RelativePathString);
      return;
    }

    // ── Défis "action réelle requise" : naviguer SANS créditer ──────────────
    // triggerChallengeAction() dans la page cible crédite le progrès au moment
    // où l'utilisateur fait vraiment l'action (like, message, consultation profil…)
    // On ne touche PAS à la progression ici — juste naviguer.
    const ACTION_NAV_ONLY: ChallengeActionType[] = [
      'send_message', 'send_like', 'view_profiles', 'astro_comment',
      // Ces types requièrent une vraie action dans la page cible avant crédit
      'write_roman', 'write_intention', 'update_bio', 'share_song',
      'complete_profile', 'answer_quiz',
    ];
    if (ACTION_NAV_ONLY.includes(c.action_type as ChallengeActionType)) {
      switch (c.action_type) {
        case 'send_message':
        case 'send_like':
        case 'view_profiles':
        case 'astro_comment':
          router.push('/(app)/(tabs)/home' as RelativePathString); break;
        case 'write_roman':
        case 'write_intention':
          router.push('/(app)/(tabs)/roman' as RelativePathString); break;
        case 'update_bio':
        case 'share_song':
        case 'complete_profile':
        case 'answer_quiz':
          router.push('/(app)/(tabs)/profil' as RelativePathString); break;
        default: break;
      }
      return;
    }

    // ── Aucun autre type connu — ne rien faire ─────────────────────────────
  }, [applyLocalUpdate, showToast, loadAll, checkAllDone]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const doneCount  = challenges.filter((c: UserChallenge) => c.completed).length;
  const totalCount = challenges.length;
  const dayPct     = totalCount > 0 ? doneCount / totalCount : 0;
  // Points gagnés aujourd'hui = somme des points_earned des challenges complétés du jour
  const dayPoints  = challenges
    .filter((c: UserChallenge) => c.completed)
    .reduce((sum: number, c: UserChallenge) => sum + (c.points_earned ?? 0), 0);

  const filtered = (() => {
    const base = filter === 'all'
      ? challenges
      : challenges.filter((c: UserChallenge) => c.challenge.type === filter);
    // Tri : reportés (⚠️) → non complétés → complétés (grisés en bas)
    return [...base].sort((a, b) => {
      const rank = (x: UserChallenge) =>
        x.completed ? 2 : x.is_carry_over ? 0 : 1;
      return rank(a) - rank(b);
    });
  })();

  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground>
        <PageHeader
          title="🔥 Défis du Jour"
          subtitle={`Renouvellement dans ${countdown}`}
          actions={[
            { emoji: '🔔', onPress: () => router.push('/(app)/notifications' as RelativePathString) },
          ]}
        />

        {/* Toast */}
        {toast && <Toast emoji={toast.emoji} msg={toast.msg} />}

        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          <View style={{
            paddingHorizontal: px,
            maxWidth: isWide ? contentMaxWidth : undefined,
            alignSelf: isWide ? 'center' as const : undefined,
            width: isWide ? '100%' : undefined,
          }}>

            {/* Streak */}
            {streak.current_streak > 0 && <StreakBanner streak={streak} />}

            {/* Progression du jour + état en un seul bloc compact */}
            <LinearGradient
              colors={allDone ? ['rgba(255,215,0,0.18)', 'rgba(75,0,130,0.35)'] : ['rgba(75,0,130,0.4)', 'rgba(13,13,26,0.6)']}
              style={{
                borderRadius: 18, padding: 16, marginBottom: 12,
                borderWidth: 1, borderColor: allDone ? 'rgba(255,215,0,0.5)' : 'rgba(255,215,0,0.15)',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: 14 }}>
                  {allDone ? '🏆 Journée parfaite !' : '✦ Progression du jour'}
                </Text>
                <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: 18 }}>
                  {doneCount}/{totalCount}
                </Text>
              </View>
              <ProgressBar pct={dayPct} color="#FFD700" />
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: captionSize, marginTop: 6 }}>
                {allDone
                  ? `✨ Bravo ! ${dayPoints} pts gagnés aujourd'hui — revenez demain !`
                  : (() => {
                      const remaining = challenges.filter((c: UserChallenge) => !c.completed);
                      const carryOvers = remaining.filter((c: UserChallenge) => c.is_carry_over);
                      if (carryOvers.length > 0)
                        return `⚠️ ${carryOvers.length} défi${carryOvers.length > 1 ? 's' : ''} reporté${carryOvers.length > 1 ? 's' : ''} d'hier — termine-les en priorité !`;
                      return `${remaining.length} défi${remaining.length > 1 ? 's' : ''} restant${remaining.length > 1 ? 's' : ''} · ${dayPoints} pts gagnés`;
                    })()
                }
              </Text>
              {/* Bouton nouvelles missions — uniquement si tout complété */}
              {allDone && (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Pressable
                    onPress={handleReload}
                    disabled={reloading}
                    style={{
                      flex: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16,
                      backgroundColor: reloading ? 'rgba(255,215,0,0.08)' : 'rgba(255,215,0,0.22)',
                      borderWidth: 1.5, borderColor: 'rgba(255,215,0,0.55)',
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {reloading ? <ActivityIndicator color="#FFD700" size="small" /> : <Text style={{ fontSize: 16 }}>✨</Text>}
                    <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: captionSize + 1 }}>
                      {reloading ? 'Chargement…' : 'Nouvelles missions !'}
                    </Text>
                  </Pressable>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    backgroundColor: 'rgba(255,215,0,0.06)', borderRadius: 10,
                    paddingHorizontal: 10, paddingVertical: 8,
                    borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)',
                  }}>
                    <Text style={{ fontSize: 13 }}>⏰</Text>
                    <Text style={{ color: 'rgba(255,215,0,0.7)', fontWeight: '600', fontSize: captionSize - 1 }}>
                      {countdown}
                    </Text>
                  </View>
                </View>
              )}
            </LinearGradient>

            {/* Badges */}
            <BadgeGrid badges={badges} />

            {/* Filtres */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 14 }}
            >
              {FILTERS.map(f => {
                  // Compteur par catégorie
                  const count = f.key === 'all'
                    ? challenges.length
                    : challenges.filter((c: UserChallenge) => c.challenge.type === f.key).length;
                  const doneInFilter = f.key === 'all'
                    ? challenges.filter((c: UserChallenge) => c.completed).length
                    : challenges.filter((c: UserChallenge) => c.challenge.type === f.key && c.completed).length;
                  const isActive = filter === f.key;
                  const isEmpty  = count === 0;
                  return (
                    <Pressable
                      // @ts-ignore
                      key={f.key}
                      onPress={() => !isEmpty && setFilter(f.key)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
                        backgroundColor: isActive ? 'rgba(255,215,0,0.18)' : isEmpty ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                        borderWidth: 1,
                        borderColor: isActive ? 'rgba(255,215,0,0.5)' : isEmpty ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                        flexDirection: 'row', alignItems: 'center', gap: 5,
                        opacity: isEmpty ? 0.4 : 1,
                      }}
                    >
                      <Text style={{ fontSize: bodySize - 1 }}>{f.emoji}</Text>
                      <Text style={{
                        color: isActive ? '#FFD700' : 'rgba(255,255,255,0.55)',
                        fontSize: bodySize - 1, fontWeight: isActive ? '800' : '500',
                      }}>
                        {f.label}
                      </Text>
                      {/* Badge compteur : X/total */}
                      {count > 0 && (
                        <View style={{
                          backgroundColor: isActive ? 'rgba(255,215,0,0.25)' : 'rgba(255,255,255,0.08)',
                          borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1,
                          minWidth: 22, alignItems: 'center',
                        }}>
                          <Text style={{
                            color: isActive ? '#FFD700' : doneInFilter === count ? '#4ade80' : 'rgba(255,255,255,0.55)',
                            fontSize: captionSize, fontWeight: '700',
                          }}>
                            {doneInFilter === count ? '✓' : `${doneInFilter}/${count}`}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
            </ScrollView>

            {/* Liste */}
            {loading ? (
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <ActivityIndicator color="#FFD700" size="large" />
                <Text style={{ color: 'rgba(255,215,0,0.75)', marginTop: 12, fontSize: bodySize }}>
                  Chargement de vos défis…
                </Text>
              </View>
            ) : filtered.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
                <Text style={{ fontSize: 48 }}>
                  {filter === 'weekly' ? '📆' : filter === 'social' ? '💑' : filter === 'creative' ? '🎨' : filter === 'reflexion' ? '🔮' : '🌌'}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: bodySize, fontWeight: '700', textAlign: 'center' }}>
                  {filter === 'weekly'    ? 'Pas de défi hebdo ce jour'
                  : filter === 'social'   ? 'Pas de défi social aujourd\'hui'
                  : filter === 'creative' ? 'Pas de défi créatif aujourd\'hui'
                  : filter === 'reflexion'? 'Pas de défi réflexion aujourd\'hui'
                  : 'Aucun défi disponible'}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.40)', fontSize: captionSize, textAlign: 'center', maxWidth: 260 }}>
                  {filter === 'weekly'
                    ? 'Les défis hebdomadaires changent chaque lundi.'
                    : 'Ce type de défi peut ne pas être dans ton lot du jour — reviens demain !'}
                </Text>
              </View>
            ) : (
              filtered.map((uc: UserChallenge) => (
                <ChallengeCard
                  // @ts-ignore
                  key={uc.id}
                  uc={uc}
                  onAction={handleAction}
                />
              ))
            )}

            {/* Encart inspiration */}
            {!loading && (
              <LinearGradient
                colors={['rgba(75,0,130,0.3)', 'rgba(114,47,55,0.3)']}
                style={{
                  borderRadius: 18, padding: 16, marginTop: 4,
                  borderWidth: 1, borderColor: 'rgba(255,215,0,0.1)',
                }}
              >
                <Text style={{ color: '#FFD700', fontWeight: '800', marginBottom: 6 }}>💡 Le savais-tu ?</Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: bodySize, lineHeight: bodySize * 1.55 }}>
                  Compléter des défis 7 jours de suite débloque le badge 👑 Âme Couronnée.
                  La séduction, c'est aussi une discipline.
                </Text>
              </LinearGradient>
            )}
          </View>

          <View style={{ height: insets.bottom + 24 }} />
        </ScrollView>
      </CosmicBackground>
    </View>
  );
}
