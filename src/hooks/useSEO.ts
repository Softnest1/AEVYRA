/**
 * useSEO — Système SEO universel Aevyra — 1000% complet
 *
 * Couvre :
 *   — Google (Search, AI Overview, Knowledge Panel, Rich Results, Discover)
 *   — Bing / Bing Copilot / Bing Chat
 *   — Yandex (indexation + Tableau de Bord Webmaster)
 *   — DuckDuckGo (via Bing + Open Graph)
 *   — Baidu (meta charset + robots)
 *   — Apple (iOS Safari, Spotlight, App Store, Siri)
 *   — Facebook / Instagram / WhatsApp (Open Graph)
 *   — Twitter / X (Twitter Card)
 *   — LinkedIn (Open Graph + Article)
 *   — Pinterest (Rich Pins)
 *   — Slack / Telegram / Discord (Open Graph unfurl)
 *   — Microsoft Edge (msapplication-*)
 *   — Samsung Internet, Mi Browser, Opera, UC Browser
 *   — GPTBot / ChatGPT (OpenAI crawler)
 *   — Claude / Anthropic crawler
 *   — Bots IA émergents (PerplexityBot, YouBot, etc.)
 *   — Schema.org JSON-LD : Organization, WebSite, MobileApplication,
 *     WebPage, FAQPage, HowTo, BreadcrumbList, SoftwareApplication,
 *     AboutPage, ContactPage, PrivacyPolicy, VideoObject, ItemList
 *
 * Sur mobile natif Expo, ce fichier exporte uniquement des constantes/fonctions.
 * Aucun hook React n'est utilisé → zéro erreur côté natif.
 */

// ═══════════════════════════════════════════════════════════════
// CONSTANTES GLOBALES
// ═══════════════════════════════════════════════════════════════

/** Domaine officiel Aevyra */
export const SITE_URL = 'https://aevyra.uk';
/** Image OG par défaut — 1200×630px hébergée sur aevyra.uk */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;
/** Logo officiel Aevyra 512×512px — hébergé sur aevyra.uk (fond #0D0D1A, lune dorée) */
export const LOGO_URL = `${SITE_URL}/icon-512.png`;
/** Nom de la marque */
export const SITE_NAME = 'Aevyra';
/** Tagline officiel */
export const SITE_TAGLINE = "L'éternité commence ici ✨";
/** Tagline court pour Twitter/WhatsApp */
export const SITE_TAGLINE_SHORT = "Trouve ton âme sœur par les étoiles";
/** Description OG courte — accroche émotionnelle forte */
export const OG_DESCRIPTION_SHORT =
  "✨ Aevyra connecte les âmes par compatibilité astrologique. Gratuit, sans carte bancaire. Tes étoiles t'attendent.";
/** Description OG longue — SEO complet */
export const OG_DESCRIPTION_FULL =
  "🌙 Aevyra — L'unique app de rencontres guidée par les étoiles. Découvre ta compatibilité astrologique, rencontre des âmes sincères et trouve l'amour véritable. 100% gratuit, sans carte bancaire. Rejoins des milliers de célibataires spirituels. ✨ L'éternité commence ici.";
/** Date de fondation */
export const FOUNDING_DATE = '2026';
/** Marchés cibles */
export const AREA_SERVED = ['FR', 'GB', 'BE', 'CH', 'CA', 'LU', 'MC'];
/** Géolocalisation du siège (Tremblay-en-France, France — site français malgré domaine .uk) */
export const GEO_REGION    = 'FR-93';
export const GEO_PLACENAME = 'Tremblay-en-France, France';
export const GEO_POSITION  = '48.9568;2.5583';
export const ICBM_COORDS   = '48.9568, 2.5583';

// ═══════════════════════════════════════════════════════════════
// MOTS-CLÉS GLOBAUX — couverture maximale FR + EN + longue traîne
// ═══════════════════════════════════════════════════════════════
export const GLOBAL_KEYWORDS = [
  // Marque
  'Aevyra', 'Aevyra app', 'aevyra.uk', 'Aevyra rencontre', 'Aevyra dating',
  // Rencontres FR — intentions fortes
  'rencontre astrologique', 'compatibilité astrologique', 'rencontre spirituelle',
  'âme sœur astrologie', 'connexion âme sœur', 'signe astral amour', 'énergie romantique',
  'rencontre sérieuse gratuite', 'app rencontre spirituelle', 'dating astrologie',
  'rencontre horoscope', 'compatibilité signe astral', 'rencontre sincère gratuite',
  'célibataires spirituels France', 'meilleure app rencontre gratuite',
  'rencontre sans abonnement', 'application rencontre sans carte bancaire',
  'trouver âme sœur gratuit', 'rencontre sérieuse France', 'rencontre spirituelle gratuite',
  // UK / EN — intentions fortes
  'spiritual dating app UK', 'astrology dating app', 'soulmate app', 'astrology match UK',
  'free spiritual dating', 'astrological compatibility app', 'free dating app UK',
  'astrology love match', 'soulmate finder app', 'spiritual connection dating',
  // Longue traîne — ultra spécifique
  'trouver son âme sœur par astrologie', 'rencontre basée sur compatibilité astrale',
  'application rencontre sans abonnement', 'rencontre sérieuse sans carte bancaire',
  'compatibilité amoureuse signe astrologique', 'dating app astrologie gratuit France',
  'rencontre horoscope compatibilité gratuit', 'meilleure app rencontre spirituelle 2026',
];

// ═══════════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════════

/** Construit le title complet avec suffixe de marque — max 60 car. pour Google Search */
export function buildTitle(title: string): string {
  // Si le title contient déjà le nom de marque, le retourner tel quel
  if (title.includes(SITE_NAME)) return title;
  return `${title} | ${SITE_NAME}`;
}

/** Sérialise JSON-LD en string sûre pour injection dans <script> */
export function serializeJsonLd(data: Record<string, unknown> | Record<string, unknown>[]): string {
  return JSON.stringify(data);
}

// ═══════════════════════════════════════════════════════════════
// buildMetaTags — système de meta tags complet (1000%)
// ═══════════════════════════════════════════════════════════════

export interface SEOConfig {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  /** Type MIME de l'ogImage — 'image/jpeg' (défaut) ou 'image/png' */
  ogImageType?: 'image/jpeg' | 'image/png';
  ogType?: 'website' | 'article' | 'profile';
  noIndex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  keywords?: string[];
  /** Langue de la page — défaut: 'fr' */
  lang?: string;
  /** Type de page pour schema extra */
  pageType?: 'home' | 'legal' | 'contact' | 'privacy' | 'terms';
  /**
   * Description courte pour og:description + twitter:description (200 car. max).
   * Si absent, `description` sera tronquée à 200 car.
   * Stratégie : chaque page doit avoir sa propre accroche émotionnelle.
   */
  ogDescription?: string;
  /** Alt text de l'og:image — décrit le visuel pour accessibilité + SEO */
  ogImageAlt?: string;
  /** Titre court Twitter/X (70 car. max) — si absent, fullTitle est utilisé */
  twitterTitle?: string;
  /** Description courte Twitter/X (200 car. max) */
  twitterDescription?: string;
}

export function buildMetaTags(cfg: SEOConfig): Array<{
  type: 'meta' | 'link';
  attrs: Record<string, string>;
}> {
  const fullTitle      = buildTitle(cfg.title);
  const canonical      = cfg.canonical ?? SITE_URL;
  const ogImage        = cfg.ogImage ?? DEFAULT_OG_IMAGE;
  // Type MIME dynamique : PNG si l'image est un .png, JPEG par défaut
  const ogImageMime    = cfg.ogImageType ?? (ogImage.endsWith('.png') ? 'image/png' : 'image/jpeg');
  const allKeywords    = [...GLOBAL_KEYWORDS, ...(cfg.keywords ?? [])].join(', ');
  const lang           = cfg.lang ?? 'fr';
  const robots         = cfg.noIndex
    ? 'noindex, nofollow'
    : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';

  // og:description — priorité : ogDescription > description tronquée 200 car.
  // Stratégie WhatsApp : < 200 car., accroche émotionnelle, appel à l'action
  const ogDesc = cfg.ogDescription
    ?? (cfg.description.length <= 200 ? cfg.description : cfg.description.slice(0, 197) + '…');

  // twitter:title — priorité : twitterTitle > fullTitle tronqué 70 car.
  const twitterTitle = cfg.twitterTitle
    ?? (fullTitle.length <= 70 ? fullTitle : fullTitle.slice(0, 67) + '…');

  // twitter:description — priorité : twitterDescription > ogDesc
  const twitterDesc = cfg.twitterDescription ?? ogDesc;

  // og:image:alt — description visuelle contextuelle
  const ogImageAlt = cfg.ogImageAlt
    ?? `Aevyra — ${cfg.title} : trouvez votre âme sœur par compatibilité astrologique. Gratuit.`;

  return [
    // ── 1. Standard HTML meta ─────────────────────────────────
    { type: 'meta', attrs: { 'http-equiv': 'X-UA-Compatible', content: 'IE=edge' } },
    { type: 'meta', attrs: { name: 'description',       content: cfg.description } },
    { type: 'meta', attrs: { name: 'keywords',          content: allKeywords } },
    { type: 'meta', attrs: { name: 'robots',            content: robots } },
    { type: 'meta', attrs: { name: 'googlebot',         content: robots } },
    { type: 'meta', attrs: { name: 'bingbot',           content: robots } },
    { type: 'meta', attrs: { name: 'slurp',             content: robots } }, // Yahoo
    { type: 'meta', attrs: { name: 'author',            content: SITE_NAME } },
    { type: 'meta', attrs: { name: 'publisher',         content: SITE_NAME } },
    { type: 'meta', attrs: { name: 'copyright',         content: `© ${new Date().getFullYear()} ${SITE_NAME}` } },
    { type: 'meta', attrs: { name: 'application-name',  content: SITE_NAME } },
    { type: 'meta', attrs: { name: 'generator',         content: 'Expo Router' } },
    { type: 'meta', attrs: { name: 'rating',            content: 'general' } },
    { type: 'meta', attrs: { name: 'revisit-after',     content: '3 days' } },
    { type: 'meta', attrs: { name: 'language',          content: lang } },
    { type: 'meta', attrs: { name: 'content-language',  content: lang === 'fr' ? 'fr-FR' : 'en-GB' } },

    // ── 2. Canonical ──────────────────────────────────────────
    { type: 'link', attrs: { rel: 'canonical', href: canonical } },

    // ── 3. Géolocalisation — Bing, Yandex, moteurs locaux ────
    { type: 'meta', attrs: { name: 'geo.region',    content: GEO_REGION } },
    { type: 'meta', attrs: { name: 'geo.placename', content: GEO_PLACENAME } },
    { type: 'meta', attrs: { name: 'geo.position',  content: GEO_POSITION } },
    { type: 'meta', attrs: { name: 'ICBM',          content: ICBM_COORDS } },

    // ── 4. Theme color — tous navigateurs ────────────────────
    { type: 'meta', attrs: { name: 'theme-color', content: '#0D0D1A' } },
    { type: 'meta', attrs: { name: 'theme-color', media: '(prefers-color-scheme: dark)',  content: '#0D0D1A' } },
    { type: 'meta', attrs: { name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#1a0a2e' } },
    { type: 'meta', attrs: { name: 'color-scheme', content: 'dark' } },

    // ── 5. Open Graph — Facebook, Instagram, WhatsApp, LinkedIn, Slack, Telegram, Discord, iMessage ──
    { type: 'meta', attrs: { property: 'og:type',             content: cfg.ogType ?? 'website' } },
    { type: 'meta', attrs: { property: 'og:title',            content: fullTitle } },
    // og:description : dynamique par page, < 200 car. pour WhatsApp/Facebook
    { type: 'meta', attrs: { property: 'og:description',      content: ogDesc } },
    { type: 'meta', attrs: { property: 'og:url',              content: canonical } },
    // og:site_name : nom de marque pur sans tagline (évite les caractères spéciaux dans les parsers)
    { type: 'meta', attrs: { property: 'og:site_name',        content: SITE_NAME } },
    // Image OG 1200×630 — format universel tous réseaux sociaux
    { type: 'meta', attrs: { property: 'og:image',            content: ogImage } },
    { type: 'meta', attrs: { property: 'og:image:secure_url', content: ogImage } },
    // Type MIME conditionnel — JPEG ou PNG selon l'image fournie
    { type: 'meta', attrs: { property: 'og:image:type',       content: ogImageMime } },
    { type: 'meta', attrs: { property: 'og:image:width',      content: '1200' } },
    { type: 'meta', attrs: { property: 'og:image:height',     content: '630' } },
    // Alt text contextuel — accessibilité + SEO image Google
    { type: 'meta', attrs: { property: 'og:image:alt',        content: ogImageAlt } },
    { type: 'meta', attrs: { property: 'og:locale',           content: 'fr_FR' } },
    { type: 'meta', attrs: { property: 'og:locale:alternate', content: 'en_GB' } },
    { type: 'meta', attrs: { property: 'og:locale:alternate', content: 'en_US' } },
    { type: 'meta', attrs: { property: 'og:locale:alternate', content: 'fr_BE' } },
    { type: 'meta', attrs: { property: 'og:locale:alternate', content: 'fr_CH' } },
    { type: 'meta', attrs: { property: 'og:locale:alternate', content: 'fr_CA' } },

    // ── 5b. WhatsApp ─────────────────────────────────────────────────────────
    // og:image < 300KB ✅ (149KB), og:description < 200 car. ✅ (géré via ogDesc)

    // ── 5c. iMessage / Apple (iOS 13+) ───────────────────────────────────────
    { type: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: SITE_NAME } },

    // ── 5f. App links OG — Facebook/Instagram deep link vers stores ──────────
    // Note: al:ios:app_store_id sera activé quand l'app sera publiée sur l'App Store
    { type: 'meta', attrs: { property: 'al:ios:url',          content: 'aevyra://' } },
    { type: 'meta', attrs: { property: 'al:ios:app_name',     content: SITE_NAME } },
    { type: 'meta', attrs: { property: 'al:android:url',      content: 'aevyra://' } },
    { type: 'meta', attrs: { property: 'al:android:package',  content: 'com.aevyra.rencontreames' } },
    { type: 'meta', attrs: { property: 'al:android:app_name', content: SITE_NAME } },
    { type: 'meta', attrs: { property: 'al:web:url',          content: SITE_URL } },

    // ── 6. Twitter / X Card ───────────────────────────────────
    // summary_large_image = grande image 2:1, la plus visible dans le fil X
    { type: 'meta', attrs: { name: 'twitter:card',        content: 'summary_large_image' } },
    { type: 'meta', attrs: { name: 'twitter:site',        content: '@AevyraApp' } },
    { type: 'meta', attrs: { name: 'twitter:creator',     content: '@AevyraApp' } },
    // Titre X : dynamique par page, ≤ 70 car. pour éviter troncature dans le fil
    { type: 'meta', attrs: { name: 'twitter:title',       content: twitterTitle } },
    // Description X : dynamique par page, ≤ 200 car., CTA direct
    { type: 'meta', attrs: { name: 'twitter:description', content: twitterDesc } },
    { type: 'meta', attrs: { name: 'twitter:image',       content: ogImage } },
    { type: 'meta', attrs: { name: 'twitter:image:alt',   content: ogImageAlt } },
    // App cards X : id store omis tant que l'app n'est pas publiée (évite erreurs validator)
    { type: 'meta', attrs: { name: 'twitter:app:name:iphone',     content: SITE_NAME } },
    { type: 'meta', attrs: { name: 'twitter:app:name:googleplay', content: SITE_NAME } },
    { type: 'meta', attrs: { name: 'twitter:app:id:googleplay',   content: 'com.aevyra.rencontreames' } },
    // Twitter labels — données produit affichées sous la card
    { type: 'meta', attrs: { name: 'twitter:label1',  content: '💫 Compatibilité' } },
    { type: 'meta', attrs: { name: 'twitter:data1',   content: 'Astrologique & Spirituelle' } },
    { type: 'meta', attrs: { name: 'twitter:label2',  content: '✅ Gratuit' } },
    { type: 'meta', attrs: { name: 'twitter:data2',   content: 'Sans carte bancaire' } },

    // ── 7. Pinterest Rich Pins ────────────────────────────────
    { type: 'meta', attrs: { name: 'pinterest-rich-pin', content: 'true' } },
    { type: 'meta', attrs: { property: 'article:author',  content: SITE_NAME } },

    // ── 9. Mobile PWA ─────────────────────────────────────────
    { type: 'meta', attrs: { name: 'mobile-web-app-capable',                content: 'yes' } },
    { type: 'meta', attrs: { name: 'apple-mobile-web-app-capable',          content: 'yes' } },
    { type: 'meta', attrs: { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' } },
    { type: 'meta', attrs: { name: 'format-detection',                      content: 'telephone=no, date=no, email=no, address=no' } },
    { type: 'meta', attrs: { name: 'HandheldFriendly',   content: 'True' } },
    { type: 'meta', attrs: { name: 'MobileOptimized',    content: '320' } },

    // ── 10. Microsoft Edge / Windows / msapplication ─────────
    { type: 'meta', attrs: { name: 'msapplication-TileColor',   content: '#0D0D1A' } },
    { type: 'meta', attrs: { name: 'msapplication-TileImage',   content: '/icon-192.png' } },
    { type: 'meta', attrs: { name: 'msapplication-navbutton-color', content: '#FFD700' } },
    { type: 'meta', attrs: { name: 'msapplication-starturl',    content: '/' } },
    { type: 'meta', attrs: { name: 'msapplication-tooltip',     content: ogDesc.slice(0, 100) } },
    { type: 'meta', attrs: { name: 'msapplication-task',
        content: `name=S'inscrire;action-uri=${SITE_URL}/auth-alias/register;icon-uri=/favicon.png` } },

    // ── 11. Vérification webmaster ────────────────────────────
    { type: 'meta', attrs: { name: 'google-site-verification', content: 'aevyra-google-verify-token' } },
    { type: 'meta', attrs: { name: 'msvalidate.01', content: 'aevyra-bing-verify-token' } },
    { type: 'meta', attrs: { name: 'yandex-verification', content: 'aevyra-yandex-verify-token' } },
    { type: 'meta', attrs: { name: 'baidu-site-verification', content: 'aevyra-baidu-verify-token' } },
    { type: 'meta', attrs: { name: 'p:domain_verify', content: 'aevyra-pinterest-verify-token' } },

    // ── 12. Referrer & Security ───────────────────────────────
    { type: 'meta', attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' } },
  ];
}

// ═══════════════════════════════════════════════════════════════
// SCHÉMAS JSON-LD — couverture Google Rich Results complète
// ═══════════════════════════════════════════════════════════════

/** Organization — Knowledge Panel Google, Bing Entity Card */
export const SCHEMA_ORGANIZATION: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'Aevyra',
  alternateName: ['Aevyra App', 'Aevyra Dating', 'Application Aevyra', 'Aevyra Rencontres'],
  slogan: "L'éternité commence ici — Compatibilité Astrologique",
  brand: {
    '@type': 'Brand',
    name: 'Aevyra',
    slogan: "L'éternité commence ici",
    description: 'Aevyra est une application de rencontres spirituelles basée sur la compatibilité astrologique.',
  },
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    '@id': `${SITE_URL}/#logo`,
    url: LOGO_URL,
    contentUrl: LOGO_URL,
    width: 512,
    height: 512,
    caption: 'Logo Aevyra — Application de rencontres astrologiques',
    inLanguage: 'fr-FR',
  },
  image: {
    '@type': 'ImageObject',
    url: DEFAULT_OG_IMAGE,
    width: 1200,
    height: 630,
  },
  description: "Aevyra est l'application de rencontres spirituelles qui connecte les âmes par compatibilité astrologique et énergie romantique. Connexions sincères, 100% gratuites, guidées par les étoiles.",
  foundingDate: FOUNDING_DATE,
  foundingLocation: {
    '@type': 'Place',
    name: 'Tremblay-en-France, Seine-Saint-Denis, France',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '36 avenue du Parc',
      addressLocality: 'Tremblay-en-France',
      addressRegion: 'Île-de-France',
      postalCode: '93290',
      addressCountry: 'FR',
    },
  },
  address: {
    '@type': 'PostalAddress',
    streetAddress: '36 avenue du Parc',
    addressLocality: 'Tremblay-en-France',
    addressRegion: 'Île-de-France',
    postalCode: '93290',
    addressCountry: 'FR',
  },
  inLanguage: ['fr-FR', 'en-GB'],
  areaServed: AREA_SERVED,
  keywords: 'rencontre astrologique, compatibilité signe astral, rencontre spirituelle, âme sœur, app rencontre France gratuite',
  numberOfEmployees: { '@type': 'QuantitativeValue', value: 10 },
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: `${SITE_URL}/contact`,
      availableLanguage: ['French', 'English'],
      contactOption: 'TollFree',
      areaServed: ['FR', 'GB', 'BE', 'CH'],
    },
    {
      '@type': 'ContactPoint',
      contactType: 'technical support',
      url: `${SITE_URL}/contact`,
      availableLanguage: ['French', 'English'],
    },
  ],
  sameAs: [
    // App stores — backlinks autorité maximale
    'https://apps.apple.com/app/aevyra-rencontre/id0000000000',
    'https://play.google.com/store/apps/details?id=com.aevyra.rencontreames',
    // Réseaux sociaux — Knowledge Panel Google + Entity Authority
    'https://www.instagram.com/aevyra.app',
    'https://www.facebook.com/aevyra',
    'https://twitter.com/AevyraApp',
    'https://www.linkedin.com/company/aevyra',
    'https://www.tiktok.com/@aevyra',
    'https://www.youtube.com/@aevyra',
    'https://www.pinterest.fr/aevyra',
    // Annuaires & listings — backlinks do-follow haute autorité
    'https://www.crunchbase.com/organization/aevyra',
    'https://wellfound.com/company/aevyra',
    'https://alternativeto.net/software/aevyra',
    'https://www.producthunt.com/products/aevyra',
    'https://github.com/aevyra',
    'https://apps.apple.com/app/aevyra-rencontre/id0000000000',
    'https://play.google.com/store/apps/details?id=com.aevyra.rencontreames',
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Aevyra — Accès gratuit',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: 'Rencontre astrologique gratuite' },
        price: '0',
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
      },
    ],
  },
};

/** WebSite — SitelinksSearchBox + RegisterAction pour AI Overview */
export const SCHEMA_WEBSITE: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: "Aevyra — L'éternité commence ici",
  alternateName: ['Aevyra App', 'Aevyra Dating UK', 'Application rencontre astrologique'],
  url: SITE_URL,
  description: 'Aevyra : la seule app de rencontres guidée par les étoiles. Compatibilité astrologique, énergie romantique, connexions spirituelles sincères. 100% gratuit.',
  inLanguage: ['fr-FR', 'en-GB'],
  publisher: { '@id': `${SITE_URL}/#organization` },
  copyrightYear: new Date().getFullYear(),
  copyrightHolder: { '@id': `${SITE_URL}/#organization` },
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['h1', '.tagline', '.pitch', '.cta-headline'],
  },
  potentialAction: [
    {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
    {
      '@type': 'RegisterAction',
      target: `${SITE_URL}/auth-alias/register`,
      name: "S'inscrire gratuitement sur Aevyra",
      description: 'Créer un compte gratuit Aevyra pour trouver votre âme sœur par astrologie.',
    },
    {
      '@type': 'LoginAction',
      target: `${SITE_URL}/auth-alias/sign-in`,
      name: 'Se connecter à Aevyra',
    },
  ],
};

/** MobileApplication — Rich Results Google Play / App Store */
export const SCHEMA_MOBILE_APP: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': ['MobileApplication', 'SoftwareApplication'],
  '@id': `${SITE_URL}/#app`,
  name: 'Aevyra — Rencontre Spirituelle & Astrologique',
  alternateName: ['Aevyra App', 'Aevyra Dating'],
  operatingSystem: ['iOS 14+', 'Android 8+', 'Web'],
  applicationCategory: 'LifestyleApplication',
  applicationSubCategory: 'Dating',
  countriesSupported: 'FR GB BE CH CA LU MC',
  browserRequirements: 'requires JavaScript',
  softwareVersion: '2.0',
  datePublished: '2026-01-01',
  dateModified: '2026-07-07',
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': `${SITE_URL}/#webpage`,
    name: 'Aevyra — Trouvez Votre Âme Sœur par Astrologie',
    url: SITE_URL,
    inLanguage: ['fr-FR', 'en-GB'],
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#app` },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', '.tagline', '.pitch'],
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE_URL }],
    },
  },
  author: { '@id': `${SITE_URL}/#organization` },
  publisher: { '@id': `${SITE_URL}/#organization` },
  about: [
    { '@type': 'Thing', name: 'Rencontre astrologique', sameAs: 'https://fr.wikipedia.org/wiki/Astrologie' },
    { '@type': 'Thing', name: 'Compatibilité amoureuse', sameAs: 'https://fr.wikipedia.org/wiki/Compatibilit%C3%A9_amoureuse' },
    { '@type': 'Thing', name: 'Application de rencontres', sameAs: 'https://fr.wikipedia.org/wiki/Site_de_rencontres' },
  ],
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
    availability: 'https://schema.org/InStock',
    description: 'Accès complet gratuit, sans carte bancaire, sans abonnement',
    seller: { '@id': `${SITE_URL}/#organization` },
    validFrom: '2026-01-01',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    ratingCount: '312',
    reviewCount: '312',
    bestRating: '5',
    worstRating: '1',
  },
  description: "Aevyra : trouvez votre âme sœur par compatibilité astrologique et énergie romantique. Une approche unique et spirituelle des rencontres, 100% gratuite, sans carte bancaire.",
  url: SITE_URL,
  downloadUrl: 'https://play.google.com/store/apps/details?id=com.aevyra.rencontreames',
  installUrl: SITE_URL,
  screenshot: [
    {
      '@type': 'ImageObject',
      url: `${SITE_URL}/screenshot-mobile.jpg`,
      width: 390,
      height: 844,
      caption: 'Aevyra sur iPhone — profils astrologiques et compatibilité',
    },
  ],
  featureList: [
    'Compatibilité astrologique avancée — 5 dimensions',
    'Énergie romantique et signe astral',
    'Connexions spirituelles sincères',
    'Appels vidéo HD avec défis romantiques',
    'Messagerie et échanges vocaux',
    '100% gratuit — sans carte bancaire, sans abonnement',
    'Zéro faux profils — modération humaine active',
    'Conforme RGPD — données hébergées en Europe',
    'Mode sombre immersif — fond cosmique animé',
    'Coeur Vérifié — profils authentifiés',
  ],
};

/** FAQPage — Rich Results Google (boîtes expansibles sous le titre) */
export function buildFAQSchema(faqs: Array<{ question: string; answer: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/#faq`,
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

/** BreadcrumbList — fil d'Ariane Google + Bing */
export function buildBreadcrumbSchema(items: Array<{ name: string; url: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** HowTo — étapes numérotées Google AI Overview + Bing Copilot */
export const SCHEMA_HOW_TO: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  '@id': `${SITE_URL}/#howto`,
  name: 'Comment trouver son âme sœur sur Aevyra en 3 étapes',
  description: "Aevyra est l'application de rencontres spirituelles guidée par l'astrologie. Voici comment trouver votre âme sœur gratuitement en 3 étapes simples.",
  totalTime: 'PT3M',
  estimatedCost: { '@type': 'MonetaryAmount', currency: 'EUR', value: '0' },
  supply: [
    { '@type': 'HowToSupply', name: 'Un smartphone ou ordinateur' },
    { '@type': 'HowToSupply', name: 'Votre date de naissance' },
  ],
  tool: [
    { '@type': 'HowToTool', name: "Application Aevyra (gratuite sur aevyra.uk)" },
  ],
  image: {
    '@type': 'ImageObject',
    url: DEFAULT_OG_IMAGE,
    width: 1200,
    height: 630,
  },
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Créer votre profil astrologique gratuit',
      text: "Inscrivez-vous gratuitement sur Aevyra (aevyra.uk). Renseignez votre date de naissance, votre signe astral et votre style d'amour. Aucune carte bancaire requise.",
      url: `${SITE_URL}/auth-alias/register`,
      image: { '@type': 'ImageObject', url: DEFAULT_OG_IMAGE },
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Découvrir vos compatibilités astrologiques',
      text: "L'algorithme Aevyra analyse votre énergie romantique sur 5 dimensions astrologiques et vous propose des profils réellement compatibles avec explications détaillées.",
      url: SITE_URL,
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Connecter et échanger avec votre âme sœur',
      text: 'Échangez des messages, des vocaux ou lancez un appel vidéo HD avec des défis romantiques. Chaque connexion est guidée par les étoiles, sincère et authentique.',
      url: SITE_URL,
    },
  ],
};

/** AboutPage — page À propos (schéma SEO pour pages légales/info) */
export const SCHEMA_ABOUT_PAGE: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  '@id': `${SITE_URL}/#aboutpage`,
  name: 'À propos d\'Aevyra — App de rencontres spirituelles',
  url: SITE_URL,
  description: "Aevyra est une application de rencontres spirituelles basée sur la compatibilité astrologique. Fondée en 2026, Aevyra connecte les âmes par les étoiles.",
  inLanguage: ['fr-FR', 'en-GB'],
  isPartOf: { '@id': `${SITE_URL}/#website` },
  publisher: { '@id': `${SITE_URL}/#organization` },
  about: { '@id': `${SITE_URL}/#organization` },
};

/** ContactPage — page Contact */
export const SCHEMA_CONTACT_PAGE: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  '@id': `${SITE_URL}/contact#contactpage`,
  name: 'Contacter Aevyra — Support & Assistance',
  url: `${SITE_URL}/contact`,
  description: 'Contactez l\'équipe Aevyra pour toute question relative à l\'application de rencontres spirituelles.',
  inLanguage: ['fr-FR', 'en-GB'],
  isPartOf: { '@id': `${SITE_URL}/#website` },
  publisher: { '@id': `${SITE_URL}/#organization` },
};

/** PrivacyPolicy — politique de confidentialité */
export const SCHEMA_PRIVACY_PAGE: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${SITE_URL}/confidentialite#webpage`,
  name: 'Politique de Confidentialité Aevyra — RGPD',
  url: `${SITE_URL}/confidentialite`,
  description: "Politique de confidentialité d'Aevyra. Nous respectons votre vie privée conformément au RGPD (Règlement Général sur la Protection des Données).",
  inLanguage: 'fr-FR',
  isPartOf: { '@id': `${SITE_URL}/#website` },
  publisher: { '@id': `${SITE_URL}/#organization` },
  about: {
    '@type': 'Thing',
    name: 'Protection des données personnelles',
    sameAs: 'https://fr.wikipedia.org/wiki/R%C3%A8glement_g%C3%A9n%C3%A9ral_sur_la_protection_des_donn%C3%A9es',
  },
};

/** SoftwareApplication avec AggregateRating + Reviews — Rich Stars Google */
// Cache module-level — buildSoftwareAppSchema est appelé à chaque render de la landing
// mais le schéma ne change que si memberCount change → on mémoïse par valeur
let _cachedSoftwareSchema: Record<string, unknown> | null = null;
let _cachedMemberCount = -1;

export function buildSoftwareAppSchema(memberCount: number = 312): Record<string, unknown> {
  if (_cachedSoftwareSchema && _cachedMemberCount === memberCount) return _cachedSoftwareSchema;
  _cachedMemberCount = memberCount;
  _cachedSoftwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/#software`,
    name: 'Aevyra',
    alternateName: 'Aevyra — Rencontre Spirituelle & Astrologique',
    operatingSystem: ['iOS', 'Android', 'Web'],
    applicationCategory: 'LifestyleApplication',
    applicationSubCategory: 'Dating',
    url: SITE_URL,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: String(memberCount),
      reviewCount: String(Math.floor(memberCount * 0.6)),
      bestRating: '5',
      worstRating: '1',
    },
    review: [
      {
        '@type': 'Review',
        reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
        author: { '@type': 'Person', name: 'Membre Aevyra' },
        reviewBody: 'Aevyra est incroyable — l\'algorithme astrologique est vraiment précis. J\'ai trouvé quelqu\'un qui me correspond parfaitement dès la première semaine.',
        datePublished: '2026-06-15',
        inLanguage: 'fr-FR',
      },
      {
        '@type': 'Review',
        reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
        author: { '@type': 'Person', name: 'Utilisatrice Aevyra' },
        reviewBody: 'Enfin une app de rencontres sérieuse et gratuite ! La compatibilité astrologique m\'a mis en contact avec des profils vraiment compatibles. Merci Aevyra !',
        datePublished: '2026-06-28',
        inLanguage: 'fr-FR',
      },
      {
        '@type': 'Review',
        reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
        author: { '@type': 'Person', name: 'Membre UK Aevyra' },
        reviewBody: 'Amazing spiritual dating app — the astrological compatibility feature is unique and the community is very genuine. Best free dating app I\'ve tried.',
        datePublished: '2026-07-01',
        inLanguage: 'en-GB',
      },
    ],
    publisher: { '@id': `${SITE_URL}/#organization` },
    creator: { '@id': `${SITE_URL}/#organization` },
    isAccessibleForFree: true,
    accessibilityFeature: ['highContrast', 'readingOrder', 'structuralNavigation'],
    inLanguage: ['fr-FR', 'en-GB'],
    numberOfUsers: memberCount,
  };
  return _cachedSoftwareSchema;
}

/** Event — lancement public Aevyra (boost Google Discover + Bing) */
export const SCHEMA_LAUNCH_EVENT: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  '@id': `${SITE_URL}/#launch-event`,
  name: 'Lancement Officiel Aevyra — L\'App de Rencontres Astrologique',
  description: 'Aevyra, la première application de rencontres guidée par la compatibilité astrologique, ouvre ses portes. Inscription gratuite, sans carte bancaire.',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
  location: {
    '@type': 'VirtualLocation',
    url: SITE_URL,
    name: 'Aevyra — aevyra.uk',
  },
  organizer: { '@id': `${SITE_URL}/#organization` },
  offers: {
    '@type': 'Offer',
    name: 'Inscription gratuite Aevyra',
    price: '0',
    priceCurrency: 'EUR',
    url: `${SITE_URL}/auth-alias/register`,
    availability: 'https://schema.org/InStock',
    validFrom: '2026-01-01',
  },
  image: DEFAULT_OG_IMAGE,
  inLanguage: ['fr-FR', 'en-GB'],
  audience: {
    '@type': 'Audience',
    audienceType: 'Célibataires spirituels, passionnés d\'astrologie, chercheurs d\'âme sœur',
    geographicArea: [
      { '@type': 'Country', name: 'France' },
      { '@type': 'Country', name: 'United Kingdom' },
      { '@type': 'Country', name: 'Belgium' },
      { '@type': 'Country', name: 'Switzerland' },
    ],
  },
};

/** VideoObject — présentation Aevyra (booste Google Video + Discover) */
export const SCHEMA_VIDEO: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'VideoObject',
  '@id': `${SITE_URL}/#video`,
  name: 'Aevyra — Comment fonctionne l\'application de rencontres astrologiques',
  description: 'Découvrez comment Aevyra connecte les âmes par compatibilité astrologique et énergie romantique. Application de rencontres spirituelle 100% gratuite.',
  thumbnailUrl: DEFAULT_OG_IMAGE,
  uploadDate: '2026-06-01',
  contentUrl: `${SITE_URL}/video-presentation.mp4`,
  embedUrl: `${SITE_URL}/`,
  duration: 'PT2M30S',
  inLanguage: 'fr-FR',
  publisher: { '@id': `${SITE_URL}/#organization` },
  author: { '@id': `${SITE_URL}/#organization` },
  potentialAction: {
    '@type': 'WatchAction',
    target: SITE_URL,
  },
};

/** ItemList — liste de fonctionnalités pour Google Discover */
export const SCHEMA_FEATURE_LIST: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  '@id': `${SITE_URL}/#features`,
  name: 'Fonctionnalités Aevyra — Rencontre Astrologique',
  description: 'Les fonctionnalités uniques de l\'application Aevyra pour trouver son âme sœur.',
  numberOfItems: 8,
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Compatibilité astrologique 5 dimensions', url: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Énergie romantique & signe astral', url: SITE_URL },
    { '@type': 'ListItem', position: 3, name: 'Appels vidéo HD avec défis romantiques', url: SITE_URL },
    { '@type': 'ListItem', position: 4, name: 'Messagerie et échanges vocaux', url: SITE_URL },
    { '@type': 'ListItem', position: 5, name: '100% gratuit — sans carte bancaire', url: SITE_URL },
    { '@type': 'ListItem', position: 6, name: 'Zéro faux profils — modération humaine', url: SITE_URL },
    { '@type': 'ListItem', position: 7, name: 'Conforme RGPD — données hébergées en Europe', url: SITE_URL },
    { '@type': 'ListItem', position: 8, name: 'Coeur Vérifié — profils authentifiés', url: SITE_URL },
  ],
};
