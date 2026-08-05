import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl: string = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey: string = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

// Sur Web : window.localStorage natif (persistant entre refreshs de page).
// Sur natif : expo-sqlite/localStorage/install installe un polyfill SQLite-backed synchrone.
// Le bloc `if (Platform.OS !== 'web')` est tree-shaké statiquement par Metro —
// le polyfill n'est jamais bundlé ni exécuté côté navigateur.
let authStorage: Storage;
if (Platform.OS !== 'web') {
  // require() synchrone requis ici : expo-sqlite/localStorage/install a un effet de bord
  // (il installe le polyfill sur globalThis.localStorage) qui doit s'exécuter avant
  // que createClient() lise `localStorage`. Un import() async serait trop tardif.
  // oxlint-disable-next-line
  require('expo-sqlite/localStorage/install');
  authStorage = localStorage as unknown as Storage;
} else {
  authStorage = window.localStorage;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Sur Web : lire le token depuis l'URL (OAuth callback, magic link).
    // Sur natif : pas d'URL de callback navigateur, inutile.
    detectSessionInUrl: Platform.OS === 'web',
  },
});
