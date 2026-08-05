// Aevyra – Politique de Confidentialité (RGPD)
// Conforme RGPD (UE) 2016/679 + loi Informatique et Libertés n° 78-17
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, type RelativePathString } from 'expo-router';
import Head from 'expo-router/head';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import { useSession } from '@/ctx';
import { useResponsive } from '@/hooks/useResponsive';
import { buildTitle, buildMetaTags, serializeJsonLd, buildBreadcrumbSchema, SITE_URL } from '@/hooks/useSEO';

// ── Composants UI ──────────────────────────────────────────
function SectionBlock({ title, children }: { title: string; children?: React.ReactNode }) { 
  const [open, setOpen] = useState(false);
  const { h3Size  } = useResponsive();
  return (
    <View style={{
      marginBottom: 10, borderRadius: 16,
      backgroundColor: 'rgba(75,0,130,0.18)',
      borderWidth: 1, borderColor: 'rgba(255,215,0,0.10)',
      overflow: 'hidden',
    }}>
      <Pressable
        onPress={() => setOpen((v: boolean) => !v)}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          paddingHorizontal: 16, paddingVertical: 14,
        }}
      >
        <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: h3Size, flex: 1 }}>{title}</Text>
        {open
          ? <ChevronUp size={16} color="rgba(255,215,0,0.6)" />
          : <ChevronDown size={16} color="rgba(255,215,0,0.6)" />}
      </Pressable>
      {open && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
          {children}
        </View>
      )}
    </View>
  );
}

function P({ children }: { children?: React.ReactNode }) { 
  const { bodySize  } = useResponsive();
  return (
    <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: bodySize, lineHeight: bodySize * 1.6 }}>
      {children}
    </Text>
  );
}

function Bold({ children }: { children?: React.ReactNode }) { 
  const { bodySize  } = useResponsive();
  return (
    <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: bodySize, fontWeight: '700', lineHeight: bodySize * 1.6 }}>
      {children}
    </Text>
  );
}

function TableRow({ label, value }: { label: string; value: string }) { 
  const { captionSize  } = useResponsive();
  return (
    <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
      <Text style={{ color: 'rgba(255,215,0,0.65)', fontSize: captionSize, fontWeight: '700', width: 130 }}>{label}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.70)', fontSize: captionSize, flex: 1, lineHeight: captionSize * 1.5 }}>{value}</Text>
    </View>
  );
}

// ── PAGE PRINCIPALE ─────────────────────────────────────────
export default function Confidentialite() { 
  const insets = useSafeAreaInsets();
  const { px, bodySize: _bodySize, captionSize, h2Size, h3Size: _h3Size, gap: _gap, contentMaxWidth: _contentMaxWidth  } = useResponsive();
  const {  width  } = useWindowDimensions();
  const { session } = useSession();
  const maxW = width >= 768 ? 680 : undefined;

  // Retour intelligent : stack dispo → back, sinon vers app ou landing
  const goBack = () => {
    if (router.canGoBack()) { router.back(); return; }
    router.replace(session ? '/(app)/(tabs)/home' as RelativePathString : '/');
  };

  return (
    <View style={{ flex: 1 }}>
      <Head>
        <title>{buildTitle('Politique de Confidentialité — RGPD')}</title>
        {buildMetaTags({
          title: 'Politique de Confidentialité — RGPD',
          description: 'Politique de confidentialité de l\'application Aevyra. Conformité RGPD (UE) 2016/679 et loi Informatique et Libertés. Vos données protégées.',
          canonical: `${SITE_URL}/confidentialite`,
          noIndex: true,
        }).map((tag, i) =>
          tag.type === 'link'
            // @ts-ignore
            ? <link key={i} {...(tag.attrs as any)} />
            // @ts-ignore
            : <meta key={i} {...(tag.attrs as any)} />
        )}
        <script type="application/ld+json">{serializeJsonLd(buildBreadcrumbSchema([
          { name: 'Accueil', url: `${SITE_URL}/` },
          { name: 'Confidentialité', url: `${SITE_URL}/confidentialite` },
          { name: 'Accueil', url: `${SITE_URL}/` },
          { name: 'Confidentialité', url: `${SITE_URL}/confidentialite` },
        ]))}</script>
      </Head>
      <CosmicBackground>
        {/* En-tête */}
        <View style={{
          paddingTop: insets.top + 8, paddingHorizontal: px, paddingBottom: 12,
          flexDirection: 'row', alignItems: 'center', gap: 12,
        }}>
          <Pressable
            onPress={goBack}
            style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: 'rgba(255,215,0,0.10)',
              borderWidth: 1, borderColor: 'rgba(255,215,0,0.22)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ChevronLeft size={20} color="#FFD700" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#F5E6C8', fontSize: h2Size, fontWeight: '900' }}>
              Politique de confidentialité
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.90)', fontSize: captionSize, marginTop: 2 }}>
              Dernière mise à jour : juillet 2026
            </Text>
          </View>
        </View>

        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={{
            paddingHorizontal: px,
            paddingBottom: insets.bottom + 48,
            alignSelf: width >= 768 ? 'center' : undefined,
            width: maxW,
          }}
        >
          {/* Bandeau responsable de traitement */}
          <LinearGradient
            colors={['rgba(135,206,235,0.12)', 'rgba(75,0,130,0.18)']}
            style={{
              borderRadius: 16, padding: 16, marginBottom: 16,
              borderWidth: 1, borderColor: 'rgba(135,206,235,0.22)',
            }}
          >
            <Text style={{ color: '#87CEEB', fontWeight: '900', fontSize: 14, marginBottom: 8 }}>
              🔒 Responsable du traitement
            </Text>
            <TableRow label="Nom"          value="Charly Soudan (particulier — personne physique)" />
            <TableRow label="Adresse"      value="36 avenue du Parc, 93290 Tremblay-en-France" />
            <TableRow label="Contact"      value="WhatsApp : 06 67 48 52 26" />
            <TableRow label="Hébergeur"    value="Supabase Inc., 540 Howard St, San Francisco, CA 94105, États-Unis (DPA RGPD signé — clauses contractuelles types art. 46)" />
            <TableRow label="Base légale"  value="Consentement (art. 6.1.a RGPD)" />
            <TableRow label="Modèle éco."  value="100% gratuit — aucune publicité — aucun achat intégré" />
          </LinearGradient>

          {/* Vos droits — mis en évidence */}
          <LinearGradient
            colors={['rgba(100,255,180,0.10)', 'rgba(13,13,26,0.30)']}
            style={{
              borderRadius: 16, padding: 16, marginBottom: 16,
              borderWidth: 1, borderColor: 'rgba(100,255,180,0.22)',
            }}
          >
            <Text style={{ color: '#64FFB4', fontWeight: '900', fontSize: 14, marginBottom: 10 }}>
              ✅ Vos droits RGPD (art. 12–22)
            </Text>
            {([
              ["Accès",           "Obtenir la liste de toutes vos données stockées"],
              ["Rectification",   "Corriger des données inexactes ou incomplètes"],
              ["Effacement",      "Faire supprimer vos données (droit à l’oubli)"],
              ["Opposition",      "Vous opposer à certains traitements"],
              ["Portabilité",     "Recevoir vos données dans un format lisible"],
              ["Limitation",      "Restreindre temporairement un traitement"],
            ] as [string, string][]).map(([droit, desc]) => (
              // @ts-ignore
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                <Text style={{ color: '#64FFB4', fontSize: captionSize, fontWeight: '700', width: 100 }}>🛡️ {droit}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: captionSize, flex: 1, lineHeight: captionSize * 1.5 }}>{desc}</Text>
              </View>
            ))}
            <Text style={{
              color: 'rgba(100,255,180,0.55)', fontSize: 11, fontStyle: 'italic', marginTop: 8,
              lineHeight: 16,
            }}>
              Pour exercer ces droits : contactez-nous via WhatsApp au 06 67 48 52 26.{'\n'}
              Délai de réponse : 30 jours maximum (art. 12 RGPD).{'\n'}
              En cas de litige, vous pouvez saisir la CNIL : cnil.fr
            </Text>
          </LinearGradient>

          {/* Sections accordion */}
          <SectionBlock title="1. Données collectées et finalités">
            <P>{"Nous collectons uniquement les données nécessaires au fonctionnement du service (principe de minimisation, art. 5.1.c RGPD) :"}</P>
            {([
              ["Données d’identité",    "Prénom, date de naissance, genre, signe astral. Finalité : création de profil."],
              ["Données de contact",         "Nom d’étoile (pseudo). Finalité : authentification et récupération de compte via phrase de sécurité."],
              ["Données de profil",          "Photo, bio, préférences, centres d’intérêt. Finalité : mise en relation."],
              ["Données de navigation",      "Logs de connexion, adresse IP. Finalité : sécurité et lutte contre la fraude."],
              ["Données de géoloc.",         "Position approximative (ville). Finalité : suggestions de profils proches."],
              ["Messages",                   "Contenus des conversations privées. Finalité : fourniture du service de messagerie."],
            ] as [string, string][]).map(([cat, fin]) => (
              // @ts-ignore
              <View style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}>
                <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: captionSize, fontWeight: "700", width: 120 }}>{cat}</Text>
                <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: captionSize, flex: 1, lineHeight: captionSize * 1.5 }}>{fin}</Text>
              </View>
            ))}
          </SectionBlock>

          <SectionBlock title="2. Base légale du traitement">
            <P>{"Conformément à l’article 6 du RGPD, les traitements reposent sur :"}</P>
            <Bold>{"• Consentement (art. 6.1.a) :"}</Bold>
            <P>{"Inscription volontaire, acceptation des CGU, collecte de la géolocalisation."}</P>
            <Bold>{"• Exécution du contrat (art. 6.1.b) :"}</Bold>
            <P>{"Fourniture des fonctionnalités de l’application (messagerie, matching, profils)."}</P>
            <Bold>{"• Obligation légale (art. 6.1.c) :"}</Bold>
            <P>{"Conservation de certaines données à des fins probatoires et de conformité légale."}</P>
            <Bold>{"• Intérêt légitime (art. 6.1.f) :"}</Bold>
            <P>{"Sécurité de la plateforme, prévention de la fraude et amélioration du service."}</P>
          </SectionBlock>

          <SectionBlock title="3. Durée de conservation">
            {([
              ["Données de compte",    "3 ans après la dernière activité, ou jusqu’à la suppression du compte."],
              ["Messages",             "2 ans après la fin de la conversation (archivage sécurisé)."],
              ["Logs de sécurité",     "1 an (conformément à la réglementation sur la conservation des logs, décret n°2011-219)."],
              ["Données financières",  "Non applicable — service gratuit, aucune donnée bancaire collectée."],
              ["Suppression compte",   "Données effacées sous 30 jours maximum après la demande (art. 17 RGPD), hors logs de sécurité."],
            ] as [string, string][]).map(([cat, dur]) => (
              // @ts-ignore
              <View style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}>
                <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: captionSize, fontWeight: "700", width: 130 }}>{cat}</Text>
                <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: captionSize, flex: 1, lineHeight: captionSize * 1.5 }}>{dur}</Text>
              </View>
            ))}
          </SectionBlock>

          <SectionBlock title="4. Destinataires et transferts des données">
            <P>{"Vos données sont hébergées par Supabase Inc. (San Francisco, États-Unis). Un accord de traitement des données (DPA) conforme au RGPD est en place avec Supabase, incluant les clauses contractuelles types (art. 46 RGPD) pour le transfert hors UE. Supabase propose des serveurs localisés en Union Européenne (région eu-west-1)."}</P>
            <P>{"Aucune donnée n’est vendue à des tiers. Aucun transfert vers des pays tiers sans garanties adéquates (mécanisme des clauses contractuelles types, art. 46 RGPD)."}</P>
            <P>{"Des sous-traitants peuvent intervenir pour la fourniture technique du service (hébergement, authentification) dans le strict respect du RGPD et sur instruction documentée."}</P>
          </SectionBlock>

          <SectionBlock title="5. Sécurité des données">
            <P>{"L’Éditeur met en œuvre des mesures techniques et organisationnelles appropriées conformément à l’article 32 du RGPD :"}</P>
            <Bold>{"• Chiffrement TLS"}</Bold>
            <P>{"Toutes les communications entre l’application et les serveurs sont chiffrées."}</P>
            <Bold>{"• Authentification sécurisée"}</Bold>
            <P>{"Gestion des sessions via Supabase Auth avec tokens JWT à durée limitée."}</P>
            <Bold>{"• Contrôle d’accès"}</Bold>
            <P>{"Politiques Row Level Security (RLS) garantissant que chaque utilisateur n’accède qu’à ses propres données."}</P>
            <Bold>{"• Politique en cas de violation"}</Bold>
            <P>{"En cas de violation de données, la CNIL sera notifiée dans les 72 heures (art. 33 RGPD) et les utilisateurs concernés informés sans délai indu."}</P>
          </SectionBlock>

          <SectionBlock title="6. Cookies et traceurs">
            <P>{"L’application mobile Aevyra n’utilise pas de cookies de navigation. Des données de session locales (tokens d’authentification) sont stockées de manière sécurisée sur l’appareil via le stockage sécurisé natif iOS/Android."}</P>
            <P>{"Aucun traceur publicitaire ou de mesure d’audience tiers n’est intégré dans la version actuelle de l’application."}</P>
          </SectionBlock>

          <SectionBlock title="7. Mineurs">
            <P>{"Le service Aevyra est strictement réservé aux personnes majeures (18 ans révolus). L’Éditeur ne collecte pas sciemment de données relatives à des mineurs. Si nous apprenons qu’un utilisateur est mineur, son compte sera supprimé immédiatement et ses données effacées."}</P>
          </SectionBlock>

          <SectionBlock title="8. Profils et données sensibles">
            <P>{"Certaines données collectées peuvent être qualifiées de données sensibles au sens de l’article 9 du RGPD (orientation sexuelle implicite dans le cadre d’une application de rencontre). Ces données sont traitées sur la base du consentement explicite de l’utilisateur, exprimé lors de la création du compte."}</P>
          </SectionBlock>

          <SectionBlock title="9. Contact et réclamations">
            <P>{"Pour toute question relative au traitement de vos données personnelles ou pour exercer vos droits, contactez le responsable du traitement :"}</P>
            <Bold>{"Charly Soudan — WhatsApp : 06 67 48 52 26"}</Bold>
            <P>{"36 avenue du Parc, 93290 Tremblay-en-France"}</P>
            <P>{"Note : aucun DPO (Délégué à la Protection des Données) n'est requis pour un éditeur particulier non professionnel. Le responsable du traitement répond directement aux demandes d'exercice de droits sous 30 jours (art. 12 RGPD)."}</P>
            <P>{"En cas de réponse insatisfaisante ou d’absence de réponse dans les 30 jours, vous pouvez déposer une plainte auprès de la CNIL :"}</P>
            <Bold>{"Commission Nationale de l’Informatique et des Libertés (CNIL)"}</Bold>
            <P>{"3 place de Fontenoy – TSA 80715 – 75334 Paris Cedex 07"}</P>
            <P>{"www.cnil.fr – Tél. : 01 53 73 22 22"}</P>
          </SectionBlock>

          {/* Bouton CGU */}
          <Pressable
            onPress={() => router.push('/(legal)/cgu' as RelativePathString)}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 8, marginTop: 8, paddingVertical: 13,
              borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,215,0,0.22)',
              backgroundColor: 'rgba(255,215,0,0.07)',
            }}
          >
            <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: 13, fontWeight: '600' }}>
              Conditions générales d'utilisation
            </Text>
            <ExternalLink size={14} color="rgba(255,215,0,0.5)" />
          </Pressable>

          <Text style={{
            color: 'rgba(255,255,255,0.92)', fontSize: 12,
            textAlign: 'center', marginTop: 16, lineHeight: 18,
          }}>
            © 2026 Charly Soudan — Aevyra v1.0.0{'\n'}
            36 avenue du Parc · 93290 Tremblay-en-France{'\n'}
            Conforme RGPD (UE) 2016/679 · Loi Informatique et Libertés n° 78-17
          </Text>
        </ScrollView>
      </CosmicBackground>
    </View>
  );
}
