import { Stack, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { supabase } from '@/client/supabase';

export default function AppLayout() {
  const [isBanned, setIsBanned] = useState(false);
  // Fix Bug C : `checked` ne bloque plus le rendu — le Stack s'affiche immédiatement.
  // Le ban-check s'exécute en arrière-plan ; si l'utilisateur est banni, Redirect
  // s'applique après la vérification (~200-400ms) sans jamais bloquer les utilisateurs normaux.
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setChecked(true); return; }

      // 1. Expirer les sanctions échues côté DB AVANT de vérifier (attendre la fin)
      await supabase.rpc('expire_own_sanction');

      // 2. Vérifier s'il reste une sanction ban réellement active
      //    Index idx_sanctions_ban_check couvre exactement cette query → O(log n) à 500K users
      const { data } = await supabase
        .from('sanctions')
        .select('id, expires_at')
        .eq('user_id', user.id)
        .in('type', ['ban_temp', 'ban_permanent'])
        .in('status', ['active', 'permanent'])
        .limit(1)
        .maybeSingle();

      // Double-check client : si expires_at est dépassé, ne pas bloquer
      // (sécurité si RPC a échoué silencieusement)
      const isReallyBanned = !!data && (
        data.expires_at === null ||
        new Date(data.expires_at).getTime() > Date.now()
      );

      setIsBanned(isReallyBanned);
      setChecked(true);
    })();
  }, []);

  // Redirection ban appliquée APRÈS vérification — sans spinner bloquant
  if (checked && isBanned) return <Redirect href="/(app)/rehabilitation" />;

  return (
    <>
      <StatusBar style="light" backgroundColor="#0D0D1A" />
      <Stack screenOptions={{ headerShown: false }}>
        {/* ── Onglets principaux ── */}
        <Stack.Screen name="(tabs)" />
        {/* ── Messagerie & Appel ── */}
        <Stack.Screen name="chat" />
        <Stack.Screen name="video-call" />
        {/* ── Profil & Édition ── */}
        <Stack.Screen name="profile" />
        <Stack.Screen name="edit-profil" />
        <Stack.Screen name="coeur-verifie" />
        {/* ── Vague 1 — Parrainage & Carte astrale ── */}
        <Stack.Screen name="parrainage" />
        <Stack.Screen name="carte-astrale-share" />
        {/* ── Vague 2 — Éphémérides ── */}
        <Stack.Screen name="ephemerides" />
        {/* ── Vague 3 — Compatibilité partageable ── */}
        <Stack.Screen name="compat-share" />
        {/* ── Contenu & Social ── */}
        <Stack.Screen name="evenements" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="parametres" />
        <Stack.Screen name="challenges" />
        <Stack.Screen name="mon-temoignage" />
        <Stack.Screen name="rehabilitation" />
      </Stack>
    </>
  );
}
