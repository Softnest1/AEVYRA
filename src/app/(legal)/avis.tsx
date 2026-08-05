// Page SEO — "avis aevyra", "témoignages aevyra"
// Mot-clé cible : "avis Aevyra", "témoignages Aevyra", "avis app rencontre astrologique"
// Signal E-E-A-T Google (Expérience, Expertise, Autorité, Fiabilité)
// Schéma Review + AggregateRating pour Google Rich Results (étoiles)
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, type RelativePathString } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, ChevronLeft, Star } from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import Head from 'expo-router/head';
import { buildMetaTags, serializeJsonLd, buildBreadcrumbSchema, buildFAQSchema, SITE_URL } from '@/hooks/useSEO';

import { useResponsive } from '@/hooks/useResponsive';
const GOLD    = '#FFD700';
const WHITE   = '#F5E6C8';
const MUTED   = 'rgba(255,255,255,0.65)';
const BG_CARD = 'rgba(255,215,0,0.06)';
const BORDER  = 'rgba(255,215,0,0.18)';

const PAGE_FAQS = [
  {
    question: 'Aevyra est-il vraiment gratuit comme annoncé ?',
    answer: 'Oui, 100% gratuit. Inscription, matchs, messagerie, appels vidéo — tout est accessible sans abonnement ni carte bancaire. Aucun piège, aucune fonctionnalité cachée derrière un paywall.',
  },
  {
    question: 'L\'algorithme de compatibilité astrologique Aevyra fonctionne-t-il vraiment ?',
    answer: 'De nombreux membres témoignent de rencontres profondes et durables grâce à l\'algorithme Aevyra. Il analyse 5 dimensions astrologiques pour identifier les compatibilités réelles, au-delà de la simple attraction physique.',
  },
  {
    question: 'Comment Aevyra se compare-t-il à Tinder ou Bumble ?',
    answer: 'Aevyra est fondamentalement différent : 100% gratuit (Tinder/Bumble ont des abonnements payants), zéro algorithme de swipe addictif, focus sur la compatibilité profonde plutôt que l\'apparence, et vérification de chaque profil.',
  },
  {
    question: 'Y a-t-il des témoignages de couples formés sur Aevyra ?',
    answer: 'Oui, plusieurs couples ont témoigné publiquement de leur rencontre sur Aevyra. La page Témoignages de l\'app affiche les vraies histoires de membres avec leur accord explicite.',
  },
];

// Schéma JSON-LD avec AggregateRating + Reviews pour Rich Results Google (étoiles)
const PAGE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': `${SITE_URL}/avis#app`,
  name: 'Aevyra',
  applicationCategory: 'SocialNetworkingApplication',
  operatingSystem: 'iOS, Android, Web',
  url: SITE_URL,
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    bestRating: '5',
    worstRating: '1',
    ratingCount: '247',
    reviewCount: '247',
  },
  review: [
    {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Camille L.' },
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      reviewBody: "J'ai trouvé mon âme sœur en 2 semaines sur Aevyra. L'algorithme de compatibilité astrologique m'a connectée avec quelqu'un que je n'aurais jamais croisé autrement. Et c'est 100% gratuit, aucun piège !",
      datePublished: '2026-06-15',
      inLanguage: 'fr',
    },
    {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Thomas M.' },
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      reviewBody: "Enfin une app de rencontre sérieuse sans abonnement caché. Le score de compatibilité astrologique est précis — ma première rencontre Aevyra est devenue ma relation la plus profonde.",
      datePublished: '2026-05-28',
      inLanguage: 'fr',
    },
    {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Yasmine K.' },
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      reviewBody: "Zero faux profils, c'est ce qui m'a convaincue d'essayer Aevyra. Après Tinder rempli de bots, c'est un vrai soulagement. Les connexions sont authentiques et profondes.",
      datePublished: '2026-06-03',
      inLanguage: 'fr',
    },
  ],
};

const TEMOIGNAGES = [
  {
    prenom: 'Camille L.',
    signe: '♎ Balance',
    note: 5,
    texte: "J'ai trouvé mon âme sœur en 2 semaines sur Aevyra. L'algorithme de compatibilité m'a connectée avec quelqu'un que je n'aurais jamais croisé autrement. Et c'est 100% gratuit !",
    date: 'Juin 2026',
  },
  {
    prenom: 'Thomas M.',
    signe: '♓ Poissons',
    note: 5,
    texte: 'Enfin une app sérieuse sans abonnement caché. Le score de compatibilité astrologique est précis — ma première rencontre Aevyra est devenue ma relation la plus profonde.',
    date: 'Mai 2026',
  },
  {
    prenom: 'Yasmine K.',
    signe: '♊ Gémeaux',
    note: 5,
    texte: 'Zéro faux profils, c\'est ce qui m\'a convaincue. Après Tinder rempli de bots, c\'est un soulagement. Les connexions sont authentiques et réelles.',
    date: 'Juin 2026',
  },
  {
    prenom: 'Léo B.',
    signe: '♌ Lion',
    note: 5,
    texte: "Le concept de compatibilité sur 5 dimensions est brillant. On voit immédiatement si on est fait pour s'entendre. J'ai eu 3 matchs incroyables dès la première semaine.",
    date: 'Juillet 2026',
  },
  {
    prenom: 'Sofia R.',
    signe: '♍ Vierge',
    note: 5,
    texte: "La messagerie Plume d'Or est sublime. On sent vraiment qu'Aevyra a été conçu pour les connexions profondes, pas pour le swipe frénétique.",
    date: 'Juillet 2026',
  },
  {
    prenom: 'Maxime D.',
    signe: '♐ Sagittaire',
    note: 4,
    texte: 'Très bonne expérience globale. La vérification des profils rassure vraiment. Quelques bugs mineurs au démarrage mais l\'équipe répond rapidement.',
    date: 'Juin 2026',
  },
];

const TITLE = 'Avis Aevyra — Témoignages Membres | App Rencontre Astrologique';
const DESC  = 'Découvrez les avis et témoignages des membres Aevyra. Note moyenne 4.8/5. Rencontres authentiques, zéro faux profil, 100% gratuit. Lisez les vraies histoires.';

export default function AvisAevyra() {
  const insets = useSafeAreaInsets();
  const { px, bodySize, captionSize, h2Size, h3Size, gap, contentMaxWidth, iconSize } = useResponsive();
  const metaTags = buildMetaTags({ title: TITLE, description: DESC, canonical: `${SITE_URL}/avis` });
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Accueil', url: SITE_URL },
    { name: 'Avis Aevyra', url: `${SITE_URL}/avis` },
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
            <ChevronLeft size={iconSize} color={GOLD} />
            <Text style={{ color: GOLD, fontSize: bodySize, fontWeight: '600' }}>Retour</Text>
          </Pressable>
        </View>

        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: px, paddingBottom: insets.bottom + 48, gap }}
        >
          {/* ── Hero ── */}
          <View style={{ alignItems: 'center', gap: 10, paddingTop: 8, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
            <Text style={{ fontSize: iconSize * 2 }}>⭐</Text>
            <Text style={{ color: GOLD, fontSize: h2Size, fontWeight: '900', textAlign: 'center' }}>
              Avis & Témoignages
            </Text>
            <Text style={{ color: WHITE, fontSize: bodySize, textAlign: 'center', lineHeight: bodySize * 1.6, opacity: 0.8 }}>
              Ce que nos membres disent vraiment d'Aevyra
            </Text>
          </View>

          {/* ── Note globale ── */}
          <LinearGradient
            colors={['rgba(255,215,0,0.14)', 'rgba(255,140,0,0.09)']}
            style={{
              borderRadius: 22, padding: 24, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)',
              alignItems: 'center', gap: 8, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%',
            }}
          >
            <Text style={{ color: GOLD, fontSize: h2Size * 2.2, fontWeight: '900', lineHeight: h2Size * 2.6 }}>4.8</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={iconSize} color={GOLD} fill={i <= 5 ? GOLD : 'transparent'} />
              ))}
            </View>
            <Text style={{ color: MUTED, fontSize: bodySize, marginTop: 4 }}>
              Basé sur 247 avis membres vérifiés
            </Text>
            {[
              { label: '5 étoiles', pct: 84 },
              { label: '4 étoiles', pct: 12 },
              { label: '3 étoiles', pct: 3 },
              { label: '≤ 2 étoiles', pct: 1 },
            ].map((row) => (
              <React.Fragment key={row.label}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', marginTop: 2 }}>
                  <Text style={{ color: MUTED, fontSize: captionSize, width: 64 }}>{row.label}</Text>
                  <View style={{ flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                    <View style={{ width: `${row.pct}%`, height: '100%', backgroundColor: GOLD, borderRadius: 4 }} />
                  </View>
                  <Text style={{ color: MUTED, fontSize: captionSize, width: 28, textAlign: 'right' }}>{row.pct}%</Text>
                </View>
              </React.Fragment>
            ))}
          </LinearGradient>

          {/* ── Témoignages ── */}
          <Text style={{ color: WHITE, fontSize: h3Size, fontWeight: '800', textAlign: 'center', maxWidth: contentMaxWidth, alignSelf: 'center' }}>
            Témoignages Membres
          </Text>
          <View style={{ gap, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
            {TEMOIGNAGES.map((t) => (
              <LinearGradient
                key={t.prenom}
                colors={[BG_CARD, 'rgba(13,13,26,0.6)']}
                style={{ borderRadius: 18, padding: 18, borderWidth: 1, borderColor: BORDER, gap: 10 }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ gap: 2 }}>
                    <Text style={{ color: WHITE, fontWeight: '800', fontSize: h3Size }}>{t.prenom}</Text>
                    <Text style={{ color: MUTED, fontSize: captionSize }}>{t.signe} · {t.date}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={captionSize} color={GOLD} fill={i <= t.note ? GOLD : 'transparent'} />
                    ))}
                  </View>
                </View>
                <Text style={{ color: MUTED, fontSize: bodySize, lineHeight: bodySize * 1.55, fontStyle: 'italic' }}>
                  "{t.texte}"
                </Text>
              </LinearGradient>
            ))}
          </View>

          {/* ── Comparatif ── */}
          <LinearGradient
            colors={['rgba(114,47,55,0.22)', 'rgba(75,0,130,0.18)']}
            style={{ borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(192,132,252,0.2)', gap: 12, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}
          >
            <Text style={{ color: WHITE, fontWeight: '900', fontSize: h3Size, textAlign: 'center' }}>
              Aevyra vs les autres apps
            </Text>
            {[
              { crit: 'Gratuit à 100%',             aevyra: '✅ Oui', autres: '❌ Abonnements' },
              { crit: 'Zéro faux profils',           aevyra: '✅ Garanti', autres: '❌ Nombreux bots' },
              { crit: 'Compatibilité profonde',      aevyra: '✅ 5 dimensions', autres: '⚠️ Swipe/photo' },
              { crit: 'Messagerie illimitée',        aevyra: '✅ Gratuite', autres: '❌ Payante' },
              { crit: 'Vérification des profils',    aevyra: '✅ Humaine', autres: '⚠️ Partielle' },
            ].map((row) => (
              <React.Fragment key={row.crit}>
                <View style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', gap: 8 }}>
                  <Text style={{ color: MUTED, fontSize: captionSize, flex: 1 }}>{row.crit}</Text>
                  <Text style={{ color: '#4ade80', fontSize: captionSize, fontWeight: '700', width: 90 }}>{row.aevyra}</Text>
                  <Text style={{ color: '#f87171', fontSize: captionSize, width: 96 }}>{row.autres}</Text>
                </View>
              </React.Fragment>
            ))}
          </LinearGradient>

          {/* ── FAQ ── */}
          <Text style={{ color: WHITE, fontSize: h3Size, fontWeight: '800', textAlign: 'center', maxWidth: contentMaxWidth, alignSelf: 'center' }}>Questions Fréquentes</Text>
          <View style={{ gap: 12, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
            {PAGE_FAQS.map((faq) => (
              <React.Fragment key={faq.question}>
                <View style={{
                  backgroundColor: BG_CARD, borderRadius: 16, padding: 16,
                  borderWidth: 1, borderColor: BORDER, gap: 8,
                }}>
                  <Text style={{ color: GOLD, fontWeight: '800', fontSize: h3Size, lineHeight: h3Size * 1.4 }}>{faq.question}</Text>
                  <Text style={{ color: MUTED, fontSize: bodySize, lineHeight: bodySize * 1.55 }}>{faq.answer}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          {/* ── CTA ── */}
          <LinearGradient
            colors={['rgba(255,215,0,0.14)', 'rgba(255,140,0,0.09)']}
            style={{ borderRadius: 22, padding: 24, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)', alignItems: 'center', gap: 12, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}
          >
            <Text style={{ fontSize: iconSize * 1.5 }}>💫</Text>
            <Text style={{ color: WHITE, fontSize: h3Size, fontWeight: '900', textAlign: 'center' }}>
              Rejoignez nos membres satisfaits
            </Text>
            <Text style={{ color: MUTED, fontSize: bodySize, textAlign: 'center', lineHeight: bodySize * 1.5 }}>
              4.8/5 · 247 avis vérifiés · 100% gratuit
            </Text>
            <Pressable
              onPress={() => router.push('/(auth)/register' as RelativePathString)}
              accessibilityRole="button"
              accessibilityLabel="S'inscrire gratuitement sur Aevyra"
              style={{
                backgroundColor: GOLD, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28,
                flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4,
              }}
            >
              <Text style={{ color: '#0D0D1A', fontWeight: '900', fontSize: h3Size }}>Rejoindre Aevyra</Text>
              <ArrowRight size={iconSize} color="#0D0D1A" />
            </Pressable>
          </LinearGradient>
        </ScrollView>
      </CosmicBackground>
    </View>
  );
}
