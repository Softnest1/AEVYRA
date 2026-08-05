// Aevyra – Arrière-plan cosmique magique — étoiles multicolores + poussière dorée
// Web  : CSS GPU pur (keyframes twinkle + shimmer + drift)
// Natif: Animated.loop allégé

import React, { useEffect, useRef } from 'react';
import { Animated, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GRADIENTS, seededRand } from '@/lib/amour-theme';

// Couleurs d'étoiles romantiques — or, rose, bleu-glace, lavande, blanc pur
const STAR_COLORS_WEB = ['#FFD700', '#FFB6C1', '#C8B4FF', '#A8D4FF', '#FFF8DC', '#FF90C8', '#E8D5FF'];
const STAR_COLORS_NATIVE = ['#FFD700', '#FFB6C1', '#C8B4FF', '#A8D4FF', '#FFFFFF'];

// ── CSS injection étoiles + poussière dorée ─────────────────────────────────
// PERF FIX : will-change retiré de chaque élément individuel (60 étoiles + 18 poussières).
//            → Sera mis sur le conteneur CosmicBackground uniquement.
// PERF FIX : box-shadow/drop-shadow retirés des étoiles (paint par frame → chauffe GPU).
//            → L'effet lumineux des grosses étoiles passe par une opacity + scale CSS uniquement.
function injectStarCSS() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('aevyra-stars-v4')) return;
  const style = document.createElement('style');
  style.id = 'aevyra-stars-v4';
  style.textContent = `
    /* Scintillement organique — 3 timings différents, ease-in-out (pas linear) */
    @keyframes twinkleA {
      0%,100% { opacity: 0.08; transform: scale(1); }
      40%     { opacity: 0.9;  transform: scale(1.35); }
      70%     { opacity: 0.5;  transform: scale(1.1); }
    }
    @keyframes twinkleB {
      0%,100% { opacity: 0.15; transform: scale(1); }
      25%     { opacity: 0.65; transform: scale(1.25); }
      60%     { opacity: 0.28; transform: scale(0.9); }
    }
    @keyframes twinkleC {
      0%,100% { opacity: 0.05; transform: scale(0.85); }
      50%     { opacity: 0.95; transform: scale(1.4); }
    }
    /* Lueur pulsante — opacity seule (pas box-shadow qui déclenche paint) */
    @keyframes starGlowSafe {
      0%,100% { opacity: 0.5; transform: scale(1); }
      50%     { opacity: 1.0; transform: scale(1.6); }
    }
    /* Poussière cosmique dorée — flottement doux */
    @keyframes dustFloat {
      0%   { transform: translateY(0px) translateX(0px); opacity: 0; }
      15%  { opacity: 0.55; }
      85%  { opacity: 0.25; }
      100% { transform: translateY(-38px) translateX(7px); opacity: 0; }
    }
    /* Conteneur étoiles — position absolute, pas de contain (bloque rendu Android) */
    .stars-container {
      position: absolute;
      inset: 0;
      pointer-events: none;
      /* NB: will-change et contain retirés — causaient page blanche sur Chrome/Mi Browser Android */
    }
    .star-v4 {
      position: absolute;
      border-radius: 50%;
    }
    .star-v4.tw-a { animation: twinkleA ease-in-out infinite; }
    .star-v4.tw-b { animation: twinkleB ease-in-out infinite; }
    .star-v4.tw-c { animation: twinkleC ease-in-out infinite; }
    .star-v4.glow { animation: starGlowSafe ease-in-out infinite; }
    .dust-v4 {
      position: absolute;
      border-radius: 50%;
      background: radial-gradient(circle, #FFD70099 0%, transparent 70%);
      pointer-events: none;
      animation: dustFloat ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
}

// ── Étoiles Web (60 étoiles, 15 poussières) ─────────────────────────────────
const STARS_WEB = Array.from({ length: 60 }, (_, i) => ({
  x:        seededRand(i * 7) * 100,
  y:        seededRand(i * 11) * 100,
  size:     seededRand(i * 13) < 0.15 ? 3 + seededRand(i * 17) * 2.5 : 1 + seededRand(i * 3) * 2,   // 15% grosses étoiles
  color:    STAR_COLORS_WEB[Math.floor(seededRand(i * 19) * STAR_COLORS_WEB.length)],
  duration: 1800 + seededRand(i * 23) * 4200,
  delay:    seededRand(i * 29) * 5000,
  type:     seededRand(i * 31) < 0.15 ? 'glow' : seededRand(i * 37) < 0.5 ? 'tw-a' : seededRand(i * 41) < 0.5 ? 'tw-b' : 'tw-c',
  isLarge:  seededRand(i * 13) < 0.15,
}));

const DUST_WEB = Array.from({ length: 18 }, (_, i) => ({
  x:        seededRand(i * 43 + 1) * 100,
  y:        seededRand(i * 47 + 2) * 100,
  size:     2 + seededRand(i * 53 + 3) * 4,
  duration: 4000 + seededRand(i * 59 + 4) * 6000,
  delay:    seededRand(i * 61 + 5) * 8000,
}));

// ── Étoiles Natif (35 étoiles, allégé) ──────────────────────────────────────
interface Star {
  xRatio: number;
  yRatio: number;
  size: number;
  color: string;
  opacity: Animated.Value;
  scale: Animated.Value;
  delay: number;
  brightMin: number;
  brightMax: number;
  duration: number;
}

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => ({
    xRatio:    seededRand(i * 7),
    yRatio:    seededRand(i * 11),
    size:      seededRand(i * 13) < 0.12 ? 3 + seededRand(i * 17) * 2 : 1 + seededRand(i * 3) * 1.8,
    color:     STAR_COLORS_NATIVE[Math.floor(seededRand(i * 19) * STAR_COLORS_NATIVE.length)],
    opacity:   new Animated.Value(seededRand(i * 23) * 0.4 + 0.1),
    scale:     new Animated.Value(1),
    delay:     i * 150 + seededRand(i * 29) * 300,
    brightMin: 0.05 + seededRand(i * 31) * 0.2,
    brightMax: 0.5  + seededRand(i * 37) * 0.5,
    duration:  1600 + seededRand(i * 41) * 3000,
  }));
}
const STARS_NATIVE = generateStars(35);

export default React.memo(function CosmicBackground({ children }: { children?: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const animsRef = useRef<Animated.CompositeAnimation[]>([]);
  const isWeb = process.env.EXPO_OS === 'web';

  useEffect(() => { if (isWeb) injectStarCSS(); }, [isWeb]);

  // Natif : scintillement organique (amplitude aléatoire par étoile)
  useEffect(() => {
    if (isWeb) return;
    animsRef.current = STARS_NATIVE.map((star) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(star.delay),
          Animated.parallel([
            Animated.sequence([
              Animated.timing(star.opacity, {
                toValue: star.brightMin,
                duration: star.duration * 0.55,
                useNativeDriver: true,
              }),
              Animated.timing(star.opacity, {
                toValue: star.brightMax,
                duration: star.duration * 0.45,
                useNativeDriver: true,
              }),
            ]),
            // Pulse de taille sur les grosses étoiles seulement
            ...(star.size > 2.5 ? [Animated.sequence([
              Animated.timing(star.scale, { toValue: 1.4, duration: star.duration * 0.5, useNativeDriver: true }),
              Animated.timing(star.scale, { toValue: 1.0, duration: star.duration * 0.5, useNativeDriver: true }),
            ])] : []),
          ]),
        ])
      )
    );
    animsRef.current.forEach((a: any) => a.start());
    return () => animsRef.current.forEach((a: any) => a.stop());
  }, [isWeb]);

  return (
    <View style={{
      flex: 1,
      overflow: 'hidden',
      ...(isWeb ? { minHeight: '100dvh' as unknown as number } : {}),
    }}>
      {/* Fond solide immédiat — évite le flash blanc avant LinearGradient */}
      <View style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: '#0D0D1A' }} />

      {/* Dégradé cosmique violet/indigo */}
      <LinearGradient
        colors={GRADIENTS.violetCosmique}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />

      {isWeb ? (
        // PERF FIX : conteneur unique avec will-change — une seule couche GPU pour les 60+ étoiles
        // PAS de box-shadow / drop-shadow sur les éléments individuels (paint par frame = chauffe)
        <div className="stars-container">
          {STARS_WEB.map((star, i) => (
            <div
              key={i}
              className={`star-v4 ${star.type}`}
              style={{
                left:              `${star.x}%`,
                top:               `${star.y}%`,
                width:             star.size,
                height:            star.size,
                backgroundColor:   star.color,
                animationDuration: `${star.duration}ms`,
                animationDelay:    `${star.delay}ms`,
              }}
            />
          ))}
          {/* Poussière cosmique dorée — opacity uniquement, pas de box-shadow */}
          {DUST_WEB.map((d, i) => (
            <div
              key={`dust-${i}`}
              className="dust-v4"
              style={{
                left:              `${d.x}%`,
                top:               `${d.y}%`,
                width:             d.size,
                height:            d.size,
                opacity:           0,
                animationDuration: `${d.duration}ms`,
                animationDelay:    `${d.delay}ms`,
              }}
            />
          ))}
        </div>
      ) : (
        // Natif : Animated.View multicolore
        STARS_NATIVE.map((star, i) => (
          <Animated.View
            key={i}
            style={{
              position:        'absolute',
              left:            star.xRatio * width,
              top:             star.yRatio * height,
              width:           star.size,
              height:          star.size,
              borderRadius:    star.size / 2,
              backgroundColor: star.color,
              opacity:         star.opacity,
              transform:       [{ scale: star.scale }],
              // Halo sur les grosses étoiles natives
              ...(star.size > 2.5 ? {
                shadowColor:   star.color,
                shadowOffset:  { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius:  3,
              } : {}),
            }}
          />
        ))
      )}

      {children}
    </View>
  );
});
