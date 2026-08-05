// Route interne /creer-compte — alias public /login via _redirects 301
import { Redirect } from 'expo-router';
export default function CreerCompte() {
  return <Redirect href="/(auth)/sign-in" />;
}
