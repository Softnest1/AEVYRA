// Aevyra – Roman des Âmes (Fil littéraire vivant de la communauté)
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, router, type RelativePathString } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import CosmicBackground from '@/components/CosmicBackground';
import PageHeader from '@/components/PageHeader';
import {
  getRomanContent,
  toggleRomanLike,
  canContributeRoman,
  submitRomanContent,
  deleteRomanContent,
  updateRomanContent,
  triggerChallengeAction,
  getCurrentUserId,
  getChallengeWindow,
  type RomanContentEnriched,
} from '@/lib/amour-api';
import { useResponsive } from '@/hooks/useResponsive';
import { usePillBottomPad } from '@/hooks/usePillBottomPad';
import * as Haptics from 'expo-haptics';

// ── Définition visuelle de chaque type ──────────────────────
const TYPE_DEF: Record<string, {
  gradient: readonly [string, string, string];
  accent: string;
  label: string;
  icon: string;
  description: string;
}> = {
  citation: {
    gradient: ['rgba(114,47,55,0.55)', 'rgba(75,0,130,0.40)', 'rgba(13,10,30,0.85)'],
    accent: '#FFD700', label: 'Citation', icon: '✦',
    description: 'Sagesse d\'une âme',
  },
  poeme: {
    gradient: ['rgba(75,0,130,0.60)', 'rgba(26,10,46,0.70)', 'rgba(13,10,30,0.90)'],
    accent: '#DDA0DD', label: 'Poème', icon: '🌙',
    description: 'Vers du cœur',
  },
  oracle: {
    gradient: ['rgba(13,13,26,0.80)', 'rgba(75,0,130,0.50)', 'rgba(26,10,46,0.75)'],
    accent: '#87CEEB', label: 'Oracle', icon: '🔮',
    description: 'Voix du cosmos',
  },
  histoire: {
    gradient: ['rgba(114,47,55,0.55)', 'rgba(26,10,46,0.70)', 'rgba(13,10,30,0.85)'],
    accent: '#FF69B4', label: 'Histoire vraie', icon: '💑',
    description: 'Aevyra vécu',
  },
  defi: {
    gradient: ['rgba(75,0,130,0.50)', 'rgba(114,47,55,0.45)', 'rgba(13,10,30,0.80)'],
    accent: '#FF6B35', label: 'Défi amoureux', icon: '✍️',
    description: 'Challenge du jour',
  },
};

const TYPE_OPTIONS: { key: RomanContentEnriched['type']; label: string; icon: string }[] = [
  { key: 'citation', label: 'Citation',      icon: '✦'  },
  { key: 'poeme',    label: 'Poème',          icon: '🌙' },
  { key: 'histoire', label: 'Histoire vraie', icon: '💑' },
  { key: 'defi',     label: 'Défi amoureux',  icon: '✍️' },
];

// Phrases oracle du jour (rotation par date)
const ORACLES = [
  "Votre empreinte romantique unique attire exactement l'âme qui vous est destinée. Faites confiance au cosmos.",
  "Celui qui cherche vraiment ne cherche plus — il attire. Rayonnez, et le chemin se tracera.",
  "L'amour profond commence dans le silence. Apprenez à entendre ce que les mots n'osent pas dire.",
  "Deux âmes qui se reconnaissent n'ont pas besoin de se convaincre. Elles savent.",
  "La vulnérabilité n'est pas une faiblesse — c'est la langue maternelle de l'amour vrai.",
  "Chercher l'âme sœur, c'est d'abord devenir la personne digne d'elle.",
  "Le destin ne frappe pas à la porte — il chuchote. Apprenez à écouter les coïncidences.",
];

function getOracleOfDay(todayStr?: string): string {
  // Utilise le jour local (depuis getChallengeWindow) si disponible, sinon fallback JS
  const d = todayStr ? (() => { const [y,m,dy] = todayStr.split('-').map(Number); return new Date(y,m-1,dy); })() : new Date();
  const idx = d.getDate() % ORACLES.length;
  return ORACLES[idx];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'hier';
  if (diffD < 7) return `il y a ${diffD} jours`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ── Carte de contenu — Parchemin littéraire ──────────────────
function Parchemin({
  item,
  currentUserId,
  onReactionChange,
  onDeleted,
  onEdited,
}: {
  item: RomanContentEnriched;
  currentUserId: string | null;
  onReactionChange: (id: string, reaction: 'coeur' | 'etoile' | 'partage', isNowOn: boolean) => void;
  onDeleted: (id: string) => void;
  onEdited: (id: string, patch: Partial<RomanContentEnriched>) => void;
}) {
  const def = TYPE_DEF[item.type] ?? TYPE_DEF.citation;
  const [localReactions, setLocalReactions] = useState(item.myReactions);
  const [localCounts, setLocalCounts] = useState(item.likeCounts);

  // ── État édition / suppression ─────────────────────────────
  const isOwner = !!currentUserId && item.author_id === currentUserId;
  const [showMenu, setShowMenu]   = useState(false);
  const [editing,  setEditing]    = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [saving,   setSaving]     = useState(false);
  const [editErr,  setEditErr]    = useState('');
  // Champs éditables
  const [editTitre,   setEditTitre]   = useState(item.titre   ?? '');
  const [editContenu, setEditContenu] = useState(item.contenu ?? '');
  const [editAuteur,  setEditAuteur]  = useState(item.auteur  ?? '');
  const [editEmoji,   setEditEmoji]   = useState(item.emoji   ?? '💫');

  const handleDelete = async () => {
    setDeleting(true);
    const res = await deleteRomanContent(item.id);
    setDeleting(false);
    setShowMenu(false);
    if (res.success) { onDeleted(item.id); }
    else { setEditErr(res.error ?? 'Erreur de suppression.'); }
  };

  const handleSaveEdit = async () => {
    setEditErr('');
    if (editContenu.trim().length < 20) { setEditErr('Contenu trop court (min. 20 caractères).'); return; }
    setSaving(true);
    const res = await updateRomanContent(item.id, {
      titre: editTitre, contenu: editContenu, auteur: editAuteur, emoji: editEmoji,
    });
    setSaving(false);
    if (res.success) {
      onEdited(item.id, {
        titre: editTitre.trim() || undefined,
        contenu: editContenu.trim(),
        auteur:  editAuteur.trim() || 'Âme Anonyme',
        emoji:   editEmoji || '💫',
      });
      setEditing(false);
    } else {
      setEditErr(res.error ?? 'Erreur de modification.');
    }
  };

  const handleReaction = async (reaction: 'coeur' | 'etoile' | 'partage') => {
    if (process.env.EXPO_OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    const wasOn = !!localReactions[reaction];
    // Optimistic update
    setLocalReactions((prev: Record<string,boolean>) => ({ ...prev, [reaction]: !wasOn }));
    setLocalCounts((prev: Record<string,number>) => ({
      ...prev,
      [reaction]: Math.max(0, (prev[reaction] ?? 0) + (wasOn ? -1 : 1)),
    }));
    try {
      const isNowOn = await toggleRomanLike(item.id, reaction);
      onReactionChange(item.id, reaction, isNowOn);
    } catch {
      // Rollback
      setLocalReactions((prev: Record<string,boolean>) => ({ ...prev, [reaction]: wasOn }));
      setLocalCounts((prev: Record<string,number>) => ({
        ...prev,
        [reaction]: Math.max(0, (prev[reaction] ?? 0) + (wasOn ? 1 : -1)),
      }));
    }
  };

  const totalLikes = (localCounts.coeur ?? 0) + (localCounts.etoile ?? 0) + (localCounts.partage ?? 0);
  const isPoetic = item.type === 'poeme' || item.type === 'citation';

  // ── Mode édition ───────────────────────────────────────────
  if (editing) {
    return (
      <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
        <LinearGradient
          colors={def.gradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: 22, borderWidth: 1, borderColor: def.accent + '50', padding: 18, gap: 12 }}
        >
          <Text style={{ color: def.accent, fontWeight: '900', fontSize: 14 }}>✏️ Modifier le parchemin</Text>
          {/* Emoji */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>Emoji :</Text>
            <TextInput
              value={editEmoji}
              onChangeText={setEditEmoji}
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10,
                paddingHorizontal: 12, paddingVertical: 8, color: '#fff', fontSize: 22,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', width: 60, textAlign: 'center',
              }}
            />
          </View>
          {/* Titre */}
          <TextInput
            value={editTitre}
            onChangeText={setEditTitre}
            placeholder="Titre (optionnel)"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 10, color: '#fff', fontSize: 14,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
            }}
          />
          {/* Contenu */}
          <TextInput
            value={editContenu}
            onChangeText={setEditContenu}
            placeholder="Contenu *"
            placeholderTextColor="rgba(255,255,255,0.35)"
            multiline
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 10, color: '#fff', fontSize: 14,
              minHeight: 90, textAlignVertical: 'top',
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
            }}
          />
          {/* Auteur */}
          <TextInput
            value={editAuteur}
            onChangeText={setEditAuteur}
            placeholder="Signature / Auteur"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 10, color: '#fff', fontSize: 14,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
            }}
          />
          {editErr ? <Text style={{ color: '#FF6B6B', fontSize: 12 }}>{editErr}</Text> : null}
          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={() => { setEditing(false); setEditErr(''); }}
              style={{
                flex: 1, paddingVertical: 11, borderRadius: 14, alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
              }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontWeight: '700', fontSize: 13 }}>Annuler</Text>
            </Pressable>
            <Pressable
              onPress={handleSaveEdit}
              disabled={saving}
              style={{
                flex: 2, paddingVertical: 11, borderRadius: 14, alignItems: 'center',
                backgroundColor: saving ? 'rgba(255,215,0,0.15)' : 'rgba(255,215,0,0.25)',
                borderWidth: 1, borderColor: 'rgba(255,215,0,0.50)',
              }}
            >
              <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: 13 }}>
                {saving ? 'Enregistrement…' : '✦ Enregistrer'}
              </Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
      <LinearGradient
        colors={def.gradient}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 22,
          borderWidth: 1, borderColor: def.accent + '35',
          overflow: 'hidden',
        }}
      >
        {/* ── En-tête type + métadonnées ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
          borderBottomWidth: 1, borderBottomColor: def.accent + '15',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{
              paddingHorizontal: 10, paddingVertical: 4,
              borderRadius: 20, backgroundColor: def.accent + '20',
              borderWidth: 1, borderColor: def.accent + '45',
              flexDirection: 'row', alignItems: 'center', gap: 5,
            }}>
              <Text style={{ fontSize: 11 }}>{def.icon}</Text>
              <Text style={{ color: def.accent, fontSize: 11, fontWeight: '800' }}>{def.label}</Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10 }}>{def.description}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10 }}>
              {formatDate(item.created_at)}
            </Text>
            {/* Menu propriétaire : modifier / supprimer */}
            {isOwner && (
              <View style={{ position: 'relative' }}>
                <Pressable
                  onPress={() => setShowMenu(v => !v)}
                  style={{ padding: 4 }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 18, lineHeight: 20 }}>⋯</Text>
                </Pressable>
                {showMenu && (
                  <View style={{
                    position: 'absolute', top: 26, right: 0, zIndex: 99,
                    backgroundColor: '#1a0a2e', borderRadius: 14,
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                    overflow: 'hidden', minWidth: 140,
                  }}>
                    <Pressable
                      onPress={() => { setShowMenu(false); setEditing(true); }}
                      style={{ paddingHorizontal: 16, paddingVertical: 12,
                        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}
                    >
                      <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '700' }}>✏️ Modifier</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleDelete}
                      disabled={deleting}
                      style={{ paddingHorizontal: 16, paddingVertical: 12 }}
                    >
                      <Text style={{ color: '#FF6B6B', fontSize: 13, fontWeight: '700' }}>
                        {deleting ? 'Suppression…' : '🗑️ Supprimer'}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
        {editErr ? (
          <Text style={{ color: '#FF6B6B', fontSize: 12, paddingHorizontal: 18, paddingTop: 8 }}>{editErr}</Text>
        ) : null}

        {/* ── Corps du contenu ── */}
        <View style={{ padding: 18, gap: 10 }}>
          {/* Emoji décoratif */}
          {item.emoji ? (
            <Text style={{ fontSize: 28, marginBottom: 2 }}>{item.emoji}</Text>
          ) : null}

          {/* Titre */}
          {item.titre ? (
            <Text style={{
              color: def.accent, fontWeight: '900', fontSize: 17,
              lineHeight: 24, letterSpacing: 0.3,
            }}>
              {item.titre}
            </Text>
          ) : null}

          {/* Contenu principal — remplace les \n littéraux de la DB par de vrais sauts */}
          <Text style={{
            color: 'rgba(255,255,255,0.90)', fontSize: 15,
            lineHeight: isPoetic ? 28 : 24,
            fontStyle: isPoetic ? 'italic' : 'normal',
            letterSpacing: isPoetic ? 0.4 : 0,
          }}>
            {isPoetic
              ? `"${item.contenu.replace(/\\n/g, '\n')}"`
              : item.contenu.replace(/\\n/g, '\n')}
          </Text>

          {/* Signature enrichie */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 6 }}>
            {/* Badge selon la source */}
            {item.auteur === 'Oracle Aevyra' || item.auteur === 'L\'Oracle Aevyra' ? (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 8, paddingVertical: 3,
                borderRadius: 12, backgroundColor: 'rgba(135,206,235,0.15)',
                borderWidth: 1, borderColor: 'rgba(135,206,235,0.30)',
              }}>
                <Text style={{ fontSize: 10 }}>🔮</Text>
                <Text style={{ color: '#87CEEB', fontSize: 10, fontWeight: '700' }}>Oracle</Text>
              </View>
            ) : item.auteur === 'Aevyra' || item.auteur === 'Défi Aevyra' ? (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 8, paddingVertical: 3,
                borderRadius: 12, backgroundColor: 'rgba(155,89,182,0.15)',
                borderWidth: 1, borderColor: 'rgba(155,89,182,0.30)',
              }}>
                <Text style={{ fontSize: 10 }}>🌌</Text>
                <Text style={{ color: '#DDA0DD', fontSize: 10, fontWeight: '700' }}>Aevyra</Text>
              </View>
            ) : item.author_id ? (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 8, paddingVertical: 3,
                borderRadius: 12, backgroundColor: 'rgba(255,215,0,0.12)',
                borderWidth: 1, borderColor: 'rgba(255,215,0,0.28)',
              }}>
                <Text style={{ fontSize: 10 }}>🌟</Text>
                <Text style={{ color: '#FFD700', fontSize: 10, fontWeight: '700' }}>Membre</Text>
              </View>
            ) : (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 8, paddingVertical: 3,
                borderRadius: 12, backgroundColor: 'rgba(245,230,200,0.10)',
                borderWidth: 1, borderColor: 'rgba(245,230,200,0.22)',
              }}>
                <Text style={{ fontSize: 10 }}>✦</Text>
                <Text style={{ color: '#F5E6C8', fontSize: 10, fontWeight: '700' }}>Classique</Text>
              </View>
            )}
            <Text style={{
              color: def.accent + '90', fontSize: 12,
              fontStyle: 'italic',
            }}>
              — {item.auteur || 'Âme Anonyme'}
            </Text>
          </View>
        </View>

        {/* ── Ligne de réactions ── */}
        <View style={{
          borderTopWidth: 1, borderTopColor: def.accent + '15',
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 18, paddingVertical: 12,
          gap: 6,
        }}>
          {/* Boutons de réaction */}
          {(
            [
              { key: 'coeur'   as const, emoji: '💛', activeColor: '#FFD700', label: 'Touché' },
              { key: 'etoile'  as const, emoji: '💫', activeColor: '#DDA0DD', label: 'Étoilé' },
              { key: 'partage' as const, emoji: '🔁', activeColor: '#87CEEB', label: 'Relayé' },
            ] as const
          ).map(({ key, emoji, activeColor, label: _label }) => {
            const active = !!localReactions[key];
            const count = localCounts[key] ?? 0;
            return (
              <Pressable
                key={key}
                onPress={() => handleReaction(key)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 12, paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: active ? activeColor + '22' : 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: active ? activeColor + '60' : 'rgba(255,255,255,0.08)',
                }}
              >
                <Text style={{ fontSize: 15, opacity: active ? 1 : 0.65 }}>{emoji}</Text>
                {count > 0 && (
                  <Text style={{
                    color: active ? activeColor : 'rgba(255,255,255,0.65)',
                    fontSize: 11, fontWeight: '700',
                  }}>
                    {count}
                  </Text>
                )}
              </Pressable>
            );
          })}

          {/* Total vues/touches */}
          {totalLikes > 0 && (
            <Text style={{
              color: 'rgba(255,255,255,0.65)', fontSize: 11,
              marginLeft: 'auto',
            }}>
              {totalLikes} âme{totalLikes > 1 ? 's' : ''} touchée{totalLikes > 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

// ── Formulaire de contribution ────────────────────────────────
function FormulaireContribution({ onSuccess, onClose }: {
  onSuccess: () => void;
  onClose: () => void;
}) { 
  const { px, isPhone: _isPhone  } = useResponsive();
  const [type, setType]       = useState<RomanContentEnriched['type']>('citation');
  const [titre, setTitre]     = useState('');
  const [contenu, setContenu] = useState('');
  const [auteur, setAuteur]   = useState('');
  const [emoji, setEmoji]     = useState('💫');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  const def = TYPE_DEF[type];
  const canSubmit = contenu.trim().length >= 20;

  const handleSubmit = async () => {
    setError('');
    if (!canSubmit) { setError('Le contenu doit faire au moins 20 caractères.'); return; }
    setSaving(true);
    const result = await submitRomanContent({ type, titre, contenu, auteur, emoji });
    setSaving(false);
    if (!result.success) { setError(result.error ?? 'Erreur inconnue.'); return; }
    // Déclencheurs challenges selon le type de contenu publié
    triggerChallengeAction('write_roman').catch(() => {});
    if (type === 'oracle') triggerChallengeAction('write_intention').catch(() => {});
    if (type === 'defi')   triggerChallengeAction('answer_quiz').catch(() => {});
    setSuccess(true);
    setTimeout(() => onSuccess(), 1400);
  };

  if (success) {
    return (
      <View style={{ padding: 28, alignItems: 'center', gap: 14 }}>
        <Text style={{ fontSize: 48 }}>✨</Text>
        <Text style={{ color: '#FFD700', fontSize: 17, fontWeight: '900', textAlign: 'center' }}>
          Votre parchemin brille dans le Roman !
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center' }}>
          Toutes les âmes peuvent maintenant vous lire.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: px, gap: 16 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {/* En-tête formulaire */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ gap: 2 }}>
            <Text style={{ color: '#F5E6C8', fontSize: 17, fontWeight: '900' }}>
              ✍️ Votre Parchemin
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>
              Une contribution qui vivra dans le Roman
            </Text>
          </View>
          <Pressable onPress={onClose} style={{ padding: 4 }}>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 22 }}>✕</Text>
          </Pressable>
        </View>

        {/* Sélecteur de type */}
        <View style={{ gap: 8 }}>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }}>
            TYPE DE CONTRIBUTION
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TYPE_OPTIONS.map(opt => {
              const optDef = TYPE_DEF[opt.key];
              const active = type === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setType(opt.key)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22,
                    borderWidth: 1.5,
                    borderColor: active ? optDef.accent : 'rgba(255,255,255,0.12)',
                    backgroundColor: active ? optDef.accent + '20' : 'rgba(255,255,255,0.04)',
                  }}
                >
                  <Text style={{
                    color: active ? optDef.accent : 'rgba(255,255,255,0.65)',
                    fontSize: 12, fontWeight: '700',
                  }}>
                    {opt.icon} {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Ligne emoji + titre */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ gap: 6, width: 52 }}>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }}>
              EMOJI
            </Text>
            <TextInput
              value={emoji} onChangeText={setEmoji}
              style={{
                color: '#fff', fontSize: 22, width: 52, height: 44,
                textAlign: 'center', borderRadius: 12, borderWidth: 1,
                borderColor: def.accent + '40', backgroundColor: def.accent + '10',
              }}
              maxLength={2}
            />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }}>
              TITRE <Text style={{ color: 'rgba(255,255,255,0.65)', fontWeight: '400' }}>(optionnel)</Text>
            </Text>
            <TextInput
              value={titre} onChangeText={setTitre}
              placeholder="Un titre poétique…"
              placeholderTextColor="rgba(255,255,255,0.50)"
              style={{
                color: '#fff', fontSize: 16, height: 44,
                paddingHorizontal: 12, borderRadius: 12, borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)',
              }}
              maxLength={80}
            />
          </View>
        </View>

        {/* Contenu */}
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }}>
              CONTENU <Text style={{ color: 'rgba(255,107,107,0.8)' }}>*</Text>
            </Text>
            <Text style={{
              fontSize: 10, fontWeight: '700',
              color: contenu.length < 20 ? 'rgba(255,107,107,0.7)' : 'rgba(255,255,255,0.3)',
            }}>
              {contenu.length}/800
            </Text>
          </View>
          <TextInput
            value={contenu} onChangeText={setContenu}
            placeholder={
              type === 'citation' ? 'La citation qui vous habite… (min. 20 car.)'
              : type === 'poeme'   ? 'Vos vers, libres ou rimés… (min. 20 car.)'
              : type === 'histoire' ? 'Une histoire d\'amour vécue… (min. 20 car.)'
              : 'Votre défi amoureux pour la communauté… (min. 20 car.)'
            }
            placeholderTextColor="rgba(255,255,255,0.50)"
            multiline
            style={{
              color: '#fff', fontSize: 16,
              paddingVertical: 12, paddingHorizontal: 14,
              borderRadius: 14, borderWidth: 1.5,
              borderColor: contenu.length > 0 && contenu.length < 20
                ? 'rgba(255,100,100,0.45)'
                : contenu.length >= 20 ? def.accent + '50' : 'rgba(255,255,255,0.12)',
              backgroundColor: 'rgba(255,255,255,0.04)',
              minHeight: 110, textAlignVertical: 'top',
              lineHeight: 22,
            }}
            maxLength={800}
          />
        </View>

        {/* Signé par */}
        <View style={{ gap: 6 }}>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }}>
            SIGNÉ PAR <Text style={{ color: 'rgba(255,255,255,0.65)', fontWeight: '400' }}>(optionnel)</Text>
          </Text>
          <TextInput
            value={auteur} onChangeText={setAuteur}
            placeholder="Votre nom d'étoile ou l'auteur original…"
            placeholderTextColor="rgba(255,255,255,0.50)"
            style={{
              color: '#fff', fontSize: 16, height: 44,
              paddingHorizontal: 12, borderRadius: 12, borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)',
            }}
            maxLength={60}
          />
        </View>

        {/* Erreur */}
        {error.length > 0 && (
          <Text style={{ color: '#FF8080', fontSize: 12, fontStyle: 'italic' }}>{error}</Text>
        )}

        {/* Bouton Publier */}
        <Pressable
          onPress={handleSubmit}
          disabled={saving || !canSubmit}
          style={{ borderRadius: 16, overflow: 'hidden', marginTop: 4 }}
        >
          <LinearGradient
            colors={canSubmit ? [def.accent + '40', def.accent + '20'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.03)']}
            style={{
              padding: 15, alignItems: 'center', borderRadius: 16,
              borderWidth: 1.5,
              borderColor: canSubmit ? def.accent + '60' : 'rgba(255,255,255,0.08)',
            }}
          >
            <Text style={{
              fontSize: 14, fontWeight: '900',
              color: canSubmit ? def.accent : 'rgba(255,255,255,0.22)',
            }}>
              {saving ? 'Publication en cours…' : '✦ Publier dans le Roman'}
            </Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Page principale ──────────────────────────────────────────
export default function RomanAevyra() { 
  const { px, isPhone: _isPhone, isDesktop: _isDesktop, isTablet: _isTablet, isFullHD, is4K, isCinema, contentMaxWidth, gap, bodySize, captionSize, h3Size: _h3Size  } = useResponsive();
  const pillPaddingBottom = usePillBottomPad();
  const [content, setContent]         = useState<RomanContentEnriched[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [canContribute, setCanContrib]  = useState(false);
  const [showForm, setShowForm]         = useState(false);
  const [activeFilter, setActiveFilter] = useState<'tous' | RomanContentEnriched['type']>('tous');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // Date locale (fuseau utilisateur via getChallengeWindow) pour les seeds de contenu
  const [todayStr, setTodayStr] = useState<string>('');

  const loadRoman = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [data, eligible, uid, win] = await Promise.all([
        getRomanContent(),
        canContributeRoman(),
        getCurrentUserId(),
        getChallengeWindow(),
      ]);
      setContent(data);
      setCanContrib(eligible);
      setCurrentUserId(uid);
      setTodayStr(win.today);
    } catch (e) {
      console.error('[Roman] Chargement échoué', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Chargement initial au focus
      loadRoman(true);
      // Polling toutes les 20s — nouveaux likes ♥ étoiles, nouvelles contributions
      const poll = setInterval(() => loadRoman(false), 20_000);
      return () => clearInterval(poll);
    }, [loadRoman])
  );

  const handleContributionSuccess = useCallback(async () => {
    setShowForm(false);
    // Recharger via loadRoman pour rester cohérent avec le cache central
    await loadRoman(false);
  }, [loadRoman]);

  // Mise à jour optimiste locale des réactions
  const handleReactionChange = useCallback(
    (id: string, reaction: 'coeur' | 'etoile' | 'partage', isNowOn: boolean) => {
      setContent((prev: typeof content) => prev.map((item: (typeof content)[0]) => {
        if (item.id !== id) return item;
        return {
          ...item,
          myReactions: { ...item.myReactions, [reaction]: isNowOn },
          likeCounts: {
            ...item.likeCounts,
            [reaction]: Math.max(0, (item.likeCounts[reaction] ?? 0) + (isNowOn ? 1 : -1)),
          },
        };
      }));
    }, []
  );

  const FILTERS: { key: 'tous' | RomanContentEnriched['type']; label: string; icon: string }[] = [
    { key: 'tous',     label: 'Tout',       icon: '✦'  },
    { key: 'citation', label: 'Citations',  icon: '✦'  },
    { key: 'poeme',    label: 'Poèmes',     icon: '🌙' },
    { key: 'oracle',   label: 'Oracles',    icon: '🔮' },
    { key: 'histoire', label: 'Histoires',  icon: '💑' },
    { key: 'defi',     label: 'Défis',      icon: '✍️' },
  ];

  const filteredContent = activeFilter === 'tous'
    ? content
    : content.filter((c: (typeof content)[0]) => c.type === activeFilter);

  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground>
        <PageHeader
          title="📖 Roman des Âmes"
          subtitle="Le fil littéraire de la communauté"
          actions={[{
            emoji: '🔔',
            onPress: () => router.push('/(app)/notifications' as RelativePathString),
          }]}
        />

        {/* ── Formulaire (inline, au-dessus du fil) ── */}
        {showForm && (
          <View style={{
            marginHorizontal: px, marginBottom: 14,
            borderRadius: 22, overflow: 'hidden',
            borderWidth: 1, borderColor: 'rgba(255,215,0,0.22)',
          }}>
            <LinearGradient
              colors={['rgba(75,0,130,0.65)', 'rgba(13,13,26,0.88)']}
              style={{ borderRadius: 22 }}
            >
              <FormulaireContribution
                onSuccess={handleContributionSuccess}
                onClose={() => setShowForm(false)}
              />
            </LinearGradient>
          </View>
        )}

        {!showForm && (
          <FlatList<RomanContentEnriched>
            data={filteredContent}
            keyExtractor={(item) => item.id}
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadRoman(false); }}
            contentContainerStyle={{ paddingBottom: pillPaddingBottom, paddingHorizontal: px }}
            ListHeaderComponent={
              <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', marginBottom: gap }}>
                {/* ── Oracle du Jour ── */}
                <View style={{ marginBottom: gap }}>
                  <LinearGradient
                    colors={['rgba(75,0,130,0.65)', 'rgba(114,47,55,0.45)', 'rgba(13,10,30,0.85)']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{
                      borderRadius: 20, padding: isCinema ? 28 : is4K ? 24 : isFullHD ? 20 : 18,
                      borderWidth: 1, borderColor: 'rgba(255,215,0,0.28)',
                    }}
                  >
                    <Text style={{
                      color: '#FFD700', fontSize: captionSize, fontWeight: '900',
                      letterSpacing: 2, marginBottom: 10,
                    }}>
                      🔮 ORACLE DES ÂMES · {todayStr ? new Date(todayStr + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long' }).toUpperCase() : new Date().toLocaleDateString('fr-FR', { weekday: 'long' }).toUpperCase()}
                    </Text>
                    <Text style={{
                      color: 'rgba(255,255,255,0.88)', fontSize: bodySize,
                      fontStyle: 'italic', lineHeight: bodySize * 1.6,
                    }}>
                      "{getOracleOfDay(todayStr)}"
                    </Text>
                    <Text style={{
                      color: 'rgba(255,215,0,0.75)', fontSize: captionSize,
                      textAlign: 'right', marginTop: 10, fontStyle: 'italic',
                    }}>
                      — Aevyra Oracle
                    </Text>
                  </LinearGradient>
                </View>

                {/* ── Bouton Contribuer ── */}
                <View style={{ marginBottom: gap }}>
                  {canContribute ? (
                    <Pressable onPress={() => setShowForm(true)}>
                      <LinearGradient
                        colors={['rgba(255,215,0,0.18)', 'rgba(255,215,0,0.08)']}
                        style={{
                          borderRadius: 16, padding: 14,
                          borderWidth: 1.5, borderColor: 'rgba(255,215,0,0.40)',
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                        }}
                      >
                        <Text style={{ fontSize: 20 }}>✍️</Text>
                        <View>
                          <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: 14 }}>
                            Ajouter au Roman
                          </Text>
                          <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: 10 }}>
                            Citations · Poèmes · Histoires · Défis
                          </Text>
                        </View>
                      </LinearGradient>
                    </Pressable>
                  ) : (
                    <View style={{
                      borderRadius: 14, padding: 13,
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                    }}>
                      <Text style={{ fontSize: 16 }}>🔒</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '700' }}>
                          Contribution débloquée après 3 jours
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>
                          Continuez d'explorer pour déverrouiller cette fonctionnalité
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* ── Filtres par type ── */}
                <ScrollView
                  horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: px, gap: 8, paddingBottom: 14 }}
                >
                  {FILTERS.map(f => {
                    const active = activeFilter === f.key;
                    const fDef = f.key !== 'tous' ? TYPE_DEF[f.key] : null;
                    const accent = fDef?.accent ?? '#FFD700';
                    return (
                      <Pressable
                        key={f.key}
                        onPress={() => setActiveFilter(f.key)}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 7, borderRadius: 22,
                          borderWidth: 1.5,
                          borderColor: active ? accent : 'rgba(255,255,255,0.12)',
                          backgroundColor: active ? accent + '22' : 'rgba(255,255,255,0.04)',
                        }}
                      >
                        <Text style={{
                          color: active ? accent : 'rgba(255,255,255,0.65)',
                          fontSize: 12, fontWeight: '700',
                        }}>
                          {f.icon} {f.label}
                          {f.key !== 'tous' && !active && content.filter((c: (typeof content)[0]) => c.type === f.key).length > 0
                            ? ` (${content.filter((c: (typeof content)[0]) => c.type === f.key).length})`
                            : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>}
            renderItem={({ item }) => (
              <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
                <Parchemin
                  item={item}
                  currentUserId={currentUserId}
                  onReactionChange={handleReactionChange}
                  onDeleted={(id) => setContent(prev => prev.filter(c => c.id !== id))}
                  onEdited={(id, patch) => setContent(prev =>
                    prev.map(c => c.id === id ? { ...c, ...patch } : c)
                  )}
                />
              </View>
            )}
            ListEmptyComponent={
              loading ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
                  <ActivityIndicator color="#9B59B6" />
                  <Text style={{ color: 'rgba(155,89,182,0.65)', marginTop: 12, fontStyle: 'italic', fontSize: 13 }}>
                    Les parchemins s'ouvrent…
                  </Text>
                </View>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 52, gap: 14, paddingHorizontal: px }}>
                  <Text style={{ fontSize: 52 }}>📜</Text>
                  <Text style={{ color: '#F5E6C8', fontSize: 17, fontWeight: '900', textAlign: 'center' }}>
                    {activeFilter === 'tous' ? 'Le Roman attend ses âmes' : `Aucun${
                      activeFilter === 'poeme'    ? ' poème' :
                      activeFilter === 'citation' ? 'e citation' :
                      activeFilter === 'oracle'   ? ' oracle' :
                      activeFilter === 'histoire' ? 'e histoire' :
                      activeFilter === 'defi'     ? ' défi' : ''
                    } encore`}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                    {canContribute
                      ? 'Soyez la première âme à écrire dans ce chapitre.'
                      : 'Revenez dans quelques jours pour contribuer.'}
                  </Text>
                  {canContribute && (
                    <Pressable
                      onPress={() => setShowForm(true)}
                      style={{
                        marginTop: 4, paddingHorizontal: 24, paddingVertical: 12,
                        borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(255,215,0,0.4)',
                        backgroundColor: 'rgba(255,215,0,0.12)',
                      }}
                    >
                      <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: 13 }}>
                        ✍️ Écrire le premier parchemin
                      </Text>
                    </Pressable>
                  )}
                </View>
              )
            }
          />
        )}
      </CosmicBackground>
    </View>
  );
}


