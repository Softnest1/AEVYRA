// Hook utilitaire — breakpoints responsifs cross-platform
// Couvre : téléphone, tablette, bureau, grand bureau, Full HD, 4K, cinéma, projecteur, TV, voiture
import { useWindowDimensions } from 'react-native';

/** Breakpoints alignés sur toutes les surfaces d'affichage */
export const BREAKPOINTS = {
  xs:      320,   // très petits téléphones (iPhone SE 1ère gen)
  sm:      480,   // petits téléphones
  md:      768,   // tablettes portrait / petits appareils voiture
  lg:      1024,  // tablettes paysage / petits bureaux / écrans embarqués
  xl:      1440,  // grands écrans bureau / laptops 15"
  xxl:     1920,  // Full HD / TV HD / projecteurs standard
  uhd:     2560,  // QHD / projecteurs haut de gamme / iMac Retina
  tv4k:    3840,  // 4K UHD / TV 4K / écrans cinéma / murs de LED
  cinema:  5120,  // 5K (iMac Pro, écrans cinéma Apple) / projection grand format
} as const;

// ── Breakpoints voiture (Android Auto / CarPlay) ────────────────────────────
// Les écrans embarqués font typiquement 480–800px selon constructeur.
// On détecte via height < 600 ET width > 400 (format paysage contraint).
function isCarDisplay(w: number, h: number): boolean {
  return w >= 400 && h < 600 && w < 1200;
}

export interface ResponsiveValues {
  width: number;
  height: number;
  isXS:              boolean;  // < 480px  (iPhone SE, petits Android)
  isPhone:           boolean;  // < 768px
  isTablet:          boolean;  // 768–1023px
  isDesktop:         boolean;  // >= 1024px
  isLargeDesktop:    boolean;  // >= 1440px
  isFullHD:          boolean;  // >= 1920px (TV HD, projecteurs)
  isQHD:             boolean;  // >= 2560px (projecteurs haut de gamme, iMac Retina)
  is4K:              boolean;  // >= 3840px (TV 4K, écrans cinéma)
  isCinema:          boolean;  // >= 5120px (5K, projection grand format)
  isTV:              boolean;  // alias : tout écran >= 1920px
  isCar:             boolean;  // écran voiture (Android Auto / CarPlay) : paysage contraint
  isLandscapeMobile: boolean;  // téléphone en mode paysage (width > height && isPhone)
  // ── Grille & espacement ────────────────────────────────────────
  columns:        number;   // nombre de colonnes pour les grilles de cartes
  px:             number;   // padding horizontal page
  contentMaxWidth: number;  // largeur max du contenu centré
  gap:            number;   // espace entre éléments
  sectionSpacing: number;   // espace vertical entre sections
  cardRadius:     number;   // border-radius des cartes
  // ── Typographie scale ─────────────────────────────────────────
  headerTop:      number;
  avatarSize:     number;
  titleSize:      number;   // H1 hero
  h2Size:         number;   // titres de section
  h3Size:         number;   // titres de cartes
  bodySize:       number;   // texte courant
  captionSize:    number;   // légendes / sous-titres
  baseFontSize:   number;   // alias bodySize (compat)
  // ── Interaction ───────────────────────────────────────────────
  tapTarget:      number;   // taille min des éléments interactifs
  iconSize:       number;   // taille des icônes
  buttonPadV:     number;   // padding vertical boutons
  buttonPadH:     number;   // padding horizontal boutons
  buttonFontSize: number;   // taille texte boutons
}

export function useResponsive(): ResponsiveValues {
  const { width, height } = useWindowDimensions();

  const isXS           = width < BREAKPOINTS.sm;
  const isPhone        = width < BREAKPOINTS.md;
  const isTablet       = width >= BREAKPOINTS.md  && width < BREAKPOINTS.lg;
  const isDesktop      = width >= BREAKPOINTS.lg;
  const isLargeDesktop = width >= BREAKPOINTS.xl;
  const isFullHD       = width >= BREAKPOINTS.xxl;
  const isQHD          = width >= BREAKPOINTS.uhd;
  const is4K           = width >= BREAKPOINTS.tv4k;
  const isCinema       = width >= BREAKPOINTS.cinema;
  const isTV           = isFullHD;
  const isCar          = isCarDisplay(width, height);
  // Téléphone tenu en mode paysage : width > height ET isPhone
  // (evite le conflit avec isCar qui a des critères similaires)
  const isLandscapeMobile = isPhone && !isCar && width > height;

  // ── Grille ──────────────────────────────────────────────────────────────
  const columns = isCinema ? 10 : is4K ? 8 : isQHD ? 6 : isFullHD ? 5
                : isLargeDesktop ? 4 : isDesktop ? 3 : isTablet ? 2 : 1;

  // ── Padding horizontal ────────────────────────────────────────────────
  // Valeurs raisonnables : laisser du contenu visible même sur petit bureau
  const px = isCinema  ? Math.min(width * 0.08, 120)
           : is4K      ? Math.min(width * 0.07, 100)
           : isQHD     ? Math.min(width * 0.06, 80)
           : isFullHD  ? Math.min(width * 0.05, 64)
           : isDesktop ? Math.min(width * 0.04, 48)
           : isTablet  ? 24
           : isCar     ? 16
           : 16;

  // ── Largeur max contenu — centrage sur grand écran ───────────────────
  // Le contenu ne doit jamais dépasser ces largeurs pour rester lisible
  const contentMaxWidth = isCinema  ? 1400
                        : is4K      ? 1280
                        : isQHD     ? 1100
                        : isFullHD  ? 960
                        : isDesktop ? Math.min(width - px * 2, 860)
                        : width - px * 2;

  // ── Espacement ────────────────────────────────────────────────────────
  const gap = isCinema ? 48 : is4K ? 40 : isQHD ? 36 : isFullHD ? 32
            : isLargeDesktop ? 28 : isDesktop ? 24 : isTablet ? 20
            : isCar ? 10 : 12;

  const sectionSpacing = isCinema ? 120 : is4K ? 100 : isQHD ? 80 : isFullHD ? 64
                       : isLargeDesktop ? 56 : isDesktop ? 48 : isTablet ? 36
                       : isCar ? 16 : 28;

  const cardRadius = isCinema ? 32 : is4K ? 28 : isQHD ? 26 : isFullHD ? 24
                   : isLargeDesktop ? 22 : isDesktop ? 20 : isTablet ? 18
                   : isCar ? 10 : 16;

  // ── Typographie ───────────────────────────────────────────────────────
  const headerTop    = isDesktop ? 24 : isTablet ? 32 : 56;

  const avatarSize   = isCinema ? 220 : is4K ? 180 : isQHD ? 150 : isFullHD ? 130
                     : isLargeDesktop ? 100 : isDesktop ? 88 : isTablet ? 72
                     : isCar ? 44 : 56;

  const titleSize    = isCinema ? 96 : is4K ? 80 : isQHD ? 64 : isFullHD ? 52
                     : isLargeDesktop ? 42 : isDesktop ? 36 : isTablet ? 30
                     : isCar ? 20 : 26;

  const h2Size       = isCinema ? 48 : is4K ? 40 : isQHD ? 34 : isFullHD ? 28
                     : isLargeDesktop ? 24 : isDesktop ? 22 : isTablet ? 20
                     : isCar ? 15 : 17;

  const h3Size       = isCinema ? 32 : is4K ? 28 : isQHD ? 24 : isFullHD ? 22
                     : isLargeDesktop ? 19 : isDesktop ? 17 : isTablet ? 16
                     : isCar ? 13 : 15;

  const bodySize     = isCinema ? 26 : is4K ? 22 : isQHD ? 20 : isFullHD ? 18
                     : isLargeDesktop ? 17 : isDesktop ? 16 : isTablet ? 15
                     : isCar ? 12 : 14;

  const captionSize  = isCinema ? 20 : is4K ? 18 : isQHD ? 16 : isFullHD ? 15
                     : isLargeDesktop ? 14 : isDesktop ? 13 : isTablet ? 13
                     : isCar ? 11 : 12;

  // ── Interaction ───────────────────────────────────────────────────────
  const tapTarget    = isCinema ? 80 : is4K ? 72 : isQHD ? 64 : isTV ? 60
                     : isDesktop ? 48 : isTablet ? 48 : isCar ? 52 : 44;

  const iconSize     = isCinema ? 48 : is4K ? 40 : isQHD ? 36 : isFullHD ? 32
                     : isLargeDesktop ? 28 : isDesktop ? 24 : isTablet ? 22
                     : isCar ? 20 : 20;

  const buttonPadV   = isCinema ? 28 : is4K ? 24 : isQHD ? 20 : isFullHD ? 18
                     : isDesktop ? 14 : isTablet ? 13 : isCar ? 10 : 13;

  const buttonPadH   = isCinema ? 64 : is4K ? 52 : isQHD ? 44 : isFullHD ? 36
                     : isDesktop ? 28 : isTablet ? 24 : isCar ? 16 : 24;

  const buttonFontSize = isCinema ? 28 : is4K ? 24 : isQHD ? 22 : isFullHD ? 20
                       : isDesktop ? 17 : isTablet ? 16 : isCar ? 13 : 16;

  return {
    width, height,
    isXS, isPhone, isTablet, isDesktop, isLargeDesktop,
    isFullHD, isQHD, is4K, isCinema, isTV, isCar, isLandscapeMobile,
    columns, px, contentMaxWidth, gap, sectionSpacing, cardRadius,
    headerTop, avatarSize, titleSize, h2Size, h3Size, bodySize, captionSize,
    baseFontSize: bodySize,
    tapTarget, iconSize, buttonPadV, buttonPadH, buttonFontSize,
  };
}


