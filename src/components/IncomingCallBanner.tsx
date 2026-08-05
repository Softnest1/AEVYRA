// Aevyra – Bannière d'appel entrant (polling 3s sur tous les appareils)
// Affichée dans le layout tabs → visible sur toutes les pages
// Compatible : iOS Safari, Android Chrome, Firefox, Samsung Internet, desktop
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { PhoneIncoming, PhoneOff } from 'lucide-react-native';
import { supabase } from '@/client/supabase';

interface IncomingCall {
  id: string;
  caller_id: string;
  caller_name?: string;
}

async function checkIncoming(): Promise<IncomingCall | null> {
  try {
    const { data, error } = await supabase.functions.invoke('video-call-signal', {
      body: { action: 'check_incoming' },
      method: 'POST',
    });
    if (error || !data?.incoming) return null;
    return data.incoming as IncomingCall;
  } catch {
    return null;
  }
}

async function rejectCall(callId: string): Promise<void> {
  await supabase.functions.invoke('video-call-signal', {
    body: { action: 'reject', call_id: callId },
    method: 'POST',
  });
}

export default function IncomingCallBanner() {
  const [call, setCall]           = useState<IncomingCall | null>(null);
  const [callerName, setCallerName] = useState('Quelqu\'un');
  const slideAnim     = useRef(new Animated.Value(-120)).current;
  const pollRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const shownCallId   = useRef<string | null>(null);
  // Auto-dismiss 30s : si l'appelé ne répond pas, masquer la bannière
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDismissTimer = () => {
    if (dismissTimerRef.current) { clearTimeout(dismissTimerRef.current); dismissTimerRef.current = null; }
  };

  // Charger le prénom de l'appelant
  const loadCallerName = useCallback(async (callerId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('prenom')
        .eq('user_id', callerId)
        .maybeSingle();
      if (data?.prenom) setCallerName(data.prenom);
    } catch { /* ignore */ }
  }, []);

  // Animation slide-down
  const slideIn = useCallback(() => {
    Animated.spring(slideAnim, {
      toValue: 0, useNativeDriver: true,
      speed: 18, bounciness: 8,
    }).start();
  }, [slideAnim]);

  const slideOut = useCallback((cb?: () => void) => {
    clearDismissTimer();
    Animated.timing(slideAnim, {
      toValue: -140, duration: 280, useNativeDriver: true,
    }).start(cb);
  }, [slideAnim]);

  const dismissBanner = useCallback(() => {
    shownCallId.current = null;
    slideOut(() => setCall(null));
  }, [slideOut]);

  // Polling toutes les 3s
  const poll = useCallback(async () => {
    const incoming = await checkIncoming();
    if (incoming && incoming.id !== shownCallId.current) {
      shownCallId.current = incoming.id;
      setCall(incoming);
      setCallerName('Quelqu\'un');
      loadCallerName(incoming.caller_id);
      slideIn();
      // Auto-dismiss après 30s — appel manqué ou expiré
      clearDismissTimer();
      dismissTimerRef.current = setTimeout(dismissBanner, 30_000);
    } else if (!incoming && shownCallId.current) {
      // L'appel a disparu (timeout côté serveur ou accepté ailleurs)
      dismissBanner();
    }
  }, [loadCallerName, slideIn, dismissBanner]);

  // Démarrer / arrêter le poll
  const startPoll = useCallback(() => {
    if (pollRef.current) return; // déjà actif
    pollRef.current = setInterval(poll, 3000);
    poll(); // poll immédiat
  }, [poll]);

  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  // Monter le polling — pause sur AppState background (natif) + visibilitychange (Web)
  useEffect(() => {
    startPoll();

    // ── Pause/resume natif (iOS/Android) ─────────────────────────
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        startPoll();
      } else {
        // background ou inactive → économiser batterie
        stopPoll();
      }
    });

    // ── Pause/resume Web (onglet masqué) ─────────────────────────
    const onVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) stopPoll(); else startPoll();
    };
    if (process.env.EXPO_OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      stopPoll();
      clearDismissTimer();
      appStateSub.remove();
      if (process.env.EXPO_OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAccept = useCallback(() => {
    if (!call) return;
    clearDismissTimer();
    slideOut(() => setCall(null));
    shownCallId.current = null;
    // Naviguer vers la page d'appel (appelé — call_id fourni, pas callee_id)
    router.push(`/(app)/video-call/${call.id}` as never);
  }, [call, slideOut]);

  const handleReject = useCallback(async () => {
    if (!call) return;
    clearDismissTimer();
    await rejectCall(call.id);
    shownCallId.current = null;
    slideOut(() => setCall(null));
  }, [call, slideOut]);

  if (!call) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        zIndex: 9999,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <LinearGradient
        colors={['rgba(75,0,130,0.97)', 'rgba(30,0,60,0.97)']}
        style={{
          margin: 12,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: 'rgba(255,215,0,0.35)',
          overflow: 'hidden',
        }}
      >
        {/* Reflet haut */}
        <View style={{
          position: 'absolute', top: 0, left: 16, right: 16, height: 1,
          backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 1,
        }} />

        <View style={{
          flexDirection: 'row', alignItems: 'center',
          padding: 16, gap: 14,
        }}>
          {/* Icône pulsante */}
          <View style={{
            width: 48, height: 48, borderRadius: 24,
            backgroundColor: 'rgba(255,215,0,0.15)',
            borderWidth: 1.5, borderColor: 'rgba(255,215,0,0.4)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <PhoneIncoming size={22} color="#FFD700" />
          </View>

          {/* Texte */}
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 }}>
              📹 Appel vidéo entrant
            </Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>
              {callerName}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>
              Épreuve romantique requise ✨
            </Text>
          </View>

          {/* Bouton refuser */}
          <Pressable
            onPress={handleReject}
            style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: 'rgba(255,59,48,0.2)',
              borderWidth: 1, borderColor: 'rgba(255,59,48,0.5)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <PhoneOff size={20} color="#FF3B30" />
          </Pressable>

          {/* Bouton accepter */}
          <Pressable
            onPress={handleAccept}
            style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: 'rgba(76,175,80,0.2)',
              borderWidth: 1, borderColor: 'rgba(76,175,80,0.5)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <PhoneIncoming size={20} color="#4CAF50" />
          </Pressable>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
