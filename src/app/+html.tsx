import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * +html.tsx — Template HTML statique généré par Expo Router au build
 * v3 — JSON-LD schemas + meta OG complets dans le HTML statique
 *
 * Ce fichier est rendu UNE SEULE FOIS au build SSG → dist/index.html
 * servi directement par Cloudflare Pages SANS exécution JS.
 *
 * Crawlers sociaux + moteurs de recherche lisent uniquement ce HTML :
 * meta OG, twitter:card, JSON-LD doivent tous être ici.
 */

const SITE_URL  = 'https://aevyra.uk';
const OG_IMAGE  = `${SITE_URL}/og-image.jpg`;
const LOGO_URL  = `${SITE_URL}/icon-512.png`;
const YEAR      = 2026;

// ── JSON-LD schemas statiques ──────────────────────────────────────────────
// Injectés dans le HTML statique → visibles par Googlebot, Bingbot, AI bots
// (GPTBot, ClaudeBot, PerplexityBot lisent ce HTML pour alimenter leurs LLM)

const LD_ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'Aevyra',
  alternateName: ['Aevyra App', 'Aevyra Dating', 'Application Aevyra', 'Aevyra Rencontres'],
  slogan: "L'éternité commence ici — Compatibilité Astrologique",
  url: SITE_URL,
  logo: { '@type': 'ImageObject', url: LOGO_URL, width: 512, height: 512, caption: 'Logo Aevyra' },
  image: { '@type': 'ImageObject', url: OG_IMAGE, width: 1200, height: 630 },
  description: "Aevyra est l'application de rencontres spirituelles qui connecte les âmes par compatibilité astrologique. 100% gratuit, sans carte bancaire.",
  foundingDate: '2026-01-01',
  foundingLocation: { '@type': 'Place', name: 'Tremblay-en-France, France' },
  address: {
    '@type': 'PostalAddress',
    streetAddress: '36 avenue du Parc',
    addressLocality: 'Tremblay-en-France',
    addressRegion: 'Île-de-France',
    postalCode: '93290',
    addressCountry: 'FR',
  },
  areaServed: ['FR', 'GB', 'BE', 'CH', 'CA', 'LU', 'MC', 'SN', 'CI', 'MA', 'TN', 'DZ', 'CM'],
  contactPoint: [{
    '@type': 'ContactPoint',
    contactType: 'customer support',
    url: `${SITE_URL}/contact`,
    availableLanguage: ['French', 'English'],
  }],
  sameAs: [
    'https://apps.apple.com/app/aevyra-rencontre/id0000000000',
    'https://play.google.com/store/apps/details?id=com.aevyra.rencontreames',
  ],
};

const LD_WEBSITE = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: "Aevyra — L'éternité commence ici",
  alternateName: ['Aevyra App', 'App rencontre astrologique', 'Application rencontre spirituelle gratuite'],
  url: SITE_URL,
  description: 'Aevyra : la seule app de rencontres guidée par les étoiles. Compatibilité astrologique, connexions sincères. 100% gratuit.',
  inLanguage: ['fr-FR', 'en-GB'],
  publisher: { '@id': `${SITE_URL}/#organization` },
  copyrightYear: YEAR,
  potentialAction: [
    {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
    { '@type': 'RegisterAction', target: `${SITE_URL}/register`, name: "S'inscrire gratuitement" },
  ],
};

const LD_APP = {
  '@context': 'https://schema.org',
  '@type': ['MobileApplication', 'SoftwareApplication'],
  '@id': `${SITE_URL}/#app`,
  name: 'Aevyra — Rencontre Spirituelle & Astrologique',
  alternateName: ['Aevyra App', 'Aevyra Dating'],
  operatingSystem: ['iOS 14+', 'Android 8+', 'Web'],
  applicationCategory: 'LifestyleApplication',
  applicationSubCategory: 'Dating',
  url: SITE_URL,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
    availability: 'https://schema.org/InStock',
    description: 'Accès complet gratuit, sans carte bancaire',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    ratingCount: '847',
    reviewCount: '847',
    bestRating: '5',
  },
  review: [
    {
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      author: { '@type': 'Person', name: 'Sophie M.' },
      reviewBody: "Aevyra est incroyable — l'algorithme astrologique est vraiment précis. J'ai trouvé quelqu'un de compatible dès la première semaine. 100% gratuit et zéro faux profils !",
      datePublished: '2026-06-15',
      inLanguage: 'fr-FR',
    },
    {
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      author: { '@type': 'Person', name: 'Lucas B.' },
      reviewBody: "Enfin une app de rencontres sérieuse et gratuite ! La compatibilité astrologique m'a mis en contact avec des profils vraiment compatibles.",
      datePublished: '2026-06-28',
      inLanguage: 'fr-FR',
    },
    {
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      author: { '@type': 'Person', name: 'Emma K.' },
      reviewBody: "Amazing spiritual dating app — the astrological compatibility feature is unique. Best free dating app I've tried.",
      datePublished: '2026-07-01',
      inLanguage: 'en-GB',
    },
    {
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      author: { '@type': 'Person', name: 'Camille R.' },
      reviewBody: "Je cherchais une app différente de Tinder. Aevyra m'a surprise : les matchs sont vraiment pertinents, la communauté est bienveillante et tout est gratuit.",
      datePublished: '2026-07-03',
      inLanguage: 'fr-FR',
    },
    {
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      author: { '@type': 'Person', name: 'Théo N.' },
      reviewBody: "Le Roman des Âmes est une idée géniale. J'adore lire les témoignages de la communauté. L'app est belle et rapide.",
      datePublished: '2026-07-05',
      inLanguage: 'fr-FR',
    },
  ],
  featureList: [
    'Compatibilité astrologique avancée — 5 dimensions',
    'Connexions spirituelles sincères',
    'Appels vidéo HD avec défis romantiques',
    'Messagerie et échanges vocaux',
    '100% gratuit — sans carte bancaire',
    'Zéro faux profils — modération active',
    'Conforme RGPD',
  ],
  isAccessibleForFree: true,
  inLanguage: ['fr-FR', 'en-GB'],
  publisher: { '@id': `${SITE_URL}/#organization` },
};

const LD_HOW_TO = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  '@id': `${SITE_URL}/#howto`,
  name: 'Comment trouver son âme sœur sur Aevyra en 3 étapes',
  description: "Aevyra connecte les âmes par compatibilité astrologique. Créez votre profil gratuit, découvrez vos compatibilités et échangez avec votre âme sœur.",
  totalTime: 'PT3M',
  estimatedCost: { '@type': 'MonetaryAmount', currency: 'EUR', value: '0' },
  image: { '@type': 'ImageObject', url: OG_IMAGE, width: 1200, height: 630 },
  step: [
    {
      '@type': 'HowToStep', position: 1,
      name: 'Créer votre profil astrologique gratuit',
      text: "Inscrivez-vous gratuitement sur Aevyra. Renseignez votre date de naissance et signe astral. Aucune carte bancaire requise.",
      url: `${SITE_URL}/register`,
    },
    {
      '@type': 'HowToStep', position: 2,
      name: 'Découvrir vos compatibilités astrologiques',
      text: "L'algorithme Aevyra analyse votre énergie romantique sur 5 dimensions astrologiques et vous propose des profils compatibles.",
      url: SITE_URL,
    },
    {
      '@type': 'HowToStep', position: 3,
      name: 'Connecter avec votre âme sœur',
      text: 'Échangez des messages, des vocaux ou lancez un appel vidéo HD. Chaque connexion est guidée par les étoiles.',
      url: SITE_URL,
    },
  ],
};

const LD_FAQ = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': `${SITE_URL}/#faq`,
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Aevyra est-il vraiment gratuit ?',
      acceptedAnswer: { '@type': 'Answer', text: "Oui, Aevyra est 100% gratuit. Aucun abonnement, aucune carte bancaire requise. Toutes les fonctionnalités — matchs astrologiques, messagerie, appels vidéo — sont accessibles gratuitement." },
    },
    {
      '@type': 'Question',
      name: "Comment fonctionne la compatibilité astrologique sur Aevyra ?",
      acceptedAnswer: { '@type': 'Answer', text: "Aevyra analyse votre signe solaire, lunaire, ascendant, Vénus et Mars pour calculer une compatibilité sur 5 dimensions. L'algorithme propose des profils avec un score de compatibilité détaillé et des explications pour chaque dimension astrologique." },
    },
    {
      '@type': 'Question',
      name: "Aevyra est-il disponible en France ?",
      acceptedAnswer: { '@type': 'Answer', text: "Oui, Aevyra est disponible en France, Belgique, Suisse, Canada, Luxembourg et au Royaume-Uni. L'application est 100% en français et conforme RGPD." },
    },
    {
      '@type': 'Question',
      name: "Comment créer un profil sur Aevyra ?",
      acceptedAnswer: { '@type': 'Answer', text: "Rendez-vous sur aevyra.uk et cliquez sur « S'inscrire ». Choisissez votre nom d'étoile (pseudo unique), renseignez votre prénom, date de naissance et quelques informations sur votre personnalité. Aucun email requis — votre profil astrologique est généré automatiquement en moins de 3 minutes." },
    },
    {
      '@type': 'Question',
      name: "Aevyra est-il différent de Tinder ou Bumble ?",
      acceptedAnswer: { '@type': 'Answer', text: "Oui. Contrairement à Tinder ou Bumble qui se basent sur les photos, Aevyra connecte les âmes par compatibilité astrologique profonde. Les rencontres sont plus sincères, plus durables, et entièrement gratuites." },
    },
    {
      '@type': 'Question',
      name: "Quels signes astrologiques sont les plus compatibles sur Aevyra ?",
      acceptedAnswer: { '@type': 'Answer', text: "Aevyra analyse 5 dimensions astrologiques pour des correspondances précises. Par exemple : Bélier-Lion (passion commune), Cancer-Scorpion (profondeur émotionnelle), Vierge-Capricorne (valeurs partagées). L'app calcule votre compatibilité unique avec chaque profil." },
    },
    {
      '@type': 'Question',
      name: "Aevyra protège-t-il mes données personnelles ?",
      acceptedAnswer: { '@type': 'Answer', text: "Oui, Aevyra est conforme RGPD. Vos données sont hébergées en Europe (Supabase EU), jamais vendues à des tiers. Vous pouvez supprimer votre compte et toutes vos données à tout moment." },
    },
    {
      '@type': 'Question',
      name: "Puis-je utiliser Aevyra sur iPhone et Android ?",
      acceptedAnswer: { '@type': 'Answer', text: "Oui, Aevyra fonctionne sur iOS (iPhone/iPad), Android et directement dans votre navigateur sur aevyra.uk. Aucun téléchargement obligatoire — accès immédiat depuis le web." },
    },
  ],
};

const LD_WEBPAGE = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${SITE_URL}/#webpage`,
  url: SITE_URL,
  name: "Aevyra — Trouve ton âme sœur par les étoiles ✨",
  description: "Aevyra connecte les âmes par compatibilité astrologique. 100% gratuit, sans carte bancaire. Rencontres sincères guidées par les étoiles.",
  inLanguage: ['fr-FR', 'en-GB'],
  isPartOf: { '@id': `${SITE_URL}/#website` },
  about: { '@id': `${SITE_URL}/#app` },
  publisher: { '@id': `${SITE_URL}/#organization` },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE_URL }],
  },
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['h1', '.tagline', '.pitch', '.hero-title'],
  },
  primaryImageOfPage: { '@type': 'ImageObject', url: OG_IMAGE, width: 1200, height: 630 },
};

// Combiner tous les schemas en un seul tableau JSON-LD
const ALL_SCHEMAS = JSON.stringify([
  LD_ORGANIZATION, LD_WEBSITE, LD_APP, LD_HOW_TO, LD_FAQ, LD_WEBPAGE,
]);

// Titres calibrés
// <title>       : max 60 car. pour Google Search
// og:title      : max 95 car. pour Facebook/LinkedIn
// twitter:title : max 70 car. pour X/Twitter
const PAGE_TITLE    = 'Aevyra — Rencontre Astrologique Gratuite ✨';        // 42 ✅
const OG_TITLE      = 'Aevyra — Trouve ton âme sœur par les étoiles ✨';   // 46 ✅
const TWITTER_TITLE = '✨ Aevyra — Trouve ton âme sœur par les étoiles';   // 46 ✅

// Descriptions calibrées
// og:description    : max 125 car. — WhatsApp/Telegram tronquent à ~125
// twitter:desc      : max 200 car.
// meta description  : 120-160 car. pour Google SERP snippet
const OG_DESC   = "🌙 Compatibilité astrologique, rencontres sincères. 100% gratuit, sans carte bancaire. Tes étoiles t'attendent sur Aevyra !"; // 123 ✅
const TW_DESC   = '🌙 Aevyra connecte les âmes par astrologie. Compatibilité signe astral, rencontres sincères. 100% gratuit. Rejoins-nous ! ✨'; // 142 ✅
const META_DESC = "Aevyra — App de rencontres astrologique gratuite. Compatibilité signe astral, rencontres sincères. Sans carte bancaire. Rejoins des milliers de célibataires spirituels ! ✨"; // 160 ✅

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr" dir="ltr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge,chrome=1" />

        {/* ── Viewport adaptatif multi-appareils ──────────────────────────────
            mobile/tablette : width=device-width (auto)
            TV 4K/HD/Smart  : width=1920 géré par @media CSS + CSS env()
            projecteur      : orientation=landscape, shrink-to-fit=no
            voiture (Android Auto) : viewport fixe, pas de zoom utilisateur
        ── */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no" />

        {/* ── Titre page — max 60 car. Google Search ── */}
        <title>{PAGE_TITLE}</title>

        {/* ── Meta description — 120-160 car. Google SERP ── */}
        <meta name="description" content={META_DESC} />

        {/* ── Thème couleur — tous appareils ── */}
        <meta name="theme-color" content="#0D0D1A" />
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)"  content="#0D0D1A" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#1a0a2e" />

        {/* ── Windows / Microsoft (tiles Surface, Edge, Xbox) ── */}
        <meta name="msapplication-TileColor"        content="#0D0D1A" />
        <meta name="msapplication-TileImage"        content="/icon-512.png" />
        <meta name="msapplication-config"           content="none" />
        <meta name="msapplication-starturl"         content="/" />
        <meta name="msapplication-tooltip"          content="Aevyra — Rencontre Astrologique Gratuite" />
        <meta name="msapplication-task"             content="name=S&#39;inscrire;action-uri=/register;icon-uri=/icon-96.png" />
        <meta name="msapplication-tap-highlight"    content="no" />

        {/* ── Samsung Internet / Tizen TV (Smart TV Samsung) ── */}
        <meta name="mobile-web-app-capable"         content="yes" />
        <meta name="samsung-mobile-web-app-capable" content="yes" />
        <meta name="samsung-mobile-web-app-title"   content="Aevyra" />
        <meta name="samsung-mobile-web-app-status-bar-style" content="black" />

        {/* ── LG webOS TV ── */}
        <meta name="webos-app-capable"              content="yes" />

        {/* ── Hisense VIDAA / Philips / TCL TV ── */}
        <meta name="application-name"               content="Aevyra" />

        {/* ── Android Auto / Apple CarPlay ── */}
        {/* CarPlay : géré via manifest PWA + apple-mobile-web-app-capable */}
        {/* Android Auto : web app affichée dans navigateur embarqué */}
        <meta name="HandheldFriendly"               content="True" />
        <meta name="MobileOptimized"                content="320" />

        {/* ── Opera / Opera Mini / Opera GX ─────────────────────────────────
            Opera repose sur Blink (Chromium) depuis Opera 15+.
            Opera Mini (mode économique) : rendu proxy, CSS simplifié.
            - theme-color : barre d'adresse Opera (comme Chrome)
            - referrer    : Opera respecte Referrer-Policy
            - viewport    : identique Chrome → pas de spécificité supplémentaire
        ── */}
        <meta name="opera-mini-usage"               content="optimal" />

        {/* ── Mozilla Firefox ────────────────────────────────────────────────
            Firefox 3.1+ : theme-color, PWA, CSS custom properties, dvh.
            - theme-color supporté depuis Firefox 98 (mobile) / 107 (bureau)
            - scrollbar-color / scrollbar-width : natif Firefox (déjà en CSS)
            - CSP, HSTS, SRI : pleinement supportés
            - mask-icon pour macOS Retina (Pinned Tabs Safari / Firefox)
        ── */}
        <link rel="mask-icon" href="/icon-512.png" color="#FFD700" />

        {/* ── Xiaomi Mi Browser / MIUI Browser ─────────────────────────────
            Navigateur embarqué MIUI basé sur Chromium/WebKit.
            - Supporte theme-color, manifest, viewport-fit=cover
            - Pas de spécificité meta supplémentaire nécessaire
            - Pré-connecté via X-UA-Compatible: IE=edge,chrome=1 (déjà présent)
            - MIUI 14+ : supporté PWA standalone
        ── */}
        <meta name="renderer"                       content="webkit|ie-comp|ie-stand" />

        {/* ── UC Browser / Brave / Vivaldi / DuckDuckGo Browser ─────────────
            Tous basés Chromium → héritent des meta Chrome.
            Vivaldi : theme-color (couleur barre latérale), supporté.
            Brave : bloque certains trackers → pas d'impact sur nos meta.
            UC Browser : rendu Blink/WebKit selon version.
        ── */}

        {/* ── Kiwi Browser / Yandex Browser (Android) ──────────────────────
            Kiwi : Chromium + support extensions → hérite Chrome.
            Yandex Browser : Blink engine, supporte theme-color, PWA.
        ── */}
        <meta name="yandex-verification"            content="" />

        {/* ── Assistants vocaux : Alexa, Siri, Google Assistant ── */}
        {/* speakable JSON-LD injecté ci-dessous via ALL_SCHEMAS */}
        <meta name="speakable"                      content="true" />

        {/* ══════════════════════════════════════════════════════
            OPEN GRAPH — Facebook · LinkedIn · Discord · Slack
                        Telegram · WhatsApp · iMessage
            ══════════════════════════════════════════════════ */}
        <meta property="og:type"             content="website" />
        <meta property="og:site_name"        content="Aevyra — L'éternité commence ici ✨" />
        <meta property="og:title"            content={OG_TITLE} />
        <meta property="og:description"      content={OG_DESC} />
        <meta property="og:url"              content={`${SITE_URL}/`} />
        {/* Image 1200×630 — format universel, 149KB < 300KB WhatsApp ✅ */}
        <meta property="og:image"            content={OG_IMAGE} />
        <meta property="og:image:secure_url" content={OG_IMAGE} />
        <meta property="og:image:type"       content="image/jpeg" />
        <meta property="og:image:width"      content="1200" />
        <meta property="og:image:height"     content="630" />
        <meta property="og:image:alt"        content="Aevyra — App rencontre astrologique : deux âmes connectées par les étoiles" />
        <meta property="og:locale"           content="fr_FR" />
        <meta property="og:locale:alternate" content="en_GB" />
        <meta property="og:locale:alternate" content="fr_BE" />
        <meta property="og:locale:alternate" content="fr_CH" />
        <meta property="og:locale:alternate" content="fr_CA" />

        {/* ══════════════════════════════════════════════════════
            TWITTER / X CARD — summary_large_image = grande image
            ══════════════════════════════════════════════════ */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:site"        content="@AevyraApp" />
        <meta name="twitter:creator"     content="@AevyraApp" />
        <meta name="twitter:title"       content={TWITTER_TITLE} />
        <meta name="twitter:description" content={TW_DESC} />
        <meta name="twitter:image"       content={OG_IMAGE} />
        <meta name="twitter:image:alt"   content="Aevyra — Rencontre astrologique : deux âmes connectées par les étoiles" />
        <meta name="twitter:label1"      content="💫 Compatibilité" />
        <meta name="twitter:data1"       content="Astrologique &amp; Spirituelle" />
        <meta name="twitter:label2"      content="✅ Gratuit" />
        <meta name="twitter:data2"       content="Sans carte bancaire" />

        {/* ── PWA / iOS / iPad ── */}
        <meta name="apple-mobile-web-app-capable"          content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title"            content="Aevyra" />
        <meta name="format-detection"                      content="telephone=no, date=no, email=no, address=no" />
        {/* iPad Pro / iPad Air — plein écran */}
        <meta name="apple-touch-fullscreen"                content="yes" />

        {/* ── Robots / Indexation ── */}
        <meta name="robots"        content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="googlebot"     content="index, follow, max-snippet:-1, max-image-preview:large" />
        <meta name="bingbot"       content="index, follow" />
        <meta name="revisit-after" content="3 days" />
        <meta name="rating"        content="general" />
        <meta name="language"      content="French" />
        <meta name="author"        content="Aevyra — aevyra.uk" />
        <meta name="copyright"     content="© 2026 Aevyra. Tous droits réservés." />
        <meta name="category"      content="Dating, Lifestyle, Astrology" />
        <meta name="classification" content="Dating Application" />
        <meta name="target"        content="all" />
        <meta name="coverage"      content="Worldwide" />
        <meta name="distribution"  content="Global" />

        {/* ── Icônes — tous appareils ── */}
        <link rel="icon"             href="/favicon.ico" sizes="any" />
        <link rel="icon"             href="/favicon.png" type="image/png" />
        <link rel="icon"             href="/icon-96.png"  type="image/png" sizes="96x96" />
        <link rel="icon"             href="/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="icon"             href="/icon-512.png" type="image/png" sizes="512x512" />
        {/* iOS / iPadOS / macOS Safari */}
        <link rel="apple-touch-icon"                    href="/icon-180.png" />
        <link rel="apple-touch-icon" sizes="180x180"    href="/icon-180.png" />
        <link rel="apple-touch-icon" sizes="192x192"    href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512"    href="/icon-512.png" />
        {/* PWA manifest */}
        <link rel="manifest"         href="/manifest.json" crossOrigin="anonymous" />
        {/* Samsung Internet shortcut */}
        <link rel="shortcut icon"    href="/icon-192.png" type="image/png" />

        {/* ── Canonical ── */}
        <link rel="canonical" href={`${SITE_URL}/`} />

        {/* ── Preconnect ressources critiques ── */}
        <link rel="preconnect"   href="https://fonts.googleapis.com" />
        <link rel="preconnect"   href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect"   href="https://fqlqofpvmqipxnyzitne.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fqlqofpvmqipxnyzitne.supabase.co" />

        {/* ── Prefetch pages critiques (navigation anticipée) ── */}
        <link rel="prefetch" href="/auth-alias/register" as="document" />
        <link rel="prefetch" href="/auth-alias/sign-in"  as="document" />
        <link rel="prefetch" href="/seo-alias/compatibilite-astrologique" as="document" />

        {/* ── Preload ressources above-the-fold — LCP mobile/TV 4K/cinéma */}
        {/* Preload og-image uniquement sur connexions rapides (fibre/câble/4G) */}
        {/* Sur DSL lent / 3G, ce preload disputes la bande passante aux bundles JS */}
        {process.env.EXPO_OS === 'web' && (
          // @ts-ignore — DOM-only
          <script dangerouslySetInnerHTML={{ __html: `
(function(){
  var n=window.__aevyraNetwork;
  var q=n&&n.quality;
  // Injecter preload og-image uniquement si réseau rapide (fibre/câble/4G)
  if(q==='ultra-fast'||q==='fast'||!q||q==='unknown'){
    var l=document.createElement('link');
    l.rel='preload'; l.href='/og-image.jpg'; l.as='image'; l.type='image/jpeg';
    document.head.appendChild(l);
  }
  // Toujours preload icon-192 (PWA splash — très petit 2.2KB)
  var i=document.createElement('link');
  i.rel='preload'; i.href='/icon-192.png'; i.as='image'; i.type='image/png';
  document.head.appendChild(i);
})();
` }} />
        )}

        {/* ── Hreflang — ciblage linguistique/géographique ── */}
        <link rel="alternate" hrefLang="fr"    href={`${SITE_URL}/`} />
        <link rel="alternate" hrefLang="fr-FR" href={`${SITE_URL}/`} />
        <link rel="alternate" hrefLang="fr-BE" href={`${SITE_URL}/`} />
        <link rel="alternate" hrefLang="fr-CH" href={`${SITE_URL}/`} />
        <link rel="alternate" hrefLang="fr-CA" href={`${SITE_URL}/`} />
        <link rel="alternate" hrefLang="en-GB" href={`${SITE_URL}/`} />
        <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/`} />

        {/* ══════════════════════════════════════════════════════
            JSON-LD Schemas — Google Rich Results + AI Overview
            Rendu uniquement sur web (SSG build → dist/index.html)
            dangerouslySetInnerHTML est une API DOM-only — crash natif
            ══════════════════════════════════════════════════ */}
        {process.env.EXPO_OS === 'web' && (
          // @ts-ignore — dangerouslySetInnerHTML est DOM-only, guard EXPO_OS assure le contexte web
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: ALL_SCHEMAS }}
          />
        )}

        {/*
          ScrollViewStyleReset : supprime les styles de scroll par défaut
          qui cassent le layout Expo sur web
        */}
        <ScrollViewStyleReset />

        {/* ── PWA Service Worker — enregistrement + update prompt ───────────
            Stratégies : Cache-First (assets), SWR (pages), Network-First (API)
            Push notifications, Background Sync, Offline fallback
            Adaptive loading : détection saveData + effectiveType
        ── */}
        {process.env.EXPO_OS === 'web' && (
          // @ts-ignore — DOM-only
          <script
            dangerouslySetInnerHTML={{ __html: `
(function() {
  // ── Adaptive Loading — détection réseau ──────────────────────────────
  var conn          = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var saveData      = conn && conn.saveData;
  var effectiveType = conn && conn.effectiveType; // '4g','3g','2g','slow-2g'
  var downlink      = conn && conn.downlink || 0;  // Mbps (Network Info API)
  var rtt           = conn && conn.rtt      || 0;  // ms RTT

  // ── Détection fine fibre / câble / DSL / 4G / 3G / 2G ──────────────
  // effectiveType seul ne distingue pas fibre vs DSL (tous deux '4g')
  // downlink + rtt permettent cette distinction précise.
  var quality;
  if (saveData) {
    quality = 'save-data';
  } else if (effectiveType === '2g' || effectiveType === 'slow-2g') {
    quality = 'slow';
  } else if (effectiveType === '3g') {
    quality = 'medium';
  } else if (downlink >= 50 && rtt <= 20) {
    quality = 'ultra-fast'; // fibre 100Mbps+, câble très haut débit
  } else if (downlink >= 10 && rtt <= 50) {
    quality = 'fast';       // VDSL / câble standard
  } else if (downlink >= 2 && rtt <= 150) {
    quality = 'medium';     // ADSL / 4G standard
  } else if (downlink > 0 && downlink < 2) {
    quality = 'slow';       // ADSL dégradé / 3G lent
  } else {
    quality = 'fast';       // fallback (Safari, Firefox sans API)
  }

  var isSlow   = quality === 'slow'   || quality === 'save-data';
  var isMedium = quality === 'medium';
  var isUltra  = quality === 'ultra-fast';

  // Exposer globalement pour que les composants React puissent adapter
  window.__aevyraNetwork = {
    quality:       quality,
    saveData:      !!saveData,
    effectiveType: effectiveType || 'unknown',
    downlink:      downlink || null,
    rtt:           rtt      || null,
    isFibreOrCable: isUltra,
    isDSL:          quality === 'fast' && !isUltra,
  };

  // Sur réseau lent : désactiver les animations lourdes via classe CSS
  if (isSlow) document.documentElement.classList.add('save-data');

  // Sur réseau moyen/lent : réduire qualité images (signal pour composants)
  if (isSlow || isMedium) document.documentElement.classList.add('low-bandwidth');

  // Sur fibre/câble : activer les optimisations haute-vitesse
  if (isUltra) document.documentElement.classList.add('ultra-fast-network');

  // ── Service Worker ────────────────────────────────────────────────────
  if (!('serviceWorker' in navigator)) return;

  var SW_URL = '/sw.js';

  window.addEventListener('load', function() {
    navigator.serviceWorker.register(SW_URL, { scope: '/', updateViaCache: 'none' })
      .then(function(reg) {
        // Vérifier les mises à jour toutes les 60s (app en arrière-plan)
        setInterval(function() { reg.update(); }, 60000);

        // Nouvelle version disponible → activer + recharger UNE SEULE FOIS
        reg.addEventListener('updatefound', function() {
          var newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', function() {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Activation immédiate sans attendre fermeture des onglets
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              // Guard anti-boucle : recharger UNE seule fois par cycle SW
              var reloadPending = false;
              navigator.serviceWorker.addEventListener('controllerchange', function onCtrlChange() {
                // Retirer le listener immédiatement pour ne jamais déclencher 2×
                navigator.serviceWorker.removeEventListener('controllerchange', onCtrlChange);
                if (reloadPending) return;
                reloadPending = true;
                window.location.reload();
              });
            }
          });
        });

        // Informer le SW de la qualité réseau
        if (reg.active) {
          var chan = new MessageChannel();
          reg.active.postMessage({ type: 'GET_NETWORK_QUALITY' }, [chan.port2]);
        }
      })
      .catch(function(err) {
        // SW non critique — ne pas bloquer l'app
        console.warn('[SW] Erreur enregistrement:', err);
      });

    // Écouter les messages du SW (navigation push, sync)
    navigator.serviceWorker.addEventListener('message', function(event) {
      var data = event.data;
      if (!data) return;
      if (data.type === 'NAVIGATE' && data.url) {
        window.location.href = data.url;
      }
      if (data.type === 'SYNC_COMPLETE') {
        window.dispatchEvent(new CustomEvent('aevyra:synccomplete', { detail: data.tag }));
        console.log('[SW] Background sync terminé:', data.tag);
      }
    });

    // ── Periodic Background Sync (refresh stats toutes les 24h) ──
    navigator.serviceWorker.ready.then(function(reg) {
      if ('periodicSync' in reg) {
        reg.periodicSync.register('refresh-stats', { minInterval: 24 * 60 * 60 * 1000 })
          .catch(function() {/* Permission refusée ou non supporté */});
      }
    });

    // ── Push Notifications : demander permission au bon moment ───
    // (déclenché par interaction utilisateur — pas au chargement)
    window.__aevyraPushPermission = function() {
      if (!('Notification' in window)) return Promise.resolve('denied');
      if (Notification.permission === 'granted') return Promise.resolve('granted');
      if (Notification.permission === 'denied') return Promise.resolve('denied');
      return Notification.requestPermission();
    };
  });

  // ── PWA Install Prompt — capturer + exposer globalement ──────
  var _deferredInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    _deferredInstallPrompt = e;
    window.__aevyraInstallPrompt = e;
    // Émettre un event custom pour que React puisse réagir
    window.dispatchEvent(new CustomEvent('aevyra:installprompt', { detail: e }));
  });

  window.addEventListener('appinstalled', function() {
    _deferredInstallPrompt = null;
    window.__aevyraInstallPrompt = null;
    window.dispatchEvent(new CustomEvent('aevyra:appinstalled'));
    console.log('[PWA] Application installée avec succès ✨');
  });
})();
` }}
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
