import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppScreen } from '@/components/AppScreen';
import { BrandMark } from '@/components/BrandMark';
import { ServiceError } from '@/components/ServiceError';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function IndexRoute() {
  const { status, retry } = useAuth();

  if (status === 'loading') return <BootScreen />;
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

function BootScreen() {
  const { colors } = useTheme();
  return (
    <AppScreen>
      <View style={styles.root}>
        <BrandMark />
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.text, { color: colors.muted }]}>正在整理今天</Text>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['2xl'],
    paddingHorizontal: Spacing['2xl'],
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  text: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    letterSpacing: 1.2,
  },
});
