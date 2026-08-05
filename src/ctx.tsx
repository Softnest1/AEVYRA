import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';

import { supabase } from '@/client/supabase';

type SessionContextType = {
  session: Session | null;
  isLoading: boolean;
};

const SessionContext = createContext<SessionContextType>({
  session: null,
  isLoading: true,
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const appState = useRef(AppState.currentState);
  // Garde pour n'appeler setIsLoading(false) qu'une seule fois
  const loadingDone = useRef(false);

  const markLoaded = (s: Session | null) => {
    if (loadingDone.current) return;
    loadingDone.current = true;
    setSession(s);
    setIsLoading(false);
  };

  useEffect(() => {
    // Timeout de sécurité 5s : si ni getSession ni onAuthStateChange ne répondent
    const timeout = setTimeout(() => markLoaded(null), 5000);

    // Sur Web, onAuthStateChange INITIAL_SESSION se déclenche de façon synchrone
    // avant même le .then() de getSession — c'est lui qui doit marquer loading=false
    // en premier. Sur natif, getSession est plus rapide.
    // Stratégie : le PREMIER qui répond gagne (loadingDone.current guard).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      // INITIAL_SESSION = lecture du storage local (synchrone Web / natif)
      // Cet événement transporte la session persistée → c'est lui qu'on attend.
      if (event === 'INITIAL_SESSION') {
        clearTimeout(timeout);
        markLoaded(s);
        return;
      }
      // Autres événements (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED) :
      // mettre à jour la session SANS toucher à isLoading (déjà false)
      setSession(s);
    });

    // getSession en fallback : si INITIAL_SESSION n'arrive pas (vieux SDK / edge case)
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      clearTimeout(timeout);
      markLoaded(s);
    }).catch(() => {
      clearTimeout(timeout);
      markLoaded(null);
    });

    // iOS/Android : force refresh session au retour au premier plan
    const appStateSubscription = AppState.addEventListener('change', async (nextState) => {
      if (Platform.OS !== 'web' && appState.current.match(/inactive|background/) && nextState === 'active') {
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          await supabase.auth.signOut();
        }
      }
      appState.current = nextState;
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
