// Aevyra – Conditions Générales d'Utilisation (CGU)
// Conformes loi française : LCEN, Code Civil, RGPD, loi Informatique et Libertés
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
import { ChevronLeft, ChevronDown, ChevronUp, ExternalLink, MessageCircle } from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import { useResponsive } from '@/hooks/useResponsive';
import { useSession } from '@/ctx';
import { buildTitle, buildMetaTags, serializeJsonLd, buildBreadcrumbSchema, SITE_URL } from '@/hooks/useSEO';



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
        <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: h3Size, flex: 1 }}>
          {title}
        </Text>
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

function Legal({ children }: { children?: React.ReactNode }) { 
  const { bodySize  } = useResponsive();
  return (
    <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: bodySize, lineHeight: bodySize * 1.6 }}>
      {children}
    </Text>
  );
}

function LegalBold({ children }: { children?: React.ReactNode }) { 
  const { bodySize  } = useResponsive();
  return (
    <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: bodySize, fontWeight: '700', lineHeight: bodySize * 1.6 }}>
      {children}
    </Text>
  );
}

// ── PAGE PRINCIPALE ─────────────────────────────────────────
export default function CGU() { 
  const insets = useSafeAreaInsets();
  const { px, bodySize: _bodySize, captionSize: _captionSize, h2Size, h3Size: _h3Size, gap: _gap, contentMaxWidth: _contentMaxWidth  } = useResponsive();
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
        <title>{buildTitle('Conditions Générales d\'Utilisation')}</title>
        {buildMetaTags({
          title: 'Conditions Générales d\'Utilisation',
          description: 'Conditions Générales d\'Utilisation de l\'application Aevyra. Conformes à la loi française, LCEN, Code Civil et RGPD.',
          canonical: `${SITE_URL}/cgu`,
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
          { name: 'CGU', url: `${SITE_URL}/cgu` },
          { name: 'Accueil', url: `${SITE_URL}/` },
          { name: 'CGU', url: `${SITE_URL}/cgu` },
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
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
              Conditions d'utilisation
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.90)', fontSize: 12, marginTop: 2 }}>
              Dernière mise à jour : juillet 2026
            </Text>          </View>
        </View>

        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={{
            paddingHorizontal: px,
            paddingBottom: insets.bottom + 48,
            alignSelf: width >= 768 ? 'center' : undefined,
            width: maxW,
          }}
        >
          {/* Bandeau éditeur */}
          <LinearGradient
            colors={['rgba(255,215,0,0.12)', 'rgba(75,0,130,0.20)']}
            style={{
              borderRadius: 16, padding: 16, marginBottom: 16,
              borderWidth: 1, borderColor: 'rgba(255,215,0,0.20)',
            }}
          >
            <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: 14, marginBottom: 6 }}>
              📋 Mentions légales — Éditeur
            </Text>
            {([
              ["Nom",          "Charly Soudan (particulier — personne physique)"],
              ["Adresse",      "36 avenue du Parc, 93290 Tremblay-en-France"],
              ["Contact",      "WhatsApp : 06 67 48 52 26"],
              ["Hébergeur",    "Supabase Inc. — 540 Howard St, San Francisco, CA 94105, États-Unis"],
              ["Application",  "Aevyra — application mobile de rencontre"],
              ["Version",      "1.0.0 — juillet 2026"],
              ["Modèle éco.",  "100% gratuit — aucune publicité — aucun achat intégré"],
            ] as [string, string][]).map(([k, v]) => (
              // @ts-ignore
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: 12, fontWeight: '700', width: 90 }}>{k} :</Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, flex: 1 }}>{v}</Text>
              </View>
            ))}
          </LinearGradient>

          {/* ── Sections CGU accordion ── */}
          <SectionBlock title="1. Objet et acceptation des CGU">
            <Legal>
              Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de l'application mobile Aevyra, éditée par Charly Soudan, particulier (ci-après « l'Éditeur »), domicilié 36 avenue du Parc, 93290 Tremblay-en-France.
            </Legal>
            <Legal>
              En créant un compte ou en accédant à l'application, l'utilisateur accepte sans réserve les présentes CGU. En cas de refus, l'accès au service est impossible. Ces CGU sont conformes à la loi n° 2004-575 du 21 juin 2004 (LCEN), au Code civil français et au Règlement (UE) 2016/679 (RGPD).
            </Legal>
          </SectionBlock>

          <SectionBlock title="2. Description du service — 100% Gratuit, sans publicité">
            <Legal>
              Aevyra est une application de rencontre et de mise en relation destinée aux personnes majeures (18 ans et plus) souhaitant faire des rencontres romantiques ou amicales. Le service comprend : création de profil, consultation de profils, messagerie instantanée, événements communautaires et fonctionnalités d'interaction sociale.
            </Legal>
            <LegalBold>Le service est strictement réservé aux personnes âgées de 18 ans révolus.</LegalBold>
            <LegalBold>✅ L'application Aevyra est 100% gratuite. Aucun abonnement, aucun achat intégré, aucune fonctionnalité payante.</LegalBold>
            <Legal>
              L'Éditeur s'engage à ne diffuser aucune publicité (bannière, interstitiel, vidéo récompensée ou toute autre forme) au sein de l'application. L'expérience utilisateur reste entièrement libre de toute intrusion publicitaire.
            </Legal>
            <Legal>
              L'Éditeur est un particulier qui met à disposition ce service gratuitement, sans but lucratif direct lié à l'application.
            </Legal>
          </SectionBlock>

          <SectionBlock title="3. Inscription et compte utilisateur">
            <Legal>
              L'inscription requiert la fourniture d'informations exactes, complètes et à jour. L'utilisateur s'engage à maintenir la confidentialité de ses identifiants. Toute inscription frauduleuse ou usurpation d'identité engage la responsabilité civile et pénale de son auteur (articles 226-4-1 et 313-1 du Code pénal).
            </Legal>
            <Legal>
              L'Éditeur se réserve le droit de suspendre ou supprimer tout compte présentant des informations fausses, une activité suspecte ou violant les présentes CGU.
            </Legal>
          </SectionBlock>

          <SectionBlock title="4. Obligations et comportements prohibés">
            <Legal>
              Il est strictement interdit de : publier des contenus haineux, discriminatoires, pornographiques ou illicites ; harceler, menacer ou nuire à d'autres utilisateurs ; usurper l'identité d'une tierce personne ; collecter les données d'autres utilisateurs sans leur consentement ; utiliser l'application à des fins commerciales non autorisées ; contourner les mesures de sécurité de l'application.
            </Legal>
            <LegalBold>
              Tout manquement pourra entraîner la suspension immédiate du compte et des poursuites judiciaires conformément au droit français.
            </LegalBold>
          </SectionBlock>

          <SectionBlock title="5. Propriété intellectuelle">
            <Legal>
              L'application Aevyra, son code source, son design, ses textes et ses fonctionnalités sont protégés par le droit de la propriété intellectuelle (articles L.111-1 et suivants du Code de la propriété intellectuelle). Toute reproduction, modification ou exploitation sans autorisation écrite préalable de l'Éditeur est interdite.
            </Legal>
            <Legal>
              Les contenus publiés par les utilisateurs (photos, textes, messages) restent leur propriété. En les publiant, l'utilisateur accorde à l'Éditeur une licence non exclusive d'affichage dans le cadre du service.
            </Legal>
          </SectionBlock>

          <SectionBlock title="6. Données personnelles et RGPD">
            <Legal>
              L'Éditeur collecte et traite les données personnelles dans le respect du RGPD et de la loi Informatique et Libertés n° 78-17 du 6 janvier 1978. Le responsable du traitement est Charly Soudan, 36 avenue du Parc, 93290 Tremblay-en-France. Aucun Délégué à la Protection des Données (DPO) n'est obligatoire pour un particulier éditeur non professionnel.
            </Legal>
            <Legal>
              Vous disposez des droits d'accès, rectification, effacement, opposition, portabilité et limitation du traitement. Pour exercer ces droits, contactez-nous via WhatsApp au 06 67 48 52 26. Pour plus de détails, consultez notre Politique de confidentialité.
            </Legal>
          </SectionBlock>

          <SectionBlock title="7. Limitation de responsabilité">
            <Legal>
              L'Éditeur s'efforce d'assurer la disponibilité et la sécurité du service mais ne saurait être tenu responsable des interruptions techniques, pertes de données ou dommages résultant d'une utilisation incorrecte de l'application. L'Éditeur ne saurait être garant de la véracité des informations communiquées par les utilisateurs.
            </Legal>
            <Legal>
              Conformément à l'article 6-I-2 de la LCEN, l'Éditeur n'est pas responsable des contenus publiés par les utilisateurs tiers, sous réserve d'agir promptement pour les retirer dès notification.
            </Legal>
          </SectionBlock>

          <SectionBlock title="8. Résiliation et suppression de compte">
            <Legal>
              L'utilisateur peut supprimer son compte à tout moment depuis la section Paramètres → Supprimer mon compte. Conformément au RGPD (article 17), les données sont effacées dans un délai maximum de 30 jours après la demande, sauf obligations légales de conservation (logs de sécurité : 1 an — décret n°2011-219).
            </Legal>
          </SectionBlock>

          <SectionBlock title="9. Modification des CGU">
            <Legal>
              L'Éditeur se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés par notification in-app. La poursuite de l'utilisation du service après modification vaut acceptation des nouvelles CGU.
            </Legal>
          </SectionBlock>

          <SectionBlock title="10. Droit applicable et juridiction compétente">
            <Legal>
              Les présentes CGU sont soumises au droit français. En cas de litige, les parties s'efforceront de trouver une solution amiable. À défaut, le litige sera soumis aux juridictions compétentes du ressort du domicile de l'Éditeur (93290 Tremblay-en-France), sauf disposition légale contraire applicable aux consommateurs.
            </Legal>
            <Legal>
              Conformément à l'article L.616-1 du Code de la consommation, tout consommateur a le droit de recourir gratuitement à un médiateur de la consommation. La plateforme européenne de résolution en ligne des litiges est accessible à l'adresse : https://ec.europa.eu/consumers/odr
            </Legal>
          </SectionBlock>

          {/* ── Bouton Contact WhatsApp → page dédiée ── */}
          <Pressable
            onPress={() => router.push('/(legal)/contact' as RelativePathString)}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 10, marginTop: 8, paddingVertical: 15,
              borderRadius: 18, borderWidth: 1,
              borderColor: 'rgba(37,211,102,0.35)',
              backgroundColor: 'rgba(37,211,102,0.10)',
            }}
          >
            <Text style={{ fontSize: 18 }}>💬</Text>
            <View>
              <Text style={{ color: '#25D366', fontWeight: '900', fontSize: 14 }}>
                Contact & Aide — WhatsApp
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.90)', fontSize: 12, marginTop: 2 }}>
                Formulaire complet avec aperçu pré-rempli
              </Text>
            </View>
            <MessageCircle size={16} color="rgba(37,211,102,0.6)" style={{ marginLeft: 'auto' }} />
          </Pressable>

          {/* Lien politique de confidentialité */}
          <Pressable
            onPress={() => router.push('/(legal)/confidentialite' as RelativePathString)}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 8, marginTop: 8, paddingVertical: 13,
              borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,215,0,0.22)',
              backgroundColor: 'rgba(255,215,0,0.07)',
            }}
          >
            <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: 13, fontWeight: '600' }}>
              Politique de confidentialité
            </Text>
            <ExternalLink size={14} color="rgba(255,215,0,0.5)" />
          </Pressable>

          <Text style={{
            color: 'rgba(255,255,255,0.92)', fontSize: 12,
            textAlign: 'center', marginTop: 16, lineHeight: 18,
          }}>
            Aevyra v1.0.0 — © 2026 Charly Soudan{'\n'}
            36 avenue du Parc · 93290 Tremblay-en-France
          </Text>
        </ScrollView>
      </CosmicBackground>
    </View>
  );
}
