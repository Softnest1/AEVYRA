// Aevyra – Paillettes magiques — effet romantique immersif pour visiteurs
// Web  : CSS GPU pur (keyframes uniques par particule : dérive sinusoïdale, rotation, tailles variées)
// Natif: Animated multi-axes (translateX + translateY + scale + opacity)
import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, useWindowDimensions } from 'react-native';
import { seededRand } from '@/lib/amour-theme';

// Palette romantique dorée/rose/violet (pas que des emojis — aussi des paillettes visuelles pures)
const SYMBOLS = ['✨', '💫', '⭐', '🌟', '💕', '🌸', '💎', '✦', '✧', '⬡', '◈'];
const IS_WEB = process.env.EXPO_OS === 'web';
const COUNT  = 22;
// Données web générées une seule fois (stable entre renders)
const WEB_DATA = Array.from({ length: COUNT }, (_, i) => {
  const r = (offset: number) => seededRand(i * 17 + offset);
  return {
    x:          4 + r(0) * 92,          // position X 4%–96%
    symbol:     SYMBOLS[i % SYMBOLS.length],
    size:       12 + r(1) * 18,          // taille 12px–30px
    duration:   7000 + r(2) * 9000,      // durée 7s–16s (très varié)
    delay:      -(r(3) * 14000),         // délai négatif = déjà en cours (pas de flash groupé)
    drift:      (r(4) - 0.5) * 120,      // dérive horizontale -60px → +60px (mouvement sinusoïdal)
    rotate:     (r(5) - 0.5) * 720,      // rotation -360° → +360°
    opacity:    0.55 + r(6) * 0.45,      // opacité 0.55–1.0
    hue:        r(7),                    // 0=or, 0.33=rose, 0.66=violet (filtre CSS)
    scaleStart: 0.4 + r(8) * 0.6,       // scale initial (apparition progressive)
  };
});

// ── CSS injection — keyframe UNIQUE par particule, performance optimisée ──
// PERF FIX : will-change RETIRÉ des éléments individuels (22 couches GPU = surchauffe)
//            → une seule couche GPU sur le conteneur parent suffit.
// PERF FIX : filter drop-shadow/hue-rotate RETIRÉ (paint coûteux sur chaque frame).
//            → on pré-colore les emojis via CSS color uniquement.
function injectCSS() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('aevyra-particles-v4')) return;
  const s = document.createElement('style');
  s.id = 'aevyra-particles-v4';

  // Base commune — pas de contain/will-change (bloquait rendu Android Chrome/Mi Browser)
  let css = `
    .p-av-wrap {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
    }
    .p-av {
      position: absolute;
      pointer-events: none;
      user-select: none;
      line-height: 1;
    }
  `;

  // Keyframe unique par particule (trajectoire sinusoïdale)
  WEB_DATA.forEach((p, i) => {
    const half = p.drift / 2;
    css += `
      @keyframes pf${i} {
        0%   { transform: translateY(0px)   translateX(0px)          rotate(0deg)                scale(${p.scaleStart.toFixed(2)}); opacity: 0; }
        4%   { opacity: ${p.opacity.toFixed(2)}; }
        30%  { transform: translateY(-28vh) translateX(${half.toFixed(1)}px)    rotate(${(p.rotate * 0.3).toFixed(1)}deg) scale(1); }
        60%  { transform: translateY(-62vh) translateX(${p.drift.toFixed(1)}px) rotate(${(p.rotate * 0.7).toFixed(1)}deg) scale(0.88); opacity: ${(p.opacity * 0.75).toFixed(2)}; }
        90%  { opacity: ${(p.opacity * 0.15).toFixed(2)}; }
        100% { transform: translateY(-112vh) translateX(${(half * 0.4).toFixed(1)}px) rotate(${p.rotate.toFixed(1)}deg) scale(0.45); opacity: 0; }
      }
      .p-av-${i} { animation: pf${i} linear infinite; }
    `;
  });

  s.textContent = css;
  document.head.appendChild(s);
}

// ── Données natives (Animated multi-axes) ──────────────────────────────────
// PERF FIX : rotate.interpolate() pré-calculé UNE seule fois ici (pas dans le render)
//            → évite la création d'un nouvel objet interpolation à chaque frame
interface NativeParticle {
  x:           number;
  symbol:      string;
  size:        number;
  translateY:  Animated.Value;
  translateX:  Animated.Value;
  opacity:     Animated.Value;
  scale:       Animated.Value;
  spin:        Animated.AnimatedInterpolation<string>; // pré-calculé, stable
  duration:    number;
  driftX:      number;
  delay:       number;
  rotateVal:   Animated.Value; // valeur source pour l'interpolation
}

const NATIVE_DATA: NativeParticle[] = Array.from({ length: 14 }, (_, i) => {
  const r      = (offset: number) => seededRand(i * 13 + offset);
  const rotVal = new Animated.Value(0);
  const dir    = seededRand(i * 5) > 0.5 ? 360 : -360;
  return {
    x:          0.04 + r(0) * 0.92,
    symbol:     SYMBOLS[i % SYMBOLS.length],
    size:       13 + r(1) * 14,
    translateY: new Animated.Value(0),
    translateX: new Animated.Value(0),
    opacity:    new Animated.Value(0),
    scale:      new Animated.Value(0.4 + r(2) * 0.4),
    // PERF FIX : interpolate() appelé UNE seule fois ici, jamais dans le render
    spin:       rotVal.interpolate({ inputRange: [0, 1], outputRange: [`0deg`, `${dir}deg`] }),
    rotateVal:  rotVal,
    duration:   8000 + r(3) * 8000,
    driftX:     (r(4) - 0.5) * 100,
    delay:      i * 900 + r(5) * 400,
  };
});

export default function RomanticParticles() {
  const { width, height } = useWindowDimensions();
  const refs     = useRef<Animated.CompositeAnimation[]>([]);
  const heightRef = useRef(height);
  useEffect(() => { heightRef.current = height; }, [height]);

  useEffect(() => {
    if (IS_WEB) { injectCSS(); return; }

    // Init : toutes les particules en bas hors écran
    NATIVE_DATA.forEach((p) => {
      p.translateY.setValue(heightRef.current + 30);
      p.translateX.setValue(0);
      p.opacity.setValue(0);
      p.scale.setValue(0.4);
      p.rotateVal.setValue(0);
    });

    refs.current = NATIVE_DATA.map((p) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.parallel([
            // Montée verticale
            Animated.timing(p.translateY, {
              toValue: -50,
              duration: p.duration,
              useNativeDriver: true,
            }),
            // Dérive horizontale sinusoïdale (via timing simple)
            Animated.sequence([
              Animated.timing(p.translateX, { toValue: p.driftX * 0.5,  duration: p.duration * 0.35, useNativeDriver: true }),
              Animated.timing(p.translateX, { toValue: p.driftX,        duration: p.duration * 0.35, useNativeDriver: true }),
              Animated.timing(p.translateX, { toValue: p.driftX * 0.3,  duration: p.duration * 0.30, useNativeDriver: true }),
            ]),
            // Rotation continue
            Animated.timing(p.rotateVal, {
              toValue: 1,
              duration: p.duration,
              useNativeDriver: true,
            }),
            // Opacité : apparition rapide → maintien → fondu
            Animated.sequence([
              Animated.timing(p.opacity, { toValue: 0.85, duration: 500,                 useNativeDriver: true }),
              Animated.timing(p.opacity, { toValue: 0.7,  duration: p.duration - 1200,   useNativeDriver: true }),
              Animated.timing(p.opacity, { toValue: 0,    duration: 700,                 useNativeDriver: true }),
            ]),
            // Scale : grandit en montant puis rétrécit
            Animated.sequence([
              Animated.timing(p.scale, { toValue: 1.1,  duration: p.duration * 0.4, useNativeDriver: true }),
              Animated.timing(p.scale, { toValue: 0.5,  duration: p.duration * 0.6, useNativeDriver: true }),
            ]),
          ]),
          // Reset instantané (0 durée)
          Animated.parallel([
            Animated.timing(p.translateY, { toValue: heightRef.current + 30, duration: 0, useNativeDriver: true }),
            Animated.timing(p.translateX, { toValue: 0,   duration: 0, useNativeDriver: true }),
            Animated.timing(p.opacity,    { toValue: 0,   duration: 0, useNativeDriver: true }),
            Animated.timing(p.scale,      { toValue: 0.4, duration: 0, useNativeDriver: true }),
            Animated.timing(p.rotateVal,  { toValue: 0,   duration: 0, useNativeDriver: true }),
          ]),
        ])
      )
    );
    refs.current.forEach((a: any) => a.start());
    return () => { refs.current.forEach((a: any) => a.stop()); refs.current = []; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Web ────────────────────────────────────────────────────
  if (IS_WEB) {
    return (
      // PERF FIX : conteneur avec will-change:transform → une seule couche GPU pour tous les enfants
      <div className="p-av-wrap">
        {WEB_DATA.map((p, i) => (
          <span
            key={i}
            className={`p-av p-av-${i}`}
            style={{
              left:              `${p.x}%`,
              bottom:            '-2%',
              fontSize:          `${p.size}px`,
              animationDuration: `${p.duration}ms`,
              animationDelay:    `${p.delay}ms`,
              // PERF FIX : pas de filter CSS (drop-shadow/hue-rotate) — trop coûteux sur chaque frame
              // L'effet magique vient des tailles variées + rotations + trajectoires sinusoïdales
            }}
          >
            {p.symbol}
          </span>
        ))}
      </div>
    );
  }

  // ── Natif ──────────────────────────────────────────────────
  return (
    <View
      style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'hidden' }}
      pointerEvents="none"
    >
      {NATIVE_DATA.map((p, i) => (
        // PERF FIX : spin est pré-calculé dans NATIVE_DATA, pas recréé ici
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left:      p.x * width,
            bottom:    0,
            transform: [
              { translateY: p.translateY },
              { translateX: p.translateX },
              { rotate: p.spin },
              { scale: p.scale },
            ],
            opacity: p.opacity,
          }}
        >
          <Text style={{ fontSize: p.size }}>{p.symbol}</Text>
        </Animated.View>
      ))}
    </View>
  );
}
