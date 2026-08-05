// Aevyra – Portail Miroir · Connexion v2
// Sécurité : identifiant interne = pseudo@amour-app.fr (0 email réel collecté), récupération via phrase de sécurité
// Flow : Connexion → Accueil | Phrase oubliée → Nouveau mdp → Connexion auto
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, RelativePathString } from 'expo-router';
import AevyraLogo from '@/components/AevyraLogo';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/client/supabase';
import { useResponsive } from '@/hooks/useResponsive';
import * as Haptics from 'expo-haptics';



function ShootingStar({ idx }: { key?: React.Key; idx: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const angles  = [25, 35, 45, 20, 55];
  const startXs = [20, 60, 10, 80, 40];
  const angle  = angles[idx % angles.length];
  const startX = startXs[idx % startXs.length];
  const dur = 1800 + idx * 300;
  const d   = idx * 1100;

  useEffect(() => {
    const loop = () => {
      progress.setValue(0);
      Animated.sequence([
        Animated.delay(d + Math.random() * 3000),
        Animated.timing(progress, { toValue: 1, duration: dur, useNativeDriver: true }),
      ]).start(loop);
    };
    loop();
  }, [progress, d, dur]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 300] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 200] });
  const opacity    = progress.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 0.6, 0] });

  return (
    <Animated.View style={{
      position: 'absolute',
      top: 20 + idx * 30,
      left: `${startX}%` as any,
      width: 80, height: 1.5,
      backgroundColor: '#FFD700',
      opacity,
      transform: [{ translateX }, { translateY }, { rotate: `${angle}deg` }],
      boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 4, color: 'rgba(255,215,0,0.9)' }],
    }} />
  );
}


// ─── Étoile filante ────────────────────────────────────────
function CosmicInput({
  value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize,
  icon, rightElement, onFocus, onBlur, autoComplete, textContentType,
  returnKeyType, onSubmitEditing, inputRef,
}: {
  value: string; onChangeText: (t: string) => void; placeholder: string;
  secureTextEntry?: boolean; keyboardType?: any; autoCapitalize?: any;
  icon: string; rightElement?: React.ReactNode; onFocus?: () => void; onBlur?: () => void;
  autoComplete?: any; textContentType?: any;
  returnKeyType?: any; onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
}) {
  const AnyTI = TextInput as React.ComponentType<any>;
  const [isFocused, setIsFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const glowAnim   = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setIsFocused(true); onFocus?.();
    Animated.parallel([
      Animated.timing(borderAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
      Animated.timing(glowAnim,   { toValue: 1, duration: 400, useNativeDriver: false }),
    ]).start();
  };
  const handleBlur = () => {
    setIsFocused(false); onBlur?.();
    Animated.parallel([
      Animated.timing(borderAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
      Animated.timing(glowAnim,   { toValue: 0, duration: 400, useNativeDriver: false }),
    ]).start();
  };

  const borderColor   = borderAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,215,0,0.2)', '#FFD700'] });
  const shadowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });
  const boxShadow     = shadowOpacity.interpolate({ inputRange: [0, 0.6], outputRange: ['0px 0px 0px rgba(255,215,0,0)', '0px 0px 12px rgba(255,215,0,0.6)'] });

  return (
    <Animated.View style={[{
      borderWidth: 1.5, borderColor, borderRadius: 18, overflow: 'hidden',
    }, process.env.EXPO_OS === 'web' ? { boxShadow } : {
      shadowColor: '#FFD700', shadowRadius: 12,
      shadowOffset: { width: 0, height: 0 }, shadowOpacity,
    }]}>
      <LinearGradient
        colors={isFocused ? ['rgba(75,0,130,0.5)', 'rgba(114,47,55,0.35)'] : ['rgba(13,13,26,0.7)', 'rgba(75,0,130,0.2)']}
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 12, minHeight: 60 }}
      >
        <Text style={{ fontSize: 18, opacity: isFocused ? 1 : 0.5 }}>{icon}</Text>
        <AnyTI
          ref={inputRef}
          value={value} onChangeText={onChangeText}
          placeholder={placeholder} placeholderTextColor="rgba(255,255,255,0.50)"
          secureTextEntry={secureTextEntry} keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'none'}
          autoComplete={autoComplete}
          textContentType={textContentType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={handleFocus} onBlur={handleBlur}
          style={{ flex: 1, color: '#F5F5F5', fontSize: 16, paddingVertical: 18, letterSpacing: 0.3 }}
        />
        {rightElement}
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Constantes sécurité ───────────────────────────────────
const MAX_ATTEMPTS = 4;      // verrouillage après 4 erreurs consécutives
const LOCKOUT_MS   = 30_000; // 30 secondes de cooldown

// ─── Écran principal ───────────────────────────────────────
// 3 écrans : 'login' | 'forgot-step1' (pseudo+phrase) | 'forgot-step2' (nouveau mdp)
type ScreenMode = 'login' | 'forgot-step1' | 'forgot-step2';

export default function SignIn() { 
  const { width, height, px, contentMaxWidth, isDesktop, isTablet: _isTablet, isFullHD: _isFullHD, is4K: _is4K, isCinema: _isCinema  } = useResponsive();

  // ── Vue active ────────────────────────────────────────────
  const [view, setView] = useState<ScreenMode>('login');

  // ── États connexion ───────────────────────────────────────
  const [pseudo,   setPseudo]   = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // Refs chaining clavier
  const passwordRef     = useRef<TextInput>(null);
  const recPhraseRef    = useRef<TextInput>(null);
  const newPwConfirmRef = useRef<TextInput>(null);

  // Verrouillage temporaire anti-brute-force
  // RAF + Date.now() : 1 re-render/seconde max, zéro setInterval,
  // s'auto-suspend quand l'onglet est en arrière-plan — scalable 1M+ users
  const [failCount,   setFailCount]   = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown,   setCountdown]   = useState(0);
  const lockRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!lockedUntil) return;
    let lastSec = -1;
    const tick = () => {
      const rem = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (rem <= 0) {
        setCountdown(0); setLockedUntil(null); setFailCount(0); setError('');
        lockRafRef.current = null;
        return;
      }
      // Re-render uniquement quand la seconde change (pas à chaque frame)
      if (rem !== lastSec) { lastSec = rem; setCountdown(rem); }
      lockRafRef.current = requestAnimationFrame(tick);
    };
    lockRafRef.current = requestAnimationFrame(tick);
    return () => { if (lockRafRef.current) cancelAnimationFrame(lockRafRef.current); };
  }, [lockedUntil]);

  // ── États récupération de compte ─────────────────────────
  // Étape 1 : pseudo + phrase de sécurité
  const [recPseudo,  setRecPseudo]  = useState('');
  const [recPhrase,  setRecPhrase]  = useState('');
  const [recLoading, setRecLoading] = useState(false);
  const [recError,   setRecError]   = useState('');
  // Email interne résolu après vérification de la phrase (jamais affiché à l'utilisateur)
  const [resolvedEmail, setResolvedEmail] = useState('');

  // Étape 2 : nouveau mot de passe
  const [newPw,      setNewPw]      = useState('');
  const [newPwConfirm, setNewPwConfirm] = useState('');
  const [showNewPw,  setShowNewPw]  = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError,   setResetError]   = useState('');
  const [resetDone,    setResetDone]    = useState(false);

  // ── Animations d'entrée ───────────────────────────────────
  const headerAnim = useRef(new Animated.Value(0)).current;
  const formAnim   = useRef(new Animated.Value(0)).current;
  const formSlide  = useRef(new Animated.Value(60)).current;
  const titleAnim  = useRef(new Animated.Value(0)).current;
  const shakeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(titleAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(formAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(formSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();
  }, [headerAnim, formAnim, formSlide, titleAnim]);

  const shakeForm = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  // ── Connexion normale ─────────────────────────────────────
  const handleSignIn = async () => {
    if (lockedUntil && Date.now() < lockedUntil) return;
    if (!pseudo.trim() || !password.trim()) {
      setError('Nom d\'étoile et clé secrète requis.');
      shakeForm(); return;
    }
    const pseudoClean = pseudo.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (pseudoClean.length < 3) {
      setError('Nom d\'étoile invalide (lettres, chiffres, _ · 3 car. min.)');
      shakeForm(); return;
    }
    if (process.env.EXPO_OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    setLoading(true); setError('');

    // Pré-vérification : le pseudo existe-t-il ?
    // check_pseudo_available retourne TRUE si dispo (= n'existe PAS).
    // Si TRUE ici → typo dans le pseudo → message clair SANS consommer une tentative.
    // Timeout 5s : à 1M users, la RPC doit répondre rapidement — si elle tarde
    // (cold start Edge Function, surcharge DB), on passe directement au signInWithPassword
    // pour ne pas bloquer l'UI.
    let isAvailable: boolean | null = null;
    try {
      const rpcPromise = supabase.rpc('check_pseudo_available', { p_pseudo: pseudoClean });
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      );
      const result = await Promise.race([rpcPromise, timeoutPromise]);
      if (result && typeof result === 'object' && 'data' in result) {
        isAvailable = (result as { data: boolean | null }).data;
      }
    } catch {
      // Timeout ou erreur réseau → ne pas bloquer, tenter le signIn directement
      isAvailable = null;
    }
    if (isAvailable === true) {
      setError(`❌ Ce nom d'étoile "${pseudoClean}" n'existe pas. Vérifiez votre saisie.`);
      shakeForm();
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: `${pseudoClean}@amour-app.fr`, password,
    });

    if (authError) {
      const nextFail = failCount + 1;
      setFailCount(nextFail); shakeForm();
      if (nextFail >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_MS);
        setError(`✦ ${MAX_ATTEMPTS} tentatives échouées — accès verrouillé 30 secondes.`);
      } else {
        const rem = MAX_ATTEMPTS - nextFail;
        const sfx = rem > 1 ? 's' : '';
        // Le pseudo existe mais le mot de passe est faux
        if (authError.message.includes('invalid_credentials') || authError.message.includes('Invalid login')) {
          setError(`Clé secrète incorrecte. (${rem} tentative${sfx} restante${sfx})`);
        } else {
          setError(`Connexion impossible. Vérifiez votre réseau. (${rem} tentative${sfx} restante${sfx})`);
        }
      }
    } else {
      setFailCount(0);
      // Stack.Protected guard={!session} gère la redirection automatiquement
      // dès que ctx.tsx reçoit l'événement SIGNED_IN via onAuthStateChange.
      // On attend juste que la session soit propagée dans ctx avant de relâcher le loading.
      await new Promise<void>((resolve) => {
        let resolved = false;
        const done = () => { if (!resolved) { resolved = true; resolve(); } };
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
          if (s) { subscription.unsubscribe(); done(); }
        });
        // Double-sécurité : si getSession répond immédiatement
        supabase.auth.getSession().then(({ data: { session: s } }) => {
          if (s) { subscription.unsubscribe(); done(); }
        });
        // Timeout 3s max — ne jamais bloquer l'UI indéfiniment
        setTimeout(() => { subscription.unsubscribe(); done(); }, 3000);
      });
      // Pas de router.replace() — Stack.Protected s'en charge automatiquement
    }
    setLoading(false);
  };

  // ── Étape 1 récupération : vérifier pseudo + phrase de sécurité ──
  // Appelle la RPC get_email_by_phrase — retourne l'identifiant interne (pseudo@amour-app.fr)
  // UNIQUEMENT si la phrase correspond. Jamais affiché à l'utilisateur, jamais envoyé par mail.
  const handleCheckPhrase = async () => {
    setRecError('');
    const pseudoClean = recPseudo.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (pseudoClean.length < 3) {
      setRecError('Nom d\'étoile invalide (3 car. min.)'); return;
    }
    if (recPhrase.trim().length < 6) {
      setRecError('Phrase de sécurité : 6 caractères minimum.'); return;
    }
    setRecLoading(true);
    try {
      const { data: email, error: rpcErr } = await supabase.rpc('get_email_by_phrase', {
        p_pseudo: pseudoClean,
        p_phrase: recPhrase.trim(),
      });
      if (rpcErr) throw rpcErr;
      if (!email) {
        // Réponse identique que pseudo ou phrase soit incorrect → pas d'énumération
        setRecError('Nom d\'étoile ou phrase de sécurité incorrects.');
        setRecLoading(false); return;
      }
      // Phrase correcte : on mémorise l'identifiant interne et on passe à l'étape 2
      // (jamais affiché à l'utilisateur — uniquement utilisé pour signInWithPassword côté client)
      setResolvedEmail(email as string);
      setResetError(''); setNewPw(''); setNewPwConfirm(''); setResetDone(false);
      setView('forgot-step2');
    } catch {
      setRecError('Erreur réseau. Réessayez.');
    } finally {
      setRecLoading(false);
    }
  };

  // ── Étape 2 récupération : définir un nouveau mot de passe ──
  // Utilise l'identifiant interne résolu à l'étape 1 (pseudo@amour-app.fr).
  // Aucun email réel n'est collecté ou envoyé — c'est un identifiant technique Supabase Auth.
  // Flow : Edge Function sécurisée → admin.updateUserById → signInWithPassword avec le nouveau mdp.
  const handleResetPassword = async () => {
    setResetError('');
    if (newPw.length < 6) {
      setResetError('Nouveau mot de passe : 6 caractères minimum.'); return;
    }
    if (newPw !== newPwConfirm) {
      setResetError('Les deux mots de passe ne correspondent pas.'); return;
    }
    if (!resolvedEmail) {
      setResetError('Session expirée. Recommencez.'); setView('forgot-step1'); return;
    }
    setResetLoading(true);
    try {
      // Appel Edge Function sécurisée (service_role côté serveur uniquement)
      const { data, error: fnErr } = await supabase.functions.invoke('reset-password-by-phrase', {
        body: { email: resolvedEmail, new_password: newPw },
      });
      if (fnErr || data?.error) {
        setResetError(data?.error ?? fnErr?.message ?? 'Erreur lors de la réinitialisation.');
        setResetLoading(false); return;
      }
      setResetDone(true);

      // Connexion automatique avec le nouveau mot de passe
      // Retry 3× avec délai croissant — Supabase prend ~200-500ms pour propager
      // le nouveau hash de mot de passe après updateUserById côté serveur
      let signInErr = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 400));
        const { error } = await supabase.auth.signInWithPassword({
          email: resolvedEmail, password: newPw,
        });
        signInErr = error;
        if (!error) break;
      }

      if (signInErr) {
        // Connexion auto échouée après 3 tentatives → redirection vers login
        setTimeout(() => {
          setView('login'); setError('');
          setPseudo(resolvedEmail.replace('@amour-app.fr', ''));
        }, 1500);
        return;
      }

      // Stack.Protected gère la redirection automatiquement dès que ctx reçoit la session.
      await new Promise<void>((resolve) => {
        let resolved = false;
        const done = () => { if (!resolved) { resolved = true; resolve(); } };
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
          if (s) { subscription.unsubscribe(); done(); }
        });
        supabase.auth.getSession().then(({ data: { session: s } }) => {
          if (s) { subscription.unsubscribe(); done(); }
        });
        setTimeout(() => { subscription.unsubscribe(); done(); }, 3000);
      });
      // Pas de router.replace() — Stack.Protected s'en charge automatiquement
    } catch {
      setResetError('Erreur réseau. Réessayez.');
    } finally {
      setResetLoading(false);
    }
  };

  const isLocked = lockedUntil !== null && Date.now() < (lockedUntil ?? 0);

  // ── Rendu de la vue active ────────────────────────────────
  const renderView = () => {

    // ── VUE CONNEXION ─────────────────────────────────────
    if (view === 'login') return (
      <View style={{ gap: 14 }}>
        {/* Ligne décorative */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,215,0,0.15)' }} />
          <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: 13, letterSpacing: 2 }}>✦ CONNEXION ✦</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,215,0,0.15)' }} />
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, textAlign: 'center', fontStyle: 'italic', lineHeight: 22, marginBottom: 8 }}>
          Votre ciel vous a attendu…{'\n'}Retrouvez votre étoile.
        </Text>

        {/* Feedback réseau hors-ligne */}
        {error.toLowerCase().includes('réseau') || error.toLowerCase().includes('connexion impossible') ? (
          <View style={{
            backgroundColor: 'rgba(255,140,0,0.10)', borderRadius: 14,
            borderWidth: 1, borderColor: 'rgba(255,140,0,0.30)',
            padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4,
          }}>
            <Text style={{ fontSize: 20 }}>🌩️</Text>
            <Text style={{ color: '#FFA040', fontSize: 12, flex: 1, lineHeight: 18 }}>
              Vérifiez votre connexion internet, puis réessayez.
            </Text>
          </View>
        ) : null}

        {/* Barre de tentatives */}
        {failCount > 0 && (
          <View style={{ gap: 6, marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>Tentatives</Text>
              <Text style={{ color: failCount >= 3 ? '#FF6B6B' : '#FFD700', fontSize: 11, fontWeight: '700' }}>
                {failCount} / {MAX_ATTEMPTS}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
                <React.Fragment key={i}><View style={{
                  flex: 1, height: 5, borderRadius: 3,
                  backgroundColor: i < failCount
                    ? (failCount >= MAX_ATTEMPTS ? '#FF6B6B' : failCount >= 3 ? '#FF8C00' : '#FFD700')
                    : 'rgba(255,255,255,0.12)',
                }} /></React.Fragment>
              ))}
            </View>
          </View>
        )}

        <Animated.View style={{ gap: 14, transform: [{ translateX: shakeAnim }] }}>
          {/* Pseudo */}
          <CosmicInput
            value={pseudo} onChangeText={setPseudo}
            placeholder="Votre nom d'étoile (@pseudo)"
            autoCapitalize="none" icon="✦"
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          {pseudo.trim().length >= 2 && (
            <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: 11, fontStyle: 'italic', marginTop: -8, marginLeft: 4 }}>
              {'✦ @' + pseudo.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')}
            </Text>
          )}

          {/* Mot de passe */}
          <CosmicInput
            inputRef={passwordRef}
            value={password} onChangeText={setPassword}
            placeholder="Clé secrète (mot de passe)"
            secureTextEntry={!showPw} icon="🔑"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleSignIn}
            rightElement={
              <Pressable onPress={() => setShowPw((v: boolean) => !v)} style={{ padding: 4 }}>
                {showPw ? <EyeOff size={18} color="rgba(255,215,0,0.6)" /> : <Eye size={18} color="rgba(255,215,0,0.6)" />}
              </Pressable>
            }
          />

          {/* Lien récupération */}
          <Pressable
            onPress={() => { setView('forgot-step1'); setRecError(''); setRecPseudo(''); setRecPhrase(''); }}
            style={{ alignSelf: 'flex-end', paddingVertical: 4 }}
          >
            <Text style={{ color: '#FFD700', fontSize: 13, fontStyle: 'italic', textDecorationLine: 'underline', textDecorationColor: 'rgba(255,215,0,0.4)' }}>
              J'ai perdu ma clé… →
            </Text>
          </Pressable>

          {/* Erreur */}
          {error ? (
            <View style={{
              backgroundColor: isLocked ? 'rgba(255,107,107,0.14)' : 'rgba(255,107,107,0.08)',
              borderRadius: 14, borderWidth: 1,
              borderColor: isLocked ? 'rgba(255,107,107,0.5)' : 'rgba(255,107,107,0.25)',
              padding: 14, gap: 8,
            }}>
              <Text style={{ color: '#FF8080', fontSize: 13, textAlign: 'center', fontStyle: 'italic', lineHeight: 20 }}>
                {error}
              </Text>
              {isLocked && countdown > 0 && (
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
                    Réessayez dans <Text style={{ color: '#FFD700', fontWeight: '900' }}>{countdown}s</Text>
                  </Text>
                  <View style={{ width: '100%', height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    <View style={{
                      width: `${((LOCKOUT_MS / 1000 - countdown) / (LOCKOUT_MS / 1000)) * 100}%`,
                      height: 4, borderRadius: 2, backgroundColor: '#FFD700',
                    }} />
                  </View>
                </View>
              )}
            </View>
          ) : null}

          {/* Bouton connexion */}
          <Pressable
            onPress={handleSignIn}
            disabled={loading || isLocked || !pseudo.trim() || !password.trim()}
            style={{ marginTop: 4, opacity: (loading || isLocked || !pseudo.trim() || !password.trim()) ? 0.5 : 1 }}
          >
            <LinearGradient
              colors={isLocked ? ['#555', '#333'] : loading ? ['#888', '#555'] : ['#FFD700', '#B8860B', '#FFD700']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{
                height: 60, borderRadius: 20,
                alignItems: 'center', justifyContent: 'center',
                boxShadow: (!isLocked && !loading) ? [{ offsetX: 0, offsetY: 4, blurRadius: 16, color: 'rgba(255,215,0,0.75)' }] : undefined,
              } as any}
            >
              <Text style={{ color: isLocked ? '#aaa' : loading ? '#fff' : '#000000', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 }}>
                {isLocked ? `🔒 Verrouillé (${countdown}s)` : loading ? '✦ Connexion…' : '🌟 Retrouver mon âme sœur'}
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Séparateur */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,215,0,0.15)' }} />
            <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: 13 }}>ou</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,215,0,0.15)' }} />
          </View>

          {/* Bouton inscription */}
          <Pressable onPress={() => router.push('/(auth)/register' as RelativePathString)} style={{ height: 56, borderRadius: 18, overflow: 'hidden' }}>
            <LinearGradient
              colors={['rgba(75,0,130,0.4)', 'rgba(114,47,55,0.4)']}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)', borderRadius: 18 }}
            >
              <Text style={{ color: 'rgba(255,182,193,0.9)', fontSize: 15 }}>
                Première étoile ?{'  '}<Text style={{ color: '#FFD700', fontWeight: '800' }}>Naître ici →</Text>
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    );

    // ── VUE RÉCUPÉRATION — ÉTAPE 1 : pseudo + phrase de sécurité ──────────
    if (view === 'forgot-step1') return (
      <View style={{ gap: 20 }}>
        {/* En-tête avec retour */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => setView('login')} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={18} color="#FFD700" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFD700', fontSize: 17, fontWeight: '900' }}>🔑 Récupérer l'accès</Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 }}>Étape 1 / 2 — Vérification</Text>
          </View>
        </View>

        <View style={{ backgroundColor: 'rgba(255,215,0,0.07)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,215,0,0.18)', gap: 6 }}>
          <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '700' }}>🛡️ Sécurité sans email</Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12.5, lineHeight: 20 }}>
            Sur Aevyra, aucun email réel n'est utilisé.{'\n'}
            Entrez votre nom d'étoile et votre phrase de sécurité (définie à l'inscription) pour retrouver l'accès.
          </Text>
        </View>

        <CosmicInput
          value={recPseudo} onChangeText={setRecPseudo}
          placeholder="Votre nom d'étoile (@pseudo)"
          autoCapitalize="none" icon="✦"
          autoComplete="username" textContentType="username"
          returnKeyType="next" onSubmitEditing={() => recPhraseRef.current?.focus()}
        />
        {recPseudo.trim().length >= 2 && (
          <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: 11, fontStyle: 'italic', marginTop: -14, marginLeft: 4 }}>
            {'✦ @' + recPseudo.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')}
          </Text>
        )}

        <CosmicInput
          inputRef={recPhraseRef}
          value={recPhrase} onChangeText={setRecPhrase}
          placeholder="Votre phrase de sécurité…"
          autoCapitalize="sentences" icon="🌙"
          autoComplete="off" textContentType="none"
          returnKeyType="go" onSubmitEditing={handleCheckPhrase}
        />

        {recError ? (
          <View style={{ backgroundColor: 'rgba(255,80,80,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,80,80,0.22)', padding: 12 }}>
            <Text style={{ color: '#FF9999', fontSize: 13, textAlign: 'center' }}>{recError}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleCheckPhrase}
          disabled={recLoading || recPseudo.trim().length < 3 || recPhrase.trim().length < 6}
          style={{ opacity: (recLoading || recPseudo.trim().length < 3 || recPhrase.trim().length < 6) ? 0.5 : 1 }}
        >
          <LinearGradient
            colors={['#FFD700', '#B8860B', '#FFD700']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#000000', fontSize: 16, fontWeight: '900' }}>
              {recLoading ? '✦ Vérification…' : '✦ Vérifier ma phrase →'}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    );

    // ── VUE RÉCUPÉRATION — ÉTAPE 2 : nouveau mot de passe ─────────────────
    if (view === 'forgot-step2') return (
      <View style={{ gap: 20 }}>
        {/* En-tête avec retour */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => setView('forgot-step1')} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={18} color="#FFD700" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFD700', fontSize: 17, fontWeight: '900' }}>🔑 Nouvelle clé secrète</Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 }}>Étape 2 / 2 — Réinitialisation</Text>
          </View>
        </View>

        {resetDone ? (
          <View style={{ alignItems: 'center', gap: 14, paddingVertical: 12 }}>
            <Text style={{ fontSize: 52 }}>🌟</Text>
            <Text style={{ color: '#7FD99A', fontSize: 16, fontWeight: '900', textAlign: 'center' }}>
              Clé secrète réinitialisée !
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
              Connexion automatique en cours…
            </Text>
          </View>
        ) : (
          <>
            <View style={{ backgroundColor: 'rgba(127,217,154,0.08)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(127,217,154,0.25)', gap: 4 }}>
              <Text style={{ color: '#7FD99A', fontSize: 13, fontWeight: '700' }}>✦ Identité vérifiée</Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12.5 }}>
                Phrase de sécurité confirmée. Choisissez une nouvelle clé secrète.
              </Text>
            </View>

            <CosmicInput
              value={newPw} onChangeText={setNewPw}
              placeholder="Nouvelle clé secrète (6 car. min.)"
              secureTextEntry={!showNewPw} icon="🔑"
              autoComplete="new-password" textContentType="newPassword"
              returnKeyType="next" onSubmitEditing={() => newPwConfirmRef.current?.focus()}
              rightElement={
                <Pressable onPress={() => setShowNewPw((v: boolean) => !v)} style={{ padding: 4 }}>
                  {showNewPw ? <EyeOff size={18} color="rgba(255,215,0,0.6)" /> : <Eye size={18} color="rgba(255,215,0,0.6)" />}
                </Pressable>
              }
            />
            {newPw.length > 0 && newPw.length < 6 && (
              <Text style={{ color: 'rgba(255,130,100,0.8)', fontSize: 12, marginTop: -14, marginLeft: 4 }}>
                6 caractères minimum
              </Text>
            )}

            <CosmicInput
              inputRef={newPwConfirmRef}
              value={newPwConfirm} onChangeText={setNewPwConfirm}
              placeholder="Confirmer la clé secrète"
              secureTextEntry={!showNewPw} icon="✦"
              autoComplete="new-password" textContentType="newPassword"
              returnKeyType="go" onSubmitEditing={handleResetPassword}
            />
            {newPwConfirm.length > 0 && newPw !== newPwConfirm && (
              <Text style={{ color: 'rgba(255,130,100,0.8)', fontSize: 12, marginTop: -14, marginLeft: 4 }}>
                Les deux clés ne correspondent pas
              </Text>
            )}
            {newPwConfirm.length >= 6 && newPw === newPwConfirm && (
              <Text style={{ color: '#7FD99A', fontSize: 12, marginTop: -14, marginLeft: 4 }}>
                ✦ Les clés correspondent
              </Text>
            )}

            {resetError ? (
              <View style={{ backgroundColor: 'rgba(255,80,80,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,80,80,0.22)', padding: 12 }}>
                <Text style={{ color: '#FF9999', fontSize: 13, textAlign: 'center' }}>{resetError}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleResetPassword}
              disabled={resetLoading || newPw.length < 6 || newPw !== newPwConfirm}
              style={{ opacity: (resetLoading || newPw.length < 6 || newPw !== newPwConfirm) ? 0.5 : 1 }}
            >
              <LinearGradient
                colors={['#FFD700', '#B8860B', '#FFD700']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#000000', fontSize: 16, fontWeight: '900' }}>
                  {resetLoading ? '✦ Réinitialisation…' : '🌌 Confirmer ma nouvelle clé'}
                </Text>
              </LinearGradient>
            </Pressable>
          </>
        )}
      </View>
    );

    return null;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0D1A' }}>
      <StatusBar style="light" />

      {/* Fond étoilé */}
      <View style={{ position: 'absolute', width, height }}>
        {Array.from({ length: 50 }, (_, i) => (
          <React.Fragment key={i}><View style={{
            position: 'absolute',
            left: ((i * 173 + 7) % 97) * width / 100,
            top:  ((i * 97 + 13) % 93) * height / 100,
            width:  i % 5 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
            height: i % 5 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
            borderRadius: 2,
            backgroundColor: i % 4 === 0 ? '#FFB6C1' : '#FFD700',
            opacity: 0.15 + (i % 6) * 0.06,
          }} /></React.Fragment>
        ))}
      </View>

      {/* Étoiles filantes */}
      {[0, 1, 2, 3].map(i => <ShootingStar key={i} idx={i} />)}

      {/* Zone header — logo + titre uniquement, hauteur fixe sans débordement */}
      {view === 'login' && (
        <Animated.View style={{ alignItems: 'center', paddingTop: 20, paddingBottom: 12, opacity: headerAnim, overflow: 'hidden' }}>
          {/* Halos décoratifs — remplacement de l'orbe débordant */}
          <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(75,0,130,0.14)', top: -20 }} />
          <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(114,47,55,0.10)', top: 0 }} />
          <Animated.View style={{ alignItems: 'center', opacity: titleAnim }}>
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 10,
            }}>
              {/* Logo SVG vectoriel — net sur tous écrans, aucun fond blanc */}
              <AevyraLogo size={64} />
            </View>
            <Text style={{ fontSize: 30, fontWeight: '900', color: '#FFD700', letterSpacing: 4, textShadowColor: 'rgba(255,215,0,0.4)', textShadowRadius: 12 }}>Aevyra</Text>
            <Text style={{ color: 'rgba(255,182,193,0.65)', fontSize: 10, letterSpacing: 4, marginTop: 2 }}>PORTAIL DES ÂMES</Text>
          </Animated.View>
        </Animated.View>
      )}

      {/* Panneau formulaire */}
      <Animated.View style={{ flex: 1, opacity: formAnim, transform: [{ translateY: formSlide }] }}>
        {view === 'login' && (
          <LinearGradient colors={['rgba(13,13,26,0)', 'rgba(20,8,40,0.98)']} style={{ position: 'absolute', top: -40, left: 0, right: 0, height: 60 }} />
        )}
        <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1, paddingHorizontal: px,
              paddingTop: view === 'login' ? 8 : 24,
              paddingBottom: 36,
              maxWidth: isDesktop ? contentMaxWidth : undefined,
              alignSelf: isDesktop ? 'center' : undefined,
              width: isDesktop ? '100%' : undefined,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
            bounces={false}
          >
            {renderView()}
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}
