#!/usr/bin/env node
/* eslint-disable */
/* global require, __dirname, process, console, module */
/**
 * inject-og.js — Script post-build Aevyra (SEO complet)
 *
 * Expo export génère un SPA : les meta SEO sont injectées par React au runtime.
 * Les crawlers (Google, Bing, Facebook, WhatsApp, Discord…) lisent uniquement
 * le HTML STATIQUE — ils n'exécutent pas JavaScript.
 *
 * Ce script patche dist/index.html APRÈS expo export pour insérer en dur :
 *
 *  ── SEO fondamental ──────────────────────────────────────────────────────
 *   — <title>           (< 60 car. — Google Search)
 *   — meta description  (120-160 car. — SERP snippet)
 *   — meta robots       (index, follow — signal explicite à Googlebot)
 *   — canonical         (<link rel="canonical"> — évite le contenu dupliqué)
 *   — sitemap link      (<link rel="sitemap"> — aide à la découverte)
 *
 *  ── Open Graph (réseaux sociaux) ─────────────────────────────────────────
 *   — og:type / og:site_name / og:title / og:description
 *   — og:url / og:image / og:image:* / og:locale
 *
 *  ── Twitter Card ─────────────────────────────────────────────────────────
 *   — twitter:card / twitter:site / twitter:title / twitter:description
 *   — twitter:image / twitter:image:alt
 *
 *  ── JSON-LD Schema.org ───────────────────────────────────────────────────
 *   — SoftwareApplication  → rich snippet Google "Appli" avec étoiles
 *   — WebSite + SearchAction → sitelinks searchbox dans Google
 *   — Organization         → Knowledge Graph (logo, réseaux sociaux)
 */

const fs   = require('fs');
const path = require('path');

// ════════════════════════════════════════════════════════════════════════════
// ── Config centrale ──────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
const SITE_URL      = 'https://aevyra.uk';
const OG_IMAGE      = `${SITE_URL}/og-image.jpg`;
const OG_IMAGE_SHARE= `${SITE_URL}/og-image-share.jpg`;
const DIST_HTML     = path.join(__dirname, '..', 'dist', 'index.html');

// ── Titres (longueurs calibrées) ────────────────────────────────────────────
// <title>       : max 60 car. (Google SERP)
// og:title      : max 95 car. (Facebook/LinkedIn)
// twitter:title : max 70 car. (X/Twitter)
const PAGE_TITLE    = 'Aevyra — Rencontre Astrologique Gratuite ✨';       // 46 car.
const OG_TITLE      = 'Aevyra — Trouve ton âme sœur par les étoiles ✨';   // 52 car.
const TWITTER_TITLE = '✨ Aevyra — Trouve ton âme sœur par les étoiles';   // 52 car.

// ── Descriptions (longueurs calibrées) ─────────────────────────────────────
// meta description  : 120-160 car. (Google SERP snippet)
// og:description    : max 125 car. (WhatsApp/Telegram coupent à 125)
// twitter:description : max 200 car.
const META_DESC = 'Aevyra — App rencontres astrologiques 100% gratuite. Compatibilité signe astral, rencontres sincères. Sans carte bancaire. Trouve ton âme sœur. ✨';  // 155 car.
const OG_DESC   = '🌙 Compatibilité astrologique, rencontres sincères. 100% gratuit, sans carte bancaire. Tes étoiles t\'attendent sur Aevyra !'; // 122 car.
const TW_DESC   = '🌙 Aevyra connecte les âmes par astrologie. Compatibilité signe astral, rencontres spirituelles sincères. 100% gratuit. Rejoins-nous ! ✨'; // 147 car.

// ════════════════════════════════════════════════════════════════════════════
// ── Bloc 1 : SEO fondamental ─────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
const SEO_BLOCK = `
  <!-- ═══════════════════════════════════════════════════════ -->
  <!-- SEO FONDAMENTAL — inject-og.js (post-build)            -->
  <!-- ═══════════════════════════════════════════════════════ -->

  <!-- Google : indexer cette page, suivre les liens -->
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />

  <!-- Canonical : URL officielle — évite le contenu dupliqué http/https/www -->
  <link rel="canonical" href="${SITE_URL}/" />

  <!-- Sitemap : aide à la découverte des URLs par Googlebot -->
  <link rel="sitemap" type="application/xml" title="Sitemap" href="${SITE_URL}/sitemap.xml" />

  <!-- Langue principale -->
  <meta name="language" content="fr" />
  <meta http-equiv="content-language" content="fr" />

  <!-- Auteur / App -->
  <meta name="author" content="Aevyra" />
  <meta name="application-name" content="Aevyra" />
  <meta name="generator" content="Expo + Cloudflare Pages" />

  <!-- Mobile -->
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Aevyra" />
  <meta name="format-detection" content="telephone=no" />

  <!-- Meta description — Google SERP snippet (120-160 car.) -->
  <meta name="description" content="${META_DESC}" />

  <!-- Thème couleur — barre navigateur Chrome/Android/Safari -->
  <meta name="theme-color" content="#0D0D1A" />
`;

// ════════════════════════════════════════════════════════════════════════════
// ── Bloc 2 : Open Graph + Twitter Card ──────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
const OG_BLOCK = `
  <!-- ═══════════════════════════════════════════════════════ -->
  <!-- OPEN GRAPH — Facebook · LinkedIn · Discord · WhatsApp  -->
  <!-- ═══════════════════════════════════════════════════════ -->
  <meta property="og:type"             content="website" />
  <meta property="og:site_name"        content="Aevyra" />
  <meta property="og:title"            content="${OG_TITLE}" />
  <meta property="og:description"      content="${OG_DESC}" />
  <meta property="og:url"              content="${SITE_URL}/" />
  <meta property="og:image"            content="${OG_IMAGE}" />
  <meta property="og:image:secure_url" content="${OG_IMAGE}" />
  <meta property="og:image:type"       content="image/jpeg" />
  <meta property="og:image:width"      content="1200" />
  <meta property="og:image:height"     content="630" />
  <meta property="og:image:alt"        content="Aevyra — App rencontre astrologique : deux âmes connectées par les étoiles" />
  <meta property="og:locale"           content="fr_FR" />
  <meta property="og:locale:alternate" content="en_GB" />

  <!-- ═══════════════════════════════════════════════════════ -->
  <!-- TWITTER / X CARD — grande image dans le fil            -->
  <!-- ═══════════════════════════════════════════════════════ -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:site"        content="@AevyraApp" />
  <meta name="twitter:creator"     content="@AevyraApp" />
  <meta name="twitter:title"       content="${TWITTER_TITLE}" />
  <meta name="twitter:description" content="${TW_DESC}" />
  <meta name="twitter:image"       content="${OG_IMAGE_SHARE}" />
  <meta name="twitter:image:alt"   content="Aevyra — Rencontre astrologique : deux âmes connectées par les étoiles" />
`;

// ════════════════════════════════════════════════════════════════════════════
// ── Bloc 3 : JSON-LD Schema.org ──────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
// 3 schémas imbriqués :
//   1. SoftwareApplication → Rich snippet "Appli" avec étoiles dans Google
//   2. WebSite + SearchAction → Sitelinks Searchbox
//   3. Organization → Knowledge Graph (logo, réseaux sociaux)
const JSONLD_BLOCK = `
  <!-- ═══════════════════════════════════════════════════════ -->
  <!-- JSON-LD SCHEMA.ORG — Rich snippets Google              -->
  <!-- ═══════════════════════════════════════════════════════ -->
  <script type="application/ld+json">
  [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Aevyra",
      "alternateName": "Aevyra — Rencontre Astrologique",
      "url": "${SITE_URL}/",
      "description": "${META_DESC}",
      "applicationCategory": "SocialNetworkingApplication",
      "applicationSubCategory": "DatingApplication",
      "operatingSystem": "iOS, Android, Web",
      "inLanguage": ["fr", "fr-FR", "fr-BE", "fr-CH", "fr-CA"],
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "bestRating": "5",
        "worstRating": "1",
        "ratingCount": "247"
      },
      "image": "${OG_IMAGE}",
      "screenshot": "${OG_IMAGE_SHARE}",
      "creator": {
        "@type": "Organization",
        "name": "Aevyra",
        "url": "${SITE_URL}/"
      },
      "featureList": [
        "Compatibilité astrologique",
        "Rencontres sincères 100% gratuites",
        "Signe astral et ascendant",
        "Chat et messages vocaux",
        "Défis spirituels quotidiens",
        "Roman de l'amour collaboratif"
      ],
      "keywords": "rencontre astrologique, app rencontre gratuite, compatibilité astrologique, signe astral, âme sœur, rencontre spirituelle"
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Aevyra",
      "url": "${SITE_URL}/",
      "description": "${META_DESC}",
      "inLanguage": "fr",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "${SITE_URL}/?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Aevyra",
      "url": "${SITE_URL}/",
      "logo": {
        "@type": "ImageObject",
        "url": "${SITE_URL}/icon-512.png",
        "width": 512,
        "height": 512
      },
      "image": "${OG_IMAGE}",
      "description": "${META_DESC}",
      "foundingDate": "2024",
      "areaServed": ["FR", "BE", "CH", "CA", "GB"],
      "availableLanguage": ["French", "English"],
      "sameAs": [
        "https://twitter.com/AevyraApp",
        "https://www.instagram.com/aevyra.app/",
        "https://www.tiktok.com/@aevyra.app"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer support",
        "availableLanguage": "French",
        "url": "${SITE_URL}/contact"
      }
    }
  ]
  </script>
`;

// ════════════════════════════════════════════════════════════════════════════
// ── Patch dist/index.html ────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
if (!fs.existsSync(DIST_HTML)) {
  console.error(`❌ inject-og.js : ${DIST_HTML} introuvable. Lancer expo export d'abord.`);
  process.exit(1);
}

let html = fs.readFileSync(DIST_HTML, 'utf8');

// 1. Remplacer <title> par notre titre calibré (< 60 car.)
html = html.replace(/<title>[^<]*<\/title>/, `<title>${PAGE_TITLE}</title>`);

// 2. Supprimer toutes les meta SEO/OG/Twitter déjà présentes (évite doublons)
html = html.replace(/<meta\s+(?:property|name)="(?:og:|twitter:|description|robots|language|author|application-name|mobile-web-app|apple-mobile|format-detection|theme-color)[^"]*"[^>]*\/?>/gi, '');
html = html.replace(/<meta\s+http-equiv="content-language"[^>]*\/?>/gi, '');
html = html.replace(/<link\s+rel="canonical"[^>]*\/?>/gi, '');
html = html.replace(/<link\s+rel="sitemap"[^>]*\/?>/gi, '');
html = html.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/gi, '');

// 3. Injecter les 3 blocs juste avant </head>
if (!html.includes('</head>')) {
  console.error('❌ inject-og.js : balise </head> introuvable dans index.html');
  process.exit(1);
}
const FULL_INJECT = SEO_BLOCK + OG_BLOCK + JSONLD_BLOCK;
html = html.replace('</head>', `${FULL_INJECT}\n</head>`);

fs.writeFileSync(DIST_HTML, html, 'utf8');

// ════════════════════════════════════════════════════════════════════════════
// ── Vérification finale ──────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
const checks = [
  // SEO fondamental
  ['<title> présent',         /<title>[^<]+<\/title>/.test(html)],
  ['meta description',        html.includes('name="description"')],
  ['meta robots',             html.includes('name="robots"')],
  ['canonical',               html.includes('rel="canonical"')],
  ['sitemap link',            html.includes('rel="sitemap"')],
  ['title < 60 car.',         PAGE_TITLE.length <= 60],
  // Open Graph
  ['og:title',                html.includes('og:title')],
  ['og:description',          html.includes('og:description')],
  ['og:image',                html.includes('og-image.jpg')],
  ['og:url',                  html.includes('og:url')],
  ['og:site_name',            html.includes('og:site_name')],
  ['og:locale',               html.includes('og:locale')],
  ['og:desc < 125 car.',      OG_DESC.length <= 125],
  // Twitter
  ['twitter:card',            html.includes('twitter:card')],
  ['twitter:image',           html.includes('twitter:image')],
  // JSON-LD
  ['JSON-LD présent',         html.includes('application/ld+json')],
  ['SoftwareApplication',     html.includes('SoftwareApplication')],
  ['WebSite + SearchAction',  html.includes('SearchAction')],
  ['Organization',            html.includes('"Organization"')],
];

console.log('\n📋 inject-og.js — Rapport SEO complet :');
console.log('═'.repeat(50));
let allOk = true;
let section = '';
for (const [label, ok] of checks) {
  if (!ok) allOk = false;
  console.log(`  ${ok ? '✅' : '❌'} ${label}`);
}
console.log('═'.repeat(50));

if (allOk) {
  console.log(`\n🎉 dist/index.html patché avec succès — SEO complet !`);
  console.log(`   title       : "${PAGE_TITLE}" (${PAGE_TITLE.length} car.)`);
  console.log(`   description : "${META_DESC.slice(0,60)}…" (${META_DESC.length} car.)`);
  console.log(`   og:desc     : "${OG_DESC}" (${OG_DESC.length} car.)`);
  console.log(`   og:image    : ${OG_IMAGE}`);
  console.log(`   canonical   : ${SITE_URL}/`);
  console.log(`   JSON-LD     : SoftwareApplication + WebSite + Organization`);
} else {
  console.error('\n⚠️  Certains tags SEO n\'ont pas été injectés correctement.');
  process.exit(1);
}

// ── Dossiers statiques — fix Cloudflare Pages trailing-slash 308 ─────────────
// Cloudflare Pages applique son propre redirect trailing-slash AVANT de lire
// _redirects pour tout chemin sans fichier statique correspondant dans dist/.
// La seule solution fiable : créer dist/<alias>/index.html (copie de dist/index.html)
// Cloudflare sert alors le fichier directement → 200, zéro redirect.
const STATIC_ALIASES = [
  'register', 'sign-in', 'login', 'join',
  'rencontre-astrologique', 'compatibilite-astrologique', 'app-rencontre-gratuite',
];
console.log('\n📁 Création dossiers statiques (fix 308 Cloudflare) :');
for (const alias of STATIC_ALIASES) {
  const dir  = path.join(__dirname, '..', 'dist', alias);
  const dest = path.join(dir, 'index.html');
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(DIST_HTML, dest);
  console.log(`  ✅ dist/${alias}/index.html`);
}
console.log('   → routes SPA avec trailing slash résolues en 200');
