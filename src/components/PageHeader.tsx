// Aevyra – En-tête unifié pour toutes les pages tabs
// Cohérence visuelle : titre doré, sous-titre, actions droite optionnelles
// Multi-device : safe area top intégrée, hauteur responsive sur toutes surfaces
// Couvre : téléphone, tablette, voiture, bureau, TV, 4K, cinéma, projecteur
import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '@/hooks/useResponsive';

interface HeaderAction {
  emoji?: string;
  icon?: React.ReactNode;
  onPress: () => void;
  testID?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: HeaderAction[];
  titleColor?: string;
  divider?: boolean;
}

export default function PageHeader({
  title,
  subtitle,
  actions = [],
  titleColor = '#FFD700',
  divider = true,
}: PageHeaderProps) { 
  const insets = useSafeAreaInsets();
  const {
    px, titleSize: _titleSize, h2Size: _h2Size, captionSize, bodySize: _bodySize,
    isCinema, is4K, isQHD, isFullHD, isLargeDesktop, isDesktop, isTablet, isCar,
    contentMaxWidth,
   } = useResponsive();

  // Taille titre : utilise la scale titleSize du hook mais plafonnée
  const titleFontSize = isCinema ? 56 : is4K ? 46 : isQHD ? 38 : isFullHD ? 32
    : isLargeDesktop ? 28 : isDesktop ? 24 : isTablet ? 22 : isCar ? 17 : 20;
  const subtitleFontSize = captionSize;
  const btnSize = isCinema ? 72 : is4K ? 60 : isQHD ? 52 : isFullHD ? 48
    : isDesktop ? 44 : isTablet ? 42 : 40;
  const iconFontSize = isCinema ? 28 : is4K ? 24 : isQHD ? 22 : isFullHD ? 20
    : isDesktop ? 18 : 17;

  const paddingTop = insets.top + (Platform.OS === 'web' ? 16 : 12);
  const paddingBottom = isCinema ? 24 : is4K ? 20 : isFullHD ? 16 : 12;

  return (
    <View style={{ paddingHorizontal: px, paddingTop, paddingBottom: paddingBottom + 4, zIndex: 10 }}>
      {/* Contenu centré sur grand écran */}
      <View style={{
        width: '100%',
        maxWidth: contentMaxWidth,
        alignSelf: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
      }}>
        {/* Titre + sous-titre */}
        <View style={{ flex: 1, gap: 3 }}>
          <Text
            style={{
              color: titleColor,
              fontSize: titleFontSize,
              fontWeight: '900',
              letterSpacing: 0.5,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{
                color: 'rgba(255,255,255,0.65)',
                fontSize: subtitleFontSize,
                fontStyle: 'italic',
              }}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Boutons d'action */}
        {actions.length > 0 && (
          <View style={{ flexDirection: 'row', gap: isCinema ? 16 : is4K ? 12 : 8, alignItems: 'center' }}>
            {actions.map((action, i) => (
              <Pressable
                key={i}
                testID={action.testID}
                onPress={action.onPress}
                style={{
                  width: btnSize,
                  height: btnSize,
                  borderRadius: btnSize / 2,
                  backgroundColor: 'rgba(255,215,0,0.08)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,215,0,0.22)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {action.icon ? (
                  action.icon
                ) : (
                  <Text style={{ fontSize: iconFontSize }}>{action.emoji}</Text>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Séparateur bas discret */}
      {divider && (
        <View
          style={{
            marginTop: paddingBottom,
            height: 1,
            maxWidth: contentMaxWidth,
            alignSelf: 'center',
            width: '100%',
            backgroundColor: 'rgba(255,215,0,0.08)',
          }}
        />
      )}
    </View>
  );
}
