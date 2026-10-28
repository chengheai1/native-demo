import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { exchangeNativeCode } from '@/api/auth';
import { AppScreen } from '@/components/AppScreen';
import { BrandMark } from '@/components/BrandMark';
import { PressableScale } from '@/components/PressableScale';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { writeSessionToken } from '@/lib/storage';

const ERROR_COPY: Record<string, string> = {
  google_not_configured: 'Google 登录尚未配置。',
  access_denied: '已取消 Google 登录。',
  state_mismatch: '登录链接已失效，请重新发起登录。',
  email_unverified: '邮箱尚未验证。',
  oauth_failed: 'Google 登录没有完成，请稍后重试。',
  invalid_code: '登录链接已失效，请重新登录。',
};

export default function WebAuthRoute() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const code = typeof params.code === 'string' ? params.code : undefined;
  const oauthError = typeof params.error === 'string' ? params.error : undefined;

  useEffect(() => {
    if (started.current) return;

    if (!code) {
      setError(
        oauthError
          ? (ERROR_COPY[oauthError] ?? '登录没有完成，请重试。')
          : '登录回调缺少授权码，请重新登录。',
      );
      return;
    }

    started.current = true;
    void exchangeNativeCode(code)
      .then(async (session) => {
        await writeSessionToken(session.token);
        if (typeof window !== 'undefined') {
          window.location.replace('/todos');
        } else {
          router.replace('/todos');
        }
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : '登录失败，请重试。');
      });
  }, [code, oauthError]);

  return (
    <AppScreen>
      <View style={styles.root}>
        <BrandMark size="sm" />
        <View style={styles.body}>
          {error ? (
            <>
              <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.iconText, { color: colors.accent }]}>!</Text>
              </View>
              <Text style={[styles.title, { color: colors.ink }]}>登录没有完成</Text>
              <Text style={[styles.message, { color: colors.muted }]}>{error}</Text>
              <PressableScale onPress={() => router.replace('/login')} style={styles.buttonWrap}>
                <View style={[styles.button, { backgroundColor: colors.ink }]}>
                  <Text style={[styles.buttonText, { color: colors.paper }]}>返回登录</Text>
                </View>
              </PressableScale>
            </>
          ) : (
            <>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={[styles.title, { color: colors.ink }]}>正在完成 Google 登录</Text>
              <Text style={[styles.message, { color: colors.muted }]}>
                正在安全地交换登录凭证，请稍候。
              </Text>
            </>
          )}
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingTop: 36,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontFamily: Fonts.display,
    fontSize: 24,
    fontWeight: '600',
  },
  title: {
    marginTop: 20,
    fontFamily: Fonts.display,
    fontSize: 30,
    fontWeight: '600',
    lineHeight: 40,
  },
  message: {
    marginTop: 9,
    maxWidth: 300,
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 21,
  },
  buttonWrap: {
    alignSelf: 'flex-start',
    marginTop: 26,
  },
  button: {
    height: 44,
    borderRadius: Radii.full,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '600',
  },
});
