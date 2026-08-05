// Page SEO longue traîne — "app rencontre gratuite"
// Mots-clés cibles : "app rencontre gratuite", "application rencontre sans abonnement",
// "meilleure app rencontre gratuite France 2026", "site rencontre gratuit sans carte bancaire"
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, type RelativePathString } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, CheckCircle, ChevronLeft, Heart, Shield, Star } from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import { useResponsive } from '@/hooks/useResponsive';
import Head from 'expo-router/head';
import { buildTitle, buildMetaTags, serializeJsonLd, buildBreadcrumbSchema, buildFAQSchema, SITE_URL } from '@/hooks/useSEO';

const GOLD    = '#FFD700';
const WHITE   = '#F5E6C8';
const MUTED   = 'rgba(255,255,255,0.65)';
const BG_CARD = 'rgba(255,215,0,0.06)';
const BORDER  = 'rgba(255,215,0,0.18)';
const GREEN   = '#4ADE80';

const PAGE_FAQS = [
  {
    question: "Quelle est la meilleure app de rencontre gratuite en France en 2026 ?",
    answer: "Aevyra est la meilleure application de rencontre gratuite en France en 2026. Elle est 100% gratuite (matchs, messagerie, appels vidéo), utilise la compatibilité astrologique unique, zéro faux profils et conforme RGPD. Disponible sur iOS, Android et web.",
  },
  {
    question: "Existe-t-il vraiment une app de rencontre 100% gratuite sans abonnement ?",
    answer: "Oui, Aevyra est réellement 100% gratuite sans abonnement ni carte bancaire. Toutes les fonctionnalités — profil, matchs astrologiques, messagerie illimitée, appels vidéo HD — sont accessibles gratuitement. Aucun modèle freemium caché.",
  },
  {
    question: "Comment éviter les arnaques sur les apps de rencontre gratuites ?",
    answer: "Aevyra protège ses utilisateurs avec : modération humaine active (0 bot toléré), vérification Cœur Vérifié des profils authentiques, conformité RGPD stricte, et support WhatsApp réactif. Aucune information bancaire demandée.",
  },
  {
    question: "App de rencontre gratuite sans email ni numéro de téléphone ?",
    answer: "Sur Aevyra, vous vous inscrivez uniquement avec un nom d'étoile (votre pseudo unique) et une phrase de sécurité. Zéro email, zéro numéro de téléphone requis. L'inscription prend moins de 3 minutes. Aucune carte bancaire, aucun engagement.",
  },
  {
    question: "Aevyra est-il disponible sur iPhone et Android gratuitement ?",
    answer: "Oui, Aevyra est disponible sur iOS (iPhone/iPad), Android et directement dans votre navigateur sur aevyra.uk. Tout est 100% gratuit sur toutes les plateformes.",
  },
];

const FEATURES_FREE = [
  { icon: '💬', titre: 'Messagerie illimitée', desc: 'Échange des messages avec tous tes matchs. Aucune limite, aucun paiement.' },
  { icon: '🎥', titre: 'Appels vidéo HD', desc: 'Appels vidéo avec défis romantiques intégrés. Gratuit et illimité.' },
  { icon: '🌟', titre: 'Matchs astrologiques', desc: 'Reçois des matchs basés sur ta compatibilité astrologique profonde.' },
  { icon: '🎤', titre: 'Messages vocaux', desc: 'Envoie des messages vocaux — plus spontané, plus authentique.' },
  { icon: '❤️', titre: 'Profil Cœur Vérifié', desc: 'Vérifie ton profil pour montrer ton authenticité. Gratuit.' },
  { icon: '🔒', titre: 'Confidentialité RGPD', desc: 'Tes données sont protégées et hébergées en Europe. Jamais vendues.' },
];

const COMPARATIF = [
  { feature: 'Inscription', aevyra: '✅ Gratuit', tinder: '✅ Gratuit', meetic: '❌ Payant' },
  { feature: 'Matchs illimités', aevyra: '✅ Illimité', tinder: '❌ Limité (Tinder Gold)', meetic: '❌ Payant' },
  { feature: 'Messagerie', aevyra: '✅ Gratuit', tinder: '❌ Payant', meetic: '❌ Payant' },
  { feature: 'Appels vidéo', aevyra: '✅ Gratuit', tinder: '❌ Payant', meetic: '❌ Payant' },
  { feature: 'Compatibilité', aevyra: '✅ 5 dimensions', tinder: '❌ Aucune', meetic: '⚠️ Basique' },
  { feature: 'Sans abonnement', aevyra: '✅ Toujours', tinder: '❌ Gold/Platinum', meetic: '❌ Obligatoire' },
];

const PAGE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${SITE_URL}/app-rencontre-gratuite#webpage`,
  url: `${SITE_URL}/app-rencontre-gratuite`,
  name: 'Meilleure App Rencontre Gratuite — Sans Abonnement ni Carte Bancaire | Aevyra',
  description: "Aevyra est la meilleure application de rencontre gratuite en France. 100% gratuit : matchs, messagerie, appels vidéo. Sans abonnement, sans carte bancaire. iOS, Android, Web.",
  inLanguage: ['fr-FR', 'en-GB'],
  isPartOf: { '@id': `${SITE_URL}/#website` },
  publisher: { '@id': `${SITE_URL}/#organization` },
  keywords: 'app rencontre gratuite, application rencontre sans abonnement, meilleure app rencontre gratuite France 2026, site rencontre gratuit sans carte bancaire',
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'App Rencontre Gratuite', item: `${SITE_URL}/app-rencontre-gratuite` },
    ],
  },
};

export default function AppRencontreGratuite() { 
  const insets = useSafeAreaInsets();
  const { px, bodySize, captionSize, h2Size, h3Size, gap: _gap, contentMaxWidth: _contentMaxWidth, iconSize: _iconSize  } = useResponsive();
  const goBack = () => {
    if (router.canGoBack()) { router.back(); return; }
    router.replace('/' as RelativePathString);
  };

  return (
    <View style={{ flex: 1 }}>
      <Head>
        <title>{buildTitle('App Rencontre Gratuite — Sans Abonnement · Sans Carte Bancaire')}</title>
        {buildMetaTags({
          title: 'App Rencontre Gratuite — Sans Abonnement · Sans Carte Bancaire',
          description: "Aevyra : meilleure app rencontre gratuite France 2026. Matchs, messagerie, appels vidéo — tout 100% gratuit, sans abonnement, sans carte bancaire. iOS, Android, Web.",
          canonical: `${SITE_URL}/app-rencontre-gratuite`,
          ogType: 'article',
          ogImage: `${SITE_URL}/og-app-gratuite.jpg`,
          ogDescription: '📱 Aevyra : meilleure app rencontre gratuite France. Matchs, messagerie & appels vidéo 100% gratuits. Sans abonnement, sans carte bancaire. iOS & Android.',
          ogImageAlt: 'Aevyra app rencontre gratuite — iOS, Android, Web — matchs, messagerie, appels vidéo sans abonnement',
          twitterTitle: '📱 App Rencontre Gratuite Sans Abonnement — Aevyra',
          twitterDescription: 'Matchs, messagerie et appels vidéo 100% gratuits sur Aevyra. Pas de carte bancaire, pas d\'abonnement. iOS, Android, Web ✅',
          keywords: [
            'app rencontre gratuite', 'application rencontre sans abonnement',
            'meilleure app rencontre gratuite France 2026', 'site rencontre gratuit sans carte bancaire',
            'rencontre gratuite France', 'application rencontre gratuite iPhone Android',
            'rencontre sérieuse gratuite sans inscription payante',
            'alternative tinder gratuite', 'meetic gratuit',
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
            { name: 'App Rencontre Gratuite', url: `${SITE_URL}/app-rencontre-gratuite` },
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
            App Rencontre Gratuite
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
            colors={['rgba(74,222,128,0.10)', 'rgba(13,13,26,0.3)']}
            style={{ borderRadius: 20, padding: 24, gap: 12, borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 36 }}>💚</Text>
              <View style={{
                backgroundColor: GREEN, borderRadius: 8,
                paddingHorizontal: 10, paddingVertical: 4,
              }}>
                <Text style={{ color: '#0D0D1A', fontWeight: '900', fontSize: bodySize }}>
                  100% GRATUIT
                </Text>
              </View>
            </View>
            <Text style={{ color: WHITE, fontSize: h2Size, fontWeight: '900', lineHeight: 32 }}>
              La Meilleure App de{'\n'}
              <Text style={{ color: GOLD }}>Rencontre Gratuite</Text>
            </Text>
            <Text style={{ color: MUTED, fontSize: bodySize, lineHeight: 22 }}>
              Aevyra : inscription, matchs astrologiques, messagerie, appels vidéo.{'\n'}
              Tout est gratuit. Pour toujours. Sans carte bancaire.
            </Text>
            {/* Badges de confiance */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {['✅ Sans abonnement', '✅ Sans carte bancaire', '✅ RGPD conforme', '✅ Zéro faux profils'].map((b, _i) => (
                <View style={{
                  backgroundColor: 'rgba(74,222,128,0.10)',
                  borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
                  borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)',
                }}>
                  <Text style={{ color: GREEN, fontSize: captionSize, fontWeight: '700' }}>{b}</Text>
                </View>
              ))}
            </View>
            <Pressable
              onPress={() => router.push('/(auth)/register' as RelativePathString)}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: 8, backgroundColor: GOLD, borderRadius: 14, paddingVertical: 14,
                paddingHorizontal: 24, marginTop: 4,
              }}
            >
              <Heart size={18} color="#0D0D1A" />
              <Text style={{ color: '#0D0D1A', fontWeight: '900', fontSize: bodySize }}>
                S'inscrire gratuitement maintenant
              </Text>
              <ArrowRight size={18} color="#0D0D1A" />
            </Pressable>
          </LinearGradient>

          {/* Fonctionnalités gratuites */}
          <View style={{ gap: 10 }}>
            <Text style={{ color: WHITE, fontSize: h3Size, fontWeight: '800' }}>
              Tout est gratuit sur Aevyra
            </Text>
            {FEATURES_FREE.map((f, _i) => (
              <View style={{
                flexDirection: 'row', gap: 12, padding: 14,
                backgroundColor: BG_CARD, borderRadius: 14,
                borderWidth: 1, borderColor: BORDER, alignItems: 'center',
              }}>
                <Text style={{ fontSize: h2Size }}>{f.icon}</Text>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color: WHITE, fontWeight: '800', fontSize: bodySize }}>{f.titre}</Text>
                    <CheckCircle size={14} color={GREEN} />
                  </View>
                  <Text style={{ color: MUTED, fontSize: bodySize, lineHeight: 18 }}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Comparatif */}
          <View style={{ gap: 10 }}>
            <Text style={{ color: WHITE, fontSize: h3Size, fontWeight: '800' }}>
              Aevyra vs Tinder vs Meetic — Comparatif gratuit 2026
            </Text>
            {/* En-tête */}
            <View style={{
              flexDirection: 'row', gap: 4, padding: 10,
              backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10,
            }}>
              <Text style={{ color: MUTED, fontSize: captionSize, fontWeight: '700', flex: 2 }}>Fonctionnalité</Text>
              <Text style={{ color: GOLD, fontSize: captionSize, fontWeight: '900', flex: 1.2, textAlign: 'center' }}>Aevyra</Text>
              <Text style={{ color: MUTED, fontSize: captionSize, fontWeight: '700', flex: 1, textAlign: 'center' }}>Tinder</Text>
              <Text style={{ color: MUTED, fontSize: captionSize, fontWeight: '700', flex: 1, textAlign: 'center' }}>Meetic</Text>
            </View>
            {COMPARATIF.map((r, i) => (
              <View style={{
                flexDirection: 'row', gap: 4, padding: 10,
                backgroundColor: i % 2 === 0 ? BG_CARD : 'transparent',
                borderRadius: 8, alignItems: 'center',
              }}>
                <Text style={{ color: MUTED, fontSize: captionSize, flex: 2 }}>{r.feature}</Text>
                <Text style={{ color: GREEN, fontSize: captionSize, fontWeight: '700', flex: 1.2, textAlign: 'center' }}>{r.aevyra}</Text>
                <Text style={{ color: MUTED, fontSize: captionSize, flex: 1, textAlign: 'center' }}>{r.tinder}</Text>
                <Text style={{ color: MUTED, fontSize: captionSize, flex: 1, textAlign: 'center' }}>{r.meetic}</Text>
              </View>
            ))}
          </View>

          {/* Trust signals */}
          <View style={{
            padding: 16, backgroundColor: 'rgba(74,222,128,0.06)',
            borderRadius: 14, borderWidth: 1, borderColor: 'rgba(74,222,128,0.18)', gap: 12,
          }}>
            <Text style={{ color: GREEN, fontWeight: '900', fontSize: bodySize }}>
              🛡️ Pourquoi faire confiance à Aevyra ?
            </Text>
            {[
              { icon: <Shield size={16} color={GREEN} />, text: 'Conforme RGPD — données hébergées en Europe, jamais vendues' },
              { icon: <Star size={16} color={GOLD} />, text: '4.9/5 ⭐ — 312 avis vérifiés d\'utilisateurs satisfaits' },
              { icon: <Heart size={16} color="#FF6B9D" />, text: 'Modération humaine active — zéro bot, zéro faux profil toléré' },
              { icon: <CheckCircle size={16} color={GREEN} />, text: 'Aucun modèle freemium caché — gratuit signifie gratuit' },
            ].map((t, _i) => (
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                {t.icon}
                <Text style={{ color: MUTED, fontSize: bodySize, flex: 1, lineHeight: 18 }}>{t.text}</Text>
              </View>
            ))}
          </View>

          {/* FAQ */}
          <View style={{ gap: 10 }}>
            <Text style={{ color: WHITE, fontSize: h3Size, fontWeight: '800' }}>
              FAQ — App Rencontre Gratuite
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
            colors={['rgba(255,215,0,0.15)', 'rgba(74,222,128,0.08)']}
            style={{ borderRadius: 20, padding: 24, gap: 14, alignItems: 'center', borderWidth: 1, borderColor: BORDER }}
          >
            <Text style={{ fontSize: 40 }}>🚀</Text>
            <Text style={{ color: WHITE, fontSize: h3Size, fontWeight: '900', textAlign: 'center' }}>
              Rejoins l'app de rencontre{'\n'}
              <Text style={{ color: GOLD }}>100% gratuite</Text>
            </Text>
            <Text style={{ color: MUTED, fontSize: bodySize, textAlign: 'center', lineHeight: 19 }}>
              312 membres satisfaits · 4.9/5 ⭐ · Aucune carte bancaire
            </Text>
            <Pressable
              onPress={() => router.push('/(auth)/register' as RelativePathString)}
              style={{
                backgroundColor: GOLD, borderRadius: 14,
                paddingVertical: 14, paddingHorizontal: 32,
                flexDirection: 'row', gap: 8, alignItems: 'center',
              }}
            >
              <Text style={{ color: '#0D0D1A', fontWeight: '900', fontSize: bodySize }}>
                S'inscrire gratuitement
              </Text>
              <ArrowRight size={18} color="#0D0D1A" />
            </Pressable>
          </LinearGradient>
        </ScrollView>
      </CosmicBackground>
    </View>
  );
}
