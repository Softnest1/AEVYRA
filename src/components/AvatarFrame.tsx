/**
 * AvatarFrame — Cadre de photo de profil sélectionnable
 * 6 styles : or · étoile · flamme · cristal · lune · arc-en-ciel
 * Usage affichage  : <AvatarFrame cadreId="flamme" size={96}><Image .../></AvatarFrame>
 * Usage sélecteur  : <CadreSelector value={cadreId} onChange={setCadreId} />
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, Animated } from 'react-native';

// ── Définition des cadres ──────────────────────────────────
export type CadreId = 'or' | 'etoile' | 'flamme' | 'cristal' | 'lune' | 'arc';

export interface CadreDef {
  id: CadreId;
  label: string;
  emoji: string;
  /** Couleurs du dégradé de la bordure (tableau de 2-3 hex) */
  colors: string[];
  /** Épaisseur de la bordure */
  borderWidth: number;
  /** Effet extra : 'sparkles' | 'glow' | none */
  fx?: 'sparkles' | 'glow';
  /** Couleur du halo */
  glowColor?: string;
}

export const CADRES: CadreDef[] = [
  {
    id: 'or',
    label: 'Or',
    emoji: '✨',
    colors: ['#FFD700', '#FFA500', '#FFD700'],
    borderWidth: 3,
    fx: 'glow',
    glowColor: 'rgba(255,215,0,0.35)',
  },
  {
    id: 'etoile',
    label: 'Étoile',
    emoji: '⭐',
    colors: ['#FFFDE7', '#FFF176', '#FFD740'],
    borderWidth: 3,
    fx: 'sparkles',
    glowColor: 'rgba(255,253,231,0.3)',
  },
  {
    id: 'flamme',
    label: 'Flamme',
    emoji: '🔥',
    colors: ['#FF6B35', '#FF0000', '#FF6B35'],
    borderWidth: 3,
    fx: 'glow',
    glowColor: 'rgba(255,107,53,0.4)',
  },
  {
    id: 'cristal',
    label: 'Cristal',
    emoji: '💎',
    colors: ['#87CEEB', '#B0E0E6', '#4FC3F7'],
    borderWidth: 3,
    fx: 'glow',
    glowColor: 'rgba(135,206,235,0.35)',
  },
  {
    id: 'lune',
    label: 'Lune',
    emoji: '🌙',
    colors: ['#9C27B0', '#E040FB', '#7B1FA2'],
    borderWidth: 3,
    fx: 'sparkles',
    glowColor: 'rgba(156,39,176,0.4)',
  },
  {
    id: 'arc',
    label: 'Arc-en-ciel',
    emoji: '🌈',
    colors: ['#FF0080', '#FF6B35', '#FFD700', '#00E676', '#00B0FF', '#AA00FF'],
    borderWidth: 4,
    fx: 'glow',
    glowColor: 'rgba(255,0,128,0.3)',
  },
];

export function getCadre(id?: string | null): CadreDef {
  return CADRES.find(c => c.id === id) ?? CADRES[0];
}

// ── Composant de rendu des petits points décoratifs ────────
function Sparkles({ color, size }: { color: string; size: number }) {
  const positions = [
    { top: -4, left: size * 0.15 },
    { top: size * 0.1, right: -5 },
    { bottom: -4, right: size * 0.2 },
    { bottom: size * 0.1, left: -5 },
  ];
  return (
    <>
      {positions.map((pos, i) => (
        <React.Fragment key={i}>
        <View
          style={[
            { position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: color },
            pos as any,
          ]}
        />
        </React.Fragment>
      ))}
    </>
  );
}

// ── Composant principal AvatarFrame ───────────────────────
interface AvatarFrameProps {
  cadreId?: string | null;
  size: number;
  children?: React.ReactNode;
  /** Afficher les petits emoji décoratifs autour */
  showFx?: boolean;
}

export function AvatarFrame({ cadreId, size, children, showFx = true }: AvatarFrameProps) {
  const cadre = getCadre(cadreId);
  const pulseAnim = useRef(new Animated.Value(0.85)).current;

  // Animation de halo pulsant
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.85, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Couleur principale = premier élément des colors
  const mainColor = cadre.colors[0];
  const halfSize = size / 2;

  // Taille totale : photo + bordure + halo
  const borderTotal = cadre.borderWidth * 2 + 4;
  const totalSize = size + borderTotal;
  const totalRadius = totalSize / 2;

  // Émoji flottant selon le fx
  const FX_EMOJI: Record<string, string[]> = {
    sparkles: ['✨', '⭐', '✦', '✨'],
    glow:     ['', '', '', ''],
  };
  const fxEmoji = cadre.fx ? FX_EMOJI[cadre.fx] : [];

  // Positions des emojis décoratifs (angles)
  const fxPositions = [
    { top: -10, left: totalSize * 0.1 },
    { top: totalSize * 0.05, right: -10 },
    { bottom: -10, right: totalSize * 0.15 },
    { bottom: totalSize * 0.05, left: -10 },
  ];

  return (
    <View style={{ position: 'relative', width: totalSize, height: totalSize }}>
      {/* Halo pulsant */}
      {cadre.glowColor && (
        <Animated.View
          style={{
            position: 'absolute',
            top: -8, left: -8, right: -8, bottom: -8,
            borderRadius: totalRadius + 8,
            backgroundColor: cadre.glowColor,
            opacity: pulseAnim,
          }}
        />
      )}

      {/* Anneau dégradé simulé (multi-couleurs via segments) */}
      {cadre.id === 'arc' ? (
        // Arc-en-ciel : segments colorés
        <View style={{
          position: 'absolute', top: 0, left: 0,
          width: totalSize, height: totalSize,
          borderRadius: totalRadius,
          borderWidth: cadre.borderWidth,
          borderColor: 'transparent',
        }}>
          {/* Segments simulés via 4 demi-cercles */}
          {['#FF0080', '#FFD700', '#00E676', '#00B0FF'].map((col, i) => (
            // @ts-ignore
            <View key={i} style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              borderRadius: totalRadius,
              borderWidth: cadre.borderWidth,
              borderColor: col,
              opacity: 0.6,
              transform: [{ rotate: `${i * 90}deg` }],
              borderTopColor: 'transparent',
              borderRightColor: 'transparent',
            }} />
          ))}
        </View>
      ) : (
        // Cadre standard : bordure pleine couleur principale
        <View style={{
          position: 'absolute', top: 0, left: 0,
          width: totalSize, height: totalSize,
          borderRadius: totalRadius,
          borderWidth: cadre.borderWidth,
          borderColor: mainColor,
        }} />
      )}

      {/* Deuxième anneau intérieur plus foncé */}
      <View style={{
        position: 'absolute',
        top: cadre.borderWidth + 1,
        left: cadre.borderWidth + 1,
        right: cadre.borderWidth + 1,
        bottom: cadre.borderWidth + 1,
        borderRadius: halfSize,
        borderWidth: 2,
        borderColor: cadre.colors[1] ?? mainColor,
        opacity: 0.5,
      }} />

      {/* Sparkles (petits points) */}
      {showFx && cadre.fx === 'sparkles' && (
        <Sparkles color={mainColor} size={totalSize} />
      )}

      {/* Emojis décoratifs flottants */}
      {showFx && fxEmoji.map((em, i) => em ? (
        // @ts-ignore
        <View key={i} style={[{ position: 'absolute' }, fxPositions[i] as any]}>
          <Text style={{ fontSize: 10 }}>{em}</Text>
        </View>
      ) : null)}

      {/* Contenu (photo) centré */}
      <View style={{
        position: 'absolute',
        top: cadre.borderWidth + 2,
        left: cadre.borderWidth + 2,
        width: size,
        height: size,
        borderRadius: halfSize,
        overflow: 'hidden',
      }}>
        {children}
      </View>
    </View>
  );
}

// ── Sélecteur de cadres ────────────────────────────────────
interface CadreSelectorProps {
  value: string;
  onChange: (id: CadreId) => void;
}

export function CadreSelector({ value, onChange }: CadreSelectorProps) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{
        color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600',
        letterSpacing: 0.5, textTransform: 'uppercase',
      }}>
        🖼 Cadre de photo
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingHorizontal: 2, paddingVertical: 8 }}
      >
        {CADRES.map(cadre => {
          const isSelected = value === cadre.id;
          const mainColor = cadre.colors[0];
          return (
            // @ts-ignore
            <Pressable
              key={cadre.id}
              onPress={() => onChange(cadre.id)}
              style={{
                alignItems: 'center', gap: 6,
                paddingHorizontal: 10, paddingVertical: 8,
                borderRadius: 16,
                backgroundColor: isSelected
                  ? mainColor + '25'
                  : 'rgba(255,255,255,0.05)',
                borderWidth: isSelected ? 1.5 : 1,
                borderColor: isSelected ? mainColor : 'rgba(255,255,255,0.1)',
              }}
            >
              {/* Mini aperçu du cadre */}
              <AvatarFrame cadreId={cadre.id} size={44} showFx={false}>
                <View style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: 'rgba(75,0,130,0.6)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 20 }}>{cadre.emoji}</Text>
                </View>
              </AvatarFrame>
              <Text style={{
                color: isSelected ? mainColor : 'rgba(255,255,255,0.6)',
                fontSize: 11, fontWeight: isSelected ? '700' : '400',
              }}>
                {cadre.label}
              </Text>
              {isSelected && (
                <View style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 10, height: 10, borderRadius: 5,
                  backgroundColor: mainColor,
                }} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
