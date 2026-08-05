// Route interne /app-astro — alias SEO /app-rencontre-gratuite via _redirects 301
import { Redirect } from 'expo-router';
export default function AppAstro() {
  return <Redirect href="/(legal)/app-rencontre-gratuite" />;
}
