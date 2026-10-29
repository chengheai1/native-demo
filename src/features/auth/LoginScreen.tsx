import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAuthConfig } from '@/api/auth';
import { AppScreen } from '@/components/AppScreen';
import { BrandMark } from '@/components/BrandMark';
import { ArrowRightIcon, GoogleIcon, RefreshIcon } from '@/components/Icons';
import { PressableScale } from '@/components/PressableScale';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/auth/AuthProvider';
import { useTheme } from '@/hooks/use-theme';

export function LoginScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { startGoogleSignIn, error: authError, clearError } = useAuth();
  const [busy, setBusy] = useState<'google' | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const configQuery = useQuery({
    queryKey: ['auth-config'],
    queryFn: getAuthConfig,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const config = configQuery.data;
  const googleMissing = config?.google === false;
  const error = localError ?? authError;
  const headlineSize = Math.min(50, Math.max(34, width * 0.108));

  async function handleGoogle() {
    if (busy) return;
    if (googleMissing) {
      setLocalError(
        'Google 登录尚未配置：请在 server/.env 填写 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET，重启 API 后再试。',
      );
      return;
    }
    clearError();
    setLocalError(null);
    setBusy('google');
    try {
      await startGoogleSignIn();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : 'Google 登录失败，请重试');
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppScreen>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 18) + 14,
            paddingBottom: Math.max(insets.bottom, 18) + 12,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <BrandMark />
          <View style={[styles.beta, { borderColor: colors.line }]}>
            <Text style={[styles.betaText, { color: colors.muted }]}>BETA 01</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Animated.View entering={FadeIn.duration(280).delay(40)}>
            <View style={[styles.eyebrow, { borderColor: colors.line, backgroundColor: `${colors.card}CC` }]}>
              <View style={[styles.eyebrowDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.eyebrowText, { color: colors.muted }]}>一个安静的待办清单</Text>
            </View>

            <Text
              style={[
                styles.headline,
                {
                  color: colors.ink,
                  fontSize: headlineSize,
                  lineHeight: headlineSize * 1.16,
                },
              ]}>
              把今天，{'\n'}
              理成喜欢的样子。
            </Text>
            <View style={[styles.underline, { backgroundColor: colors.accentSoft }]} />

            <Text style={[styles.subhead, { color: colors.muted }]}>
              写下要做的小事，勾掉它们。{'\n'}不追赶，只把今天过得清楚一点。
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeIn.duration(280).delay(110)}
            style={[
              styles.authCard,
              {
                backgroundColor: `${colors.card}F2`,
                borderColor: colors.line,
                shadowColor: colors.shadow,
              },
            ]}>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.errorText, { color: colors.accent }]}>{error}</Text>
              </View>
            ) : null}

            {configQuery.isError ? (
              <Pressable
                onPress={() => void configQuery.refetch()}
                style={[styles.configError, { borderColor: colors.line }]}>
                <RefreshIcon size={15} color={colors.muted} />
                <Text style={[styles.configErrorText, { color: colors.muted }]}>
                  连接不上后端，点此重试
                </Text>
              </Pressable>
            ) : null}

            <PressableScale
              onPress={handleGoogle}
              disabled={busy !== null}
              accessibilityLabel="使用 Google 继续"
              style={styles.fullWidth}>
              <View
                style={[
                  styles.googleButton,
                  {
                    backgroundColor: colors.paper,
                    borderColor: colors.line,
                    opacity: googleMissing ? 0.78 : 1,
                  },
                ]}>
                <View style={[styles.googleIcon, { backgroundColor: colors.white }]}>
                  <GoogleIcon size={20} />
                </View>
                <Text style={[styles.googleText, { color: colors.ink }]}>使用 Google 继续</Text>
                {busy === 'google' ? (
                  <ActivityIndicator size="small" color={colors.muted} />
                ) : googleMissing ? (
                  <View style={[styles.pendingChip, { backgroundColor: colors.tabTrack }]}>
                    <Text style={[styles.pendingText, { color: colors.faint }]}>待配置</Text>
                  </View>
                ) : (
                  <ArrowRightIcon size={17} color={colors.muted} />
                )}
              </View>
            </PressableScale>

            <Text style={[styles.privacy, { color: colors.faint }]}>
              {googleMissing
                ? 'Google 登录待配置，请完成配置后再试。'
                : '登录仅读取你的姓名、邮箱和头像，用于同步待办。'}
            </Text>
          </Animated.View>

          <Animated.Text
            entering={FadeIn.duration(280).delay(170)}
            style={[styles.footnote, { color: colors.faint }]}>
            — 慢慢来，也算前进。
          </Animated.Text>
        </View>

        <View style={[styles.footer, { borderTopColor: colors.line }]}>
          <Text style={[styles.footerText, { color: colors.faint }]}>XU · 2026</Text>
          <Text style={[styles.footerText, { color: colors.faint }]}>MADE FOR SLOW DAYS</Text>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing['2xl'],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  beta: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  betaText: {
    fontFamily: Fonts.sans,
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 1.4,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  eyebrow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.full,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  eyebrowDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  eyebrowText: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 1.4,
  },
  headline: {
    marginTop: Spacing.xl,
    fontFamily: Fonts.display,
    fontWeight: '500',
    letterSpacing: -0.8,
  },
  underline: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    marginTop: 5,
  },
  subhead: {
    marginTop: Spacing.xl,
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 23,
    maxWidth: 310,
  },
  authCard: {
    marginTop: Spacing['3xl'],
    padding: 8,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
    elevation: 5,
  },
  errorBox: {
    borderRadius: 18,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: 8,
  },
  errorText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 17,
  },
  configError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 8,
    marginBottom: 8,
  },
  configErrorText: {
    fontFamily: Fonts.sans,
    fontSize: 10,
  },
  fullWidth: {
    width: '100%',
  },
  googleButton: {
    height: 58,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  googleIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  googleText: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '600',
  },
  pendingChip: {
    borderRadius: Radii.full,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  pendingText: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '500',
  },
  privacy: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 5,
    fontFamily: Fonts.sans,
    fontSize: 9,
    lineHeight: 16,
  },
  footnote: {
    marginTop: Spacing.lg,
    fontFamily: Fonts.sans,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.lg,
  },
  footerText: {
    fontFamily: Fonts.sans,
    fontSize: 8,
    letterSpacing: 1.4,
  },
});
