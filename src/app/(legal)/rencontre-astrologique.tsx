// Page SEO longue traîne — "rencontre astrologique"
// Mot-clé cible : "rencontre astrologique", "app rencontre astrologique gratuite", "rencontre par signe astral"
// Cette page statique est indexée par Google/Bing et capte le trafic organique qualifié
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, type RelativePathString } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, ChevronLeft, Heart, Star, Sparkles, Users } from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import { useResponsive } from '@/hooks/useResponsive';
import Head from 'expo-router/head';
import { buildTitle, buildMetaTags, serializeJsonLd, buildBreadcrumbSchema, buildFAQSchema, SITE_URL } from '@/hooks/useSEO';

const GOLD   = '#FFD700';
const WHITE  = '#F5E6C8';
const MUTED  = 'rgba(255,255,255,0.65)';
const BG_CARD = 'rgba(255,215,0,0.06)';
const BORDER  = 'rgba(255,215,0,0.18)';

// Données FAQ spécifiques à cette page (Google AI Overview)
const PAGE_FAQS = [
  {
    question: "Qu'est-ce que la rencontre astrologique ?",
    answer: "La rencontre astrologique est une méthode pour trouver l'âme sœur basée sur la compatibilité des signes du zodiaque. Aevyra analyse votre signe solaire, lunaire, ascendant, Vénus et Mars pour calculer une compatibilité amoureuse précise sur 5 dimensions.",
  },
  {
    question: "Quels signes astrologiques sont les plus compatibles en amour ?",
    answer: "Les compatibilités les plus fortes en amour : Bélier-Lion (passion), Taureau-Vierge (stabilité), Gémeaux-Balance (communication), Cancer-Scorpion (profondeur), Lion-Sagittaire (aventure), Vierge-Capricorne (valeurs), Balance-Gémeaux (harmonie), Scorpion-Poissons (intensité), Sagittaire-Bélier (liberté), Capricorne-Taureau (ambition), Verseau-Gémeaux (originalité), Poissons-Cancer (sensibilité). Aevyra calcule votre compatibilité unique.",
  },
  {
    question: "L'application Aevyra de rencontre astrologique est-elle gratuite ?",
    answer: "Oui, Aevyra est 100% gratuit. Inscription, matchs astrologiques, messagerie, appels vidéo — tout est accessible sans abonnement ni carte bancaire.",
  },
  {
    question: "Comment fonctionne la compatibilité astrologique sur Aevyra ?",
    answer: "Aevyra analyse 5 dimensions : votre signe solaire (personnalité), lunaire (émotions), ascendant (apparence), Vénus (amour) et Mars (désir). L'algorithme calcule un score de compatibilité global et des explications détaillées pour chaque dimension avec chaque profil.",
  },
  {
    question: "La rencontre astrologique est-elle fiable pour trouver l'amour ?",
    answer: "L'astrologie comme outil de rencontre est utilisée depuis des millénaires. Sur Aevyra, la compatibilité astrologique est combinée à des critères modernes (style d'amour, valeurs, mode de vie) pour des rencontres plus authentiques et durables.",
  },
];

// Schéma JSON-LD spécifique à la page
const PAGE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${SITE_URL}/rencontre-astrologique#webpage`,
  url: `${SITE_URL}/rencontre-astrologique`,
  name: 'Rencontre Astrologique — Trouve ton Âme Sœur par les Étoiles | Aevyra',
  description: "Aevyra est l'app de rencontre astrologique gratuite. Compatibilité signe astral, matchs guidés par les étoiles. Inscris-toi gratuitement, sans carte bancaire.",
  inLanguage: ['fr-FR', 'en-GB'],
  isPartOf: { '@id': `${SITE_URL}/#website` },
  about: { '@id': `${SITE_URL}/#app` },
  publisher: { '@id': `${SITE_URL}/#organization` },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Rencontre Astrologique', item: `${SITE_URL}/rencontre-astrologique` },
    ],
  },
  keywords: 'rencontre astrologique, app rencontre astrologique gratuite, compatibilité signe astral, rencontre par horoscope, dating astrologie France',
};

const SIGNES = [
  { emoji: '♈', nom: 'Bélier',    compatibles: 'Lion, Sagittaire, Gémeaux' },
  { emoji: '♉', nom: 'Taureau',   compatibles: 'Vierge, Capricorne, Cancer' },
  { emoji: '♊', nom: 'Gémeaux',   compatibles: 'Balance, Verseau, Bélier' },
  { emoji: '♋', nom: 'Cancer',    compatibles: 'Scorpion, Poissons, Taureau' },
  { emoji: '♌', nom: 'Lion',      compatibles: 'Bélier, Sagittaire, Balance' },
  { emoji: '♍', nom: 'Vierge',    compatibles: 'Taureau, Capricorne, Scorpion' },
  { emoji: '♎', nom: 'Balance',   compatibles: 'Gémeaux, Verseau, Lion' },
  { emoji: '♏', nom: 'Scorpion',  compatibles: 'Cancer, Poissons, Capricorne' },
  { emoji: '♐', nom: 'Sagittaire',compatibles: 'Bélier, Lion, Verseau' },
  { emoji: '♑', nom: 'Capricorne',compatibles: 'Taureau, Vierge, Scorpion' },
  { emoji: '♒', nom: 'Verseau',   compatibles: 'Gémeaux, Balance, Sagittaire' },
  { emoji: '♓', nom: 'Poissons',  compatibles: 'Cancer, Scorpion, Capricorne' },
];

const AVANTAGES = [
  { icon: <Star size={20} color={GOLD} />, titre: '5 dimensions astrologiques', desc: 'Soleil, Lune, Ascendant, Vénus, Mars — analyse profonde unique.' },
  { icon: <Heart size={20} color="#FF6B9D" />, titre: 'Connexions sincères', desc: 'Les rencontres astrologiques créent des liens plus durables et authentiques.' },
  { icon: <Users size={20} color="#87CEEB" />, titre: '100% gratuit', desc: 'Aucun abonnement, aucune carte bancaire. Toutes les fonctionnalités offertes.' },
  { icon: <Sparkles size={20} color="#C9A96E" />, titre: 'Algorithme IA cosmique', desc: "Intelligence artificielle entraînée sur des millions de profils astrologiques." },
];

export default function RencontreAstrologique() { 
  const insets = useSafeAreaInsets();
  const { px, bodySize, captionSize, h2Size, h3Size, gap: _gap, contentMaxWidth: _contentMaxWidth, iconSize: _iconSize  } = useResponsive();
  const goBack = () => {
    if (router.canGoBack()) { router.back(); return; }
    router.replace('/' as RelativePathString);
  };

  return (
    <View style={{ flex: 1 }}>
      <Head>
        <title>{buildTitle('Rencontre Astrologique Gratuite — Trouve ton Âme Sœur par les Étoiles')}</title>
        {buildMetaTags({
          title: 'Rencontre Astrologique Gratuite — Trouve ton Âme Sœur par les Étoiles',
          description: "Aevyra est l'app de rencontre astrologique 100% gratuite. Compatibilité signe astral, matchs guidés par les étoiles. Sans carte bancaire. Inscris-toi maintenant.",
          canonical: `${SITE_URL}/rencontre-astrologique`,
          ogType: 'article',
          ogImage: `${SITE_URL}/og-rencontre-astro.jpg`,
          ogDescription: '🌙 Rencontre astrologique 100% gratuite sur Aevyra. Matchs guidés par les étoiles, compatibilité signe astral. Sans abonnement, sans carte bancaire.',
          ogImageAlt: 'Aevyra rencontre astrologique gratuite — matchs guidés par les étoiles en France',
          twitterTitle: '🌙 Rencontre Astrologique Gratuite — Aevyra',
          twitterDescription: 'Trouve ton âme sœur par astrologie sur Aevyra. Compatibilité signe astral, rencontres sincères. 100% gratuit 🌟',
          keywords: [
            'rencontre astrologique', 'app rencontre astrologique gratuite',
            'compatibilité signe astral', 'rencontre par horoscope',
            'dating astrologie France', 'âme sœur astrologie',
            'rencontre spirituelle gratuite', 'compatibilité amoureuse signe astrologique',
          ],
        }).map((tag, i) =>
          tag.type === 'link'
            ? <link key={i} {...tag.attrs} />
            : <meta key={i} {...tag.attrs} />
        )}
        <script type="application/ld+json">{serializeJsonLd([
          PAGE_SCHEMA,
          buildFAQSchema(PAGE_FAQS),
          buildBreadcrumbSchema([
            { name: 'Accueil', url: `${SITE_URL}/` },
            { name: 'Rencontre Astrologique', url: `${SITE_URL}/rencontre-astrologique` },
          ]),
        ])}</script>
      </Head>

      <CosmicBackground>
        {/* Header */}
        <View style={{
          paddingTop: insets.top + 8, paddingHorizontal: px, paddingBottom: 12,
          flexDirection: 'row', alignItems: 'center', gap: 12,
        }}>
          <Pressable
            onPress={goBack}
            style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: 'rgba(255,215,0,0.10)',
              borderWidth: 1, borderColor: BORDER,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ChevronLeft size={20} color={GOLD} />
          </Pressable>
          <Text style={{ color: WHITE, fontSize: h3Size, fontWeight: '800', flex: 1 }}>
            Rencontre Astrologique
          </Text>
        </View>

        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          bounces={false}
          contentContainerStyle={{ paddingHorizontal: px, paddingBottom: insets.bottom + 48, gap: 24 }}
        >
          {/* Hero */}
          <LinearGradient
            colors={['rgba(255,215,0,0.12)', 'rgba(13,13,26,0.3)']}
            style={{ borderRadius: 20, padding: 24, gap: 12, borderWidth: 1, borderColor: BORDER }}
          >
            <Text style={{ fontSize: 36 }}>🌟</Text>
            <Text style={{ color: WHITE, fontSize: h2Size, fontWeight: '900', lineHeight: 32 }}>
              Rencontre Astrologique{'\n'}
              <Text style={{ color: GOLD }}>Gratuite</Text>
            </Text>
            <Text style={{ color: MUTED, fontSize: bodySize, lineHeight: 22 }}>
              Aevyra connecte les âmes par compatibilité astrologique profonde.
              Ton signe du zodiaque révèle ta véritable âme sœur.
            </Text>
            <Pressable
              onPress={() => router.push('/(auth)/register' as RelativePathString)}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: 8, backgroundColor: GOLD, borderRadius: 14, paddingVertical: 14,
                paddingHorizontal: 24, marginTop: 4,
              }}
            >
              <Text style={{ color: '#0D0D1A', fontWeight: '900', fontSize: bodySize }}>
                Trouver mon âme sœur gratuitement
              </Text>
              <ArrowRight size={18} color="#0D0D1A" />
            </Pressable>
          </LinearGradient>

          {/* Avantages */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: WHITE, fontSize: h3Size, fontWeight: '800' }}>
              Pourquoi la rencontre astrologique ?
            </Text>
            {AVANTAGES.map((a, _i) => (
              <View style={{
                flexDirection: 'row', gap: 14, padding: 14,
                backgroundColor: BG_CARD, borderRadius: 14,
                borderWidth: 1, borderColor: BORDER, alignItems: 'flex-start',
              }}>
                <View style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: 'rgba(255,215,0,0.10)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {a.icon}
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ color: WHITE, fontWeight: '800', fontSize: bodySize }}>{a.titre}</Text>
                  <Text style={{ color: MUTED, fontSize: bodySize, lineHeight: 18 }}>{a.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Table des signes */}
          <View style={{ gap: 10 }}>
            <Text style={{ color: WHITE, fontSize: h3Size, fontWeight: '800' }}>
              Compatibilités par signe astrologique
            </Text>
            <Text style={{ color: MUTED, fontSize: bodySize, lineHeight: 18 }}>
              Aevyra analyse 5 dimensions pour des compatibilités précises au-delà du simple signe solaire.
            </Text>
            {SIGNES.map((s, _i) => (
              <View style={{
                flexDirection: 'row', gap: 12, padding: 13,
                backgroundColor: BG_CARD, borderRadius: 12,
                borderWidth: 1, borderColor: BORDER, alignItems: 'center',
              }}>
                <Text style={{ fontSize: h2Size, width: 32, textAlign: 'center' }}>{s.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: WHITE, fontWeight: '800', fontSize: bodySize }}>{s.nom}</Text>
                  <Text style={{ color: MUTED, fontSize: captionSize }}>
                    ✨ Compatible avec : {s.compatibles}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* FAQ — contribue aux Rich Results Google AI Overview */}
          <View style={{ gap: 10 }}>
            <Text style={{ color: WHITE, fontSize: h3Size, fontWeight: '800' }}>
              Questions fréquentes — Rencontre Astrologique
            </Text>
            {PAGE_FAQS.map((faq, _i) => (
              <View style={{
                padding: 16, backgroundColor: BG_CARD,
                borderRadius: 14, borderWidth: 1, borderColor: BORDER, gap: 8,
              }}>
                <Text style={{ color: GOLD, fontWeight: '800', fontSize: bodySize }}>
                  Q : {faq.question}
                </Text>
                <Text style={{ color: MUTED, fontSize: bodySize, lineHeight: 19 }}>
                  {faq.answer}
                </Text>
              </View>
            ))}
          </View>

          {/* CTA final */}
          <LinearGradient
            colors={['rgba(255,215,0,0.15)', 'rgba(201,169,110,0.08)']}
            style={{ borderRadius: 20, padding: 24, gap: 14, alignItems: 'center', borderWidth: 1, borderColor: BORDER }}
          >
            <Text style={{ fontSize: 40 }}>✨</Text>
            <Text style={{ color: WHITE, fontSize: h3Size, fontWeight: '900', textAlign: 'center' }}>
              Commence ta rencontre{'\n'}
              <Text style={{ color: GOLD }}>astrologique gratuite</Text>
            </Text>
            <Text style={{ color: MUTED, fontSize: bodySize, textAlign: 'center', lineHeight: 19 }}>
              100% gratuit · Sans carte bancaire · Tes étoiles t'attendent
            </Text>
            <Pressable
              onPress={() => router.push('/(auth)/register' as RelativePathString)}
              style={{
                backgroundColor: GOLD, borderRadius: 14,
                paddingVertical: 14, paddingHorizontal: 32,
                flexDirection: 'row', gap: 8, alignItems: 'center',
              }}
            >
              <Heart size={18} color="#0D0D1A" />
              <Text style={{ color: '#0D0D1A', fontWeight: '900', fontSize: bodySize }}>
                S'inscrire gratuitement
              </Text>
            </Pressable>
          </LinearGradient>
        </ScrollView>
      </CosmicBackground>
    </View>
  );
}
