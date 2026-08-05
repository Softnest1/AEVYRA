// Aevyra – Paramètres (v4 – responsive universel, footer dédié, section Profil, suppression compte RGPD)
import React, { useCallback, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect, type RelativePathString } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell, BellOff, ChevronLeft, ChevronRight,
  Download, Eye, EyeOff, FileText, HelpCircle,
  Lock, LogOut, MessageCircle, Shield, Sparkles,
  Star, Trash2, UserCog, Users, Zap,
} from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import { supabase } from '@/client/supabase';
import { getMyProfile, updateProfileSettings, getCurrentUserId, signOutComplet } from '@/lib/amour-api';
import { useResponsive } from '@/hooks/useResponsive';

// ═══════════════════════════════════════════════════════════════
// ATOMS — blocs réutilisables (définis UNE fois, pas inline)
// ═══════════════════════════════════════════════════════════════

function SectionTitle({ label }: { label: string }) { 
  const { captionSize, gap  } = useResponsive();
  return (
    <Text style={{
      color: 'rgba(255,215,0,0.90)', fontSize: captionSize * 0.9, fontWeight: '900',
      letterSpacing: 2.5, marginBottom: gap * 0.4, marginTop: gap * 0.2, paddingLeft: 4,
    }}>
      {label}
    </Text>
  );
}

function Card({ children }: { children?: React.ReactNode }) { 
  const { cardRadius, gap  } = useResponsive();
  return (
    <LinearGradient
      colors={['rgba(75,0,130,0.22)', 'rgba(13,13,26,0.42)']}
      style={{
        borderRadius: cardRadius, paddingHorizontal: gap * 0.8,
        borderWidth: 1, borderColor: 'rgba(255,215,0,0.09)',
        marginBottom: gap * 1.1,
      }}
    >
      {children}
    </LinearGradient>
  );
}

type RowProps = {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress: () => void;
  accentColor?: string;
  last?: boolean;
};
function NavRow({ icon, label, subtitle, onPress, accentColor, last }: RowProps) { 
  const { gap, cardRadius, tapTarget, iconSize, bodySize, captionSize  } = useResponsive();
  const [pressed, setPressed] = React.useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: gap * 0.7,
        paddingVertical: gap * 0.7,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: 'rgba(255,215,0,0.07)',
        opacity: pressed ? 0.7 : 1,
        minHeight: tapTarget,
      }}
    >
      <View style={{
        width: tapTarget * 0.8, height: tapTarget * 0.8, borderRadius: cardRadius * 0.5,
        backgroundColor: (accentColor ?? '#FFD700') + '18',
        borderWidth: 1, borderColor: (accentColor ?? '#FFD700') + '28',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: bodySize, fontWeight: '600' }}>{label}</Text>
        {subtitle ? (
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize, marginTop: 1 }}>{subtitle}</Text>
        ) : null}
      </View>
      <ChevronRight size={iconSize} color={(accentColor ?? '#FFD700') + '55'} />
    </Pressable>
  );
}

type ToggleRowProps = {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  accentColor?: string;
  last?: boolean;
  saving?: boolean;
  saveError?: string | null;
};
function ToggleRow({ icon, label, subtitle, value, onToggle, accentColor, last, saving, saveError }: ToggleRowProps) { 
  const { gap, cardRadius, tapTarget, bodySize, captionSize  } = useResponsive();
  return (
    <View style={{
      paddingVertical: gap * 0.7,
      borderBottomWidth: last ? 0 : 1,
      borderBottomColor: 'rgba(255,215,0,0.07)',
      gap: 4,
      minHeight: tapTarget,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: gap * 0.7 }}>
        <View style={{
          width: tapTarget * 0.8, height: tapTarget * 0.8, borderRadius: cardRadius * 0.5,
          backgroundColor: value ? (accentColor ?? '#FFD700') + '22' : 'rgba(255,255,255,0.06)',
          borderWidth: 1,
          borderColor: value ? (accentColor ?? '#FFD700') + '35' : 'rgba(255,255,255,0.08)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: bodySize, fontWeight: '600' }}>{label}</Text>
          {subtitle ? (
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize, marginTop: 1 }}>{subtitle}</Text>
          ) : null}
        </View>
        {saving ? (
          <ActivityIndicator size="small" color={accentColor ?? '#FFD700'} />
        ) : (
          <Switch
            value={value}
            onValueChange={onToggle}
            accessibilityRole="switch"
            accessibilityLabel={label}
            trackColor={{ false: 'rgba(255,255,255,0.12)', true: accentColor ?? '#FFD700' }}
            thumbColor={value ? '#0D0D1A' : 'rgba(255,255,255,0.4)'}
          />
        )}
      </View>
      {saveError ? (
        <Text style={{ color: '#FF8080', fontSize: captionSize, marginLeft: tapTarget * 0.8 + gap * 0.7, fontStyle: 'italic' }}>
          ⚠️ {saveError}
        </Text>
      ) : null}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// PANNEAU INLINE — s'ouvre / se ferme dans la carte
// ═══════════════════════════════════════════════════════════════

function PanelWrapper({ children, onClose }: { children?: React.ReactNode; onClose: () => void }) { 
  const { gap, cardRadius, tapTarget  } = useResponsive();
  return (
    <View style={{
      marginTop: 4, marginBottom: gap * 0.5, borderRadius: cardRadius * 0.7,
      backgroundColor: 'rgba(13,8,28,0.80)',
      borderWidth: 1, borderColor: 'rgba(255,215,0,0.14)',
      padding: gap * 0.8, gap: gap * 0.6,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fermer le panneau"
          hitSlop={12}
          style={{ minWidth: tapTarget * 0.6, minHeight: tapTarget * 0.6, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 18, lineHeight: 20 }}>✕</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// FOOTER RESPONSIVE — affiché EN BAS de la page
// ═══════════════════════════════════════════════════════════════

function AppFooter({ isLarge }: { isLarge: boolean }) { 
  const { captionSize  } = useResponsive();
  return (
    <View style={{
      alignItems: 'center', gap: 6,
      paddingVertical: 24,
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,215,0,0.07)',
    }}>
      {/* Logo textuel */}
      <Text style={{
        color: '#FFD700', fontSize: isLarge ? 22 : 18,
        fontWeight: '900', letterSpacing: 3,
      }}>
        ✦ AEVYRA ✦
      </Text>

      {/* Tagline */}
      <Text style={{
        color: 'rgba(255,255,255,0.65)',
        fontSize: isLarge ? 13 : 11,
        fontStyle: 'italic',
        textAlign: 'center',
        maxWidth: 280,
        lineHeight: 18,
      }}>
        "Deux âmes. Un destin. Une seule rencontre suffit."
      </Text>

      {/* Version + domaine */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: captionSize }}>
          v1.0.0
        </Text>
        <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: captionSize }}>·</Text>
        <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: captionSize }}>
          aevyra.uk
        </Text>
        <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: captionSize }}>·</Text>
        <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: captionSize }}>
          © 2026 Aevyra
        </Text>
      </View>

      {/* Liens légaux inline */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: isLarge ? 16 : 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Pressable onPress={() => router.push('/(legal)/cgu' as RelativePathString)}>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: captionSize, textDecorationLine: 'underline' }}>
            CGU
          </Text>
        </Pressable>
        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: captionSize }}>·</Text>
        <Pressable onPress={() => router.push('/(legal)/confidentialite' as RelativePathString)}>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: captionSize, textDecorationLine: 'underline' }}>
            Confidentialité
          </Text>
        </Pressable>
        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: captionSize }}>·</Text>
        <Pressable onPress={() => router.push('/(legal)/contact' as RelativePathString)}>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: captionSize, textDecorationLine: 'underline' }}>
            Contact
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export default function Parametres() { 
  const insets = useSafeAreaInsets();
  const { bodySize, captionSize, gap, cardRadius, tapTarget, iconSize, px, h2Size, isTablet, isDesktop, isTV, contentMaxWidth, buttonPadV, buttonPadH  } = useResponsive();
  const isLarge = isTablet || isDesktop || isTV;
  const contentMaxW = isLarge ? contentMaxWidth : undefined;

  // ── États ──────────────────────────────────────────────────
  const [loading, setLoading]             = useState(true);
  const [mysterieux, setMysterieux]       = useState(false);
  const [notifications, setNotifs]        = useState(true);
  const [synchronicite, setSynchronicite] = useState(true);

  // État sauvegarde + erreur par toggle
  const [savingMystery, setSavingMystery]       = useState(false);
  const [savingNotifs, setSavingNotifs]         = useState(false);
  const [savingSync, setSavingSync]             = useState(false);
  const [errorMystery, setErrorMystery]         = useState<string | null>(null);
  const [errorNotifs, setErrorNotifs]           = useState<string | null>(null);
  const [errorSync, setErrorSync]               = useState<string | null>(null);

  // Phrase de sécurité
  const [phraseActuelle, setPhraseActuelle] = useState('');
  const [nouvellePhrase, setNouvellePhrase] = useState('');
  const [showPhrase, setShowPhrase]         = useState(false);
  const [phraseMsg, setPhraseMsg]           = useState<{ text: string; ok: boolean } | null>(null);
  const [savingPhrase, setSavingPhrase]     = useState(false);

  // Panneau inline actif
  const [panel, setPanel] = useState<'signalement' | 'delete' | null>(null);
  const [signalMsg, setSignalMsg]           = useState('');
  const [signalSent, setSignalSent]         = useState(false);
  const [signalCategorie, setSignalCategorie] = useState<'bug' | 'comportement' | 'contenu' | 'autre' | null>(null);

  // Suppression de compte
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting]           = useState(false);
  const [deleteError, setDeleteError]     = useState<string | null>(null);

  // Export RGPD
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  // Guard anti-double-clic déconnexion
  const [signingOut, setSigningOut] = useState(false);

  // Garde : charger une seule fois depuis la DB (évite d'écraser les toggles au refocus)
  const initialLoadDoneRef = useRef(false);
  // Anti-concurrence par champ toggle
  const savingRef = useRef<Set<string>>(new Set());

  // ── Chargement ─────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        const p = await getMyProfile();
        if (p) {
          setMysterieux(p.is_mystery ?? false);
          setNotifs(p.notif_enabled ?? true);
          setSynchronicite(p.synchronicite_enabled ?? true);
          setPhraseActuelle(p.security_phrase ?? '');
          setNouvellePhrase('');
          setPhraseMsg(null);
          initialLoadDoneRef.current = true;
        }
        setLoading(false);
      })();
    }, [])
  );

  // ── Helpers persistance ─────────────────────────────────────
  const toggleField = async (
    setter: (v: boolean) => void,
    field: 'is_mystery' | 'notif_enabled' | 'synchronicite_enabled',
    value: boolean,
    setSaving: (v: boolean) => void,
    setError: (v: string | null) => void,
  ) => {
    if (savingRef.current.has(field)) return;
    savingRef.current.add(field);
    setError(null);
    setSaving(true);
    setter(value); // optimistic update immédiat
    try {
      await updateProfileSettings({ [field]: value });
      // Sauvegarde confirmée — l'optimistic update est déjà affiché
    } catch (e) {
      setter(!value); // rollback si erreur
      setError(e instanceof Error ? e.message : 'Erreur de sauvegarde. Réessayez.');
    } finally {
      setSaving(false);
      savingRef.current.delete(field);
    }
  };

  const handleSavePhrase = async () => {
    setPhraseMsg(null);
    const trimmed = nouvellePhrase.trim();
    if (trimmed.length < 6) {
      setPhraseMsg({ text: 'Minimum 6 caractères requis.', ok: false });
      return;
    }
    if (phraseActuelle && trimmed.toLowerCase() === phraseActuelle.trim().toLowerCase()) {
      setPhraseMsg({ text: 'Cette phrase est déjà votre phrase actuelle.', ok: false });
      return;
    }
    setSavingPhrase(true);
    try {
      const userId = await getCurrentUserId();
      if (!userId) { setPhraseMsg({ text: 'Session expirée. Reconnectez-vous.', ok: false }); return; }
      const { error } = await supabase
        .from('profiles')
        .update({ security_phrase: trimmed })
        .eq('id', userId);
      if (error) { setPhraseMsg({ text: 'Erreur : ' + error.message, ok: false }); return; }
      setPhraseActuelle(trimmed);
      setNouvellePhrase('');
      setPhraseMsg({ text: '✦ Phrase enregistrée avec succès !', ok: true });
    } catch (e: unknown) {
      setPhraseMsg({ text: 'Erreur inattendue : ' + (e instanceof Error ? e.message : 'inconnue'), ok: false });
    } finally {
      setSavingPhrase(false);
    }
  };

  const handleSignalement = async () => {
    if (signalMsg.trim().length < 10) return;
    const cat = signalCategorie ?? 'autre';
    try {
      const userId = await getCurrentUserId();
      if (!userId) { setSignalSent(false); return; }

      // Insérer dans app_reports — la notification admin est gérée côté DB
      // via le trigger check_auto_suspension → Edge Function report-alert → push Expo.
      // Zéro WhatsApp ici : évite l'effet écho et le spam sur le numéro personnel.
      const { error } = await supabase.from('app_reports').insert({
        reporter_id: userId,
        categorie:   cat,
        details:     signalMsg.trim(),
        status:      'pending',
      });
      if (error) {
        console.error('[handleSignalement] Insert error:', error.code, error.message);
      }
    } catch (e) {
      console.warn('[handleSignalement] Erreur non critique:', e);
    } finally {
      // Toujours afficher la confirmation à l'utilisateur
      setSignalSent(true);
    }
  };

  const handleWhatsApp = async () => {
    const { openWhatsApp, buildSupportMessage } = await import('@/lib/whatsapp');
    openWhatsApp(
      buildSupportMessage(),
      // Fallback si WhatsApp non dispo : page contact
      () => router.push('/(legal)/contact' as RelativePathString),
    );
  };

  const handleExportData = async () => {
    setExporting(true);
    setExportMsg(null);
    try {
      const userId = await getCurrentUserId();
      if (!userId) { setExportMsg('Session expirée. Reconnectez-vous.'); return; }
      const [profil, { data: messages }, { data: likes }] = await Promise.all([
        getMyProfile(),
        supabase.from('messages').select('*').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
        supabase.from('likes').select('*').or(`liker_id.eq.${userId},liked_id.eq.${userId}`),
      ]);

      const dateExport = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
      const p = profil as Record<string, unknown> | null ?? {};

      // ── Helpers HTML ─────────────────────────────────────────────
      const row = (label: string, value: unknown) => {
        if (value === null || value === undefined || value === '') return '';
        const display = typeof value === 'boolean' ? (value ? '✅ Oui' : '❌ Non')
          : typeof value === 'object' ? `<pre style="margin:0;white-space:pre-wrap;font-size:12px">${JSON.stringify(value, null, 2)}</pre>`
          : String(value);
        return `<tr><td style="color:#c8a8e0;padding:6px 12px 6px 0;font-size:13px;white-space:nowrap;vertical-align:top">${label}</td><td style="color:#f0e6ff;padding:6px 0;font-size:13px;word-break:break-word">${display}</td></tr>`;
      };
      const section = (emoji: string, title: string, content: string) =>
        `<div style="background:rgba(255,255,255,0.05);border:1px solid rgba(200,168,224,0.20);border-radius:16px;padding:20px;margin-bottom:20px">
          <h2 style="color:#c8a8e0;font-size:16px;margin:0 0 14px;display:flex;align-items:center;gap:8px">${emoji} ${title}</h2>
          ${content}
        </div>`;

      // ── Section Profil ────────────────────────────────────────────
      const profilHtml = `<table style="width:100%;border-collapse:collapse">
        ${row('Prénom', p['prénom'] ?? p['prenom'])}
        ${row('Pseudo', p['pseudo'])}
        ${row('Âge', p['âge'] ?? p['age'])}
        ${row('Genre', p['genre'])}
        ${row('Cherche', p['cherche'])}
        ${row('Ville', p['ville'])}
        ${row('Bio', p['bio'])}
        ${row('Signe astrologique', p['signe_astro'])}
        ${row('Ascendant', p['ascendant'])}
        ${row('Énergie romantique', p['energie_romantique'])}
        ${row('Rêve duo', p['reve_duo'])}
        ${row('Style amour', p['style_amour'])}
        ${row('Moment préféré', p['moment_preferé'] ?? p['moment_preferer'] ?? p['moment_préférer'])}
        ${row('Empreinte couleur', p['empreinte_couleur'])}
        ${row('Inscription complète', p['inscription_complete'])}
        ${row('Date d\'inscription', p['created_at'] ? new Date(p['created_at'] as string).toLocaleDateString('fr-FR') : null)}
        ${row('Date de naissance', p['date_naissance'])}
        ${row('Compte premium jusqu\'au', p['premium_until'])}
        ${row('Score fiabilité', p['score_fiabilite'] ?? p['score_fiabilité'])}
      </table>`;

      // ── Section Messages ──────────────────────────────────────────
      const msgs = messages ?? [];
      const msgsHtml = msgs.length === 0
        ? '<p style="color:#888;font-size:13px;margin:0">Aucun message trouvé.</p>'
        : `<p style="color:#c8a8e0;font-size:13px;margin:0 0 10px">${msgs.length} message(s) au total</p>
           <table style="width:100%;border-collapse:collapse;font-size:12px">
             <tr style="color:#c8a8e0;border-bottom:1px solid rgba(200,168,224,0.2)">
               <td style="padding:6px 8px">Date</td>
               <td style="padding:6px 8px">De</td>
               <td style="padding:6px 8px">À</td>
               <td style="padding:6px 8px">Message</td>
             </tr>
             ${msgs.map((m: Record<string, unknown>) => `
               <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
                 <td style="padding:6px 8px;color:#aaa;white-space:nowrap">${m['created_at'] ? new Date(m['created_at'] as string).toLocaleDateString('fr-FR') : '—'}</td>
                 <td style="padding:6px 8px;color:#ddd;font-size:11px">${String(m['sender_id'] ?? '').slice(0,8)}…</td>
                 <td style="padding:6px 8px;color:#ddd;font-size:11px">${String(m['receiver_id'] ?? '').slice(0,8)}…</td>
                 <td style="padding:6px 8px;color:#f0e6ff;word-break:break-word">${m['content'] ?? m['contenu'] ?? '(vide)'}</td>
               </tr>`).join('')}
           </table>`;

      // ── Section Likes / Aimes ─────────────────────────────────────
      const lks = likes ?? [];
      const likesHtml = lks.length === 0
        ? '<p style="color:#888;font-size:13px;margin:0">Aucun like enregistré.</p>'
        : `<p style="color:#c8a8e0;font-size:13px;margin:0 0 10px">${lks.length} like(s) au total</p>
           <table style="width:100%;border-collapse:collapse;font-size:12px">
             <tr style="color:#c8a8e0;border-bottom:1px solid rgba(200,168,224,0.2)">
               <td style="padding:6px 8px">Date</td>
               <td style="padding:6px 8px">Type</td>
               <td style="padding:6px 8px">Profil aimé</td>
             </tr>
             ${lks.map((l: Record<string, unknown>) => `
               <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
                 <td style="padding:6px 8px;color:#aaa;white-space:nowrap">${l['created_at'] ? new Date(l['created_at'] as string).toLocaleDateString('fr-FR') : '—'}</td>
                 <td style="padding:6px 8px;color:#FFD700">${l['type'] ?? l['reaction'] ?? '💛'}</td>
                 <td style="padding:6px 8px;color:#ddd;font-size:11px">${String(l['liked_id'] ?? l['profile_id'] ?? '').slice(0, 8)}…</td>
               </tr>`).join('')}
           </table>`;

      // ── HTML final ────────────────────────────────────────────────
      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Mes données Aevyra — ${dateExport}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #1a0a2e; color: #f0e6ff; min-height: 100vh; }
    a { color: #c8a8e0; }
  </style>
</head>
<body>
  <div style="max-width:720px;margin:0 auto">
    <!-- En-tête -->
    <div style="text-align:center;padding:32px 0 24px">
      <div style="font-size:40px;margin-bottom:8px">🌌</div>
      <h1 style="color:#c8a8e0;font-size:22px;margin:0 0 6px;letter-spacing:1px">MES DONNÉES AEVYRA</h1>
      <p style="color:#888;font-size:13px;margin:0">Export RGPD · ${dateExport}</p>
      <p style="color:#666;font-size:11px;margin:6px 0 0">Ce document contient toutes vos données personnelles conformément au RGPD (art. 15 & 20).</p>
    </div>

    ${section('👤', 'Mon profil', profilHtml)}
    ${section('💬', 'Mes messages', msgsHtml)}
    ${section('💛', 'Mes likes &amp; aimes', likesHtml)}

    <!-- Pied de page -->
    <div style="text-align:center;padding:24px 0 40px;border-top:1px solid rgba(200,168,224,0.15);margin-top:8px">
      <p style="color:#555;font-size:11px;line-height:1.6;margin:0">
        Document généré par Aevyra · ${dateExport}<br/>
        Droit à l'oubli : vous pouvez demander la suppression de votre compte depuis Paramètres → Données personnelles.<br/>
        Contact : WhatsApp support Aevyra
      </p>
    </div>
  </div>
</body>
</html>`;

      if (process.env.EXPO_OS === 'web') {
        // Télécharger en .html — s'ouvre lisiblement dans Chrome Android
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aevyra-donnees-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setExportMsg('✦ Données exportées avec succès !');
      } else {
        // Mobile natif : partager le HTML via Share
        const { shareContent } = await import('@/lib/share-utils');
        await shareContent({ title: 'Mes données Aevyra', message: html });
        setExportMsg('✦ Données prêtes au partage !');
      }
    } catch (e: unknown) {
      setExportMsg('Erreur export : ' + (e instanceof Error ? e.message : 'inconnue'));
    } finally {
      setExporting(false);
    }
  };

  // ── Suppression de compte (RGPD — droit à l'oubli) ─────────
  const handleDeleteAccount = async () => {
    if (deleteConfirm.toLowerCase().trim() !== 'supprimer') {
      setDeleteError('Tapez exactement "supprimer" pour confirmer.');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      const userId = await getCurrentUserId();
      if (!userId) { setDeleteError('Session expirée.'); setDeleting(false); return; }

      // Supprimer le compte Auth via Edge Function admin-delete-user (service_role)
      // Cette suppression cascade automatiquement : auth.users → profiles → toutes les données liées
      const { error: fnError } = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: userId },
      });
      if (fnError) {
        setDeleteError('Erreur suppression : ' + fnError.message);
        setDeleting(false);
        return;
      }

      // Nettoyer le cache local et rediriger — signOut best-effort car auth.users est supprimé
      await signOutComplet(); // cache + pushToken + supabase.signOut + localStorage (best-effort)
      router.replace('/' as RelativePathString);
    } catch (e: unknown) {
      setDeleteError('Erreur inattendue : ' + (e instanceof Error ? e.message : 'inconnue'));
      setDeleting(false);
    }
  };

  const handleLogout = async () => {
    if (signingOut) return; // guard double-clic
    setSigningOut(true);
    initialLoadDoneRef.current = false; // forcer rechargement à la prochaine connexion

    const result = await signOutComplet(); // cache + pushToken + supabase.signOut + localStorage
    if (!result.ok) {
      setPhraseMsg({ text: 'Déconnexion échouée, veuillez réessayer.', ok: false });
      setSigningOut(false);
      return;
    }
    // Redirection explicite vers la landing — Stack.Protected ne redirige pas
    // toujours automatiquement sur Web après signOut
    router.replace('/' as RelativePathString);
  };

  const togglePanel = (p: 'signalement' | 'delete') =>
    setPanel((prev: 'signalement' | 'delete' | null) => (prev === p ? null : p));

  // ── Écran de chargement ─────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <CosmicBackground>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#FFD700" size="large" />
            <Text style={{ color: 'rgba(255,215,0,0.75)', marginTop: 12, fontSize: bodySize, fontStyle: 'italic' }}>
              Chargement de votre univers…
            </Text>
          </View>
        </CosmicBackground>
      </View>
    );
  }

  // ── Rendu principal ─────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
        >
          {/* ── En-tête ── */}
          <View style={{
            paddingTop: insets.top + 8,
            paddingHorizontal: px,
            paddingBottom: gap * 0.6,
            flexDirection: 'row',
            alignItems: 'center',
            gap: gap * 0.6,
          }}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Retour"
              style={{
                width: tapTarget, height: tapTarget, borderRadius: tapTarget / 2,
                backgroundColor: 'rgba(255,215,0,0.10)',
                borderWidth: 1, borderColor: 'rgba(255,215,0,0.22)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ChevronLeft size={iconSize} color="#FFD700" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#F5E6C8', fontSize: h2Size, fontWeight: '900', letterSpacing: 0.3 }}>
                Paramètres
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize, marginTop: 1 }}>
                Personnalisez votre expérience Aevyra
              </Text>
            </View>
          </View>

          {/* ── Contenu ── */}
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            overScrollMode="never"
            contentContainerStyle={{
              paddingHorizontal: isLarge ? 0 : px,
              paddingBottom: insets.bottom + 32,
              alignSelf: isLarge ? 'center' : undefined,
              width: isLarge ? contentMaxW : undefined,
            }}
          >

            {/* ════════════════════════════════════════════════
                0. MON PROFIL — accès rapide stratégique
                ──────────────────────────────────────────────
                Modifier profil · Parrainage · Carte astrale
                ════════════════════════════════════════════ */}
            <SectionTitle label="MON PROFIL" />
            <Card>
              <NavRow
                icon={<UserCog size={iconSize} color="#C084FC" />}
                label="Modifier mon profil"
                subtitle="Photo, bio, signes, centres d'intérêt"
                accentColor="#C084FC"
                onPress={() => router.push('/(app)/edit-profil' as RelativePathString)}
              />
              <NavRow
                icon={<Users size={iconSize} color="#FFD700" />}
                label="Parrainage"
                subtitle="Inviter des amis · Boost de visibilité"
                accentColor="#FFD700"
                onPress={() => router.push('/(app)/parrainage' as RelativePathString)}
              />
              <NavRow
                icon={<Star size={iconSize} color="#87CEEB" />}
                label="Carte Astrale"
                subtitle="Partager ma carte cosmique"
                accentColor="#87CEEB"
                onPress={() => router.push('/(app)/carte-astrale-share' as RelativePathString)}
                last
              />
            </Card>

            {/* ════════════════════════════════════════════════
                1. CONFIDENTIALITÉ & VIE PRIVÉE
                ════════════════════════════════════════════ */}
            <SectionTitle label="CONFIDENTIALITÉ & VIE PRIVÉE" />
            <Card>
              <ToggleRow
                icon={<Text style={{ fontSize: 16 }}>🎭</Text>}
                label="Mode Mystère Total"
                subtitle="Identité masquée jusqu'au déverrouillage mutuel"
                value={mysterieux}
                accentColor="#DDA0DD"
                saving={savingMystery}
                saveError={errorMystery}
                onToggle={(v) => toggleField(setMysterieux, 'is_mystery', v, setSavingMystery, setErrorMystery)}
              />
              {mysterieux && (
                <View style={{
                  marginBottom: 8, padding: 10, borderRadius: 10,
                  backgroundColor: 'rgba(221,160,221,0.10)',
                  borderWidth: 1, borderColor: 'rgba(221,160,221,0.22)',
                }}>
                  <Text style={{ color: 'rgba(221,160,221,0.8)', fontSize: bodySize, fontStyle: 'italic', lineHeight: 18 }}>
                    Votre profil n'est visible que de vos connexions confirmées. Votre vrai prénom reste caché.
                  </Text>
                </View>
              )}
              <NavRow
                icon={<Download size={iconSize} color="#87CEEB" />}
                label="Données personnelles (RGPD)"
                subtitle="Exporter mes données · Droit à l'oubli"
                accentColor="#87CEEB"
                onPress={handleExportData}
                last
              />
              {exporting && (
                <View style={{ paddingBottom: gap * 0.5, alignItems: 'center', flexDirection: 'row', gap: gap * 0.4, justifyContent: 'center' }}>
                  <ActivityIndicator size="small" color="#87CEEB" />
                  <Text style={{ color: '#87CEEB', fontSize: captionSize }}>Préparation de votre export…</Text>
                </View>
              )}
              {exportMsg && (
                <Text style={{ color: exportMsg.startsWith('✦') ? '#90EE90' : '#FF8080', fontSize: captionSize, paddingBottom: gap * 0.5, paddingLeft: 4, fontStyle: 'italic' }}>
                  {exportMsg}
                </Text>
              )}
            </Card>

            {/* ════ 2. PHRASE DE SÉCURITÉ ════ */}
            <SectionTitle label="PHRASE DE SÉCURITÉ" />
            <Card>
              <View style={{ paddingVertical: gap * 0.7, gap: gap * 0.6 }}>
                {phraseActuelle.length > 0 ? (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: gap * 0.5,
                    backgroundColor: 'rgba(255,215,0,0.06)', borderRadius: cardRadius * 0.6, padding: gap * 0.6,
                    borderWidth: 1, borderColor: 'rgba(255,215,0,0.14)',
                    minHeight: tapTarget * 0.8,
                  }}>
                    <Lock size={iconSize * 0.85} color="rgba(255,215,0,0.65)" />
                    <Text style={{ color: 'rgba(255,215,0,0.90)', fontSize: captionSize, fontWeight: '700' }}>
                      PHRASE ACTUELLE
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.90)', fontSize: bodySize, flex: 1 }} numberOfLines={1}>
                      {showPhrase ? phraseActuelle : '••••••••••••'}
                    </Text>
                    <Pressable
                      onPress={() => setShowPhrase((v: boolean) => !v)}
                      accessibilityRole="button"
                      accessibilityLabel={showPhrase ? 'Masquer la phrase' : 'Afficher la phrase'}
                      hitSlop={12}
                      style={{ minWidth: tapTarget * 0.7, minHeight: tapTarget * 0.7, alignItems: 'center', justifyContent: 'center' }}
                    >
                      {showPhrase
                        ? <EyeOff size={iconSize} color="rgba(255,215,0,0.65)" />
                        : <Eye size={iconSize} color="rgba(255,215,0,0.65)" />}
                    </Pressable>
                  </View>
                ) : (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: gap * 0.4,
                    backgroundColor: 'rgba(255,107,107,0.08)', borderRadius: cardRadius * 0.6, padding: gap * 0.6,
                    borderWidth: 1, borderColor: 'rgba(255,107,107,0.20)',
                  }}>
                    <Text style={{ fontSize: iconSize }}>⚠️</Text>
                    <Text style={{ color: 'rgba(255,150,150,0.9)', fontSize: captionSize, flex: 1, lineHeight: captionSize * 1.5 }}>
                      Aucune phrase définie. Ajoutez-en une pour sécuriser votre compte.
                    </Text>
                  </View>
                )}
                <TextInput
                  value={nouvellePhrase}
                  onChangeText={setNouvellePhrase}
                  placeholder={phraseActuelle ? 'Nouvelle phrase de sécurité…' : 'Définir une phrase de sécurité…'}
                  placeholderTextColor="rgba(255,255,255,0.50)"
                  autoCapitalize="sentences"
                  returnKeyType="done"
                  onSubmitEditing={handleSavePhrase}
                  style={{
                    color: '#fff', fontSize: bodySize, paddingVertical: tapTarget * 0.28, paddingHorizontal: cardRadius,
                    borderRadius: cardRadius * 0.6, borderWidth: 1,
                    borderColor: nouvellePhrase.trim().length >= 6
                      ? 'rgba(255,215,0,0.40)' : 'rgba(255,255,255,0.12)',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    minHeight: tapTarget,
                  }}
                />
                {phraseMsg && (
                  <Text style={{
                    fontSize: captionSize, fontStyle: 'italic',
                    color: phraseMsg.ok ? '#90EE90' : '#FF8080',
                  }}>
                    {phraseMsg.text}
                  </Text>
                )}
                <Pressable
                  onPress={handleSavePhrase}
                  disabled={savingPhrase || nouvellePhrase.trim().length < 6}
                  accessibilityRole="button"
                  accessibilityLabel="Enregistrer la phrase de sécurité"
                  style={{
                    borderRadius: cardRadius * 0.6, paddingVertical: buttonPadV, alignItems: 'center',
                    minHeight: tapTarget,
                    backgroundColor: nouvellePhrase.trim().length >= 6
                      ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)',
                    borderWidth: 1,
                    borderColor: nouvellePhrase.trim().length >= 6
                      ? 'rgba(255,215,0,0.40)' : 'rgba(255,255,255,0.08)',
                  }}
                >
                  <Text style={{
                    fontSize: bodySize, fontWeight: '700',
                    color: nouvellePhrase.trim().length >= 6 ? '#FFD700' : 'rgba(255,255,255,0.25)',
                  }}>
                    {savingPhrase ? 'Sauvegarde…' : '✦ Enregistrer la phrase'}
                  </Text>
                </Pressable>
              </View>
            </Card>

            {/* ════ 3. EXPÉRIENCE & SIGNAUX ════ */}
            <SectionTitle label="EXPÉRIENCE & SIGNAUX" />
            <Card>
              <ToggleRow
                icon={notifications
                  ? <Bell size={iconSize} color="#FF69B4" />
                  : <BellOff size={iconSize} color="rgba(255,255,255,0.3)" />}
                label="Notifications"
                subtitle="Connexions, messages, événements, coups du destin"
                value={notifications}
                accentColor="#FF69B4"
                saving={savingNotifs}
                saveError={errorNotifs}
                onToggle={(v) => toggleField(setNotifs, 'notif_enabled', v, setSavingNotifs, setErrorNotifs)}
              />
              <ToggleRow
                icon={<Zap size={iconSize * 0.85} color={synchronicite ? '#87CEEB' : 'rgba(255,255,255,0.3)'} />}
                label="Synchronicité"
                subtitle="Signal quand une âme est en ligne au même moment"
                value={synchronicite}
                accentColor="#87CEEB"
                saving={savingSync}
                saveError={errorSync}
                onToggle={(v) => toggleField(setSynchronicite, 'synchronicite_enabled', v, setSavingSync, setErrorSync)}
                last
              />
            </Card>

            {notifications && (
              <Pressable
                onPress={() => router.push('/(app)/notifications' as RelativePathString)}
                accessibilityRole="button"
                accessibilityLabel="Voir mes signaux du cosmos"
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: gap * 0.7,
                  marginTop: -gap * 0.5, marginBottom: gap, paddingHorizontal: gap * 0.8, paddingVertical: gap * 0.6,
                  borderRadius: cardRadius, borderWidth: 1,
                  borderColor: 'rgba(255,105,180,0.25)',
                  backgroundColor: 'rgba(255,105,180,0.08)',
                  minHeight: tapTarget,
                }}
              >
                <Sparkles size={iconSize} color="#FF69B4" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FF69B4', fontWeight: '700', fontSize: bodySize }}>
                    Voir mes Signaux du Cosmos
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize, marginTop: 1 }}>
                    Connexions · Plumes · Destin · Synchronicités
                  </Text>
                </View>
                <ChevronRight size={iconSize} color="rgba(255,105,180,0.45)" />
              </Pressable>
            )}

            {/* ════ 4. SÉCURITÉ & SUPPORT ════ */}
            <SectionTitle label="SÉCURITÉ & SUPPORT" />
            <Card>
              <NavRow
                icon={<Shield size={iconSize} color="#64FFB4" />}
                label="Cœur Vérifié"
                subtitle="Vérifiez et obtenez votre badge de confiance"
                accentColor="#64FFB4"
                onPress={() => router.push('/(app)/coeur-verifie' as RelativePathString)}
              />
              <NavRow
                icon={<HelpCircle size={iconSize} color="#FFD700" />}
                label="Signaler un problème"
                subtitle="Bug · Contenu inapproprié · Comportement"
                accentColor="#FFD700"
                onPress={() => togglePanel('signalement')}
                last
              />
              {panel === 'signalement' && (
                <PanelWrapper onClose={() => { setPanel(null); setSignalSent(false); setSignalMsg(''); setSignalCategorie(null); }}>
                  {signalSent ? (
                    <View style={{ alignItems: 'center', gap: gap * 0.6, paddingVertical: gap * 0.5 }}>
                      <Text style={{ fontSize: 32 }}>✦</Text>
                      <Text style={{ color: '#90EE90', textAlign: 'center', fontSize: bodySize, fontWeight: '700' }}>
                        Signalement envoyé
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: captionSize }}>
                        Merci pour votre vigilance. Notre équipe examine chaque signalement.
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* ── Titre unique ── */}
                      <Text style={{ color: '#FFD700', fontSize: bodySize, fontWeight: '800' }}>
                        🛡️ Signaler un problème
                      </Text>

                      {/* ── Sélecteur de catégorie ── */}
                      <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: captionSize, marginTop: 2 }}>
                        Choisissez une catégorie
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gap * 0.5 }}>
                        {([
                          { id: 'bug',          label: '🐛 Bug technique',         color: '#87CEEB' },
                          { id: 'comportement', label: '⚠️ Comportement abusif',   color: '#FF8C69' },
                          { id: 'contenu',      label: '🚫 Contenu inapproprié',   color: '#FF6B6B' },
                          { id: 'autre',        label: '💬 Autre',                 color: '#DDA0DD' },
                        ] as const).map(cat => (
                          <Pressable
                            key={cat.id}
                            onPress={() => setSignalCategorie(cat.id)}
                            style={{
                              paddingHorizontal: gap * 0.7, paddingVertical: gap * 0.35,
                              borderRadius: cardRadius * 0.5, borderWidth: 1,
                              backgroundColor: signalCategorie === cat.id ? cat.color + '22' : 'rgba(255,255,255,0.04)',
                              borderColor: signalCategorie === cat.id ? cat.color + '60' : 'rgba(255,255,255,0.10)',
                            }}
                          >
                            <Text style={{
                              color: signalCategorie === cat.id ? cat.color : 'rgba(255,255,255,0.55)',
                              fontSize: captionSize, fontWeight: signalCategorie === cat.id ? '700' : '400',
                            }}>
                              {cat.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>

                      {/* ── Zone de texte ── */}
                      <TextInput
                        value={signalMsg}
                        onChangeText={setSignalMsg}
                        placeholder="Décrivez le problème en détail…"
                        placeholderTextColor="rgba(255,255,255,0.35)"
                        multiline numberOfLines={3}
                        style={{
                          color: '#fff', fontSize: bodySize, paddingVertical: buttonPadV, paddingHorizontal: buttonPadH,
                          borderRadius: cardRadius * 0.55, borderWidth: 1, borderColor: 'rgba(255,215,0,0.18)',
                          backgroundColor: 'rgba(255,255,255,0.04)', minHeight: tapTarget * 1.8,
                          textAlignVertical: 'top',
                        }}
                      />

                      {/* ── Bouton envoi ── */}
                      <Pressable
                        onPress={handleSignalement}
                        disabled={signalMsg.trim().length < 10}
                        accessibilityRole="button"
                        accessibilityLabel="Envoyer le signalement"
                        style={{
                          borderRadius: cardRadius * 0.6, paddingVertical: buttonPadV, alignItems: 'center',
                          minHeight: tapTarget,
                          backgroundColor: signalMsg.trim().length >= 10
                            ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)',
                          borderWidth: 1,
                          borderColor: signalMsg.trim().length >= 10
                            ? 'rgba(255,215,0,0.40)' : 'rgba(255,255,255,0.08)',
                        }}
                      >
                        <Text style={{
                          fontSize: bodySize, fontWeight: '700',
                          color: signalMsg.trim().length >= 10 ? '#FFD700' : 'rgba(255,255,255,0.25)',
                        }}>
                          Envoyer le signalement
                        </Text>
                      </Pressable>
                    </>
                  )}
                </PanelWrapper>
              )}
            </Card>

            {/* ════════════════════════════════════════════════
                5. À PROPOS & LÉGAL
                ════════════════════════════════════════════ */}
            {/* ════ 5. À PROPOS & LÉGAL ════ */}
            <SectionTitle label="À PROPOS & LÉGAL" />
            <Card>
              <NavRow
                icon={<FileText size={iconSize} color="rgba(255,215,0,0.75)" />}
                label="Conditions d'utilisation"
                accentColor="#FFD700"
                onPress={() => router.push('/(legal)/cgu' as RelativePathString)}
              />
              <NavRow
                icon={<Lock size={iconSize} color="rgba(255,215,0,0.75)" />}
                label="Politique de confidentialité"
                accentColor="#FFD700"
                onPress={() => router.push('/(legal)/confidentialite' as RelativePathString)}
              />
              <NavRow
                icon={<MessageCircle size={iconSize} color="rgba(255,215,0,0.75)" />}
                label="Contact & Aide — WhatsApp"
                subtitle="Appuyer pour ouvrir WhatsApp directement"
                accentColor="#FFD700"
                onPress={handleWhatsApp}
                last
              />
            </Card>

            {/* ════════════════════════════════════════════════
                DÉCONNEXION
                ════════════════════════════════════════════ */}
            {/* ════ DÉCONNEXION ════ */}
            <Pressable
              onPress={handleLogout}
              disabled={signingOut}
              accessibilityRole="button"
              accessibilityLabel="Se déconnecter"
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: gap * 0.5,
                borderRadius: cardRadius, paddingVertical: buttonPadV * 1.1, marginBottom: gap * 0.6,
                minHeight: tapTarget,
                borderWidth: 1, borderColor: signingOut ? 'rgba(255,80,80,0.12)' : 'rgba(255,80,80,0.30)',
                backgroundColor: signingOut ? 'rgba(255,80,80,0.03)' : 'rgba(255,80,80,0.08)',
                opacity: signingOut ? 0.6 : 1,
              }}
            >
              <LogOut size={iconSize} color="rgba(255,100,100,0.8)" />
              <Text style={{ color: 'rgba(255,100,100,0.92)', fontSize: bodySize, fontWeight: '700' }}>
                {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
              </Text>
            </Pressable>

            {/* ════════════════════════════════════════════════
                SUPPRESSION DE COMPTE — tout en bas, zone danger
                ════════════════════════════════════════════ */}
            {/* ════ SUPPRESSION DE COMPTE ════ */}
            <Pressable
              onPress={() => togglePanel('delete')}
              accessibilityRole="button"
              accessibilityLabel="Supprimer mon compte"
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: gap * 0.5,
                borderRadius: cardRadius, paddingVertical: buttonPadV * 1.0, marginBottom: gap * 0.4,
                minHeight: tapTarget,
                borderWidth: 1, borderColor: 'rgba(180,0,0,0.25)',
                backgroundColor: 'rgba(180,0,0,0.06)',
              }}
            >
              <Trash2 size={iconSize} color="rgba(200,50,50,0.75)" />
              <Text style={{ color: 'rgba(200,50,50,0.80)', fontSize: bodySize, fontWeight: '600' }}>
                Supprimer mon compte
              </Text>
            </Pressable>

            {panel === 'delete' && (
              <PanelWrapper onClose={() => { setPanel(null); setDeleteConfirm(''); setDeleteError(null); }}>
                <Text style={{ color: '#FF6B6B', fontSize: bodySize * 1.1, fontWeight: '900' }}>
                  ⚠️ Suppression définitive
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: captionSize, lineHeight: captionSize * 1.55 }}>
                  Cette action est irréversible. Toutes vos données, messages, connexions et photos seront supprimés conformément au RGPD (droit à l'oubli).
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.80)', fontSize: captionSize }}>
                  Tapez <Text style={{ color: '#FF6B6B', fontWeight: '800' }}>supprimer</Text> pour confirmer :
                </Text>
                <TextInput
                  value={deleteConfirm}
                  onChangeText={setDeleteConfirm}
                  placeholder="supprimer"
                  placeholderTextColor="rgba(255,255,255,0.50)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    color: '#fff', fontSize: bodySize, paddingVertical: buttonPadV, paddingHorizontal: buttonPadH,
                    borderRadius: cardRadius * 0.55, borderWidth: 1,
                    borderColor: deleteConfirm.toLowerCase().trim() === 'supprimer'
                      ? 'rgba(255,107,107,0.5)' : 'rgba(255,255,255,0.10)',
                    backgroundColor: 'rgba(255,0,0,0.04)',
                    minHeight: tapTarget,
                  }}
                />
                {deleteError && (
                  <Text style={{ color: '#FF8080', fontSize: captionSize, fontStyle: 'italic' }}>{deleteError}</Text>
                )}
                <Pressable
                  onPress={handleDeleteAccount}
                  accessibilityRole="button"
                  accessibilityLabel="Confirmer la suppression du compte"
                  disabled={deleting || deleteConfirm.toLowerCase().trim() !== 'supprimer'}
                  style={{
                    borderRadius: cardRadius * 0.6, paddingVertical: buttonPadV, alignItems: 'center',
                    minHeight: tapTarget,
                    backgroundColor: deleteConfirm.toLowerCase().trim() === 'supprimer'
                      ? 'rgba(200,0,0,0.25)' : 'rgba(255,255,255,0.04)',
                    borderWidth: 1,
                    borderColor: deleteConfirm.toLowerCase().trim() === 'supprimer'
                      ? 'rgba(200,0,0,0.55)' : 'rgba(255,255,255,0.08)',
                  }}
                >
                  {deleting
                    ? <ActivityIndicator size="small" color="#FF6B6B" />
                    : <Text style={{
                        fontSize: bodySize, fontWeight: '700',
                        color: deleteConfirm.toLowerCase().trim() === 'supprimer'
                          ? '#FF6B6B' : 'rgba(255,255,255,0.20)',
                      }}>
                        Supprimer définitivement mon compte
                      </Text>
                  }
                </Pressable>
              </PanelWrapper>
            )}

            {/* ════════════════════════════════════════════════
                FOOTER — tout en bas de la page
                ════════════════════════════════════════════ */}
            <AppFooter isLarge={isLarge} />

          </ScrollView>
        </KeyboardAvoidingView>
      </CosmicBackground>
    </View>
  );
}
