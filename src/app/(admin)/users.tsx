import { useResponsive } from '@/hooks/useResponsive';
// Aevyra Admin — Gestion des utilisateurs
// Liste complète, recherche, filtres, ban/unban, vérification, suppression, notes
// Le layout (admin)/_layout.tsx gère déjà la NavBar — ce fichier n'a PAS de ChevronLeft redondant
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, Pressable,
  RefreshControl, Text, TextInput, View,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search, ShieldCheck, ShieldOff,
  Ban, CheckCircle, Trash2, FileText, X,
} from 'lucide-react-native';
import {
  listAdminUsers, banUser, unbanUser, verifyUser, deleteUser, noteUser,
  type AdminUser,
} from '@/lib/admin-api';
import { useAdminGuard } from '@/hooks/useAdminGuard';

const GOLD   = '#C9A96E';
const BG     = '#0A0A14';
const CARD   = '#13131F';
const BORDER = '#1E1E2E';

type Filter = 'all' | 'banned' | 'verified' | 'unverified';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',        label: 'Tous' },
  { key: 'verified',   label: '✓ Vérifiés' },
  { key: 'unverified', label: '⏳ Non vérifiés' },
  { key: 'banned',     label: '🚫 Bannis' },
];

export default function AdminUsers() {
  const insets  = useSafeAreaInsets();
  const { px, contentMaxWidth, isDesktop, isTablet } = useResponsive();
  const isWide = isDesktop || isTablet;
  const { role } = useAdminGuard();
  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(0);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId]     = useState<string | null>(null);

  const load = useCallback(async (reset = false) => {
    const p = reset ? 0 : page;
    try {
      const res = await listAdminUsers({ page: p, search, filter });
      if (reset) { setUsers(res.users); setPage(0); }
      else        { setUsers((prev: typeof res.users) => p === 0 ? res.users : [...prev, ...res.users]); }
      setTotal(res.total);
    } catch (e) {
      console.error('[AdminUsers]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, search, filter]);

  useFocusEffect(useCallback(() => { (async () => { setLoading(true); await load(true); })(); }, [search, filter]));

  const handleAction = async (action: () => Promise<unknown>, userId: string) => {
    setActionId(userId);
    try { await action(); await load(true); }
    catch (e) { console.error(e); }
    finally { setActionId(null); }
  };

  // Modals Web pour ban avec raison + note admin (Alert.prompt = iOS uniquement)
  const [banModal,  setBanModal]  = useState<{ user: AdminUser } | null>(null);
  const [noteModal, setNoteModal] = useState<{ user: AdminUser } | null>(null);
  const [banReason, setBanReason] = useState('Violation des CGU');
  const [noteText,  setNoteText]  = useState('');

  const confirmDelete = (u: AdminUser) => {
    if (process.env.EXPO_OS === 'web') {
      if (window.confirm(`Supprimer définitivement ${u.prenom} ?\nCette action est irréversible.`)) {
        handleAction(() => deleteUser(u.id), u.id);
      }
    } else {
      import('react-native').then(({ Alert }) => {
        Alert.alert('Supprimer ?', `Supprimer définitivement ${u.prenom} ?`, [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: () => handleAction(() => deleteUser(u.id), u.id) },
        ]);
      });
    }
  };

  const openBan = (u: AdminUser) => {
    setBanReason('Violation des CGU');
    setBanModal({ user: u });
  };

  const submitBan = () => {
    if (!banModal) return;
    const reason = banReason.trim() || 'Violation des CGU';
    handleAction(() => banUser(banModal.user.id, reason), banModal.user.id);
    setBanModal(null);
  };

  const openNote = (u: AdminUser) => {
    setNoteText(u.admin_notes ?? '');
    setNoteModal({ user: u });
  };

  const submitNote = () => {
    if (!noteModal) return;
    handleAction(() => noteUser(noteModal.user.id, noteText.trim()), noteModal.user.id);
    setNoteModal(null);
  };

  // iOS natif : Alert.prompt pour la note
  const promptNoteNative = (u: AdminUser) => {
    import('react-native').then(({ Alert }) => {
      Alert.prompt?.('Note admin', `Note pour ${u.prenom}`, (note) => {
        if (note !== undefined) handleAction(() => noteUser(u.id, note), u.id);
      }, 'plain-text', u.admin_notes ?? '');
    });
  };

  const renderUser = ({ item: u }: { item: AdminUser }) => {
    const busy = actionId === u.id;
    return (
      <View style={{
        backgroundColor: CARD, borderRadius: 14, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: u.is_banned ? '#E53E3E44' : BORDER,
      }}>
        {/* Ligne principale */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, overflow: 'hidden', backgroundColor: BORDER }}>
            {u.photo_url
              ? <Image source={{ uri: u.photo_url }} style={{ width: 48, height: 48 }} contentFit="cover" />
              : <View style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20 }}>👤</Text>
                </View>
            }
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{u.prenom}</Text>
              {u.is_verified && <ShieldCheck size={13} color="#48BB78" />}
              {u.is_banned   && <Ban         size={13} color="#E53E3E" />}
              {u.auto_suspended && (
                <View style={{ backgroundColor: 'rgba(251,191,36,0.2)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: '#FBBF24', fontSize: 10, fontWeight: '800' }}>⏸ SUSPENDU</Text>
                </View>
              )}
            </View>
            <Text style={{ color: '#A8A8CC', fontSize: 12 }}>
              {u.age} ans · {u.genre} · {u.ville || 'Ville inconnue'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
              <Text style={{ color: '#7878A0', fontSize: 11 }}>
                Inscrit {new Date(u.created_at).toLocaleDateString('fr-FR')}
              </Text>
              {typeof u.score_fiabilite === 'number' && (
                <Text style={{
                  fontSize: 11, fontWeight: '700',
                  color: u.score_fiabilite >= 80 ? '#4ADE80' : u.score_fiabilite >= 50 ? '#FBBF24' : '#FF5050',
                }}>
                  🛡 {u.score_fiabilite}/100
                </Text>
              )}
              {typeof u.nb_signalements === 'number' && u.nb_signalements > 0 && (
                <Text style={{ color: '#FC8181', fontSize: 11, fontWeight: '700' }}>
                  🚩 {u.nb_signalements} signalement{u.nb_signalements > 1 ? 's' : ''}
                </Text>
              )}
              {u.photo_verified && (
                <Text style={{ color: '#60A5FA', fontSize: 11, fontWeight: '700' }}>📷 Photo vérifiée</Text>
              )}
            </View>
            <Text style={{ color: '#7878A0', fontSize: 11 }}>
              Inscrit {new Date(u.created_at).toLocaleDateString('fr-FR')}
            </Text>
          </View>
          {busy && <ActivityIndicator color={GOLD} size="small" />}
        </View>

        {/* Note admin */}
        {u.admin_notes && (
          <View style={{ marginTop: 8, backgroundColor: `${GOLD}12`, borderRadius: 8, padding: 8 }}>
            <Text style={{ color: GOLD, fontSize: 12 }}>📝 {u.admin_notes}</Text>
          </View>
        )}

        {/* Raison de ban */}
        {u.is_banned && u.banned_reason && (
          <View style={{ marginTop: 8, backgroundColor: '#E53E3E14', borderRadius: 8, padding: 8 }}>
            <Text style={{ color: '#FC8181', fontSize: 12 }}>🚫 {u.banned_reason}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {/* Vérifier / Retirer vérification */}
          <Pressable
            onPress={() => handleAction(() => verifyUser(u.id, !u.is_verified), u.id)}
            disabled={busy}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: u.is_verified ? '#48BB7820' : '#48BB7812', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
          >
            {u.is_verified
              ? <ShieldOff   size={13} color="#48BB78" />
              : <ShieldCheck size={13} color="#48BB78" />}
            <Text style={{ color: '#48BB78', fontSize: 12, fontWeight: '600' }}>
              {u.is_verified ? 'Retirer ✓' : 'Vérifier'}
            </Text>
          </Pressable>

          {/* Bannir / Débannir */}
          {u.is_banned ? (
            <Pressable
              onPress={() => handleAction(() => unbanUser(u.id), u.id)}
              disabled={busy}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#68D39114', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
            >
              <CheckCircle size={13} color="#68D391" />
              <Text style={{ color: '#68D391', fontSize: 12, fontWeight: '600' }}>Débannir</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => openBan(u)}
              disabled={busy}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E53E3E14', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
            >
              <Ban size={13} color="#E53E3E" />
              <Text style={{ color: '#E53E3E', fontSize: 12, fontWeight: '600' }}>Bannir</Text>
            </Pressable>
          )}

          {/* Note */}
          <Pressable
            onPress={() => process.env.EXPO_OS === 'web' ? openNote(u) : promptNoteNative(u)}
            disabled={busy}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${GOLD}12`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
          >
            <FileText size={13} color={GOLD} />
            <Text style={{ color: GOLD, fontSize: 12, fontWeight: '600' }}>Note</Text>
          </Pressable>

          {/* Supprimer (super_admin) */}
          {role === 'super_admin' && (
            <Pressable
              onPress={() => confirmDelete(u)}
              disabled={busy}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E53E3E22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
            >
              <Trash2 size={13} color="#E53E3E" />
              <Text style={{ color: '#E53E3E', fontSize: 12, fontWeight: '600' }}>Supprimer</Text>
            </Pressable>
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
      <View style={{ paddingTop: insets.top + 12, paddingBottom: 12, gap: 12, backgroundColor: BG, borderBottomWidth: 1, borderBottomColor: BORDER, ...contentStyle }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 19, fontWeight: '800', flex: 1 }}>
            👥 Utilisateurs
          </Text>
          <Text style={{ color: '#A8A8CC', fontSize: 13 }}>{total} total</Text>
        </View>

        {/* Recherche */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: BORDER }}>
          <Search size={16} color="#A8A8CC" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher par prénom…"
            placeholderTextColor="#7878A0"
            style={{ flex: 1, color: '#fff', fontSize: 16, paddingVertical: 10 }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Text style={{ color: '#A8A8CC', fontSize: 18 }}>×</Text>
            </Pressable>
          )}
        </View>

        {/* Filtres */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {FILTERS.map(f => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={{
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                backgroundColor: filter === f.key ? GOLD : CARD,
                borderWidth: 1, borderColor: filter === f.key ? GOLD : BORDER,
              }}
            >
              <Text style={{ color: filter === f.key ? '#0A0A14' : '#A8A8CC', fontSize: 12, fontWeight: '600' }}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={GOLD} size="large" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={u => u.id}
          renderItem={renderUser}
          contentContainerStyle={{ paddingVertical: 16, ...(isWide ? { paddingHorizontal: px, alignSelf: 'center', width: '100%', maxWidth: contentMaxWidth } : { paddingHorizontal: 16 }) }}
          showsVerticalScrollIndicator={false}
            overScrollMode="never"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={GOLD} />}
          onEndReached={() => { if (users.length < total) { setPage((p: number) => p + 1); load(); } }}
          onEndReachedThreshold={0.4}
          contentInsetAdjustmentBehavior="automatic"
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <Text style={{ fontSize: 40 }}>👤</Text>
              <Text style={{ color: '#A8A8CC', fontSize: 15 }}>Aucun utilisateur trouvé</Text>
            </View>
          }
          ListFooterComponent={
            users.length < total ? (
              <Pressable
                onPress={() => { setPage((p: number) => p + 1); load(); }}
                style={{ alignItems: 'center', padding: 16 }}
              >
                <Text style={{ color: GOLD, fontSize: 14 }}>Charger plus</Text>
              </Pressable>
            ) : null
          }
        />
      )}
      {/* Modal Ban — raison personnalisée */}
      <Modal visible={!!banModal} transparent animationType="fade" onRequestClose={() => setBanModal(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 24, gap: 16, borderWidth: 1, borderColor: '#E53E3E44' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', flex: 1 }}>
                🚫 Bannir {banModal?.user.prenom}
              </Text>
              <Pressable onPress={() => setBanModal(null)} style={{ padding: 4 }}>
                <X size={18} color="#A8A8CC" />
              </Pressable>
            </View>
            <View style={{ gap: 6 }}>
              <Text style={{ color: '#A8A8CC', fontSize: 12, fontWeight: '600' }}>RAISON DU BAN</Text>
              <TextInput
                value={banReason}
                onChangeText={setBanReason}
                placeholder="Ex : Harcèlement, contenu inapproprié…"
                placeholderTextColor="#7878A0"
                style={{ backgroundColor: BG, borderRadius: 10, padding: 12, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#E53E3E44' }}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setBanModal(null)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: BORDER, alignItems: 'center' }}
              >
                <Text style={{ color: '#A8A8CC', fontWeight: '700' }}>Annuler</Text>
              </Pressable>
              <Pressable
                onPress={submitBan}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#E53E3E', alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>Confirmer le ban</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Note admin */}
      <Modal visible={!!noteModal} transparent animationType="fade" onRequestClose={() => setNoteModal(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 24, gap: 16, borderWidth: 1, borderColor: `${GOLD}40` }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', flex: 1 }}>
                📝 Note — {noteModal?.user.prenom}
              </Text>
              <Pressable onPress={() => setNoteModal(null)} style={{ padding: 4 }}>
                <X size={18} color="#A8A8CC" />
              </Pressable>
            </View>
            <TextInput
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Note interne (visible uniquement des admins)…"
              placeholderTextColor="#7878A0"
              multiline
              style={{ backgroundColor: BG, borderRadius: 10, padding: 12, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: `${GOLD}30`, minHeight: 100 }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setNoteModal(null)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: BORDER, alignItems: 'center' }}
              >
                <Text style={{ color: '#A8A8CC', fontWeight: '700' }}>Annuler</Text>
              </Pressable>
              <Pressable
                onPress={submitNote}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: GOLD, alignItems: 'center' }}
              >
                <Text style={{ color: '#0A0A14', fontWeight: '800' }}>Enregistrer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
