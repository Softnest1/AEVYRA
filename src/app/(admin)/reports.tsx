import { useResponsive } from '@/hooks/useResponsive';
// Aevyra Admin — Signalements & Modération messages
// Onglets : Signalements en attente | Résolus | Messages signalés
// Le layout (admin)/_layout.tsx gère déjà la NavBar — pas de ChevronLeft redondant
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable,
  RefreshControl, Text, View,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, XCircle, Trash2 } from 'lucide-react-native';
import {
  listReports, resolveReport, listMessages, deleteAdminMessage,
  type Report, type AdminMessage,
} from '@/lib/admin-api';

const GOLD   = '#C9A96E';
const BG     = '#0A0A14';
const CARD   = '#13131F';
const BORDER = '#1E1E2E';

type Tab = 'pending' | 'resolved' | 'messages';

export default function AdminReports() {
  const insets  = useSafeAreaInsets();
  const { px, contentMaxWidth, isDesktop, isTablet } = useResponsive();
  const isWide = isDesktop || isTablet;
  const [tab, setTab]           = useState<Tab>('pending');
  const [reports, setReports]   = useState<Report[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId]     = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      if (tab === 'messages') {
        const res = await listMessages({ page: 0 });
        setMessages(res.messages);
      } else {
        const res = await listReports(tab);
        setReports(res.reports);
      }
    } catch (e) {
      console.error('[AdminReports]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useFocusEffect(useCallback(() => { (async () => { setLoading(true); await load(); })(); }, [tab]));

  const handleReport = async (reportId: string, status: string) => {
    setActionId(reportId);
    try { await resolveReport(reportId, status); await load(); }
    catch (e) { console.error(e); }
    finally { setActionId(null); }
  };

  const handleDeleteMsg = async (msgId: string) => {
    setActionId(msgId);
    try { await deleteAdminMessage(msgId); await load(); }
    catch (e) { console.error(e); }
    finally { setActionId(null); }
  };

  const renderReport = ({ item: r }: { item: Report }) => {
    const busy = actionId === r.id;
    // Extraire les infos de modération du signalé (enrichies par admin-api)
    const reported = r.reported as {
      id?: string; prenom?: string; pseudo?: string; photo_url?: string;
      nb_signalements?: number; auto_suspended?: boolean; score_fiabilite?: number; is_banned?: boolean;
    } | undefined;
    const nb    = reported?.nb_signalements ?? 0;
    const score = reported?.score_fiabilite ?? 100;
    const suspendu = reported?.auto_suspended;
    const banni    = reported?.is_banned;

    // Couleur badge selon nombre de signalements
    const badgeColor = nb >= 5 ? '#FF3B30' : nb >= 3 ? '#FF9500' : '#FFD60A';

    return (
      <View style={{
        backgroundColor: CARD, borderRadius: 14, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: suspendu ? '#FF950040' : banni ? '#FF3B3040' : BORDER,
      }}>
        {/* Bandeau statut si suspendu/banni */}
        {(suspendu || banni) && (
          <View style={{ backgroundColor: banni ? '#FF3B3022' : '#FF950022', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: banni ? '#FF3B30' : '#FF9500', fontSize: 12, fontWeight: '700' }}>
              {banni ? '🔴 BANNI' : '🟠 SUSPENDU AUTO'}
            </Text>
          </View>
        )}

        {/* Signaleur → Signalé */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          {r.reporter?.photo_url && (
            <Image source={{ uri: r.reporter.photo_url }} style={{ width: 30, height: 30, borderRadius: 15 }} contentFit="cover" />
          )}
          <Text style={{ color: '#A8A8CC', fontSize: 12 }}>
            {r.reporter?.prenom ?? 'Anonyme'} signale
          </Text>
          {r.reported?.photo_url && (
            <Image source={{ uri: r.reported.photo_url }} style={{ width: 30, height: 30, borderRadius: 15 }} contentFit="cover" />
          )}
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', flex: 1 }}>
            {r.reported?.prenom ?? 'Utilisateur supprimé'}
          </Text>
        </View>

        {/* Raison */}
        <View style={{ backgroundColor: '#E53E3E14', borderRadius: 8, padding: 10, marginBottom: 10 }}>
          <Text style={{ color: '#FC8181', fontSize: 13, fontWeight: '600' }}>{r.reason}</Text>
          {r.details && <Text style={{ color: '#FCA5A5', fontSize: 12, marginTop: 4 }}>{r.details}</Text>}
        </View>

        {/* Badges modération : nb signalements + score fiabilité */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {nb > 0 && (
            <View style={{ backgroundColor: badgeColor + '22', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: badgeColor + '60' }}>
              <Text style={{ color: badgeColor, fontSize: 12, fontWeight: '700' }}>
                🚩 {nb} signalement{nb > 1 ? 's' : ''}
              </Text>
            </View>
          )}
          <View style={{ backgroundColor: score >= 80 ? '#48BB7822' : score >= 50 ? '#F6AD5522' : '#E53E3E22', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: score >= 80 ? '#48BB7860' : score >= 50 ? '#F6AD5560' : '#E53E3E60' }}>
            <Text style={{ color: score >= 80 ? '#48BB78' : score >= 50 ? '#F6AD55' : '#E53E3E', fontSize: 12, fontWeight: '700' }}>
              🛡 Score {score}/100
            </Text>
          </View>
        </View>

        <Text style={{ color: '#7878A0', fontSize: 11, marginBottom: 10 }}>
          {new Date(r.created_at).toLocaleString('fr-FR')}
        </Text>

        {/* Actions */}
        {tab === 'pending' && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => handleReport(r.id, 'resolved')}
              disabled={busy}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#48BB7820', borderRadius: 10, paddingVertical: 10 }}
            >
              {busy ? <ActivityIndicator color="#48BB78" size="small" /> : <CheckCircle size={15} color="#48BB78" />}
              <Text style={{ color: '#48BB78', fontSize: 13, fontWeight: '600' }}>Résoudre</Text>
            </Pressable>
            <Pressable
              onPress={() => handleReport(r.id, 'dismissed')}
              disabled={busy}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#E53E3E20', borderRadius: 10, paddingVertical: 10 }}
            >
              <XCircle size={15} color="#E53E3E" />
              <Text style={{ color: '#E53E3E', fontSize: 13, fontWeight: '600' }}>Rejeter</Text>
            </Pressable>
          </View>
        )}

        {tab === 'resolved' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: r.status === 'resolved' ? '#48BB78' : '#A8A8CC',
            }} />
            <Text style={{ color: '#A8A8CC', fontSize: 12 }}>
              {r.status === 'resolved' ? 'Résolu' : 'Rejeté'} · {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString('fr-FR') : ''}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderMessage = ({ item: m }: { item: AdminMessage }) => {
    const busy = actionId === m.id;
    return (
      <View style={{
        backgroundColor: CARD, borderRadius: 14, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: m.is_deleted ? '#E53E3E44' : BORDER,
        opacity: m.is_deleted ? 0.6 : 1,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Text style={{ color: GOLD, fontSize: 13, fontWeight: '700' }}>
            {m.sender?.prenom ?? 'Inconnu'}
          </Text>
          <Text style={{ color: '#7878A0', fontSize: 11, flex: 1 }}>
            {new Date(m.created_at).toLocaleString('fr-FR')}
          </Text>
          {!m.is_deleted && (
            <Pressable
              onPress={() => handleDeleteMsg(m.id)}
              disabled={busy}
              style={{ padding: 6 }}
            >
              {busy
                ? <ActivityIndicator color="#E53E3E" size="small" />
                : <Trash2 size={16} color="#E53E3E" />}
            </Pressable>
          )}
        </View>
        <Text style={{ color: m.is_deleted ? '#7878A0' : '#ddd', fontSize: 14 }}>
          {m.content}
        </Text>
      </View>
    );
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'pending',  label: '🔴 En attente' },
    { key: 'resolved', label: '✅ Résolus' },
    { key: 'messages', label: '💬 Messages' },
  ];

  const contentStyle = isWide
    ? { paddingHorizontal: px, alignSelf: 'center' as const, width: '100%' as const, maxWidth: contentMaxWidth }
    : { paddingHorizontal: 16 };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 12, paddingBottom: 12, backgroundColor: BG, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 12, ...contentStyle }}>
        <Text style={{ color: '#fff', fontSize: 19, fontWeight: '800' }}>
          🚩 Signalements & Messages
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {TABS.map(t => (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={{
                flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center',
                backgroundColor: tab === t.key ? GOLD : CARD,
                borderWidth: 1, borderColor: tab === t.key ? GOLD : BORDER,
              }}
            >
              <Text style={{ color: tab === t.key ? '#0A0A14' : '#A8A8CC', fontSize: 12, fontWeight: '700' }}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={GOLD} size="large" />
        </View>
      ) : tab === 'messages' ? (
        <FlatList
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderMessage}
          contentContainerStyle={{ paddingVertical: 16, ...(isWide ? { paddingHorizontal: px, alignSelf: 'center', width: '100%', maxWidth: contentMaxWidth } : { paddingHorizontal: 16 }) }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={GOLD} />}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          contentInsetAdjustmentBehavior="automatic"
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <Text style={{ fontSize: 40 }}>💬</Text>
              <Text style={{ color: '#A8A8CC', fontSize: 15 }}>Aucun message</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={r => r.id}
          renderItem={renderReport}
          contentContainerStyle={{ paddingVertical: 16, ...(isWide ? { paddingHorizontal: px, alignSelf: 'center', width: '100%', maxWidth: contentMaxWidth } : { paddingHorizontal: 16 }) }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={GOLD} />}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          contentInsetAdjustmentBehavior="automatic"
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <Text style={{ fontSize: 40 }}>🎉</Text>
              <Text style={{ color: '#A8A8CC', fontSize: 15 }}>Aucun signalement {tab === 'pending' ? 'en attente' : 'résolu'}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
