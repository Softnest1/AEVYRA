// Page SEO longue traîne — "rencontre sans faux profils"
// Mot-clé cible : "rencontre sans faux profils", "site rencontre authentique", "app rencontre vérifiée"
// Différenciateur N°1 Aevyra — capte une intention ultra-qualifiée
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, type RelativePathString } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, ChevronLeft, Shield, CheckCircle } from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import { useResponsive } from '@/hooks/useResponsive';
import Head from 'expo-router/head';
import { buildMetaTags, serializeJsonLd, buildBreadcrumbSchema, buildFAQSchema, SITE_URL } from '@/hooks/useSEO';

const GOLD    = '#FFD700';
const WHITE   = '#F5E6C8';
const MUTED   = 'rgba(255,255,255,0.65)';
const BG_CARD = 'rgba(255,215,0,0.06)';
const BORDER  = 'rgba(255,215,0,0.18)';

const PAGE_FAQS = [
  {
    question: 'Comment Aevyra garantit-il zéro faux profil ?',
    answer: "Aevyra utilise une vérification humaine de chaque inscription : photo de profil obligatoire, validation manuelle par l'équipe, score de fiabilité visible sur chaque profil, et système de signalement communautaire. Tout membre signalé 3 fois est suspendu automatiquement.",
  },
  {
    question: 'Pourquoi les autres apps ont-ils autant de faux profils ?',
    answer: "La plupart des apps de rencontre acceptent les inscriptions anonymes sans vérification. Cela crée un terrain fertile pour les bots, arnaqueurs et faux comptes. Aevyra a fait le choix radical de la transparence : chaque profil est réel ou il n'existe pas.",
  },
  {
    question: 'Est-ce qu\'Aevyra vérifie les photos de profil ?',
    answer: "Oui. Chaque photo est examinée par notre équipe de modération. Les photos générées par IA, volées ou inappropriées sont supprimées sous 24h. Les profils avec photo vérifiée affichent un badge ✓ visible.",
  },
  {
    question: 'Que faire si je rencontre un faux profil sur Aevyra ?',
    answer: "Signalez-le directement depuis le profil en question. Notre équipe traite chaque signalement sous 24h. En cas de fraude avérée, le compte est banni définitivement et nos équipes peuvent alerter les autorités compétentes.",
  },
  {
    question: 'Les apps de rencontre gratuites ont-elles plus de faux profils ?',
    answer: "Non si la vérification est sérieuse. Aevyra prouve qu'une app 100% gratuite peut garantir l'authenticité. La gratuité n'excuse pas les faux profils — notre modèle économique repose sur la croissance réelle, pas sur les abonnements.",
  },
];

const PAGE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${SITE_URL}/rencontre-sans-faux-profils#webpage`,
  url: `${SITE_URL}/rencontre-sans-faux-profils`,
  name: 'Rencontre Sans Faux Profils — Aevyra Garantit 100% Authentique',
  description: 'Aevyra est la seule app de rencontre qui garantit zéro faux profil. Vérification humaine de chaque membre, badges de confiance, modération 24/7. 100% gratuit.',
  inLanguage: ['fr-FR'],
  isPartOf: { '@id': `${SITE_URL}/#website` },
  publisher: { '@id': `${SITE_URL}/#organization` },
};

const TITLE = 'Rencontre Sans Faux Profils — 100% Authentique | Aevyra';
const DESC  = 'Aevyra est la seule app de rencontre qui garantit zéro faux profil. Vérification humaine, badge confiance, modération 24/7. Rencontres sincères et authentiques. 100% gratuit.';

const POINTS = [
  { icon: '✅', titre: 'Vérification humaine', texte: "Chaque photo et profil est validé manuellement par notre équipe avant publication." },
  { icon: '🔍', titre: 'Score de fiabilité', texte: "Chaque membre affiche un score de fiabilité calculé sur son comportement et ses signalements." },
  { icon: '🚨', titre: 'Signalement instantané', texte: "Signalez un profil suspect en 2 taps. Traitement sous 24h, expulsion définitive si fraude." },
  { icon: '🤖', titre: 'Détection bots IA', texte: "Notre algorithme détecte les comportements automatisés et supprime les bots avant qu'ils nuisent." },
  { icon: '🛡️', titre: 'Zéro tolérance', texte: "3 signalements = suspension automatique. Politique de tolérance zéro pour les arnaqueurs." },
  { icon: '💬', titre: 'Messagerie sécurisée', texte: "Filtres anti-spam, blocage instantané, signalement dans chaque conversation." },
];

export default function RencontreSansFauxProfils() { 
  const insets = useSafeAreaInsets();
  const { px, bodySize, captionSize: _captionSize, h2Size, h3Size, gap: _gap, contentMaxWidth: _contentMaxWidth, iconSize: _iconSize  } = useResponsive();
  const metaTags = buildMetaTags({ title: TITLE, description: DESC, canonical: `${SITE_URL}/rencontre-sans-faux-profils` });
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Accueil', url: SITE_URL },
    { name: 'Rencontre Sans Faux Profils', url: `${SITE_URL}/rencontre-sans-faux-profils` },
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
        {/* ── Navigation ── */}
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
          <View style={{ alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 8 }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: 'rgba(255,215,0,0.12)',
              borderWidth: 1.5, borderColor: 'rgba(255,215,0,0.3)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={36} color={GOLD} />
            </View>
            <Text style={{ color: GOLD, fontSize: h2Size, fontWeight: '900', textAlign: 'center', lineHeight: 34 }}>
              Rencontres Sans Faux Profils
            </Text>
            <Text style={{ color: WHITE, fontSize: h3Size, textAlign: 'center', lineHeight: 24, opacity: 0.85 }}>
              Aevyra est la seule app de rencontre qui garantit{'\n'}
              <Text style={{ fontWeight: '800', color: GOLD }}>100% de profils authentiques et vérifiés</Text>
            </Text>
          </View>

          {/* ── Badge confiance ── */}
          <LinearGradient
            colors={['rgba(255,215,0,0.12)', 'rgba(255,140,0,0.08)']}
            style={{
              borderRadius: 20, padding: 20,
              borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)',
              flexDirection: 'row', alignItems: 'center', gap: 14,
            }}
          >
            <CheckCircle size={32} color={GOLD} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: GOLD, fontWeight: '900', fontSize: h3Size }}>Zéro Tolérance Faux Profils</Text>
              <Text style={{ color: MUTED, fontSize: bodySize, marginTop: 4, lineHeight: 19 }}>
                Notre engagement : chaque profil que vous voyez est une vraie personne. Point.
              </Text>
            </View>
          </LinearGradient>

          {/* ── 6 garanties ── */}
          <Text style={{ color: WHITE, fontSize: h3Size, fontWeight: '800', textAlign: 'center' }}>
            Nos 6 Garanties d'Authenticité
          </Text>
          <View style={{ gap: 12 }}>
            {POINTS.map((p) => (
              <LinearGradient
                key={p.titre}
                colors={[BG_CARD, 'rgba(13,13,26,0.6)']}
                style={{
                  borderRadius: 16, padding: 16,
                  borderWidth: 1, borderColor: BORDER,
                  flexDirection: 'row', alignItems: 'flex-start', gap: 14,
                }}
              >
                <Text style={{ fontSize: 28 }}>{p.icon}</Text>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: WHITE, fontWeight: '800', fontSize: bodySize }}>{p.titre}</Text>
                  <Text style={{ color: MUTED, fontSize: bodySize, lineHeight: 19 }}>{p.texte}</Text>
                </View>
              </LinearGradient>
            ))}
          </View>

          {/* ── Stats ── */}
          <LinearGradient
            colors={['rgba(114,47,55,0.3)', 'rgba(75,0,130,0.25)']}
            style={{ borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(192,132,252,0.2)' }}
          >
            <Text style={{ color: WHITE, fontWeight: '900', fontSize: h3Size, textAlign: 'center', marginBottom: 16 }}>
              La Différence Aevyra en Chiffres
            </Text>
            {[
              { label: 'Profils vérifiés manuellement', value: '100%' },
              { label: 'Signalements traités sous 24h', value: '99%' },
              { label: 'Taux de faux profils détectés', value: '< 0.1%' },
              { label: 'Satisfaction membres', value: '4.8/5 ⭐' },
            ].map((s) => (
              <React.Fragment key={s.label}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                  <Text style={{ color: MUTED, fontSize: bodySize, flex: 1 }}>{s.label}</Text>
                  <Text style={{ color: GOLD, fontSize: bodySize, fontWeight: '800' }}>{s.value}</Text>
                </View>
              </React.Fragment>
            ))}
          </LinearGradient>

          {/* ── FAQ ── */}
          <Text style={{ color: WHITE, fontSize: h3Size, fontWeight: '800', textAlign: 'center' }}>
            Questions Fréquentes
          </Text>
          <View style={{ gap: 12 }}>
            {PAGE_FAQS.map((faq) => (
              <React.Fragment key={faq.question}>
                <View style={{
                  backgroundColor: BG_CARD, borderRadius: 16, padding: 16,
                  borderWidth: 1, borderColor: BORDER, gap: 8,
                }}>
                  <Text style={{ color: GOLD, fontWeight: '800', fontSize: bodySize, lineHeight: 20 }}>{faq.question}</Text>
                  <Text style={{ color: MUTED, fontSize: bodySize, lineHeight: 20 }}>{faq.answer}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          {/* ── CTA ── */}
          <LinearGradient
            colors={['rgba(255,215,0,0.15)', 'rgba(255,140,0,0.10)']}
            style={{ borderRadius: 22, padding: 24, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)', alignItems: 'center', gap: 12 }}
          >
            <Text style={{ fontSize: 32 }}>🛡️</Text>
            <Text style={{ color: WHITE, fontSize: 19, fontWeight: '900', textAlign: 'center' }}>
              Rejoignez la communauté des rencontres authentiques
            </Text>
            <Text style={{ color: MUTED, fontSize: bodySize, textAlign: 'center', lineHeight: 20 }}>
              Des milliers de célibataires réels vous attendent sur Aevyra. Gratuit, sans carte bancaire.
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
              <Text style={{ color: '#0D0D1A', fontWeight: '900', fontSize: h3Size }}>S'inscrire Gratuitement</Text>
              <ArrowRight size={18} color="#0D0D1A" />
            </Pressable>
          </LinearGradient>
        </ScrollView>
      </CosmicBackground>
    </View>
  );
}
