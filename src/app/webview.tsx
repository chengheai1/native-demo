import { Redirect } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { getTodosRedirect } from '@/auth/routing';
import { AuthLoadingScreen } from '@/components/AuthLoadingScreen';
import { WebViewScreen } from '@/features/webview/WebViewScreen';

export default function WebViewRoute() {
  const { status } = useAuth();
  const redirect = getTodosRedirect(status);

  if (status === 'loading') return <AuthLoadingScreen />;
  if (redirect) return <Redirect href={redirect} />;
  return <WebViewScreen />;
}
