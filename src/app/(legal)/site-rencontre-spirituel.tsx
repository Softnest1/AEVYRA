// Page SEO longue traîne — "site rencontre spirituel"
// Mot-clé cible : "site rencontre spirituel", "rencontre spirituelle gratuite", "dating spirituel France"
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, type RelativePathString } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, ChevronLeft, Star } from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import { useResponsive } from '@/hooks/useResponsive';
import Head from 'expo-router/head';
import { buildMetaTags, serializeJsonLd, buildBreadcrumbSchema, buildFAQSchema, SITE_URL } from '@/hooks/useSEO';

const GOLD    = '#FFD700';
const WHITE   = '#F5E6C8';
const MUTED   = 'rgba(255,255,255,0.65)';
const BG_CARD = 'rgba(192,132,252,0.06)';
const BORDER  = 'rgba(192,132,252,0.18)';
const PURPLE  = '#C084FC';

const PAGE_FAQS = [
  {
    question: "Qu'est-ce qu'une rencontre spirituelle ?",
    answer: "Une rencontre spirituelle va au-delà de l'apparence physique. Elle repose sur des valeurs profondes, une connexion d'âme, une vision commune de la vie et souvent une affinité avec des pratiques comme l'astrologie, la méditation, ou la croissance personnelle. Aevyra facilite ces connexions authentiques.",
  },
  {
    question: "Existe-t-il un site de rencontre spirituelle gratuit en France ?",
    answer: "Oui — Aevyra est le premier site de rencontre spirituelle 100% gratuit en France. Inscriptions, matchs, messagerie et appels vidéo : tout est accessible sans abonnement ni carte bancaire.",
  },
  {
    question: "Comment trouver son âme sœur spirituelle ?",
    answer: "Sur Aevyra, vous renseignez votre signe astrologique complet (solaire, lunaire, ascendant), votre énergie romantique et vos valeurs profondes. L'algorithme identifie les âmes les plus compatibles sur ces 5 dimensions spirituelles et énergétiques.",
  },
  {
    question: "La rencontre spirituelle est-elle différente du dating classique ?",
    answer: "Absolument. Le dating classique priorise l'apparence et la localisation. La rencontre spirituelle cherche la résonance intérieure : valeurs partagées, vision de l'amour, connexion énergétique. Aevyra est conçu spécifiquement pour ce type de rencontre profonde.",
  },
  {
    question: "L'astrologie est-elle fiable pour les rencontres amoureuses ?",
    answer: "Des millions de personnes utilisent l'astrologie comme guide de vie depuis des millénaires. Sur Aevyra, l'astrologie est un outil de connaissance de soi et de l'autre — pas une vérité absolue. Combinée à d'autres critères (valeurs, style d'amour), elle aide à identifier des connexions profondes et durables.",
  },
];

const PAGE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${SITE_URL}/site-rencontre-spirituel#webpage`,
  url: `${SITE_URL}/site-rencontre-spirituel`,
  name: 'Site de Rencontre Spirituelle Gratuit — Aevyra',
  description: 'Aevyra est le premier site de rencontre spirituelle gratuit en France. Connexions d\'âmes par astrologie, valeurs et énergie romantique. Sans abonnement.',
  inLanguage: ['fr-FR'],
  isPartOf: { '@id': `${SITE_URL}/#website` },
  publisher: { '@id': `${SITE_URL}/#organization` },
};

const TITLE = 'Site de Rencontre Spirituelle Gratuit — Aevyra';
const DESC  = 'Aevyra est le premier site de rencontre spirituelle gratuit en France. Connexions d\'âmes par astrologie, valeurs profondes et énergie romantique. Sans abonnement, sans carte bancaire.';

const DIMS = [
  { emoji: '☀️', nom: 'Signe Solaire',     desc: 'Votre personnalité de surface, la façon dont vous vous montrez au monde.' },
  { emoji: '🌙', nom: 'Signe Lunaire',     desc: 'Vos émotions profondes, vos besoins intérieurs et votre monde intérieur secret.' },
  { emoji: '⬆️', nom: 'Ascendant',         desc: 'Votre première impression, votre énergie physique et votre façon d\'apparaître.' },
  { emoji: '💕', nom: 'Vénus',             desc: 'Votre style amoureux, ce que vous donnez et cherchez en amour.' },
  { emoji: '🔥', nom: 'Mars',              desc: 'Votre désir, votre passion et votre façon d\'agir en relation.' },
];

export default function SiteRencontreSpirituell() { 
  const insets = useSafeAreaInsets();
  const { px, bodySize, captionSize: _captionSize, h2Size, h3Size, gap: _gap, contentMaxWidth: _contentMaxWidth, iconSize: _iconSize  } = useResponsive();
  const metaTags = buildMetaTags({
    title: TITLE,
    description: DESC,
    canonical: `${SITE_URL}/site-rencontre-spirituel`,
    ogImage: `${SITE_URL}/og-spirituel.jpg`,
    ogDescription: '✨ Premier site de rencontre spirituelle gratuit en France. Connexions d\'âmes par astrologie, valeurs & énergie romantique. Sans abonnement sur Aevyra.',
    ogImageAlt: 'Aevyra — Site de rencontre spirituelle gratuit : connexions d\'âmes par astrologie et valeurs',
    twitterTitle: '✨ Rencontre Spirituelle Gratuite — Aevyra',
    twitterDescription: 'Le premier site de rencontre spirituelle gratuit en France. Connexions d\'âmes sincères guidées par l\'astrologie. Sans abonnement 🌙',
  });
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Accueil', url: SITE_URL },
    { name: 'Rencontre Spirituelle', url: `${SITE_URL}/site-rencontre-spirituel` },
  ]);
  const faqSchema = buildFAQSchema(PAGE_FAQS);
  const allSchemas = [PAGE_SCHEMA, breadcrumb, faqSchema];

  return (
    <View style={{ flex: 1 }}>
      {process.env.EXPO_OS === 'web' && (
        <Head>
          <title>{TITLE}</title>
          {metaTags.map((t, i) => t.type === 'meta'
            ? <meta key={i} {...t.attrs} />
            : <link key={i} {...t.attrs} />)}
          <script type="application/ld+json">{serializeJsonLd(allSchemas)}</script>
        </Head>
      )}

      <CosmicBackground>
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: px, paddingBottom: 12 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <ChevronLeft size={20} color={GOLD} />
            <Text style={{ color: GOLD, fontSize: bodySize, fontWeight: '600' }}>Retour</Text>
          </Pressable>
        </View>

        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: px, paddingBottom: insets.bottom + 48, gap: 24 }}
        >
          {/* ── Hero ── */}
          <View style={{ alignItems: 'center', gap: 12, paddingTop: 8 }}>
            <Text style={{ fontSize: 52 }}>✨</Text>
            <Text style={{ color: PURPLE, fontSize: h2Size, fontWeight: '900', textAlign: 'center', lineHeight: 34 }}>
              Rencontre Spirituelle
            </Text>
            <Text style={{ color: WHITE, fontSize: h3Size, textAlign: 'center', lineHeight: 26, opacity: 0.85 }}>
              Le premier site de rencontre spirituelle gratuit en France.{'\n'}
              <Text style={{ fontWeight: '800', color: GOLD }}>Connexions d'âmes guidées par les étoiles.</Text>
            </Text>
          </View>

          {/* ── Qu'est-ce qu'une rencontre spirituelle ── */}
          <LinearGradient
            colors={['rgba(192,132,252,0.12)', 'rgba(75,0,130,0.10)']}
            style={{ borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(192,132,252,0.25)', gap: 10 }}
          >
            <Text style={{ color: PURPLE, fontWeight: '900', fontSize: 17 }}>
              Qu'est-ce qu'une Rencontre Spirituelle ?
            </Text>
            <Text style={{ color: MUTED, fontSize: bodySize, lineHeight: 22 }}>
              Une rencontre spirituelle va au-delà de l'apparence. Elle cherche la{' '}
              <Text style={{ color: WHITE, fontWeight: '700' }}>résonance des âmes</Text> : valeurs partagées,
              vision de l'amour, connexion énergétique profonde. Aevyra est né de cette conviction.
            </Text>
          </LinearGradient>

          {/* ── 5 dimensions ── */}
          <Text style={{ color: WHITE, fontSize: h3Size, fontWeight: '800', textAlign: 'center' }}>
            5 Dimensions de Compatibilité Spirituelle
          </Text>
          <View style={{ gap: 10 }}>
            {DIMS.map((d) => (
              <LinearGradient
                key={d.nom}
                colors={[BG_CARD, 'rgba(13,13,26,0.6)']}
                style={{
                  borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER,
                  flexDirection: 'row', alignItems: 'flex-start', gap: 14,
                }}
              >
                <Text style={{ fontSize: 28 }}>{d.emoji}</Text>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ color: WHITE, fontWeight: '800', fontSize: bodySize }}>{d.nom}</Text>
                  <Text style={{ color: MUTED, fontSize: bodySize, lineHeight: 19 }}>{d.desc}</Text>
                  <Text style={{ color: WHITE, fontWeight: '800', fontSize: 15 }}>{d.nom}</Text>
                  <Text style={{ color: MUTED, fontSize: 13, lineHeight: 19 }}>{d.desc}</Text>
                </View>
              </LinearGradient>
            ))}
          </View>

          {/* ── Pourquoi Aevyra ── */}
          <LinearGradient
            colors={['rgba(114,47,55,0.25)', 'rgba(75,0,130,0.20)']}
            style={{ borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(192,132,252,0.2)', gap: 12 }}
          >
            <Text style={{ color: WHITE, fontWeight: '900', fontSize: h3Size, textAlign: 'center' }}>
              Pourquoi Choisir Aevyra ?
            </Text>
            {[
              '100% gratuit — sans abonnement, sans carte bancaire',
              'Zéro faux profils — vérification humaine de chaque membre',
              'Algorithme de compatibilité sur 5 dimensions astrales',
              'Messagerie illimitée — la Plume d\'Or, notre salon privé',
              'Communauté de célibataires spirituels sincères',
            ].map((point) => (
              <React.Fragment key={point}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <Star size={16} color={GOLD} style={{ marginTop: 3 }} />
                  <Text style={{ color: MUTED, fontSize: bodySize, lineHeight: 20, flex: 1 }}>{point}</Text>
                </View>
              </React.Fragment>
            ))}
          </LinearGradient>

          {/* ── FAQ ── */}
          <Text style={{ color: WHITE, fontSize: h3Size, fontWeight: '800', textAlign: 'center' }}>Questions Fréquentes</Text>
          <View style={{ gap: 12 }}>
            {PAGE_FAQS.map((faq) => (
              <React.Fragment key={faq.question}>
                <View style={{
                  backgroundColor: BG_CARD, borderRadius: 16, padding: 16,
                  borderWidth: 1, borderColor: BORDER, gap: 8,
                }}>
                  <Text style={{ color: PURPLE, fontWeight: '800', fontSize: bodySize, lineHeight: 20 }}>{faq.question}</Text>
                  <Text style={{ color: MUTED, fontSize: bodySize, lineHeight: 20 }}>{faq.answer}</Text>
                  <Text style={{ color: PURPLE, fontWeight: '800', fontSize: 14, lineHeight: 20 }}>{faq.question}</Text>
                  <Text style={{ color: MUTED, fontSize: 13, lineHeight: 20 }}>{faq.answer}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          {/* ── CTA ── */}
          <LinearGradient
            colors={['rgba(192,132,252,0.15)', 'rgba(75,0,130,0.12)']}
            style={{ borderRadius: 22, padding: 24, borderWidth: 1, borderColor: 'rgba(192,132,252,0.3)', alignItems: 'center', gap: 12 }}
          >
            <Text style={{ fontSize: 36 }}>🌙</Text>
            <Text style={{ color: WHITE, fontSize: 19, fontWeight: '900', textAlign: 'center' }}>
              Votre âme sœur spirituelle vous attend
            </Text>
            <Text style={{ color: MUTED, fontSize: bodySize, textAlign: 'center', lineHeight: 20 }}>
              Rejoignez des milliers de célibataires spirituels sur Aevyra. Gratuit, sans carte bancaire.
            </Text>
            <Pressable
              onPress={() => router.push('/(auth)/register' as RelativePathString)}
              accessibilityRole="button"
              accessibilityLabel="S'inscrire gratuitement"
              style={{
                backgroundColor: GOLD, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28,
                flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4,
              }}
            >
              <Text style={{ color: '#0D0D1A', fontWeight: '900', fontSize: h3Size }}>Commencer Gratuitement</Text>
              <ArrowRight size={18} color="#0D0D1A" />
            </Pressable>
          </LinearGradient>
        </ScrollView>
      </CosmicBackground>
    </View>
  );
}
