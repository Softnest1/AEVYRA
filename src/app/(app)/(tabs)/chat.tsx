// Aevyra – Plume d'Or (Chat / Messagerie)
import React, { useCallback, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, router, type RelativePathString } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import CosmicBackground from '@/components/CosmicBackground';
import PageHeader from '@/components/PageHeader';
import { supabase } from '@/client/supabase'; // eslint-disable-line @typescript-eslint/no-unused-vars
import {
  getMyMatches, getMatchesMeta,
  type Match, type Message,
} from '@/lib/amour-api';
import { useResponsive } from '@/hooks/useResponsive';
import { SIGNES_ASTRO } from '@/lib/amour-theme';

type MatchWithMeta = Match & {
  lastMsg: Message | null;
  unreadCount: number;
};

export default function PlumeOr() { 
  const insets = useSafeAreaInsets();
  const { px, isPhone, isTablet, isDesktop: _isDesktop, isFullHD: _isFullHD, is4K: _is4K, isCinema: _isCinema, contentMaxWidth, gap, bodySize: _bodySize, captionSize: _captionSize  } = useResponsive();
  // Espace réservé pour la pill flottante — zéro sur desktop/TV
  const pillPaddingBottom = isPhone ? Math.max(insets.bottom, 12) + 8 + 68 + 12
                          : isTablet ? Math.max(insets.bottom, 12) + 8 + 56 + 12
                          : insets.bottom + 32;

  const [matches, setMatches] = useState<MatchWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Charger matches + meta en une seule RPC (0 N+1) ──────
  const loadMatches = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setLoadError(false);
    try {
      const [data, meta] = await Promise.all([getMyMatches(), getMatchesMeta()]);
      const metaMap = new Map(meta.map(r => [r.match_id, r]));
      const enriched: MatchWithMeta[] = data.map(m => {
        const r = metaMap.get(m.id);
        const lastMsg: Message | null = r?.last_content
          ? { id: '', match_id: m.id, sender_id: r.last_sender ?? '', content: r.last_content, created_at: r.last_at ?? '', read_at: null, is_whisper: false, capsule_time: null } as Message
          : null;
        return { ...m, lastMsg, unreadCount: Number(r?.unread_count ?? 0) };
      });
      // Trier par date du dernier message (plus récent en premier)
      enriched.sort((a, b) => {
        const da = a.lastMsg?.created_at ?? a.created_at;
        const db = b.lastMsg?.created_at ?? b.created_at;
        return new Date(db).getTime() - new Date(da).getTime();
      });
      setMatches(enriched);
    } catch (e) {
      console.error('[PlumeOr] Chargement matches échoué', e);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadMatches(true); }, [loadMatches]));

  const renderMatch = ({ item }: { item: MatchWithMeta }) => {
    if (!item.partner) return null;
    const partner    = item.partner;
    const signeEmoji = partner.signe_astro ? SIGNES_ASTRO[partner.signe_astro]?.emoji : '✨';
    const hasUnread  = item.unreadCount > 0;

    // Aperçu du dernier message
    let lastPreview = '';
    if (item.lastMsg) {
      const c = item.lastMsg.content;
      if (c.startsWith('[vocal:') && c.endsWith(']')) {
        lastPreview = '🎙 Message vocal';
      } else {
        lastPreview = c.length > 38 ? c.slice(0, 38) + '…' : c;
      }
    }

    const lastTime = item.lastMsg
      ? new Date(item.lastMsg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : new Date(item.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

    return (
      <Pressable
        onPress={() => router.push(`/(app)/chat/${item.id}` as RelativePathString)}
        style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', marginHorizontal: 0, marginBottom: gap * 0.6 }}
      >
        <LinearGradient
          colors={hasUnread
            ? ['rgba(114,47,55,0.45)', 'rgba(75,0,130,0.35)']
            : ['rgba(75,0,130,0.35)', 'rgba(114,47,55,0.25)']}
          style={{
            borderRadius: 18, padding: 14,
            flexDirection: 'row', alignItems: 'center', gap: 14,
            borderWidth: hasUnread ? 1.5 : 1,
            borderColor: hasUnread ? 'rgba(255,215,0,0.35)' : 'rgba(255,215,0,0.15)',
          }}
        >
          {/* Avatar réel */}
          {partner.photo_url ? (
            <Image
              source={{ uri: partner.photo_url }}
              style={{ width: 54, height: 54, borderRadius: 27 }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <LinearGradient
              colors={[partner.empreinte_couleur || '#FFD700', '#4B0082']}
              style={{ width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 24 }}>🌟</Text>
            </LinearGradient>
          )}

          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{
                color: hasUnread ? '#FFD700' : 'rgba(255,215,0,0.75)',
                fontWeight: hasUnread ? '900' : '700', fontSize: 15,
              }}>
                {partner.prenom}{partner.age ? `, ${partner.age}` : ''}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10 }}>{lastTime}</Text>
            </View>

            {/* Aperçu dernier message */}
            {lastPreview ? (
              <Text
                numberOfLines={1}
                style={{
                  color: hasUnread ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.40)',
                  fontSize: 12,
                  fontWeight: hasUnread ? '600' : '400',
                }}
              >
                {lastPreview}
              </Text>
            ) : (
              <Text style={{ color: 'rgba(255,182,193,0.65)', fontSize: 12 }}>
                {signeEmoji} {partner.signe_astro || 'Âme mystérieuse'}
              </Text>
            )}

            {/* Barre compatibilité */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <View style={{
                  width: `${item.compatibilite}%` as any,
                  height: 4, borderRadius: 2,
                  backgroundColor: item.compatibilite >= 80 ? '#FFD700' : item.compatibilite >= 65 ? '#FF85A2' : '#87CEEB',
                }} />
              </View>
              <Text style={{ color: '#FFD700', fontSize: 11, fontWeight: '700', minWidth: 36 }}>
                {item.compatibilite}%
              </Text>
            </View>
          </View>

          {/* Badge non-lu — count réel depuis read_at */}
          {hasUnread ? (
            <View style={{
              minWidth: 20, height: 20, borderRadius: 10,
              backgroundColor: '#FFD700',
              alignItems: 'center', justifyContent: 'center',
              paddingHorizontal: 5,
            }}>
              <Text style={{ color: '#08001a', fontSize: 11, fontWeight: '900' }}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          ) : (
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)' }} />
          )}
        </LinearGradient>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground>
        {/* En-tête unifié */}
        <PageHeader
          title="💬 Plume d'Or"
          subtitle={`${matches.length} connexion${matches.length !== 1 ? 's' : ''} · ${matches.reduce((a: number, m: any) => a + m.unreadCount, 0) > 0 ? matches.reduce((a: number, m: any) => a + m.unreadCount, 0) + ' non lu' + (matches.reduce((a: number, m: any) => a + m.unreadCount, 0) > 1 ? 's' : '') : 'tout lu'}`}
          actions={[
            {
              emoji: '🔔',
              onPress: () => router.push('/(app)/notifications' as RelativePathString),
            },
          ]}
        />

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#FFD700" />
            <Text style={{ color: 'rgba(255,215,0,0.75)', marginTop: 12, fontStyle: 'italic' }}>
              Chargement de vos échanges...
            </Text>
          </View>
        ) : loadError ? (
          /* ── État erreur réseau ── */
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
            <Text style={{ fontSize: 48 }}>🌩️</Text>
            <Text style={{ color: '#FFD700', fontSize: 18, fontWeight: '900', textAlign: 'center' }}>
              Connexion perdue
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
              Impossible de charger vos conversations. Vérifiez votre connexion et réessayez.
            </Text>
            <Pressable
              onPress={() => loadMatches(true)}
              accessibilityRole="button"
              accessibilityLabel="Réessayer le chargement des messages"
            >
              <LinearGradient
                colors={['rgba(114,47,55,0.7)', 'rgba(75,0,130,0.6)']}
                style={{ borderRadius: 16, paddingVertical: 12, paddingHorizontal: 28, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' }}
              >
                <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: 15 }}>✦ Réessayer</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : matches.length === 0 ? (
          <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never">
            <View style={{ alignItems: 'center', padding: 36, gap: 18 }}>
              <Text style={{ fontSize: 56 }}>💌</Text>
              <Text style={{ color: '#FFD700', fontSize: 20, fontWeight: '900', textAlign: 'center' }}>
                Votre encrier vous attend…
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 22, fontSize: 13 }}>
                Les conversations apparaissent ici dès qu'une âme vous répond ou accepte votre connexion. Commencez par explorer la Constellation.
              </Text>

              {/* CTA Constellation */}
              <Pressable
                onPress={() => router.push('/(app)/(tabs)/home' as RelativePathString)}
                style={{ width: '100%' }}
              >
                <LinearGradient
                  colors={['rgba(114,47,55,0.6)', 'rgba(75,0,130,0.5)']}
                  style={{
                    borderRadius: 18, padding: 16,
                    borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)',
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                  }}
                >
                  <Text style={{ fontSize: 26 }}>💫</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: 14 }}>
                      Explorer la Constellation
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>
                      Envoyez une rose ou une étoile à une âme
                    </Text>
                  </View>
                  <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: 18 }}>›</Text>
                </LinearGradient>
              </Pressable>

              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, textAlign: 'center', fontStyle: 'italic' }}>
                ✦ Une conversation s'ouvre dès un like mutuel ou une connexion acceptée
              </Text>
            </View>
          </ScrollView>
        ) : (
          <FlatList
            data={matches}
            keyExtractor={(item) => item.id}
            renderItem={renderMatch}
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadMatches(false); }}
            contentContainerStyle={{ paddingBottom: pillPaddingBottom, paddingHorizontal: px }}
          />
        )}
      </CosmicBackground>
    </View>
  );
}
