// Aevyra – Événements Nuit Magique
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import PageHeader from '@/components/PageHeader';
import { getEvents, inscriptionEvent, type Event } from '@/lib/amour-api';
import { useResponsive } from '@/hooks/useResponsive';

const TYPE_EMOJI: Record<string, string> = {
  speed_dating: '⚡',
  defi: '🎯',
  concert: '🎵',
  soiree: '🌙',
  atelier: '✨',
};

export default function Evenements() { 
  const { px, bodySize, captionSize, h3Size, gap, contentMaxWidth, iconSize, tapTarget: _tapTarget  } = useResponsive();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [inscrit, setInscrit] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        try {
          const data = await getEvents();
          setEvents(data);
        } catch (e) {
          console.error('[Évènements] Chargement échoué', e);
        } finally {
          setLoading(false);
        }
      })();
    }, [])
  );

  const handleInscription = async (eventId: string) => {
    try {
      await inscriptionEvent(eventId);
      setInscrit((prev: Set<string>) => new Set([...prev, eventId]));
    } catch (e) {
      console.error('[Évènements] Inscription échouée', e);
      // L'UI ne crash pas — l'utilisateur peut réessayer
    }
  };

  const renderEvent = ({ item }: { item: Event }) => {
    const eventDate = new Date(item.date_event);
    const isInscrit = inscrit.has(item.id);
    return (
      <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', paddingHorizontal: px, marginBottom: gap }}>
        <LinearGradient
          colors={['rgba(114,47,55,0.45)', 'rgba(75,0,130,0.35)']}
          style={{
            borderRadius: 20, overflow: 'hidden',
            borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)',
          }}
        >
          {/* Bannière */}
          <LinearGradient
            colors={['rgba(75,0,130,0.6)', 'rgba(114,47,55,0.5)']}
            style={{ padding: 16, paddingBottom: 12 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: iconSize * 1.5 }}>{item.emoji || TYPE_EMOJI[item.type] || '🌟'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: h3Size }}>
                  {item.titre}
                </Text>
                <Text style={{ color: 'rgba(255,182,193,0.8)', fontSize: captionSize, marginTop: 2 }}>
                  {item.type.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View style={{ padding: 16, gap: 10 }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: bodySize, lineHeight: bodySize * 1.55 }}>
              {item.description}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: bodySize }}>📅</Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize }}>
                  {eventDate.toLocaleDateString('fr-FR', {
                    weekday: 'short', day: 'numeric', month: 'long',
                  })}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: bodySize }}>📍</Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize }}>{item.lieu}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: bodySize }}>👥</Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize }}>
                  {item.participants_count}/{item.participants_max} âmes
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => !isInscrit && handleInscription(item.id)}
              disabled={isInscrit}
              style={{
                borderRadius: 14, padding: 12, alignItems: 'center',
                backgroundColor: isInscrit ? 'rgba(255,215,0,0.12)' : 'rgba(114,47,55,0.5)',
                borderWidth: 1, borderColor: isInscrit ? '#FFD700' : 'rgba(255,215,0,0.25)',
              }}
            >
              <Text style={{
                color: isInscrit ? '#FFD700' : 'rgba(255,255,255,0.85)',
                fontWeight: '700', fontSize: bodySize,
              }}>
                {isInscrit ? '✓ Vous participez à cet événement' : 'Je veux participer ✨'}
              </Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground>
        {/* En-tête unifié avec retour */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: px }}>
          <Pressable onPress={() => router.back()} style={{ paddingRight: 8, paddingTop: 4 }}>
            <ChevronLeft size={26} color="#FFD700" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <PageHeader
              title="🎪 Nuit Magique"
              subtitle="Événements romantiques à venir"
              divider={false}
            />
          </View>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#FFD700" />
          </View>
        ) : events.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <Text style={{ fontSize: iconSize * 2, marginBottom: 12 }}>🌙</Text>
            <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: h3Size, textAlign: 'center', marginBottom: 8 }}>
              Les étoiles s'organisent...
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', textAlign: 'center', fontStyle: 'italic' }}>
              De nouveaux événements romantiques arrivent bientôt. Restez connecté(e).
            </Text>
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            renderItem={renderEvent}
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        )}
      </CosmicBackground>
    </View>
  );
}
