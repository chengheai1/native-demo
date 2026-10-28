import { Redirect } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { TodoScreen } from '@/features/todos/TodoScreen';

export default function TodosRoute() {
  const { status } = useAuth();
  if (status === 'signedIn') return <TodoScreen />;
  return <Redirect href="/login" />;
}
