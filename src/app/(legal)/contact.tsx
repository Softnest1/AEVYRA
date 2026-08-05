// Aevyra – Contact & Support via WhatsApp
// Formulaire complet avec récapitulatif pré-rempli → wa.me
import React, { useRef, useState } from 'react';
import {

  KeyboardAvoidingView,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, type RelativePathString } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bug,
  ChevronLeft,
  CircleHelp,
  FileText,
  Flag,
  Hammer,
  MessageCircle,
  Send,
  ShieldAlert,
  Sparkles,
} from 'lucide-react-native';
import CosmicBackground from '@/components/CosmicBackground';
import { useResponsive } from '@/hooks/useResponsive';
import { useSession } from '@/ctx';
import Head from 'expo-router/head';
import { buildTitle, buildMetaTags, serializeJsonLd, buildBreadcrumbSchema, SITE_URL } from '@/hooks/useSEO';

const AnyInput = TextInput as any;

// ── Config ──────────────────────────────────────────────────
const WHATSAPP_NUMBER = '33667485226'; // +33 6 67 48 52 26
const APP_NAME        = 'Aevyra';
const APP_TAGLINE     = "L'éternité commence ici";

// ── Types ────────────────────────────────────────────────────
type FormType = 'question' | 'bug' | 'signalement' | 'comportement' | 'rgpd' | 'suggestion' | 'autre';

interface FormTypeConfig {
  value:       FormType;
  label:       string;
  emoji:       string;
  icon:        React.ReactNode;
  placeholder: string;
  color:       string;
}

const FORM_TYPES: FormTypeConfig[] = [
  {
    value:       'question',
    label:       'Question',
    emoji:       '❓',
    icon:        <CircleHelp size={18} color="#87CEEB" />,
    placeholder: "Posez votre question sur l’application, une fonctionnalité ou votre compte…",
    color:       '#87CEEB',
  },
  {
    value:       'bug',
    label:       'Bug technique',
    emoji:       '🐛',
    icon:        <Bug size={18} color="#FFB347" />,
    placeholder: "Décrivez le bug : que s’est-il passé ? Sur quel écran ? Quel appareil ?…",
    color:       '#FFB347',
  },
  {
    value:       'signalement',
    label:       'Signaler un profil',
    emoji:       '🚨',
    icon:        <Flag size={18} color="#FF6B6B" />,
    placeholder: "Indiquez l’identifiant ou le prénom du profil concerné et la raison du signalement…",
    color:       '#FF6B6B',
  },
  {
    value:       'comportement',
    label:       'Comportement abusif',
    emoji:       '⚠️',
    icon:        <ShieldAlert size={18} color="#FF8C42" />,
    placeholder: "Décrivez le comportement abusif ou le contenu inapproprié observé…",
    color:       '#FF8C42',
  },
  {
    value:       'rgpd',
    label:       'Mes données (RGPD)',
    emoji:       '📋',
    icon:        <FileText size={18} color="#64FFB4" />,
    placeholder: "Accès, rectification, suppression ou portabilité de vos données personnelles…",
    color:       '#64FFB4',
  },
  {
    value:       'suggestion',
    label:       'Suggestion',
    emoji:       '✨',
    icon:        <Sparkles size={18} color="#FFD700" />,
    placeholder: "Une idée pour améliorer Aevyra ? Partagez-la avec nous…",
    color:       '#FFD700',
  },
  {
    value:       'autre',
    label:       'Autre',
    emoji:       '✉️',
    icon:        <Hammer size={18} color="rgba(255,255,255,0.5)" />,
    placeholder: "Décrivez votre demande en détail…",
    color: 'rgba(255,255,255,0.75)',
  },
];

// ── Anti-spam : calcul math aléatoire ───────────────────────
function genCaptcha(): { q: string; a: number } {
  const a  = Math.floor(Math.random() * 9) + 1;
  const b  = Math.floor(Math.random() * 9) + 1;
  const ops = ['+', '-', '×'] as const;
  const op  = ops[Math.floor(Math.random() * 3)];
  const ans = op === '+' ? a + b : op === '-' ? a - b : a * b;
  return { q: `${a} ${op} ${b}`, a: ans };
}

// ── Champ de formulaire réutilisable ─────────────────────────
function Field({
  label, required = false, children,
}: { label: string; required?: boolean; children?: React.ReactNode }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={{
        color: 'rgba(255,215,0,0.75)', fontSize: 11,
        fontWeight: '800', letterSpacing: 1.4,
      }}>
        {label}{required ? ' *' : ''}
      </Text>
      {children}
    </View>
  );
}

// ── Prévisualisation du message WhatsApp ─────────────────────
function WhatsAppPreview({
  type, prenom, sujet, message,
}: { type: FormTypeConfig; prenom: string; sujet: string; message: string }) { 
  const { captionSize  } = useResponsive();
  const hasContent = prenom.trim() || sujet.trim() || message.trim();
  if (!hasContent) return null;

  return (
    <View style={{
      borderRadius: 16, overflow: 'hidden',
      borderWidth: 1, borderColor: 'rgba(37,211,102,0.30)',
    }}>
      {/* Barre titre */}
      <LinearGradient
        colors={['rgba(37,211,102,0.20)', 'rgba(37,211,102,0.08)']}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          paddingHorizontal: 14, paddingVertical: 10,
          borderBottomWidth: 1, borderBottomColor: 'rgba(37,211,102,0.15)',
        }}
      >
        <Text style={{ fontSize: 16 }}>💬</Text>
        <Text style={{ color: '#25D366', fontWeight: '800', fontSize: captionSize, flex: 1 }}>
          Aperçu du message WhatsApp
        </Text>
        <Text style={{ color: 'rgba(37,211,102,0.5)', fontSize: 10 }}>prévisualisation</Text>
      </LinearGradient>

      {/* Corps du message simulé */}
      <View style={{
        backgroundColor: 'rgba(0,0,0,0.25)',
        padding: 14, gap: 3,
      }}>
        {/* Bulle WhatsApp simulée */}
        <View style={{
          backgroundColor: '#1e5c2f', borderRadius: 14,
          borderTopRightRadius: 4, padding: 12, gap: 6,
          alignSelf: 'flex-end', maxWidth: '92%',
        }}>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '700' }}>
            📱 {APP_NAME} — {APP_TAGLINE}
          </Text>
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.10)', marginVertical: 2 }} />

          <Row k="Type"    v={`${type.emoji} ${type.label}`} c={type.color} />
          {prenom.trim()  ? <Row k="Prénom"  v={prenom.trim()}  c="#fff" /> : null}
          {sujet.trim()   ? <Row k="Objet"   v={sujet.trim()}   c="#fff" /> : null}
          {message.trim() ? (
            <View style={{ gap: 3 }}>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '700' }}>Message :</Text>
              <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 11, lineHeight: 17 }}>
                {message.trim().slice(0, 200)}{message.trim().length > 200 ? '…' : ''}
              </Text>
            </View>
          ) : null}

          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.10)', marginVertical: 2 }} />
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontStyle: 'italic', textAlign: 'right' }}>
            Envoyé depuis l’app {APP_NAME} ✓✓
          </Text>
        </View>

        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, textAlign: 'right', marginTop: 4 }}>
          C’est exactement ce que Charly recevra sur WhatsApp
        </Text>
      </View>
    </View>
  );
}

function Row({ k, v, c }: { k: string; v: string; c: string }) { 
  const { captionSize  } = useResponsive();
  return (
    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
      <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize, fontWeight: '700', minWidth: 52 }}>{k} :</Text>
      <Text style={{ color: c, fontSize: captionSize, fontWeight: '600', flex: 1 }}>{v}</Text>
    </View>
  );
}

// ── PAGE PRINCIPALE ──────────────────────────────────────────
export default function Contact() { 
  const insets  = useSafeAreaInsets();
  const { px, captionSize, bodySize: _bodySize, h3Size: _h3Size  } = useResponsive();
  const { session } = useSession();
  // Paramètre URL optionnel : type=bug pré-sélectionne le formulaire bug
  const params  = useLocalSearchParams<{ type?: string }>();

  // Retour intelligent : stack dispo → back, sinon vers app ou landing
  const goBack = () => {
    if (router.canGoBack()) { router.back(); return; }
    router.replace(session ? '/(app)/(tabs)/home' as RelativePathString : '/');
  };
  const {  width  } = useWindowDimensions();
  const maxW    = width >= 768 ? 660 : undefined;

  // Pré-sélectionner le type depuis l'URL (?type=bug) — sinon 'question'
  const initialType: FormType =
    FORM_TYPES.find(t => t.value === params.type)?.value ?? 'question';

  const [type,      setType]      = useState<FormType>(initialType);
  const [prenom,    setPrenom]    = useState('');
  const [sujet,     setSujet]     = useState('');
  const [message,   setMessage]   = useState('');
  const [captcha]                 = useState(() => genCaptcha());
  const [captchaVal,setCaptchaVal]= useState('');
  const [error,     setError]     = useState('');
  const [sent,      setSent]      = useState(false);

  // ── Rate-limiting anti-spam ──────────────────────────────────────────────
  // Stratégie scalable à 500K+ users :
  //  - Entièrement côté client (aucune charge serveur, aucun état partagé)
  //  - 1 seul requestAnimationFrame par frame (zéro setInterval qui re-render 60×)
  //  - Timestamp persistant dans localStorage → résiste au refresh page
  //  - Contournement refresh neutralisé : cooldown recalculé au montage
  const COOLDOWN_MS = 60_000;
  const LS_KEY      = 'aevyra_contact_sent_at';

  const getRemaining = (): number => {
    try {
      if (typeof localStorage === 'undefined') return 0;
      const ts = parseInt(localStorage.getItem(LS_KEY) ?? '0', 10);
      if (!ts) return 0;
      return Math.max(0, Math.ceil((ts + COOLDOWN_MS - Date.now()) / 1000));
    } catch { return 0; }
  };

  const [cooldown, setCooldown] = useState<number>(() => getRemaining());
  const rafRef = useRef<number | null>(null);

  // Tick RAF : 1 re-render/seconde max, auto-stop à 0
  const tickRaf = () => {
    const rem = getRemaining();
    setCooldown(rem);
    if (rem > 0) {
      rafRef.current = requestAnimationFrame(tickRaf);
    } else {
      rafRef.current = null;
    }
  };

  const startCooldown = () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LS_KEY, String(Date.now()));
      }
    } catch { /* ignore incognito / storage full */ }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setCooldown(60);
    rafRef.current = requestAnimationFrame(tickRaf);
  };

  // Reprendre le tick si un cooldown actif est détecté au montage (refresh page)
  React.useEffect(() => {
    if (getRemaining() > 0) {
      rafRef.current = requestAnimationFrame(tickRaf);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sujetRef   = useRef<TextInput>(null);
  const msgRef     = useRef<TextInput>(null);
  const captchaRef = useRef<TextInput>(null);

  const activeType  = FORM_TYPES.find(t => t.value === type)!;
  const captchaOk   = parseInt(captchaVal.trim(), 10) === captcha.a && captchaVal.trim().length > 0;
  const isValid     = prenom.trim().length >= 2 && message.trim().length >= 20 && captchaOk && cooldown === 0;

  const buildMessage = () => {
    const lines: string[] = [];
    lines.push(`📱 *${APP_NAME} — ${APP_TAGLINE}*`);
    lines.push('');
    lines.push(`*━━━ NOUVEAU MESSAGE ━━━*`);
    lines.push(`*Type :* ${activeType.emoji} ${activeType.label}`);
    lines.push(`*Prénom :* ${prenom.trim()}`);
    if (sujet.trim()) lines.push(`*Objet :* ${sujet.trim()}`);
    lines.push('');
    lines.push(`*Message :*`);
    lines.push(message.trim());
    lines.push('');
    lines.push(`─────────────────────`);
    lines.push(`_Envoyé depuis l’application ${APP_NAME}_`);
    lines.push(`_Version 1.0.0 · ${new Date().toLocaleDateString('fr-FR')}_`);
    return lines.join('\n');
  };

  const handleSend = async () => {
    setError('');
    if (cooldown > 0) {
      setError(`Veuillez patienter ${cooldown}s avant d'envoyer un autre message.`); return;
    }
    if (prenom.trim().length < 2) {
      setError('Votre prénom est requis (minimum 2 caractères).'); return;
    }
    if (message.trim().length < 20) {
      setError('Votre message doit faire au moins 20 caractères.'); return;
    }
    if (!captchaOk) {
      setError('Réponse anti-robot incorrecte — réessayez.'); return;
    }
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildMessage())}`;
    try {
      // Sur Web : window.open garanti disponible (guard EXPO_OS)
      if (process.env.EXPO_OS === 'web') {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        const canOpen = await Linking.canOpenURL(url).catch(() => false);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          setError('WhatsApp n\'est pas installé. Contactez-nous au 06 67 48 52 26.');
          return;
        }
      }
      // Démarrer le cooldown anti-spam après envoi réussi
      startCooldown();
      setSent(true);
    } catch {
      setError('Impossible d\'ouvrir WhatsApp. Contactez-nous directement au 06 67 48 52 26.');
    }
  };

  const handleReset = () => {
    setPrenom(''); setSujet(''); setMessage('');
    setCaptchaVal(''); setError(''); setSent(false);
    setType('question');
    // Ne pas réinitialiser le cooldown — l'utilisateur doit attendre même après reset
  };

  return (
    <View style={{ flex: 1 }}>
      <Head>
        <title>{buildTitle('Contact & Support')}</title>
        {buildMetaTags({
          title: 'Contact & Support',
          description: 'Contactez l\'équipe Aevyra pour toute question, signalement ou suggestion. Support disponible via WhatsApp.',
          canonical: `${SITE_URL}/contact`,
          ogType: 'website',
          keywords: ['contact Aevyra', 'support application rencontre', 'aide Aevyra'],
        }).map((tag, i) =>
          tag.type === 'link'
            ? <link key={i} {...tag.attrs} />
            : <meta key={i} {...tag.attrs} />
        )}
        <script type="application/ld+json">{serializeJsonLd(buildBreadcrumbSchema([
          { name: 'Accueil', url: `${SITE_URL}/` },
          { name: 'Contact', url: `${SITE_URL}/contact` },
        ]))}</script>
      </Head>
      <CosmicBackground>
        {/* ── En-tête ── */}
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
            <Text style={{ color: '#F5E6C8', fontSize: 20, fontWeight: '900' }}>
              Contact & Aide
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 1 }}>
              {APP_NAME} · Réponse via WhatsApp
            </Text>
          </View>
          <View style={{
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: 'rgba(37,211,102,0.12)',
            borderWidth: 1, borderColor: 'rgba(37,211,102,0.30)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageCircle size={20} color="#25D366" />
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            overScrollMode="never"
            contentContainerStyle={{
              paddingHorizontal: px,
              paddingBottom: insets.bottom + 48,
              ...(maxW ? { alignSelf: 'center' as const, width: maxW } : {}),
              gap: 20,
            }}
          >

            {/* ── Bandeau info ── */}
            <LinearGradient
              colors={['rgba(37,211,102,0.14)', 'rgba(13,13,26,0.25)']}
              style={{
                borderRadius: 18, padding: 16, gap: 10,
                borderWidth: 1, borderColor: 'rgba(37,211,102,0.28)',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 24 }}>💬</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#25D366', fontWeight: '900', fontSize: 15 }}>
                    Support 100% WhatsApp
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize, marginTop: 1 }}>
                    Votre message est pré-rempli et envoyé directement à Charly
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
                {[
                  { icon: '⚡', text: 'Réponse rapide' },
                  { icon: '👁️', text: 'Aperçu avant envoi' },
                  { icon: '🔒', text: 'Anti-spam intégré' },
                ].map(item => (
                  <React.Fragment key={item.text}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Text style={{ fontSize: captionSize }}>{item.icon}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>{item.text}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </LinearGradient>

            {/* ── Formulaire (masqué si envoi confirmé) ── */}
            {sent ? (
              /* ── Écran de confirmation ── */
              <View style={{
                borderRadius: 20, padding: 28, gap: 16,
                backgroundColor: 'rgba(37,211,102,0.08)',
                borderWidth: 1, borderColor: 'rgba(37,211,102,0.30)',
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: 52 }}>✅</Text>
                <Text style={{ color: '#25D366', fontWeight: '900', fontSize: 18, textAlign: 'center' }}>
                  WhatsApp ouvert !
                </Text>
                <Text style={{
                  color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center', lineHeight: 20,
                }}>
                  Votre message avec récapitulatif complet a été pré-rempli dans WhatsApp.{'\n'}
                  Appuyez sur Envoyer dans WhatsApp pour l’expédier à Charly.
                </Text>
                <View style={{
                  backgroundColor: 'rgba(255,215,0,0.08)',
                  borderRadius: 14, padding: 14, width: '100%',
                  borderWidth: 1, borderColor: 'rgba(255,215,0,0.18)',
                  gap: 6,
                }}>
                  <Text style={{ color: 'rgba(255,215,0,0.7)', fontWeight: '800', fontSize: 11 }}>
                    📋 RÉCAPITULATIF ENVOYÉ
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize }}>
                    Type : {activeType.emoji} {activeType.label}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize }}>
                    Prénom : {prenom.trim()}
                  </Text>
                  {sujet.trim() ? (
                    <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize }}>
                      Objet : {sujet.trim()}
                    </Text>
                  ) : null}
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontStyle: 'italic', marginTop: 2 }}>
                    Date : {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
                <Pressable
                  onPress={handleReset}
                  style={{
                    paddingVertical: 13, paddingHorizontal: 28,
                    borderRadius: 14, marginTop: 4,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
                  }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 13 }}>
                    Envoyer un autre message
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 18 }}>

                {/* ── Sélecteur de type ── */}
                <Field label="TYPE DE DEMANDE" required>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                    {FORM_TYPES.map(t => (
                      <React.Fragment key={t.value}>
                      <Pressable

                        onPress={() => { setType(t.value); setError(''); }}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 7,
                          paddingHorizontal: 13, paddingVertical: 9, borderRadius: 22,
                          backgroundColor: type === t.value
                            ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)',
                          borderWidth: 1.5,
                          borderColor: type === t.value
                            ? 'rgba(255,215,0,0.50)' : 'rgba(255,255,255,0.10)',
                        }}
                      >
                        <Text style={{ fontSize: 15 }}>{t.emoji}</Text>
                        <Text style={{
                          fontSize: captionSize,
                          fontWeight: type === t.value ? '800' : '400',
                          color: type === t.value ? '#FFD700' : 'rgba(255,255,255,0.50)',
                        }}>
                          {t.label}
                        </Text>
                      </Pressable>
                      </React.Fragment>
                    ))}
                  </ScrollView>
                  {/* Description du type sélectionné */}
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderRadius: 12, padding: 10,
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
                  }}>
                    {activeType.icon}
                    <Text style={{ color: activeType.color, fontSize: captionSize, flex: 1, fontStyle: 'italic' }}>
                      {activeType.placeholder.slice(0, 70)}…
                    </Text>
                  </View>
                </Field>

                {/* ── Prénom ── */}
                <Field label="VOTRE PRÉNOM" required>
                  <TextInput
                    value={prenom}
                    onChangeText={(v: string) => { setPrenom(v); setError(''); }}
                    placeholder="Votre prénom…"
                    placeholderTextColor="rgba(255,255,255,0.50)"
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => sujetRef.current?.focus()}
                    style={{
                      color: '#fff', fontSize: 16,
                      paddingVertical: 13, paddingHorizontal: 15,
                      borderRadius: 13, borderWidth: 1.5,
                      borderColor: prenom.trim().length >= 2
                        ? 'rgba(255,215,0,0.40)' : 'rgba(255,255,255,0.13)',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                    }}
                  />
                </Field>

                {/* ── Objet (optionnel) ── */}
                <Field label="OBJET (optionnel)">
                  <AnyInput
                    ref={sujetRef}
                    value={sujet}
                    onChangeText={setSujet}
                    placeholder="Résumez votre demande en quelques mots…"
                    placeholderTextColor="rgba(255,255,255,0.50)"
                    autoCapitalize="sentences"
                    returnKeyType="next"
                    onSubmitEditing={() => msgRef.current?.focus()}
                    style={{
                      color: '#fff', fontSize: 16,
                      paddingVertical: 13, paddingHorizontal: 15,
                      borderRadius: 13, borderWidth: 1.5,
                      borderColor: sujet.trim().length > 0
                        ? 'rgba(255,215,0,0.30)' : 'rgba(255,255,255,0.13)',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                    }}
                  />
                </Field>

                {/* ── Message ── */}
                <Field label="VOTRE MESSAGE" required>
                  <AnyInput
                    ref={msgRef}
                    value={message}
                    onChangeText={(v: string) => { setMessage(v); setError(''); }}
                    placeholder={activeType.placeholder}
                    placeholderTextColor="rgba(255,255,255,0.50)"
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    style={{
                      color: '#fff', fontSize: 16, lineHeight: 20,
                      paddingVertical: 13, paddingHorizontal: 15,
                      borderRadius: 13, borderWidth: 1.5,
                      borderColor: message.trim().length >= 20
                        ? 'rgba(255,215,0,0.40)' : 'rgba(255,255,255,0.13)',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      minHeight: 120,
                    }}
                  />
                  {/* Compteur + min */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{
                      fontSize: 10, fontStyle: 'italic',
                      color: message.trim().length >= 20
                        ? 'rgba(100,255,180,0.5)' : 'rgba(255,255,255,0.20)',
                    }}>
                      {message.trim().length >= 20 ? '✓ Longueur suffisante' : `Minimum 20 caractères`}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10 }}>
                      {message.trim().length} car.
                    </Text>
                  </View>
                </Field>

                {/* ── Aperçu WhatsApp ── */}
                <WhatsAppPreview
                  type={activeType}
                  prenom={prenom}
                  sujet={sujet}
                  message={message}
                />

                {/* ── Anti-robot ── */}
                <Field label="VÉRIFICATION ANTI-ROBOT" required>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{
                      flex: 1, padding: 13, borderRadius: 13,
                      backgroundColor: 'rgba(255,215,0,0.07)',
                      borderWidth: 1.5, borderColor: 'rgba(255,215,0,0.22)',
                    }}>
                      <Text style={{
                        color: '#FFD700', fontSize: 17, fontWeight: '900', textAlign: 'center',
                      }}>
                        Combien fait {captcha.q} ?
                      </Text>
                      <Text style={{ color: 'rgba(255,215,0,0.75)', fontSize: 10, textAlign: 'center', marginTop: 3 }}>
                        Prouvez que vous n’êtes pas un robot 🤖
                      </Text>
                    </View>
                    <AnyInput
                      ref={captchaRef}
                      value={captchaVal}
                      onChangeText={(v: string) => { setCaptchaVal(v); setError(''); }}
                      placeholder="= ?"
                      placeholderTextColor="rgba(255,255,255,0.50)"
                      keyboardType="numeric"
                      returnKeyType="done"
                      style={{
                        width: 72, color: '#fff', fontSize: 18, fontWeight: '800',
                        paddingVertical: 13, paddingHorizontal: 10,
                        borderRadius: 13, textAlign: 'center',
                        borderWidth: 1.5,
                        borderColor: captchaOk
                          ? 'rgba(100,255,180,0.55)' : 'rgba(255,255,255,0.13)',
                        backgroundColor: captchaOk
                          ? 'rgba(100,255,180,0.07)' : 'rgba(255,255,255,0.05)',
                      }}
                    />
                  </View>
                  {captchaOk && (
                    <Text style={{ color: 'rgba(100,255,180,0.65)', fontSize: 11, fontWeight: '700' }}>
                      ✓ Vérification réussie
                    </Text>
                  )}
                </Field>

                {/* ── Erreur ── */}
                {error.length > 0 && (
                  <View style={{
                    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
                    backgroundColor: 'rgba(255,80,80,0.10)',
                    borderRadius: 12, padding: 12,
                    borderWidth: 1, borderColor: 'rgba(255,80,80,0.25)',
                  }}>
                    <Text style={{ fontSize: 14 }}>⚠️</Text>
                    <Text style={{ color: '#FF8080', fontSize: captionSize, flex: 1, lineHeight: 18 }}>{error}</Text>
                  </View>
                )}

                {/* ── Bouton envoi ── */}
                <Pressable
                  onPress={handleSend}
                  disabled={!isValid}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    gap: 10, borderRadius: 18, paddingVertical: 16,
                    backgroundColor: isValid ? '#25D366' : 'rgba(255,255,255,0.05)',
                    borderWidth: 1.5,
                    borderColor: isValid ? '#1ebe5a' : 'rgba(255,255,255,0.10)',
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{cooldown > 0 ? '⏳' : '💬'}</Text>
                  <Text style={{
                    fontWeight: '900', fontSize: 15,
                    color: isValid ? '#fff' : 'rgba(255,255,255,0.20)',
                  }}>
                    {cooldown > 0 ? `Patienter ${cooldown}s…` : 'Envoyer via WhatsApp'}
                  </Text>
                  <Send size={17} color={isValid ? '#fff' : 'rgba(255,255,255,0.15)'} />
                </Pressable>

                {/* ── Note de bas ── */}
                <View style={{ gap: 4, alignItems: 'center', paddingBottom: 8 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, textAlign: 'center', lineHeight: 17 }}>
                    WhatsApp s’ouvrira avec votre message <Text style={{ fontWeight: '700' }}>complet pré-rempli</Text>.{'\n'}
                    Il vous suffira d’appuyer sur <Text style={{ color: '#25D366', fontWeight: '700' }}>Envoyer ▶</Text> dans WhatsApp.
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 3 }}>
                    {APP_NAME} · Charly Soudan · 06 67 48 52 26 · Tremblay-en-France (93290)
                  </Text>
                </View>

              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </CosmicBackground>
    </View>
  );
}
