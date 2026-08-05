// Routes légales publiques — accessibles sans connexion (landing page)
// CGU, Confidentialité, Contact
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function LegalLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#0D0D1A" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
