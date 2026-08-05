// Page Charte Éthique Aevyra — 10 commandements publics
// Accessible sans connexion depuis la landing page et le footer
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft, Shield, Heart, Lock, Eye, Users,
  Zap, Star, Clock, Trash2, Gift,
} from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import { useResponsive } from '@/hooks/useResponsive';
import Head from 'expo-router/head';

const GOLD   = '#FFD700';
const GREEN  = '#4ADE80';
const RED    = '#FF5050';
const WHITE  = '#F5E6C8';
const MUTED  = 'rgba(255,255,255,0.6)';
const CARD   = 'rgba(255,255,255,0.04)';
const BORDER = 'rgba(255,215,0,0.15)';

const COMMANDEMENTS = [
  {
    n: '01', icon: <Shield size={22} color={GREEN} />, color: GREEN,
    title: 'Zéro tolérance bots & faux profils',
    detail: [
      'Chaque profil signalé est vérifié par un humain avant toute action',
      'Détection IA des pseudos suspects et patterns de bot dès l\'inscription',
      '3 signalements = suspension automatique 72h',
      'Ban permanent + IP blacklist pour tout récidiviste',
    ],
  },
  {
    n: '02', icon: <Star size={22} color="#FF6B9D" />, color: '#FF6B9D',
    title: 'Zéro témoignage non vérifié',
    detail: [
      'Chaque success story est liée à un compte réel authentifié',
      'Badge "Couple formé sur Aevyra" attribué uniquement par admin',
      'Aucun témoignage auto-publié — validation manuelle systématique',
      'Audit mensuel de tous les témoignages publiés',
    ],
  },
  {
    n: '03', icon: <Gift size={22} color={GOLD} />, color: GOLD,
    title: '100% gratuit pour toujours',
    detail: [
      'Matchs illimités : gratuit',
      'Messagerie illimitée : gratuit',
      'Appels vidéo HD : gratuit',
      'Compatibilité astrologique : gratuit',
      'Aucune carte bancaire, aucun abonnement, jamais',
    ],
  },
  {
    n: '04', icon: <Eye size={22} color="#A78BFA" />, color: '#A78BFA',
    title: 'Zéro pub intrusive & zéro tracking',
    detail: [
      'Aucune bannière publicitaire sur la plateforme',
      'Aucun cookie de tracking tiers (Google Ads, Facebook Pixel, etc.)',
      'Aucune revente de données à des annonceurs',
      'Analytics internes uniquement pour améliorer l\'expérience',
    ],
  },
  {
    n: '05', icon: <Eye size={22} color={GREEN} />, color: GREEN,
    title: 'Transparence totale — chiffres publics',
    detail: [
      'Rapport mensuel public : nombre de membres réels, bots supprimés',
      'Ratio hommes/femmes publié en temps réel',
      'Taux de profils authentiques calculé en direct',
      'Page transparence accessible sans connexion',
    ],
  },
  {
    n: '06', icon: <Clock size={22} color="#60A5FA" />, color: '#60A5FA',
    title: 'Réponse modération sous 72h ouvrées',
    detail: [
      'Chaque signalement reçoit une action sous 72h ouvrées',
      'Notification automatique au signalant : traitement confirmé',
      'Escalade immédiate pour signalements graves (mineurs, harcèlement)',
      'Service géré par un éditeur particulier — délai honnête garanti',
    ],
  },
  {
    n: '07', icon: <Users size={22} color="#F97316" />, color: '#F97316',
    title: 'Parité hommes/femmes surveillée',
    detail: [
      'Suivi hebdomadaire du ratio de la communauté',
      'Au-delà de 65 % d\'un genre : campagne ciblée vers l\'autre',
      'Aucune manipulation de l\'algorithme pour favoriser un genre',
      'Objectif : 50/50 — meilleure expérience pour tous',
    ],
  },
  {
    n: '08', icon: <Lock size={22} color={RED} />, color: RED,
    title: 'Vos données vous appartiennent',
    detail: [
      'Export de vos données sur demande via WhatsApp (traité sous 30 jours)',
      'Suppression totale du compte et des données sous 30 jours (art. 17 RGPD)',
      'Logs de sécurité conservés 1 an (décret n°2011-219)',
      'Conformité RGPD — responsable du traitement : Charly Soudan',
    ],
  },
  {
    n: '09', icon: <Heart size={22} color="#FB7185" />, color: '#FB7185',
    title: 'Contre le ghosting & comportements toxiques',
    detail: [
      'Score de fiabilité visible sur chaque profil (0-100)',
      '3 ghostings signalés = avertissement public sur le profil',
      'Filtre automatique des messages explicites non sollicités',
      'Charte de bonne conduite acceptée à l\'inscription',
    ],
  },
  {
    n: '10', icon: <Zap size={22} color={GOLD} />, color: GOLD,
    title: 'Innovation permanente — vous décidez',
    detail: [
      'Une nouvelle fonctionnalité par mois minimum',
      'Chaque feature est soumise au vote de la communauté',
      'Feedback direct disponible dans les paramètres',
      'Roadmap publique — aucune surprise cachée',
    ],
  },
];

export default function CharteEthique() { 
  const insets = useSafeAreaInsets();
  const { px, bodySize, captionSize, h2Size, h3Size, gap: _gap, contentMaxWidth: _contentMaxWidth, iconSize: _iconSize  } = useResponsive();

  return (
    <>
      <Head>
        <title>Charte Éthique Aevyra — 10 Commandements | Rencontre authentique gratuite</title>
        <meta name="description" content="La charte éthique Aevyra : 10 engagements publics pour une plateforme de rencontre 100% gratuite, sans faux profils, sans pub, avec transparence totale." />
      </Head>
      <CosmicBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: px,
          gap: 28,
        }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ChevronLeft size={24} color={GOLD} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: GOLD, fontSize: h2Size, fontWeight: '900' }}>Charte Éthique</Text>
            <Text style={{ color: MUTED, fontSize: captionSize, marginTop: 2 }}>10 engagements publics gravés dans le code</Text>
          </View>
        </View>

        {/* Intro */}
        <LinearGradient
          colors={['rgba(74,222,128,0.12)', 'rgba(74,222,128,0.03)', 'transparent']}
          style={{ borderRadius: 20, padding: 22, borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)', gap: 10 }}
        >
          <Text style={{ color: GREEN, fontSize: h3Size, fontWeight: '900' }}>🛡️ Nos engagements, publics et permanents</Text>
          <Text style={{ color: WHITE, fontSize: bodySize, lineHeight: 21 }}>
            Ces règles ne sont pas enfouies dans 40 pages de CGU illisibles.{'\n'}
            Elles sont ici, accessibles à tous, et s'appliquent sans exception.{'\n'}
            Aevyra est jugé sur ses actes, pas sur ses promesses.
          </Text>
        </LinearGradient>

        {/* Les 10 commandements */}
        {COMMANDEMENTS.map(c => (
          <React.Fragment key={c.n}>
            <View
              style={{
                backgroundColor: CARD,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: BORDER,
                padding: 20,
                gap: 14,
              }}
            >
              {/* Titre */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: `${c.color}18`,
                  borderWidth: 1, borderColor: `${c.color}40`,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {c.icon}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: MUTED, fontSize: captionSize, fontWeight: '700', letterSpacing: 1.5 }}>
                    COMMANDEMENT {c.n}
                  </Text>
                  <Text style={{ color: WHITE, fontSize: bodySize, fontWeight: '900', marginTop: 2 }}>
                    {c.title}
                  </Text>
                </View>
            </View>

            {/* Détails */}
            <View style={{ gap: 8, paddingLeft: 4 }}>
              {c.detail.map((d, _i) => (
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <View style={{
                    width: 6, height: 6, borderRadius: 3,
                    backgroundColor: c.color, marginTop: 7, flexShrink: 0,
                  }} />
                  <Text style={{ color: MUTED, fontSize: bodySize, lineHeight: 20, flex: 1 }}>{d}</Text>
                </View>
              ))}
            </View>
          </View>
          </React.Fragment>
        ))}

        {/* CTA transparence */}
        <Pressable
          onPress={() => router.push('/(legal)/transparence' as never)}
          style={{ borderRadius: 16, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={['rgba(255,215,0,0.15)', 'rgba(255,215,0,0.05)']}
            style={{
              borderRadius: 16, padding: 20, borderWidth: 1,
              borderColor: BORDER, flexDirection: 'row',
              alignItems: 'center', gap: 14,
            }}
          >
            <Eye size={24} color={GOLD} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: GOLD, fontSize: bodySize, fontWeight: '900' }}>Voir nos chiffres en direct →</Text>
              <Text style={{ color: MUTED, fontSize: captionSize, marginTop: 3 }}>
                Membres vérifiés, bots supprimés, couples formés — en temps réel
              </Text>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Suppression compte */}
        <View style={{ alignItems: 'center', gap: 6, paddingTop: 4 }}>
          <Trash2 size={14} color={MUTED} />
          <Text style={{ color: MUTED, fontSize: captionSize, textAlign: 'center', lineHeight: 16 }}>
            Vous souhaitez supprimer votre compte et toutes vos données ?{'\n'}
            Direction Paramètres → Supprimer mon compte. Traitement sous 30 jours (art. 17 RGPD).
          </Text>
        </View>
      </ScrollView>
      </CosmicBackground>
    </>
  );
}
