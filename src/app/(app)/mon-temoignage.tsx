// Aevyra – Soumettre / gérer son témoignage (membres connectés uniquement)
// Conformité art. L.111-7-2 Code de la Consommation : consentement explicite + modération
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import CosmicBackground from '@/components/CosmicBackground';
import {
  getMonTemoignage, submitTemoignage,
  deleteMonTemoignage, type Temoignage,
} from '@/lib/amour-api';
import { supabase } from '@/client/supabase';
import { useResponsive } from '@/hooks/useResponsive';

const MIN_CHARS = 30;
const MAX_CHARS = 600;

export default function MonTemoignage() { 
  const insets = useSafeAreaInsets();
  const { px, bodySize, captionSize, h2Size, h3Size, gap, contentMaxWidth, iconSize, tapTarget: _tapTarget  } = useResponsive();
  const [existing, setExisting]     = useState<Temoignage | null>(null);
  const [loading, setLoading]       = useState(true);
  const [texte, setTexte]           = useState('');
  const [consentement, setConsentement] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [erreur, setErreur]         = useState('');
  const [succes, setSucces]         = useState('');
  // ── Mode édition d'un témoignage existant ────────────────
  const [editing, setEditing]       = useState(false);
  const [editTexte, setEditTexte]   = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // useFocusEffect : recharge le témoignage à chaque retour sur cet écran
  // (useEffect seul ne se ré-exécute pas si on navigue puis revient)
  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        const t = await getMonTemoignage();
        setExisting(t);
      } catch (e) {
        console.error('[MonTemoignage] Chargement échoué', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []));

  const handleSubmit = async () => {
    setErreur('');
    if (!consentement) {
      setErreur('Vous devez cocher la case de consentement pour continuer.');
      return;
    }
    if (texte.trim().length < MIN_CHARS) {
      setErreur(`Votre témoignage doit faire au moins ${MIN_CHARS} caractères.`);
      return;
    }
    setSubmitting(true);
    const res = await submitTemoignage(texte);
    setSubmitting(false);
    if (res.success) {
      setSucces('Témoignage soumis ✦ Il sera visible après modération (24–48 h).');
      const t = await getMonTemoignage();
      setExisting(t);
      setTexte('');
      // Anti-triche : vérification DB côté serveur avant de progresser la mission
      void supabase.rpc('verify_and_progress_mission', { p_mission_type: 'testimonial' })
        .then(({ data }: { data: { done?: boolean } | null }) => {
          if (data?.done) {
            router.push('/(app)/rehabilitation' as never);
          }
        });
    } else {
      setErreur(res.error ?? 'Une erreur est survenue.');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const ok = await deleteMonTemoignage();
    setDeleting(false);
    if (ok) {
      setExisting(null);
      setSucces('Votre témoignage a été supprimé.');
      setEditing(false);
    } else {
      setErreur('Impossible de supprimer. Réessayez.');
    }
  };

  const handleSaveEdit = async () => {
    setErreur(''); setSucces('');
    if (editTexte.trim().length < MIN_CHARS) {
      setErreur(`Le témoignage doit faire au moins ${MIN_CHARS} caractères.`); return;
    }
    if (editTexte.trim().length > MAX_CHARS) {
      setErreur(`Maximum ${MAX_CHARS} caractères.`); return;
    }
    setSavingEdit(true);
    // Supprimer l'ancien puis re-soumettre (table unique contrainte par user_id)
    await deleteMonTemoignage();
    const res = await submitTemoignage(editTexte);
    setSavingEdit(false);
    if (res.success) {
      const t = await getMonTemoignage();
      setExisting(t);
      setEditing(false);
      setSucces('Témoignage modifié ✦ Re-soumis pour modération.');
    } else {
      setErreur(res.error ?? 'Erreur lors de la modification.');
    }
  };

  const charCount = texte.trim().length;
  const charOver  = charCount > MAX_CHARS;

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <CosmicBackground>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1, paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 40, paddingHorizontal: px, gap,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
            bounces={false}>
            {/* En-tête */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
              <Pressable onPress={() => router.back()} style={{ padding: 6 }}>
                <Text style={{ color: '#FFD700', fontSize: iconSize }}>←</Text>
              </Pressable>
              <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: h2Size, flex: 1 }}>
                Mon témoignage
              </Text>
            </View>

            {loading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
                <ActivityIndicator color="#FFD700" size="large" />
              </View>
            ) : existing ? (
              /* ── Témoignage existant ── */
              <View style={{ gap: 16 }}>
                <LinearGradient
                  colors={['rgba(255,215,0,0.1)', 'rgba(75,0,130,0.18)']}
                  style={{
                    borderRadius: 22, borderWidth: 1,
                    borderColor: 'rgba(255,215,0,0.2)', padding: 22, gap: 14,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: iconSize }}>{existing.approuve ? '✅' : '⏳'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: h3Size }}>
                        {existing.approuve ? 'Témoignage publié ✦' : 'En attente de modération'}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: captionSize, marginTop: 2 }}>
                        {existing.approuve
                          ? 'Visible sur la landing page'
                          : 'Validation 24–48 h · Vous serez notifié(e)'}
                      </Text>
                    </View>
                  </View>
                  <Text style={{
                    color: 'rgba(255,255,255,0.72)', fontSize: bodySize,
                    lineHeight: bodySize * 1.55, fontStyle: 'italic',
                  }}>
                    "{existing.texte}"
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: captionSize, fontStyle: 'italic' }}>
                    Soumis le {new Date(existing.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </Text>
                </LinearGradient>

                {/* ── Mode édition inline ── */}
                {editing ? (
                  <View style={{ gap: 12 }}>
                    <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: 13 }}>
                      ✏️ Modifier votre témoignage
                    </Text>
                    <TextInput
                      value={editTexte}
                      onChangeText={t => { setEditTexte(t); setErreur(''); setSucces(''); }}
                      placeholder="Votre nouveau témoignage…"
                      placeholderTextColor="rgba(255,255,255,0.40)"
                      multiline
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.07)',
                        borderRadius: 14, borderWidth: 1,
                        borderColor: 'rgba(255,215,0,0.25)',
                        paddingHorizontal: 14, paddingVertical: 12,
                        color: '#fff', fontSize: bodySize,
                        minHeight: 110, textAlignVertical: 'top',
                      }}
                    />
                    <Text style={{
                      color: editTexte.trim().length > MAX_CHARS ? '#FF6B6B' : 'rgba(255,255,255,0.45)',
                      fontSize: 11, textAlign: 'right',
                    }}>
                      {editTexte.trim().length}/{MAX_CHARS}
                    </Text>
                    {erreur ? <Text style={{ color: '#FF6B6B', fontSize: 12 }}>{erreur}</Text> : null}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <Pressable
                        onPress={() => { setEditing(false); setErreur(''); setEditTexte(''); }}
                        style={{
                          flex: 1, paddingVertical: 11, borderRadius: 14, alignItems: 'center',
                          borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
                          backgroundColor: 'rgba(255,255,255,0.06)',
                        }}
                      >
                        <Text style={{ color: 'rgba(255,255,255,0.75)', fontWeight: '700', fontSize: 13 }}>Annuler</Text>
                      </Pressable>
                      <Pressable
                        onPress={handleSaveEdit}
                        disabled={savingEdit}
                        style={{
                          flex: 2, paddingVertical: 11, borderRadius: 14, alignItems: 'center',
                          backgroundColor: savingEdit ? 'rgba(255,215,0,0.12)' : 'rgba(255,215,0,0.22)',
                          borderWidth: 1, borderColor: 'rgba(255,215,0,0.45)',
                        }}
                      >
                        <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: 13 }}>
                          {savingEdit ? 'Enregistrement…' : '✦ Enregistrer'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  /* ── Boutons Modifier + Supprimer ── */
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable
                      onPress={() => { setEditTexte(existing.texte); setEditing(true); setErreur(''); setSucces(''); }}
                      style={{
                        flex: 1, paddingVertical: 11, borderRadius: 14, alignItems: 'center',
                        borderWidth: 1, borderColor: 'rgba(255,215,0,0.30)',
                        backgroundColor: 'rgba(255,215,0,0.08)',
                      }}
                    >
                      <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 13 }}>✏️ Modifier</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleDelete}
                      disabled={deleting}
                      style={{
                        flex: 1, paddingVertical: 11, borderRadius: 14, alignItems: 'center',
                        borderWidth: 1, borderColor: 'rgba(255,100,100,0.30)',
                        backgroundColor: 'rgba(255,60,60,0.07)',
                      }}
                    >
                      <Text style={{ color: 'rgba(255,120,120,0.85)', fontWeight: '700', fontSize: 13 }}>
                        {deleting ? 'Suppression…' : '🗑 Retirer'}
                      </Text>
                    </Pressable>
                  </View>
                )}

                {/* Infos RGPD */}
                <Text style={{
                  color: 'rgba(255,255,255,0.65)', fontSize: 10.5,
                  lineHeight: 16, textAlign: 'center', fontStyle: 'italic',
                }}>
                  Vous pouvez retirer votre témoignage à tout moment (art. 17 RGPD).{'\n'}
                  Suppression effective sous 48 h du site et de nos systèmes.
                </Text>

                {succes ? <Text style={{ color: '#4CAF50', fontSize: 13, textAlign: 'center' }}>{succes}</Text> : null}
                {erreur ? <Text style={{ color: '#FF6B6B', fontSize: 13, textAlign: 'center' }}>{erreur}</Text> : null}
              </View>
            ) : (
              /* ── Formulaire soumission ── */
              <View style={{ gap: 20 }}>
                {/* Explication */}
                <LinearGradient
                  colors={['rgba(255,215,0,0.07)', 'rgba(75,0,130,0.1)']}
                  style={{
                    borderRadius: 18, borderWidth: 1,
                    borderColor: 'rgba(255,215,0,0.15)', padding: 18, gap: 8,
                  }}
                >
                  <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: 14 }}>
                    💌 Partagez votre histoire
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 20 }}>
                    Votre témoignage aidera d'autres âmes à rejoindre Aevyra avec confiance.
                    Il sera relu par notre équipe avant publication.
                  </Text>
                  <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: 11, fontStyle: 'italic' }}>
                    ✦ Avis membre vérifié · Votre prénom, signe et ville apparaîtront.{'\n'}
                    Pas de nom de famille ni de photo.
                  </Text>
                </LinearGradient>

                {/* Zone de saisie */}
                <View style={{ gap: 6 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' }}>
                    Votre témoignage
                  </Text>
                  <TextInput
                    value={texte}
                    onChangeText={t => { setTexte(t); setErreur(''); setSucces(''); }}
                    placeholder="Racontez comment Aevyra a changé votre vie amoureuse…"
                    placeholderTextColor="rgba(255,255,255,0.50)"
                    multiline
                    numberOfLines={6}
                    maxLength={MAX_CHARS + 20}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      borderWidth: 1,
                      borderColor: charOver ? 'rgba(255,100,100,0.5)' : 'rgba(255,215,0,0.18)',
                      borderRadius: 16, padding: 16,
                      color: '#fff', fontSize: 16, lineHeight: 22,
                      minHeight: 140, textAlignVertical: 'top',
                    }}
                  />
                  <Text style={{
                    color: charOver ? '#FF6B6B' : charCount < MIN_CHARS
                      ? 'rgba(255,255,255,0.3)' : 'rgba(255,215,0,0.5)',
                    fontSize: 11, textAlign: 'right',
                  }}>
                    {charCount} / {MAX_CHARS} caractères
                    {charCount < MIN_CHARS && charCount > 0 ? ` (min. ${MIN_CHARS})` : ''}
                  </Text>
                </View>

                {/* Consentement explicite (obligatoire RGPD + L.111-7-2) */}
                <Pressable
                  onPress={() => setConsentement((v: boolean) => !v)}
                  style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}
                >
                  <View style={{
                    width: 22, height: 22, borderRadius: 6,
                    borderWidth: 2, borderColor: consentement ? '#FFD700' : 'rgba(255,255,255,0.25)',
                    backgroundColor: consentement ? 'rgba(255,215,0,0.15)' : 'transparent',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                  }}>
                    {consentement && <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '900' }}>✓</Text>}
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12.5, lineHeight: 19, flex: 1 }}>
                    Je consens à la publication de mon témoignage sur Aevyra avec mon prénom,
                    signe astrologique et ville. Je certifie que ce texte est authentique et
                    reflète ma propre expérience. Je peux le retirer à tout moment.
                  </Text>
                </Pressable>

                {/* Messages retour */}
                {erreur ? (
                  <View style={{
                    backgroundColor: 'rgba(255,100,100,0.1)',
                    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,100,100,0.25)',
                    padding: 12,
                  }}>
                    <Text style={{ color: '#FF8A8A', fontSize: 13, lineHeight: 18 }}>⚠ {erreur}</Text>
                  </View>
                ) : null}
                {succes ? (
                  <View style={{
                    backgroundColor: 'rgba(76,175,80,0.1)',
                    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(76,175,80,0.25)',
                    padding: 12,
                  }}>
                    <Text style={{ color: '#81C784', fontSize: 13, lineHeight: 18 }}>✓ {succes}</Text>
                  </View>
                ) : null}

                {/* Bouton soumettre */}
                <Pressable
                  onPress={handleSubmit}
                  disabled={submitting || charOver || !consentement}
                  style={{ opacity: submitting || charOver || !consentement ? 0.45 : 1 }}
                >
                  <LinearGradient
                    colors={['#FFD700', '#FF8C00']}
                    style={{
                      borderRadius: 18, paddingVertical: 15,
                      alignItems: 'center', flexDirection: 'row',
                      justifyContent: 'center', gap: 8,
                    }}
                  >
                    {submitting
                      ? <ActivityIndicator color="#1a0830" size="small" />
                      : <Text style={{ color: '#1a0830', fontWeight: '900', fontSize: 15 }}>
                          ✦ Soumettre mon témoignage
                        </Text>
                    }
                  </LinearGradient>
                </Pressable>

                {/* Infos légales */}
                <Text style={{
                  color: 'rgba(255,255,255,0.65)', fontSize: 10.5,
                  lineHeight: 16, textAlign: 'center', fontStyle: 'italic',
                }}>
                  Conformément à l'art. L.111-7-2 du Code de la Consommation,{'\n'}
                  chaque avis est modéré et daté. Un seul avis par membre.{'\n'}
                  Droit de retrait : art. 17 RGPD.
                </Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </CosmicBackground>
    </View>
  );
}
