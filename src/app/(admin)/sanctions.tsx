// Page admin Sanctions & Réhabilitation
// Liste de tous les utilisateurs sanctionnés, progression de mission,
// validation/refus de demandes de grâce, application de nouvelles sanctions
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, Pressable,
  RefreshControl, ScrollView, Text, TextInput, View,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ShieldOff, CheckCircle, XCircle } from 'lucide-react-native';
import {
  listSanctions, listGraceRequests, reviewGrace, liftSanction, applySanction,
  MISSION_LABELS, MISSION_EMOJIS, SANCTION_LABELS,
  type AdminSanction, type GraceRequest, type SanctionType, type MissionType,
} from '@/lib/admin-api';

const BG    = '#0A0A14';
const CARD  = '#12121F';
const GOLD  = '#C9A96E';
const BORDER = '#1E1E2E';
const RED   = '#E53E3E';
const GREEN = '#48BB78';
const AMBER = '#D97706';
const PURPLE = '#7B5EA7';

type Tab = 'active' | 'graces';

const SANCTION_COLORS: Record<string, string> = {
  warning:       AMBER,
  mute:          PURPLE,
  ban_temp:      RED,
  ban_permanent: '#B91C1C',
};

const DURATION_OPTIONS = [
  { label: '1 jour',   value: 1 },
  { label: '3 jours',  value: 3 },
  { label: '7 jours',  value: 7 },
  { label: '30 jours', value: 30 },
  { label: 'Permanent', value: null },
];

const SANCTION_TYPES: SanctionType[] = ['warning', 'mute', 'ban_temp', 'ban_permanent'];
const MISSION_TYPES: MissionType[]   = ['soul_letter', 'vibration_reset', 'star_reading', 'cosmic_kindness', 'mirror_oath', 'constellation_builder', 'healing_poem'];

function daysLeft(expires_at: string | null): string {
  if (!expires_at) return '∞';
  const d = Math.max(0, Math.ceil((new Date(expires_at).getTime() - Date.now()) / 86_400_000));
  return `${d}j`;
}

function pct(progress: number, target: number) {
  return target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : 0;
}

// ── Carte sanction ───────────────────────────────────────────────
function SanctionCard({ s, onLift }: { s: AdminSanction; onLift: (id: string) => void }) {
  const color = SANCTION_COLORS[s.type] ?? GOLD;
  const p = s.mission ? pct(s.mission_progress, s.mission_target) : null;

  return (
    <View style={{
      backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 10,
      borderWidth: 1, borderColor: `${color}30`,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        {/* Avatar */}
        <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: BORDER }}>
          {s.user?.photo_url
            ? <Image source={{ uri: s.user.photo_url }} style={{ width: 44, height: 44 }} contentFit="cover" />
            : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>👤</Text>
              </View>
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
            {s.user?.prenom ?? '—'}
          </Text>
          <Text style={{ color: '#A8A8CC', fontSize: 12 }}>
            {s.user?.age} ans · {s.user?.genre}
          </Text>
        </View>
        {/* Badge type */}
        <View style={{ backgroundColor: `${color}20`, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: `${color}40` }}>
          <Text style={{ color, fontSize: 11, fontWeight: '800' }}>{SANCTION_LABELS[s.type]}</Text>
        </View>
      </View>

      {/* Raison + durée */}
      <Text style={{ color: '#CCCCE0', fontSize: 13, marginBottom: 8 }}>{s.reason}</Text>
      <Text style={{ color: '#7878A0', fontSize: 11, marginBottom: s.mission ? 12 : 0 }}>
        ⏳ {daysLeft(s.expires_at)} restant · par {s.admin?.prenom ?? 'admin'} ·{' '}
        {new Date(s.created_at).toLocaleDateString('fr-FR')}
      </Text>

      {/* Barre de mission */}
      {s.mission && p !== null && (
        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: '#A8A8CC', fontSize: 11 }}>
              {MISSION_EMOJIS[s.mission]} {MISSION_LABELS[s.mission]}
            </Text>
            <Text style={{ color: p >= 100 ? GREEN : GOLD, fontSize: 11, fontWeight: '700' }}>{p}%</Text>
          </View>
          <View style={{ height: 6, backgroundColor: '#ffffff10', borderRadius: 3, overflow: 'hidden' }}>
            <LinearGradient
              colors={p >= 100 ? [GREEN, '#68D391'] : [GOLD, '#D4B896']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ height: 6, width: `${p}%`, borderRadius: 3 }}
            />
          </View>
          <Text style={{ color: '#7878A0', fontSize: 10, marginTop: 2, textAlign: 'right' }}>
            {s.mission_progress}/{s.mission_target}
            {s.mission_done ? ' ✅ Mission complète' : ''}
          </Text>
        </View>
      )}

      {/* Lever la sanction */}
      {s.type !== 'ban_permanent' && (
        <Pressable
          onPress={() => onLift(s.id)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${GREEN}12`, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' }}
        >
          <ShieldOff size={13} color={GREEN} />
          <Text style={{ color: GREEN, fontSize: 12, fontWeight: '700' }}>Lever la sanction</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Carte demande de grâce ───────────────────────────────────────
function GraceCard({ g, onReview }: { g: GraceRequest; onReview: (id: string, approved: boolean) => void }) {
  return (
    <View style={{
      backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 10,
      borderWidth: 1, borderColor: `${GOLD}25`,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: BORDER }}>
          {g.user?.photo_url
            ? <Image source={{ uri: g.user.photo_url }} style={{ width: 40, height: 40 }} contentFit="cover" />
            : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text>👤</Text>
              </View>
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{g.user?.prenom ?? '—'}</Text>
          <Text style={{ color: '#A8A8CC', fontSize: 11 }}>
            {new Date(g.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {g.sanction?.mission_done && (
          <View style={{ backgroundColor: `${GREEN}20`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: GREEN, fontSize: 10, fontWeight: '800' }}>✅ Mission ✓</Text>
          </View>
        )}
      </View>

      {g.sanction && (
        <View style={{ backgroundColor: '#ffffff06', borderRadius: 10, padding: 10, marginBottom: 10 }}>
          <Text style={{ color: '#A8A8CC', fontSize: 11, marginBottom: 2 }}>
            Sanction : {SANCTION_LABELS[g.sanction.type]} · {daysLeft(g.sanction.expires_at)} restant
          </Text>
          <Text style={{ color: '#CCCCE0', fontSize: 12 }}>{g.sanction.reason}</Text>
        </View>
      )}

      {g.message && (
        <View style={{ backgroundColor: `${GOLD}10`, borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: `${GOLD}20` }}>
          <Text style={{ color: '#A8A8CC', fontSize: 10, marginBottom: 3 }}>MESSAGE DE L'UTILISATEUR</Text>
          <Text style={{ color: '#CCCCE0', fontSize: 13, lineHeight: 18 }}>{g.message}</Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          onPress={() => onReview(g.id, false)}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: `${RED}14`, borderRadius: 12, paddingVertical: 11, borderWidth: 1, borderColor: `${RED}30` }}
        >
          <XCircle size={14} color={RED} />
          <Text style={{ color: RED, fontSize: 13, fontWeight: '700' }}>Refuser</Text>
        </Pressable>
        <Pressable
          onPress={() => onReview(g.id, true)}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: `${GREEN}14`, borderRadius: 12, paddingVertical: 11, borderWidth: 1, borderColor: `${GREEN}30` }}
        >
          <CheckCircle size={14} color={GREEN} />
          <Text style={{ color: GREEN, fontSize: 13, fontWeight: '700' }}>Accorder</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Modal : appliquer une sanction ───────────────────────────────
function ApplySanctionModal({
  visible, onClose, onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (opts: { user_id: string; type: SanctionType; reason: string; duration_days: number | null; mission: MissionType | null; mission_target: number }) => void;
}) {
  const [userId,   setUserId]   = useState('');
  const [type,     setType]     = useState<SanctionType>('ban_temp');
  const [reason,   setReason]   = useState('');
  const [duration, setDuration] = useState<number | null>(7);
  const [mission,  setMission]  = useState<MissionType | null>(null);
  const [mTarget,  setMTarget]  = useState('1');

  const submit = () => {
    if (!userId.trim() || !reason.trim()) return;
    onSubmit({ user_id: userId.trim(), type, reason: reason.trim(), duration_days: duration, mission, mission_target: parseInt(mTarget) || 1 });
    onClose();
    setUserId(''); setReason(''); setType('ban_temp'); setDuration(7); setMission(null); setMTarget('1');
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sanctionColor = (SANCTION_COLORS as any)[type as string] as string;
  const sanctionLabel = (SANCTION_LABELS as any)[type as string] as string;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#0D0D1F', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14, maxHeight: '90%' }}>
          <ScrollView showsVerticalScrollIndicator={false}
            overScrollMode="never"
            bounces={false} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', flex: 1 }}>🛡️ Appliquer une sanction</Text>
              <Pressable onPress={onClose}><X size={20} color="#A8A8CC" /></Pressable>
            </View>

            {/* User ID */}
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#A8A8CC', fontSize: 11, fontWeight: '700' }}>USER ID</Text>
              <TextInput value={userId} onChangeText={setUserId} placeholder="UUID de l'utilisateur" placeholderTextColor="#7878A0"
                style={{ backgroundColor: BG, borderRadius: 10, padding: 12, color: '#fff', fontSize: 13, borderWidth: 1, borderColor: BORDER }} />
            </View>

            {/* Type */}
            <View style={{ gap: 6 }}>
              <Text style={{ color: '#A8A8CC', fontSize: 11, fontWeight: '700' }}>TYPE DE SANCTION</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {SANCTION_TYPES.map(t => (
                  <Pressable key={t} onPress={() => setType(t)}
                    style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
                      backgroundColor: type === t ? `${SANCTION_COLORS[t]}20` : 'transparent',
                      borderColor: type === t ? SANCTION_COLORS[t] : BORDER }}>
                    <Text style={{ color: type === t ? SANCTION_COLORS[t] : '#A8A8CC', fontSize: 12, fontWeight: '700' }}>
                      {SANCTION_LABELS[t]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Durée */}
            {type !== 'warning' && type !== 'ban_permanent' && (
              <View style={{ gap: 6 }}>
                <Text style={{ color: '#A8A8CC', fontSize: 11, fontWeight: '700' }}>DURÉE</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {DURATION_OPTIONS.filter(o => o.value !== null).map(o => (
                    <Pressable key={o.value} onPress={() => setDuration(o.value as number)}
                      style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
                        backgroundColor: duration === o.value ? `${GOLD}20` : 'transparent',
                        borderColor: duration === o.value ? GOLD : BORDER }}>
                      <Text style={{ color: duration === o.value ? GOLD : '#A8A8CC', fontSize: 12, fontWeight: '700' }}>{o.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Raison */}
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#A8A8CC', fontSize: 11, fontWeight: '700' }}>RAISON</Text>
              <TextInput value={reason} onChangeText={setReason} placeholder="Décrire le comportement sanctionné…" placeholderTextColor="#7878A0" multiline
                style={{ backgroundColor: BG, borderRadius: 10, padding: 12, color: '#fff', fontSize: 13, borderWidth: 1, borderColor: BORDER, minHeight: 70 }} />
            </View>

            {/* Mission */}
            {type !== 'warning' && type !== 'ban_permanent' && (
              <View style={{ gap: 6 }}>
                <Text style={{ color: '#A8A8CC', fontSize: 11, fontWeight: '700' }}>MISSION DE RÉHABILITATION (facultatif)</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Pressable onPress={() => setMission(null)}
                    style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
                      backgroundColor: mission === null ? '#ffffff14' : 'transparent', borderColor: mission === null ? '#fff' : BORDER }}>
                    <Text style={{ color: mission === null ? '#fff' : '#A8A8CC', fontSize: 12, fontWeight: '700' }}>Aucune</Text>
                  </Pressable>
                  {MISSION_TYPES.map(m => (
                    <Pressable key={m} onPress={() => setMission(m)}
                      style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
                        backgroundColor: mission === m ? `${GOLD}20` : 'transparent', borderColor: mission === m ? GOLD : BORDER }}>
                      <Text style={{ color: mission === m ? GOLD : '#A8A8CC', fontSize: 12, fontWeight: '700' }}>
                        {MISSION_EMOJIS[m]} {MISSION_LABELS[m]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {mission && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <Text style={{ color: '#A8A8CC', fontSize: 12 }}>Objectif :</Text>
                    <TextInput value={mTarget} onChangeText={setMTarget} keyboardType="number-pad"
                      style={{ backgroundColor: BG, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, color: '#fff', fontSize: 13, borderWidth: 1, borderColor: BORDER, width: 60 }} />
                    <Text style={{ color: '#A8A8CC', fontSize: 12 }}>fois</Text>
                  </View>
                )}
              </View>
            )}

            {/* Résumé */}
            <View style={{ backgroundColor: BG, borderRadius: 14, padding: 14, gap: 4, borderWidth: 1, borderColor: `${GOLD}20`, marginTop: 4 }}>
              <Text style={{ color: GOLD, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>RÉSUMÉ</Text>
              <Text style={{ color: '#CCCCE0', fontSize: 12 }}>
                Type : <Text style={{ color: sanctionColor, fontWeight: '700' }}>{sanctionLabel}</Text>
              </Text>
              {duration && type !== 'ban_permanent' && <Text style={{ color: '#CCCCE0', fontSize: 12 }}>Durée : {duration} jour{duration > 1 ? 's' : ''}</Text>}
              {mission && <Text style={{ color: '#CCCCE0', fontSize: 12 }}>Mission : {(MISSION_LABELS as Record<string,string>)[mission as string]}</Text>}
            </View>

            <Pressable onPress={submit} disabled={!userId.trim() || !reason.trim()}
              style={{ backgroundColor: !userId.trim() || !reason.trim() ? '#2A2A3A' : RED, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 4 }}>
              <Text style={{ color: !userId.trim() || !reason.trim() ? '#7878A0' : '#fff', fontSize: 15, fontWeight: '900' }}>
                ⚡ Appliquer la sanction
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Écran principal ──────────────────────────────────────────────
export default function AdminSanctions() {
  const insets = useSafeAreaInsets();
  // useResponsive disponible si besoin de breakpoints futurs
  

  const [tab,        setTab]        = useState<Tab>('active');
  const [sanctions,  setSanctions]  = useState<AdminSanction[]>([]);
  const [graces,     setGraces]     = useState<GraceRequest[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [_actionId,  setActionId]   = useState<string | null>(null);
  const [showModal,  setShowModal]  = useState(false);
  const [pendingCount, setPending]  = useState(0);

  const load = async () => {
    try {
      const [s, g] = await Promise.all([
        listSanctions({ status: 'active' }),
        listGraceRequests(),
      ]);
      setSanctions(s.sanctions ?? []);
      setGraces(g.requests ?? []);
      setPending(g.requests?.length ?? 0);
    } catch (e) { console.error('[AdminSanctions]', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { (async () => { setLoading(true); await load(); })(); }, []));

  const handleLift = async (id: string) => {
    setActionId(id);
    try { await liftSanction(id); await load(); }
    catch (e) { console.error(e); }
    finally { setActionId(null); }
  };

  const handleReviewGrace = async (id: string, approved: boolean) => {
    setActionId(id);
    try { await reviewGrace(id, approved); await load(); }
    catch (e) { console.error(e); }
    finally { setActionId(null); }
  };

  const handleApply = async (opts: Parameters<typeof applySanction>[0]) => {
    try { await applySanction(opts); await load(); }
    catch (e) { console.error(e); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>🛡️ Sanctions & Réhabilitation</Text>
          <Text style={{ color: '#A8A8CC', fontSize: 12, marginTop: 2 }}>
            {sanctions.length} sanction{sanctions.length !== 1 ? 's' : ''} active{sanctions.length !== 1 ? 's' : ''} · {pendingCount} grâce{pendingCount !== 1 ? 's' : ''} en attente
          </Text>
        </View>
        <Pressable onPress={() => setShowModal(true)}
          style={{ backgroundColor: `${RED}18`, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: `${RED}30` }}>
          <Text style={{ color: RED, fontSize: 12, fontWeight: '800' }}>⚡ Sanctionner</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', marginHorizontal: 20, marginBottom: 14, gap: 8 }}>
        {([
          { key: 'active', label: 'Sanctions actives', count: sanctions.length },
          { key: 'graces', label: 'Demandes de grâce', count: pendingCount },
        ] as const).map(t => (
          <Pressable key={t.key} onPress={() => setTab(t.key)}
            style={{
              flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
              backgroundColor: tab === t.key ? `${GOLD}18` : CARD,
              borderWidth: 1, borderColor: tab === t.key ? `${GOLD}40` : BORDER,
            }}>
            <Text style={{ color: tab === t.key ? GOLD : '#A8A8CC', fontSize: 12, fontWeight: '800' }}>
              {t.label}
              {t.count > 0 ? ` (${t.count})` : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Contenu */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={GOLD} />
        </View>
      ) : tab === 'active' ? (
        <FlatList
          data={sanctions}
          keyExtractor={i => i.id}
          renderItem={({ item }) => <SanctionCard s={item} onLift={handleLift} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={GOLD} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 10 }}>
              <Text style={{ fontSize: 40 }}>🕊️</Text>
              <Text style={{ color: '#A8A8CC', fontSize: 14 }}>Aucune sanction active</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={graces}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <GraceCard g={item} onReview={handleReviewGrace} />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={GOLD} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 10 }}>
              <Text style={{ fontSize: 40 }}>✅</Text>
              <Text style={{ color: '#A8A8CC', fontSize: 14 }}>Aucune demande de grâce en attente</Text>
            </View>
          }
        />
      )}

      <ApplySanctionModal visible={showModal} onClose={() => setShowModal(false)} onSubmit={handleApply} />
    </View>
  );
}
