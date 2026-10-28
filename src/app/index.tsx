import { Redirect } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { AuthLoadingScreen } from '@/components/AuthLoadingScreen';
import { ServiceError } from '@/components/ServiceError';

export default function IndexRoute() {
  const { status, retry } = useAuth();

  if (status === 'loading') return <AuthLoadingScreen />;
  if (status === 'error') {
    return (
      <ServiceError
        title="连接不上服务器"
        message="请确认 FastAPI 已启动，并检查手机与电脑是否在同一网络。"
        onRetry={() => void retry()}
      />
    );
  }
  return <Redirect href={status === 'signedIn' ? '/todos' : '/login'} />;
}
