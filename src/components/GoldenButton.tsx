// Aevyra – Bouton principal doré avec effet de lueur pulsante
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GoldenButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'gold' | 'bordeaux' | 'violet';
  size?: 'lg' | 'md';
  accessibilityLabel?: string;
}

const GRADIENT_MAP = {
  gold: ['#FFD700', '#B8860B', '#FFD700'] as const,
  bordeaux: ['#722F37', '#4B0082', '#722F37'] as const,
  violet: ['#4B0082', '#722F37', '#4B0082'] as const,
};

export default React.memo(function GoldenButton({ label, onPress, disabled, variant = 'gold', size = 'lg' }: GoldenButtonProps) {
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, [glow]);

  const scale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        className="overflow-hidden rounded-2xl"
        style={{ opacity: disabled ? 0.5 : 1 }}
      >
        <LinearGradient
          colors={GRADIENT_MAP[variant]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{
            paddingVertical: size === 'lg' ? 18 : 13,
            paddingHorizontal: 32,
            alignItems: 'center',
            borderRadius: 16,
          }}
        >
          <Text
            style={{
              color: variant === 'gold' ? '#000000' : '#FFD700',
              fontSize: size === 'lg' ? 17 : 15,
              fontWeight: '900',
              letterSpacing: 0.5,
            }}
          >
            {label}
          </Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});
