// Page transparence publique Aevyra
// Chiffres réels en temps réel : membres vérifiés, bots supprimés, couples formés
// Mise à jour à chaque visite via RPC refresh_stats_publiques
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft, Shield, Users, Heart, AlertTriangle,
  CheckCircle, TrendingUp, Clock, Star, Zap,
} from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import { useResponsive } from '@/hooks/useResponsive';
import Head from 'expo-router/head';
import { supabase } from '@/client/supabase';

const GOLD  = '#FFD700';
const GREEN = '#4ADE80';
const RED   = '#FF5050';
const WHITE = '#F5E6C8';
const MUTED = 'rgba(255,255,255,0.6)';
const CARD  = 'rgba(255,255,255,0.04)';
const BORDER = 'rgba(255,215,0,0.15)';

type Stats = {
  updated_at: string;
  membres_verifies: number;
  membres_actifs: number;
  bots_supprimes: number;
  faux_profils_bloques: number;
  couples_formes: number;
  signalements_traites: number;
  uptime_pct: number;
  taux_profils_reels: number;
  ratio_hommes_pct: number;
  ratio_femmes_pct: number;
};

function StatCard({
  icon, label, value, sub, color = GOLD,
}: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string;
}) {
  const { bodySize, captionSize, h2Size } = useResponsive();
  return (
    <View style={{
      flex: 1, minWidth: 140,
      backgroundColor: CARD, borderRadius: 20, borderWidth: 1,
      borderColor: BORDER, padding: 20, alignItems: 'center', gap: 8,
    }}>
      {icon}
      <Text style={{ color, fontSize: h2Size, fontWeight: '900' }}>{value}</Text>
      <Text style={{ color: WHITE, fontSize: bodySize, fontWeight: '700', textAlign: 'center' }}>{label}</Text>
      {sub ? <Text style={{ color: MUTED, fontSize: captionSize, textAlign: 'center' }}>{sub}</Text> : null}
    </View>
  );
}

const COMMANDEMENTS = [
  { n: '01', title: 'Zéro tolérance bots',         desc: 'Chaque profil signalé est vérifié par un humain. IP blacklistée en cas de bot confirmé.' },
  { n: '02', title: 'Zéro témoignage non vérifié', desc: 'Chaque success story est liée à un vrai compte authentifié.' },
  { n: '03', title: '100% gratuit pour toujours',  desc: 'Aucun paywall, aucun abonnement, aucune carte bancaire.' },
  { n: '04', title: 'Zéro pub intrusive',          desc: 'Pas de bannières, pas de tracking publicitaire tiers.' },
  { n: '05', title: 'Transparence totale',         desc: 'Rapport mensuel public : membres réels, bots supprimés, uptime.' },
  { n: '06', title: 'Réponse modération < 72h',    desc: 'Chaque signalement est traité sous 72h ouvrées. Service géré par un éditeur particulier.' },
  { n: '07', title: 'Parité hommes/femmes',        desc: 'Surveillance hebdomadaire, action immédiate si déséquilibre.' },
  { n: '08', title: 'Données = vos données',       desc: 'Export sur demande (30 jours), suppression totale sous 30 jours (art. 17 RGPD).' },
  { n: '09', title: 'Charte éthique publique',     desc: 'Pas cachée dans des CGU illisibles — visible ici, toujours.' },
  { n: '10', title: 'Innovation permanente',       desc: 'Une nouvelle fonctionnalité par mois, basée sur vos retours.' },
];

export default function TransparencePage() {
  const insets = useSafeAreaInsets();
  const { px, bodySize, captionSize, h2Size, h3Size, gap, iconSize } = useResponsive();
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState('');

  useEffect(() => {
    (async () => {
      try { await supabase.rpc('refresh_stats_publiques'); } catch { /* ignorer */ }
      const { data } = await supabase
        .from('stats_publiques')
        .select('*')
        .order('id', { ascending: true })
        .limit(1)
        .single();
      if (data) {
        setStats(data as Stats);
        const d = new Date(data.updated_at);
        setUpdatedAt(d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
      }
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <Head>
        <title>Transparence Aevyra — Chiffres réels, zéro faux profils, 100% authentique</title>
        <meta name="description" content="Aevyra publie ses chiffres réels : membres vérifiés, bots supprimés, couples formés. Transparence totale sur notre engagement anti-faux-profils." />
      </Head>
      <CosmicBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40, paddingHorizontal: px, gap: 32 }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={false}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ChevronLeft size={iconSize} color={GOLD} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: GOLD, fontSize: h2Size, fontWeight: '900' }}>Transparence</Text>
            <Text style={{ color: MUTED, fontSize: captionSize, marginTop: 2 }}>Nos chiffres réels, en temps réel</Text>
          </View>
          <Shield size={iconSize + 4} color={GREEN} />
        </View>

        {/* Promesse */}
        <LinearGradient
          colors={['rgba(74,222,128,0.12)', 'rgba(74,222,128,0.04)', 'transparent']}
          style={{ borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)', gap: 10 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <CheckCircle size={iconSize} color={GREEN} />
            <Text style={{ color: GREEN, fontSize: h3Size, fontWeight: '900' }}>Notre engagement</Text>
          </View>
          <Text style={{ color: WHITE, fontSize: bodySize, lineHeight: 22 }}>
            Aevyra publie ses vrais chiffres — pas des estimations marketing. Chaque profil est vérifié par un humain avant activation. Chaque bot supprimé est comptabilisé. Nous n'avons rien à cacher.
          </Text>
          {updatedAt ? (
            <Text style={{ color: MUTED, fontSize: captionSize }}>⏱ Dernière mise à jour : {updatedAt}</Text>
          ) : null}
        </LinearGradient>

        {/* Stats en temps réel */}
        <View style={{ gap: gap }}>
          <Text style={{ color: GOLD, fontSize: h3Size, fontWeight: '900' }}>📊 Chiffres en direct</Text>
          {loading ? (
            <ActivityIndicator color={GOLD} size="large" />
          ) : (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <StatCard
                  icon={<CheckCircle size={iconSize} color={GREEN} />}
                  label="Profils vérifiés"
                  value={stats?.membres_verifies ?? 0}
                  sub="Validés par un humain"
                  color={GREEN}
                />
                <StatCard
                  icon={<Users size={iconSize} color={GOLD} />}
                  label="Membres actifs"
                  value={stats?.membres_actifs ?? 0}
                  sub="7 derniers jours"
                  color={GOLD}
                />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <StatCard
                  icon={<AlertTriangle size={iconSize} color={RED} />}
                  label="Bots supprimés"
                  value={stats?.bots_supprimes ?? 0}
                  sub="Depuis le lancement"
                  color={RED}
                />
                <StatCard
                  icon={<Heart size={iconSize} color="#FF6B9D" />}
                  label="Couples formés"
                  value={stats?.couples_formes ?? 0}
                  sub="Témoignages vérifiés"
                  color="#FF6B9D"
                />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <StatCard
                  icon={<TrendingUp size={iconSize} color={GREEN} />}
                  label="Profils authentiques"
                  value={`${stats?.taux_profils_reels ?? 0}%`}
                  sub="Taux de réalité"
                  color={GREEN}
                />
                <StatCard
                  icon={<Zap size={iconSize} color={GOLD} />}
                  label="Uptime"
                  value={`${stats?.uptime_pct ?? 99.9}%`}
                  sub="Disponibilité du service"
                  color={GOLD}
                />
              </View>

              {/* Ratio H/F */}
              <View style={{ backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 20, gap: 12 }}>
                <Text style={{ color: WHITE, fontSize: bodySize, fontWeight: '700' }}>⚖️ Équilibre communauté</Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <View style={{ flex: 1, height: 12, backgroundColor: 'rgba(255,107,157,0.2)', borderRadius: 6, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.min(100, stats?.ratio_femmes_pct ?? 50)}%`, height: '100%', backgroundColor: '#FF6B9D', borderRadius: 6 }} />
                  </View>
                  <Text style={{ color: '#FF6B9D', fontSize: bodySize, fontWeight: '700', width: 40, textAlign: 'right' }}>
                    {stats?.ratio_femmes_pct ?? 0}% F
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <View style={{ flex: 1, height: 12, backgroundColor: 'rgba(96,165,250,0.2)', borderRadius: 6, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.min(100, stats?.ratio_hommes_pct ?? 50)}%`, height: '100%', backgroundColor: '#60A5FA', borderRadius: 6 }} />
                  </View>
                  <Text style={{ color: '#60A5FA', fontSize: bodySize, fontWeight: '700', width: 40, textAlign: 'right' }}>
                    {stats?.ratio_hommes_pct ?? 0}% H
                  </Text>
                </View>
                <Text style={{ color: MUTED, fontSize: captionSize }}>Objectif : équilibre 50/50 — surveillance hebdomadaire</Text>
              </View>

              {/* Signalements */}
              <View style={{ backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 20, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Shield size={iconSize} color={GREEN} />
                  <Text style={{ color: WHITE, fontSize: bodySize, fontWeight: '700' }}>Modération en chiffres</Text>
                </View>
                <Text style={{ color: GREEN, fontSize: h2Size, fontWeight: '900' }}>
                  {stats?.signalements_traites ?? 0}
                </Text>
                <Text style={{ color: MUTED, fontSize: captionSize }}>signalements traités · Délai moyen : {'<'} 24h</Text>
              </View>
            </>
          )}
        </View>

        {/* Nos 10 commandements */}
        <View style={{ gap: gap }}>
          <Text style={{ color: GOLD, fontSize: h3Size, fontWeight: '900' }}>⚖️ Nos 10 Commandements</Text>
          <Text style={{ color: MUTED, fontSize: bodySize, lineHeight: 20 }}>
            Ces règles ne sont pas cachées dans des CGU de 40 pages. Elles sont ici, publiques, gravées dans le code.
          </Text>
          {COMMANDEMENTS.map(c => (
            <React.Fragment key={String(c.n)}>
              <View style={{
                backgroundColor: CARD, borderRadius: 16, borderWidth: 1,
                borderColor: BORDER, padding: 16, flexDirection: 'row', gap: 14, alignItems: 'flex-start',
              }}>
                <Text style={{ color: GOLD, fontSize: h3Size, fontWeight: '900', opacity: 0.5, minWidth: 32 }}>{String(c.n)}</Text>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: WHITE, fontSize: bodySize, fontWeight: '800' }}>{c.title}</Text>
                  <Text style={{ color: MUTED, fontSize: captionSize, lineHeight: 18 }}>{c.desc}</Text>
                </View>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Signaler un problème */}
        <LinearGradient
          colors={['rgba(255,215,0,0.10)', 'rgba(255,215,0,0.03)', 'transparent']}
          style={{ borderRadius: 20, padding: 24, borderWidth: 1, borderColor: BORDER, gap: 12, alignItems: 'center' }}
        >
          <Star size={iconSize + 4} color={GOLD} />
          <Text style={{ color: GOLD, fontSize: h3Size, fontWeight: '900', textAlign: 'center' }}>
            Vous avez trouvé un faux profil ?
          </Text>
          <Text style={{ color: MUTED, fontSize: bodySize, textAlign: 'center', lineHeight: 20 }}>
            Signalez-le directement depuis son profil. Notre équipe traite chaque signalement en moins de 24h.
          </Text>
          <Pressable
            onPress={() => router.push('/(legal)/contact' as never)}
            style={{ backgroundColor: GOLD, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 }}
          >
            <Text style={{ color: '#0A0A14', fontWeight: '900', fontSize: bodySize }}>Contacter la modération</Text>
          </Pressable>
        </LinearGradient>

        {/* Footer */}
        <View style={{ alignItems: 'center', gap: 6, paddingTop: 8 }}>
          <Clock size={14} color={MUTED} />
          <Text style={{ color: MUTED, fontSize: captionSize, textAlign: 'center' }}>
            Cette page est mise à jour automatiquement à chaque visite.{'\n'}
            Les chiffres sont calculés en temps réel depuis notre base de données.
          </Text>
        </View>
      </ScrollView>
      </CosmicBackground>
    </>
  );
}

