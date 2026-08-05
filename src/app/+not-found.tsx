// Aevyra – Page 404 cosmique
// Expo Router injecte automatiquement ce fichier quand aucune route ne correspond.
// Pas de doublons possibles : +not-found est un nom réservé unique dans expo-router.
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import CosmicBackground from '@/components/CosmicBackground';

// Animation pulsante de l'emoji étoile
function PulsingEmoji() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1.18, duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1,    duration: 900, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1,    duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.7,  duration: 900, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, [scale, opacity]);

  return (
    <Animated.Text
      style={{ fontSize: 72, transform: [{ scale }], opacity, textAlign: 'center' }}
    >
      ✨
    </Animated.Text>
  );
}

// Bouton doré inline (pas d'import GoldenButton pour garder ce fichier autonome)
function NotFoundButton({
  label, onPress, variant = 'primary',
}: { label: string; onPress: () => void; variant?: 'primary' | 'secondary' }) {
  const pressed = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(pressed, { toValue: 0.95, useNativeDriver: true }).start();
  const handlePressOut = () =>
    Animated.spring(pressed, { toValue: 1, useNativeDriver: true }).start();

  const gradient: [string, string, string] =
    variant === 'primary'
      ? ['#FFD700', '#B8860B', '#FFD700']
      : ['#1a0a2e', '#2d1457', '#1a0a2e'];

  return (
    <Animated.View style={{ transform: [{ scale: pressed }], width: '100%' }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 14,
            alignItems: 'center',
            borderWidth: variant === 'secondary' ? 1 : 0,
            borderColor: variant === 'secondary' ? '#FFD70055' : 'transparent',
          }}
        >
          <Text
            style={{
              color: variant === 'primary' ? '#0D0D1A' : '#FFD700',
              fontSize: 15,
              fontWeight: '700',
              letterSpacing: 0.5,
            }}
          >
            {label}
          </Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export default function NotFoundScreen() {
  const insets = useSafeAreaInsets();

  // Animation d'entrée — fondu + glissement du bas
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <CosmicBackground>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 24,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
        }}
        contentInsetAdjustmentBehavior="automatic"
        overScrollMode="never"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            width: '100%',
            maxWidth: 420,
            alignItems: 'center',
            gap: 12,
          }}
        >
          {/* Emoji cosmique animé */}
          <PulsingEmoji />

          {/* Code 404 stylisé */}
          <Text
            style={{
              fontSize: 80,
              fontWeight: '900',
              color: '#FFD700',
              letterSpacing: -2,
              textAlign: 'center',
              // Ombre dorée sur Web via CSS — neutre sur natif
              ...(process.env.EXPO_OS === 'web'
                ? ({ textShadow: '0 0 40px #FFD70088' } as object)
                : {}),
            }}
          >
            404
          </Text>

          {/* Titre */}
          <Text
            style={{
              fontSize: 22,
              fontWeight: '800',
              color: '#FFFFFF',
              textAlign: 'center',
              letterSpacing: 0.3,
              marginTop: 4,
            }}
          >
            Cette page s'est perdue dans les étoiles 🌙
          </Text>

          {/* Sous-titre */}
          <Text
            style={{
              fontSize: 15,
              color: '#C8B4FF',
              textAlign: 'center',
              lineHeight: 22,
              marginTop: 4,
            }}
          >
            L'URL que tu cherches n'existe pas ou a été déplacée.{'\n'}
            Ne t'inquiète pas — ton âme sœur t'attend ailleurs ✨
          </Text>

          {/* Carte info cosmique */}
          <View
            style={{
              width: '100%',
              backgroundColor: '#1a0a2e88',
              borderRadius: 18,
              borderWidth: 1,
              borderColor: '#9B59B633',
              padding: 20,
              marginTop: 12,
              gap: 10,
            }}
          >
            {[
              { emoji: '🏠', label: 'Retourner à l\'accueil',    info: 'Page principale Aevyra' },
              { emoji: '💫', label: 'Trouver mon âme sœur',      info: 'Compatibilité astrologique' },
              { emoji: '📜', label: 'Voir nos pages',            info: 'CGU, Confidentialité, Contact' },
            ].map((item) => (
              <React.Fragment key={item.label}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
              >
                <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                    {item.label}
                  </Text>
                  <Text style={{ color: '#C8B4FF', fontSize: 12, marginTop: 1 }}>
                    {item.info}
                  </Text>
                </View>
              </View>
              </React.Fragment>
            ))}
          </View>

          {/* Boutons d'action */}
          <View style={{ width: '100%', gap: 10, marginTop: 8 }}>
            <NotFoundButton
              label="🏠  Retour à l'accueil"
              onPress={() => router.replace('/')}
              variant="primary"
            />
            <NotFoundButton
              label="💫  Trouver mon âme sœur"
              onPress={() => router.replace('/(auth)/register' as never)}
              variant="secondary"
            />
          </View>

          {/* Liens légaux rapides */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 8,
              marginTop: 16,
            }}
          >
            {[
              { label: 'Accueil',        route: '/' },
              { label: 'S\'inscrire',    route: '/(auth)/register' },
              { label: 'Se connecter',   route: '/(auth)/sign-in' },
              { label: 'Contact',        route: '/(legal)/contact' },
              { label: 'CGU',            route: '/(legal)/cgu' },
            ].map((link) => (
              // @ts-ignore
              <Pressable
                key={link.label}
                onPress={() => router.push(link.route as never)}
                accessibilityRole="link"
                accessibilityLabel={link.label}
                className="active:opacity-60"
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: '#ffffff0d',
                  borderWidth: 1,
                  borderColor: '#ffffff15',
                }}
              >
                <Text style={{ color: '#C8B4FF', fontSize: 12, fontWeight: '500' }}>
                  {link.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Signature */}
          <Text
            style={{
              color: '#ffffff30',
              fontSize: 11,
              textAlign: 'center',
              marginTop: 20,
              letterSpacing: 1,
            }}
          >
            ✨ AEVYRA — L'ÉTERNITÉ COMMENCE ICI ✨
          </Text>
        </Animated.View>
      </ScrollView>
    </CosmicBackground>
  );
}
