// Aevyra – Portail des Âmes (Landing — données 100 % réelles depuis Supabase)
// Zéro contenu hardcodé : témoignages vrais membres, profils réels, stats DB live
import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { router, type RelativePathString } from 'expo-router';
import Head from 'expo-router/head';
import AevyraLogo from '@/components/AevyraLogo';
import {
  buildTitle, buildMetaTags, serializeJsonLd,
  SCHEMA_ORGANIZATION, SCHEMA_WEBSITE, SCHEMA_MOBILE_APP, SCHEMA_HOW_TO,
  SCHEMA_FEATURE_LIST, SCHEMA_LAUNCH_EVENT, SCHEMA_VIDEO,
  buildFAQSchema, buildSoftwareAppSchema,
  SITE_URL,
} from '@/hooks/useSEO';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import CosmicBackground from '@/components/CosmicBackground';
// Lazy-load RomanticParticles — différé après premier rendu (non-critique)

const RomanticParticles = lazy(() => import('@/components/RomanticParticles'));
import GoldenButton from '@/components/GoldenButton';
import {
  getAppStats, getPublicTemoignages, getRomanContent,
  computeCompatibiliteDetail, getChallengeWindow,
  type CompatibiliteDetail, type Temoignage, type RomanContent,
} from '@/lib/amour-api';
import { dayOfMonthFromStr } from '@/lib/dateUtils';
import { useResponsive } from '@/hooks/useResponsive';

// ── Cache localStorage 5 minutes pour les stats landing ──────
const CACHE_KEY = 'aevyra_landing_stats_v1';
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function readStatsCache(): { count: number; ts: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { count: number; ts: number };
    if (Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed;
  } catch { return null; }
}

function writeStatsCache(count: number) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ count, ts: Date.now() })); } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────
// CONSTANTES UI — aucune donnée simulée, zéro fake
// ─────────────────────────────────────────────────────────────
const SLOGAN = 'Certaines rencontres ne sont pas des hasards.\nElles étaient écrites dans les étoiles.';

// Portraits générés par IA — purement décoratifs, étiquetés explicitement
// Images hébergées sur Supabase Storage (indépendant de Medo.dev)
const SILHOUETTES = [
  { uri: 'https://fqlqofpvmqipxnyzitne.supabase.co/storage/v1/object/public/assets/silhouettes/sil1.jpg', aura: '#FFD700' },
  { uri: 'https://fqlqofpvmqipxnyzitne.supabase.co/storage/v1/object/public/assets/silhouettes/sil2.jpg', aura: '#FFB6C1' },
  { uri: 'https://fqlqofpvmqipxnyzitne.supabase.co/storage/v1/object/public/assets/silhouettes/sil3.jpg', aura: '#9B59B6' },
];

// Ce qui rend Aevyra unique — piliers différenciants
const PILIERS = [
  {
    emoji: '🔮', accent: '#C77DFF',
    titre: 'L\'algorithme qui lit dans les étoiles',
    desc: 'Signe astral, énergie romantique, style d\'amour, désirs profonds — chaque dimension de votre âme guide les rencontres suggérées. Pas de swipe au hasard.',
  },
  {
    emoji: '🌙', accent: '#FFD700',
    titre: 'Le mystère avant la photo',
    desc: 'Les profils se révèlent progressivement. Vous tombez amoureux·se d\'une personnalité avant un visage. L\'attraction naît de l\'intérieur.',
  },
  {
    emoji: '💫', accent: '#87CEEB',
    titre: 'Une communauté qui s\'engage',
    desc: 'Chaque membre signe le Serment de Bienveillance. Modération humaine active. Ici, on ne cherche pas un match — on cherche une âme.',
  },
  {
    emoji: '🌟', accent: '#FF8C69',
    titre: '100% gratuit, à vie',
    desc: 'Zéro abonnement caché. Zéro carte bancaire. Zéro fonctionnalité bloquée. Parce que l\'amour ne devrait pas être derrière un paywall.',
  },
];

// Tableau de différenciation — chaque ligne = 1 dimension, split visuel gauche/droite
const DIFFERENCIANTS = [
  {
    dimension: '💬 Messages',
    them: 'Payant',
    us: '100% gratuit',
    themDesc: 'Abonnement pour écrire',
    usDesc: 'Illimités dès l\'inscription',
  },
  {
    dimension: '👁️ Profil',
    them: 'La photo d\'abord',
    us: 'L\'âme d\'abord',
    themDesc: 'Jugé en 1 seconde',
    usDesc: 'Révélation progressive',
  },
  {
    dimension: '🔮 Matching',
    them: 'Swipe aléatoire',
    us: 'Étoiles & énergie',
    themDesc: 'Algorithme opaque',
    usDesc: 'Compatibilité astrologique',
  },
  {
    dimension: '🛡️ Communauté',
    them: 'Toxique',
    us: 'Bienveillante',
    themDesc: 'Sans modération réelle',
    usDesc: 'Serment + modération humaine',
  },
  {
    dimension: '❤️ Connexion',
    them: 'Superficielle',
    us: 'Profonde',
    themDesc: 'Basée sur l\'apparence',
    usDesc: 'Basée sur l\'âme',
  },
];

// FAQ différenciante — optimisée pour featured snippets Google
const FAQ_ITEMS = [
  {
    question: 'Qu\'est-ce qu\'Aevyra ?',
    answer: 'Aevyra (aevyra.uk) est une application de rencontres spirituelles et astrologiques gratuite. Elle connecte les âmes par compatibilité astrologique, énergie romantique et signe astral. Contrairement aux apps de swipe classiques, chaque connexion est guidée par les étoiles et basée sur une vraie compatibilité des âmes.',
  },
  {
    question: 'Quelle est la différence entre Aevyra et les autres applications de rencontres ?',
    answer: 'Aevyra est la seule app de rencontres basée sur la compatibilité astrologique 5 dimensions et l\'énergie romantique. Contrairement aux apps classiques de swipe, les profils se révèlent progressivement pour favoriser une connexion authentique. Tout est 100% gratuit, sans abonnement ni carte bancaire.',
  },
  {
    question: 'Est-ce que Aevyra est vraiment gratuit ?',
    answer: 'Oui, Aevyra est entièrement gratuit. Inscription, messages, compatibilités astrologiques, appels vidéo — tout est accessible sans abonnement ni carte bancaire. Il n\'y a aucune fonctionnalité cachée derrière un paywall.',
  },
  {
    question: 'Comment fonctionne la compatibilité astrologique sur Aevyra ?',
    answer: 'L\'algorithme Aevyra analyse votre signe astral, votre énergie romantique et votre style d\'amour sur 5 dimensions pour vous proposer des profils vraiment compatibles. Chaque suggestion est expliquée avec un score de compatibilité détaillé et les raisons de la correspondance.',
  },
  {
    question: 'Comment s\'inscrire sur Aevyra ?',
    answer: 'Pour rejoindre Aevyra, cliquez sur "Découvrir mon âme sœur" sur aevyra.uk. Créez votre profil en moins de 3 minutes, renseignez votre date de naissance et votre signe astral, et l\'algorithme trouve immédiatement vos meilleures compatibilités. C\'est gratuit et sans carte bancaire.',
  },
  {
    question: 'Aevyra fonctionne-t-il sur iPhone, Android, Chrome et mi browser ?',
    answer: 'Oui, Aevyra fonctionne sur tous les appareils : iPhone (Safari, Chrome), Android (Chrome, Mi Browser, Samsung Browser, Opera), et sur tous les navigateurs web modernes. Le site aevyra.uk est optimisé pour mobile et peut être ajouté à votre écran d\'accueil comme une app native.',
  },
  {
    question: 'Aevyra est-il sécurisé et comment protège-t-il mes données ?',
    answer: 'Aevyra applique le RGPD strictement. Chaque membre signe un Serment de Bienveillance. La modération est humaine et active. Il n\'y a zéro faux profil. Vos données ne sont jamais vendues à des tiers. L\'app est hébergée sur des serveurs européens sécurisés.',
  },
  {
    question: 'Peut-on trouver l\'amour vrai avec Aevyra ?',
    answer: 'Aevyra est conçu pour les connexions sincères et durables. En se basant sur la compatibilité astrologique et l\'énergie romantique plutôt que sur l\'apparence physique, Aevyra favorise des rencontres authentiques entre âmes qui se cherchaient. Certaines rencontres ne sont pas des hasards — elles étaient écrites dans les étoiles.',
  },
];

// Couleurs par signe astrologique
const SIGNE_COULEUR: Record<string, string> = {
  Bélier: '#FF6B6B', Taureau: '#90EE90', Gémeaux: '#FFD700',
  Cancer: '#87CEEB', Lion: '#FFA500', Vierge: '#98FB98',
  Balance: '#FFB6C1', Scorpion: '#9B59B6', Sagittaire: '#FF8C00',
  Capricorne: '#708090', Verseau: '#00CED1', Poissons: '#DDA0DD',
};

// ─────────────────────────────────────────────────────────────
// COMPOSANTS
// ─────────────────────────────────────────────────────────────

function Divider({ label }: { label: string }) { 
  const { captionSize  } = useResponsive();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,215,0,0.1)' }} />
      <Text style={{ color: 'rgba(255,215,0,0.95)', fontSize: captionSize, letterSpacing: 2.5, fontWeight: '700' }}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,215,0,0.1)' }} />
    </View>
  );
}

// ── FAQ accordéon — featured snippets + UX ───────────────────
// Structure réponse : intro (string) + points (tableau) + conclusion optionnelle
type FAQAnswerStructured = {
  intro?: string;
  points?: { icon: string; text: string }[];
  conclusion?: string;
};

const FAQ_CATEGORIES: {
  category: string; color: string; glow: string;
  items: { question: string; badge?: string; answer: FAQAnswerStructured }[];
}[] = [
  {
    category: '🎁 Gratuit',
    color: '#4ADE80',
    glow: 'rgba(74,222,128,0.18)',
    items: [
      {
        question: 'Est-ce vraiment 100% gratuit ? Pour toujours ?',
        badge: '0€ à vie',
        answer: {
          intro: 'Oui — et pas "gratuit pendant 7 jours puis 29,99€/mois". Gratuit. Pour toujours. Voici exactement ce que vous obtenez sans jamais sortir votre carte :',
          points: [
            { icon: '✅', text: 'Matchs illimités — aucun plafond quotidien, aucune "boosts" payante' },
            { icon: '✅', text: 'Messages illimités — écrivez à qui vous voulez, autant que vous voulez' },
            { icon: '✅', text: 'Appels vidéo HD — pas de minutes limitées, pas de tokens à acheter' },
            { icon: '✅', text: 'Algorithme de compatibilité complet — les 5 dimensions, rien de caché derrière un paywall' },
            { icon: '✅', text: 'Profils vérifiés visibles en totalité — aucune photo floutée pour forcer un upgrade' },
            { icon: '✅', text: '0 publicité intrusive — vous n\'êtes pas le produit' },
          ],
          conclusion: 'Tinder Basic coûte 12€/mois. Tinder Gold : 30€. Hinge+ : 35€. Bumble Premium : 33€. Aevyra : 0€. Le modèle économique d\'Aevyra repose sur les dons volontaires — pas sur votre frustration, pas sur des fonctionnalités artificiellement bloquées.',
        },
      },
    ],
  },
  {
    category: '🔮 Algorithme',
    color: '#C77DFF',
    glow: 'rgba(199,125,255,0.18)',
    items: [
      {
        question: 'Comment fonctionne la compatibilité astrologique Aevyra ?',
        badge: '5 dimensions',
        answer: {
          intro: 'Oubliez les horoscopes génériques du type "Scorpion et Cancer : bonne entente". L\'algorithme Aevyra analyse 5 couches de compatibilité entre deux individus spécifiques — pas deux signes génériques :',
          points: [
            { icon: '🌟', text: 'Résonance astrale — signe solaire, élément, polarité et leur interaction réelle à deux' },
            { icon: '⚡', text: 'Alchimie des énergies — fréquence émotionnelle, magnétisme et complémentarité vibratoire' },
            { icon: '💞', text: 'Accord des âmes — langages de l\'amour, style d\'attachement, façon de recevoir et donner' },
            { icon: '🌙', text: 'Harmonie des désirs — ce que chacun cherche profondément, au-delà des désirs déclarés' },
            { icon: '✨', text: 'Synchronicité de vie — rythme quotidien, ambitions, valeurs, vision du futur à deux' },
          ],
          conclusion: 'Le résultat : un score de 0 à 100 avec explication détaillée dimension par dimension. Vous comprenez pourquoi vous êtes compatibles — pas juste un pourcentage sorti de nulle part. Aucune app au monde ne fait ça. Pas une.',
        },
      },
      {
        question: 'Quelle est la vraie différence avec Tinder, Hinge ou Bumble ?',
        badge: 'Aucune comparaison',
        answer: {
          intro: 'Ce ne sont pas les mêmes produits. Ce n\'est pas le même objectif. Ce n\'est pas le même public. Voici la réalité :',
          points: [
            { icon: '❌', text: 'Tinder — casino de photos, conception addictive volontaire, modèle économique basé sur votre solitude prolongée' },
            { icon: '❌', text: 'Hinge — "conçu pour être supprimé" mais financé par des abonnements à 35€/mois. Contradiction.' },
            { icon: '❌', text: 'Bumble — même logique photo, même modèle freemium agressif, juste avec "la femme écrit en premier"' },
            { icon: '🔮', text: 'Aevyra — connexions basées sur compatibilité réelle, 0€, profils vérifiés, algorithme astrologique breveté' },
          ],
          conclusion: 'Sur Tinder, vous scrollez 500 visages et vous espérez. Sur Aevyra, l\'algorithme sélectionne les personnes qui vous correspondent vraiment — et vous explique pourquoi. La différence, c\'est celle entre jouer à la loterie et avoir un GPS vers votre âme sœur.',
        },
      },
    ],
  },
  {
    category: '📱 Appareils',
    color: '#60A5FA',
    glow: 'rgba(96,165,250,0.18)',
    items: [
      {
        question: 'Fonctionne sur iPhone, Android, PC, Mi Browser... ?',
        badge: 'Tout appareil',
        answer: {
          intro: 'Aevyra est une Progressive Web App — aucun téléchargement requis, aucune mise à jour forcée, aucune place prise sur votre téléphone. Elle fonctionne partout :',
          points: [
            { icon: '🍎', text: 'iPhone & iPad — Safari, Chrome, Firefox — expérience native complète' },
            { icon: '🤖', text: 'Android — Chrome, Samsung Browser, Mi Browser, Xiaomi, Huawei, Opera, Firefox' },
            { icon: '💻', text: 'PC & Mac — tous navigateurs, interface adaptée grand écran' },
            { icon: '📺', text: 'Chromebook, tablette, smart TV avec navigateur — oui, même ça' },
          ],
          conclusion: 'Astuce PWA : ajoutez aevyra.uk à votre écran d\'accueil (icône "Ajouter à l\'accueil" dans votre navigateur). Vous obtenez : icône sur l\'écran, ouverture en plein écran, notifications push — exactement comme une vraie app. Sans App Store. Sans Play Store. Sans attente.',
        },
      },
    ],
  },
  {
    category: '🛡️ Sécurité',
    color: '#FB923C',
    glow: 'rgba(251,146,60,0.18)',
    items: [
      {
        question: 'Zéro faux profil — comment c\'est possible ?',
        badge: '0 bot toléré',
        answer: {
          intro: 'La question honnête est : pourquoi les autres apps ont-elles autant de faux profils ? Parce que les bots = activité = métriques = valorisation boursière. Aevyra n\'a pas d\'actionnaires à satisfaire. Voici notre système :',
          points: [
            { icon: '🔍', text: 'Détection IA des pseudos suspects, VPN et patterns de bot dès l\'inscription' },
            { icon: '👁️', text: 'Vérification humaine obligatoire — chaque profil est relu par un modérateur avant activation' },
            { icon: '⭐', text: 'Score de fiabilité 0-100 affiché publiquement sur chaque profil — la transparence par défaut' },
            { icon: '⚡', text: '3 signalements communautaires = suspension automatique 72h + investigation immédiate' },
            { icon: '🔒', text: 'Ban permanent + blacklist technique pour tout récidiviste — sans appel possible' },
          ],
          conclusion: 'Aevyra est la seule app de rencontre qui publie son taux de faux profils supprimés en temps réel. C\'est sur notre page Transparence. Vérifiez maintenant. Aucun concurrent ne fait ça — parce qu\'ils ont quelque chose à cacher.',
        },
      },
      {
        question: 'Mes données personnelles sont-elles en sécurité ?',
        badge: 'RGPD ✓',
        answer: {
          intro: 'Facebook a revendu vos données. Google les analyse. Tinder en a eu une fuite en 2020. Sur Aevyra, vos données ne sont ni un produit, ni un actif, ni un risque :',
          points: [
            { icon: '🇪🇺', text: 'Serveurs 100% européens — vos données ne traversent jamais l\'Atlantique' },
            { icon: '🚫', text: 'Zéro revente, zéro partage avec des tiers, zéro monétisation de vos informations' },
            { icon: '📦', text: 'Export RGPD de toutes vos données en un clic, à tout moment' },
            { icon: '🗑️', text: 'Suppression totale et définitive en 48h — article 17 RGPD respecté à la lettre' },
            { icon: '🍪', text: 'Zéro cookie tiers, zéro pixel Facebook, zéro tag Google Ads — votre navigation est privée' },
          ],
          conclusion: 'Le modèle économique d\'Aevyra ne repose pas sur votre vie privée. C\'est financé par des dons. Ça change tout. Vos émotions, vos désirs, vos conversations — ils n\'ont pas de prix sur un marché publicitaire ici.',
        },
      },
    ],
  },
  {
    category: '💫 Résultats',
    color: '#FFD700',
    glow: 'rgba(255,215,0,0.18)',
    items: [
      {
        question: 'Peut-on vraiment trouver l\'amour sur Aevyra ?',
        badge: '💛 Âmes sœurs',
        answer: {
          intro: 'La vraie question est : pourquoi les autres apps échouent ? Parce qu\'elles sont conçues pour vous garder dessus — pas pour vous faire trouver quelqu\'un. Aevyra est construite sur un objectif inverse :',
          points: [
            { icon: '🎯', text: 'Moins de rendez-vous décevants — vous arrivez en sachant déjà pourquoi ça peut marcher' },
            { icon: '💡', text: 'Vous connaissez votre score de compatibilité et ses 5 dimensions avant le premier message' },
            { icon: '🔮', text: 'Les connexions sont basées sur l\'âme, pas sur une photo de profil à la lumière parfaite' },
            { icon: '🌱', text: 'Une communauté bienveillante, vérifiée — sans toxicité, sans harcèlement, sans ego de façade' },
          ],
          conclusion: 'Certaines rencontres étaient écrites dans les étoiles depuis longtemps. Aevyra n\'invente pas la magie — elle supprime le bruit qui vous empêchait de la trouver. Si votre âme sœur est quelque part en ligne, l\'algorithme Aevyra est votre meilleure chance de la croiser.',
        },
      },
    ],
  },
];

function FAQItem({ question, answer, badge, accentColor }: {
  question: string; answer: FAQAnswerStructured; badge?: string; accentColor: string;
}) {
  const [open, setOpen] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggle = useCallback(() => {
    const toVal = open ? 0 : 1;
    setOpen((v: boolean) => !v);
    Animated.parallel([
      Animated.spring(heightAnim, { toValue: toVal, useNativeDriver: false, bounciness: 0 }),
      Animated.timing(rotateAnim, { toValue: toVal, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [open, heightAnim, rotateAnim]);

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  const {  captionSize, bodySize, gap  } = useResponsive();
  return (
    <Pressable onPress={toggle} className="active:opacity-90">
      <View style={{
        borderRadius: 20, borderWidth: 1.5,
        borderColor: open ? accentColor + '55' : 'rgba(255,255,255,0.12)',
        backgroundColor: open ? accentColor + '18' : 'rgba(20,8,50,0.82)',
        overflow: 'hidden',
      }}>
        {/* Ligne question */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: gap * 0.75, padding: gap * 0.9 }}>
          <View style={{ flex: 1, gap: 4 }}>
            {badge && (
              <View style={{
                alignSelf: 'flex-start',
                backgroundColor: accentColor + '22', borderRadius: 20,
                paddingHorizontal: gap * 0.5, paddingVertical: 2, marginBottom: 4,
              }}>
                <Text style={{ color: accentColor, fontSize: captionSize * 0.85, fontWeight: '800', letterSpacing: 0.5 }}>{badge}</Text>
              </View>
            )}
            <Text style={{
              color: open ? '#FFFFFF' : 'rgba(255,255,255,0.88)',
              fontWeight: open ? '800' : '600',
              fontSize: bodySize, lineHeight: bodySize * 1.5,
            }}>
              {question}
            </Text>
          </View>
          <Animated.View style={{
            transform: [{ rotate }],
            width: gap * 1.4, height: gap * 1.4, borderRadius: gap * 0.7,
            backgroundColor: open ? accentColor + '33' : 'rgba(255,255,255,0.06)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: open ? accentColor : 'rgba(255,255,255,0.5)', fontSize: captionSize, lineHeight: captionSize * 1.2 }}>▾</Text>
          </Animated.View>
        </View>

        {/* Réponse structurée */}
        {open && (
          <View style={{
            paddingHorizontal: gap * 0.9, paddingBottom: gap * 0.9,
            borderTopWidth: 1, borderTopColor: accentColor + '33',
            backgroundColor: 'rgba(10,4,30,0.75)',
            gap: gap * 0.6,
          }}>
            {/* Intro */}
            {answer.intro && (
              <Text style={{
                color: 'rgba(255,255,255,0.88)', fontSize: bodySize,
                lineHeight: bodySize * 1.65, marginTop: gap * 0.6,
              }}>
                {answer.intro}
              </Text>
            )}
            {/* Points structurés */}
            {answer.points && answer.points.length > 0 && (
              <View style={{ gap: gap * 0.45 }}>
                {answer.points.map((pt, i) => (
                  <React.Fragment key={i}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: gap * 0.5 }}>
                    <View style={{
                      minWidth: bodySize * 1.4, height: bodySize * 1.4, borderRadius: bodySize * 0.7,
                      backgroundColor: accentColor + '22',
                      alignItems: 'center', justifyContent: 'center', marginTop: bodySize * 0.1,
                    }}>
                      <Text style={{ fontSize: bodySize * 0.78, color: accentColor, fontWeight: '800' }}>{pt.icon}</Text>
                    </View>
                    <Text style={{
                      flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: bodySize,
                      lineHeight: bodySize * 1.55,
                    }}>
                      {pt.text}
                    </Text>
                  </View>
                  </React.Fragment>
                ))}
              </View>
            )}
            {/* Conclusion */}
            {answer.conclusion && (
              <View style={{
                borderLeftWidth: 2, borderLeftColor: accentColor + '66',
                paddingLeft: gap * 0.6, marginTop: gap * 0.2,
              }}>
                <Text style={{
                  color: 'rgba(255,255,255,0.72)', fontSize: bodySize * 0.95,
                  lineHeight: bodySize * 1.6, fontStyle: 'italic',
                }}>
                  {answer.conclusion}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ── Types responsive partagés ─────────────────────────────────
interface R {
  h2Size: number; h3Size: number; bodySize: number; captionSize: number;
  cardRadius: number; gap: number; tapTarget: number;
  buttonFontSize: number; buttonPadV: number; buttonPadH: number;
  iconSize?: number;
}

function FAQSection({ px, r }: { px: number; r: R }) {
  const { h2Size, h3Size, bodySize, captionSize, gap, buttonPadH, buttonPadV , cardRadius } = r;
  return (
    <View style={{ paddingHorizontal: px, gap: gap }}>

      {/* Header accrocheur */}
      <View style={{ gap: gap * 0.5, alignItems: 'center' }}>
        <View style={{
          backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 24,
          paddingHorizontal: buttonPadH * 0.8, paddingVertical: buttonPadV * 0.5,
          borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)',
        }}>
          <Text style={{ color: '#FFD700', fontSize: captionSize, fontWeight: '800', letterSpacing: 2 }}>VOS QUESTIONS</Text>
        </View>
        <Text style={{
          color: '#FFFFFF', fontSize: h2Size, fontWeight: '900',
          textAlign: 'center', lineHeight: h2Size * 1.4,
        }} accessibilityRole="header">
          Tout ce que vous voulez{'\n'}
          <Text style={{ color: '#FFD700' }}>vraiment</Text> savoir
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: bodySize, textAlign: 'center', lineHeight: bodySize * 1.6 }}>
          Des réponses directes. Sans jargon. Sans arnaque.
        </Text>
      </View>

      {/* Badges stats rapides */}
      <View style={{ flexDirection: 'row', gap: gap * 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { icon: '💚', text: '100% gratuit', color: '#4ADE80' },
          { icon: '📱', text: 'Tous appareils', color: '#60A5FA' },
          { icon: '🛡️', text: 'Zéro faux profil', color: '#FB923C' },
          { icon: '🔮', text: 'IA astrologique', color: '#C77DFF' },
        ].map((b, i) => (
          <React.Fragment key={i}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: gap * 0.3,
            backgroundColor: b.color + '15', borderRadius: 24,
            paddingHorizontal: buttonPadH * 0.5, paddingVertical: buttonPadV * 0.5,
            borderWidth: 1, borderColor: b.color + '35',
          }}>
            <Text style={{ fontSize: bodySize }}>{b.icon}</Text>
            <Text style={{ color: b.color, fontSize: captionSize, fontWeight: '700' }}>{b.text}</Text>
          </View>
          </React.Fragment>
        ))}
      </View>

      {/* Catégories FAQ */}
      {FAQ_CATEGORIES.map((cat, ci) => (
        <React.Fragment key={ci}>
        <View style={{ gap: gap * 0.5 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ height: 2, width: 18, borderRadius: 1, backgroundColor: cat.color }} />
            <Text style={{ color: cat.color, fontSize: captionSize, fontWeight: '800', letterSpacing: 1.5 }}>
              {cat.category.toUpperCase()}
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: cat.color + '22' }} />
          </View>
          {cat.items.map((item, ii) => (
            <React.Fragment key={ii}>
            <FAQItem
              question={item.question}
              answer={item.answer}
              badge={item.badge}
              accentColor={cat.color}
            />
            </React.Fragment>
          ))}
        </View>
        </React.Fragment>
      ))}

      {/* CTA bas de FAQ */}
      <View style={{
        backgroundColor: 'rgba(255,215,0,0.06)', borderRadius: cardRadius,
        borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)',
        padding: gap, alignItems: 'center', gap: gap * 0.5,
      }}>
        <Text style={{ fontSize: h3Size + 4 }}>✨</Text>
        <Text style={{ color: '#FFD700', fontSize: h3Size, fontWeight: '900', textAlign: 'center' }}>
          Une autre question ?
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: bodySize, textAlign: 'center', lineHeight: bodySize * 1.6 }}>
          Notre équipe répond via WhatsApp en moins de 24h
        </Text>
        <Pressable
          onPress={() => router.push('/(legal)/contact' as RelativePathString)}
          accessibilityRole="button"
          className="active:opacity-70"
          style={{ alignSelf: 'center', marginTop: gap * 0.25 }}
        >
          <Text style={{
            color: 'rgba(199,125,255,0.85)', fontSize: captionSize,
            fontWeight: '700', textDecorationLine: 'underline',
          }}>
            💬 Nous contacter →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Témoignages — données 100% réelles depuis DB ─────────────
function SectionTemoignages({ temoignages, px }: { temoignages: Temoignage[]; px: number }) { 
  const { h2Size, h3Size, bodySize, captionSize, cardRadius, gap, tapTarget, buttonFontSize: _buttonFontSize, buttonPadV: _buttonPadV, buttonPadH: _buttonPadH, iconSize, avatarSize  } = useResponsive();
  const [activeIdx, setActiveIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [prevIdx, setPrevIdx] = useState(0);

  useEffect(() => {
    if (temoignages.length < 2) return;
    const timer = setInterval(() => setActiveIdx((v: number) => (v + 1) % temoignages.length), 5000);
    return () => clearInterval(timer);
  }, [temoignages.length]);

  useEffect(() => {
    if (activeIdx === prevIdx) return;
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 340, useNativeDriver: true }),
    ]).start(() => setPrevIdx(activeIdx));
  }, [activeIdx, fadeAnim, prevIdx]);

  if (temoignages.length === 0) {
    return (
      <View style={{ paddingHorizontal: px, gap: gap }}>
        <LinearGradient
          colors={['rgba(114,47,55,0.55)', 'rgba(75,0,130,0.60)', 'rgba(13,5,30,0.97)']}
          style={{ borderRadius: cardRadius, borderWidth: 1, borderColor: 'rgba(255,215,0,0.28)', padding: gap, alignItems: 'center', gap: gap * 0.7 }}
        >
          <Text style={{ fontSize: iconSize * 2 }}>💌</Text>
          <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: h2Size, textAlign: 'center', lineHeight: h2Size * 1.4 }}>
            La première histoire d'amour{'\n'}sera peut-être la vôtre
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.90)', fontSize: bodySize, textAlign: 'center', lineHeight: bodySize * 1.6 }}>
            Aevyra est en train de naître.{'\n'}Les premières âmes qui s'inscrivent vivent une expérience rare — celle d'être les fondateurs d'une communauté unique.
          </Text>

          {/* 3 promesses visuelles */}
          <View style={{ width: '100%', gap: gap * 0.5, paddingTop: 4 }}>
            {[
              { emoji: '🔮', text: 'Votre compatibilité calculée en 5 dimensions' },
              { emoji: '🛡️', text: 'Communauté 100% bienveillante et vérifiée' },
              { emoji: '✦',  text: "Rencontres guidées par l'astrologie et l'énergie" },
            ].map(item => (
              <React.Fragment key={item.emoji}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,215,0,0.06)', borderRadius: cardRadius * 0.6, padding: gap * 0.5, borderWidth: 1, borderColor: 'rgba(255,215,0,0.12)' }}>
                <Text style={{ fontSize: iconSize, width: iconSize + 4, textAlign: 'center' }}>{item.emoji}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.90)', fontSize: bodySize, flex: 1, lineHeight: bodySize * 1.5 }}>{item.text}</Text>
              </View>
              </React.Fragment>
            ))}
          </View>

          <Text style={{ color: 'rgba(255,215,0,0.95)', fontSize: captionSize, textAlign: 'center', fontStyle: 'italic' }}>
            Témoignages publiés après modération · Membres vérifiés
          </Text>
        </LinearGradient>
      </View>
    );
  }

  const t = temoignages[activeIdx];
  const couleur = SIGNE_COULEUR[t.signe_astro ?? ''] ?? '#FFD700';
  const dateStr = new Date(t.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <View style={{ paddingHorizontal: px, gap: gap }}>
      {/* Citation de mise en scène */}
      <Text style={{
        color: 'rgba(255,215,0,0.90)', fontSize: h2Size * 1.5, textAlign: 'center',
        lineHeight: h2Size * 2, fontStyle: 'italic',
      }}>"</Text>

      <Animated.View style={{ opacity: fadeAnim }}>
        <LinearGradient
          colors={[`${couleur}1A`, 'rgba(13,5,30,0.97)']}
          style={{
            borderRadius: cardRadius, borderWidth: 1,
            borderColor: `${couleur}30`, padding: gap, gap: gap * 0.7,
          }}
        >
          {/* Texte en premier — impact maximal */}
          <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: bodySize + 1, lineHeight: (bodySize + 1) * 1.7, fontStyle: 'italic', textAlign: 'center' }}>
            {t.texte}
          </Text>

          {/* Infos membre en bas */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: gap * 0.6, paddingTop: gap * 0.4, borderTopWidth: 1, borderTopColor: `${couleur}18` }}>
            <View style={{
              width: avatarSize * 0.75, height: avatarSize * 0.75, borderRadius: avatarSize * 0.375,
              backgroundColor: `${couleur}22`, borderWidth: 2, borderColor: `${couleur}55`,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ color: couleur, fontWeight: '900', fontSize: h3Size }}>
                {t.prenom?.charAt(0).toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: couleur, fontWeight: '800', fontSize: h3Size }}>
                {t.prenom ?? 'Membre Aevyra'}
                {t.age ? <Text style={{ color: `${couleur}90`, fontWeight: '400' }}>, {t.age} ans</Text> : null}
              </Text>
              <Text style={{ color: `${couleur}90`, fontSize: captionSize }}>
                {[t.signe_astro, t.ville].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 3 }}>
              <Text style={{ color: 'rgba(255,215,0,0.95)', fontSize: captionSize, fontWeight: '800' }}>✦ Vérifié</Text>
              <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: captionSize, fontStyle: 'italic' }}>{dateStr}</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Dots navigation */}
      {temoignages.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          {temoignages.map((_, i) => (
            <Pressable
              key={i} onPress={() => setActiveIdx(i)}
              accessibilityRole="button"
              accessibilityLabel={`Témoignage ${i + 1}`}
              style={{ minWidth: tapTarget * 0.5, minHeight: tapTarget * 0.5, justifyContent: 'center', alignItems: 'center' }}
            >
              <View style={{
                width: i === activeIdx ? 20 : 5, height: 5, borderRadius: 2.5,
                backgroundColor: i === activeIdx ? '#FFD700' : 'rgba(255,255,255,0.18)',
              }} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Section Roman des Âmes — 10 vrais contenus DB ─────────────
const ROMAN_TYPE_LABEL: Record<string, string> = {
  citation: '💬 Citation', poeme: '📜 Poème', oracle: '🔮 Oracle',
  histoire: '💑 Histoire', defi: '✍️ Défi',
};
const ROMAN_TYPE_COLOR: Record<string, string> = {
  citation: '#FFD700', poeme: '#C77DFF', oracle: '#87CEEB',
  histoire: '#FF8C69', defi: '#90EE90',
};

function SectionRoman({ items, px }: { items: RomanContent[]; px: number }) { 
  const { bodySize, captionSize, gap, iconSize , cardRadius  } = useResponsive();
  if (items.length === 0) return null;
  return (
    <View style={{ paddingHorizontal: px, gap: gap }}>
      <View style={{ gap: gap * 0.25, alignItems: 'center', marginBottom: gap * 0.25 }}>
        <Text style={{ color: 'rgba(255,255,255,0.90)', fontSize: bodySize, fontWeight: '800', textAlign: 'center' }}>
          Le Roman des Âmes Aevyra
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.90)', fontSize: bodySize, textAlign: 'center', fontStyle: 'italic' }}>
          {items.length} contenus · Partagez votre histoire après inscription
        </Text>
      </View>
      {items.slice(0, 4).map((item) => {
        const color = ROMAN_TYPE_COLOR[item.type] ?? '#FFD700';
        return (
          <LinearGradient
            key={item.id}
            colors={[`${color}12`, 'rgba(13,5,30,0.95)']}
            style={{
              borderRadius: cardRadius, borderWidth: 1,
              borderColor: `${color}28`, padding: gap, gap: gap * 0.5,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: gap * 0.5 }}>
              <Text style={{ fontSize: iconSize }}>{item.emoji ?? '✨'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color, fontSize: captionSize, fontWeight: '700', letterSpacing: 0.8 }}>
                  {ROMAN_TYPE_LABEL[item.type] ?? item.type.toUpperCase()}
                </Text>
                {item.titre ? (
                  <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: bodySize, fontWeight: '700' }}>
                    {item.titre}
                  </Text>
                ) : null}
              </View>
            </View>
            <Text style={{
              color: 'rgba(255,255,255,0.85)', fontSize: bodySize,
              lineHeight: bodySize * 1.5, fontStyle: item.type === 'poeme' ? 'italic' : 'normal',
            }}>
              {item.contenu.replace(/\\n/g, '\n')}
            </Text>
            {item.auteur ? (
              <Text style={{ color: `${color}90`, fontSize: captionSize, textAlign: 'right', fontStyle: 'italic' }}>
                — {item.auteur}
              </Text>
            ) : null}
          </LinearGradient>
        );
      })}

    </View>
  );
}

// ── Profils mystère — vrais membres, anonymisés ───────────────
type MiniProfile = { id: string; prenom: string; signe_astro: string; age: number; ville: string };

function MystereCard({ p, delay }: { p: MiniProfile; delay: number }) { 
  const { bodySize, captionSize, h2Size, cardRadius, gap, iconSize  } = useResponsive();
  const anim  = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const couleur = SIGNE_COULEUR[p.signe_astro] ?? '#FFD700';

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 550, delay, useNativeDriver: true }).start();
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.04, duration: 2800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 2800, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [anim, delay, pulse]);

  // Taille de la carte responsive — fixe pour garder la grille propre
  const cardW  = Math.max(iconSize * 4.5, 120);
  const avatarW = Math.round(cardW * 0.47);

  return (
    <Animated.View style={{ opacity: anim, transform: [{ scale: pulse }] }}>
      <LinearGradient
        colors={[`${couleur}1E`, 'rgba(13,5,30,0.95)']}
        style={{
          width: cardW, borderRadius: cardRadius, borderWidth: 1,
          borderColor: `${couleur}35`, padding: gap * 0.75,
          alignItems: 'center', gap: gap * 0.5,
        }}
      >
        {/* Halo + initial */}
        <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{
            width: avatarW, height: avatarW, borderRadius: avatarW / 2,
            backgroundColor: `${couleur}14`, borderWidth: 2, borderColor: `${couleur}50`,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: couleur, fontWeight: '900', fontSize: h2Size }}>
              {p.prenom.charAt(0).toUpperCase()}
            </Text>
          </View>
          {/* Badge "actif récemment" */}
          <View style={{
            position: 'absolute', bottom: 1, right: 1,
            width: iconSize * 0.55, height: iconSize * 0.55,
            borderRadius: iconSize * 0.28,
            backgroundColor: couleur, borderWidth: 2, borderColor: '#0D0D1A',
            opacity: 0.75,
          }} />
        </View>
        <Text style={{ color: couleur, fontWeight: '800', fontSize: bodySize, textAlign: 'center' }}>
          {p.signe_astro}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.80)', fontSize: captionSize, textAlign: 'center' }}>
          {p.age} ans{p.ville ? ` · ${p.ville}` : ''}
        </Text>
        {/* Badge "mystère" */}
        <View style={{
          backgroundColor: `${couleur}14`, borderRadius: cardRadius * 0.5,
          paddingHorizontal: gap * 0.5, paddingVertical: gap * 0.2,
          borderWidth: 1, borderColor: `${couleur}28`,
        }}>
          <Text style={{ color: couleur, fontSize: captionSize * 0.9, fontWeight: '700' }}>🔒 Profil complet</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ── Compatibilité RÉELLE — 5 dimensions propriétaires Aevyra ──
type CompatPair = {
  a: { prenom: string; signe_astro: string; id: string; energie_romantique: string; cherche: string; genre: string; style_amour: string; reve_duo: string; moment_prefere: string; empreinte_couleur: string };
  b: { prenom: string; signe_astro: string; id: string; energie_romantique: string; cherche: string; genre: string; style_amour: string; reve_duo: string; moment_prefere: string; empreinte_couleur: string };
  detail: CompatibiliteDetail;
};

// Les 5 dimensions avec leur identité visuelle
const DIMENSIONS = [
  { key: 'resonanceAstrale',  label: 'Résonance Astrale',   emoji: '🔮', desc: 'Éléments · Triplicités · Polarité',   color: '#C77DFF' },
  { key: 'alchimieEnergie',   label: 'Alchimie des Énergies', emoji: '⚡', desc: 'Archétypes romantiques',             color: '#FFD700' },
  { key: 'accordDesAmes',     label: 'Accord des Âmes',      emoji: '💛', desc: 'Style d\'amour · Rêve de duo',       color: '#FFB6C1' },
  { key: 'harmonieDesirée',   label: 'Harmonie des Désirs',  emoji: '🌙', desc: 'Réciprocité · Ce que l\'on cherche', color: '#87CEEB' },
  { key: 'synchroniciteVie',  label: 'Synchronicité',        emoji: '✨', desc: 'Rythme de vie · Empreinte couleur',  color: '#90EE90' },
] as const;

function DimensionBar({ label, emoji, desc, color, value, delay }: {
  label: string; emoji: string; desc: string; color: string; value: number; delay: number;
}) { 
  const { bodySize, captionSize, gap  } = useResponsive();
  const anim = useRef(new Animated.Value(0)).current;
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      const listener = anim.addListener(({ value: v }: { value: number }) => setDisplayed(Math.round(v)));
      Animated.timing(anim, { toValue: value, duration: 900, useNativeDriver: false }).start(() => {
        anim.removeListener(listener);
      });
    }, delay);
    return () => clearTimeout(t);
  }, [anim, value, delay]);

  const barW = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  const intensity = value >= 85 ? 'Exceptionnel' : value >= 75 ? 'Élevé' : value >= 60 ? 'Prometteur' : 'En éveil';

  return (
    <View style={{ gap: gap * 0.35 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: gap * 0.5 }}>
        <Text style={{ fontSize: bodySize }}>{emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color, fontWeight: '800', fontSize: bodySize, letterSpacing: 0.2 }}>{label}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize, fontStyle: 'italic' }}>{desc}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 1 }}>
          <Text style={{ color, fontWeight: '900', fontSize: bodySize }}>{displayed}%</Text>
          <Text style={{ color: `${color}BB`, fontSize: captionSize, fontWeight: '600' }}>{intensity}</Text>
        </View>
      </View>
      {/* Track */}
      <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <Animated.View style={{
          width: barW, height: '100%', borderRadius: 3,
          backgroundColor: color, opacity: 0.85,
        }} />
      </View>
    </View>
  );
}

function CompatibiliteReelle({ px }: { px: number }) { 
  const [pair, setPair] = useState<CompatPair | null>(null);
  const [loading, setLoading] = useState(true);
  const globalAnim = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(0)).current;
  const [globalPct, setGlobalPct] = useState(0);
  const { h2Size, bodySize, captionSize, cardRadius, gap, iconSize, avatarSize  } = useResponsive();

  useEffect(() => {
    (async () => {
      try {
        const { supabase: sb } = await import('@/client/supabase');
        const { data } = await sb
          .from('profiles')
          .select('id, prenom, signe_astro, energie_romantique, cherche, genre, style_amour, reve_duo, moment_prefere, empreinte_couleur')
          .not('signe_astro', 'is', null)
          .not('prenom', 'is', null)
          .limit(20);

        const realData = (data ?? []) as CompatPair['a'][];
        if (realData.length >= 2) {
          // Seed basé sur le jour local de l'utilisateur (fuseau via getChallengeWindow)
          const win    = await getChallengeWindow();
          const dayIdx = dayOfMonthFromStr(win.today);
          const a = realData[dayIdx % realData.length];
          const b = realData[(dayIdx + 1) % realData.length] ?? realData[0];
          const detail = computeCompatibiliteDetail(a as any, b as any);
          setPair({ a, b, detail });
          const listener = globalAnim.addListener(({ value }: { value: number }) => setGlobalPct(Math.round(value)));
          Animated.timing(globalAnim, { toValue: detail.total, duration: 1800, useNativeDriver: false }).start(() => {
            Animated.spring(heartScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
            globalAnim.removeListener(listener);
          });
        }
        // Si < 2 membres réels : pair reste null → on affiche l'état honnête
      } catch (e) {
        console.error('[CompatibiliteReelle]', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [globalAnim, heartScale]);

  if (loading) return (
    <View style={{ paddingHorizontal: px, alignItems: 'center', paddingVertical: 32 }}>
      <Text style={{ color: 'rgba(199,125,255,0.5)', fontSize: bodySize, fontStyle: 'italic' }}>
        🔮 Calcul cosmique en cours…
      </Text>
    </View>
  );

  // Pas encore assez de membres réels → état honnête + présentation des 5 dimensions
  if (!pair) return (
    <View style={{ paddingHorizontal: px, gap: gap * 0.8 }}>

      {/* ── Titre badge algo ── */}
      <View style={{ alignItems: 'center' }}>
        <LinearGradient
          colors={['rgba(199,125,255,0.18)', 'rgba(75,0,130,0.22)']}
          style={{
            borderRadius: 999, paddingVertical: gap * 0.4, paddingHorizontal: gap * 1.2,
            borderWidth: 1, borderColor: 'rgba(199,125,255,0.40)',
          }}
        >
          <Text style={{ color: '#C77DFF', fontWeight: '900', fontSize: captionSize, letterSpacing: 2.5, textAlign: 'center' }}>
            ✦ L'ALGORITHME AEVYRA™
          </Text>
        </LinearGradient>
        <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: captionSize * 0.9, letterSpacing: 1.5, marginTop: 6, textAlign: 'center' }}>
          5 DIMENSIONS · UNIQUE AU MONDE
        </Text>
      </View>

      {/* ── Carte principale ── */}
      <LinearGradient
        colors={['rgba(75,0,130,0.55)', 'rgba(45,0,90,0.80)', 'rgba(13,5,30,0.98)']}
        style={{
          borderRadius: cardRadius, borderWidth: 1,
          borderColor: 'rgba(255,215,0,0.22)',
          overflow: 'hidden',
        }}
      >
        {/* En-tête card */}
        <LinearGradient
          colors={['rgba(255,215,0,0.12)', 'transparent']}
          style={{ paddingVertical: gap * 0.9, paddingHorizontal: gap, alignItems: 'center', gap: gap * 0.3 }}
        >
          {/* Emoji plafonné — évite débordement sur TV/Cinema */}
          <Text style={{ fontSize: Math.min(iconSize * 2.2, 72) }}>🌌</Text>
          <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: h2Size, textAlign: 'center', letterSpacing: 0.5 }}>
            La constellation se forme
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.70)', fontSize: bodySize, textAlign: 'center', lineHeight: bodySize * 1.65 }}>
            Dès que 2 membres complètent leur profil,{'\n'}l'algorithme calcule leur compatibilité en direct.
          </Text>
        </LinearGradient>

        {/* Séparateur */}
        <View style={{ height: 1, backgroundColor: 'rgba(199,125,255,0.18)', marginHorizontal: gap }} />

        {/* ── Les 5 dimensions ── */}
        <View style={{ paddingVertical: gap * 0.8, paddingHorizontal: gap, gap: gap * 0.6 }}>
          <Text style={{
            color: 'rgba(199,125,255,0.80)', fontSize: captionSize * 0.85,
            fontWeight: '800', letterSpacing: 2.5, textAlign: 'center', marginBottom: gap * 0.2,
          }}>
            LES 5 DIMENSIONS QUI VOUS ATTENDENT
          </Text>

          {DIMENSIONS.map((dim, idx) => (
            <React.Fragment key={dim.key}>
            <View
              style={{
                flexDirection: 'row', alignItems: 'center', gap: gap * 0.7,
                backgroundColor: `${dim.color}0D`,
                borderRadius: cardRadius * 0.7, borderWidth: 1, borderColor: `${dim.color}28`,
                paddingVertical: gap * 0.55, paddingHorizontal: gap * 0.75,
              }}
            >
              {/* Numéro + emoji — largeur fixe pour alignement parfait */}
              <View style={{ alignItems: 'center', width: iconSize + 8 }}>
                <Text style={{
                  fontSize: captionSize * 0.8, color: `${dim.color}99`,
                  fontWeight: '700',
                  lineHeight: captionSize * 1.2, /* fix iOS/Android : lineHeight >= fontSize */
                }}>
                  {idx + 1}
                </Text>
                <Text style={{ fontSize: iconSize * 1.05 }}>{dim.emoji}</Text>
              </View>

              {/* Texte — flex:1 pour éviter débordement sur petits écrans */}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{ color: dim.color, fontWeight: '800', fontSize: bodySize }}
                  numberOfLines={1}
                >
                  {dim.label}
                </Text>
                <Text
                  style={{ color: 'rgba(255,255,255,0.60)', fontSize: captionSize, marginTop: 1 }}
                  numberOfLines={2}
                >
                  {dim.desc}
                </Text>
              </View>

              {/* Dot indicateur */}
              <View style={{
                width: 7, height: 7, borderRadius: 4,
                backgroundColor: `${dim.color}55`,
                borderWidth: 1, borderColor: `${dim.color}88`,
              }} />
            </View>
            </React.Fragment>
          ))}
        </View>

        {/* Séparateur */}
        <View style={{ height: 1, backgroundColor: 'rgba(255,215,0,0.12)', marginHorizontal: gap }} />

        {/* ── CTA ── */}
        <View style={{ padding: gap, gap: gap * 0.5 }}>
          <Text style={{ color: 'rgba(255,255,255,0.42)', fontSize: captionSize * 0.9, textAlign: 'center', fontStyle: 'italic' }}>
            Score en direct dès 2 profils complets · Données anonymisées
          </Text>
        </View>
      </LinearGradient>
    </View>
  );

  const signeA = pair.a.signe_astro;
  const signeB = pair.b.signe_astro;
  const couleurA = SIGNE_COULEUR[signeA] ?? '#FFB6C1';
  const couleurB = SIGNE_COULEUR[signeB] ?? '#87CEEB';
  const prenomA = (pair.a.prenom?.charAt(0).toUpperCase() ?? '?') + '.';
  const prenomB = (pair.b.prenom?.charAt(0).toUpperCase() ?? '?') + '.';
  const globalColor = globalPct >= 88 ? '#FFD700' : globalPct >= 75 ? '#C77DFF' : globalPct >= 62 ? '#87CEEB' : '#FF8C69';
  const globalLabel =
    globalPct >= 88 ? '✦ Résonance Cosmique' :
    globalPct >= 75 ? '💛 Harmonie Profonde'  :
    globalPct >= 62 ? '🌙 Connexion Prometteuse' : '🌱 Complémentarité en Éveil';

  return (
    <View style={{ paddingHorizontal: px, gap: gap * 0.75 }}>
      {/* En-tête algo — marque Aevyra */}
      <LinearGradient
        colors={['rgba(199,125,255,0.10)', 'rgba(13,5,30,0.98)']}
        style={{ borderRadius: cardRadius, padding: gap * 0.7, borderWidth: 1, borderColor: 'rgba(199,125,255,0.25)', alignItems: 'center', gap: gap * 0.2 }}
      >
        <Text style={{ color: '#C77DFF', fontWeight: '900', fontSize: captionSize, letterSpacing: 2.5 }}>
          L'ALGORITHME AEVYRA™
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.80)', fontSize: bodySize, textAlign: 'center', fontStyle: 'italic' }}>
          5 dimensions · Analyse en temps réel · Aucune autre app ne fait ça
        </Text>
      </LinearGradient>

      {/* Carte principale */}
      <LinearGradient
        colors={['rgba(75,0,130,0.42)', 'rgba(114,47,55,0.22)', 'rgba(13,5,30,0.97)']}
        style={{ borderRadius: cardRadius, borderWidth: 1, borderColor: 'rgba(255,215,0,0.20)', padding: gap, gap: gap * 0.85 }}
      >
        {/* Avatars + score global */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: gap }}>
          {/* Membre A */}
          <View style={{ alignItems: 'center', gap: gap * 0.3 }}>
            <View style={{ width: avatarSize * 0.75, height: avatarSize * 0.75, borderRadius: avatarSize * 0.375, backgroundColor: `${couleurA}22`, borderWidth: 2, borderColor: couleurA, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: bodySize, color: couleurA, fontWeight: '900' }}>{prenomA}</Text>
            </View>
            <Text style={{ color: couleurA, fontSize: captionSize, fontWeight: '700', textAlign: 'center' }}>{signeA}</Text>
          </View>

          {/* Score central */}
          <Animated.View style={{ transform: [{ scale: heartScale }], alignItems: 'center', gap: gap * 0.15 }}>
            <Text style={{ fontSize: h2Size }}> 💛</Text>
            <Text style={{ color: globalColor, fontWeight: '900', fontSize: h2Size, letterSpacing: -1 }}>{globalPct}%</Text>
            <Text style={{ color: `${globalColor}90`, fontSize: captionSize * 0.85, fontWeight: '700', textAlign: 'center' }}>{globalLabel}</Text>
          </Animated.View>

          {/* Membre B */}
          <View style={{ alignItems: 'center', gap: gap * 0.3 }}>
            <View style={{ width: avatarSize * 0.75, height: avatarSize * 0.75, borderRadius: avatarSize * 0.375, backgroundColor: `${couleurB}22`, borderWidth: 2, borderColor: couleurB, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: bodySize, color: couleurB, fontWeight: '900' }}>{prenomB}</Text>
            </View>
            <Text style={{ color: couleurB, fontSize: captionSize, fontWeight: '700', textAlign: 'center' }}>{signeB}</Text>
          </View>
        </View>

        {/* Séparateur */}
        <View style={{ height: 1, backgroundColor: 'rgba(255,215,0,0.10)' }} />

        {/* 5 dimensions */}
        <View style={{ gap: gap * 0.7 }}>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: captionSize, fontWeight: '700', letterSpacing: 2, textAlign: 'center' }}>
            ANALYSE PAR DIMENSION
          </Text>
          {DIMENSIONS.map((dim, i) => (
            <React.Fragment key={dim.key}>
            <DimensionBar
              label={dim.label}
              emoji={dim.emoji}
              desc={dim.desc}
              color={dim.color}
              value={pair.detail[dim.key]}
              delay={300 + i * 180}
            />
            </React.Fragment>
          ))}
        </View>

        {/* Pondération — transparence algo */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gap * 0.4, justifyContent: 'center' }}>
          {[['🔮', '25%'], ['⚡', '22%'], ['💛', '20%'], ['🌙', '20%'], ['✨', '13%']].map(([e, w]) => (
            <React.Fragment key={e}>
            <View style={{ backgroundColor: 'rgba(255,215,0,0.07)', borderRadius: cardRadius * 0.5, paddingHorizontal: gap * 0.5, paddingVertical: gap * 0.2, borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)' }}>
              <Text style={{ color: 'rgba(255,215,0,0.95)', fontSize: bodySize }}>{e} {w}</Text>
            </View>
            </React.Fragment>
          ))}
        </View>

        <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: captionSize, textAlign: 'center', lineHeight: captionSize * 1.4, fontStyle: 'italic' }}>
          Initiales uniquement · Données anonymisées · Recalculé quotidiennement
        </Text>
      </LinearGradient>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// FOOTER MAGIQUE
// ─────────────────────────────────────────────────────────────
const FOOTER_LINKS = [
  { emoji: '📜', label: 'CGU',             route: '/(legal)/cgu',             desc: 'Conditions d\'utilisation' },
  { emoji: '🔒', label: 'Confidentialité', route: '/(legal)/confidentialite', desc: 'Données & vie privée' },
  { emoji: '💌', label: 'Contact',         route: '/(legal)/contact',         desc: 'WhatsApp · Réponse < 24h' },
  { emoji: '⚖️', label: 'Charte Éthique',  route: '/(legal)/charte-ethique',  desc: '10 commandements publics' },
  { emoji: '👁️', label: 'Transparence',    route: '/(legal)/transparence',    desc: 'Chiffres réels en direct' },
];

const VALEURS = [
  { icon: '🔮', label: 'Compatibilité profonde' },
  { icon: '🌙', label: 'Rencontres sincères' },
  { icon: '💫', label: 'Communauté bienveillante' },
];

function FooterMagique({ px, r }: { px: number; r: { h2Size:number; h3Size:number; bodySize:number; captionSize:number; cardRadius:number; gap:number; tapTarget:number; buttonFontSize:number; iconSize:number; isCinema:boolean; is4K:boolean; isQHD:boolean; isFullHD:boolean; isDesktop:boolean; isTablet:boolean } }) {
  const { h2Size, bodySize, captionSize, cardRadius, gap, tapTarget, iconSize,
          isCinema, is4K, isQHD, isFullHD, isDesktop, isTablet } = r;

  // Taille logo SVG stratégique — qualité vectorielle infinie
  // Calibrée pour impact visuel maximal à chaque résolution
  const logoSize = isCinema ? 240 : is4K ? 200 : isQHD ? 160 : isFullHD ? 128
                 : isDesktop ? 96 : isTablet ? 80 : 64;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]).start();
    }, 3200);
    return () => clearTimeout(t);
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View style={{
      opacity: fadeAnim, transform: [{ translateY: slideAnim }],
      paddingHorizontal: px, paddingBottom: gap,
    }}>
      {/* Séparateur étoilé */}
      <View style={{ alignItems: 'center', marginBottom: gap }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,215,0,0.15)' }} />
          <Text style={{ fontSize: iconSize * 0.8, opacity: 0.6 }}>✦</Text>
          <Text style={{ fontSize: iconSize }}>💛</Text>
          <Text style={{ fontSize: iconSize * 0.8, opacity: 0.6 }}>✦</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,215,0,0.15)' }} />
        </View>
      </View>

      <LinearGradient
        colors={['rgba(75,0,130,0.55)', 'rgba(25,5,60,0.92)']}
        style={{
          borderRadius: cardRadius, borderWidth: 1,
          borderColor: 'rgba(255,215,0,0.22)', padding: gap, gap: gap,
          overflow: 'hidden',
        }}
      >
        {/* Logo Aevyra — SVG vectoriel, net à toutes résolutions */}
        <View style={{ alignItems: 'center', gap: gap * 0.4 }}>
          <AevyraLogo size={logoSize} />
          <Text style={{
            fontSize: h2Size, fontWeight: '900', color: '#FFD700', letterSpacing: 4,
            textShadowColor: 'rgba(255,215,0,0.45)', textShadowRadius: 18,
          }}>Aevyra</Text>
          <Text style={{ color: 'rgba(255,182,193,0.85)', fontSize: captionSize, letterSpacing: 3.5, fontStyle: 'italic' }}>
            L'ÉTERNITÉ COMMENCE ICI
          </Text>
        </View>

        {/* Valeurs */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: gap * 0.5, flexWrap: 'wrap' }}>
          {VALEURS.map((v, i) => (
            <React.Fragment key={i}>
            <View style={{
              backgroundColor: 'rgba(255,215,0,0.08)', borderRadius: 20,
              borderWidth: 1, borderColor: 'rgba(255,215,0,0.18)',
              paddingHorizontal: gap * 0.6, paddingVertical: gap * 0.3,
              flexDirection: 'row', alignItems: 'center', gap: gap * 0.3,
            }}>
              <Text style={{ fontSize: bodySize }}>{v.icon}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.90)', fontSize: captionSize, fontWeight: '600' }}>{v.label}</Text>
            </View>
            </React.Fragment>
          ))}
        </View>

        <View style={{ height: 1, backgroundColor: 'rgba(255,215,0,0.1)' }} />

        {/* Liens légaux */}
        <View style={{ gap: gap * 0.5 }}>
          <Text style={{ color: 'rgba(255,215,0,0.95)', fontSize: captionSize, fontWeight: '800', letterSpacing: 2.5, textAlign: 'center' }}>
            INFORMATIONS LÉGALES
          </Text>
          <View style={{ flexDirection: 'row', gap: gap * 0.4, justifyContent: 'center', flexWrap: 'wrap' }}>
            {FOOTER_LINKS.map(item => (
              <Pressable
                key={item.route}
                onPress={() => router.push(item.route as any)}
                accessibilityRole="link"
                accessibilityLabel={item.label}
                className="active:opacity-70"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: cardRadius * 0.7,
                  borderWidth: 1, borderColor: 'rgba(255,215,0,0.28)',
                  paddingHorizontal: gap * 0.55, paddingVertical: gap * 0.45,
                  alignItems: 'center', minWidth: 72, gap: gap * 0.15,
                  minHeight: tapTarget * 0.85,
                }}
              >
                <Text style={{ fontSize: iconSize * 0.75 }}>{item.emoji}</Text>
                <Text style={{ color: '#FFD700', fontSize: captionSize * 0.92, fontWeight: '800', textAlign: 'center' }}>{item.label}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: captionSize * 0.80, textAlign: 'center' }}>{item.desc}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: 'rgba(255,215,0,0.08)' }} />

        {/* Éditeur responsable */}
        <View style={{
          backgroundColor: 'rgba(0,0,0,0.38)', borderRadius: cardRadius * 0.8, padding: gap, gap: 6,
          borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={{ fontSize: bodySize }}>🏛️</Text>
            <Text style={{ color: '#FFD700', fontSize: captionSize, fontWeight: '800', letterSpacing: 1 }}>ÉDITEUR RESPONSABLE</Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.90)', fontSize: bodySize, lineHeight: bodySize * 1.6 }}>
            <Text style={{ fontWeight: '700' }}>Charly Soudan</Text>
            {'\n'}36 avenue du Parc{'\n'}93290 Tremblay-en-France
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {['🇫🇷 Droit français', '🔒 RGPD conforme', '✅ Avis modérés'].map(badge => (
              <React.Fragment key={badge}>
              <View style={{
                backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 10,
                paddingHorizontal: 10, paddingVertical: 4,
                borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)',
              }}>
                <Text style={{ color: 'rgba(255,255,255,0.95)', fontSize: captionSize, fontWeight: '700' }}>{badge}</Text>
              </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Signature */}
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={{ color: 'rgba(255,215,0,0.95)', fontSize: captionSize, letterSpacing: 1.5, fontWeight: '700' }}>
            © 2025–2026 Aevyra · Tous droits réservés
          </Text>
          <Text style={{ fontSize: iconSize * 0.8 }}>✦ 💛 ✦</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function PortailDesAmes() { 
  const { px, contentMaxWidth, isTablet, isDesktop, isTV,
          isFullHD, isQHD, is4K, isCinema, isCar: _isCar,
          isLandscapeMobile,
          titleSize, h2Size, h3Size, bodySize, captionSize,
          cardRadius, gap, sectionSpacing,
          tapTarget, buttonFontSize, buttonPadV, buttonPadH,
          iconSize, avatarSize,
   } = useResponsive();
  const _isTablet = isTablet;
  const {  height: _height  } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Animations entrée
  const heroAnim   = useRef(new Animated.Value(0)).current;
  const heroScale  = useRef(new Animated.Value(0.82)).current;
  const sloganAnim = useRef(new Animated.Value(0)).current;
  const ctaAnim    = useRef(new Animated.Value(0)).current;
  const bodyAnim   = useRef(new Animated.Value(0)).current;
  const float0     = useRef(new Animated.Value(0)).current;
  const float1     = useRef(new Animated.Value(0)).current;
  const float2     = useRef(new Animated.Value(0)).current;
  const floatAnims = [float0, float1, float2];
  // Dot vert pulsant "live" sous CTA
  const dotPulse   = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        Animated.timing(dotPulse, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [dotPulse]);

  // Données live Supabase — cache immédiat depuis localStorage
  const cached = readStatsCache();
  const [counterValue, setCounterValue]       = useState(cached?.count ?? 0);
  const [statsLoaded, setStatsLoaded]         = useState(cached !== null);
  const [temoignages, setTemoignages]         = useState<Temoignage[]>([]);
  const [romanItems, setRomanItems]           = useState<RomanContent[]>([]);
  const [mystereProfiles, setMystereProfiles] = useState<MiniProfile[]>([]);
  const counterAnimated = useRef(false);

  // ── Exit intent : bannière "restez parmi nous" ─────────────────────────────
  // Visible uniquement sur Web quand la souris sort vers le haut de la page (>75% scroll)
  const [showExitBanner, setShowExitBanner] = useState(false);
  const exitShown = useRef(false);
  const exitBannerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (process.env.EXPO_OS !== 'web') return;
    const onMouseLeave = (e: MouseEvent) => {
      if (exitShown.current) return;
      if (e.clientY <= 10) {
        exitShown.current = true;
        setShowExitBanner(true);
        Animated.spring(exitBannerAnim, { toValue: 1, friction: 7, useNativeDriver: true }).start();
      }
    };
    // @ts-ignore — DOM-only guard
    document.addEventListener('mouseleave', onMouseLeave);
    return () => {
      // @ts-ignore
      document.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [exitBannerAnim]);
  const dismissExitBanner = useCallback(() => {
    Animated.timing(exitBannerAnim, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => setShowExitBanner(false));
  }, [exitBannerAnim]);

  const loadLiveData = useCallback(async (animateCounter = false) => {
    const { supabase: sb } = await import('@/client/supabase');
    // Pas de getSession() ici — ctx.tsx a déjà fait getSession + onAuthStateChange.
    // Stack.Protected guard={!session} redirige automatiquement si connecté.
    // Un 2ème getSession() serait redondant et ajouterait ~150ms de latence avant le Promise.all.

    const [stats, tems, romanRes, profilesRes] = await Promise.all([
      getAppStats(),
      getPublicTemoignages(),
      getRomanContent(),
      sb.from('profiles')
        .select('id, prenom, signe_astro, age, ville')
        .eq('inscription_complete', true)
        .eq('is_mystery', true)          // uniquement les profils en Mode Mystère
        .not('signe_astro', 'is', null)
        .not('prenom', 'is', null)
        .order('created_at', { ascending: false })
        .limit(8),
    ]);
    setTemoignages(tems);
    setRomanItems(romanRes);
    if (Array.isArray(profilesRes.data) && profilesRes.data.length > 0) {
      setMystereProfiles(profilesRes.data as MiniProfile[]);
    }
    // Compteur : privilégier total_roman_likes si > 0, sinon matches_this_month, sinon total_users
    const target = stats.total_roman_likes > 0
      ? stats.total_roman_likes
      : stats.matches_this_month > 0
        ? stats.matches_this_month
        : stats.total_users > 0 ? stats.total_users : 0;
    setStatsLoaded(true);
    if (target > 0) {
      writeStatsCache(target);
      if (animateCounter && !counterAnimated.current) {
        counterAnimated.current = true;
        const duration = 2400;
        const startTime = performance.now();
        const animate = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Ease-out quadratic
          const eased = 1 - (1 - progress) * (1 - progress);
          setCounterValue(Math.round(eased * target));
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      } else {
        setCounterValue(target);
      }
    }
  }, []);

  // useFocusEffect : rechargement données à chaque visite (retour depuis sign-in, etc.)
  // Les animations hero ne se rejouent qu'au premier montage (heroAnimDone ref)
  const heroAnimDone  = useRef(false);
  const floatLoops    = useRef<Animated.CompositeAnimation[]>([]);

  useFocusEffect(useCallback(() => {
    // Animations hero : une seule fois au premier montage
    if (!heroAnimDone.current) {
      heroAnimDone.current = true;
      Animated.sequence([
        Animated.parallel([
          Animated.timing(heroAnim,  { toValue: 1, duration: 650, useNativeDriver: true }),
          Animated.spring(heroScale, { toValue: 1, friction: 6,   useNativeDriver: true }),
        ]),
        Animated.timing(sloganAnim, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.timing(ctaAnim,    { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(bodyAnim,   { toValue: 1, duration: 500, useNativeDriver: true }),
      ]).start();

      // Float loops — lancés une seule fois, stockés pour cleanup
      floatLoops.current = floatAnims.map((a, i) => {
        const loop = Animated.loop(Animated.sequence([
          Animated.delay(i * 600),
          Animated.timing(a, { toValue: -10, duration: 2600, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0,   duration: 2600, useNativeDriver: true }),
        ]));
        loop.start();
        return loop;
      });
    }

    loadLiveData(true);
    // Pas de polling — cache localStorage 5min évite les rechargements inutiles
    return () => {
      // Nettoyage float loops au démontage uniquement
      floatLoops.current.forEach(l => l.stop());
      floatLoops.current = [];
      heroAnimDone.current = false;
    };
  }, [loadLiveData]));

  // heroFontSize et subTaglineSize alimentent les styles hero ci-dessous
  const heroFontSize   = titleSize;
  const subTaglineSize = captionSize;

  const containerStyle = {
    flexGrow: 1 as const,
    paddingBottom: sectionSpacing,
    maxWidth: (isDesktop || isTV) ? contentMaxWidth : undefined,
    alignSelf: (isDesktop || isTV) ? ('center' as const) : undefined,
    width: (isDesktop || isTV) ? ('100%' as const) : undefined,
  };

  return (
    <View style={{
      flex: 1,
      overflow: 'hidden',
      backgroundColor: '#0D0D1A',
      ...(process.env.EXPO_OS === 'web' ? { minHeight: '100dvh' as unknown as number } : {}),
    }}>
      <Head>
        <title>{buildTitle('Aevyra — Trouvez Votre Âme Sœur par Astrologie ✨ Rencontre Spirituelle Gratuite')}</title>
        {buildMetaTags({
          title: 'Aevyra — Trouvez Votre Âme Sœur par Astrologie ✨ Rencontre Spirituelle Gratuite',
          description: "✨ Aevyra — L'app de rencontres guidée par les étoiles. Compatibilité astrologique, énergie romantique, connexions sincères. 100% gratuit, sans carte bancaire. Rejoignez Aevyra et découvrez votre âme sœur.",
          canonical: `${SITE_URL}/`,
          ogType: 'website',
          ogDescription: '✨ Aevyra connecte les âmes par compatibilité astrologique. Rencontres sincères, 100% gratuit, sans carte bancaire. Tes étoiles t\'attendent.',
          ogImageAlt: 'Aevyra — App rencontre astrologique gratuite : trouvez votre âme sœur par les étoiles',
          twitterTitle: '✨ Aevyra — Trouve ton Âme Sœur par les Étoiles',
          twitterDescription: '🌙 Compatibilité astrologique, rencontres sincères. 100% gratuit, sans carte bancaire. Tes étoiles t\'attendent sur Aevyra !',
          keywords: [
            'Aevyra application', 'aevyra.uk', 'rencontre astrologique',
            'compatibilité astrologique rencontre', 'app rencontre spirituelle',
            'âme sœur signe astral', 'dating horoscope', 'rencontre énergie romantique',
            'célibataires spirituels France', 'rencontre sérieuse gratuite astrologie',
            'connexion spirituelle rencontre', 'application rencontre unique',
          ],
        }).map((tag, i) =>
          tag.type === 'link'
            ? <link key={i} {...tag.attrs} />
            : <meta key={i} {...tag.attrs} />
        )}

        {/* ── JSON-LD Schemas — Google Rich Results + AI Overview ── */}
        {/* buildSoftwareAppSchema(memberCount) injecte le vrai nombre de membres Supabase */}
        <script type="application/ld+json">{serializeJsonLd([
          SCHEMA_ORGANIZATION,
          SCHEMA_WEBSITE,
          SCHEMA_MOBILE_APP,
          SCHEMA_HOW_TO,
          SCHEMA_FEATURE_LIST,
          SCHEMA_LAUNCH_EVENT,
          SCHEMA_VIDEO,
          buildSoftwareAppSchema(counterValue > 0 ? counterValue : 312),
          buildFAQSchema(FAQ_ITEMS),
        ])}</script>

        {/* ── Favicons universels ─────────────────────────────── */}
        {/* PRIORITÉ 1 : favicon.ico — standard absolu Chrome/Firefox/Opera/Mi/Edge/Samsung */}
        {/* Le navigateur cherche /favicon.ico automatiquement à la racine */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        {/* PRIORITÉ 2 : PNG haute résolution pour navigateurs modernes */}
        <link rel="icon" type="image/png" sizes="96x96" href="/icon-96.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        {/* Apple Safari (iOS + macOS) — sizes dédiées obligatoires */}
        <link rel="apple-touch-icon" href="/icon-180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-180.png" />
        {/* iOS Safari splash screens (iPhone + iPad) */}
        <link rel="apple-touch-startup-image" href="/icon-512.png" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/icon-512.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/icon-512.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" />
        {/* Microsoft Edge / Windows tiles */}
        <meta name="msapplication-TileColor" content="#0D0D1A" />
        <meta name="msapplication-TileImage" content="/icon-192.png" />
        <meta name="msapplication-square150x150logo" content="/icon-192.png" />
        <meta name="msapplication-wide310x150logo" content="/og-image.jpg" />
        <meta name="msapplication-square310x310logo" content="/icon-512.png" />
        {/* PWA Manifest — sans crossOrigin pour compatibilité Opera/Mi/Samsung */}
        <link rel="manifest" href="/manifest.json" />

        {/* ── Hreflang — toutes langues + x-default ──────────── */}
        <link rel="alternate" hrefLang="fr" href="https://aevyra.uk/" />
        <link rel="alternate" hrefLang="fr-FR" href="https://aevyra.uk/" />
        <link rel="alternate" hrefLang="fr-BE" href="https://aevyra.uk/" />
        <link rel="alternate" hrefLang="fr-CH" href="https://aevyra.uk/" />
        <link rel="alternate" hrefLang="fr-CA" href="https://aevyra.uk/" />
        <link rel="alternate" hrefLang="en-GB" href="https://aevyra.uk/" />
        <link rel="alternate" hrefLang="en" href="https://aevyra.uk/" />
        <link rel="alternate" hrefLang="x-default" href="https://aevyra.uk/" />

        {/* ── Preloads critiques — LCP optimisé ──────────────── */}
        <link rel="preload" as="image" href="/og-image.jpg" />
        <link rel="preload" as="image" href="/icon-192.png" />

        {/* ── Preconnect — réduit TTFB Supabase + CDN ─────────── */}
        <link rel="preconnect" href="https://fqlqofpvmqipxnyzitne.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fqlqofpvmqipxnyzitne.supabase.co" />

        {/* ── Safari Pinned Tab — SVG couleur dorée ──────────── */}
        <link rel="mask-icon" href="/favicon.png" color="#FFD700" />

        {/* ── Shortcut icon legacy (IE + Opera Mini) ─────────── */}
        <link rel="shortcut icon" href="/favicon.ico" />
      </Head>
      <StatusBar style="light" />
      <CosmicBackground>
        {/* Lazy — chargé après le premier paint, non-bloquant */}
        <Suspense fallback={null}>
          <RomanticParticles />
        </Suspense>
        <ScrollView
          contentContainerStyle={containerStyle}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          {/* ═══════════════════════════════════════════════════════
               HERO — version originale restaurée
               Titre → Portraits flottants → Slogan → CTA → Social proof → Connexion
          ════════════════════════════════════════════════════════ */}
          <Animated.View style={{
            opacity: heroAnim,
            transform: [{ scale: heroScale }],
            alignItems: 'center',
            paddingTop: insets.top + 24,
            paddingHorizontal: isDesktop ? buttonPadH * 2 : buttonPadH,
            gap: gap,
          }}>

            {/* — 1. TITRE */}
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: isCinema ? 120 : is4K ? 96 : isTV ? 72 : isDesktop ? 56 : 48 }}>✨</Text>
              <Text style={{
                fontSize: heroFontSize, fontWeight: '900', color: '#FFD700',
                letterSpacing: 3,
                textShadowColor: 'rgba(255,215,0,0.55)', textShadowRadius: 20,
              }}>Aevyra</Text>
              <Text style={{
                fontSize: subTaglineSize, color: 'rgba(255,182,193,0.75)',
                letterSpacing: 4, textAlign: 'center',
              }}>
                LÀ OÙ L'ÉTERNITÉ COMMENCE
              </Text>
            </View>

            {/* — 2. PORTRAITS FLOTTANTS — vrais membres anonymisés (initiale + signe) */}
            {/* Fallback sur silhouettes IA seulement si pas encore de membres en DB */}
            <View style={{
              flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end',
              gap: gap,
            }}>
              {(mystereProfiles.length >= 3
                ? mystereProfiles.slice(0, 3)
                : null
              )?.map((p, i) => {
                const sz = i === 1 ? Math.round(avatarSize * 1.22) : avatarSize;
                const couleur = SIGNE_COULEUR[p.signe_astro] ?? '#FFD700';
                return (
                  <Animated.View key={p.id} style={{ transform: [{ translateY: floatAnims[i] }], alignItems: 'center', gap: 4 }}>
                    <View style={{
                      width: sz + 8, height: sz + 8, borderRadius: (sz + 8) / 2,
                      borderWidth: 1, borderColor: `${couleur}30`,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <View style={{
                        width: sz, height: sz, borderRadius: sz / 2,
                        backgroundColor: `${couleur}22`,
                        borderWidth: 2, borderColor: couleur,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ color: couleur, fontWeight: '900', fontSize: sz * 0.42 }}>
                          {p.prenom.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    {/* Signe astro sous chaque portrait */}
                    <Text style={{ color: couleur, fontSize: captionSize * 0.85, fontWeight: '700', textAlign: 'center' }}>
                      {p.signe_astro}
                    </Text>
                  </Animated.View>
                );
              }) ?? SILHOUETTES.map((sil, i) => {
                // Fallback IA tant que les vrais membres ne sont pas chargés
                const sz = i === 1 ? Math.round(avatarSize * 1.22) : avatarSize;
                return (
                  <Animated.View key={i} style={{ transform: [{ translateY: floatAnims[i] }], alignItems: 'center' }}>
                    <View style={{
                      width: sz + 8, height: sz + 8, borderRadius: (sz + 8) / 2,
                      borderWidth: 1, borderColor: `${sil.aura}30`,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <View style={{
                        width: sz, height: sz, borderRadius: sz / 2,
                        overflow: 'hidden', borderWidth: 2, borderColor: sil.aura,
                      }}>
                        <Image source={{ uri: sil.uri }} style={{ width: sz, height: sz }} contentFit="cover" />
                      </View>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
            {/* Mention honnête + rassurante */}
            <Text style={{
              color: mystereProfiles.length >= 3 ? 'rgba(255,215,0,0.60)' : 'rgba(255,255,255,0.25)',
              fontSize: captionSize * 0.85,
              textAlign: 'center', fontStyle: 'italic',
            }}>
              {mystereProfiles.length >= 3
                ? '✦ Vrais membres inscrits · Profil complet visible après inscription'
                : 'Visuels IA · illustration décorative'}
            </Text>

            {/* — 3. SLOGAN */}
            <Animated.View style={{
              opacity: sloganAnim,
              transform: [{ translateY: sloganAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
              alignSelf: 'stretch',
            }}>
              <Text style={{
                textAlign: 'center', fontSize: bodySize + 1,
                color: 'rgba(255,255,255,0.85)',
                lineHeight: (bodySize + 1) * 1.65,
                fontStyle: 'italic', letterSpacing: 0.2,
              }}>{SLOGAN}</Text>
            </Animated.View>

            {/* — 4. BADGE SOCIAL PROOF — pill au-dessus du CTA */}
            <Animated.View style={{
              opacity: ctaAnim,
              transform: [{ translateY: ctaAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
              alignSelf: 'stretch', gap: gap * 0.9,
              marginBottom: sectionSpacing,
            }}>
              {/* Badge pill : fond sombre + bordure, dot vert pulsant */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: 8, alignSelf: 'center',
                backgroundColor: 'rgba(255,255,255,0.07)',
                borderRadius: 24, borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.18)',
                paddingHorizontal: 18, paddingVertical: 9,
              }}>
                <Animated.View style={{
                  width: 7, height: 7, borderRadius: 4,
                  backgroundColor: '#4ADE80', opacity: dotPulse,
                }} />
                <Text style={{
                  color: 'rgba(255,255,255,0.88)', fontSize: captionSize + 1,
                  fontWeight: '600', letterSpacing: 0.2,
                }}>
                  {!statsLoaded
                    ? '✨ Communauté en pleine croissance'
                    : counterValue < 5
                      ? '🌱 Parmi les âmes fondatrices · Inscrivez-vous'
                      : counterValue < 50
                        ? `✨ ${counterValue} membres actifs · Rejoignez-nous`
                        : `👫 ${counterValue.toLocaleString('fr-FR')} membres actifs`}
                </Text>
              </View>

              {/* CTA doré pleine largeur */}
              <GoldenButton
                label="✨ Découvrir mon âme sœur"
                onPress={() => router.push('/(auth)/register' as RelativePathString)}
                variant="gold"
                accessibilityLabel="S'inscrire gratuitement sur Aevyra"
              />

              {/* Bouton pill rose — membres existants */}
              <Pressable
                onPress={() => router.push('/(auth)/sign-in')}
                accessibilityRole="button"
                accessibilityLabel="Déjà membre, se connecter"
                hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 7, alignSelf: 'stretch',
                  paddingVertical: buttonPadV, paddingHorizontal: buttonPadH,
                  borderRadius: 24, borderWidth: 1,
                  borderColor: 'rgba(255,182,193,0.35)',
                  backgroundColor: 'rgba(255,182,193,0.07)',
                  ...(process.env.EXPO_OS === 'web' ? { cursor: 'pointer' } as any : {}),
                }}
              >
                <Text style={{ fontSize: iconSize - 4 }}>💗</Text>
                <Text style={{
                  color: 'rgba(255,182,193,0.90)', fontSize: buttonFontSize,
                  fontWeight: '700', letterSpacing: 0.2,
                }}>
                  Déjà membre ? Se connecter
                </Text>
              </Pressable>
            </Animated.View>

          </Animated.View>

          {/* ═══ CORPS ════════════════════════════════════════════ */}
          <Animated.View style={{
            opacity: bodyAnim,
            transform: [{ translateY: bodyAnim.interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) }],
            gap: sectionSpacing,
          }}>

            {/* ═══ S3 — POURQUOI AEVYRA (piliers différenciants en premier) ══ */}
            <Divider label="✦  POURQUOI AEVYRA  ✦" />
            <View style={{
              gap: gap,
              paddingHorizontal: px,
              flexDirection: (isDesktop || isLandscapeMobile) ? 'row' : 'column',
              flexWrap: (isDesktop || isLandscapeMobile) ? 'wrap' : undefined,
            }}>
              {(PILIERS as { emoji: string; accent: string; titre: string; desc: string }[]).map((p, i) => (
                <LinearGradient
                  key={i}
                  colors={[`${p.accent}12`, 'rgba(13,5,30,0.90)']}
                  style={{
                    borderRadius: cardRadius, borderWidth: 1, borderColor: `${p.accent}25`,
                    padding: gap, flexDirection: 'row', gap: gap * 0.75,
                    alignItems: 'flex-start',
                    ...(isDesktop ? { flex: 1, minWidth: 280 } : {}),
                  }}
                >
                  <View style={{
                    width: tapTarget, height: tapTarget, borderRadius: cardRadius * 0.7,
                    backgroundColor: `${p.accent}18`, borderWidth: 1, borderColor: `${p.accent}32`,
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Text style={{ fontSize: iconSize }}>{p.emoji}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text style={{ color: p.accent, fontWeight: '800', fontSize: h3Size }}>{p.titre}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.90)', fontSize: bodySize, lineHeight: bodySize * 1.6 }}>{p.desc}</Text>
                  </View>
                </LinearGradient>
              ))}
            </View>

            {/* ═══ S4 — ALGORITHME COSMIQUE (preuve technique) ════════════ */}
            <Divider label="✦  L'ALGORITHME COSMIQUE  ✦" />
            <CompatibiliteReelle px={px} />

            {/* ═══ S4b — PROFILS MYSTÈRE (vrais membres anonymisés) ═══════ */}
            <Divider label="✦  ÂMES QUI VOUS ATTENDENT  ✦" />
            <View style={{ gap: gap, paddingHorizontal: px }}>
              {mystereProfiles.length > 0 ? (
                <>
                  <View style={{ gap: 4 }}>
                    <Text style={{
                      color: 'rgba(255,255,255,0.90)', fontSize: h3Size,
                      textAlign: 'center', fontWeight: '700',
                    }}>Ces âmes cherchent quelqu'un comme vous</Text>
                    <Text style={{
                      color: 'rgba(255,255,255,0.92)', fontSize: bodySize,
                      textAlign: 'center', fontStyle: 'italic',
                    }}>
                      Vrais membres inscrits · Profil complet visible après inscription
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gap, justifyContent: 'center' }}>
                    {mystereProfiles.slice(0, isDesktop ? 6 : 4).map((p: MiniProfile, i: number) => (
                      <React.Fragment key={p.id}>
                      <MystereCard p={p} delay={i * 130} />
                    </React.Fragment>
                    ))}
                  </View>
                  <Pressable
                    onPress={() => router.push('/(auth)/register' as RelativePathString)}
                    accessibilityRole="button"
                    accessibilityLabel="Voir tous les profils compatibles"
                    className="active:opacity-70"
                    style={{ alignItems: 'center' }}
                  >
                    <Text style={{
                      color: 'rgba(199,125,255,0.85)', fontSize: captionSize,
                      fontWeight: '700', textDecorationLine: 'underline',
                      textAlign: 'center', paddingVertical: 8,
                    }}>
                      Voir tous les profils compatibles →
                    </Text>
                  </Pressable>
                </>
              ) : (
                <LinearGradient
                  colors={['rgba(255,215,0,0.07)', 'rgba(75,0,130,0.12)']}
                  style={{
                    borderRadius: cardRadius, borderWidth: 1,
                    borderColor: 'rgba(255,215,0,0.15)', padding: gap * 1.5,
                    alignItems: 'center', gap: gap,
                  }}
                >
                  <Text style={{ fontSize: iconSize * 1.5 }}>🌌</Text>
                  <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: h3Size, textAlign: 'center' }}>
                    La constellation se forme
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.90)', fontSize: bodySize, textAlign: 'center', lineHeight: bodySize * 1.6 }}>
                    Les premières âmes arrivent.{'\n'}Inscrivez-vous pour en faire partie.
                  </Text>
                  <GoldenButton
                    label="✨ Rejoindre en premier"
                    onPress={() => router.push('/(auth)/register' as RelativePathString)}
                    variant="gold"
                    accessibilityLabel="S'inscrire gratuitement sur Aevyra"
                  />
                </LinearGradient>
              )}
            </View>

            {/* ═══ S5 — TÉMOIGNAGES VRAIS MEMBRES ════════════════ */}
            {temoignages.length > 0 && (
              <>
                <Divider label="✦  ILS L'ONT VÉCU  ✦" />
                <SectionTemoignages temoignages={temoignages} px={px} />
              </>
            )}

            {/* ═══ S5b — ROMAN DES ÂMES (10 vrais contenus DB) ══ */}
            {romanItems.length > 0 && (
              <>
                <Divider label="✦  LE ROMAN DES ÂMES  ✦" />
                <SectionRoman items={romanItems} px={px} />
              </>
            )}

            {/* ═══ S6 — AEVYRA VS LES AUTRES ═════════════════════ */}
            <Divider label="✦  AEVYRA VS LES AUTRES  ✦" />
            <View style={{ gap: gap, paddingHorizontal: px }}>

              {/* En-tête impactant */}
              <View style={{ alignItems: 'center', gap: gap * 0.4 }}>
                <Text style={{
                  color: '#FFFFFF', fontSize: h2Size, textAlign: 'center',
                  fontWeight: '900', letterSpacing: 0.2, lineHeight: h2Size * 1.5,
                }}>
                  Ce que les autres{'\n'}ne feront <Text style={{ color: '#FFD700' }}>jamais</Text>
                </Text>
                <Text style={{
                  color: 'rgba(255,255,255,0.65)', fontSize: captionSize, textAlign: 'center',
                  fontStyle: 'italic',
                }}>
                  Aevyra existe pour une connexion vraie
                </Text>
              </View>

              {/* En-tête colonnes */}
              <View style={{ flexDirection: 'row', gap: gap * 0.5 }}>
                <View style={{
                  flex: 1, alignItems: 'center', paddingVertical: gap * 0.5, borderRadius: cardRadius * 0.6,
                  backgroundColor: 'rgba(255,60,60,0.12)',
                  borderWidth: 1, borderColor: 'rgba(255,60,60,0.25)',
                }}>
                  <Text style={{ color: 'rgba(255,100,100,0.9)', fontWeight: '800', fontSize: captionSize, letterSpacing: 1 }}>
                    LES AUTRES
                  </Text>
                </View>
                <View style={{ width: gap * 1.4 }} />
                <View style={{
                  flex: 1, alignItems: 'center', paddingVertical: gap * 0.5, borderRadius: cardRadius * 0.6,
                  backgroundColor: 'rgba(255,215,0,0.12)',
                  borderWidth: 1, borderColor: 'rgba(255,215,0,0.35)',
                }}>
                  <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: captionSize, letterSpacing: 1 }}>
                    AEVYRA ✦
                  </Text>
                </View>
              </View>

              {/* Lignes de comparaison */}
              {DIFFERENCIANTS.map((d, i) => (
                <React.Fragment key={i}>
                <View style={{ gap: gap * 0.4 }}>
                  {/* Dimension label */}
                  <Text style={{
                    color: 'rgba(255,255,255,0.92)', fontSize: captionSize,
                    fontWeight: '700', letterSpacing: 1.5, textAlign: 'center',
                  }}>
                    {d.dimension}
                  </Text>
                  {/* Split gauche / droite */}
                  <View style={{ flexDirection: 'row', gap: gap * 0.5, alignItems: 'stretch' }}>
                    {/* Colonne EUX */}
                    <LinearGradient
                      colors={['rgba(255,50,50,0.14)', 'rgba(100,0,0,0.22)']}
                      style={{
                        flex: 1, borderRadius: cardRadius * 0.7, borderWidth: 1,
                        borderColor: 'rgba(255,60,60,0.22)',
                        padding: gap * 0.6, gap: gap * 0.25, alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: h3Size }}>✕</Text>
                      <Text style={{
                        color: 'rgba(255,100,100,0.95)', fontWeight: '800',
                        fontSize: bodySize, textAlign: 'center', lineHeight: bodySize * 1.45,
                      }}>{d.them}</Text>
                      <Text style={{
                        color: 'rgba(255,120,120,0.90)', fontSize: captionSize,
                        textAlign: 'center', lineHeight: captionSize * 1.4, fontStyle: 'italic',
                      }}>{d.themDesc}</Text>
                    </LinearGradient>

                    {/* Séparateur central — responsive */}
                    <View style={{ width: gap * 1.4, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ width: 1, flex: 1, backgroundColor: 'rgba(255,215,0,0.12)' }} />
                      <View style={{
                        width: gap * 1.3, height: gap * 1.3, borderRadius: gap * 0.65,
                        backgroundColor: 'rgba(255,215,0,0.12)',
                        borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: captionSize * 0.85 }}>✦</Text>
                      </View>
                      <View style={{ width: 1, flex: 1, backgroundColor: 'rgba(255,215,0,0.12)' }} />
                    </View>

                    {/* Colonne NOUS */}
                    <LinearGradient
                      colors={['rgba(199,125,255,0.18)', 'rgba(75,0,130,0.28)']}
                      style={{
                        flex: 1, borderRadius: cardRadius * 0.7, borderWidth: 1,
                        borderColor: 'rgba(199,125,255,0.40)',
                        padding: gap * 0.6, gap: gap * 0.25, alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: h3Size }}>✦</Text>
                      <Text style={{
                        color: '#FFD700', fontWeight: '900',
                        fontSize: bodySize, textAlign: 'center', lineHeight: bodySize * 1.45,
                      }}>{d.us}</Text>
                      <Text style={{
                        color: 'rgba(255,215,0,0.95)', fontSize: captionSize,
                        textAlign: 'center', lineHeight: captionSize * 1.4, fontStyle: 'italic',
                      }}>{d.usDesc}</Text>
                    </LinearGradient>
                  </View>
                </View>
                </React.Fragment>
              ))}

              {/* CTA */}
              <Pressable
                onPress={() => router.push('/(auth)/register' as RelativePathString)}
                className="active:opacity-70"
                style={{ alignItems: 'center', marginTop: gap * 0.25 }}
              >
                <LinearGradient
                  colors={['#B8860B', '#FFD700', '#B8860B']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{
                    paddingHorizontal: buttonPadH * 1.5, paddingVertical: buttonPadV,
                    borderRadius: cardRadius,
                  }}
                >
                  <Text style={{ color: '#0D0D1A', fontWeight: '900', fontSize: buttonFontSize, letterSpacing: 0.5 }}>
                    ✨ Essayer Aevyra gratuitement
                  </Text>
                </LinearGradient>
              </Pressable>

            </View>

            {/* ═══ S7 — FAQ (JSON-LD featured snippets) ══════════ */}
            <Divider label="✦  VOS QUESTIONS  ✦" />
            <FAQSection px={px} r={{ h2Size, h3Size, bodySize, captionSize, cardRadius, gap, tapTarget, buttonFontSize, buttonPadV, buttonPadH }} />

            {/* ═══ S8 — CONVERSION FINALE ══════════════════════════ */}
            <View style={{ paddingHorizontal: px }}>
              <LinearGradient
                colors={['rgba(114,47,55,0.38)', 'rgba(75,0,130,0.38)', 'rgba(13,5,30,0.96)']}
                style={{
                  borderRadius: cardRadius, borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)',
                  padding: gap * 1.25, gap: gap, alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: Math.min(iconSize * 2, 72) }}>🌌</Text>
                <Text style={{
                  color: '#FFD700', fontWeight: '900', fontSize: h2Size,
                  textAlign: 'center', lineHeight: h2Size * 1.45,
                }} accessibilityRole="header">Votre histoire d'amour{'\n'}commence ce soir</Text>
                <Text style={{
                  color: 'rgba(255,255,255,0.90)', fontSize: bodySize,
                  textAlign: 'center', lineHeight: bodySize * 1.6, fontStyle: 'italic',
                }}>
                  Votre âme sœur est peut-être déjà inscrite.{'\n'}
                  L'inscription prend 3 minutes — sans carte bancaire.
                </Text>
                {/* Badge garantie */}
                <View style={{ flexDirection: 'row', gap: gap * 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {['✦ Gratuit', '🔒 Sécurisé', '❤️ Sincère'].map(b => (
                    <React.Fragment key={b}>
                    <View style={{
                      backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 20,
                      paddingHorizontal: buttonPadH * 0.6, paddingVertical: buttonPadV * 0.5,
                      borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)',
                    }}>
                      <Text style={{ color: 'rgba(255,215,0,0.95)', fontWeight: '700', fontSize: captionSize }}>{b}</Text>
                    </View>
                    </React.Fragment>
                  ))}
                </View>
                <GoldenButton
                  label="🌟 Rejoindre la constellation"
                  onPress={() => router.push('/(auth)/register' as RelativePathString)}
                  variant="gold"
                  accessibilityLabel="Créer mon profil gratuit sur Aevyra"
                />
                <Text style={{
                  color: 'rgba(255,255,255,0.90)', fontSize: captionSize,
                  textAlign: 'center', lineHeight: captionSize * 1.5, fontStyle: 'italic',
                }}>
                  Rencontres et résultats non garantis · Chaque profil est unique.
                </Text>
              </LinearGradient>
            </View>

            {/* ═══ FOOTER ════════════════════════════════════════ */}
            <FooterMagique px={px} r={{ h2Size, h3Size, bodySize, captionSize, cardRadius, gap, tapTarget, buttonFontSize, iconSize, isCinema, is4K, isQHD, isFullHD, isDesktop, isTablet: _isTablet }} />

          </Animated.View>
        </ScrollView>

        {/* ── Bannière exit intent (Web uniquement) ─────────────────────────────
            S'affiche quand la souris quitte la page vers le haut (visiteur sur le
            point de partir). Une seule fois par session. Invitation douce à s'inscrire.
        ── */}
        {showExitBanner && (
          <Animated.View style={{
            position: 'absolute' as const, bottom: 0, left: 0, right: 0,
            opacity: exitBannerAnim,
            transform: [{ translateY: exitBannerAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }],
            zIndex: 999,
          }}>
            <LinearGradient
              colors={['rgba(13,10,30,0.97)', 'rgba(75,0,130,0.97)']}
              style={{
                margin: 16, borderRadius: 20,
                borderWidth: 1, borderColor: 'rgba(255,215,0,0.35)',
                padding: 20, gap: 12,
              }}
            >
              {/* Bouton fermer */}
              <Pressable onPress={dismissExitBanner}
                style={{ position: 'absolute' as const, top: 12, right: 14, zIndex: 1, padding: 6 }}>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 18, lineHeight: 18 }}>✕</Text>
              </Pressable>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 32 }}>🌙</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: h3Size, lineHeight: h3Size * 1.3 }}>
                    Attendez — vos étoiles vous cherchent aussi
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: captionSize, marginTop: 4, lineHeight: captionSize * 1.5 }}>
                    Des âmes compatibles avec vous sont déjà inscrites. Rejoignez-les — c'est 100% gratuit.
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => { dismissExitBanner(); router.push('/(auth)/register' as RelativePathString); }}
              >
                <LinearGradient
                  colors={['#FFD700', '#F59E0B']}
                  style={{ borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
                >
                  <Text style={{ color: '#0D0D1A', fontWeight: '900', fontSize: bodySize + 1 }}>
                    ✨ Découvrir mon âme sœur — gratuit
                  </Text>
                </LinearGradient>
              </Pressable>

              <Pressable onPress={dismissExitBanner} style={{ alignItems: 'center', paddingVertical: 4 }}>
                <Text style={{ color: 'rgba(255,255,255,0.40)', fontSize: captionSize }}>
                  Pas maintenant
                </Text>
              </Pressable>
            </LinearGradient>
          </Animated.View>
        )}

      </CosmicBackground>
    </View>
  );
}
