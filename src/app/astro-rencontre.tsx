// Route interne /astro-rencontre — alias SEO /compatibilite-astrologique via _redirects 301
import { Redirect } from 'expo-router';
export default function AstroRencontre() {
  return <Redirect href="/(legal)/compatibilite-astrologique" />;
}
