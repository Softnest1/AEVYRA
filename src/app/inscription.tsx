// Route interne /inscription — alias public /register via _redirects 301
// Cloudflare réserve /register (308 forcé) — on utilise /inscription comme intermédiaire
import { Redirect } from 'expo-router';
export default function Inscription() {
  return <Redirect href="/(auth)/register" />;
}
