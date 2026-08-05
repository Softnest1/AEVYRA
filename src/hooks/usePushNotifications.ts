// Aevyra – Hook notifications push (expo-notifications)
// Gère : permission, enregistrement token, réception, tap navigation
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import { savePushToken } from '@/lib/amour-api';

// ── Types locaux (évite d'importer expo-notifications sur Web) ──
type ExpoPushToken = { data: string; type: string };

// ── Guard Web : expo-notifications crashe sur Web ───────────────
const IS_NATIVE = process.env.EXPO_OS !== 'web';

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const notifListener  = useRef<{ remove(): void } | null>(null);
  const responseListener = useRef<{ remove(): void } | null>(null);

  useEffect(() => {
    if (!IS_NATIVE) return; // No-op sur Web
    let active = true;

    (async () => {
      try {
        const Notifications = await import('expo-notifications');

        // Comportement de la notif quand l'app est au premier plan
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge:  false,
            shouldShowBanner: true,
            shouldShowList:   true,
          }),
        });

        // Demande de permission
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (!active) return;

        if (finalStatus !== 'granted') {
          setPermissionGranted(false);
          return;
        }
        setPermissionGranted(true);

        // Canal Android obligatoire
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('aevyra-default', {
            name:       'Aevyra',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#C084FC',
          });
        }

        // Obtenir le token Expo
        const tokenObj: ExpoPushToken = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
        });
        if (!active) return;
        const token = tokenObj.data;
        setExpoPushToken(token);

        // Persister en DB
        await savePushToken(token, Platform.OS);

        // Listener : notif reçue en premier plan
        notifListener.current = Notifications.addNotificationReceivedListener((_notif) => {
          // Notif reçue — pas besoin d'action supplémentaire
        });

        // Listener : tap sur notif → navigation
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data as Record<string, string> | undefined;
          if (data?.route) {
            try { router.push(data.route as RelativePathString); } catch { /* route invalide */ }
          }
        });
      } catch (e) {
        console.error('[usePushNotifications] Erreur init', e);
      }
    })();

    return () => {
      active = false;
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return { expoPushToken, permissionGranted };
}
