// Aevyra – Éphémérides quotidiennes (horoscope amoureux du jour)
// Contenu unique par signe + par date — raison de revenir chaque jour
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Star } from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import { getMyProfile, getChallengeWindow, type Profile } from '@/lib/amour-api';
import { localTodayStr, dayOfYearFromStr, dayOfWeekFromStr, localDateFromStr } from '@/lib/dateUtils';
import { SIGNES_ASTRO, getCouleurSigne } from '@/lib/amour-theme';
import { useResponsive } from '@/hooks/useResponsive';

// ── Horoscopes amoureux rotatifs par signe (7 variations → 1 par jour de semaine)
const HOROSCOPES: Record<string, string[]> = {
  Bélier: [
    'Votre feu intérieur attire les âmes qui cherchent l\'intensité. Une rencontre inattendue pourrait tout changer aujourd\'hui.',
    'L\'énergie de Vénus vous favorise. Osez envoyer ce premier message — l\'univers vous soutient.',
    'Votre passion naturelle est votre plus bel outil de séduction ce jour. Montrez qui vous êtes vraiment.',
    'Une compatibilité surprenante s\'offre à vous. Regardez au-delà de vos critères habituels.',
    'Mars allume votre charme : les autres vous voient rayonner. Profitez-en pour vous dévoiler.',
    'Le cosmos vous invite à ralentir pour mieux ressentir les connexions profondes.',
    'Une âme complémentaire est plus proche que vous ne le pensez. Faites confiance à votre instinct.',
  ],
  Taureau: [
    'Votre stabilité est un cadeau rare. Une âme qui cherche la profondeur gravitera vers vous aujourd\'hui.',
    'Venus règne sur votre signe — votre magnétisme naturel est à son apogée ce jour.',
    'Une conversation sincère peut poser les bases d\'une connexion durable. Soyez vous-même.',
    'Le cosmos vous dit : la patience paie. Une âme de valeur mérite qu\'on prenne le temps.',
    'Votre sensibilité aux détails vous permet de voir ce que les autres manquent dans une relation.',
    'Un lien naissant mérite toute votre attention. Ne précipitez rien — laissez fleurir.',
    'L\'amour patient que vous offrez est une force rare. Quelqu\'un en a besoin exactement aujourd\'hui.',
  ],
  Gémeaux: [
    'Votre esprit brillant ouvre des portes que les autres ne voient pas. Une conversation va tout changer.',
    'Mercure amplifie votre éloquence : les mots que vous choisirez aujourd\'hui laisseront une trace.',
    'Votre curiosité est irrésistible. Posez des questions sincères — les âmes s\'ouvrent à vous facilement.',
    'Une double énergie vous traverse : entre raison et cœur, laissez le cœur guider ce soir.',
    'Votre polyvalence est un atout rare en amour. Ne vous limitez pas à un seul type d\'âme.',
    'Une connexion intellectuelle peut se transformer en quelque chose de bien plus profond aujourd\'hui.',
    'Le cosmos vous invite à l\'authenticité. Moins de masques, plus de connexions vraies.',
  ],
  Cancer: [
    'Votre intuition émotionnelle est un radar puissant. Fiez-vous à ce que vous ressentez aujourd\'hui.',
    'La Lune, votre gardienne, renforce votre magnétisme émotionnel. Les âmes sensibles vous cherchent.',
    'Une bienveillance que vous offrez sans condition attire exactement le type d\'amour que vous méritez.',
    'Ne retenez plus vos sentiments — l\'âme qui vous correspond les accueillera avec joie.',
    'Votre capacité à créer un espace sûr est votre plus grand don. Quelqu\'un en a besoin aujourd\'hui.',
    'Une vieille connexion pourrait se révéler sous un nouveau jour. Restez ouvert(e) aux surprises.',
    'L\'amour profond que vous portez en vous cherche une porte de sortie. Laissez-le briller.',
  ],
  Lion: [
    'Votre présence solaire illumine chaque espace. Quelqu\'un vous remarque déjà — sans que vous le sachiez.',
    'Le Soleil renforce votre aura royale. C\'est le moment idéal pour vous dévoiler pleinement.',
    'Votre générosité en amour est légendaire. Une âme reconnaissante croise votre chemin ce jour.',
    'Votre confiance est contagieuse. Elle attire exactement les personnes qui sauront l\'apprécier.',
    'Ne minimisez pas ce que vous avez à offrir. Votre grandeur d\'âme mérite d\'être vue.',
    'Une connexion digne de votre cœur de feu s\'approche. Gardez vos yeux et votre cœur ouverts.',
    'Aujourd\'hui, laissez quelqu\'un d\'autre briller à vos côtés. Les duos de lumière sont les plus forts.',
  ],
  Vierge: [
    'Votre attention aux détails révèle ce que les autres ignorent dans une relation. C\'est précieux.',
    'Mercure aiguise votre discernement : vous saurez instinctivement qui vous correspond vraiment.',
    'Une connexion construite sur le respect et la compréhension est en train de prendre forme.',
    'Votre dévouement silencieux est une forme d\'amour rare. Quelqu\'un commence à le remarquer.',
    'Ne laissez pas la perfection être l\'ennemie du beau. L\'âme idéale n\'est pas l\'âme parfaite.',
    'Votre sens du soin et de la précision crée des liens durables. Continuez à être vous.',
    'Un geste simple d\'attention sincère aujourd\'hui peut ouvrir une porte que vous cherchez depuis longtemps.',
  ],
  Balance: [
    'Venus illumine votre sens de l\'harmonie. Votre équilibre naturel est exactement ce qu\'une âme cherche.',
    'Votre beauté intérieure rayonne plus fort que jamais. Laissez-la guider vos rencontres d\'aujourd\'hui.',
    'Une connexion fondée sur le respect mutuel est en train de prendre racine autour de vous.',
    'Votre talent pour créer la paix attire des âmes qui cherchent un refuge. Vous êtes ce refuge.',
    'L\'harmonie que vous apportez dans une relation est un don rare. Ne le sous-estimez pas.',
    'Une décision de cœur s\'impose. Faites confiance à votre sens de l\'équité pour vous guider.',
    'Aujourd\'hui, l\'univers vous invite à choisir l\'authenticité plutôt que la beauté de façade.',
  ],
  Scorpion: [
    'Votre profondeur magnétique attire les âmes courageuses qui n\'ont pas peur de plonger.',
    'Pluton intensifie votre pouvoir d\'attraction aujourd\'hui. Une rencontre marquante est possible.',
    'Votre capacité à voir au-delà des apparences vous donne un avantage unique en amour.',
    'Une vérité que vous ressentez depuis longtemps mérite d\'être exprimée. Le moment est venu.',
    'Votre loyauté absolue est une qualité que peu possèdent. L\'âme qui le sait vous chérit.',
    'Ne gardez plus vos émotions sous clé — l\'intimité naît quand on ose se montrer vulnérable.',
    'Une connexion transformatrice est à portée. Laissez-vous toucher, même si c\'est inconfortable.',
  ],
  Sagittaire: [
    'Votre optimisme cosmique est un aimant puissant. Les âmes libres gravitent vers vous naturellement.',
    'Jupiter amplifie votre chance en amour aujourd\'hui. Osez, l\'univers vous soutient.',
    'Votre vision grand angle vous permet de voir des possibilités que les autres manquent.',
    'Une aventure romantique inattendue commence par une conversation simple. Lancez-vous.',
    'Votre honnêteté directe est rafraîchissante. Elle attire les âmes qui n\'aiment pas les jeux.',
    'L\'amour libre que vous portez en vous n\'est pas un défaut — c\'est une invitation pour l\'âme juste.',
    'Aujourd\'hui, votre enthousiasme communicatif peut créer une étincelle qui dure.',
  ],
  Capricorne: [
    'Votre intégrité silencieuse parle plus fort que mille mots. Une âme le remarque aujourd\'hui.',
    'Saturne vous offre une clarté précieuse : vous savez exactement ce que vous cherchez vraiment.',
    'Une connexion lente mais profonde vaut mille feux de paille. Vous le savez déjà.',
    'Votre ambition et votre cœur peuvent coexister. L\'âme qui vous correspond l\'admirera.',
    'Ne fermez pas la porte à la spontanéité aujourd\'hui. Parfois les plus belles choses ne sont pas planifiées.',
    'Votre fiabilité est un fondement sur lequel l\'amour durable peut se construire. Continuez.',
    'Une patience que vous cultivez depuis longtemps va porter ses fruits. Restez ouvert(e).',
  ],
  Verseau: [
    'Votre singularité est votre plus grande force en amour. Ne cherchez pas à correspondre à une norme.',
    'Uranus stimule votre vision unique. Une âme aussi originale que vous cherche exactement votre fréquence.',
    'Une conversation sur vos idées profondes peut allumer une connexion inattendue aujourd\'hui.',
    'Votre amour de la liberté n\'est pas incompatible avec une relation profonde. L\'âme juste le comprend.',
    'Votre humanitarian unique attire les âmes qui cherchent plus qu\'un simple partenaire.',
    'Aujourd\'hui, montrez votre côté le plus vrai et non conventionnel. C\'est ce qui attire vraiment.',
    'Une âme d\'exception croise votre chemin. Votre intuition vous dira laquelle.',
  ],
  Poissons: [
    'Votre sensibilité poétique crée des connexions d\'une rare profondeur. Quelqu\'un en ressent déjà la magie.',
    'Neptune amplifie votre empathie naturelle. Vous ressentez ce que les mots ne disent pas.',
    'Une connexion spirituelle est en train de prendre forme. Faites confiance aux signes que vous voyez.',
    'Votre rêverie romantique n\'est pas une faiblesse — c\'est la cartographie de l\'amour que vous méritez.',
    'Votre capacité à aimer sans condition attire des âmes qui cherchent un amour vrai et total.',
    'Ne coupez pas vos ailes poétiques pour quelqu\'un qui ne les voit pas. L\'âme juste les adorera.',
    'Une intuition forte vous guide aujourd\'hui vers une rencontre qui pourrait tout changer.',
  ],
};

// Compatibilités astrales par signe (3 signes les plus favorisés)
const SIGNES_FAVORIS: Record<string, string[]> = {
  'Bélier':     ['Lion', 'Sagittaire', 'Gémeaux'],
  'Taureau':    ['Vierge', 'Capricorne', 'Cancer'],
  'Gémeaux':    ['Balance', 'Verseau', 'Bélier'],
  'Cancer':     ['Scorpion', 'Poissons', 'Taureau'],
  'Lion':       ['Bélier', 'Sagittaire', 'Balance'],
  'Vierge':     ['Taureau', 'Capricorne', 'Scorpion'],
  'Balance':    ['Gémeaux', 'Verseau', 'Lion'],
  'Scorpion':   ['Cancer', 'Poissons', 'Vierge'],
  'Sagittaire': ['Bélier', 'Lion', 'Verseau'],
  'Capricorne': ['Taureau', 'Vierge', 'Poissons'],
  'Verseau':    ['Gémeaux', 'Balance', 'Sagittaire'],
  'Poissons':   ['Cancer', 'Scorpion', 'Capricorne'],
};
const THEMES_DU_JOUR = [
  { emoji: '🌙', titre: 'Lune Romantique',    desc: 'Les émotions sont amplifiées. Idéal pour s\'ouvrir.' },
  { emoji: '☀️', titre: 'Énergie Solaire',    desc: 'Votre charme naturel rayonne. Montrez-vous.' },
  { emoji: '⭐', titre: 'Nuit des Étoiles',   desc: 'Les connexions profondes sont favorisées ce soir.' },
  { emoji: '🌊', titre: 'Marée des Cœurs',   desc: 'Laissez vos émotions guider votre navigation.' },
  { emoji: '🔥', titre: 'Feu Intérieur',      desc: 'Votre passion est contagieuse. Laissez-la parler.' },
  { emoji: '🌸', titre: 'Floraison d\'Âme',  desc: 'Un nouveau cycle commence. Osez vous révéler.' },
  { emoji: '✨', titre: 'Alignement Cosmique', desc: 'Les planètes s\'alignent pour votre bonheur amoureux.' },
];

// Conseils du jour rotatifs (7 × 7 = 49 combinaisons)
const CONSEILS = [
  'Envoyez un message à quelqu\'un qui vous intrigue depuis un moment.',
  'Complétez votre profil avec un détail qui vous rend unique.',
  'Lisez attentivement les profils compatibles — un détail peut tout changer.',
  'Partagez votre carte astrale pour attirer les âmes sur la même fréquence.',
  'Répondez à un message en attente — chaque connexion mérite une chance.',
  'Explorez les éphémérides de votre signe ascendant aujourd\'hui.',
  'Ajoutez une photo qui capture votre énergie authentique.',
];

export default function EphemeridesPage() { 
  const insets = useSafeAreaInsets();
  const { px, bodySize, captionSize, h2Size, h3Size, gap: _gap, contentMaxWidth: _contentMaxWidth, iconSize, tapTarget  } = useResponsive();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // Seed déterministe basé sur la date locale du fuseau de l'utilisateur
  // (récupéré via getChallengeWindow → même jour partout dans le monde)
  const [todayStr, setTodayStr] = useState<string>(localTodayStr);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [p, win] = await Promise.all([getMyProfile(), getChallengeWindow()]);
      if (active) {
        setProfile(p);
        setTodayStr(win.today);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []));

  // Dériver les seeds depuis la date locale (YYYY-MM-DD → utilitaires centralisés)
  const todayDate  = localDateFromStr(todayStr);
  const dayOfYear  = dayOfYearFromStr(todayStr);
  const dayOfWeek  = dayOfWeekFromStr(todayStr); // 0=dim…6=sam

  const signe      = profile?.signe_astro ?? '';
  const couleur    = getCouleurSigne(signe);
  const signeInfo  = SIGNES_ASTRO[signe];
  const horoscopes = HOROSCOPES[signe] ?? HOROSCOPES['Lion'];
  const texteJour  = horoscopes[dayOfWeek];
  const theme      = THEMES_DU_JOUR[dayOfWeek];
  const conseil    = CONSEILS[dayOfYear % CONSEILS.length];

  // Intensité (varie selon le jour pour rendre chaque jour différent)
  const intensiteLabels = ['💫 Calme', '⭐ Doux', '🌟 Favorable', '✨ Très favorable', '🔥 Exceptionnel'];
  const intensite = intensiteLabels[dayOfYear % intensiteLabels.length];

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0D1A' }}>
      <CosmicBackground>
        {/* En-tête */}
        <View style={{
          paddingTop: insets.top + 12, paddingHorizontal: px,
          paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
        }}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: tapTarget, height: tapTarget, borderRadius: tapTarget / 2, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={iconSize} color="#FFD700" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFD700', fontSize: h2Size, fontWeight: '900', letterSpacing: 1 }}>
              ÉPHÉMÉRIDES DU JOUR
            </Text>
            <Text style={{ color: 'rgba(255,182,193,0.6)', fontSize: captionSize, fontWeight: '600', letterSpacing: 1.5, marginTop: 1 }}>
              {todayDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
            </Text>
          </View>
          <Star size={20} color="rgba(192,132,252,0.7)" />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: px, paddingBottom: insets.bottom + 32, gap: 20 }}
          showsVerticalScrollIndicator={false}
        
        overScrollMode="never"
        bounces={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          {loading ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
              <ActivityIndicator size="large" color="#C084FC" />
            </View>
          ) : (
            <>
              {/* ── Thème cosmique du jour ─────────────────── */}
              <LinearGradient
                colors={['rgba(75,0,130,0.6)', 'rgba(13,13,26,0.8)']}
                style={{ borderRadius: 24, padding: 22, borderWidth: 1.5, borderColor: 'rgba(255,215,0,0.3)', alignItems: 'center', gap: 10 }}
              >
                <Text style={{ fontSize: iconSize * 2 }}>{theme.emoji}</Text>
                <Text style={{ color: '#FFD700', fontSize: h3Size, fontWeight: '900', textAlign: 'center', letterSpacing: 0.5 }}>
                  {theme.titre}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: bodySize, textAlign: 'center', lineHeight: bodySize * 1.55 }}>
                  {theme.desc}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4,
                  backgroundColor: 'rgba(255,215,0,0.08)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
                  borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)'
                }}>
                  <Text style={{ color: '#FFD700', fontSize: captionSize, fontWeight: '700' }}>Intensité : {intensite}</Text>
                </View>
              </LinearGradient>

              {/* ── Horoscope amoureux personnalisé ────────── */}
              {signe ? (
                <LinearGradient
                  colors={[`${couleur}20`, 'rgba(13,13,26,0.9)']}
                  style={{ borderRadius: 22, padding: 22, borderWidth: 1, borderColor: `${couleur}40`, gap: 14 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 32 }}>{signeInfo?.emoji ?? '⭐'}</Text>
                    <View>
                      <Text style={{ color: couleur, fontSize: 16, fontWeight: '900' }}>{signe}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '600', letterSpacing: 1.5, marginTop: 1 }}>
                        VOTRE HOROSCOPE AMOUREUX
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 15, lineHeight: 24, fontStyle: 'italic' }}>
                    "{texteJour}"
                  </Text>
                </LinearGradient>
              ) : (
                <LinearGradient
                  colors={['rgba(192,132,252,0.12)', 'rgba(13,13,26,0.9)']}
                  style={{ borderRadius: 22, padding: 22, borderWidth: 1, borderColor: 'rgba(192,132,252,0.25)', gap: 10, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 32 }}>🌟</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
                    Complétez votre date de naissance pour recevoir votre horoscope amoureux personnalisé.
                  </Text>
                </LinearGradient>
              )}

              {/* ── Conseil cosmique du jour ────────────────── */}
              <LinearGradient
                colors={['rgba(255,105,180,0.12)', 'rgba(13,13,26,0.9)']}
                style={{ borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(255,105,180,0.25)', gap: 10 }}
              >
                <Text style={{ color: 'rgba(255,105,180,0.6)', fontSize: 11, fontWeight: '800', letterSpacing: 2.5 }}>
                  💡 CONSEIL COSMIQUE DU JOUR
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 22 }}>
                  {conseil}
                </Text>
              </LinearGradient>

              {/* ── Compatibilités favorisées aujourd'hui ───── */}
              {signe && (
                <LinearGradient
                  colors={['rgba(13,13,26,0.9)', 'rgba(75,0,130,0.2)']}
                  style={{ borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(192,132,252,0.2)', gap: 12 }}
                >
                  <Text style={{ color: 'rgba(192,132,252,0.5)', fontSize: 11, fontWeight: '800', letterSpacing: 2.5 }}>
                    💫 SIGNES FAVORISÉS AUJOURD'HUI
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {(SIGNES_FAVORIS[signe] ?? ['Lion', 'Balance', 'Gémeaux']).map(s => (
                      <React.Fragment key={s}>
                        <View style={{ flex: 1, alignItems: 'center', gap: 6,
                          backgroundColor: 'rgba(192,132,252,0.06)', borderRadius: 14, padding: 12,
                          borderWidth: 1, borderColor: 'rgba(192,132,252,0.15)'
                        }}>
                          <Text style={{ fontSize: 22 }}>{SIGNES_ASTRO[s]?.emoji ?? '⭐'}</Text>
                          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '700', textAlign: 'center' }}>{s}</Text>
                        </View>
                      </React.Fragment>
                    ))}
                  </View>
                </LinearGradient>
              )}

              {/* ── CTA — aller découvrir des âmes ─────────── */}
              <Pressable
                onPress={() => router.back()}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                  backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 16, paddingVertical: 16,
                  borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)'
                }}
              >
                <Text style={{ fontSize: 18 }}>🌌</Text>
                <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: 14 }}>
                  Explorer la Constellation
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </CosmicBackground>
    </View>
  );
}
