// Composant logo Aevyra — SVG vectoriel pur
// Qualité infinie : iPhone SE → écran cinéma 5K, projecteur 4K, TV 8K
// Aucun bitmap, aucun emoji flou — rendu net à toutes résolutions
import React from 'react';
import Svg, { Circle, G, Defs, RadialGradient, Stop } from 'react-native-svg';

interface AevyraLogoProps {
  /** Diamètre du cercle logo — s'adapte automatiquement */
  size?: number;
  /** Couleur principale — or Aevyra par défaut */
  color?: string;
  /** Couleur de fond du cercle */
  bgColor?: string;
  /** Opacité fond */
  bgOpacity?: number;
}

/**
 * Logo Aevyra — Lune croissante + 3 étoiles
 * SVG vectoriel : netteté parfaite à n'importe quelle résolution.
 *
 * Tailles recommandées par breakpoint :
 *   isXS (< 480px)        : 56
 *   isPhone (< 768px)     : 64
 *   isTablet (768-1023px) : 80
 *   isDesktop (1024-1439) : 96
 *   isLargeDesktop (1440) : 112
 *   isFullHD (1920px)     : 128
 *   isQHD (2560px)        : 160
 *   is4K (3840px)         : 200
 *   isCinema (5120px+)    : 240
 */
export default function AevyraLogo({
  size = 80,
  color = '#FFD700',
  bgColor = '#1E0A3C',
  bgOpacity = 0.95,
}: AevyraLogoProps) {
  const r = size / 2;
  // Coordonnées relatives au centre (0,0) → translateG vers (r,r)
  const moonR   = size * 0.28;   // rayon lune principale
  const cutR    = size * 0.22;   // rayon du "creux" du croissant
  const cutOffX = size * 0.10;   // décalage horizontal du creux

  // Étoiles : 3 points lumineux autour de la lune
  const stars = [
    { cx: r + size * 0.22, cy: r - size * 0.30, r: size * 0.035 }, // haut-droite
    { cx: r - size * 0.28, cy: r - size * 0.14, r: size * 0.025 }, // gauche
    { cx: r + size * 0.30, cy: r + size * 0.15, r: size * 0.020 }, // bas-droite
  ];

  // Croissant de lune centré : cercle principal - cercle de coupe
  // Utilise un clip-path SVG via masque : cercle complet puis on soustrait
  const moonCX = r - size * 0.04; // légèrement décalé à gauche = croissant orienté droite
  const moonCY = r;
  const cutCX  = moonCX + cutOffX + moonR * 0.55;
  const cutCY  = moonCY;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <RadialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={bgColor} stopOpacity={bgOpacity} />
          <Stop offset="100%" stopColor={bgColor} stopOpacity={Math.min(bgOpacity + 0.05, 1)} />
        </RadialGradient>
        <RadialGradient id="moonGrad" cx="35%" cy="35%" r="70%">
          <Stop offset="0%" stopColor="#FFF8DC" stopOpacity="1" />
          <Stop offset="60%" stopColor={color} stopOpacity="1" />
          <Stop offset="100%" stopColor="#B8860B" stopOpacity="1" />
        </RadialGradient>
        <RadialGradient id="starGrad" cx="30%" cy="30%" r="70%">
          <Stop offset="0%" stopColor="#FFFFF0" stopOpacity="1" />
          <Stop offset="100%" stopColor={color} stopOpacity="1" />
        </RadialGradient>
      </Defs>

      {/* Fond circulaire avec bordure dorée */}
      <Circle
        cx={r} cy={r} r={r - 1}
        fill="url(#bgGrad)"
        stroke={color}
        strokeWidth={size * 0.025}
        strokeOpacity={0.55}
      />

      {/* Halo lumineux derrière la lune */}
      <Circle
        cx={moonCX} cy={moonCY} r={moonR * 1.15}
        fill={color}
        fillOpacity={0.07}
      />

      {/* Croissant de lune — technique masque SVG :
          disque plein (lune) - disque de coupe = croissant */}
      <G>
        {/* Disque plein doré */}
        <Circle cx={moonCX} cy={moonCY} r={moonR} fill="url(#moonGrad)" />
        {/* Disque de coupe = fond de la scène (efface une partie du disque) */}
        <Circle cx={cutCX} cy={cutCY} r={cutR} fill={bgColor} fillOpacity={1} />
        {/* Deuxième passe : reposer le fond exact pour parfaire le croissant */}
        <Circle cx={cutCX} cy={cutCY} r={cutR * 0.95} fill={bgColor} fillOpacity={bgOpacity} />
      </G>

      {/* Étoiles scintillantes */}
      {stars.map((s, i) => (
        <G key={i}>
          {/* Halo */}
          <Circle cx={s.cx} cy={s.cy} r={s.r * 2.2} fill={color} fillOpacity={0.12} />
          {/* Étoile centrale */}
          <Circle cx={s.cx} cy={s.cy} r={s.r} fill="url(#starGrad)" />
        </G>
      ))}

      {/* Petits points lumineux ambiance cosmique */}
      <Circle cx={r + size * 0.10} cy={r + size * 0.32} r={size * 0.012} fill={color} fillOpacity={0.5} />
      <Circle cx={r - size * 0.18} cy={r + size * 0.28} r={size * 0.009} fill={color} fillOpacity={0.4} />
      <Circle cx={r + size * 0.34} cy={r - size * 0.05} r={size * 0.008} fill={color} fillOpacity={0.35} />
    </Svg>
  );
}
