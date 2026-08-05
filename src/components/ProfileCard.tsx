// Composant réutilisable — carte mini-profil avec photo, compat, favori
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Bookmark, BookmarkCheck } from 'lucide-react-native';
import { router } from 'expo-router';
import { SIGNES_ASTRO } from '@/lib/amour-theme';
import type { Profile } from '@/lib/amour-api';

interface ProfileCardProps {
  profile: Profile;
  compatPercent?: number;       // 0-100, si undefined → pas de barre
  extraInfo?: string;           // ex: "🌹 12 janv."
  isFavori?: boolean;
  onToggleFavori?: (profileId: string) => void;
  style?: object;
}

export default function ProfileCard({
  profile,
  compatPercent,
  extraInfo,
  isFavori = false,
  onToggleFavori,
  style,
}: ProfileCardProps) {
  const signeEmoji = profile.signe_astro ? SIGNES_ASTRO[profile.signe_astro]?.emoji : null;

  return (
    <Pressable
      onPress={() => router.push(`/(app)/profile/${profile.id}` as any)}
      style={[{ marginBottom: 10 }, style]}
    >
      <LinearGradient
        colors={['rgba(75,0,130,0.35)', 'rgba(114,47,55,0.25)']}
        style={{
          borderRadius: 18, padding: 14,
          flexDirection: 'row', alignItems: 'center', gap: 14,
          borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)',
        }}
      >
        {/* Avatar : photo réelle ou dégradé fallback */}
        {profile.photo_url ? (
          <Image
            source={{ uri: profile.photo_url }}
            style={{ width: 54, height: 54, borderRadius: 27 }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <LinearGradient
            colors={[profile.empreinte_couleur || '#FFD700', '#4B0082']}
            style={{ width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 24 }}>🌟</Text>
          </LinearGradient>
        )}

        {/* Infos */}
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: 15 }}>
            {profile.prenom}{profile.age ? `, ${profile.age}` : ''}
          </Text>

          {profile.signe_astro ? (
            <Text style={{ color: 'rgba(255,182,193,0.75)', fontSize: 12 }}>
              {signeEmoji} {profile.signe_astro}
            </Text>
          ) : profile.energie_romantique ? (
            <Text style={{ color: 'rgba(255,182,193,0.75)', fontSize: 12 }}>
              {profile.energie_romantique}
            </Text>
          ) : null}

          {/* Barre de compatibilité */}
          {compatPercent !== undefined && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <View style={{
                  width: `${compatPercent}%` as any,
                  height: 4, borderRadius: 2,
                  backgroundColor: compatPercent >= 80 ? '#FFD700' : compatPercent >= 65 ? '#FF85A2' : '#87CEEB',
                }} />
              </View>
              <Text style={{
                color: compatPercent >= 80 ? '#FFD700' : 'rgba(255,255,255,0.6)',
                fontSize: 11, fontWeight: '700', minWidth: 36,
              }}>
                {compatPercent}%
              </Text>
            </View>
          )}

          {extraInfo ? (
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>{extraInfo}</Text>
          ) : null}
        </View>

        {/* Bouton favori */}
        {onToggleFavori && (
          <Pressable onPress={() => onToggleFavori(profile.id)} style={{ padding: 8 }}>
            {isFavori
              ? <BookmarkCheck size={20} color="#FFD700" />
              : <Bookmark size={20} color="rgba(255,215,0,0.35)" />
            }
          </Pressable>
        )}
      </LinearGradient>
    </Pressable>
  );
}
