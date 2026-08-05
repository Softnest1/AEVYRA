// Page SEO longue traîne — "compatibilité astrologique"
// Mots-clés cibles : "compatibilité astrologique", "compatibilité signe astral amour", "test compatibilité horoscope"
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, type RelativePathString } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, ChevronLeft, Star } from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import { useResponsive } from '@/hooks/useResponsive';
import Head from 'expo-router/head';
import { buildTitle, buildMetaTags, serializeJsonLd, buildBreadcrumbSchema, buildFAQSchema, SITE_URL } from '@/hooks/useSEO';

const GOLD   = '#FFD700';
const WHITE  = '#F5E6C8';
const MUTED  = 'rgba(255,255,255,0.65)';
const BG_CARD = 'rgba(255,215,0,0.06)';
const BORDER  = 'rgba(255,215,0,0.18)';

const PAGE_FAQS = [
  {
    question: "Comment calculer la compatibilité astrologique en amour ?",
    answer: "La compatibilité astrologique en amour se calcule en comparant les signes solaires, lunaires, ascendants, Vénus (planète de l'amour) et Mars (planète du désir) de deux personnes. Aevyra effectue ce calcul automatiquement sur 5 dimensions pour un score de compatibilité précis.",
  },
  {
    question: "Quel est le meilleur outil de compatibilité astrologique gratuit ?",
    answer: "Aevyra est l'application de compatibilité astrologique la plus complète et 100% gratuite. Elle analyse 5 dimensions astrologiques (Soleil, Lune, Ascendant, Vénus, Mars) et propose des explications détaillées pour chaque compatibilité.",
  },
  {
    question: "La compatibilité astrologique Vénus et Mars est-elle importante en amour ?",
    answer: "Oui, la compatibilité Vénus-Mars est cruciale en amour. Vénus représente la façon dont on aime et ce qu'on attire. Mars représente la passion, le désir et l'initiative. Aevyra analyse cette dimension en détail pour chaque couple de signes.",
  },
  {
    question: "Peut-on trouver l'amour avec une compatibilité astrologique difficile ?",
    answer: "Absolument. Une compatibilité difficile (ex. Bélier-Cancer) peut créer une attraction magnétique et une complémentarité enrichissante. Aevyra explique les forces et défis de chaque combinaison pour vous aider à naviguer votre relation.",
  },
  {
    question: "Quelle est la différence entre ascendant et signe solaire pour la compatibilité ?",
    answer: "Le signe solaire représente votre personnalité profonde. L'ascendant représente comment vous vous présentez aux autres et votre première impression. Pour la compatibilité amoureuse, les deux sont importants — Aevyra les analyse simultanément.",
  },
];

const DIMENSIONS = [
  {
    planete: '☀️ Soleil', titre: 'Personnalité Profonde',
    desc: 'Votre signe solaire révèle votre essence, vos valeurs fondamentales et votre façon d\'être dans une relation.',
    exemple: 'Lion ☀️ + Bélier ☀️ = Passion ardente partagée',
  },
  {
    planete: '🌙 Lune', titre: 'Émotions & Besoins',
    desc: 'La Lune révèle vos besoins émotionnels profonds, votre style d\'attachement et votre façon de donner/recevoir de l\'affection.',
    exemple: 'Cancer 🌙 + Scorpion 🌙 = Profondeur émotionnelle intense',
  },
  {
    planete: '⬆️ Ascendant', titre: 'Première Impression',
    desc: 'L\'ascendant détermine votre apparence extérieure et l\'attirance physique initiale — la "chimie" au premier regard.',
    exemple: 'Balance Asc. + Gémeaux Asc. = Attirance intellectuelle immédiate',
  },
  {
    planete: '💕 Vénus', titre: 'Style d\'Amour',
    desc: 'Vénus révèle comment vous aimez, ce que vous appréciez chez un partenaire et votre idéal romantique.',
    exemple: 'Taureau ♀ + Vierge ♀ = Amour stable et matériel partagé',
  },
  {
    planete: '🔥 Mars', titre: 'Passion & Désir',
    desc: 'Mars révèle votre énergie sexuelle, votre façon d\'initier et votre dynamique de désir dans la relation.',
    exemple: 'Scorpion ♂ + Capricorne ♂ = Intensité et ambition communes',
  },
];

const PAGE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${SITE_URL}/compatibilite-astrologique#webpage`,
  url: `${SITE_URL}/compatibilite-astrologique`,
  name: 'Compatibilité Astrologique en Amour — Test Gratuit | Aevyra',
  description: "Test de compatibilité astrologique gratuit sur Aevyra. Analyse 5 dimensions : Soleil, Lune, Ascendant, Vénus, Mars. Trouve ton partenaire idéal par les étoiles.",
  inLanguage: ['fr-FR', 'en-GB'],
  isPartOf: { '@id': `${SITE_URL}/#website` },
  publisher: { '@id': `${SITE_URL}/#organization` },
  keywords: 'compatibilité astrologique, test compatibilité horoscope gratuit, compatibilité signe astral amour, compatibilité Vénus Mars astrologie',
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Compatibilité Astrologique', item: `${SITE_URL}/compatibilite-astrologique` },
    ],
  },
};

export default function CompatibiliteAstrologique() { 
  const insets = useSafeAreaInsets();
  const { px, bodySize, captionSize, h2Size, h3Size, gap: _gap, contentMaxWidth: _contentMaxWidth, iconSize: _iconSize  } = useResponsive();
  const goBack = () => {
    if (router.canGoBack()) { router.back(); return; }
    router.replace('/' as RelativePathString);
  };

  return (
    <View style={{ flex: 1 }}>
      <Head>
        <title>{buildTitle('Compatibilité Astrologique — Test Gratuit & Précis par Signe Astral')}</title>
        {buildMetaTags({
          title: 'Compatibilité Astrologique — Test Gratuit & Précis par Signe Astral',
          description: "Test de compatibilité astrologique gratuit. Analyse 5 dimensions : Soleil, Lune, Ascendant, Vénus, Mars. Trouve ton partenaire idéal sur Aevyra. Sans carte bancaire.",
          canonical: `${SITE_URL}/compatibilite-astrologique`,
          ogType: 'article',
          ogImage: `${SITE_URL}/og-compatibilite.jpg`,
          ogDescription: '🔮 Test compatibilité astrologique gratuit sur Aevyra. Analyse Soleil, Lune, Ascendant, Vénus & Mars. Trouve ton partenaire idéal. Sans carte bancaire.',
          ogImageAlt: 'Test de compatibilité astrologique Aevyra — Analyse 5 dimensions : Soleil, Lune, Ascendant, Vénus, Mars',
          twitterTitle: '🔮 Test Compatibilité Astrologique Gratuit — Aevyra',
          twitterDescription: 'Analyse ta compatibilité astrologique sur 5 dimensions : Soleil, Lune, Ascendant, Vénus & Mars. 100% gratuit sur Aevyra ✨',
          keywords: [
            'compatibilité astrologique', 'test compatibilité horoscope gratuit',
            'compatibilité signe astral amour', 'compatibilité Vénus Mars astrologie',
            'compatibilité amoureuse signe', 'calculer compatibilité astrologique',
            'compatibilité ascendant lune amour', 'test amour astrologie gratuit',
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
            { name: 'Compatibilité Astrologique', url: `${SITE_URL}/compatibilite-astrologique` },
          ]),
        ])}</script>
      </Head>

      <CosmicBackground>
        {/* Header */}
        <View style={{
          paddingTop: insets.top + 8, paddingHorizontal: px, paddingBottom: 12,
          flexDirection: 'row', alignItems: 'center', gap: 12,
        }}>
          <Pressable onPress={goBack} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,215,0,0.10)', borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={20} color={GOLD} />
          </Pressable>
          <Text style={{ color: WHITE, fontSize: h3Size, fontWeight: '800', flex: 1 }}>
            Compatibilité Astrologique
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
            <Text style={{ fontSize: 36 }}>💫</Text>
            <Text style={{ color: WHITE, fontSize: h2Size, fontWeight: '900', lineHeight: 32 }}>
              Compatibilité{'\n'}
              <Text style={{ color: GOLD }}>Astrologique</Text>
            </Text>
            <Text style={{ color: MUTED, fontSize: bodySize, lineHeight: 22 }}>
              Aevyra analyse 5 dimensions astrologiques pour calculer ta compatibilité amoureuse
              avec une précision inégalée. 100% gratuit.
            </Text>
            <Pressable
              onPress={() => router.push('/(auth)/register' as RelativePathString)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: GOLD, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, marginTop: 4 }}
            >
              <Text style={{ color: '#0D0D1A', fontWeight: '900', fontSize: bodySize }}>
                Tester ma compatibilité gratuitement
              </Text>
              <ArrowRight size={18} color="#0D0D1A" />
            </Pressable>
          </LinearGradient>

          {/* 5 dimensions */}
          <View style={{ gap: 10 }}>
            <Text style={{ color: WHITE, fontSize: h3Size, fontWeight: '800' }}>
              Les 5 dimensions de compatibilité Aevyra
            </Text>
            <Text style={{ color: MUTED, fontSize: bodySize, lineHeight: 18, marginBottom: 4 }}>
              Contrairement aux apps qui comparent uniquement les signes solaires,
              Aevyra analyse 5 couches astrologiques pour une compatibilité réellement précise.
            </Text>
            {DIMENSIONS.map((d, _i) => (
              <View style={{ padding: 16, backgroundColor: BG_CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: h2Size }}>{d.planete}</Text>
                  <Text style={{ color: GOLD, fontWeight: '900', fontSize: bodySize }}>{d.titre}</Text>
                </View>
                <Text style={{ color: MUTED, fontSize: bodySize, lineHeight: 18 }}>{d.desc}</Text>
                <View style={{ backgroundColor: 'rgba(255,215,0,0.06)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,215,0,0.10)' }}>
                  <Text style={{ color: 'rgba(255,215,0,0.65)', fontSize: captionSize, fontStyle: 'italic' }}>
                    Ex : {d.exemple}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Comparatif vs concurrents — signal EEAT */}
          <View style={{
            padding: 16, backgroundColor: 'rgba(135,206,235,0.06)',
            borderRadius: 14, borderWidth: 1, borderColor: 'rgba(135,206,235,0.18)', gap: 12,
          }}>
            <Text style={{ color: '#87CEEB', fontWeight: '900', fontSize: bodySize }}>
              🆚 Aevyra vs autres apps de rencontre
            </Text>
            {[
              { app: 'Tinder / Bumble', note: '❌ Aucune compatibilité — photo uniquement' },
              { app: 'OkCupid', note: '⚠️ Quelques questions — pas d\'astrologie' },
              { app: 'Aevyra', note: '✅ 5 dimensions astrologiques — 100% gratuit' },
            ].map((r, i) => (
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Star size={14} color={i === 2 ? GOLD : MUTED} />
                <Text style={{ color: i === 2 ? WHITE : MUTED, flex: 1, fontSize: bodySize }}>
                  <Text style={{ fontWeight: '700' }}>{r.app}</Text> — {r.note}
                </Text>
              </View>
            ))}
          </View>

          {/* FAQ */}
          <View style={{ gap: 10 }}>
            <Text style={{ color: WHITE, fontSize: h3Size, fontWeight: '800' }}>
              FAQ — Compatibilité Astrologique
            </Text>
            {PAGE_FAQS.map((faq, _i) => (
              <View style={{ padding: 16, backgroundColor: BG_CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, gap: 8 }}>
                <Text style={{ color: GOLD, fontWeight: '800', fontSize: bodySize }}>Q : {faq.question}</Text>
                <Text style={{ color: MUTED, fontSize: bodySize, lineHeight: 19 }}>{faq.answer}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <LinearGradient
            colors={['rgba(255,215,0,0.15)', 'rgba(201,169,110,0.08)']}
            style={{ borderRadius: 20, padding: 24, gap: 14, alignItems: 'center', borderWidth: 1, borderColor: BORDER }}
          >
            <Text style={{ fontSize: 40 }}>💫</Text>
            <Text style={{ color: WHITE, fontSize: h3Size, fontWeight: '900', textAlign: 'center' }}>
              Découvre ta compatibilité{'\n'}
              <Text style={{ color: GOLD }}>astrologique gratuite</Text>
            </Text>
            <Pressable
              onPress={() => router.push('/(auth)/register' as RelativePathString)}
              style={{ backgroundColor: GOLD, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, flexDirection: 'row', gap: 8, alignItems: 'center' }}
            >
              <Text style={{ color: '#0D0D1A', fontWeight: '900', fontSize: bodySize }}>
                Créer mon profil gratuit
              </Text>
              <ArrowRight size={18} color="#0D0D1A" />
            </Pressable>
          </LinearGradient>
        </ScrollView>
      </CosmicBackground>
    </View>
  );
}
