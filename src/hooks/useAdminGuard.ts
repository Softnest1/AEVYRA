// Hook de garde admin — vérifie en temps réel si l'utilisateur est admin
// Utilisé par le layout (admin) pour bloquer l'accès si non-admin
import { useEffect, useState } from 'react';
import { supabase } from '@/client/supabase';

export type AdminRole = 'admin' | 'super_admin' | null;

export function useAdminGuard() {
  const [role, setRole]       = useState<AdminRole | undefined>(undefined); // undefined = chargement
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setRole(null); setLoading(false); return; }

        const { data } = await supabase
          .from('admin_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!cancelled) {
          setRole(data ? (data.role as AdminRole) : null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) { setRole(null); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { role, loading, isAdmin: role !== null && role !== undefined };
}
