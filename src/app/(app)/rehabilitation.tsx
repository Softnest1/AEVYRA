// Écran Réhabilitation — affiché quand l'utilisateur a une sanction active
// Ban temporaire : accès bloqué, mission à compléter, demande de grâce possible
// Mute : message d'info, mission de réhabilitation accessible
// FIXES v302 :
//  - État du texte (serment/poème) remonté dans le parent → survit aux re-renders
//  - router.replace dans useEffect → plus de crash React
//  - Pas de double bouton : MissionActionButton masqué pour les missions inline
//  - Import statique supabase dans MissionInlineWidget
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import {
  ActivityIndicator, Pressable, ScrollView,
  Text, TextInput, View,
} from 'react-native';
import { router, useFocusEffect, type RelativePathString } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/client/supabase';
import { MISSION_LABELS, MISSION_EMOJIS, MISSION_DESCRIPTIONS, type MissionType } from '@/lib/admin-api';

const BG    = '#0A0A14';
const GOLD  = '#C9A96E';
const RED   = '#E53E3E';
const AMBER = '#D97706';
const GREEN = '#48BB78';
const CARD  = '#12121F';

type ActiveSanction = {
  id: string;
  type: 'warning' | 'mute' | 'ban_temp' | 'ban_permanent';
  reason: string;
  expires_at: string | null;
  mission: MissionType | null;
  mission_target: number;
  mission_progress: number;
  mission_done: boolean;
};

type GraceState = 'idle' | 'sent' | 'loading';

function daysLeft(expires_at: string | null): number | null {
  if (!expires_at) return null;
  const diff = new Date(expires_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

function progressPct(progress: number, target: number): number {
  return target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : 0;
}

export default function RehabilitationScreen() { 
  const { bodySize, captionSize, px, h2Size, h3Size, gap, contentMaxWidth: _contentMaxWidth, iconSize, tapTarget: _tapTarget  } = useResponsive();
  const insets = useSafeAreaInsets();
  const [sanction, setSanction]   = useState<ActiveSanction | null>(null);
  const [loading, setLoading]     = useState(true);
  const [graceMsg, setGraceMsg]   = useState('');
  const [graceState, setGrace]    = useState<GraceState>('idle');
  const [graceStatus, setGraceStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [error, setError]         = useState('');
  // État du texte inline remonté ici → survit aux re-renders du parent
  const [inlineText, setInlineText]       = useState('');
  const [inlineSending, setInlineSending] = useState(false);
  const [inlineErr, setInlineErr]         = useState('');
  // État du questionnaire vibratoire (5 questions)
  const [vibeAnswers, setVibeAnswers] = useState(['', '', '', '', '']);
  const [vibeSending, setVibeSending] = useState(false);
  const [vibeErr, setVibeErr]         = useState('');
  // Flag pour éviter double navigation si sanction déjà absente
  const redirectedRef = useRef(false);

  useFocusEffect(useCallback(() => {
    redirectedRef.current = false;
    (async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace('/(auth)/sign-in' as never); return; }

        const { data } = await supabase
          .from('sanctions')
          .select('id, type, reason, expires_at, mission, mission_target, mission_progress, mission_done')
          .eq('user_id', user.id)
          .in('status', ['active', 'permanent'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setSanction(data ?? null);

        // Charger le statut de la demande de grâce existante (si déjà envoyée)
        if (data) {
          const { data: gr } = await supabase
            .from('grace_requests')
            .select('status')
            .eq('sanction_id', data.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (gr) {
            setGraceStatus(gr.status as 'pending' | 'approved' | 'rejected');
            if (gr.status !== 'rejected') setGrace('sent'); // masquer formulaire si déjà envoyé
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []));

  // FIX : router.replace hors du render, dans useEffect — évite le crash React
  useEffect(() => {
    if (!loading && !sanction && !redirectedRef.current) {
      redirectedRef.current = true;
      router.replace('/(app)/(tabs)/home' as never);
    }
  }, [loading, sanction]);

  const submitGrace = async () => {
    if (!sanction || !sanction.mission_done) return;
    // Guard client : déjà envoyée (UNIQUE DB côté serveur mais éviter le round-trip)
    if (graceState === 'sent' || graceState === 'loading') return;
    setGrace('loading');
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error: err } = await supabase.from('grace_requests').insert({
        sanction_id: sanction.id,
        user_id: user.id,
        message: graceMsg.trim() || null,
      });
      if (err) {
        // Code 23505 = violation UNIQUE → demande déjà envoyée
        if (err.code === '23505') {
          setGrace('sent');
          setGraceStatus('pending');
          return;
        }
        throw err;
      }
      setGrace('sent');
      setGraceStatus('pending');
    } catch (e: unknown) {
      setError((e as Error).message);
      setGrace('idle');
    }
  };

  // Progression mission — vérification anti-triche côté DB via verify_and_progress_mission
  const doMissionAction = useCallback(async (type: MissionType) => {
    if (!sanction || sanction.mission !== type) return;
    // Guard : mission déjà terminée → ne pas re-appeler le RPC
    if (sanction.mission_done) return;
    setError('');
    const { data, error: rpcErr } = await supabase.rpc('verify_and_progress_mission', {
      p_mission_type: type,
    });
    if (rpcErr || !data?.ok) {
      setError(data?.error ?? rpcErr?.message ?? 'Vérification échouée');
      return;
    }
    // Rafraîchir la sanction après progression
    const { data: fresh } = await supabase
      .from('sanctions')
      .select('id, type, reason, expires_at, mission, mission_target, mission_progress, mission_done')
      .eq('id', sanction.id)
      .single();
    if (fresh) setSanction(fresh);
    // Mission terminée + levée automatique → retour accueil
    if (data.done && data.auto_lifted) {
      setTimeout(() => router.replace('/(app)/(tabs)/home' as never), 1500);
    }
  }, [sanction]);

  // Soumission inline (serment du miroir / poème de guérison / lettre à l'âme)
  const submitInline = useCallback(async (
    fieldName: 'mirror_oath_text' | 'healing_poem' | 'soul_letter_text',
    missionType: MissionType,
  ) => {
    if (!inlineText.trim()) return;
    // Guard double-submit : mission déjà terminée
    if (sanction?.mission_done) return;
    if (inlineSending) return;
    setInlineSending(true);
    setInlineErr('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setInlineSending(false); return; }
    const { error: upErr } = await supabase
      .from('profiles')
      .update({ [fieldName]: inlineText.trim() })
      .eq('id', user.id);
    if (upErr) { setInlineErr(upErr.message); setInlineSending(false); return; }
    await doMissionAction(missionType);
    setInlineSending(false);
  }, [inlineText, inlineSending, sanction, doMissionAction]);

  // Soumission questionnaire vibratoire (5 réponses)
  const submitVibration = useCallback(async () => {
    if (!sanction) return;
    // Guard double-submit : mission déjà terminée
    if (sanction.mission_done) return;
    if (vibeSending) return;
    if (vibeAnswers.some((a: string) => a.trim().length < 10)) {
      setVibeErr('Chaque réponse doit faire au moins 10 caractères');
      return;
    }
    setVibeSending(true);
    setVibeErr('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setVibeSending(false); return; }
    const { error: insErr } = await supabase.from('vibration_answers').insert({
      user_id: user.id,
      sanction_id: sanction.id,
      q1: vibeAnswers[0].trim(),
      q2: vibeAnswers[1].trim(),
      q3: vibeAnswers[2].trim(),
      q4: vibeAnswers[3].trim(),
      q5: vibeAnswers[4].trim(),
    });
    if (insErr) {
      // Si contrainte UNIQUE violée : la soumission existe déjà → considérer comme succès
      if (insErr.code === '23505') {
        await doMissionAction('vibration_reset');
      } else {
        setVibeErr(insErr.message);
      }
      setVibeSending(false);
      return;
    }
    await doMissionAction('vibration_reset');
    setVibeSending(false);
  }, [sanction, vibeAnswers, vibeSending, doMissionAction]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar style="light" />
        <ActivityIndicator color={GOLD} size="large" />
      </View>
    );
  }

  if (!sanction) return null; // useEffect gère la redirection

  const pct      = sanction.mission ? progressPct(sanction.mission_progress, sanction.mission_target) : 0;
  const remaining = daysLeft(sanction.expires_at);
  const isBan    = sanction.type === 'ban_temp' || sanction.type === 'ban_permanent';
  const isPerm   = sanction.type === 'ban_permanent';
  const accentColor = isPerm ? RED : isBan ? AMBER : GOLD;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40, paddingHorizontal: px, gap }}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* En-tête choc */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <Text style={{ fontSize: iconSize * 2.2, marginBottom: 8 }}>
            {isPerm ? '🚫' : isBan ? '⛔' : '🔇'}
          </Text>
          <Text style={{ color: accentColor, fontSize: h2Size, fontWeight: '900', textAlign: 'center' }}>
            {isPerm ? 'Compte banni définitivement'
              : isBan ? `Accès suspendu ${remaining != null ? `— ${remaining}j restant${remaining > 1 ? 's' : ''}` : ''}`
              : `Mute actif ${remaining != null ? `— ${remaining}j restant${remaining > 1 ? 's' : ''}` : ''}`}
          </Text>
          <Text style={{ color: '#A8A8CC', fontSize: bodySize, textAlign: 'center', marginTop: 8, lineHeight: bodySize * 1.5 }}>
            {sanction.reason}
          </Text>
        </View>

        {/* Carte raison */}
        <View style={{
          backgroundColor: CARD, borderRadius: 18, padding: 18, marginBottom: 18,
          borderWidth: 1, borderColor: `${accentColor}30`,
        }}>
          <Text style={{ color: GOLD, fontSize: captionSize, fontWeight: '700', marginBottom: 8 }}>
            POURQUOI CETTE SANCTION ?
          </Text>
          <Text style={{ color: '#CCCCE0', fontSize: bodySize, lineHeight: bodySize * 1.5 }}>{sanction.reason}</Text>

          {!isPerm && (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#ffffff10' }}>
              <Text style={{ color: '#A8A8CC', fontSize: bodySize }}>
                {remaining != null
                  ? `⏳ Fin automatique dans ${remaining} jour${remaining > 1 ? 's' : ''}`
                  : '⏳ Durée indéterminée'}
              </Text>
            </View>
          )}
        </View>

        {/* MESSAGE BAN PERMANENT */}
        {isPerm && (
          <View style={{ backgroundColor: `${RED}14`, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: `${RED}40`, gap: 10 }}>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 32 }}>⚠️</Text>
              <Text style={{ color: RED, fontSize: h3Size, fontWeight: '800', textAlign: 'center' }}>
                Cette décision est définitive
              </Text>
              <Text style={{ color: '#FC8181', fontSize: bodySize, textAlign: 'center', lineHeight: 20 }}>
                Votre compte a été banni de façon permanente suite à de graves violations de notre Charte.
              </Text>
            </View>
            {/* Porte de sortie humaine — formulaire contact (pas WhatsApp direct) */}
            <View style={{
              backgroundColor: '#ffffff08', borderRadius: 14, padding: 14, marginTop: 4,
              borderWidth: 1, borderColor: '#ffffff12', gap: 6,
            }}>
              <Text style={{ color: '#CCCCE0', fontSize: captionSize, fontWeight: '700' }}>
                💬 Vous pensez que c'est une erreur ?
              </Text>
              <Text style={{ color: '#A8A8CC', fontSize: captionSize, lineHeight: 18 }}>
                Notre équipe examine chaque contestation avec attention.{'\n'}
                Utilisez le formulaire de contact pour expliquer votre situation.
              </Text>
              <Pressable
                onPress={() => router.push('/(legal)/contact?type=comportement' as RelativePathString)}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  backgroundColor: '#25D36618', borderRadius: 12, paddingVertical: 11,
                  borderWidth: 1, borderColor: '#25D36635', marginTop: 4,
                }}
              >
                <Text style={{ fontSize: 16 }}>✉️</Text>
                <Text style={{ color: '#25D366', fontSize: captionSize, fontWeight: '700' }}>
                  Contacter le support →
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* MISSION DE RÉHABILITATION */}
        {!isPerm && sanction.mission && (
          <View style={{
            backgroundColor: CARD, borderRadius: 18, padding: 20, marginBottom: 18,
            borderWidth: 1, borderColor: `${GOLD}25`,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Text style={{ fontSize: 28 }}>{(MISSION_EMOJIS as any)[sanction.mission]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: GOLD, fontSize: bodySize, fontWeight: '700' }}>VOTRE MISSION</Text>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 2 }}>
                  {(MISSION_LABELS as any)[sanction.mission]}
                </Text>
              </View>
            </View>
            {/* Description de la mission */}
            <Text style={{ color: '#9999BB', fontSize: bodySize, lineHeight: bodySize * 1.55, marginBottom: 14 }}>
              {(MISSION_DESCRIPTIONS as any)[sanction.mission]}
            </Text>

            {/* Barre de progression */}
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: '#A8A8CC', fontSize: 12 }}>Progression</Text>
                <Text style={{ color: '#A8A8CC', fontSize: captionSize }}>Progression</Text>
                <Text style={{ color: pct >= 100 ? GREEN : GOLD, fontSize: captionSize, fontWeight: '700' }}>
                  {pct}%
                </Text>
              </View>
              <View style={{ height: 10, backgroundColor: '#ffffff14', borderRadius: 5, overflow: 'hidden' }}>
                <LinearGradient
                  colors={pct >= 100 ? [GREEN, '#68D391'] : [GOLD, '#D4B896']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ height: 10, width: `${pct}%`, borderRadius: 5 }}
                />
              </View>
              <Text style={{ color: '#A8A8CC', fontSize: captionSize, marginTop: 4, textAlign: 'right' }}>
                {sanction.mission_progress} / {sanction.mission_target}
              </Text>
            </View>

            {/* Widget inline selon la mission */}
            {!sanction.mission_done && (
              <MissionInlineWidget
                mission={sanction.mission}
                onSubmitInline={submitInline}
                onSubmitVibration={submitVibration}
                inlineText={inlineText}
                onChangeText={setInlineText}
                sending={inlineSending}
                error={inlineErr || error}
                vibeAnswers={vibeAnswers}
                onChangeVibe={(i, v) => setVibeAnswers((prev: string[]) => { const n = [...prev]; n[i] = v; return n; })}
                vibeSending={vibeSending}
                vibeErr={vibeErr}
              />
            )}

            {/* Bouton de navigation (uniquement pour les missions sans widget inline) */}
            {!sanction.mission_done && !INLINE_MISSIONS.includes(sanction.mission) && (
              <MissionActionButton mission={sanction.mission} />
            )}

            {sanction.mission_done && (
              <View style={{ alignItems: 'center', gap: 4, paddingVertical: 8 }}>
                <Text style={{ fontSize: 28 }}>🎉</Text>
                <Text style={{ color: GREEN, fontSize: 14, fontWeight: '800' }}>Mission accomplie !</Text>
                <Text style={{ color: '#A8A8CC', fontSize: captionSize }}>Vous pouvez maintenant demander une grâce</Text>
              </View>
            )}
          </View>
        )}

        {/* DEMANDE DE GRÂCE */}
        {!isPerm && sanction.mission && sanction.mission_done && graceState !== 'sent' && (
          <View style={{
            backgroundColor: CARD, borderRadius: 18, padding: 20, marginBottom: 18,
            borderWidth: 1, borderColor: `${GREEN}25`,
          }}>
            <Text style={{ color: GREEN, fontSize: 14, fontWeight: '800', marginBottom: 6 }}>
              ✨ Demander une grâce anticipée
            </Text>
            <Text style={{ color: '#A8A8CC', fontSize: bodySize, marginBottom: 14, lineHeight: 18 }}>
              Votre mission est terminée ! Laissez un message pour l'équipe Aevyra et demandez à être rétabli(e) avant la fin de la sanction.
            </Text>
            <TextInput
              value={graceMsg}
              onChangeText={setGraceMsg}
              placeholder="Un mot sincère pour l'équipe (facultatif)…"
              placeholderTextColor="#7878A0"
              multiline
              style={{
                backgroundColor: '#ffffff08', borderRadius: 12, padding: 14,
                color: '#fff', fontSize: 14, borderWidth: 1, borderColor: `${GREEN}20`,
                minHeight: 80, marginBottom: 14,
              }}
            />
            {error ? <Text style={{ color: RED, fontSize: 13, marginBottom: 8 }}>{error}</Text> : null}
            <Pressable
              onPress={submitGrace}
              disabled={graceState === 'loading'}
              style={{ backgroundColor: GREEN, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
            >
              {graceState === 'loading'
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ color: '#0A0A14', fontSize: 15, fontWeight: '900' }}>
                    🕊️ Envoyer ma demande de grâce
                  </Text>
              }
            </Pressable>
          </View>
        )}

        {/* Confirmation envoi + suivi statut grâce */}
        {graceState === 'sent' && (
          <View style={{
            backgroundColor: graceStatus === 'approved' ? `${GREEN}14` : graceStatus === 'rejected' ? `${RED}14` : `${GREEN}14`,
            borderRadius: 18, padding: 24,
            alignItems: 'center', gap: 10,
            borderWidth: 1,
            borderColor: graceStatus === 'approved' ? `${GREEN}30` : graceStatus === 'rejected' ? `${RED}30` : `${GREEN}30`,
          }}>
            <Text style={{ fontSize: 40 }}>
              {graceStatus === 'approved' ? '🎉' : graceStatus === 'rejected' ? '😔' : '🕊️'}
            </Text>
            <Text style={{ color: graceStatus === 'rejected' ? RED : GREEN, fontSize: 16, fontWeight: '900', textAlign: 'center' }}>
              {graceStatus === 'approved' ? 'Grâce accordée !'
                : graceStatus === 'rejected' ? 'Demande refusée'
                : 'Demande envoyée !'}
            </Text>
            <Text style={{ color: '#A8A8CC', fontSize: bodySize, textAlign: 'center', lineHeight: 20 }}>
              {graceStatus === 'approved'
                ? 'L\'équipe Aevyra a accepté ta demande.\nTon accès sera rétabli très prochainement. 💫'
                : graceStatus === 'rejected'
                ? 'L\'équipe a étudié ta demande mais ne peut pas l\'accorder pour l\'instant.\nPatiente jusqu\'à la fin de ta sanction.'
                : 'L\'équipe Aevyra a reçu ta demande.\nRépense sous 24-48h. Merci pour tes efforts 💫'}
            </Text>
            {/* Indicateur de statut */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: '#ffffff08', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
            }}>
              <View style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: graceStatus === 'approved' ? GREEN : graceStatus === 'rejected' ? RED : AMBER,
              }} />
              <Text style={{ color: '#CCCCE0', fontSize: captionSize, fontWeight: '600' }}>
                {graceStatus === 'approved' ? 'Accordée'
                  : graceStatus === 'rejected' ? 'Refusée'
                  : 'En cours d\'examen…'}
              </Text>
            </View>
          </View>
        )}

        {/* Info si pas de mission */}
        {!isPerm && !sanction.mission && (
          <View style={{ gap: 12 }}>
            <View style={{ backgroundColor: `${AMBER}10`, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: `${AMBER}25`, alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 32 }}>⏳</Text>
              <Text style={{ color: AMBER, fontSize: 15, fontWeight: '700', textAlign: 'center' }}>
                Patientez jusqu'à la fin de votre sanction
              </Text>
              <Text style={{ color: '#A8A8CC', fontSize: bodySize, textAlign: 'center', lineHeight: 18 }}>
                Aucune mission n'a été assignée.{'\n'}
                {remaining != null
                  ? `Votre accès sera rétabli dans ${remaining} jour${remaining > 1 ? 's' : ''}.`
                  : 'Votre accès sera rétabli prochainement.'}
              </Text>
            </View>
            {/* Bloc "Prouve ta motivation" — lecture seule d'un défi */}
            <View style={{
              backgroundColor: '#ffffff06', borderRadius: 18, padding: 18,
              borderWidth: 1, borderColor: '#ffffff10', gap: 10,
            }}>
              <Text style={{ color: GOLD, fontSize: captionSize, fontWeight: '800' }}>
                💡 En attendant, prouve ta motivation
              </Text>
              <Text style={{ color: '#A8A8CC', fontSize: bodySize, lineHeight: 20 }}>
                Même pendant ta suspension, tu peux te préparer à revenir plus fort.{'\n'}
                Prends 5 minutes pour réfléchir sincèrement à ces questions :
              </Text>
              {[
                '🌟 Qu\'est-ce qui te manque le plus sur Aevyra ?',
                '🪞 Qu\'aurais-tu fait différemment ?',
                '💫 Quel engagement peux-tu prendre envers toi-même pour la suite ?',
              ].map((q, i) => (
                <View key={i} style={{
                  backgroundColor: '#ffffff08', borderRadius: 12, padding: 12,
                  borderWidth: 1, borderColor: '#ffffff10',
                }}>
                  <Text style={{ color: '#CCCCE0', fontSize: captionSize, lineHeight: 18 }}>{q}</Text>
                </View>
              ))}
              <Text style={{ color: '#7878A0', fontSize: captionSize, textAlign: 'center', marginTop: 4 }}>
                Ces réflexions ne sont pas soumises — elles sont pour toi. ✨
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Missions avec widget inline (pas de bouton de navigation séparé)
const INLINE_MISSIONS: MissionType[] = [
  'soul_letter', 'vibration_reset',
  'mirror_oath', 'healing_poem',
  'cosmic_kindness', 'star_reading', 'constellation_builder',
];

// ── Widget inline pour missions nécessitant une saisie dans la page ──────────
function MissionInlineWidget({
  mission, onSubmitInline, onSubmitVibration,
  inlineText, onChangeText, sending, error,
  vibeAnswers, onChangeVibe, vibeSending, vibeErr,
}: {
  mission: MissionType;
  onSubmitInline: (field: 'mirror_oath_text' | 'healing_poem' | 'soul_letter_text', type: MissionType) => void;
  onSubmitVibration: () => void;
  inlineText: string;
  onChangeText: (t: string) => void;
  sending: boolean;
  error: string;
  vibeAnswers: string[];
  onChangeVibe: (i: number, v: string) => void;
  vibeSending: boolean;
  vibeErr: string;
}) { 
  const { bodySize, captionSize  } = useResponsive();
  const GOLD   = '#C9A96E';
  const PINK   = '#EC4899';
  const TEAL   = '#0D9488';
  const PURPLE = '#A78BFA';
  const AMBER  = '#F59E0B';
  const INDIGO = '#6366F1';

  // ── 💌 Lettre à son âme ────────────────────────────────────────
  if (mission === 'soul_letter') {
    return (
      <View style={{ gap: 10, marginBottom: 12 }}>
        <Text style={{ color: INDIGO, fontSize: captionSize, fontWeight: '700' }}>
          💌 Cher(e) moi… Qu'est-ce que ton âme a besoin d'entendre ? (min. 100 caractères)
        </Text>
        <TextInput
          value={inlineText}
          onChangeText={onChangeText}
          placeholder={'Cher(e) moi,\n\nJe t\'écris aujourd\'hui pour te dire que…'}
          placeholderTextColor="#7878A0"
          multiline
          style={{
            backgroundColor: '#ffffff08', borderRadius: 12, padding: 14,
            color: '#fff', fontSize: 14, borderWidth: 1, borderColor: `${INDIGO}30`,
            minHeight: 110, lineHeight: 22,
          }}
        />
        <Text style={{ color: '#A8A8CC', fontSize: captionSize, textAlign: 'right' }}>
          {inlineText.trim().length} / 100 car.
        </Text>
        {error ? <Text style={{ color: '#FC8181', fontSize: captionSize }}>{error}</Text> : null}
        <Pressable
          disabled={sending || inlineText.trim().length < 100}
          onPress={() => onSubmitInline('soul_letter_text', 'soul_letter')}
          style={{
            backgroundColor: inlineText.trim().length >= 100 ? INDIGO : '#ffffff10',
            borderRadius: 12, paddingVertical: 12, alignItems: 'center',
          }}
        >
          <Text style={{ color: inlineText.trim().length >= 100 ? '#fff' : '#7878A0', fontWeight: '800', fontSize: 14 }}>
            {sending ? '…' : '💌 Envoyer ma lettre'}
          </Text>
        </Pressable>
      </View>
    );
  }

  // ── 🔮 Réinitialisation vibratoire ─────────────────────────────
  const VIBE_QUESTIONS = [
    'Qu\'est-ce qui t\'a poussé(e) à agir de cette façon ?',
    'Quelle émotion ressentais-tu à ce moment-là ?',
    'Comment penses-tu que l\'autre personne a vécu cette situation ?',
    'Qu\'aurais-tu pu faire différemment ?',
    'Quel engagement prends-tu envers toi-même pour la suite ?',
  ];
  if (mission === 'vibration_reset') {
    const allFilled = vibeAnswers.every(a => a.trim().length >= 10);
    return (
      <View style={{ gap: 14, marginBottom: 12 }}>
        {VIBE_QUESTIONS.map((q, i) => (
          <React.Fragment key={i}>
            <View style={{ gap: 6 }}>
            <Text style={{ color: PURPLE, fontSize: captionSize, fontWeight: '700' }}>
              {i + 1}. {q}
            </Text>
            <TextInput
              value={vibeAnswers[i]}
              onChangeText={v => onChangeVibe(i, v)}
              placeholder="Ta réponse sincère…"
              placeholderTextColor="#7878A0"
              multiline
              style={{
                backgroundColor: '#ffffff08', borderRadius: 10, padding: 12,
                color: '#fff', fontSize: bodySize, borderWidth: 1,
                borderColor: vibeAnswers[i].trim().length >= 10 ? `${PURPLE}50` : `${PURPLE}20`,
                minHeight: 60,
              }}
            />
            <Text style={{ color: '#A8A8CC', fontSize: captionSize * 0.85, textAlign: 'right' }}>
              {vibeAnswers[i].trim().length} / 10 min.
            </Text>
          </View>
          </React.Fragment>
        ))}
        {vibeErr ? <Text style={{ color: '#FC8181', fontSize: captionSize }}>{vibeErr}</Text> : null}
        <Pressable
          disabled={vibeSending || !allFilled}
          onPress={onSubmitVibration}
          style={{
            backgroundColor: allFilled ? PURPLE : '#ffffff10',
            borderRadius: 12, paddingVertical: 13, alignItems: 'center',
          }}
        >
          <Text style={{ color: allFilled ? '#fff' : '#7878A0', fontWeight: '800', fontSize: 14 }}>
            {vibeSending ? '…' : '🔮 Soumettre ma réinitialisation'}
          </Text>
        </Pressable>
      </View>
    );
  }

  // ── 🪞 Serment du miroir ───────────────────────────────────────
  if (mission === 'mirror_oath') {
    return (
      <View style={{ gap: 10, marginBottom: 12 }}>
        <Text style={{ color: PINK, fontSize: captionSize, fontWeight: '700' }}>
          🪞 Qu'avez-vous compris sur vous-même ? Soyez sincère (min. 80 caractères) :
        </Text>
        <TextInput
          value={inlineText}
          onChangeText={onChangeText}
          placeholder="Je reconnais que mon comportement a blessé… Désormais je m'engage à…"
          placeholderTextColor="#7878A0"
          multiline
          style={{
            backgroundColor: '#ffffff08', borderRadius: 12, padding: 14,
            color: '#fff', fontSize: 14, borderWidth: 1, borderColor: `${PINK}25`,
            minHeight: 90,
          }}
        />
        {error ? <Text style={{ color: '#FC8181', fontSize: captionSize }}>{error}</Text> : null}
        <Pressable
          disabled={sending || inlineText.trim().length < 80}
          onPress={() => onSubmitInline('mirror_oath_text', 'mirror_oath')}
          style={{
            backgroundColor: inlineText.trim().length >= 80 ? PINK : '#ffffff10',
            borderRadius: 12, paddingVertical: 12, alignItems: 'center',
          }}
        >
          <Text style={{ color: inlineText.trim().length >= 80 ? '#fff' : '#7878A0', fontWeight: '800', fontSize: 14 }}>
            {sending ? '…' : `🪞 Prononcer mon serment (${inlineText.trim().length}/80)`}
          </Text>
        </Pressable>
      </View>
    );
  }

  // ── 📿 Poème de guérison ───────────────────────────────────────
  if (mission === 'healing_poem') {
    const lineCount = inlineText.trim() ? inlineText.trim().split('\n').filter(l => l.trim().length > 0).length : 0;
    return (
      <View style={{ gap: 10, marginBottom: 12 }}>
        <Text style={{ color: AMBER, fontSize: captionSize, fontWeight: '700' }}>
          📿 Écrivez un poème ou haïku de guérison — au moins 3 lignes, 50 caractères :
        </Text>
        <TextInput
          value={inlineText}
          onChangeText={onChangeText}
          placeholder={'Sous les étoiles blessées,\nMon âme apprend à pardonner,\nAevyra me guide vers la lumière.'}
          placeholderTextColor="#7878A0"
          multiline
          style={{
            backgroundColor: '#ffffff08', borderRadius: 12, padding: 14,
            color: '#fff', fontSize: 14, borderWidth: 1, borderColor: `${AMBER}25`,
            minHeight: 90, lineHeight: 22,
          }}
        />
        <Text style={{ color: '#A8A8CC', fontSize: captionSize, textAlign: 'right' }}>
          {lineCount} ligne{lineCount > 1 ? 's' : ''} · {inlineText.trim().length} car.
        </Text>
        {error ? <Text style={{ color: '#FC8181', fontSize: captionSize }}>{error}</Text> : null}
        <Pressable
          disabled={sending || inlineText.trim().length < 50 || lineCount < 3}
          onPress={() => onSubmitInline('healing_poem', 'healing_poem')}
          style={{
            backgroundColor: (inlineText.trim().length >= 50 && lineCount >= 3) ? AMBER : '#ffffff10',
            borderRadius: 12, paddingVertical: 12, alignItems: 'center',
          }}
        >
          <Text style={{
            color: (inlineText.trim().length >= 50 && lineCount >= 3) ? '#0A0A14' : '#7878A0',
            fontWeight: '800', fontSize: 14,
          }}>
            {sending ? '…' : '📿 Déposer mon poème'}
          </Text>
        </Pressable>
      </View>
    );
  }

  // ── 💜 Bienveillance cosmique — guide ─────────────────────────
  if (mission === 'cosmic_kindness') {
    return (
      <View style={{
        backgroundColor: `${PURPLE}14`, borderRadius: 12, padding: 14, marginBottom: 12,
        borderWidth: 1, borderColor: `${PURPLE}25`, gap: 8,
      }}>
        <Text style={{ color: PURPLE, fontSize: captionSize, fontWeight: '700' }}>💜 Comment progresser ?</Text>
        <Text style={{ color: '#AAAACC', fontSize: bodySize, lineHeight: bodySize * 1.55 }}>
          Rendez-vous dans la{' '}
          <Text style={{ color: PURPLE, fontWeight: '700' }}>Constellation</Text>
          {' '}et likez sincèrement des âmes que vous n'avez jamais approchées.{'\n'}
          Chaque like compte — pas de spam, uniquement des cœurs authentiques.
        </Text>
        <Text style={{ color: '#A8A8CC', fontSize: captionSize }}>💜 La progression se met à jour automatiquement.</Text>
      </View>
    );
  }

  // ── 🌠 Lecture des étoiles — guide ────────────────────────────
  if (mission === 'star_reading') {
    return (
      <View style={{
        backgroundColor: `${GOLD}0D`, borderRadius: 12, padding: 14, marginBottom: 12,
        borderWidth: 1, borderColor: `${GOLD}20`, gap: 8,
      }}>
        <Text style={{ color: GOLD, fontSize: captionSize, fontWeight: '700' }}>🌠 Comment lire une âme ?</Text>
        <Text style={{ color: '#AAAACC', fontSize: bodySize, lineHeight: bodySize * 1.55 }}>
          Depuis la{' '}
          <Text style={{ color: GOLD, fontWeight: '700' }}>Constellation</Text>,
          visitez le profil d'un(e) inconnu(e) et laissez{' '}
          <Text style={{ color: GOLD, fontWeight: '700' }}>un commentaire astrologique sincère</Text>
          {' '}— signe, énergie, ressenti. Répétez pour 3 âmes différentes.
        </Text>
      </View>
    );
  }

  // ── ✨ Bâtisseur de constellation — guide ─────────────────────
  if (mission === 'constellation_builder') {
    return (
      <View style={{
        backgroundColor: `${TEAL}14`, borderRadius: 12, padding: 14, marginBottom: 12,
        borderWidth: 1, borderColor: `${TEAL}25`, gap: 6,
      }}>
        <Text style={{ color: TEAL, fontSize: captionSize, fontWeight: '700' }}>✨ Champs à remplir dans votre profil :</Text>
        {[
          { emoji: '♈', label: 'Signe astrologique' },
          { emoji: '⬆️', label: 'Signe ascendant' },
          { emoji: '🪐', label: 'Planète dominante' },
          { emoji: '🌊', label: 'Élément (Feu/Terre/Air/Eau)' },
        ].map(({ emoji, label }) => (
          <React.Fragment key={label}>
          <Text style={{ color: '#AAAACC', fontSize: bodySize }}>{emoji}  {label}</Text>
          </React.Fragment>
        ))}
      </View>
    );
  }

  return null;
}

// ── Bouton de navigation (missions qui redirigent vers un autre écran) ────────
function MissionActionButton({ mission }: { mission: MissionType }) { 
  const { bodySize: _bodySize, captionSize: _captionSize  } = useResponsive();
  const TEAL = '#0D9488';

  const NAV_MISSIONS: Partial<Record<MissionType, { label: string; emoji: string; color: string; route: string }>> = {
    constellation_builder: { label: 'Compléter ma constellation', emoji: '✨', color: TEAL,     route: '/(app)/edit-profil' },
    star_reading:          { label: 'Explorer la Constellation',  emoji: '🌠', color: '#C9A96E', route: '/(app)/(tabs)/home' },
    cosmic_kindness:       { label: 'Explorer la Constellation',  emoji: '💜', color: '#7C3AED', route: '/(app)/(tabs)/home' },
  };

  const nav = NAV_MISSIONS[mission];
  if (!nav) return null; // missions inline → pas de bouton nav

  return (
    <Pressable
      onPress={() => { router.push(nav.route as never); }}
      style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: `${nav.color}18`, borderRadius: 12, paddingVertical: 13,
        borderWidth: 1, borderColor: `${nav.color}35`, marginTop: 4,
      }}
    >
      <Text style={{ fontSize: 18 }}>{nav.emoji}</Text>
      <Text style={{ color: nav.color, fontSize: 14, fontWeight: '700' }}>{nav.label}</Text>
    </Pressable>
  );
}