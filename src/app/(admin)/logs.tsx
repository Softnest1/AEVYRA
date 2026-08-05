import { useResponsive } from '@/hooks/useResponsive';
// Aevyra Admin — Journal des actions (audit trail)
// Toutes les actions effectuées par les admins avec filtrage par type
// Le layout (admin)/_layout.tsx gère déjà la NavBar — pas de ChevronLeft redondant
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable,
  RefreshControl, Text, View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listAdminLogs, type AdminLog } from '@/lib/admin-api';

const GOLD   = '#C9A96E';
const BG     = '#0A0A14';
const CARD   = '#13131F';
const BORDER = '#1E1E2E';

const ACTION_COLORS: Record<string, string> = {
  ban_user:              '#E53E3E',
  unban_user:            '#68D391',
  verify_user:           '#48BB78',
  unverify_user:         '#FC8181',
  delete_user:           '#E53E3E',
  delete_message:        '#F6AD55',
  resolve_report:        '#68D391',
  dismiss_report:        '#A8A8CC',
  create_event:          GOLD,
  delete_event:          '#FC8181',
  approve_testimonial:   '#48BB78',
  reject_testimonial:    '#FC8181',
  grant_admin:           '#7B68EE',
  revoke_admin:          '#E53E3E',
  note_user:             GOLD,
};

const ACTION_ICONS: Record<string, string> = {
  ban_user:              '🚫',
  unban_user:            '✅',
  verify_user:           '🛡️',
  unverify_user:         '⚠️',
  delete_user:           '🗑️',
  delete_message:        '💬',
  resolve_report:        '✅',
  dismiss_report:        '❌',
  create_event:          '🎉',
  delete_event:          '🗑️',
  approve_testimonial:   '💬',
  reject_testimonial:    '❌',
  grant_admin:           '👑',
  revoke_admin:          '🔒',
  note_user:             '📝',
};

export default function AdminLogs() {
  const insets  = useSafeAreaInsets();
  const { px, contentMaxWidth, isDesktop, isTablet } = useResponsive();
  const isWide = isDesktop || isTablet;
  const [logs, setLogs]       = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]   = useState<string>('all');

  const load = useCallback(async () => {
    try {
      const res = await listAdminLogs();
      setLogs(res.logs);
    } catch (e) {
      console.error('[AdminLogs]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { (async () => { setLoading(true); await load(); })(); }, []));

  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter((l: any) => l.target_type === filter);

  const FILTERS = [
    { key: 'all',     label: 'Tous' },
    { key: 'user',    label: '👤 Utilisateurs' },
    { key: 'message', label: '💬 Messages' },
    { key: 'report',  label: '🚩 Signalements' },
    { key: 'event',   label: '🎉 Événements' },
  ];

  const renderLog = ({ item: l }: { item: AdminLog }) => {
    const color = ACTION_COLORS[l.action] ?? '#A8A8CC';
    const icon  = ACTION_ICONS[l.action]  ?? '⚙️';
    return (
      <View style={{
        backgroundColor: CARD, borderRadius: 12, padding: 12, marginBottom: 8,
        borderWidth: 1, borderColor: BORDER, flexDirection: 'row', gap: 12, alignItems: 'flex-start',
      }}>
        {/* Indicateur couleur */}
        <View style={{
          width: 36, height: 36, borderRadius: 10,
          backgroundColor: `${color}18`,
          alignItems: 'center', justifyContent: 'center',
          marginTop: 2,
        }}>
          <Text style={{ fontSize: 18 }}>{icon}</Text>
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
            {l.action.replace(/_/g, ' ')}
          </Text>
          <Text style={{ color: '#A8A8CC', fontSize: 12 }}>
            Par {l.admin?.prenom ?? 'Admin'} · {new Date(l.created_at).toLocaleString('fr-FR')}
          </Text>
          {l.target_type && (
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
              <View style={{ backgroundColor: `${color}18`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ color, fontSize: 11, fontWeight: '600' }}>
                  {l.target_type}
                </Text>
              </View>
              {l.target_id && (
                <Text style={{ color: '#7878A0', fontSize: 11, fontFamily: 'monospace' }}>
                  {l.target_id.slice(0, 8)}…
                </Text>
              )}
            </View>
          )}
          {/* Détails JSON si pertinents */}
          {l.details && Object.keys(l.details).length > 0 && (
            <View style={{ backgroundColor: `${GOLD}08`, borderRadius: 6, padding: 6, marginTop: 4 }}>
              {Object.entries((l as any).details).map(([k, v]: [string, unknown]) => (
                <React.Fragment key={k}><Text style={{ color: '#A8A8CC', fontSize: 11 }}>
                  {k}: <Text style={{ color: '#CCC' }}>{String(v)}</Text>
                </Text>
                </React.Fragment>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const contentStyle = isWide
    ? { paddingHorizontal: px, alignSelf: 'center' as const, width: '100%' as const, maxWidth: contentMaxWidth }
    : { paddingHorizontal: 16 };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 12, paddingBottom: 12, backgroundColor: BG, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 12, ...contentStyle }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 19, fontWeight: '800', flex: 1 }}>
            📋 Journal admin
          </Text>
          <Text style={{ color: '#A8A8CC', fontSize: 13 }}>
            {filteredLogs.length} entrées
          </Text>
        </View>

        {/* Filtres */}
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={f => f.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item: f }) => (
            <Pressable
              onPress={() => setFilter(f.key)}
              style={{
                paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                backgroundColor: filter === f.key ? GOLD : CARD,
                borderWidth: 1, borderColor: filter === f.key ? GOLD : BORDER,
              }}
            >
              <Text style={{ color: filter === f.key ? '#0A0A14' : '#A8A8CC', fontSize: 12, fontWeight: '600' }}>
                {f.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={GOLD} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          keyExtractor={l => l.id}
          renderItem={renderLog}
          contentContainerStyle={{ paddingVertical: 16, ...(isWide ? { paddingHorizontal: px, alignSelf: 'center', width: '100%', maxWidth: contentMaxWidth } : { paddingHorizontal: 16 }) }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={GOLD} />}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          contentInsetAdjustmentBehavior="automatic"
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <Text style={{ fontSize: 40 }}>📋</Text>
              <Text style={{ color: '#A8A8CC', fontSize: 15 }}>Aucune action enregistrée</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
