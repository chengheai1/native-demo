import { Redirect } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { LoginScreen } from '@/features/auth/LoginScreen';

export default function LoginRoute() {
  const { status } = useAuth();
  if (status === 'signedIn') return <Redirect href="/todos" />;
  return <LoginScreen />;
}
