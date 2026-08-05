import { Stack } from 'expo-router';
import { PortalHost } from '@rn-primitives/portal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';

import { SessionProvider, useSession } from '@/ctx';
import { NotifBadgeProvider } from '@/hooks/useNotifBadge';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import ErrorBoundaryClass from '@/components/ErrorBoundary';
const ErrorBoundary = ErrorBoundaryClass as unknown as React.ComponentType<{ children: React.ReactNode }>;
import "../global.css";

// Sentry : désactivé sur Web — @sentry/react-native n'est pas compatible Web
// et crashe quand DSN est undefined (page blanche totale)
if (process.env.EXPO_OS !== 'web' && process.env.EXPO_PUBLIC_SENTRY_DSN) {
  // Import dynamique natif uniquement — évite le crash Web au bundling
  import('@sentry/react-native').then((Sentry) => {
    Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN });
  }).catch(() => { /* Sentry optionnel */ });
}

function RootLayoutNav() {
  const { session, isLoading } = useSession();
  // Initialise les push notifications dès que la session est connue
  usePushNotifications();

  // Pendant la restauration de session (lecture localStorage/SQLite),
  // afficher un spinner opaque plutôt que `null` — sinon expo-router
  // résout une route par défaut (souvent la première screen listée = (legal)/cgu)
  // et redirige l'utilisateur vers les CGU à chaque refresh.
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D0D1A', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#FFD700" size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Routes protégées : visibles uniquement si session active */}
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
        {/* Espace admin — session requise + vérification is_admin dans (admin)/_layout.tsx */}
        <Stack.Screen name="(admin)" />
      </Stack.Protected>
      {/* Routes publiques : visibles uniquement si pas de session active */}
      <Stack.Protected guard={!session}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      {/* Routes légales — toujours accessibles, déclarées EN DERNIER pour qu'expo-router
          ne les résolve jamais comme route par défaut au démarrage (évite redirect CGU) */}
      <Stack.Screen name="(legal)" />
      {/* Groupes alias — contournement 308 Cloudflare réservés (/register /sign-in /login)
          Les URLs publics /register etc. sont redirigés via _redirects 301 vers
          /(auth-alias)/register etc. qui sont de vraies routes expo-router non-réservées. */}
      <Stack.Screen name="(auth-alias)" />
      <Stack.Screen name="(seo-alias)" />
      {/* Routes intermédiaires non-réservées (fallback si groupes pas resolus) */}
      <Stack.Screen name="inscription" />
      <Stack.Screen name="connexion" />
      <Stack.Screen name="creer-compte" />
      <Stack.Screen name="rencontre-astro" />
      <Stack.Screen name="astro-rencontre" />
      <Stack.Screen name="app-astro" />
    </Stack>
  );
}

const RootLayout: React.FC = () => {
  // ── Méta Web injectés via DOM — force Chrome Android à colorer la barre système
  // viewport-fit=cover : étend le contenu sous les encoches + barre nav Android
  // theme-color #0D0D1A : peint la barre navigation Android en sombre (0 bande blanche)
  useEffect(() => {
    if (process.env.EXPO_OS !== 'web') return;
    // Mettre à jour le viewport existant pour ajouter viewport-fit=cover
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no');
    } else {
      const m = document.createElement('meta');
      m.name = 'viewport';
      m.content = 'width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no';
      document.head.appendChild(m);
    }
    // theme-color : barre de navigation Android + barre d'adresse Chrome
    const setTheme = (media?: string) => {
      const existing = media
        ? document.querySelector(`meta[name="theme-color"][media="${media}"]`)
        : document.querySelector('meta[name="theme-color"]:not([media])');
      if (existing) {
        existing.setAttribute('content', '#0D0D1A');
      } else {
        const m = document.createElement('meta');
        m.name = 'theme-color';
        m.content = '#0D0D1A';
        if (media) m.setAttribute('media', media);
        document.head.appendChild(m);
      }
    };
    setTheme();
    setTheme('(prefers-color-scheme: dark)');
    setTheme('(prefers-color-scheme: light)');

    // Preconnect Supabase — réduit TTFB des requêtes API de ~200-400ms
    const preconnects = [
      'https://fqlqofpvmqipxnyzitne.supabase.co',
    ];
    preconnects.forEach((href) => {
      if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = href;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
      // DNS prefetch fallback navigateurs anciens
      const dns = document.createElement('link');
      dns.rel = 'dns-prefetch';
      dns.href = href;
      document.head.appendChild(dns);
    });
  }, []);

  return (
    <ErrorBoundary>
      {/* @ts-ignore */}
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0D0D1A', ...(process.env.EXPO_OS === 'web' ? { minHeight: '100dvh' as unknown as number } : {}) } as any}>
        <SessionProvider>
          <NotifBadgeProvider>
            <RootLayoutNav />
            <PortalHost />
          </NotifBadgeProvider>
        </SessionProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

// Sur Web : export direct (pas de Sentry.wrap — incompatible Web)
// Sur natif : Sentry.wrap ajouté dynamiquement si DSN présent
export default RootLayout;