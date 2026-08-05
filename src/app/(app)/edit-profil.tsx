// Aevyra – Édition du profil (3 onglets, 0 doublon, v453)
// Architecture : 👤 Moi | ✨ Mon Âme | 🔐 Secrets — sauvegarde unique en bas
import React, { useCallback, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Camera, Check, Loader } from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import { AvatarFrame, CadreSelector, type CadreId } from '@/components/AvatarFrame';
import { useResponsive } from '@/hooks/useResponsive';
import {
  getMyProfile, upsertProfile, uploadProfilePhoto,
  invalidateMyProfileCache, triggerChallengeAction,
  type Profile,
} from '@/lib/amour-api';

// ── Constantes ────────────────────────────────────────────
const SIGNES = [
  'Bélier','Taureau','Gémeaux','Cancer','Lion','Vierge',
  'Balance','Scorpion','Sagittaire','Capricorne','Verseau','Poissons',
];
const SIGNES_EMOJI: Record<string,string> = {
  Bélier:'♈',Taureau:'♉',Gémeaux:'♊',Cancer:'♋',Lion:'♌',Vierge:'♍',
  Balance:'♎',Scorpion:'♏',Sagittaire:'♐',Capricorne:'♑',Verseau:'♒',Poissons:'♓',
};

const GENRES_OPTIONS  = ['Femme','Homme','Non-binaire','Autre'] as const;
const GENRES_DB_MAP: Record<string, string> = {
  'Femme':'femme', 'Homme':'homme', 'Non-binaire':'autre', 'Autre':'autre',
};
const GENRES_DISPLAY_MAP: Record<string, string> = {
  'femme':'Femme', 'homme':'Homme', 'autre':'Autre / Non-binaire',
};

const CHERCHE_OPTIONS  = ['Femme','Homme','Femme ou Homme','Une âme (au-delà du genre)'] as const;
const CHERCHE_DB_MAP: Record<string, string> = {
  'Femme':'femme', 'Homme':'homme', 'Femme ou Homme':'les_deux', 'Une âme (au-delà du genre)':'une_ame',
};
const CHERCHE_DISPLAY_MAP: Record<string, string> = {
  'femme':'Femme', 'homme':'Homme', 'les_deux':'Femme ou Homme', 'une_ame':'Une âme (au-delà du genre)',
};

const ENERGIES = [
  { id:'Soleil ardent',     emoji:'☀️' },
  { id:'Lune mystérieuse',  emoji:'🌙' },
  { id:'Étoile libre',      emoji:'⭐' },
  { id:'Comète passionnée', emoji:'☄️' },
];
const VIBES = [
  { id:'Intensément',  emoji:'🔥' },
  { id:'Doucement',    emoji:'🌸' },
  { id:'Librement',    emoji:'🦋' },
  { id:'Profondément', emoji:'🌊' },
];
const ELEMENTS = [
  { id:'Feu',  emoji:'🔥' },
  { id:'Terre',emoji:'🌿' },
  { id:'Air',  emoji:'💨' },
  { id:'Eau',  emoji:'🌊' },
];
const ALL_TAGS = [
  '🎵 Musique','📚 Lecture','🎨 Art','🌿 Nature','✈️ Voyages',
  '🍳 Cuisine','🎭 Théâtre','🧘 Méditation','💃 Danse','🎮 Jeux',
  '📷 Photo','🌙 Nuits étoilées','🐾 Animaux','🏃 Sport','🌊 Mer',
];

// ── Onglets ───────────────────────────────────────────────
const TABS = [
  { id:'moi',     label:'👤 Moi'     },
  { id:'ame',     label:'✨ Mon Âme' },
  { id:'secrets', label:'🔐 Secrets' },
] as const;
type TabId = typeof TABS[number]['id'];

// ── Composants atomiques ──────────────────────────────────
function SectionLabel({ title, hint }: { title: string; hint?: string }) { 
  const { captionSize  } = useResponsive();
  return (
    <View style={{ marginBottom: hint ? 4 : 8 }}>
      <Text style={{ color:'rgba(255,215,0,0.65)', fontSize: captionSize, fontWeight:'700', letterSpacing:1.5, textTransform:'uppercase' }}>
        {title}
      </Text>
      {hint ? <Text style={{ color:'rgba(255,255,255,0.5)', fontSize: captionSize, fontStyle:'italic', marginTop:2 }}>{hint}</Text> : null}
    </View>
  );
}

function Field({
  label, value, onChangeText, placeholder, multiline, maxLength, hint, keyboardType,
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; multiline?: boolean; maxLength?: number; hint?: string;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <SectionLabel title={label} hint={hint} />
      <LinearGradient
        colors={['rgba(75,0,130,0.3)','rgba(13,5,30,0.5)']}
        style={{ borderRadius:14, borderWidth:1, borderColor:'rgba(255,215,0,0.15)', paddingHorizontal:14, paddingVertical: multiline ? 10 : 0 }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.35)"
          multiline={multiline}
          maxLength={maxLength}
          keyboardType={keyboardType ?? 'default'}
          style={{
            color:'#F5F5F5', fontSize:15,
            minHeight: multiline ? 80 : 48,
            maxHeight: multiline ? 130 : undefined,
            paddingVertical: multiline ? 0 : 14,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
        />
      </LinearGradient>
      {maxLength ? (
        <Text style={{ color:'rgba(255,255,255,0.35)', fontSize:10, textAlign:'right', marginTop:3 }}>
          {value.length}/{maxLength}
        </Text>
      ) : null}
    </View>
  );
}

function Chips({
  label, options, value, onSelect, emojis, hint,
}: {
  label: string; options: string[]; value: string;
  onSelect: (v: string) => void; emojis?: Record<string,string>; hint?: string;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <SectionLabel title={label} hint={hint} />
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
        {options.map(opt => {
          const sel = value === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => onSelect(sel ? '' : opt)}
              style={{
                paddingHorizontal:13, paddingVertical:8, borderRadius:20,
                backgroundColor: sel ? 'rgba(255,215,0,0.18)' : 'rgba(255,255,255,0.05)',
                borderWidth:1, borderColor: sel ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.1)',
              }}
            >
              <Text style={{ color: sel ? '#FFD700' : 'rgba(255,255,255,0.45)', fontSize:13, fontWeight: sel ? '700' : '400' }}>
                {emojis?.[opt] ? `${emojis[opt]} ` : ''}{opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function EnergyChips({
  label, options, value, onSelect, hint,
}: {
  label: string; options: { id:string; emoji:string }[];
  value: string; onSelect: (v: string) => void; hint?: string;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <SectionLabel title={label} hint={hint} />
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
        {options.map(opt => {
          const sel = value === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onSelect(sel ? '' : opt.id)}
              style={{
                paddingHorizontal:13, paddingVertical:9, borderRadius:20,
                backgroundColor: sel ? 'rgba(255,215,0,0.18)' : 'rgba(255,255,255,0.05)',
                borderWidth:1, borderColor: sel ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.1)',
                flexDirection:'row', alignItems:'center', gap:6,
              }}
            >
              <Text style={{ fontSize:16 }}>{opt.emoji}</Text>
              <Text style={{ color: sel ? '#FFD700' : 'rgba(255,255,255,0.45)', fontSize:13, fontWeight: sel ? '700' : '400' }}>
                {opt.id}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TagsGrid({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (tag: string) => {
    if (value.includes(tag)) onChange(value.filter(t => t !== tag));
    else if (value.length < 8) onChange([...value, tag]);
  };
  return (
    <View style={{ marginBottom: 18 }}>
      <SectionLabel title="Passions" hint={`Choisissez jusqu'à 8 · ${value.length}/8 sélectionné${value.length > 1 ? 's' : ''}`} />
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:4 }}>
        {ALL_TAGS.map(tag => {
          const sel   = value.includes(tag);
          const maxed = !sel && value.length >= 8;
          return (
            <Pressable
              key={tag}
              onPress={() => toggle(tag)}
              disabled={maxed}
              style={{
                paddingHorizontal:11, paddingVertical:7, borderRadius:20,
                backgroundColor: sel ? 'rgba(155,89,182,0.22)' : 'rgba(255,255,255,0.04)',
                borderWidth:1, borderColor: sel ? 'rgba(155,89,182,0.65)' : 'rgba(255,255,255,0.09)',
                opacity: maxed ? 0.35 : 1,
              }}
            >
              <Text style={{ color: sel ? '#C39BD3' : 'rgba(255,255,255,0.4)', fontSize:12, fontWeight: sel ? '700' : '400' }}>
                {tag}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Composant principal ───────────────────────────────────
export default function EditProfil() { 
  const insets     = useSafeAreaInsets();
  const { px, isTablet, isDesktop, isLargeDesktop, isFullHD, is4K, isCinema, isCar: _isCar,
          bodySize: _bodySize, h3Size, captionSize, gap: _gap, contentMaxWidth, avatarSize: respAvatar  } = useResponsive();
  // Avatar adaptatif toutes surfaces
  const _AVATAR_SIZE = isCinema ? 260 : is4K ? 220 : isFullHD ? 160 : isLargeDesktop ? 130 : respAvatar;
  // Pas de cache local — rechargement DB à chaque focus (données fraîches après save)
  const scrollRef = useRef<ScrollView>(null);

  // ── État UI ─────────────────────────────────────────────
  const [tab,       setTab]      = useState<TabId>('moi');
  const [photoUrl,  setPhotoUrl] = useState<string | null>(null);
  const [loading,   setLoading]  = useState(true);
  const [saving,    setSaving]   = useState(false);
  const [uploading, setUploading]= useState(false);
  const [saved,     setSaved]    = useState(false);
  const [error,     setError]    = useState('');

  // ── Onglet 1 — MOI ──────────────────────────────────────
  const [prenom,  setPrenom]  = useState('');
  const [pseudo,  setPseudo]  = useState('');
  const [age,     setAge]     = useState('');
  const [ville,   setVille]   = useState('');
  const [bio,     setBio]     = useState('');
  const [genre,   setGenre]   = useState('');
  const [cherche, setCherche] = useState('');
  const [cadreId, setCadreId] = useState<string>('or');

  // ── Onglet 2 — MON ÂME ──────────────────────────────────
  const [signe,         setSigne]         = useState('');
  const [ascendant,     setAscendant]     = useState('');
  const [planete,       setPlanete]       = useState('');
  const [element,       setElement]       = useState('');
  const [energie,       setEnergie]       = useState('');
  const [styleAmour,    setStyleAmour]    = useState('');
  const [tags,          setTags]          = useState<string[]>([]);

  // ── Onglet 3 — SECRETS ──────────────────────────────────
  const [devise,        setDevise]        = useState('');
  const [momentPrefere, setMomentPrefere] = useState('');
  const [chansonVie,    setChansonVie]    = useState('');
  const [lettre,        setLettre]        = useState('');
  const [reveDuo,       setReveDuo]       = useState('');
  const [isMystery,     setIsMystery]     = useState(false);

  // ── Chargement depuis la DB à chaque focus ──────────────
  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        const p: Profile | null = await getMyProfile();
        if (p) {
          setPhotoUrl(p.photo_url ?? null);
          setPrenom(p.prenom                                    || '');
          setPseudo(p.pseudo                                    || '');
          setAge(p.age != null ? String(p.age)                 : '');
          setVille(p.ville                                      || '');
          setBio(p.bio                                          || '');
          setGenre(GENRES_DISPLAY_MAP[p.genre ?? '']           ?? p.genre ?? '');
          setCherche(CHERCHE_DISPLAY_MAP[p.cherche ?? '']      ?? p.cherche ?? '');
          setCadreId(p.cadre_id                                 ?? 'or');
          setSigne(p.signe_astro                                || '');
          setAscendant(p.ascendant                              || '');
          setPlanete(p.planete_dominante                        || '');
          setElement(p.element_astrologique                     || '');
          setEnergie(p.energie_romantique                       || '');
          setStyleAmour(p.style_amour                          || '');
          setTags(Array.isArray(p.tags) ? p.tags               : []);
          setDevise(p.devise                                    || '');
          setMomentPrefere(p.moment_prefere                    || '');
          setChansonVie(p.chanson_vie                          || '');
          setLettre(p.lettre_secrete                           || '');
          setReveDuo(p.reve_duo                                || '');
          setIsMystery(p.is_mystery                            ?? false);
        }
        setLoading(false);
      })();
    }, [])
  );

  // ── Upload photo ─────────────────────────────────────────
  const handlePickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setError('Permission galerie refusée.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1,1], quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setUploading(true); setError('');
    const url = await uploadProfilePhoto(result.assets[0].uri);
    setUploading(false);
    if (url) setPhotoUrl(url);
    else setError('Échec upload photo. Réessayez.');
  };

  const handleCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { setError('Permission caméra refusée.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1,1], quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setUploading(true); setError('');
    const url = await uploadProfilePhoto(result.assets[0].uri);
    setUploading(false);
    if (url) setPhotoUrl(url);
    else setError('Échec upload photo. Réessayez.');
  };

  // ── Sauvegarde globale ────────────────────────────────────
  const handleSave = async () => {
    // Validations
    if (!prenom.trim()) { setError('Le prénom est obligatoire.'); setTab('moi'); scrollRef.current?.scrollTo({ y: 0, animated: true }); return; }
    if (pseudo.trim() && !/^[a-zA-Z0-9_.-]{3,30}$/.test(pseudo.trim())) {
      setError('Pseudo invalide : 3-30 caractères, lettres/chiffres/_ uniquement.'); setTab('moi'); return;
    }
    if (age.trim()) {
      const ageN = parseInt(age.trim(), 10);
      if (isNaN(ageN) || ageN < 18 || ageN > 99) { setError('Âge invalide (18-99 ans requis).'); setTab('moi'); return; }
    }
    setSaving(true); setError('');
    try {
      // ── Règle critique : utiliser null (pas undefined) pour effacer un champ ──
      // undefined = clé absente du payload → Supabase ignore la colonne (pas de mise à jour)
      // null      = valeur explicite → Supabase met la colonne à NULL (efface la valeur)
      const ageNum = age.trim() ? parseInt(age.trim(), 10) : null;
      await upsertProfile({
        prenom:               prenom.trim(),
        pseudo:               pseudo.trim()        || null,
        age:                  ageNum,
        ville:                ville.trim()         || null,
        bio:                  bio.trim()           || null,
        genre:                genre ? (GENRES_DB_MAP[genre] ?? genre) : null,
        cherche:              cherche ? (CHERCHE_DB_MAP[cherche] ?? cherche) : null,
        cadre_id:             cadreId              || null,
        signe_astro:          signe                || null,
        ascendant:            ascendant.trim()     || null,
        planete_dominante:    planete.trim()       || null,
        element_astrologique: element              || null,
        energie_romantique:   energie              || null,
        style_amour:          styleAmour           || null,
        tags:                 tags.length > 0 ? tags : null,
        devise:               devise.trim()        || null,
        moment_prefere:       momentPrefere.trim() || null,
        chanson_vie:          chansonVie.trim()    || null,
        lettre_secrete:       lettre.trim()        || null,
        reve_duo:             reveDuo.trim()       || null,
        is_mystery:           isMystery,
      });
      // Invalider le cache profil pour que tous les écrans voient les nouvelles données
      invalidateMyProfileCache();
      if (devise.trim())     triggerChallengeAction('update_bio').catch(() => {});
      if (chansonVie.trim()) triggerChallengeAction('share_song').catch(() => {});
      if (lettre.trim())     triggerChallengeAction('complete_profile').catch(() => {});
      if (reveDuo.trim())    triggerChallengeAction('answer_quiz').catch(() => {});
      setSaved(true);
      setTimeout(() => { setSaved(false); router.back(); }, 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  // ── Changement d'onglet : reset scroll + erreur ───────────
  const handleTabChange = (newTab: TabId) => {
    setTab(newTab);
    setError('');
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const avatarSize = isTablet ? 110 : 88;

  if (loading) {
    return (
      <View style={{ flex:1 }}>
        <CosmicBackground>
          <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
            <ActivityIndicator color="#FFD700" size="large" />
          </View>
        </CosmicBackground>
      </View>
    );
  }

  return (
    <View style={{ flex:1 }}>
      <CosmicBackground>

        {/* ── En-tête ───────────────────────────────────────── */}
        <View style={{
          paddingTop: insets.top + 8, paddingHorizontal: px, paddingBottom: 12,
          flexDirection:'row', alignItems:'center', justifyContent:'space-between',
          borderBottomWidth:1, borderBottomColor:'rgba(255,215,0,0.12)',
        }}>
          <Pressable onPress={() => router.back()} style={{ padding:6 }}>
            <ChevronLeft size={24} color="#FFD700" />
          </Pressable>
          <Text style={{ color:'#FFD700', fontWeight:'900', fontSize: h3Size }}>✏️ Mon Profil</Text>
          <Pressable
            onPress={handleSave}
            disabled={saving || uploading}
            style={{
              flexDirection:'row', alignItems:'center', gap:5,
              paddingHorizontal:14, paddingVertical:8, borderRadius:12,
              backgroundColor: saved ? 'rgba(100,255,180,0.2)' : 'rgba(255,215,0,0.18)',
              borderWidth:1, borderColor: saved ? '#64FFB4' : 'rgba(255,215,0,0.4)',
              opacity: (saving || uploading) ? 0.6 : 1,
            }}
          >
            {saving ? <Loader size={14} color="#FFD700" /> : saved ? <Check size={14} color="#64FFB4" /> : null}
            <Text style={{ color: saved ? '#64FFB4' : '#FFD700', fontWeight:'800', fontSize: captionSize }}>
              {saved ? 'Enregistré !' : 'Sauvegarder'}
            </Text>
          </Pressable>
        </View>

        {/* ── Barre d'onglets ───────────────────────────────── */}
        <View style={{
          flexDirection:'row', marginHorizontal: px, marginTop:12, marginBottom:4,
          backgroundColor:'rgba(255,255,255,0.05)', borderRadius:16, padding:4,
        }}>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => handleTabChange(t.id)}
                style={{
                  flex:1, paddingVertical:9, borderRadius:13, alignItems:'center',
                  backgroundColor: active ? 'rgba(255,215,0,0.18)' : 'transparent',
                }}
              >
                <Text style={{
                  fontSize:12, fontWeight: active ? '800' : '500',
                  color: active ? '#FFD700' : 'rgba(255,255,255,0.4)',
                  letterSpacing: active ? 0.3 : 0,
                }}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Erreur globale ────────────────────────────────── */}
        {!!error && (
          <View style={{
            marginHorizontal: px, marginTop:8,
            backgroundColor:'rgba(255,60,60,0.12)', borderRadius:12,
            borderWidth:1, borderColor:'rgba(255,60,60,0.3)', padding:11,
          }}>
            <Text style={{ color:'rgba(255,120,120,0.9)', fontSize:13 }}>{error}</Text>
          </View>
        )}

        <KeyboardAvoidingView
          behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
          style={{ flex:1 }}
        >
          <React.Fragment key={tab}>
          <ScrollView
            ref={scrollRef}
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            overScrollMode="never"
            contentContainerStyle={{
              paddingHorizontal: px, paddingBottom: 60, paddingTop: 20,
              maxWidth: (isTablet || isDesktop || isLargeDesktop) ? contentMaxWidth : undefined,
              alignSelf: (isTablet || isDesktop || isLargeDesktop) ? 'center' as const : undefined,
              width: (isTablet || isDesktop || isLargeDesktop) ? '100%' : undefined,
            }}
          >

            {/* ══════════════════════════════════════════════
                ONGLET 1 — 👤 MOI
                Photo · Cadre · Prénom · Pseudo · Âge · Ville
                Bio · Genre · Je cherche
            ══════════════════════════════════════════════ */}
            {tab === 'moi' && (
              <>
                {/* ── Photo de profil ──────────────────────── */}
                <View style={{ alignItems:'center', marginBottom:20 }}>
                  <View style={{ position:'relative' }}>
                    <AvatarFrame cadreId={cadreId} size={avatarSize}>
                      {photoUrl ? (
                        <Image
                          source={{ uri: photoUrl }}
                          style={{ width:avatarSize, height:avatarSize, borderRadius:avatarSize/2 }}
                          contentFit="cover"
                          transition={200}
                        />
                      ) : (
                        <View style={{
                          width:avatarSize, height:avatarSize, borderRadius:avatarSize/2,
                          backgroundColor:'rgba(75,0,130,0.6)', alignItems:'center', justifyContent:'center',
                        }}>
                          <Text style={{ fontSize: avatarSize*0.38 }}>🌟</Text>
                        </View>
                      )}
                    </AvatarFrame>
                    {uploading && (
                      <View style={{
                        position:'absolute', top:0, left:0, right:0, bottom:0,
                        borderRadius:(avatarSize+12)/2,
                        backgroundColor:'rgba(0,0,0,0.55)',
                        alignItems:'center', justifyContent:'center',
                      }}>
                        <ActivityIndicator color="#FFD700" />
                      </View>
                    )}
                    <Pressable
                      onPress={handlePickPhoto}
                      disabled={uploading}
                      style={{
                        position:'absolute', bottom:0, right:-4,
                        width:34, height:34, borderRadius:17,
                        backgroundColor:'#FFD700', alignItems:'center', justifyContent:'center',
                        borderWidth:2.5, borderColor:'#0D0D1A',
                      }}
                    >
                      <Camera size={16} color="#0D0D1A" />
                    </Pressable>
                  </View>

                  <View style={{ flexDirection:'row', gap:10, marginTop:14 }}>
                    <Pressable onPress={handlePickPhoto} disabled={uploading} style={{
                      paddingHorizontal:16, paddingVertical:8, borderRadius:12,
                      backgroundColor:'rgba(255,215,0,0.12)',
                      borderWidth:1, borderColor:'rgba(255,215,0,0.3)',
                    }}>
                      <Text style={{ color:'#FFD700', fontSize:13, fontWeight:'700' }}>🖼 Galerie</Text>
                    </Pressable>
                    <Pressable onPress={handleCamera} disabled={uploading} style={{
                      paddingHorizontal:16, paddingVertical:8, borderRadius:12,
                      backgroundColor:'rgba(255,215,0,0.12)',
                      borderWidth:1, borderColor:'rgba(255,215,0,0.3)',
                    }}>
                      <Text style={{ color:'#FFD700', fontSize:13, fontWeight:'700' }}>📷 Caméra</Text>
                    </Pressable>
                  </View>

                  {!photoUrl && (
                    <Text style={{ color:'rgba(255,100,100,0.7)', fontSize:12, marginTop:10, textAlign:'center', fontStyle:'italic' }}>
                      ⚠️ Une photo est requise pour le badge Cœur Vérifié
                    </Text>
                  )}
                </View>

                {/* ── Cadre avatar ─────────────────────────── */}
                <View style={{
                  backgroundColor:'rgba(255,255,255,0.04)',
                  borderRadius:18, padding:16, marginBottom:20,
                  borderWidth:1, borderColor:'rgba(255,215,0,0.1)',
                }}>
                  <SectionLabel title="🖼 Cadre avatar" hint="Personnalisez votre avatar" />
                  <CadreSelector value={cadreId} onChange={(id: CadreId) => setCadreId(id)} />
                </View>

                {/* ── Identité ─────────────────────────────── */}
                <View style={{
                  backgroundColor:'rgba(255,255,255,0.03)', borderRadius:18, padding:16, marginBottom:18,
                  borderWidth:1, borderColor:'rgba(255,215,0,0.08)',
                }}>
                  <Text style={{ color:'rgba(255,215,0,0.5)', fontSize:10, fontWeight:'800', letterSpacing:2, marginBottom:14 }}>
                    IDENTITÉ
                  </Text>
                  <Field label="Prénom *"  value={prenom} onChangeText={setPrenom} placeholder="Votre prénom"    maxLength={30} />
                  <Field label="Pseudo"    value={pseudo} onChangeText={setPseudo} placeholder="@votre_pseudo"   maxLength={30} hint="Affiché sous votre prénom" />
                  <View style={{ flexDirection:'row', gap:12 }}>
                    <View style={{ flex:1 }}>
                      <Field label="Âge" value={age} onChangeText={setAge} placeholder="Ex : 28" maxLength={3} keyboardType="numeric" />
                    </View>
                    <View style={{ flex:2 }}>
                      <Field label="Ville" value={ville} onChangeText={setVille} placeholder="Ex : Paris" maxLength={80} />
                    </View>
                  </View>
                </View>

                {/* ── Présentation ─────────────────────────── */}
                <View style={{
                  backgroundColor:'rgba(255,255,255,0.03)', borderRadius:18, padding:16, marginBottom:18,
                  borderWidth:1, borderColor:'rgba(255,215,0,0.08)',
                }}>
                  <Text style={{ color:'rgba(255,215,0,0.5)', fontSize:10, fontWeight:'800', letterSpacing:2, marginBottom:14 }}>
                    PRÉSENTATION
                  </Text>
                  <Field label="Bio"     value={bio}     onChangeText={setBio}     placeholder="Qui êtes-vous ? Qu'est-ce qui vous définit ?" multiline maxLength={300} />
                  <Chips label="Genre"   options={[...GENRES_OPTIONS]}  value={genre}   onSelect={setGenre} />
                  <Chips label="Je cherche" options={[...CHERCHE_OPTIONS]} value={cherche} onSelect={setCherche} />
                </View>
              </>
            )}

            {/* ══════════════════════════════════════════════
                ONGLET 2 — ✨ MON ÂME
                Carte astrale · Énergie · Style d'amour · Passions
            ══════════════════════════════════════════════ */}
            {tab === 'ame' && (
              <>
                {/* ── Carte astrale ────────────────────────── */}
                <View style={{
                  backgroundColor:'rgba(255,255,255,0.03)', borderRadius:18, padding:16, marginBottom:18,
                  borderWidth:1, borderColor:'rgba(255,182,193,0.1)',
                }}>
                  <Text style={{ color:'rgba(255,182,193,0.5)', fontSize:10, fontWeight:'800', letterSpacing:2, marginBottom:14 }}>
                    🔭 CARTE ASTRALE
                  </Text>
                  <Chips label="Signe solaire"   options={SIGNES} value={signe}    onSelect={setSigne}    emojis={SIGNES_EMOJI} />
                  <Field label="Ascendant"        value={ascendant} onChangeText={setAscendant} placeholder="Ex : Scorpion" maxLength={30} hint="Votre signe ascendant" />
                  <Field label="Planète dominante" value={planete}  onChangeText={setPlanete}   placeholder="Ex : Vénus"    maxLength={30} hint="Planète qui vous gouverne" />
                  <EnergyChips label="Élément" options={ELEMENTS} value={element} onSelect={setElement} hint="Feu · Terre · Air · Eau" />
                </View>

                {/* ── Énergie & Amour ──────────────────────── */}
                <View style={{
                  backgroundColor:'rgba(255,255,255,0.03)', borderRadius:18, padding:16, marginBottom:18,
                  borderWidth:1, borderColor:'rgba(192,132,252,0.1)',
                }}>
                  <Text style={{ color:'rgba(192,132,252,0.5)', fontSize:10, fontWeight:'800', letterSpacing:2, marginBottom:14 }}>
                    💫 ÉNERGIE & AMOUR
                  </Text>
                  <EnergyChips label="Mon énergie romantique" options={ENERGIES} value={energie}    onSelect={setEnergie} />
                  <EnergyChips label="J'aime en amour…"       options={VIBES}    value={styleAmour} onSelect={setStyleAmour} />
                </View>

                {/* ── Passions ─────────────────────────────── */}
                <View style={{
                  backgroundColor:'rgba(255,255,255,0.03)', borderRadius:18, padding:16, marginBottom:18,
                  borderWidth:1, borderColor:'rgba(135,206,235,0.1)',
                }}>
                  <Text style={{ color:'rgba(135,206,235,0.5)', fontSize:10, fontWeight:'800', letterSpacing:2, marginBottom:14 }}>
                    🎯 PASSIONS & UNIVERS
                  </Text>
                  <TagsGrid value={tags} onChange={setTags} />
                </View>
              </>
            )}

            {/* ══════════════════════════════════════════════
                ONGLET 3 — 🔐 SECRETS
                Devise · Moment · Chanson · Lettre · Rêve · Mystère
            ══════════════════════════════════════════════ */}
            {tab === 'secrets' && (
              <>
                {/* ── Mots & Âme ───────────────────────────── */}
                <View style={{
                  backgroundColor:'rgba(255,255,255,0.03)', borderRadius:18, padding:16, marginBottom:18,
                  borderWidth:1, borderColor:'rgba(255,215,0,0.08)',
                }}>
                  <Text style={{ color:'rgba(255,215,0,0.5)', fontSize:10, fontWeight:'800', letterSpacing:2, marginBottom:14 }}>
                    ✍️ MOTS & ÂME
                  </Text>
                  <Field label="Ma devise"          value={devise}        onChangeText={setDevise}        placeholder="Une phrase qui vous représente…"          maxLength={120} />
                  <Field label="Mon moment préféré" value={momentPrefere} onChangeText={setMomentPrefere} placeholder="Ex : coucher de soleil sur la Seine…"      multiline maxLength={200} />
                  <Field label="Ma chanson de vie"  value={chansonVie}    onChangeText={setChansonVie}    placeholder="Ex : La Vie en Rose – Édith Piaf"          maxLength={100} />
                </View>

                {/* ── Pour votre âme sœur ──────────────────── */}
                <View style={{
                  backgroundColor:'rgba(255,255,255,0.03)', borderRadius:18, padding:16, marginBottom:18,
                  borderWidth:1, borderColor:'rgba(255,100,100,0.1)',
                }}>
                  <Text style={{ color:'rgba(255,100,100,0.5)', fontSize:10, fontWeight:'800', letterSpacing:2, marginBottom:14 }}>
                    💌 POUR VOTRE ÂME SŒUR
                  </Text>
                  <Field label="Ma lettre secrète"  value={lettre}    onChangeText={setLettre}    placeholder="Ce que vous n'avez jamais osé dire…"          multiline maxLength={500} hint="Visible uniquement après un match mutuel" />
                  <Field label="Notre rêve à deux"  value={reveDuo}   onChangeText={setReveDuo}   placeholder="Ce que vous imaginez vivre ensemble…"          multiline maxLength={300} />
                </View>

                {/* ── Mode Mystère ──────────────────────────── */}
                <View style={{
                  flexDirection:'row', alignItems:'center', justifyContent:'space-between',
                  backgroundColor:'rgba(75,0,130,0.2)', borderRadius:14,
                  padding:16, marginBottom:8,
                  borderWidth:1, borderColor:'rgba(255,215,0,0.12)',
                }}>
                  <View style={{ flex:1, gap:4 }}>
                    <Text style={{ color:'#FFD700', fontWeight:'700', fontSize:14 }}>Mode Mystère 🌙</Text>
                    <Text style={{ color:'rgba(255,255,255,0.65)', fontSize:12 }}>Votre photo reste floue jusqu'au match</Text>
                  </View>
                  <Switch
                    value={isMystery}
                    onValueChange={setIsMystery}
                    trackColor={{ false:'rgba(255,255,255,0.1)', true:'rgba(255,215,0,0.4)' }}
                    thumbColor={isMystery ? '#FFD700' : 'rgba(255,255,255,0.4)'}
                  />
                </View>
              </>
            )}

            {/* ── Bouton Enregistrer (tous les onglets) ─────── */}
            <Pressable
              onPress={handleSave}
              disabled={saving || uploading}
              style={{ marginTop:16, opacity:(saving || uploading) ? 0.6 : 1 }}
            >
              <LinearGradient
                colors={['rgba(255,215,0,0.22)','rgba(180,100,200,0.22)']}
                style={{
                  borderRadius:18, padding:16,
                  alignItems:'center', justifyContent:'center',
                  borderWidth:1.5, borderColor:'rgba(255,215,0,0.42)',
                  flexDirection:'row', gap:8,
                }}
              >
                {saving && <ActivityIndicator size="small" color="#FFD700" />}
                <Text style={{ color:'#FFD700', fontWeight:'900', fontSize:16 }}>
                  {saved ? '✓ Profil mis à jour !' : '✨ Enregistrer le profil'}
                </Text>
              </LinearGradient>
            </Pressable>

          </ScrollView>
          </React.Fragment>
        </KeyboardAvoidingView>
      </CosmicBackground>
    </View>
  );
}

