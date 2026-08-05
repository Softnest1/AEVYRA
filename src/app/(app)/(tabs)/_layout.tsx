// Aevyra – Navigation universelle multi-device
// ┌──────────────────────────────────────────────────────────────────────────────┐
// │  📱 Mobile    < 768px  : Floating Pill glassmorphism — centré en bas         │
// │  📟 Tablette  768–1023 : Sidebar gauche fine (78px) — icônes + labels courts │
// │  🖥️  Desktop  1024–1439: Sidebar gauche (220px) — labels complets            │
// │  🖥️  LargeDesk 1440+   : Sidebar (260px) — labels + accès rapides            │
// │  📺  FullHD   1920+    : Sidebar (300px) — police agrandie                   │
// │  📺  4K/Cinéma 3840+   : Sidebar (360px) — tout agrandi                      │
// │  🍎 iOS               : safe area home indicator géré                        │
// │  🤖 Android           : nav bar gestuelle/boutons géré                       │
// │  🌐 Web               : insets.bottom = 0, pas de pill flottante             │
// └──────────────────────────────────────────────────────────────────────────────┘
import React, { useRef, useEffect } from 'react';
import { Tabs, usePathname, router, type RelativePathString } from 'expo-router';
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';
import { Image } from 'expo-image'; // eslint-disable-line no-unused-vars
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AevyraLogo from '@/components/AevyraLogo';
import { useNotifBadge } from '@/hooks/useNotifBadge';
import IncomingCallBanner from '@/components/IncomingCallBanner';

// ── Onglets principaux ────────────────────────────────────────────────────────
const TABS = [
  { name: 'home',   emoji: '💫', label: 'Constellation', shortLabel: 'Ciel'    },
  { name: 'chat',   emoji: '💬', label: 'Plume d\'Or',   shortLabel: 'Plume'   },
  { name: 'roman',  emoji: '🌟', label: 'Roman',         shortLabel: 'Roman'   },
  { name: 'carte',  emoji: '🗺️', label: 'Carte',         shortLabel: 'Carte'   },
  { name: 'profil', emoji: '👤', label: 'Mon Âme',       shortLabel: 'Âme'     },
] as const;

// ── Raccourcis rapides affichés en bas de la sidebar desktop ─────────────────
// (Paramètres, Notifications — inaccessibles autrement sans pill mobile)
const QUICK_LINKS = [
  { emoji: '🔔', label: 'Notifications', route: '/(app)/notifications' as RelativePathString },
  { emoji: '⚙️', label: 'Paramètres',    route: '/(app)/parametres'    as RelativePathString },
] as const;

// ── Petit badge rouge universel ───────────────────────────────────────────────
function NotifDot({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={{
      position: 'absolute', top: -2, right: -4,
      minWidth: 16, height: 16, borderRadius: 8,
      backgroundColor: '#FF3B6B',
      borderWidth: 1.5, borderColor: '#0D0D1A',
      alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 3, zIndex: 10,
    }}>
      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900', lineHeight: 12 }}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

// ── Pill flottante mobile ────────────────────────────────────────────────────
function MobileTabItem({
  tab,
  focused,
  onPress,
  badge,
  emojiSize = 20,
  emojiSizeFocused = 24,
}: {
  key?: React.Key;
  tab: typeof TABS[number];
  focused: boolean;
  onPress: () => void;
  badge?: number;
  emojiSize?: number;
  emojiSizeFocused?: number;
}) {
  const scale  = useRef(new Animated.Value(1)).current;
  const glow   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1.13, useNativeDriver: true, speed: 22, bounciness: 12 }),
        Animated.timing(glow,  { toValue: 1, duration: 220, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 22, bounciness: 4 }),
        Animated.timing(glow,  { toValue: 0, duration: 160, useNativeDriver: false }),
      ]).start();
    }
  }, [focused, scale, glow]);

  const bgColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,215,0,0)', 'rgba(255,215,0,0.18)'],
  });
  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,215,0,0)', 'rgba(255,215,0,0.55)'],
  });

  return (
    <Pressable
      onPress={onPress}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 18,
        backgroundColor: bgColor,
        borderWidth: focused ? 1 : 0,
        borderColor: borderColor,
        transform: [{ scale }],
        minWidth: 52,
        gap: 2,
      }}>
        {/* Emoji + badge overlay */}
        <View style={{ position: 'relative' }}>
          <Text style={{ fontSize: focused ? emojiSizeFocused : emojiSize, lineHeight: emojiSizeFocused + 4 }}>{tab.emoji}</Text>
          <NotifDot count={badge ?? 0} />
        </View>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 11,
            fontWeight: focused ? '800' : '400',
            color: focused ? '#FFD700' : 'rgba(255,255,255,0.38)',
            letterSpacing: focused ? 0.3 : 0,
          }}
        >
          {tab.shortLabel}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ── Sidebar tablette ─────────────────────────────────────────────────────────
function TabletSidebarItem({
  tab,
  focused,
  onPress,
  badge,
}: {
  key?: React.Key;
  tab: typeof TABS[number];
  focused: boolean;
  onPress: () => void;
  badge?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: focused ? 1.08 : 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
      Animated.timing(glow,  { toValue: focused ? 1 : 0, duration: 200, useNativeDriver: false }),
    ]).start();
  }, [focused, scale, glow]);

  const bgColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,215,0,0)', 'rgba(255,215,0,0.14)'],
  });

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
        marginHorizontal: 8,
        marginVertical: 2,
        borderRadius: 16,
        backgroundColor: bgColor,
        borderWidth: focused ? 1 : 0,
        borderColor: focused ? 'rgba(255,215,0,0.4)' : 'transparent',
        transform: [{ scale }],
        gap: 4,
      }}>
        {focused && (
          <View style={{
            position: 'absolute', left: 0, top: 10, bottom: 10,
            width: 3, borderRadius: 2,
            backgroundColor: '#FFD700',
          }} />
        )}
        <View style={{ position: 'relative' }}>
          <Text style={{ fontSize: focused ? 28 : 24 }}>{tab.emoji}</Text>
          <NotifDot count={badge ?? 0} />
        </View>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 10,
            fontWeight: focused ? '800' : '400',
            color: focused ? '#FFD700' : 'rgba(255,255,255,0.65)',
            textAlign: 'center',
          }}
        >
          {tab.shortLabel}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ── Sidebar desktop ──────────────────────────────────────────────────────────
function DesktopSidebarItem({
  tab,
  focused,
  onPress,
  badge,
  isTV = false,
}: {
  key?: React.Key;
  tab: typeof TABS[number];
  focused: boolean;
  onPress: () => void;
  badge?: number;
  isTV?: boolean;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const glow       = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, { toValue: focused ? 4 : 0, useNativeDriver: true, speed: 20, bounciness: 6 }),
      Animated.timing(glow,       { toValue: focused ? 1 : 0, duration: 200, useNativeDriver: false }),
    ]).start();
  }, [focused, translateX, glow]);

  const bgColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,215,0,0)', 'rgba(255,215,0,0.12)'],
  });

  const emojiSize = isTV ? 30 : 22;
  const fontSize  = isTV ? 17 : 14;
  const pyItem    = isTV ? 16 : 13;

  return (
    <Pressable onPress={onPress} style={{ marginVertical: isTV ? 6 : 4 }}>
      <Animated.View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: pyItem,
        paddingHorizontal: 16,
        marginHorizontal: 10,
        borderRadius: 18,
        backgroundColor: bgColor,
        borderWidth: focused ? 1 : 0,
        borderColor: focused ? 'rgba(255,215,0,0.35)' : 'transparent',
        transform: [{ translateX }],
        gap: 12,
      }}>
        {focused && (
          <View style={{
            position: 'absolute', left: 0, top: 8, bottom: 8,
            width: 4, borderRadius: 3,
            backgroundColor: '#FFD700',
          }} />
        )}
        <View style={{ position: 'relative' }}>
          <Text style={{ fontSize: focused ? emojiSize + 4 : emojiSize }}>{tab.emoji}</Text>
          <NotifDot count={badge ?? 0} />
        </View>
        <Text
          numberOfLines={1}
          style={{
            fontSize,
            fontWeight: focused ? '800' : '400',
            color: focused ? '#FFD700' : 'rgba(255,255,255,0.5)',
            letterSpacing: focused ? 0.3 : 0,
            flex: 1,
          }}
        >
          {tab.label}
        </Text>
        {/* Badge texte desktop si non-lu */}
        {(badge ?? 0) > 0 && (
          <View style={{
            paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10,
            backgroundColor: '#FF3B6B',
            minWidth: 20, alignItems: 'center',
          }}>
            <Text style={{ color: '#fff', fontSize: isTV ? 12 : 10, fontWeight: '900' }}>
              {badge! > 99 ? '99+' : badge}
            </Text>
          </View>
        )}
        {focused && (badge ?? 0) === 0 && (
          <View style={{
            width: 6, height: 6, borderRadius: 3,
            backgroundColor: '#FFD700',
          }} />
        )}
      </Animated.View>
    </Pressable>
  );
}

// ── Nav mobile flottante (rendu custom en dehors du tabBarIcon) ──────────────
function FloatingMobileNav({ activeTab, insets }: { activeTab: string; insets: ReturnType<typeof useSafeAreaInsets> }) {
  const safeBottom = Math.max(insets.bottom, process.env.EXPO_OS === 'web' ? 16 : 12);
  const { unreadCount } = useNotifBadge();
  const {  isXS, isPhone: _isPhone, isDesktop: _isDesktop, isLargeDesktop: _isLargeDesktop, isTV: _isTV  } = useResponsive();

  // Badge : home = matchs/signaux non lus, chat = messages non lus
  const getBadge = (name: string) => name === 'home' ? unreadCount : 0;

  // Sur très petits phones (XS < 480px) : pill légèrement moins haute
  const pillH = isXS ? 58 : 68;
  const emojiSize = isXS ? 18 : 20;
  const emojiSizeFocused = isXS ? 21 : 24;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: safeBottom + 8,
        left: isXS ? 8 : 16,
        right: isXS ? 8 : 16,
        zIndex: 999,
      }}
    >
      {/* Halo derrière la pill */}
      <View style={{
        position: 'absolute',
        inset: -4,
        borderRadius: 36,
        backgroundColor: 'rgba(75,0,130,0.25)',
        shadowColor: '#9B59B6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 0,
      }} />

      {/* Pill principale glassmorphism */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: pillH,
        borderRadius: pillH / 2,
        backgroundColor: 'rgba(13,13,26,0.88)',
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.2)',
        paddingHorizontal: isXS ? 2 : 6,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.55,
        shadowRadius: 24,
        elevation: 16,
      }}>
        {/* Reflet glassmorphism en haut */}
        <View style={{
          position: 'absolute',
          top: 0, left: 16, right: 16,
          height: 1,
          backgroundColor: 'rgba(255,255,255,0.12)',
          borderRadius: 1,
        }} />

        {TABS.map(tab => (
          <MobileTabItem
            key={tab.name}
            tab={tab}
            focused={activeTab === tab.name}
            badge={getBadge(tab.name)}
            emojiSize={emojiSize}
            emojiSizeFocused={emojiSizeFocused}
            onPress={() => router.push(`/(app)/(tabs)/${tab.name}` as RelativePathString)}
          />
        ))}
      </View>
    </View>
  );
}

// ── Sidebar gauche (tablette + desktop + TV/4K + paysage mobile) ─────────────
// ── Sidebar gauche (tablette + desktop + TV/4K) ──────────────────────────────
function SidebarNav({
  activeTab,
  isDesktop,
  isLarge,   // >= 1440px
  isTV,      // >= 1920px
  isLandscape, // téléphone en paysage → sidebar ultra-fine
  insets,
}: {
  activeTab: string;
  isDesktop: boolean;
  isLarge: boolean;
  isTV: boolean;
  isLandscape: boolean;
  insets: ReturnType<typeof useSafeAreaInsets>;
}) {
  const { unreadCount } = useNotifBadge();
  // Badge : home = signaux/matchs, chat = messages non lus (unreadCount couvre les deux)
  const getBadge = (name: string) => (name === 'home' || name === 'chat') ? unreadCount : 0;

  // Largeur sidebar adaptée à chaque breakpoint
  // Paysage mobile : ultra-fine (60px), icônes emoji uniquement
  const sideW = isLandscape ? 60 : isTV ? 300 : isLarge ? 260 : isDesktop ? 220 : 78;
  const showLabels = isDesktop && !isLandscape; // paysage mobile = pas de labels

  // Tailles logo SVG adaptées — paysage mobile : très petit, cinéma : maximal
  const logoSize = isLandscape ? 32 : isTV ? 72 : isLarge ? 60 : isDesktop ? 52 : 40;

  return (
    <View style={{
      width: sideW,
      backgroundColor: 'rgba(13,13,26,0.96)',
      borderRightWidth: 1,
      borderRightColor: 'rgba(255,215,0,0.1)',
      paddingTop: Math.max(insets.top, 24),
      paddingBottom: Math.max(insets.bottom, 16),
    }}>
      {/* Logo / titre app */}
      <View style={{
        alignItems: showLabels ? 'flex-start' : 'center',
        paddingHorizontal: showLabels ? 20 : 0,
        marginBottom: isTV ? 36 : 28,
        paddingLeft: showLabels ? 22 : 0,
      }}>
        {/* Logo SVG vectoriel — net à toutes résolutions */}
        <AevyraLogo size={logoSize} />
        {showLabels && (
          <Text style={{
            color: '#FFD700',
            fontSize: isTV ? 20 : isLarge ? 18 : 16,
            fontWeight: '900',
            marginTop: 6, letterSpacing: 1,
          }}>
            Aevyra
          </Text>
        )}
      </View>

      {/* Onglets principaux */}
      <ScrollView showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 0 }}>
        {TABS.map(tab =>
          showLabels ? (
            <DesktopSidebarItem
              key={tab.name}
              tab={tab}
              focused={activeTab === tab.name}
              badge={getBadge(tab.name)}
              isTV={isTV}
              onPress={() => router.push(`/(app)/(tabs)/${tab.name}` as RelativePathString)}
            />
          ) : (
            <TabletSidebarItem
              key={tab.name}
              tab={tab}
              focused={activeTab === tab.name}
              badge={getBadge(tab.name)}
              onPress={() => router.push(`/(app)/(tabs)/${tab.name}` as RelativePathString)}
            />
          )
        )}
      </ScrollView>

      {/* ── Raccourcis bas sidebar (desktop uniquement) ── */}
      {showLabels && (
        <View style={{
          borderTopWidth: 1, borderTopColor: 'rgba(255,215,0,0.08)',
          paddingTop: 12, paddingBottom: 8, gap: 2,
        }}>
          {QUICK_LINKS.map(link => (
            <Pressable
              key={link.route}
              onPress={() => router.push(link.route)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10,
                paddingVertical: 10, paddingHorizontal: 20, borderRadius: 14,
              }}
            >
              <Text style={{ fontSize: isTV ? 20 : 16 }}>{link.emoji}</Text>
              <Text style={{
                color: 'rgba(255,255,255,0.65)',
                fontSize: isTV ? 14 : 12,
                fontWeight: '500',
              }}>
                {link.label}
              </Text>
            </Pressable>
          ))}
          <Text style={{
            color: 'rgba(255,255,255,0.65)',
            fontSize: isTV ? 12 : 10,
            paddingHorizontal: 22,
            paddingTop: 6,
          }}>
            Aevyra · v1.0
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Layout principal ─────────────────────────────────────────────────────────
export default function TabsLayout() { 
  const insets   = useSafeAreaInsets();
  const pathname = usePathname();
  const { isPhone, isTablet: _isTablet, isDesktop, isTV, isXS, isLargeDesktop, isLandscapeMobile  } = useResponsive();

  // Mobile portrait : pill flottante
  // Paysage mobile / tablette / desktop / TV : sidebar gauche
  const isMobile = isPhone && !isLandscapeMobile;

  // Déduire l'onglet actif depuis le pathname
  const activeTab = (() => {
    const seg = pathname.split('/').pop() ?? 'home';
    return TABS.some(t => t.name === seg) ? seg : 'home';
  })();

  // ── Sidebar : tablette, desktop, TV, 4K, cinéma ──────────────────────────
  if (!isMobile) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#0D0D1A' }}>
        <SidebarNav
          activeTab={activeTab}
          isDesktop={isDesktop}
          isLarge={isLargeDesktop}
          isTV={isTV}
          isLandscape={isLandscapeMobile}
          insets={insets}
        />
        {/* Zone de contenu : Tabs sans tabBar visible */}
        <View style={{ flex: 1 }}>
          <Tabs
            initialRouteName="home"
            screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}
          >
            {TABS.map(tab => (
              <React.Fragment key={tab.name}><Tabs.Screen name={tab.name} options={{ title: tab.label }} /></React.Fragment>
            ))}
          </Tabs>
          <IncomingCallBanner />
        </View>
      </View>
    );
  }

  // ── Mobile / XS : pill flottante ─────────────────────────────────────────
  const pillH        = isXS ? 58 : 68;
  // Sur Android PWA (web), insets.bottom est souvent 0 → forcer un minimum visible
  const safeBottom   = Math.max(insets.bottom, process.env.EXPO_OS === 'web' ? 16 : 12);
  const pillReservedH = safeBottom + 8 + pillH + 16;

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0D1A' }}>
      {/* Conteneur qui réserve l'espace sous la pill via paddingBottom */}
      <View style={{ flex: 1, paddingBottom: pillReservedH }}>
        <Tabs
          initialRouteName="home"
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        >
          {TABS.map(tab => (
            <React.Fragment key={tab.name}><Tabs.Screen name={tab.name} options={{ title: tab.label }} /></React.Fragment>
          ))}
        </Tabs>
      </View>

      {/* Pill flottante posée au-dessus du contenu */}
      <FloatingMobileNav activeTab={activeTab} insets={insets} />

      {/* Bannière appel entrant — visible sur tous les appareils */}
      <IncomingCallBanner />
    </View>
  );
}
