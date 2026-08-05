// Layout espace admin — guard sécurité + NavBar admin propre
// Totalement séparé du layout utilisateur (pas de pill, pas de IncomingCallBanner)
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Redirect, Stack, router, usePathname, useFocusEffect } from 'expo-router';
import {
  ActivityIndicator, Animated, Pressable,
  Text, View, useWindowDimensions, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard, Users, Flag, Settings2, ClipboardList, ShieldOff,
} from 'lucide-react-native';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { supabase } from '@/client/supabase';

const GOLD   = '#C9A96E';
const BG     = '#0A0A14';

// Onglets de la nav admin
const ADMIN_TABS = [
  { name: 'dashboard',  emoji: '📊', label: 'Dashboard',    icon: LayoutDashboard },
  { name: 'users',      emoji: '👥', label: 'Utilisateurs', icon: Users },
  { name: 'sanctions',  emoji: '🛡️', label: 'Sanctions',    icon: ShieldOff },
  { name: 'reports',    emoji: '🚩', label: 'Signalements', icon: Flag },
  { name: 'content',    emoji: '⚙️', label: 'Contenu',      icon: Settings2 },
  { name: 'logs',       emoji: '📋', label: 'Journal',      icon: ClipboardList },
] as const;

// Résout le nom de l'onglet depuis le pathname
function resolveTab(pathname: string): string {
  const seg = pathname.split('/').pop() ?? 'dashboard';
  // "(admin)" ou racine → dashboard
  if (seg === '(admin)' || seg === '') return 'dashboard';
  return ADMIN_TABS.some(t => t.name === seg) ? seg : 'dashboard';
}

// ── Item de la pill mobile admin ─────────────────────────────────────────────
function AdminMobileItem({
  tab, focused, onPress, badge,
}: { key?: React.Key; tab: typeof ADMIN_TABS[number]; focused: boolean; onPress: () => void; badge?: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow  = useRef(new Animated.Value(0)).current;
  // Animation pulse du badge
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: focused ? 1.12 : 1, useNativeDriver: true, speed: 22, bounciness: 10 }),
      Animated.timing(glow,  { toValue: focused ? 1 : 0, duration: 200, useNativeDriver: false }),
    ]).start();
  }, [focused, scale, glow]);

  useEffect(() => {
    if (!badge) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [badge, pulse]);

  const bg = glow.interpolate({ inputRange: [0,1], outputRange: ['rgba(201,169,110,0)', 'rgba(201,169,110,0.16)'] });

  return (
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 6, paddingVertical: 5, borderRadius: 14,
        backgroundColor: bg, transform: [{ scale }],
        borderWidth: focused ? 1 : 0,
        borderColor: focused ? `${GOLD}60` : 'transparent',
        minWidth: 48, gap: 2,
      }}>
        <View style={{ position: 'relative' }}>
          <Text style={{ fontSize: focused ? 20 : 17, lineHeight: 24 }}>{tab.emoji}</Text>
          {!!badge && (
            <Animated.View style={{
              position: 'absolute', top: -4, right: -6,
              backgroundColor: '#FF3B30', borderRadius: 10,
              minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
              paddingHorizontal: 3,
              transform: [{ scale: pulse }],
            }}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900', lineHeight: 14 }}>
                {badge > 99 ? '99+' : badge}
              </Text>
            </Animated.View>
          )}
        </View>
        <Text numberOfLines={1} style={{
          fontSize: 11, fontWeight: focused ? '800' : '400',
          color: focused ? GOLD : 'rgba(201,169,110,0.38)', letterSpacing: 0.2,
        }}>
          {tab.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ── Item sidebar desktop/tablette admin ──────────────────────────────────────
function AdminSidebarItem({
  tab, focused, onPress, isDesktop, badge,
}: { key?: React.Key; tab: typeof ADMIN_TABS[number]; focused: boolean; onPress: () => void; isDesktop: boolean; badge?: number }) {
  const glow  = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(glow, { toValue: focused ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [focused, glow]);

  useEffect(() => {
    if (!badge) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [badge, pulse]);

  const bg = glow.interpolate({ inputRange: [0,1], outputRange: ['rgba(201,169,110,0)', 'rgba(201,169,110,0.12)'] });

  return (
    <Pressable onPress={onPress} style={{ marginVertical: 2 }}>
      <Animated.View style={{
        flexDirection: isDesktop ? 'row' : 'column',
        alignItems: 'center', justifyContent: isDesktop ? 'flex-start' : 'center',
        paddingVertical: isDesktop ? 12 : 10,
        paddingHorizontal: isDesktop ? 16 : 8,
        marginHorizontal: 8, borderRadius: 14,
        backgroundColor: bg,
        borderWidth: focused ? 1 : 0,
        borderColor: focused ? `${GOLD}40` : 'transparent',
        gap: isDesktop ? 12 : 4,
      }}>
        {focused && isDesktop && (
          <View style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 2, backgroundColor: GOLD }} />
        )}
        <View style={{ position: 'relative' }}>
          <Text style={{ fontSize: isDesktop ? 20 : 22 }}>{tab.emoji}</Text>
          {!!badge && (
            <Animated.View style={{
              position: 'absolute', top: -4, right: -6,
              backgroundColor: '#FF3B30', borderRadius: 10,
              minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
              paddingHorizontal: 3,
              transform: [{ scale: pulse }],
            }}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900', lineHeight: 14 }}>
                {badge > 99 ? '99+' : badge}
              </Text>
            </Animated.View>
          )}
        </View>
        <Text numberOfLines={1} style={{
          fontSize: isDesktop ? 13 : 9,
          fontWeight: focused ? '800' : '400',
          color: focused ? GOLD : 'rgba(201,169,110,0.45)',
          flex: isDesktop ? 1 : undefined,
        }}>
          {tab.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function AdminLayout() {
  const { isAdmin, loading } = useAdminGuard();
  const insets   = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pathname  = usePathname();

  const isTablet  = width >= 768;
  const isDesktop = width >= 1024;
  const isMobile  = !isTablet;
  const activeTab = resolveTab(pathname);

  // ── Badge Signalements : compte les reports pending en temps réel ──────────
  const [pendingReports, setPendingReports] = useState(0);

  // Chargement initial du count
  useFocusEffect(useCallback(() => {
    (async () => {
      const { count } = await supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      setPendingReports(count ?? 0);
    })();
  }, []));

  // Realtime : écouter les nouveaux signalements en temps réel
  useEffect(() => {
    const channel = supabase
      .channel('admin-reports-badge')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reports',
      }, () => {
        // Re-fetch le count à chaque changement
        supabase
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .then(({ count }) => setPendingReports(count ?? 0));
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  const navigate = (name: string) => {
    if (name === 'dashboard') router.push('/(admin)/dashboard' as never);
    else router.push(`/(admin)/${name}` as never);
  };

  // ── Chargement ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={GOLD} size="large" />
      </View>
    );
  }

  // ── Non-admin → redirection ─────────────────────────────────────────────
  if (!isAdmin) {
    return <Redirect href="/(app)/(tabs)/home" />;
  }

  // ── Desktop / Tablette : sidebar gauche ─────────────────────────────────
  if (!isMobile) {
    const sideW = isDesktop ? 210 : 72;
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: BG }}>
        <StatusBar style="light" backgroundColor={BG} />
        {/* Sidebar admin — couleur distincte du sidebar utilisateur */}
        <View style={{
          width: sideW, backgroundColor: '#0D0D1F',
          borderRightWidth: 1, borderRightColor: `${GOLD}18`,
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: Math.max(insets.bottom, 20),
        }}>
          {/* En-tête sidebar */}
          <View style={{
            alignItems: isDesktop ? 'flex-start' : 'center',
            paddingHorizontal: isDesktop ? 20 : 0,
            marginBottom: 24,
          }}>
            <View style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: `${GOLD}20`, borderWidth: 1, borderColor: `${GOLD}40`,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 20 }}>🛡️</Text>
            </View>
            {isDesktop && (
              <Text style={{ color: GOLD, fontSize: 13, fontWeight: '800', marginTop: 6, letterSpacing: 0.5 }}>
                Admin
              </Text>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}
            overScrollMode="never"
            bounces={false} contentContainerStyle={{ gap: 0 }}>
            {ADMIN_TABS.map(tab => (
              <AdminSidebarItem
                key={tab.name}
                tab={tab}
                focused={activeTab === tab.name}
                isDesktop={isDesktop}
                badge={tab.name === 'reports' ? pendingReports : undefined}
                onPress={() => navigate(tab.name)}
              />
            ))}
          </ScrollView>

          {isDesktop && (
            <View style={{ paddingHorizontal: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: `${GOLD}10` }}>
              <Text style={{ color: 'rgba(201,169,110,0.25)', fontSize: 10 }}>Aevyra Admin</Text>
            </View>
          )}
        </View>

        {/* Contenu principal */}
        <View style={{ flex: 1, backgroundColor: BG }}>
          <Stack screenOptions={{ headerShown: false }}>
            {ADMIN_TABS.map(t => <React.Fragment key={t.name}><Stack.Screen name={t.name} /></React.Fragment>)}
          </Stack>
        </View>
      </View>
    );
  }

  // ── Mobile : pill flottante admin en bas ─────────────────────────────────
  const pillH = 62;
  const pillBottom = Math.max(insets.bottom, 10) + 8;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar style="light" backgroundColor={BG} />
      {/* Contenu avec espace réservé sous la pill */}
      <View style={{ flex: 1, paddingBottom: pillBottom + pillH + 8 }}>
        <Stack screenOptions={{ headerShown: false }}>
          {ADMIN_TABS.map(t => <React.Fragment key={t.name}><Stack.Screen name={t.name} /></React.Fragment>)}
        </Stack>
      </View>

      {/* Pill flottante admin — style doré différent de la pill violette utilisateur */}
      <View pointerEvents="box-none" style={{
        position: 'absolute', bottom: pillBottom, left: 12, right: 12, zIndex: 999,
      }}>
        {/* Halo doré */}
        <View style={{
          position: 'absolute', inset: -4, borderRadius: 32,
          backgroundColor: 'rgba(201,169,110,0.08)',
        }} />
        <View style={{
          flexDirection: 'row', alignItems: 'center', height: pillH,
          borderRadius: 32, backgroundColor: 'rgba(13,13,31,0.95)',
          borderWidth: 1, borderColor: `${GOLD}30`, paddingHorizontal: 4,
          shadowColor: GOLD, shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2, shadowRadius: 16, elevation: 12,
        }}>
          {/* Reflet haut */}
          <View style={{
            position: 'absolute', top: 0, left: 20, right: 20, height: 1,
            backgroundColor: `${GOLD}20`, borderRadius: 1,
          }} />
          {ADMIN_TABS.map(tab => (
            <AdminMobileItem
              key={tab.name}
              tab={tab}
              focused={activeTab === tab.name}
              badge={tab.name === 'reports' ? pendingReports : undefined}
              onPress={() => navigate(tab.name)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
