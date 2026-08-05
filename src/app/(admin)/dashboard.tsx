import { useResponsive } from '@/hooks/useResponsive';
// Aevyra Admin — Dashboard principal
// Stats globales temps réel + graphe inscriptions 14j + navigation rapide
// Le layout (admin)/_layout.tsx gère déjà la NavBar/pill — ce fichier n'a PAS de navigation propre
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, RefreshControl,
  ScrollView, Text, View,
} from 'react-native';
import { Pressable } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Users, Flag, MessageSquare, Heart, Video,
  ShieldCheck, Ban, TrendingUp, ChevronRight,
  LogOut, Settings, RefreshCw,
} from 'lucide-react-native';
import { supabase } from '@/client/supabase';
import { getAdminStats, listAdminLogs, type AdminStats, type DailySignup, type AdminLog } from '@/lib/admin-api';
import { signOutComplet } from '@/lib/amour-api';
import { useAdminGuard } from '@/hooks/useAdminGuard';

const GOLD   = '#C9A96E';
const BG     = '#0A0A14';
const CARD   = '#13131F';
const BORDER = '#1E1E2E';

function StatCard({ icon, label, value, sub, color = GOLD }: {
  icon: React.ReactNode; label: string; value: number | string;
  sub?: string; color?: string;
}) {
  return (
    <View style={{
      backgroundColor: CARD, borderRadius: 16, padding: 16, flex: 1, minWidth: 140,
      borderWidth: 1, borderColor: BORDER, gap: 8,
    }}>
      <View style={{
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: `${color}18`, alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </View>
      <Text style={{ color: '#fff', fontSize: 26, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: '#A8A8CC', fontSize: 12 }}>{label}</Text>
      {sub && <Text style={{ color: color, fontSize: 11 }}>{sub}</Text>}
    </View>
  );
}

function NavButton({ icon, label, badge, onPress }: {
  icon: React.ReactNode; label: string; badge?: number; onPress: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: CARD, borderRadius: 14, padding: 16,
        borderWidth: 1, borderColor: BORDER,
        opacity: pressed ? 0.7 : 1,
      }}
    >
      <View style={{
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: `${GOLD}15`, alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </View>
      <Text style={{ color: '#fff', flex: 1, fontSize: 15, fontWeight: '600' }}>{label}</Text>
      {!!badge && (
        <View style={{
          backgroundColor: '#E53E3E', borderRadius: 10, minWidth: 20, height: 20,
          paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{badge}</Text>
        </View>
      )}
      <ChevronRight size={18} color="#7878A0" />
    </Pressable>
  );
}

function BarChart({ data }: { data: DailySignup[] }) {
  if (!data.length) return null;
  const max   = Math.max(...data.map(d => d.count), 1);
  const last14 = data.slice(-14);
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: '#A8A8CC', fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>
        INSCRIPTIONS — 14 DERNIERS JOURS
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 60 }}>
        {last14.map((d, i) => (
          <React.Fragment key={i}><View style={{ flex: 1, alignItems: 'center' }}>
            <View style={{
              width: '100%', height: Math.max(4, (d.count / max) * 52),
              backgroundColor: i === last14.length - 1 ? GOLD : `${GOLD}50`,
              borderRadius: 3,
            }} />
          </View>
          </React.Fragment>
        ))}
      </View>
      {last14.length > 0 && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: '#7878A0', fontSize: 10 }}>
            {new Date(last14[0].day).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
          </Text>
          <Text style={{ color: '#7878A0', fontSize: 10 }}>
            {new Date(last14[last14.length - 1].day).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function AdminDashboard() {
  const insets  = useSafeAreaInsets();
  const { px, contentMaxWidth, isDesktop, isTablet } = useResponsive();
  const isWide = isDesktop || isTablet;
  const { role } = useAdminGuard();
  const [stats, setStats]    = useState<AdminStats | null>(null);
  const [daily, setDaily]    = useState<DailySignup[]>([]);
  const [logs,  setLogs]     = useState<AdminLog[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([getAdminStats(), listAdminLogs()]);
      setStats(s.stats);
      setDaily(s.dailySignups);
      setLogs(l.logs.slice(0, 8));
    } catch (e) {
      console.error('[AdminDashboard]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefreshPublicStats = useCallback(async () => {
    try {
      await supabase.rpc('refresh_stats_publiques');
    } catch (e) {
      console.error('[AdminDashboard] refresh_stats_publiques', e);
    }
  }, []);

  useFocusEffect(useCallback(() => { (async () => { setLoading(true); await load(); })(); }, [load]));

  const handleSignOut = async () => {
    await signOutComplet(); // cache + pushToken + supabase.signOut + localStorage
    router.replace('/');
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={GOLD} size="large" />
      </View>
    );
  }

  // Sur desktop/tablette : centrer le contenu + max-width
  const contentStyle = isWide
    ? { paddingHorizontal: px, alignSelf: 'center' as const, width: '100%' as const, maxWidth: contentMaxWidth }
    : { paddingHorizontal: 16 };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{
        paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, gap: 20,
        ...contentStyle,
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={GOLD} />}
      showsVerticalScrollIndicator={false}
      overScrollMode="never"
      bounces={false}
    >
      {/* En-tête */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: GOLD, fontSize: 22, fontWeight: '800', letterSpacing: 0.5 }}>
            🛡️ Espace Admin
          </Text>
          <Text style={{ color: '#A8A8CC', fontSize: 13, marginTop: 2 }}>
            {role === 'super_admin' ? 'Super Administrateur' : 'Administrateur'}
          </Text>
        </View>
        <Pressable onPress={handleSignOut} style={{ padding: 10 }}>
          <LogOut size={20} color="#A8A8CC" />
        </Pressable>
      </View>

      {/* Bouton refresh stats publiques */}
      <View style={{ gap: 6 }}>
        <Text style={{ color: '#A8A8CC', fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>
          STATS PUBLIQUES (page transparence)
        </Text>
        <Pressable
          onPress={async () => {
            await handleRefreshPublicStats();
            load();
          }}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            backgroundColor: 'rgba(74,222,128,0.1)', borderRadius: 12, padding: 14,
            borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)',
          }}
        >
          <RefreshCw size={16} color="#4ADE80" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#4ADE80', fontSize: 14, fontWeight: '800' }}>Recalculer les stats publiques</Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>
              Force refresh_stats_publiques() → page transparence mise à jour
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Stats — 2 colonnes sur mobile, 4 sur desktop */}
      <View style={{ gap: 12 }}>
        <Text style={{ color: '#A8A8CC', fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>
          STATISTIQUES GLOBALES
        </Text>
        {isWide ? (
          // Desktop : grille 4 colonnes
          <>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <StatCard icon={<Users size={18} color={GOLD} />}                  label="Utilisateurs"  value={stats?.total_users ?? 0}    sub={`+${stats?.new_users_24h ?? 0} aujourd'hui`} />
              <StatCard icon={<Heart size={18} color="#FF6B9D" />}               label="Matchs"        value={stats?.total_matches ?? 0}  sub={`+${stats?.matches_24h ?? 0} / 24h`}         color="#FF6B9D" />
              <StatCard icon={<MessageSquare size={18} color="#7B68EE" />}       label="Messages"      value={stats?.total_messages ?? 0} sub={`+${stats?.messages_24h ?? 0} / 24h`}        color="#7B68EE" />
              <StatCard icon={<Flag size={18} color="#E53E3E" />}                label="Signalements"  value={stats?.pending_reports ?? 0} sub="en attente"                                  color="#E53E3E" />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <StatCard icon={<ShieldCheck size={18} color="#48BB78" />}         label="Vérifiés"      value={stats?.verified_users ?? 0}  color="#48BB78" />
              <StatCard icon={<Ban size={18} color="#FC8181" />}                 label="Bannis"        value={stats?.banned_users ?? 0}    color="#FC8181" />
              <StatCard icon={<Video size={18} color="#68D391" />}               label="Appels actifs" value={stats?.active_calls ?? 0}    color="#68D391" />
              <StatCard icon={<TrendingUp size={18} color={GOLD} />}            label="Inscrits / 7j" value={stats?.new_users_7d ?? 0} />
            </View>
          </>
        ) : (
          // Mobile : 2 colonnes
          <>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <StatCard icon={<Users size={18} color={GOLD} />}            label="Utilisateurs"  value={stats?.total_users ?? 0}    sub={`+${stats?.new_users_24h ?? 0} aujourd'hui`} />
              <StatCard icon={<Heart size={18} color="#FF6B9D" />}         label="Matchs"        value={stats?.total_matches ?? 0}  sub={`+${stats?.matches_24h ?? 0} / 24h`} color="#FF6B9D" />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <StatCard icon={<MessageSquare size={18} color="#7B68EE" />} label="Messages"      value={stats?.total_messages ?? 0} sub={`+${stats?.messages_24h ?? 0} / 24h`} color="#7B68EE" />
              <StatCard icon={<Flag size={18} color="#E53E3E" />}          label="Signalements"  value={stats?.pending_reports ?? 0} sub="en attente" color="#E53E3E" />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <StatCard icon={<ShieldCheck size={18} color="#48BB78" />}   label="Vérifiés"      value={stats?.verified_users ?? 0}  color="#48BB78" />
              <StatCard icon={<Ban size={18} color="#FC8181" />}           label="Bannis"        value={stats?.banned_users ?? 0}    color="#FC8181" />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <StatCard icon={<Video size={18} color="#68D391" />}         label="Appels actifs" value={stats?.active_calls ?? 0}    color="#68D391" />
              <StatCard icon={<TrendingUp size={18} color={GOLD} />}       label="Inscrits / 7j" value={stats?.new_users_7d ?? 0} />
            </View>
          </>
        )}
      </View>

      {/* Graphe inscriptions */}
      {daily.length > 0 && (
        <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER }}>
          <BarChart data={daily} />
        </View>
      )}

      {/* Navigation rapide — masquée sur desktop/tablette (sidebar suffit) */}
      {!isWide && (
        <View style={{ gap: 10 }}>
          <Text style={{ color: '#A8A8CC', fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>GESTION</Text>
          <NavButton icon={<Users size={20} color={GOLD} />}         label="Utilisateurs"                  onPress={() => router.push('/(admin)/users' as never)} />
          <NavButton icon={<Flag size={20} color="#E53E3E" />}        label="Signalements & Messages"       badge={stats?.pending_reports ?? 0} onPress={() => router.push('/(admin)/reports' as never)} />
          <NavButton icon={<Settings size={20} color="#7B68EE" />}    label="Contenu (Événements & Témoignages)" onPress={() => router.push('/(admin)/content' as never)} />
          <NavButton icon={<ShieldCheck size={20} color="#48BB78" />} label="Journal des actions admin"    onPress={() => router.push('/(admin)/logs' as never)} />
        </View>
      )}

      {/* Dernières actions */}
      {logs.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text style={{ color: '#A8A8CC', fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>DERNIÈRES ACTIONS</Text>
          <View style={{ backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' }}>
            {logs.map((log: any, i: number) => (
              <React.Fragment key={log.id}><View style={{
                padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center',
                borderBottomWidth: i < logs.length - 1 ? 1 : 0, borderBottomColor: BORDER,
              }}>
                <View style={{
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: log.action.includes('ban') ? '#E53E3E' : log.action.includes('verify') ? '#48BB78' : GOLD,
                }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{log.action}</Text>
                  <Text style={{ color: '#A8A8CC', fontSize: 11 }}>
                    {log.admin?.prenom ?? 'Admin'} · {new Date(log.created_at).toLocaleString('fr-FR')}
                  </Text>
                </View>
              </View>
              </React.Fragment>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
