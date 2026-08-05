// Aevyra – Page de redirection lien de parrainage
// URL : aevyra.uk/join?ref=XXXX
// Redirige vers l'inscription avec le code pré-rempli
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { RelativePathString } from 'expo-router';

export default function JoinPage() {
  const { ref } = useLocalSearchParams<{ ref?: string }>();

  useEffect(() => {
    // Petite pause pour laisser le router s'initialiser
    const timer = setTimeout(() => {
      const path = ref
        ? `/(auth)/register?ref=${encodeURIComponent(ref.toUpperCase())}`
        : '/(auth)/register';
      router.replace(path as RelativePathString);
    }, 100);
    return () => clearTimeout(timer);
  }, [ref]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0D1A', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#FFD700" />
    </View>
  );
}
