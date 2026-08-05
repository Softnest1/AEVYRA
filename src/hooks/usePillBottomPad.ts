// Source unique de vérité pour le padding bas nécessaire à la pill flottante.
//
// Hiérarchie des appareils :
//   isLandscapeMobile    : téléphone en paysage → sidebar fine, pas de pill → padding minimal
//   isXS   (< 480px)     : iPhone SE, petits Android → pill 58px
//   isPhone(< 768px)     : téléphones standard       → pill 68px
//   isTablet / Desktop / TV                          → sidebar, pas de pill
//
// Formule mobile portrait : safeBottom + 8 (marge au-dessus) + pillH + 16 (confort)
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from './useResponsive';

export function usePillBottomPad(): number {
  const insets = useSafeAreaInsets();
  const { isPhone, isXS, isLandscapeMobile } = useResponsive();

  // Sidebar (tablette, desktop, TV, ou téléphone en paysage) : pas de pill
  if (!isPhone || isLandscapeMobile) {
    return insets.bottom + 24;
  }

  // Téléphone portrait : pill flottante
  // isXS → 58px (iPhone SE, Galaxy A03…), sinon 68px
  const pillH = isXS ? 58 : 68;
  const safeBottom = Math.max(insets.bottom, process.env.EXPO_OS === 'web' ? 16 : 12);
  return safeBottom + 8 + pillH + 16;
}
