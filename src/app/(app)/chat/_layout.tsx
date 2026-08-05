// Layout Stack pour le sous-dossier chat/[id].tsx
// Requis par expo-router pour les dynamic routes dans un sous-dossier
import { Stack } from 'expo-router';

export default function ChatLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
