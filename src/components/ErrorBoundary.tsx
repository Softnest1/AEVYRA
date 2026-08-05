// Aevyra – ErrorBoundary global
// Intercepte toutes les erreurs React (page blanche/noire) avant qu'elles arrivent à l'utilisateur.
// Affiche une page de secours cosmique avec bouton "Signaler le problème" → WhatsApp.
import React, { useState, useCallback } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { openWhatsApp, buildBugReportMessage } from '@/lib/whatsapp';

// ── Composant class minimal — évite les problèmes de résolution de type ──────
// On utilise React.Component via l'espace de noms React pour que TSC
// le reconnaisse correctement même avec jsxImportSource: nativewind.
interface EBProps  { children: React.ReactNode; onError: (msg: string) => void }
interface EBState  { crashed: boolean }

// eslint-disable-next-line react/prefer-stateless-function
class CrashDetector extends React.Component<EBProps, EBState> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(p: any) { super(p); (this as any).state = { crashed: false }; }
  static getDerivedStateFromError(): EBState { return { crashed: true }; }
  componentDidCatch(e: Error, info: React.ErrorInfo) {
    console.warn('[Aevyra ErrorBoundary]', e?.message, info?.componentStack?.slice(0, 200));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).props.onError(e?.message ?? 'Erreur inconnue');
  }
  render() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const self = this as any;
    return self.state.crashed ? null : self.props.children;
  }
}

// ── Écran de secours ──────────────────────────────────────────────────────────
function FallbackScreen({ errorMessage, onRetry }: { errorMessage: string; onRetry: () => void }) {
  const handleReport = useCallback(() => {
    openWhatsApp(
      buildBugReportMessage(errorMessage),
      () => {
        // Fallback : ouvrir WhatsApp web si l'app n'est pas disponible
        const msg = encodeURIComponent(buildBugReportMessage(errorMessage));
        Linking.openURL(`https://wa.me/33667485226?text=${msg}`);
      },
    );
  }, [errorMessage]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0D1A' }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1, alignItems: 'center', justifyContent: 'center',
          paddingHorizontal: 24, paddingVertical: 48, gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 64, textAlign: 'center' }}>🌑</Text>

        <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', letterSpacing: 0.3 }}>
          Oups… une étoile s'est éteinte 💫
        </Text>

        <Text style={{ fontSize: 15, color: '#C8B4FF', textAlign: 'center', lineHeight: 22, maxWidth: 340 }}>
          Une erreur inattendue a provoqué une page noire ou blanche.{'\n'}
          Vos données sont en sécurité — ce n'est pas votre faute !
        </Text>

        <View style={{
          width: '100%', maxWidth: 380, backgroundColor: '#1a0a2e88',
          borderRadius: 18, borderWidth: 1, borderColor: '#9B59B633',
          padding: 20, gap: 10, marginTop: 4,
        }}>
          {[
            { emoji: '🔄', text: 'Appuyez sur "Réessayer" pour recharger la page' },
            { emoji: '📱', text: "Ou fermez et rouvrez l'application" },
            { emoji: '💬', text: 'Signalez-nous le problème via WhatsApp — on règle ça rapidement !' },
          ].map((item) => (
            <React.Fragment key={item.emoji}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <Text style={{ fontSize: 18, marginTop: 1 }}>{item.emoji}</Text>
                <Text style={{ flex: 1, color: '#E8D5FF', fontSize: 14, lineHeight: 20 }}>{item.text}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        <Pressable onPress={handleReport} className="active:opacity-75"
          style={{ width: '100%', maxWidth: 380 }}
          accessibilityRole="button" accessibilityLabel="Signaler le problème via WhatsApp">
          <LinearGradient colors={['#25D366', '#128C7E', '#25D366']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 }}>
              💬  Signaler le problème (WhatsApp)
            </Text>
          </LinearGradient>
        </Pressable>

        <Pressable onPress={onRetry} className="active:opacity-75"
          style={{
            width: '100%', maxWidth: 380, paddingVertical: 13, borderRadius: 14,
            borderWidth: 1, borderColor: '#FFD70055', alignItems: 'center', backgroundColor: '#ffffff08',
          }}
          accessibilityRole="button" accessibilityLabel="Réessayer">
          <Text style={{ color: '#FFD700', fontSize: 15, fontWeight: '600' }}>🔄  Réessayer</Text>
        </Pressable>

        <Pressable onPress={() => Linking.openURL('https://aevyra.uk')}
          className="active:opacity-60" accessibilityRole="link"
          accessibilityLabel="Retourner à l'accueil Aevyra">
          <Text style={{ color: '#9B59B6', fontSize: 13, textDecorationLine: 'underline', marginTop: 4 }}>
            🏠 Retourner à l'accueil (aevyra.uk)
          </Text>
        </Pressable>

        <Text style={{ color: '#ffffff25', fontSize: 11, textAlign: 'center', marginTop: 12, letterSpacing: 1 }}>
          ✨ AEVYRA — L'ÉTERNITÉ COMMENCE ICI ✨
        </Text>
      </ScrollView>
    </View>
  );
}

// ── Export public ─────────────────────────────────────────────────────────────
export default function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleError = useCallback((msg: string) => setErrorMsg(msg), []);
  const handleRetry = useCallback(() => setErrorMsg(null), []);

  if (errorMsg !== null) {
    return <FallbackScreen errorMessage={errorMsg} onRetry={handleRetry} />;
  }

  return (
    <CrashDetector onError={handleError} children={children}>
      {children}
    </CrashDetector>
  );
}
