// Aevyra – Utilitaires partage + presse-papiers cross-platform
// iOS/Android : Share de react-native + expo-clipboard
// Web (Chrome Android, Safari) : navigator.share + navigator.clipboard
// Aucun crash silencieux — chaque path retourne { success, error? }

import { Platform } from 'react-native';

export type ShareResult = { success: boolean; error?: string };

/** Partage natif ou Web Share API avec fallback clipboard */
export async function shareContent(options: {
  message: string;
  url?: string;
  title?: string;
}): Promise<ShareResult> {
  const { message, url, title } = options;

  // ── Web ───────────────────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    // Web Share API — disponible sur Chrome Android, Safari
    // Dans un iframe (MeDo preview), navigator.share peut lancer NotAllowedError
    // → fallback immédiat vers clipboard dans ce cas
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text: message, url });
        return { success: true };
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') return { success: true };
        // NotAllowedError (iframe) ou autre → fallback clipboard silencieux
      }
    }
    // Fallback Web : copier le texte + URL dans le presse-papiers
    const textToCopy = url ? `${message}\n${url}` : message;
    return copyToClipboard(textToCopy);
  }

  // ── iOS / Android ─────────────────────────────────────────────────────────
  try {
    const { Share } = await import('react-native');
    const _result = await Share.share({ message, url, title });
    // result.action = 'sharedAction' | 'dismissedAction'
    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

/** Copie dans le presse-papiers — expo-clipboard sur natif, navigator.clipboard sur Web */
export async function copyToClipboard(text: string): Promise<ShareResult> {
  // ── Web ───────────────────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return { success: true };
      } catch {
        // Certains contextes bloquent clipboard.writeText (iframe non-HTTPS)
        return { success: false, error: 'clipboard_blocked' };
      }
    }
    // Dernier recours : execCommand (legacy, synchrone)
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return { success: true };
    } catch {
      return { success: false, error: 'execCommand_failed' };
    }
  }

  // ── iOS / Android ─────────────────────────────────────────────────────────
  try {
    const Clipboard = await import('expo-clipboard');
    await Clipboard.setStringAsync(text);
    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}
