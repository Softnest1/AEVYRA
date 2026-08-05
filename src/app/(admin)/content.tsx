import { useResponsive } from '@/hooks/useResponsive';
// Aevyra Admin — Gestion du contenu
// Onglets : Événements | Témoignages
// CRUD événements, approbation/rejet témoignages
// Le layout (admin)/_layout.tsx gère déjà la NavBar — pas de ChevronLeft redondant
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, Pressable,
  RefreshControl, Text, TextInput, View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, CheckCircle, XCircle, Trash2, X } from 'lucide-react-native';
import { Image } from 'expo-image';
import {
  listEvents, createEvent, deleteEvent,
  listTestimonials, approveTestimonial,
  type AdminEvent, type AdminTestimonial,
} from '@/lib/admin-api';

const GOLD   = '#C9A96E';
const BG     = '#0A0A14';
const CARD   = '#13131F';
const BORDER = '#1E1E2E';

type Tab = 'events' | 'testimonials';

export default function AdminContent() {
  const insets  = useSafeAreaInsets();
  const { px, contentMaxWidth, isDesktop, isTablet } = useResponsive();
  const isWide = isDesktop || isTablet;
  const [tab, setTab]             = useState<Tab>('events');
  const [events, setEvents]       = useState<AdminEvent[]>([]);
  const [testims, setTestims]     = useState<AdminTestimonial[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId]   = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Formulaire création événement
  const [form, setForm] = useState({ titre: '', description: '', date: '', lieu: '', image_url: '' });

  const load = useCallback(async () => {
    try {
      if (tab === 'events') {
        const res = await listEvents();
        setEvents(res.events);
      } else {
        const res = await listTestimonials();
        setTestims(res.testimonials);
      }
    } catch (e) {
      console.error('[AdminContent]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useFocusEffect(useCallback(() => { (async () => { setLoading(true); await load(); })(); }, [tab]));

  const handleDeleteEvent = async (id: string) => {
    setActionId(id);
    try { await deleteEvent(id); await load(); }
    catch (e) { console.error(e); }
    finally { setActionId(null); }
  };

  const handleApprove = async (id: string, approved: boolean) => {
    setActionId(id);
    try { await approveTestimonial(id, approved); await load(); }
    catch (e) { console.error(e); }
    finally { setActionId(null); }
  };

  const handleCreateEvent = async () => {
    if (!form.titre || !form.date) return;
    try {
      await createEvent(form);
      setForm({ titre: '', description: '', date: '', lieu: '', image_url: '' });
      setShowModal(false);
      await load();
    } catch (e) {
      console.error('[createEvent]', e);
    }
  };

  const renderEvent = ({ item: e }: { item: AdminEvent }) => {
    const busy = actionId === e.id;
    return (
      <View style={{ backgroundColor: CARD, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BORDER, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          {e.image_url ? (
            <Image source={{ uri: e.image_url }} style={{ width: 56, height: 56, borderRadius: 12 }} contentFit="cover" />
          ) : (
            <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 24 }}>🎉</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{e.titre}</Text>
            <Text style={{ color: '#A8A8CC', fontSize: 12 }}>
              📅 {e.date ? new Date(e.date).toLocaleDateString('fr-FR') : 'Date inconnue'}
            </Text>
            {e.lieu && <Text style={{ color: '#A8A8CC', fontSize: 12 }}>📍 {e.lieu}</Text>}
          </View>
          <Pressable onPress={() => handleDeleteEvent(e.id)} disabled={busy} style={{ padding: 6 }}>
            {busy ? <ActivityIndicator color="#E53E3E" size="small" /> : <Trash2 size={16} color="#E53E3E" />}
          </Pressable>
        </View>
        {e.description && (
          <Text style={{ color: '#AAA', fontSize: 13 }} numberOfLines={3}>{e.description}</Text>
        )}
      </View>
    );
  };

  const renderTestimonial = ({ item: t }: { item: AdminTestimonial }) => {
    const busy = actionId === t.id;
    return (
      <View style={{ backgroundColor: CARD, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: t.is_approved ? '#48BB7830' : BORDER }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          {t.user?.photo_url ? (
            <Image source={{ uri: t.user.photo_url }} style={{ width: 36, height: 36, borderRadius: 18 }} contentFit="cover" />
          ) : (
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center' }}>
              <Text>👤</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{t.user?.prenom ?? 'Anonyme'}</Text>
            <Text style={{ color: '#7878A0', fontSize: 11 }}>{new Date(t.created_at).toLocaleDateString('fr-FR')}</Text>
          </View>
          <View style={{
            paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
            backgroundColor: t.is_approved ? '#48BB7820' : '#E53E3E14',
          }}>
            <Text style={{ color: t.is_approved ? '#48BB78' : '#FC8181', fontSize: 11, fontWeight: '700' }}>
              {t.is_approved ? 'Approuvé' : 'En attente'}
            </Text>
          </View>
        </View>

        <Text style={{ color: '#DDD', fontSize: 14, lineHeight: 20, marginBottom: 12 }}>{t.content}</Text>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {!t.is_approved && (
            <Pressable
              onPress={() => handleApprove(t.id, true)}
              disabled={busy}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#48BB7820', borderRadius: 10, paddingVertical: 8 }}
            >
              {busy ? <ActivityIndicator color="#48BB78" size="small" /> : <CheckCircle size={15} color="#48BB78" />}
              <Text style={{ color: '#48BB78', fontSize: 13, fontWeight: '600' }}>Approuver</Text>
            </Pressable>
          )}
          {t.is_approved && (
            <Pressable
              onPress={() => handleApprove(t.id, false)}
              disabled={busy}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#E53E3E14', borderRadius: 10, paddingVertical: 8 }}
            >
              <XCircle size={15} color="#E53E3E" />
              <Text style={{ color: '#E53E3E', fontSize: 13, fontWeight: '600' }}>Retirer l'approbation</Text>
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
      <View style={{ paddingTop: insets.top + 12, paddingBottom: 12, backgroundColor: BG, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 12, ...contentStyle }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 19, fontWeight: '800', flex: 1 }}>
            ⚙️ Contenu
          </Text>
          {tab === 'events' && (
            <Pressable
              onPress={() => setShowModal(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: GOLD, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }}
            >
              <Plus size={16} color="#0A0A14" />
              <Text style={{ color: '#0A0A14', fontSize: 13, fontWeight: '700' }}>Créer</Text>
            </Pressable>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[{ key: 'events' as Tab, label: '🎉 Événements' }, { key: 'testimonials' as Tab, label: '💬 Témoignages' }].map(t => (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={{
                flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center',
                backgroundColor: tab === t.key ? GOLD : CARD,
                borderWidth: 1, borderColor: tab === t.key ? GOLD : BORDER,
              }}
            >
              <Text style={{ color: tab === t.key ? '#0A0A14' : '#A8A8CC', fontSize: 13, fontWeight: '700' }}>
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
      ) : tab === 'events' ? (
        <FlatList
          data={events}
          keyExtractor={e => e.id}
          renderItem={renderEvent}
          contentContainerStyle={{ paddingVertical: 16, ...(isWide ? { paddingHorizontal: px, alignSelf: 'center', width: '100%', maxWidth: contentMaxWidth } : { paddingHorizontal: 16 }) }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={GOLD} />}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          contentInsetAdjustmentBehavior="automatic"
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <Text style={{ fontSize: 40 }}>🎉</Text>
              <Text style={{ color: '#A8A8CC', fontSize: 15 }}>Aucun événement</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={testims}
          keyExtractor={t => t.id}
          renderItem={renderTestimonial}
          contentContainerStyle={{ paddingVertical: 16, ...(isWide ? { paddingHorizontal: px, alignSelf: 'center', width: '100%', maxWidth: contentMaxWidth } : { paddingHorizontal: 16 }) }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={GOLD} />}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          contentInsetAdjustmentBehavior="automatic"
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <Text style={{ fontSize: 40 }}>💬</Text>
              <Text style={{ color: '#A8A8CC', fontSize: 15 }}>Aucun témoignage</Text>
            </View>
          }
        />
      )}

      {/* Modal création événement */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', flex: 1 }}>Nouvel événement</Text>
              <Pressable onPress={() => setShowModal(false)} style={{ padding: 6 }}>
                <X size={20} color="#A8A8CC" />
              </Pressable>
            </View>

            {[
              { key: 'titre',       label: 'Titre *',       placeholder: 'Soirée romantique…' },
              { key: 'description', label: 'Description',   placeholder: 'Description de l\'événement…' },
              { key: 'date',        label: 'Date (ISO) *',  placeholder: '2026-02-14T20:00:00' },
              { key: 'lieu',        label: 'Lieu',          placeholder: 'Paris, France' },
              { key: 'image_url',   label: 'URL image',     placeholder: 'https://…' },
            ].map(field => (
              <React.Fragment key={field.key}><View style={{ gap: 6 }}>
                <Text style={{ color: '#A8A8CC', fontSize: 12, fontWeight: '600' }}>{field.label}</Text>
                <TextInput
                  value={form[(field as any).key as keyof typeof form]}
                  onChangeText={v => setForm((f: typeof form) => ({ ...f, [field.key]: v }))}
                  placeholder={field.placeholder}
                  placeholderTextColor="#7878A0"
                  multiline={field.key === 'description'}
                  style={{
                    backgroundColor: BG, borderRadius: 10, padding: 12, color: '#fff', fontSize: 16,
                    borderWidth: 1, borderColor: BORDER,
                    minHeight: field.key === 'description' ? 80 : undefined,
                  }}
                />
              </View>
              </React.Fragment>
            ))}

            <Pressable
              onPress={handleCreateEvent}
              style={{ backgroundColor: GOLD, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: '#0A0A14', fontSize: 15, fontWeight: '800' }}>Créer l'événement</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
