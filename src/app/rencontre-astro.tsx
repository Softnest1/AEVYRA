// Route interne /rencontre-astro — alias SEO /rencontre-astrologique via _redirects 301
import { Redirect } from 'expo-router';
export default function RencontreAstro() {
  return <Redirect href="/(legal)/rencontre-astrologique" />;
}
