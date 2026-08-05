// Aevyra – Notifications (Signal du Cosmos)
import React, { useCallback, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, router, type RelativePathString } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, CheckCheck, Settings, Trash2, RefreshCw, X } from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import { useResponsive } from '@/hooks/useResponsive';
import { useNotifBadge } from '@/hooks/useNotifBadge';
import { supabase } from '@/client/supabase';
import { useSession } from '@/ctx';
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
  type Notification,
} from '@/lib/amour-api';

// ── Config visuelle par type ──────────────────────────────
const TYPE_CONFIG: Record<string, {
  icon: string; label: string;
  gradient: readonly [string, string];
  accent: string; glow: string;
  navTarget?: (relatedId: string) => string;
}> = {
  match: {
    icon: '🌌', label: 'Connexion Cosmique',
    gradient: ['rgba(114,47,55,0.55)', 'rgba(75,0,130,0.45)'],
    accent: '#FF69B4', glow: '#FF69B480',
    navTarget: (id) => `/(app)/chat/${id}`,
  },
  message: {
    icon: '🪶', label: 'Nouveau Message',
    gradient: ['rgba(75,0,130,0.50)', 'rgba(26,10,46,0.65)'],
    accent: '#9B59B6', glow: '#9B59B680',
    navTarget: (id) => `/(app)/chat/${id}`,
  },
  like: {
    icon: '✦', label: 'Signal Reçu',
    gradient: ['rgba(255,105,180,0.25)', 'rgba(13,5,30,0.80)'],
    accent: '#FF69B4', glow: '#FF69B440',
  },
  destin: {
    icon: '🔮', label: 'Coup du Destin',
    gradient: ['rgba(75,0,130,0.60)', 'rgba(114,47,55,0.40)'],
    accent: '#DDA0DD', glow: '#DDA0DD80',
  },
  synchronicite: {
    icon: '⚡', label: 'Synchronicité',
    gradient: ['rgba(26,10,46,0.70)', 'rgba(75,0,130,0.50)'],
    accent: '#87CEEB', glow: '#87CEEB80',
  },
  evenement: {
    icon: '🌟', label: 'Événement',
    gradient: ['rgba(75,0,130,0.45)', 'rgba(26,10,46,0.65)'],
    accent: '#FFD700', glow: '#FFD70050',
    navTarget: () => '/(app)/evenements',
  },
};

// ── Date relative lisible ─────────────────────────────────
function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'À l\'instant';
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `Il y a ${d}j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ── Groupement par section temporelle ────────────────────
function groupNotifs(notifs: Notification[]): { label: string; data: Notification[] }[] {
  const now = new Date();
  const today: Notification[] = [];
  const week: Notification[]  = [];
  const older: Notification[] = [];
  for (const n of notifs) {
    const diffH = (now.getTime() - new Date(n.created_at).getTime()) / 3600000;
    if (diffH < 24)  today.push(n);
    else if (diffH < 168) week.push(n);
    else older.push(n);
  }
  const groups: { label: string; data: Notification[] }[] = [];
  if (today.length)  groups.push({ label: 'Aujourd\'hui',  data: today });
  if (week.length)   groups.push({ label: 'Cette semaine', data: week  });
  if (older.length)  groups.push({ label: 'Plus ancien',   data: older });
  return groups;
}

// ── Carte notification ────────────────────────────────────
function SignalCard({
  notif,
  onRead,
  onDelete,
}: {
  notif: Notification;
  onRead: (n: Notification) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = TYPE_CONFIG[notif.type] ?? {
    icon: notif.emoji, label: 'Signal',
    gradient: ['rgba(75,0,130,0.35)', 'rgba(13,10,30,0.70)'] as const,
    accent: notif.couleur || '#FFD700',
    glow: (notif.couleur || '#FFD700') + '80',
  };
  const accent = notif.couleur || cfg.accent;

  const pulse      = useRef(new Animated.Value(notif.is_read ? 0 : 1)).current;
  const pulseAnim  = useRef<Animated.CompositeAnimation | null>(null);
  const deleteAnim = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const didStart   = useRef(false);

  const startPulse = useCallback(() => {
    if (notif.is_read) return;
    pulseAnim.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.4, duration: 900, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 1,   duration: 900, useNativeDriver: false }),
      ])
    );
    pulseAnim.current.start();
  }, [notif.is_read, pulse]);

  const stopPulse = useCallback(() => {
    pulseAnim.current?.stop();
    Animated.timing(pulse, { toValue: 0, duration: 300, useNativeDriver: false }).start();
  }, [pulse]);

  const handleLayout = useCallback(() => {
    if (!didStart.current && !notif.is_read) { didStart.current = true; startPulse(); }
  }, [notif.is_read, startPulse]);

  const glowOpacity  = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });
  const borderOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.05)', accent + '55'],
  });

  const handlePress = () => { stopPulse(); onRead(notif); };

  const handleDelete = () => {
    stopPulse();
    Animated.parallel([
      Animated.timing(translateX,  { toValue: 80,  duration: 200, useNativeDriver: true }),
      Animated.timing(deleteAnim, { toValue: 0,   duration: 220, useNativeDriver: true }),
    ]).start(() => onDelete(notif.id));
  };

  return (
    <Animated.View style={{ opacity: deleteAnim, transform: [{ translateX }], marginBottom: 10 }}>
      <Pressable onPress={handlePress} onLayout={handleLayout}>
        {!notif.is_read && (
          <Animated.View style={{
            position: 'absolute', inset: -4, borderRadius: 26,
            backgroundColor: accent + '18', opacity: glowOpacity,
          }} />
        )}
        <Animated.View style={{
          borderRadius: 22, borderWidth: 1.5,
          borderColor: notif.is_read ? 'rgba(255,255,255,0.06)' : borderOpacity,
          overflow: 'hidden',
        }}>
          <LinearGradient
            colors={notif.is_read ? ['rgba(20,12,36,0.50)', 'rgba(13,10,24,0.55)'] : cfg.gradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ padding: 16 }}
          >
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
              {/* Orbe d'émotion */}
              <View style={{ alignItems: 'center', gap: 5 }}>
                <View style={{
                  width: 54, height: 54, borderRadius: 27,
                  backgroundColor: accent + (notif.is_read ? '12' : '22'),
                  borderWidth: 1.5,
                  borderColor: accent + (notif.is_read ? '25' : '55'),
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 24 }}>{notif.emoji || cfg.icon}</Text>
                </View>
                <View style={{
                  paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
                  backgroundColor: accent + '20',
                  borderWidth: 1, borderColor: accent + '35',
                }}>
                  <Text style={{ color: accent, fontSize: 11, fontWeight: '800' }}>
                    {cfg.label.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Contenu */}
              <View style={{ flex: 1, gap: 5 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={{
                    color: notif.is_read ? 'rgba(255,255,255,0.60)' : '#F5E6C8',
                    fontWeight: notif.is_read ? '600' : '800',
                    fontSize: 14, flex: 1, lineHeight: 20,
                  }}>
                    {notif.title}
                  </Text>
                  {!notif.is_read && (
                    <View style={{
                      width: 8, height: 8, borderRadius: 4,
                      backgroundColor: accent, marginTop: 4, marginLeft: 8,
                      shadowColor: accent, shadowRadius: 4, shadowOpacity: 0.8,
                      shadowOffset: { width: 0, height: 0 },
                    }} />
                  )}
                </View>

                <Text style={{
                  color: notif.is_read ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.80)',
                  fontSize: 13, lineHeight: 20,
                  fontStyle: notif.type === 'destin' || notif.type === 'synchronicite' ? 'italic' : 'normal',
                }}>
                  {notif.body}
                </Text>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
                    {relativeDate(notif.created_at)}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    {cfg.navTarget && !notif.is_read && (
                      <View style={{
                        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14,
                        backgroundColor: accent + '25', borderWidth: 1, borderColor: accent + '45',
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                      }}>
                        <Text style={{ color: accent, fontSize: 10, fontWeight: '800' }}>
                          {notif.type === 'match' ? 'Ouvrir' : notif.type === 'message' ? 'Lire' : 'Voir'}
                        </Text>
                        <Text style={{ color: accent, fontSize: 10 }}>›</Text>
                      </View>
                    )}
                    <Pressable
                      onPress={handleDelete}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: 'rgba(255,80,80,0.12)',
                        borderWidth: 1, borderColor: 'rgba(255,80,80,0.25)',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <X size={12} color="#FF5050" />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ── Filtres par type ──────────────────────────────────────
const FILTERS: { key: string; icon: string; label: string }[] = [
  { key: 'all',           icon: '🌌', label: 'Tout' },
  { key: 'match',         icon: '💫', label: 'Connexions' },
  { key: 'message',       icon: '🪶', label: 'Messages' },
  { key: 'like',          icon: '✦',  label: 'Signaux' },
  { key: 'destin',        icon: '🔮', label: 'Destin' },
  { key: 'synchronicite', icon: '⚡', label: 'Sync' },
  { key: 'evenement',     icon: '🌟', label: 'Événements' },
];

// ── Page principale ───────────────────────────────────────
export default function Notifications() { 
  const insets = useSafeAreaInsets();
  const { px, bodySize: _bodySize, captionSize: _captionSize, h3Size: _h3Size, contentMaxWidth, is4K: _is4K, isCinema: _isCinema, isFullHD: _isFullHD, isLargeDesktop: _isLargeDesktop, isDesktop, isTablet, isTV  } = useResponsive();
  const isWide = isDesktop || isTablet || isTV;
  const { refresh: refreshBadge } = useNotifBadge();
  const { session } = useSession();

  const [notifs, setNotifs]         = useState<Notification[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setFilter]   = useState('all');
  const [deleting, setDeleting]     = useState(false);

  // Animation rotation icône refresh
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef<Animated.CompositeAnimation | null>(null);
  const startSpin = useCallback(() => {
    spinAnim.setValue(0);
    spinLoop.current = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 700, useNativeDriver: true })
    );
    spinLoop.current.start();
  }, [spinAnim]);
  const stopSpin = useCallback(() => {
    spinLoop.current?.stop();
    spinAnim.setValue(0);
  }, [spinAnim]);
  const spinDeg = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const loadNotifs = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await getMyNotifications();
      setNotifs(data);
    } catch (e) {
      console.error('[Notifications] Chargement échoué', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      stopSpin();
    }
  }, [stopSpin]);

  useFocusEffect(
    useCallback(() => {
      loadNotifs(true);
      const uid = (session as { user?: { id?: string } })?.user?.id;
      if (!uid) return () => { void refreshBadge(); };

      const channel = supabase
        .channel(`notif-page-${uid}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
          () => { loadNotifs(false); }
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(channel);
        void refreshBadge();
      };
    }, [loadNotifs, refreshBadge, session])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    startSpin();
    loadNotifs(true);
  }, [loadNotifs, startSpin]);

  const handleRead = useCallback(async (notif: Notification) => {
    if (!notif.is_read) {
      await markNotificationRead(notif.id);
      setNotifs((prev: any[]) => prev.map((n: any) => n.id === notif.id ? { ...n, is_read: true } : n));
      void refreshBadge();
    }
    const cfg = TYPE_CONFIG[notif.type];
    if (cfg?.navTarget && notif.related_id) {
      router.push(cfg.navTarget(notif.related_id) as RelativePathString);
    } else if (notif.type === 'evenement') {
      router.push('/(app)/evenements' as RelativePathString);
    }
  }, [refreshBadge]);

  const handleMarkAll = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setNotifs((prev: any[]) => prev.map((n: any) => ({ ...n, is_read: true })));
      void refreshBadge();
    } catch (e) {
      console.error('[Notifications] markAll échoué', e);
    }
  }, [refreshBadge]);

  const handleDelete = useCallback(async (id: string) => {
    setNotifs((prev: any[]) => prev.filter((n: any) => n.id !== id));
    try {
      await deleteNotification(id);
      void refreshBadge();
    } catch (e) {
      console.error('[Notifications] delete échoué', e);
      loadNotifs(false);
    }
  }, [refreshBadge, loadNotifs]);

  const handleDeleteAll = useCallback(async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteAllNotifications();
      setNotifs([]);
      void refreshBadge();
    } catch (e) {
      console.error('[Notifications] deleteAll échoué', e);
    } finally {
      setDeleting(false);
    }
  }, [deleting, refreshBadge]);

  const unreadCount = notifs.filter((n: any) => !n.is_read).length;
  const filtered    = activeFilter === 'all' ? notifs : notifs.filter((n: any) => n.type === activeFilter);
  const groups      = groupNotifs(filtered);

  type ListItem =
    | { kind: 'header'; label: string; key: string }
    | { kind: 'notif';  notif: Notification; key: string };

  const flatData: ListItem[] = groups.flatMap(g => [
    { kind: 'header' as const, label: g.label, key: `h-${g.label}` },
    ...g.data.map(n => ({ kind: 'notif' as const, notif: n, key: n.id })),
  ]);

  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground>

        {/* ── En-tête ── */}
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: px, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              onPress={() => router.back()}
              style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: 'rgba(255,215,0,0.10)',
                borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ChevronLeft size={20} color="#FFD700" />
            </Pressable>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: '#F5E6C8', fontSize: 22, fontWeight: '900', letterSpacing: 0.3 }}>
                  Signaux du Cosmos
                </Text>
                {unreadCount > 0 && (
                  <View style={{
                    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
                    backgroundColor: '#FF69B4', minWidth: 22, alignItems: 'center',
                  }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 }}>
                {unreadCount > 0
                  ? `${unreadCount} signal${unreadCount > 1 ? 's' : ''} non-lu${unreadCount > 1 ? 's' : ''}`
                  : 'Vous êtes à jour · Cosmos en paix'}
              </Text>
            </View>

            {/* Actions en-tête */}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pressable
                onPress={handleRefresh}
                style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: 'rgba(96,165,250,0.10)',
                  borderWidth: 1, borderColor: 'rgba(96,165,250,0.25)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
                  <RefreshCw size={16} color="#60A5FA" />
                </Animated.View>
              </Pressable>
              {unreadCount > 0 && (
                <Pressable
                  onPress={handleMarkAll}
                  style={{
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: 'rgba(255,215,0,0.10)',
                    borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <CheckCheck size={16} color="#FFD700" />
                </Pressable>
              )}
              {notifs.length > 0 && (
                <Pressable
                  onPress={handleDeleteAll}
                  disabled={deleting}
                  style={{
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: 'rgba(255,80,80,0.10)',
                    borderWidth: 1, borderColor: 'rgba(255,80,80,0.25)',
                    alignItems: 'center', justifyContent: 'center',
                    opacity: deleting ? 0.5 : 1,
                  }}
                >
                  <Trash2 size={16} color="#FF5050" />
                </Pressable>
              )}
              <Pressable
                onPress={() => router.push('/(app)/parametres' as RelativePathString)}
                style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Settings size={15} color="rgba(255,255,255,0.5)" />
              </Pressable>
            </View>
          </View>

          {/* Barre de progression non-lus */}
          {notifs.length > 0 && (
            <View style={{ marginTop: 12, gap: 4 }}>
              <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                <View style={{
                  height: 3, borderRadius: 2,
                  backgroundColor: unreadCount === 0 ? '#64FFB4' : '#FF69B4',
                  width: `${Math.round(((notifs.length - unreadCount) / notifs.length) * 100)}%`,
                }} />
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, textAlign: 'right' }}>
                {notifs.length - unreadCount}/{notifs.length} lus
              </Text>
            </View>
          )}
        </View>

        {/* ── Filtres par type ── */}
        {!loading && notifs.length > 0 && (
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: px, gap: 8, paddingBottom: 12 }}
          >
            {FILTERS.map(f => {
              const count  = f.key === 'all'
                ? notifs.filter((n: any) => !n.is_read).length
                : notifs.filter((n: any) => n.type === f.key && !n.is_read).length;
              const active = activeFilter === f.key;
              const accent = TYPE_CONFIG[f.key]?.accent ?? '#FFD700';
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7,
                    borderRadius: 22, borderWidth: 1.5,
                    borderColor: active ? accent : 'rgba(255,255,255,0.10)',
                    backgroundColor: active ? accent + '22' : 'rgba(255,255,255,0.04)',
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                  }}
                >
                  <Text style={{ fontSize: 12 }}>{f.icon}</Text>
                  <Text style={{ color: active ? accent : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '700' }}>
                    {f.label}
                  </Text>
                  {count > 0 && (
                    <View style={{
                      width: 16, height: 16, borderRadius: 8,
                      backgroundColor: active ? accent : 'rgba(255,100,150,0.8)',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>
                        {count > 9 ? '9+' : count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* ── Contenu ── */}
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <ActivityIndicator color="#9B59B6" size="large" />
            <Text style={{ color: 'rgba(155,89,182,0.7)', fontSize: 13, fontStyle: 'italic' }}>
              Le cosmos transmet ses signaux…
            </Text>
          </View>

        ) : notifs.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 }}>
            <Text style={{ fontSize: 64 }}>🌌</Text>
            <Text style={{ color: '#F5E6C8', fontSize: 20, fontWeight: '900', textAlign: 'center' }}>
              Silence cosmique
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 22, fontSize: 14 }}>
              Votre ciel est calme. Dès qu'une âme vous envoie un signal, il apparaît ici instantanément.
            </Text>
            <Pressable
              onPress={handleRefresh}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                paddingHorizontal: 20, paddingVertical: 10,
                borderRadius: 22, borderWidth: 1.5,
                borderColor: 'rgba(96,165,250,0.35)',
                backgroundColor: refreshing ? 'rgba(96,165,250,0.20)' : 'rgba(96,165,250,0.10)',
                opacity: refreshing ? 0.8 : 1,
              }}
            >
              <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
                <RefreshCw size={14} color="#60A5FA" />
              </Animated.View>
              <Text style={{ color: '#60A5FA', fontWeight: '800', fontSize: 13 }}>
                {refreshing ? 'Actualisation…' : 'Actualiser'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(app)/(tabs)/home' as RelativePathString)}
              style={{
                marginTop: 8,
                paddingHorizontal: 24, paddingVertical: 12,
                borderRadius: 22, borderWidth: 1.5,
                borderColor: 'rgba(155,89,182,0.45)',
                backgroundColor: 'rgba(155,89,182,0.15)',
              }}
            >
              <Text style={{ color: '#DDA0DD', fontWeight: '800', fontSize: 13 }}>
                💫 Explorer la Constellation
              </Text>
            </Pressable>
          </View>

        ) : filtered.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Text style={{ fontSize: 40 }}>🔍</Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, fontStyle: 'italic' }}>
              Aucun signal de ce type pour l'instant
            </Text>
          </View>

        ) : (
          <FlatList<ListItem>
            data={flatData}
            keyExtractor={(item) => item.key}
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            bounces
            overScrollMode="always"
            contentContainerStyle={{
              paddingHorizontal: px,
              paddingBottom: 40,
              maxWidth: isWide ? contentMaxWidth : undefined,
              alignSelf: isWide ? 'center' as const : undefined,
              width: isWide ? '100%' : undefined,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#9B59B6"
                colors={['#9B59B6', '#FF69B4']}
              />
            }
            renderItem={({ item }) => {
              if (item.kind === 'header') {
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, marginTop: 14 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }}>
                      {item.label.toUpperCase()}
                    </Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />
                  </View>
                );
              }
              return (
                <SignalCard notif={item.notif} onRead={handleRead} onDelete={handleDelete} />
              );
            }}
          />
        )}
      </CosmicBackground>
    </View>
  );
}
