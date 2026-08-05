// Aevyra – Helper centralisé WhatsApp
// Source unique de vérité pour le numéro et l'ouverture WhatsApp.
// Gère le guard Web (window.open) vs natif (Linking) automatiquement.
// Utiliser EXCLUSIVEMENT cette fonction dans toute l'app — ne jamais appeler
// Linking.openURL('https://wa.me/...') directement.
import { Linking } from 'react-native';

/** Numéro WhatsApp support Aevyra — format international sans + */
export const WA_NUMBER = '33667485226';

/** Numéro formaté pour l'affichage UI : +33 6 67 48 52 26 */
export const WA_NUMBER_DISPLAY = '+33 6 67 48 52 26';

/** Numéro formaté pour appel/texte affiché : 06 67 48 52 26 */
export const WA_NUMBER_LOCAL = '06 67 48 52 26';

/**
 * Ouvre WhatsApp avec un message pré-rempli.
 * — Web  : window.open (Linking ne supporte pas wa.me sur navigateur)
 * — iOS/Android : Linking.openURL avec canOpenURL + fallback page contact
 *
 * @param message  Texte brut (NON encodé) — la fonction encode elle-même
 * @param fallback Fonction appelée si WhatsApp non disponible (ex: router.push contact)
 */
export async function openWhatsApp(
  message: string,
  fallback?: () => void,
): Promise<void> {
  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;

  try {
    if (process.env.EXPO_OS === 'web') {
      // Web : window.open garanti — Linking.openURL ne marche pas pour wa.me sur navigateur
      if (typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    // Natif iOS / Android
    const canOpen = await Linking.canOpenURL(url).catch(() => false);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      // WhatsApp non installé → fallback fourni par l'appelant
      fallback?.();
    }
  } catch {
    // Erreur inattendue → fallback
    fallback?.();
  }
}

/**
 * Message pré-rempli standard pour signalement bug / page blanche.
 * @param errorMsg  Message d'erreur technique capturé (optionnel)
 */
export function buildBugReportMessage(errorMsg?: string): string {
  const errLine = errorMsg ? `*Erreur détectée :* ${errorMsg.slice(0, 120)}\n\n` : '';
  return (
    `🐛 *Aevyra — Signalement bug*\n\n` +
    errLine +
    `*Description :* (décrivez ce que vous faisiez avant que la page devienne blanche/noire)\n\n` +
    `*Appareil :* (ex: iPhone 14, Samsung S23, PC Chrome…)\n\n` +
    `Merci pour votre aide pour améliorer Aevyra ! ✨`
  );
}

/**
 * Message pré-rempli générique pour la page paramètres / aide.
 */
export function buildSupportMessage(): string {
  return `Bonjour, j'ai une question concernant Aevyra 🌸`;
}
