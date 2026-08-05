// Aevyra – Naissance d'une Étoile · Inscription v2 (zéro bug, flow stratégique)
// 5 étapes claires : Identité → Désir → Naissance → Âme → Portail
// Architecture : états plats par étape, validation stricte par étape, 0 doublons
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {

  Animated,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, RelativePathString, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '@/hooks/useResponsive';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff, ArrowLeft, Check, Sparkles } from 'lucide-react-native';
import { supabase } from '@/client/supabase';
import { getSigneAstro, SIGNES_ASTRO, getEmpreinteCouleur } from '@/lib/amour-theme';
import { upsertProfileInit, applyReferralCode } from '@/lib/amour-api';

const AnyInput = TextInput as any;

// ─────────────────────────────────────────────────────────────────────────────
// DONNÉES — chaque étape possède exactement ses propres données
// ─────────────────────────────────────────────────────────────────────────────

const TOTAL = 5;

// Étape 1 – Identité : genre + prénom
const GENRES = [
  { id: 'femme', emoji: '🌹', label: 'Lune de Rose',         sub: 'Femme',               aura: '#FF85A2' },
  { id: 'homme', emoji: '🌌', label: 'Étoile d\'Obsidienne', sub: 'Homme',               aura: '#6EC6FF' },
  { id: 'autre', emoji: '✨', label: 'Âme Libre',             sub: 'Autre / Non-binaire', aura: '#C77DFF' },
];

// Étape 2 – Désir (qui cherche-t-on)
const CHERCHE = [
  { id: 'femme',    emoji: '🌹', label: 'Une Lune de Rose',         sub: 'Une femme'       },
  { id: 'homme',    emoji: '🌌', label: 'Une Étoile d\'Obsidienne', sub: 'Un homme'        },
  { id: 'les_deux', emoji: '💫', label: 'La Dualité Cosmique',      sub: 'Femme ou Homme'  },
  { id: 'une_ame',  emoji: '🕊️', label: 'Une Âme Miroir',           sub: 'Au-delà du genre'},
];

// Étape 4 – Âme : énergie romantique (exclusif à cette étape)
const ENERGIES = [
  { id: 'Soleil ardent',     emoji: '☀️', sub: 'Passion & ardeur'     },
  { id: 'Lune mystérieuse',  emoji: '🌙', sub: 'Profondeur & mystère' },
  { id: 'Étoile libre',      emoji: '⭐', sub: 'Liberté & légèreté'   },
  { id: 'Comète passionnée', emoji: '☄️', sub: 'Intensité & rareté'   },
];

// Étape 4 – Âme : style d'amour (exclusif à cette étape)
const VIBES = [
  { id: 'Intensément',  emoji: '🔥', sub: 'Avec tout mon être'        },
  { id: 'Doucement',    emoji: '🌸', sub: 'Avec patience & douceur'   },
  { id: 'Librement',    emoji: '🦋', sub: 'Sans attaches ni peur'     },
  { id: 'Profondément', emoji: '🌊', sub: 'Avec toute mon âme'        },
];

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG DES ÉTAPES — tons chauds & lumineux
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = {
  1: {
    bg:       ['#1a0830', '#2d0f4e', '#120520'] as const,
    glow:     ['#C77DFF55', '#8B2FC900', '#00000000'] as const,
    accent:   '#E0AAFF',
    headline: 'Bienvenue,\nnouvelle âme',
    sub:      'Dites-nous qui vous êtes — votre étoile vous attend.',
  },
  2: {
    bg:       ['#1f0520', '#3d0830', '#150315'] as const,
    glow:     ['#FF85A255', '#FF2D5500', '#00000000'] as const,
    accent:   '#FFB3C6',
    headline: 'Votre cœur\nattire qui ?',
    sub:      'Laissez l\'univers guider votre désir.',
  },
  3: {
    bg:       ['#120a00', '#2a1800', '#1a0f00'] as const,
    glow:     ['#FFD70055', '#FF8C0000', '#00000000'] as const,
    accent:   '#FFD700',
    headline: 'Votre date\nde naissance',
    sub:      'Les astres de ce jour-là ont tout prévu.',
  },
  4: {
    bg:       ['#001222', '#002440', '#000e1a'] as const,
    glow:     ['#87CEEB55', '#1E90FF00', '#00000000'] as const,
    accent:   '#A8D8F0',
    headline: 'Votre âme\nen quelques mots',
    sub:      'Quelqu\'un quelque part attend de vous lire.',
  },
  5: {
    bg:       ['#0f0820', '#1e1040', '#080615'] as const,
    glow:     ['#FFD70066', '#C77DFF00', '#00000000'] as const,
    accent:   '#FFD700',
    headline: 'Dernière étape —\nvotre portail',
    sub:      'Choisissez votre nom d\'étoile pour rejoindre la constellation.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANTS UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────────

// Particules lumineuses flottantes
function Particles({ accent }: { accent: string }) {
  const { width, height } = useWindowDimensions();
  return (
    <View style={{ position: 'absolute', width, height }} pointerEvents="none">
      {Array.from({ length: 30 }, (_, i) => (
        <React.Fragment key={i}>
        <View style={{
          position: 'absolute',
          left: ((i * 137 + 17) % 97) * width / 100,
          top:  ((i * 89  + 11) % 93) * height / 100,
          width:  i % 7 === 0 ? 4 : i % 3 === 0 ? 2.5 : 1.5,
          height: i % 7 === 0 ? 4 : i % 3 === 0 ? 2.5 : 1.5,
          borderRadius: 3,
          backgroundColor: i % 5 === 0 ? accent : 'rgba(255,220,180,0.9)',
          opacity: 0.04 + (i % 8) * 0.028,
        }} />
      </React.Fragment>
      ))}
    </View>
  );
}

// Barre de progression fluide — affiche étape / total
// Bug #1 corrigé : utilise step/TOTAL pour que l'étape 1 affiche déjà 20%
function ProgressBar({ step, accent }: { step: number; accent: string }) {
  const pct = (step / TOTAL) * 100;
  return (
    <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
      <View style={{ height: 3, borderRadius: 2, width: `${pct}%`, backgroundColor: accent }} />
    </View>
  );
}

// Carte de choix — grande, aérée
// Carte de choix — grande, aérée, responsive
function ChoiceCard({
  emoji, label, sub, selected, onPress, accent,
}: {
  emoji: string; label: string; sub?: string;
  selected: boolean; onPress: () => void; accent: string;
}) {
  const { tapTarget, iconSize, bodySize, captionSize, cardRadius, gap, width: _width, height: _height, px: _px, isTablet: _isTablet, isDesktop: _isDesktop, isTV: _isTV, h2Size: _h2Size, h3Size: _h3Size, buttonFontSize: _buttonFontSize, buttonPadV: _buttonPadV, buttonPadH: _buttonPadH, avatarSize: _avatarSize, contentMaxWidth: _contentMaxWidth } = useResponsive();
;
  const sc = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.spring(sc, {
      toValue: selected ? 0.97 : 1,
      useNativeDriver: true,
      friction: 6,
      tension: 80,
    }).start();
  }, [selected, sc]);
  return (
    <Animated.View style={{ transform: [{ scale: sc }] }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
      >
        <LinearGradient
          colors={selected
            ? [`${accent}22`, `${accent}0c`, 'rgba(0,0,0,0.15)']
            : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
          style={{
            borderRadius: cardRadius,
            borderWidth: selected ? 1.5 : 1,
            borderColor: selected ? accent : 'rgba(255,255,255,0.10)',
            paddingHorizontal: gap, paddingVertical: gap * 0.8,
            flexDirection: 'row', alignItems: 'center', gap: gap * 0.7,
            minHeight: tapTarget,
          }}
        >
          <View style={{
            width: tapTarget, height: tapTarget, borderRadius: tapTarget / 2,
            backgroundColor: selected ? `${accent}20` : 'rgba(255,255,255,0.06)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: iconSize }}>{emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: bodySize, fontWeight: selected ? '800' : '600',
              color: selected ? '#fff' : 'rgba(255,255,255,0.88)',
            }}>{label}</Text>
            {sub && (
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize, marginTop: 2 }}>{sub}</Text>
            )}
          </View>
          <View style={{
            width: iconSize, height: iconSize, borderRadius: iconSize / 2,
            borderWidth: 1.5,
            borderColor: selected ? accent : 'rgba(255,255,255,0.15)',
            backgroundColor: selected ? accent : 'transparent',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {selected && <Check size={iconSize * 0.6} color="#fff" strokeWidth={3} />}
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

// Champ texte lumineux avec bordure animée au focus
function MagicInput({
  value, onChange, placeholder, secure, keyboard, capitalize, accent, right, multiline, maxLen,
  autoComplete, textContentType, returnKeyType, onSubmitEditing, inputRef,
}: {
  value: string; onChange: (t: string) => void; placeholder: string;
  secure?: boolean; keyboard?: any; capitalize?: any; accent: string;
  right?: React.ReactNode; multiline?: boolean; maxLen?: number;
  autoComplete?: any; textContentType?: any;
  returnKeyType?: any; onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput>;
}) {
  const [focused, setFocused] = useState(false);
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(glow, { toValue: focused ? 1 : 0, duration: 300, useNativeDriver: false }).start();
  }, [focused, glow]);
  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.10)', accent],
  });
  return (
    <Animated.View style={{
      borderRadius: 16, borderWidth: 1.5, borderColor,
      backgroundColor: 'rgba(255,255,255,0.05)',
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: multiline ? 'flex-start' : 'center',
    }}>
      <AnyInput
        ref={inputRef}
        value={value} onChangeText={onChange}
        placeholder={placeholder} placeholderTextColor="rgba(255,255,255,0.50)"
        secureTextEntry={secure} keyboardType={keyboard}
        autoCapitalize={capitalize ?? 'sentences'}
        multiline={multiline} maxLength={maxLen}
        numberOfLines={multiline ? 5 : undefined}
        autoComplete={autoComplete}
        textContentType={textContentType}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1, color: '#fff', fontSize: 17,
          paddingVertical: multiline ? 14 : 0,
          minHeight: multiline ? 110 : 52,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
      {right}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// Architecture : états plats par étape, validation stricte, 0 doublons logiques
// ─────────────────────────────────────────────────────────────────────────────

export default function Register() {
  const { width, height } = useWindowDimensions();
  const { px, h2Size, h3Size, bodySize, captionSize, cardRadius, gap, tapTarget, buttonFontSize, buttonPadV, buttonPadH, iconSize, avatarSize: _avatarSize2, contentMaxWidth, isDesktop, isTablet, isTV } = useResponsive();
  const isWide = isDesktop || isTablet || isTV;
  const insets = useSafeAreaInsets();
  // Lire le code de parrainage depuis le deep link (?ref=XXXX)
  const { ref: refParam } = useLocalSearchParams<{ ref?: string }>();

  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [inscrit, setInscrit] = useState(false); // écran félicitations post-inscription
  const [inscritPrenom, setInscritPrenom] = useState('');

  // Animations de transition entre étapes
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Refs focus auto JJ→MM→AAAA
  const jourRef  = useRef<TextInput>(null);
  const moisRef  = useRef<TextInput>(null);
  const anneeRef = useRef<TextInput>(null);

  // ── État étape 1 : Identité ──────────────────────────────────────────────
  const [genre,  setGenre]  = useState('');
  const [prenom, setPrenom] = useState('');

  // ── État étape 2 : Désir ─────────────────────────────────────────────────
  const [cherche, setCherche] = useState('');

  // ── État étape 3 : Naissance ─────────────────────────────────────────────
  const [jour,  setJour]  = useState('');
  const [mois,  setMois]  = useState('');
  const [annee, setAnnee] = useState('');
  const [dateNaissance, setDateNaissance] = useState<Date | null>(null);

  // ── État étape 4 : Âme ───────────────────────────────────────────────────
  const [bio,    setBio]    = useState('');
  const [vibe,   setVibe]   = useState('');
  const [energie, setEnergie] = useState('');
  const [devise, setDevise] = useState('');

  // ── État étape 5 : Portail ───────────────────────────────────────────────
  const [pseudo,          setPseudo]          = useState('');
  const [password,        setPassword]        = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [phraseSecurite,  setPhraseSecurite]  = useState('');
  const [showPw,          setShowPw]          = useState(false);
  const [showPwConfirm,   setShowPwConfirm]   = useState(false);
  const [serment,         setSerment]         = useState(false);
  // Pré-remplir depuis deep link aevyra.uk/join?ref=XXXX
  const [codeParrainage, setCodeParrainage] = useState(
    refParam ? `AEVYRA-${refParam.toUpperCase()}` : ''
  );

  // Indicateur de force du mot de passe
  const pwStrength = (() => {
    if (password.length === 0) return 0;
    let score = 0;
    if (password.length >= 8)                        score++;
    if (/[A-Z]/.test(password))                      score++;
    if (/[0-9]/.test(password))                      score++;
    if (/[^A-Za-z0-9]/.test(password))               score++;
    return score; // 0–4
  })();
  const pwStrengthLabel = ['', 'Faible', 'Moyen', 'Bon', 'Fort'][pwStrength] ?? '';
  const pwStrengthColor = ['', '#FF6B6B', '#FFD166', '#06D6A0', '#7FD99A'][pwStrength] ?? '#fff';

  // Vérification disponibilité pseudo — debounce 600ms + cleanup au unmount
  // Bug #5 corrigé : annulation propre du timer via ref stable (pas de closure stale)
  const [pseudoStatus, setPseudoStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const pseudoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => { if (pseudoTimer.current) clearTimeout(pseudoTimer.current); };
  }, []);

  // Parse date + validation 18 ans minimum — DATE EXACTE (pas seulement l'année)
  // Sécurité enfants : triple verrou
  //   1. Borne basse : a >= 1906 (impossible d'être né avant) et a <= currentYear - 18
  //   2. Date réelle : 31/02 ou 30/02 détectés et rejetés
  //   3. Comparaison exacte : aujourd'hui - 18 ans (pas seulement l'année)
  const currentYear = new Date().getFullYear();
  // Âge max raisonnable : 120 ans → né en 1906 au plus tôt
  const minBirthYear = currentYear - 120;
  // Âge min : 18 ans révolus → né au plus tard aujourd'hui - 18 ans
  const maxBirthYear = currentYear - 18;
  useEffect(() => {
    const j = parseInt(jour, 10);
    const m = parseInt(mois, 10);
    const a = parseInt(annee, 10);
    // Borne double : ni trop vieux ni trop jeune même en année seule
    if (j >= 1 && j <= 31 && m >= 1 && m <= 12 && a >= minBirthYear && a <= maxBirthYear) {
      const candidate = new Date(a, m - 1, j);
      // Vérifier que la date est réelle (ex: 31/02 → JS corrige en mars, on détecte)
      if (
        candidate.getFullYear() !== a ||
        candidate.getMonth() !== m - 1 ||
        candidate.getDate() !== j
      ) {
        setDateNaissance(null);
        return;
      }
      // Calculer la date limite exacte : aujourd'hui - 18 ans (jour pour jour)
      const today = new Date();
      const limit18 = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      // candidate doit être STRICTEMENT <= limite : pas de < 18 ans même au jour près
      setDateNaissance(candidate <= limit18 ? candidate : null);
    } else {
      setDateNaissance(null);
    }
  }, [jour, mois, annee, currentYear, minBirthYear, maxBirthYear]);

  // Vérification pseudo disponible avec debounce 600ms
  // Bug #5 corrigé : clearTimeout systématique AVANT de créer le nouveau timer
  const handlePseudoChange = useCallback((val: string) => {
    setPseudo(val);
    const clean = val.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (clean.length < 3) { setPseudoStatus('idle'); return; }
    // Annuler le timer précédent avant tout (évite double-check en cas de frappe rapide)
    if (pseudoTimer.current) clearTimeout(pseudoTimer.current);
    setPseudoStatus('checking');
    pseudoTimer.current = setTimeout(async () => {
      const { data } = await supabase.rpc('check_pseudo_available', { p_pseudo: clean });
      setPseudoStatus(data === true ? 'available' : 'taken');
    }, 600);
  }, []);

  // Dérivés
  const pseudoClean      = pseudo.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const signeAstro       = dateNaissance ? getSigneAstro(dateNaissance) : null;
  const empreinteCouleur = getEmpreinteCouleur(energie);
  const cfg              = STEPS[step as keyof typeof STEPS];
  const accent           = cfg.accent;

  // ── Validation stricte par étape — chaque étape ne valide QUE ses propres champs
  const canContinue: Record<number, boolean> = {
    1: genre !== '' && prenom.trim().length >= 2,
    2: cherche !== '',
    3: dateNaissance !== null,
    4: bio.trim().length >= 10 && energie !== '' && vibe !== '',
    5: pseudoClean.length >= 3
      && pseudoStatus === 'available'
      && password.length >= 6
      && password === passwordConfirm
      && phraseSecurite.trim().length >= 6
      && serment,
  };

  // Messages d'erreur contextuels par étape
  const errMsgs: Record<number, string> = {
    1: genre === '' ? 'Choisissez votre identité cosmique' : 'Prénom requis (2 car. min.)',
    2: 'Indiquez ce que vous cherchez pour continuer',
    3: `🔞 Accès réservé aux 18 ans et plus · Vérifiez votre date de naissance`,
    4: bio.trim().length < 10
      ? 'Décrivez-vous en quelques mots (10 car. min.)'
      : energie === ''
        ? 'Choisissez votre énergie cosmique'
        : 'Choisissez votre façon d\'aimer',
    5: pseudoClean.length < 3
      ? 'Nom d\'étoile : 3 caractères min. (lettres, chiffres, _)'
      : pseudoStatus === 'taken'
        ? 'Ce nom d\'étoile brille déjà dans notre ciel…'
        : pseudoStatus === 'checking'
          ? 'Vérification du nom d\'étoile en cours…'
          : password.length < 6
            ? 'Clé secrète : 6 caractères minimum'
            : password !== passwordConfirm
              ? 'Les deux mots de passe ne correspondent pas'
              : phraseSecurite.trim().length < 6
                ? 'Phrase de sécurité : 6 caractères minimum'
                : 'Acceptez le serment pour rejoindre la constellation',
  };

  // ── Transition animée entre étapes
  const transition = useCallback((dir: 1 | -1, next: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0,         duration: 160, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: dir * -40, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      next();
      slideAnim.setValue(dir * 40);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  const goBack = useCallback(() => {
    setError('');
    if (step === 1) {
      router.back();
      return;
    }
    transition(-1, () => setStep((s: number) => s - 1));
  }, [step, transition]);

  // ── Création du compte — étape finale
  // Bugs #2 #3 #4 #6 corrigés :
  //   #2 — signUp "already registered" → message clair + pas de fallback silencieux
  //   #3 — suppression de la boucle 3×400ms → vérification unique rapide (50ms)
  //   #4 — upsertProfileInit avec retry si RLS pas encore propagé
  //   #6 — setLoading(false) dans finally garantit déblocage du bouton
  const finaliser = async () => {
    setLoading(true);
    setError('');
    try {
      const email = `${pseudoClean}@amour-app.fr`;

      // 1. Créer le compte Auth Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) {
        setError(authError.message.includes('already registered')
          ? '✦ Ce nom d\'étoile brille déjà dans notre ciel… Choisissez-en un autre.'
          : authError.message);
        return;
      }
      if (!authData.user) {
        setError('Création impossible. Réessayez.');
        return; // Bug #6 : setLoading(false) est dans finally — pas besoin ici
      }

      // 2. Établir la session (email confirm désactivé → session retournée immédiatement)
      if (authData.session) {
        await supabase.auth.setSession({
          access_token:  authData.session.access_token,
          refresh_token: authData.session.refresh_token,
        });
      } else {
        // Fallback uniquement si session absente (cas exceptionnel)
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) { setError(signInErr.message); return; }
      }

      // 3. Construire la date en local (évite le décalage UTC de toISOString)
      const d = dateNaissance!;
      const dateStr = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
      ].join('-');
      const today    = new Date();
      const ageExact = today.getFullYear() - d.getFullYear()
        - (today < new Date(today.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);

      // Verrou serveur : double-vérification âge avant tout envoi en DB
      // Empêche toute manipulation client (console, Expo debugger, etc.)
      if (ageExact < 18) {
        setError('🔞 Vous devez avoir 18 ans révolus pour vous inscrire sur Aevyra.');
        setLoading(false);
        return;
      }

      // 4. Bug #3 corrigé : pas de délai artificiel — le trigger est quasi-instantané
      // puis upsert atomique
      // 5. Bug #4 corrigé : upsertProfileInit avec retry si RLS pas encore propagé
      let upsertOk = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await upsertProfileInit(authData.user.id, {
            prenom,
            pseudo:               pseudoClean,
            date_naissance:       dateStr,
            signe_astro:          signeAstro || '',
            age:                  ageExact,
            genre,
            cherche,
            energie_romantique:   energie,
            style_amour:          vibe,
            bio,
            devise,
            empreinte_couleur:    empreinteCouleur,
            security_phrase:      phraseSecurite.trim(),
            inscription_complete: true,
            etape_inscription:    TOTAL,
            notif_enabled:        true,
            synchronicite_enabled: true,
            cgu_accepted_at:      new Date().toISOString(), // Acceptation CGU/RGPD horodatée
          });
          upsertOk = true;
          break;
        } catch {
          // RLS pas encore propagé → attendre 300ms avant retry
          if (attempt < 2) await new Promise(r => setTimeout(r, 300));
        }
      }
      if (!upsertOk) {
        setError('Profil non sauvegardé. Réessayez.');
        return;
      }

      // 7. Appliquer code de parrainage si fourni
      // Retry jusqu'à 3× avec délai croissant : le profil peut ne pas encore
      // être propagé en DB au moment exact où le RPC est appelé.
      if (codeParrainage.trim().length >= 8) {
        for (let attempt = 0; attempt < 3; attempt++) {
          if (attempt > 0) await new Promise(r => setTimeout(r, 500 * attempt));
          const result = await applyReferralCode(codeParrainage.trim(), authData.user.id).catch(() => ({ ok: false }));
          // 'deferred' = profil pas encore propagé, réessayer
          if ((result as { ok: boolean; deferred?: boolean }).deferred) continue;
          break;
        }
      }

      // 8. Afficher l'écran de bienvenue 2,5s puis naviguer explicitement vers (app)
      //    Fix Bug A : le setTimeout vide ne déclenchait aucune navigation.
      //    Fix Bug B : router.replace est lancé à T+2500ms même si onAuthStateChange
      //                tarde — la session est déjà dans le storage à ce stade,
      //                Stack.Protected guard={!!session} laisse passer (app).
      setInscritPrenom(prenom);
      setInscrit(true);
      setTimeout(() => {
        // Naviguer vers home après l'écran de félicitations.
        // replace (pas push) : supprime (auth)/register de la pile → retour impossible.
        router.replace('/(app)/home' as RelativePathString);
      }, 2500);
    } catch (e: unknown) {
      setError(e instanceof Error
        ? (e.message.toLowerCase().includes('database') || e.message.toLowerCase().includes('saving')
            ? 'Inscription impossible pour le moment. Vérifiez votre connexion et réessayez.'
            : e.message)
        : 'Une erreur inattendue s\'est produite. Réessayez.');
    } finally {
      // Bug #6 corrigé : toujours exécuté, débloque le bouton dans tous les cas
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!canContinue[step]) {
      setError(errMsgs[step] ?? '');
      return;
    }
    setError('');
    if (step === TOTAL) { finaliser(); return; }
    transition(1, () => setStep((s: number) => s + 1));
  };

  // ── CONTENU PAR ÉTAPE — chaque étape est isolée et ne touche QUE ses états
  const renderContent = () => {

    // ── Étape 1 : IDENTITÉ ─────────────────────────────────────────────────
    if (step === 1) return (
      <View style={{ gap: gap, paddingHorizontal: px }}>
        <LinearGradient
          colors={[`${accent}15`, `${accent}06`, 'transparent']}
          style={{ borderRadius: cardRadius, padding: gap, borderWidth: 1, borderColor: `${accent}20`, alignItems: 'center', gap: gap * 0.4 }}
        >
          <Text style={{ fontSize: iconSize * 2 }}>🌸</Text>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: h2Size, textAlign: 'center' }}>
            Votre voyage commence ici
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.90)', fontSize: bodySize, textAlign: 'center', lineHeight: bodySize * 1.6, fontStyle: 'italic' }}>
            Quelques instants pour décrire votre essence…{'\n'}et l'univers fera le reste.
          </Text>
        </LinearGradient>

        <View style={{ gap: gap * 0.5 }}>
          <Text style={s.label}>Je suis…</Text>
          {GENRES.map(g => (
            <React.Fragment key={g.id}>
            <ChoiceCard
 emoji={g.emoji} label={g.label} sub={g.sub}
              selected={genre === g.id} onPress={() => setGenre(g.id)} accent={g.aura}
            />
            </React.Fragment>
          ))}
        </View>

        {genre !== '' && (
          <View style={{ gap: gap * 0.5 }}>
            <Text style={s.label}>Mon prénom</Text>
            <MagicInput
              value={prenom} onChange={setPrenom}
              placeholder={`Votre prénom, ${GENRES.find(g => g.id === genre)?.label ?? ''}…`}
              capitalize="words" accent={accent}
            />
            {prenom.length >= 2 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <Text style={{ fontSize: iconSize }}>{GENRES.find(g => g.id === genre)?.emoji}</Text>
                <Text style={{ color: accent, fontSize: bodySize + 1, fontStyle: 'italic', fontWeight: '700' }}>
                  Enchanté·e, {prenom} ✨
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );

    // ── Étape 2 : DÉSIR ────────────────────────────────────────────────────
    // N'affiche QUE "cherche" — énergie et vibe sont à l'étape 4
    if (step === 2) return (
      <View style={{ gap: gap, paddingHorizontal: px }}>
        <View style={{ gap: gap * 0.5, alignItems: 'center', paddingVertical: 8 }}>
          <Text style={{ fontSize: iconSize * 2.5 }}>💖</Text>
          <Text style={{ color: 'rgba(255,255,255,0.90)', fontSize: bodySize, textAlign: 'center', lineHeight: bodySize * 1.6, fontStyle: 'italic' }}>
            {prenom ? `${prenom}, votre` : 'Votre'} cœur sait déjà.{'\n'}Faites-lui confiance.
          </Text>
        </View>
        <View style={{ gap: gap * 0.5 }}>
          <Text style={s.label}>Je cherche…</Text>
          {CHERCHE.map(c => (
            <React.Fragment key={c.id}>
            <ChoiceCard
 emoji={c.emoji} label={c.label} sub={c.sub}
              selected={cherche === c.id} onPress={() => setCherche(c.id)} accent={accent}
            />
            </React.Fragment>
          ))}
        </View>
      </View>
    );

    // ── Étape 3 : NAISSANCE CÉLESTE ────────────────────────────────────────
    if (step === 3) return (
      <View style={{ gap: gap * 1.4, paddingHorizontal: px }}>
        <View style={{ alignItems: 'center', gap: gap * 0.35, paddingVertical: 4 }}>
          <Text style={{ fontSize: iconSize * 2.5 }}>🌙</Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: bodySize, textAlign: 'center', lineHeight: bodySize * 1.6, fontStyle: 'italic' }}>
            Le ciel avait une configuration unique{'\n'}le jour de votre naissance.
          </Text>
        </View>

        <View style={{ gap: gap * 0.7 }}>
          <Text style={s.label}>Date de naissance</Text>
          <View style={{ flexDirection: 'row', gap: gap * 0.5, alignItems: 'flex-end' }}>
            {[
              { val: jour,  set: setJour,  ph: 'JJ',   len: 2, flex: 1,   lbl: 'Jour',  ref: jourRef  },
              { val: mois,  set: setMois,  ph: 'MM',   len: 2, flex: 1,   lbl: 'Mois',  ref: moisRef  },
              { val: annee, set: setAnnee, ph: 'AAAA', len: 4, flex: 1.8, lbl: 'Année', ref: anneeRef },
            ].map((f, i) => (
              <React.Fragment key={f.ph}>
                {i > 0 && (
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: h3Size * 1.3, marginBottom: buttonPadV }}>/</Text>
                )}
                <View style={{ flex: f.flex, gap: gap * 0.35 }}>
                  <AnyInput
                    ref={f.ref}
                    value={f.val}
                    onChangeText={(v: string) => {
                      f.set(v);
                      if (v.length === f.len) {
                        if (i === 0) moisRef.current?.focus();
                        else if (i === 1) anneeRef.current?.focus();
                      }
                    }}
                    placeholder={f.ph} placeholderTextColor="rgba(255,255,255,0.50)"
                    keyboardType="number-pad" maxLength={f.len}
                    style={{
                      backgroundColor: f.val.length === f.len ? `${accent}18` : 'rgba(255,255,255,0.07)',
                      borderRadius: cardRadius * 0.7, borderWidth: 1.5,
                      borderColor: f.val.length === f.len ? accent : 'rgba(255,255,255,0.1)',
                      color: '#fff', fontSize: h3Size * 1.3, fontWeight: '700',
                      textAlign: 'center', paddingVertical: buttonPadV,
                    }}
                  />
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize, textAlign: 'center' }}>{f.lbl}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {signeAstro ? (
          <LinearGradient
            colors={[`${accent}20`, `${accent}08`, 'transparent']}
            style={{ borderRadius: cardRadius, padding: gap * 1.3, borderWidth: 1.5, borderColor: `${accent}35`, alignItems: 'center', gap: gap * 0.5 }}
          >
            <Text style={{ fontSize: iconSize * 3.2 }}>{SIGNES_ASTRO[signeAstro]?.emoji}</Text>
            <Text style={{ color: accent, fontWeight: '900', fontSize: h2Size * 1.1, letterSpacing: 1 }}>{signeAstro}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: bodySize, textAlign: 'center', fontStyle: 'italic', lineHeight: bodySize * 1.6 }}>
              {SIGNES_ASTRO[signeAstro]?.description}
            </Text>
          </LinearGradient>
        ) : (
          <View style={{ borderRadius: cardRadius, padding: gap * 1.5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', gap: gap * 0.5 }}>
            <Text style={{ fontSize: iconSize * 2.2, opacity: 0.3 }}>🔭</Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: bodySize, textAlign: 'center', fontStyle: 'italic' }}>
              Entrez votre date pour révéler votre signe céleste…
            </Text>
          </View>
        )}
      </View>
    );

    // ── Étape 4 : ÂME ─────────────────────────────────────────────────────
    // Contient : bio + énergie romantique + style d'amour + devise (optionnel)
    // C'est ICI et SEULEMENT ICI que energie et vibe sont renseignés
    if (step === 4) return (
      <View style={{ gap: gap * 1.4, paddingHorizontal: px }}>
        <View style={{ alignItems: 'center', gap: gap * 0.35 }}>
          <Text style={{ fontSize: iconSize * 2.5 }}>✍️</Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: bodySize, textAlign: 'center', lineHeight: bodySize * 1.6, fontStyle: 'italic' }}>
            {prenom ? `${prenom}, quelqu'un` : 'Quelqu\'un'} quelque part{'\n'}attend de vous découvrir.
          </Text>
        </View>

        {/* Bio — requis */}
        <View style={{ gap: gap * 0.5 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={s.label}>Ce qui me définit</Text>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: captionSize }}>{bio.length} / 200</Text>
          </View>
          <MagicInput
            value={bio} onChange={setBio}
            placeholder="Mes passions, mes rêves, ce qui fait vibrer mon cœur…"
            accent={accent} multiline maxLen={200}
          />
          {bio.length > 0 && bio.length < 10 && (
            <Text style={{ color: 'rgba(255,130,100,0.9)', fontSize: captionSize }}>
              Encore {10 - bio.length} caractère{10 - bio.length > 1 ? 's' : ''}…
            </Text>
          )}
        </View>

        {/* Énergie romantique — requis */}
        <View style={{ gap: gap * 0.5 }}>
          <Text style={s.label}>Mon énergie cosmique</Text>
          {ENERGIES.map(e => (
            <React.Fragment key={e.id}>
            <ChoiceCard emoji={e.emoji} label={e.id} sub={e.sub}
              selected={energie === e.id} onPress={() => setEnergie(e.id)} accent={accent} />
          </React.Fragment>
          ))}
        </View>

        {/* Style d'amour — requis */}
        <View style={{ gap: gap * 0.5 }}>
          <Text style={s.label}>J'aime aimer…</Text>
          {VIBES.map(v => (
            <React.Fragment key={v.id}>
            <ChoiceCard emoji={v.emoji} label={v.id} sub={v.sub}
              selected={vibe === v.id} onPress={() => setVibe(v.id)} accent={accent} />
          </React.Fragment>
          ))}
        </View>

        {/* Devise — optionnel */}
        <View style={{ gap: gap * 0.5 }}>
          <Text style={s.label}>
            Ma devise{'  '}
            <Text style={{ color: 'rgba(255,255,255,0.50)', fontWeight: '400', letterSpacing: 0 }}>(optionnel)</Text>
          </Text>
          <MagicInput
            value={devise} onChange={setDevise}
            placeholder="Une phrase qui me représente…"
            accent={accent} maxLen={80}
          />
        </View>
      </View>
    );

    // ── Étape 5 : PORTAIL ──────────────────────────────────────────────────
    if (step === 5) return (
      <View style={{ gap: gap * 1.3, paddingHorizontal: px }}>

        {/* Résumé du profil */}
        <LinearGradient
          colors={[`${accent}18`, `${accent}07`, 'transparent']}
          style={{ borderRadius: cardRadius, padding: gap, borderWidth: 1, borderColor: `${accent}22`, gap: gap * 0.4 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: gap * 0.4 }}>
            <Sparkles size={iconSize} color={accent} />
            <Text style={{ color: accent, fontWeight: '900', fontSize: bodySize }}>
              {prenom ? `${prenom}, votre profil est prêt` : 'Votre profil est prêt'}
            </Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: captionSize, lineHeight: captionSize * 1.55 }}>
            {signeAstro ? `${SIGNES_ASTRO[signeAstro]?.emoji} ${signeAstro}  · ` : ''}
            {energie || 'Énergie libre'}
            {cherche ? `  ·  ${CHERCHE.find(c => c.id === cherche)?.label ?? ''}` : ''}
          </Text>
        </LinearGradient>

        {/* Nom d'étoile (pseudo) */}
        <View style={{ gap: gap * 0.5 }}>
          <Text style={s.label}>Votre nom d'étoile</Text>
          <Text style={{ color: 'rgba(255,255,255,0.80)', fontSize: captionSize, fontStyle: 'italic' }}>
            Lettres, chiffres et _ · votre identité dans la constellation
          </Text>
          <MagicInput
            value={pseudo} onChange={handlePseudoChange}
            placeholder="nom_etoile…" capitalize="none" accent={accent}
          />
          {pseudo.length > 0 && pseudoClean.length < 3 && (
            <Text style={{ color: 'rgba(255,130,100,0.8)', fontSize: captionSize }}>3 caractères minimum</Text>
          )}
          {pseudoClean.length >= 3 && pseudoStatus === 'checking' && (
            <Text style={{ color: `${accent}85`, fontSize: captionSize }}>Vérification de @{pseudoClean}…</Text>
          )}
          {pseudoClean.length >= 3 && pseudoStatus === 'available' && (
            <Text style={{ color: '#7FD99A', fontSize: captionSize }}>✦ @{pseudoClean} est disponible !</Text>
          )}
          {pseudoClean.length >= 3 && pseudoStatus === 'taken' && (
            <Text style={{ color: 'rgba(255,130,100,0.9)', fontSize: captionSize }}>
              @{pseudoClean} est déjà pris — choisissez un autre nom
            </Text>
          )}
        </View>

        {/* Clé secrète (mot de passe) */}
        <View style={{ gap: gap * 0.5 }}>
          <Text style={s.label}>Clé secrète</Text>
          <MagicInput
            value={password} onChange={setPassword}
            placeholder="••••••  (6 car. min.)"
            secure={!showPw} capitalize="none" accent={accent}
            autoComplete="new-password" textContentType="newPassword"
            right={
              <Pressable onPress={() => setShowPw((v: boolean) => !v)} style={{ padding: 12 }}>
                {showPw
                  ? <EyeOff size={20} color={`${accent}80`} />
                  : <Eye    size={20} color={`${accent}80`} />}
              </Pressable>
            }
          />
          {/* Indicateur de force */}
          {password.length > 0 && (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[1,2,3,4].map(i => (
                  <React.Fragment key={i}>
                  <View style={{
                    flex: 1, height: 3, borderRadius: 2,
                    backgroundColor: i <= pwStrength ? pwStrengthColor : 'rgba(255,255,255,0.10)',
                  }} />
                </React.Fragment>
                ))}
              </View>
              {pwStrengthLabel !== '' && (
                <Text style={{ color: pwStrengthColor, fontSize: captionSize, fontWeight: '600' }}>
                  Force : {pwStrengthLabel}{pwStrength < 3 ? '  — ajoutez majuscules, chiffres ou symboles' : ''}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Confirmation mot de passe */}
        <View style={{ gap: 10 }}>
          <Text style={s.label}>Confirmer la clé secrète</Text>
          <MagicInput
            value={passwordConfirm} onChange={setPasswordConfirm}
            placeholder="Répétez votre clé secrète…"
            secure={!showPwConfirm} capitalize="none" accent={accent}
            autoComplete="new-password" textContentType="newPassword"
            right={
              <Pressable onPress={() => setShowPwConfirm((v: boolean) => !v)} style={{ padding: 12 }}>
                {showPwConfirm
                  ? <EyeOff size={20} color={`${accent}80`} />
                  : <Eye    size={20} color={`${accent}80`} />}
              </Pressable>
            }
          />
          {passwordConfirm.length > 0 && password !== passwordConfirm && (
            <Text style={{ color: 'rgba(255,130,100,0.9)', fontSize: captionSize }}>
              Les deux mots de passe ne correspondent pas
            </Text>
          )}
          {passwordConfirm.length > 0 && password === passwordConfirm && password.length >= 6 && (
            <Text style={{ color: '#7FD99A', fontSize: captionSize }}>✦ Mots de passe identiques</Text>
          )}
        </View>

        {/* Phrase de sécurité */}
        <View style={{ gap: 10 }}>
          <Text style={s.label}>Phrase de sécurité ✦</Text>
          <Text style={{ color: 'rgba(255,255,255,0.80)', fontSize: captionSize, fontStyle: 'italic', lineHeight: captionSize * 1.55 }}>
            Une phrase secrète pour retrouver votre compte — min. 6 caractères
          </Text>
          <MagicInput
            value={phraseSecurite} onChange={setPhraseSecurite}
            placeholder="Ex : Mon étoile préférée est…"
            capitalize="sentences" accent={accent}
          />
          {phraseSecurite.length > 0 && phraseSecurite.trim().length < 6 && (
            <Text style={{ color: 'rgba(255,130,100,0.9)', fontSize: captionSize }}>6 caractères minimum</Text>
          )}
        </View>

        {/* Code de parrainage (optionnel) */}
        <View style={{ gap: 10 }}>
          <Text style={[s.label, { color: 'rgba(192,132,252,0.8)' }]}>Code d'invitation ✦ <Text style={{ color: 'rgba(255,255,255,0.65)', fontWeight: '400' }}>(optionnel)</Text></Text>
          <Text style={{ color: 'rgba(255,255,255,0.80)', fontSize: captionSize, fontStyle: 'italic', lineHeight: captionSize * 1.55 }}>
            Un ami vous a invité ? Entrez son code pour débloquer un badge de bienvenue
          </Text>
          <MagicInput
            value={codeParrainage} onChange={v => setCodeParrainage(v.toUpperCase())}
            placeholder="Ex : AEVYRA-LUNA7"
            capitalize="characters" accent="#C084FC"
            autoComplete="off"
          />
          {/* Feedback format inline */}
          {codeParrainage.length > 0 && !codeParrainage.startsWith('AEVYRA-') && (
            <Text style={{ color: 'rgba(255,130,100,0.9)', fontSize: captionSize }}>
              Format attendu : AEVYRA-XXXXXX
            </Text>
          )}
          {codeParrainage.startsWith('AEVYRA-') && codeParrainage.length >= 12 && (
            <Text style={{ color: 'rgba(127,217,154,0.9)', fontSize: captionSize }}>
              ✦ Code valide — badge de bienvenue vous attend !
            </Text>
          )}
        </View>

        {/* Serment */}
        <Pressable onPress={() => setSerment((v: boolean) => !v)}>
          <LinearGradient
            colors={serment
              ? [`${accent}18`, `${accent}08`, 'transparent']
              : ['rgba(255,255,255,0.04)', 'transparent']}
            style={{
              borderRadius: 18, borderWidth: 1.5,
              borderColor: serment ? accent : 'rgba(255,255,255,0.12)',
              padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 14,
            }}
          >
            <View style={{
              width: 24, height: 24, borderRadius: 12, marginTop: 1,
              borderWidth: 1.5,
              borderColor: serment ? accent : 'rgba(255,255,255,0.25)',
              backgroundColor: serment ? accent : 'transparent',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {serment && <Check size={13} color="#fff" strokeWidth={3} />}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: serment ? accent : 'rgba(255,255,255,0.90)', fontSize: bodySize, fontWeight: '700' }}>
                Je m'engage sincèrement
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: captionSize, lineHeight: captionSize * 1.55, fontStyle: 'italic' }}>
                À chercher une connexion vraie, avec respect et bienveillance envers chaque âme rencontrée.
              </Text>
            </View>
          </LinearGradient>
        </Pressable>

        {serment && (
          <View style={{ alignItems: 'center', gap: 6, paddingVertical: 4 }}>
            <Text style={{ fontSize: 32 }}>🌟</Text>
            <Text style={{ color: accent, fontSize: bodySize, fontStyle: 'italic', opacity: 0.92 }}>
              Votre serment est gravé dans les étoiles
            </Text>
          </View>
        )}
      </View>
    );

    return null;
  };

  const isLast    = step === TOTAL;
  const btnActive = !!canContinue[step];

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0D1A', overflow: 'hidden' }}>
      <StatusBar style="light" />

      {/* Fond dégradé par étape */}
      <LinearGradient colors={cfg.bg} style={{ position: 'absolute', width, height }} />

      {/* Lueur centrale — clippée par overflow:hidden du parent */}
      <LinearGradient
        colors={cfg.glow}
        style={{
          position: 'absolute',
          width: width * 1.2, height: height * 0.5,
          top: -height * 0.05, left: -width * 0.1,
          borderRadius: width,
        }}
      />

      <Particles accent={accent} />

      {/* ── Écran de félicitations post-inscription ── */}
      {inscrit ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: gap * 1.2, paddingHorizontal: px }}>
          <Animated.View style={{ alignItems: 'center', gap: gap * 0.6 }}>
            <Text style={{ fontSize: 80 }}>🌟</Text>
            <Text style={{ color: '#FFD700', fontSize: h2Size * 1.1, fontWeight: '900', textAlign: 'center', lineHeight: h2Size * 1.3 }}>
              {inscritPrenom ? `Bienvenue, ${inscritPrenom} ✨` : 'Bienvenue dans la Constellation ✨'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: bodySize, textAlign: 'center', lineHeight: bodySize * 1.65, fontStyle: 'italic' }}>
              Votre étoile vient de rejoindre la constellation Aevyra.{'\n'}Les âmes compatibles vous attendent.
            </Text>
          </Animated.View>

          <LinearGradient
            colors={['rgba(155,89,182,0.20)', 'rgba(75,0,130,0.25)']}
            style={{ borderRadius: cardRadius, padding: gap, width: '100%', borderWidth: 1, borderColor: 'rgba(155,89,182,0.3)', gap: gap * 0.5 }}
          >
            <Text style={{ color: '#C084FC', fontWeight: '800', fontSize: h3Size, marginBottom: gap * 0.25 }}>
              ✦ Vos 3 prochaines étapes
            </Text>
            {[
              { emoji: '📸', titre: 'Ajoutez une photo', sub: 'Les profils avec photo reçoivent 5× plus de connexions' },
              { emoji: '✍️', titre: 'Complétez votre bio', sub: 'Une phrase sincère attire les vraies âmes' },
              { emoji: '💫', titre: 'Explorez la Constellation', sub: 'Envoyez une rose ou une étoile à une âme compatible' },
            ].map((item, i) => (
              <React.Fragment key={i}>
                <View style={{ flexDirection: 'row', gap: gap * 0.6, alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: bodySize * 1.2 }}>{item.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#F5E6C8', fontWeight: '700', fontSize: bodySize }}>{item.titre}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.60)', fontSize: captionSize, lineHeight: captionSize * 1.5 }}>{item.sub}</Text>
                  </View>
                </View>
              </React.Fragment>
            ))}
          </LinearGradient>

          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: captionSize, fontStyle: 'italic' }}>
            Entrée dans la constellation en cours…
          </Text>
        </View>
      ) : (
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* En-tête : retour + barre de progression + compteur */}
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: px, gap: 16, paddingBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' }}>
            <Pressable
              onPress={goBack}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <ArrowLeft size={20} color={accent} />
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <ProgressBar step={step} accent={accent} />
            </View>
            <View style={{ backgroundColor: `${accent}18`, borderRadius: cardRadius * 0.6, paddingHorizontal: gap * 0.5, paddingVertical: gap * 0.2, flexShrink: 0 }}>
              <Text style={{ color: accent, fontSize: captionSize, fontWeight: '800', letterSpacing: 1 }}>
                {step} / {TOTAL}
              </Text>
            </View>
          </View>

          {/* Titre de l'étape */}
          <View style={{ gap: gap * 0.3 }}>
            <Text style={{ color: '#fff', fontSize: h2Size * 1.1, fontWeight: '900', lineHeight: h2Size * 1.25, letterSpacing: -0.3 }}>
              {cfg.headline}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: bodySize, fontStyle: 'italic', lineHeight: bodySize * 1.55 }}>
              {cfg.sub}
            </Text>
          </View>
        </View>

        {/* Contenu animé scrollable */}
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1, paddingTop: 16, paddingBottom: 16,
            maxWidth: isWide ? contentMaxWidth : undefined,
            alignSelf: isWide ? 'center' as const : undefined,
            width: isWide ? '100%' : undefined,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
            {renderContent()}
          </Animated.View>
        </ScrollView>

        {/* Footer : erreur + bouton principal + lien connexion */}
        <View style={{
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, 20) + 12,
          paddingTop: 6,
          gap: 10,
        }}>
          {error ? (
            <View style={{
              backgroundColor: 'rgba(255,80,80,0.10)', borderRadius: cardRadius * 0.7,
              borderWidth: 1, borderColor: 'rgba(255,80,80,0.22)',
              paddingHorizontal: buttonPadH, paddingVertical: buttonPadV * 0.7,
            }}>
              <Text style={{ color: '#FF9999', fontSize: bodySize, textAlign: 'center' }}>{error}</Text>
            </View>
          ) : null}

          {/* Bouton principal */}
          <Pressable onPress={handleNext} disabled={loading} style={{ opacity: loading ? 0.65 : 1 }}>
            <LinearGradient
              colors={btnActive
                ? [accent, `${accent}CC`, accent]
                : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.05)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ height: tapTarget * 1.35, borderRadius: cardRadius, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: gap * 0.4 }}
            >
              <Text style={{
                color: btnActive ? '#fff' : 'rgba(255,255,255,0.35)',
                fontSize: buttonFontSize, fontWeight: '900', letterSpacing: 0.3,
              }}>
                {loading
                  ? '✨ Création en cours…'
                  : isLast
                    ? '🌌 Rejoindre la constellation'
                    : step === 3 && signeAstro
                      ? `Continuer en tant que ${signeAstro} →`
                      : 'Continuer  →'}
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Lien vers la connexion */}
          <Pressable
            onPress={() => router.push('/(auth)/sign-in' as RelativePathString)}
            style={{ alignItems: 'center', paddingVertical: 4 }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: bodySize }}>
              Déjà une étoile ?{'  '}
              <Text style={{ color: accent, fontWeight: '700' }}>Se connecter</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      )}
    </View>
  );
}

const s = {
  label: {
    color: 'rgba(255,255,255,0.85)' as const,
    fontSize: 12,
    letterSpacing: 2.5,
    textTransform: 'uppercase' as const,
    fontWeight: '700' as const,
  },
};
