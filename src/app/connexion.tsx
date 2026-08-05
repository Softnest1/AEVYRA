// Route interne /connexion — alias publics /sign-in et /login via _redirects 301
import { Redirect } from 'expo-router';
export default function Connexion() {
  return <Redirect href="/(auth)/sign-in" />;
}
