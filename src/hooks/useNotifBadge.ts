// Aevyra – Badge notifications : compteur non-lus partagé entre tabs
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/client/supabase';
import { getMyNotifications } from '@/lib/amour-api';
import { useSession } from '@/ctx';

// ── Contexte ─────────────────────────────────────────────────
type NotifBadgeCtx = {
  unreadCount: number;
  refresh: () => Promise<void>;
};

import React from 'react';
export const NotifBadgeContext = createContext<NotifBadgeCtx>({
  unreadCount: 0,
  refresh: async () => {},
});

export function NotifBadgeProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const fetchingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!session) { setUnreadCount(0); return; }
    // Évite les appels concurrents simultanés
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const notifs = await getMyNotifications();
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    } catch {
      // Silencieux — le badge ne doit pas crasher l'app
    } finally {
      fetchingRef.current = false;
    }
  }, [session]);

  // Chargement initial + AppState (retour au premier plan) — un seul listener
  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // Realtime sur notifications — badge instantané à chaque INSERT/UPDATE/DELETE
  useEffect(() => {
    if (!session) return;
    const uid = (session as { user?: { id?: string } }).user?.id;
    if (!uid) return;
    const channel = supabase
      .channel(`notif-badge-${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
        () => { void refresh(); }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [session, refresh]);

  return React.createElement(
    NotifBadgeContext.Provider,
    { value: { unreadCount, refresh } },
    children
  );
}

export function useNotifBadge() {
  return useContext(NotifBadgeContext);
}
