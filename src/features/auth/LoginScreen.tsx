import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAuthConfig } from '@/api/auth';
import { AppScreen } from '@/components/AppScreen';
import { BrandMark } from '@/components/BrandMark';
import { RefreshIcon } from '@/components/Icons';
import { PressableScale } from '@/components/PressableScale';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/auth/AuthProvider';
import { useTheme } from '@/hooks/use-theme';

export function LoginScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { requestEmailCode, signInWithEmailCode, error: authError, clearError } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [emailBusy, setEmailBusy] = useState<'send' | 'verify' | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const configQuery = useQuery({
    queryKey: ['auth-config'],
    queryFn: getAuthConfig,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const config = configQuery.data;
  const emailEnabled = config?.email === true;
  const emailDev = config?.emailDev === true;
  const error = localError ?? authError;
  const headlineSize = Math.min(50, Math.max(34, width * 0.108));

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleSendCode() {
    if (emailBusy || cooldown > 0) return;
    const value = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      setLocalError('请输入有效的邮箱地址');
      return;
    }
    clearError();
    setLocalError(null);
    setEmailBusy('send');
    try {
      const result = await requestEmailCode(value);
      setEmail(value.toLowerCase());
      setCode('');
      setCodeSent(true);
      setCooldown(result.cooldownSeconds ?? 60);
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : '验证码发送失败，请重试');
    } finally {
      setEmailBusy(null);
    }
  }

  async function handleVerify() {
    if (emailBusy) return;
    if (!/^\d{6}$/.test(code.trim())) {
      setLocalError('请输入 6 位数字验证码');
      return;
    }
    clearError();
    setLocalError(null);
    setEmailBusy('verify');
    try {
      await signInWithEmailCode(email, code.trim());
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : '登录失败，请重试');
    } finally {
      setEmailBusy(null);
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

            {configQuery.isPending ? (
              <View style={styles.emailLoading}>
                <ActivityIndicator size="small" color={colors.muted} />
              </View>
            ) : emailEnabled ? (
              <View style={styles.emailForm}>
                <Text style={[styles.emailTitle, { color: colors.muted }]}>邮箱验证码登录</Text>
                {codeSent ? (
                  <>
                    <Text style={[styles.emailHint, { color: colors.muted }]}>
                      验证码已发送至 {email}
                    </Text>
                    <TextInput
                      value={code}
                      onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                      onSubmitEditing={() => void handleVerify()}
                      placeholder="6 位验证码"
                      placeholderTextColor={colors.faint}
                      keyboardType="number-pad"
                      textContentType="oneTimeCode"
                      autoComplete="one-time-code"
                      maxLength={6}
                      editable={emailBusy === null}
                      returnKeyType="go"
                      accessibilityLabel="邮箱验证码"
                      style={[
                        styles.emailInput,
                        {
                          color: colors.ink,
                          borderColor: colors.line,
                          backgroundColor: colors.paper,
                        },
                      ]}
                    />
                    <PressableScale
                      onPress={handleVerify}
                      disabled={emailBusy !== null}
                      accessibilityLabel="使用验证码登录"
                      style={styles.fullWidth}>
                      <View style={[styles.emailButton, { backgroundColor: colors.ink }]}>
                        {emailBusy === 'verify' ? (
                          <ActivityIndicator size="small" color={colors.paper} />
                        ) : (
                          <Text style={[styles.emailButtonText, { color: colors.paper }]}>
                            登录
                          </Text>
                        )}
                      </View>
                    </PressableScale>
                    <View style={styles.emailActions}>
                      <Pressable
                        onPress={() => void handleSendCode()}
                        disabled={cooldown > 0 || emailBusy !== null}
                        hitSlop={8}>
                        <Text
                          style={[
                            styles.emailAction,
                            { color: cooldown > 0 ? colors.faint : colors.muted },
                          ]}>
                          {cooldown > 0 ? `${cooldown}s 后可重新发送` : '重新发送验证码'}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setCodeSent(false);
                          setCode('');
                          setCooldown(0);
                          setLocalError(null);
                        }}
                        hitSlop={8}>
                        <Text style={[styles.emailAction, { color: colors.muted }]}>
                          换个邮箱
                        </Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      onSubmitEditing={() => void handleSendCode()}
                      placeholder="邮箱地址"
                      placeholderTextColor={colors.faint}
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={emailBusy === null}
                      returnKeyType="send"
                      accessibilityLabel="邮箱地址"
                      style={[
                        styles.emailInput,
                        {
                          color: colors.ink,
                          borderColor: colors.line,
                          backgroundColor: colors.paper,
                        },
                      ]}
                    />
                    <PressableScale
                      onPress={handleSendCode}
                      disabled={emailBusy !== null}
                      accessibilityLabel="发送验证码"
                      style={styles.fullWidth}>
                      <View style={[styles.emailButton, { backgroundColor: colors.ink }]}>
                        {emailBusy === 'send' ? (
                          <ActivityIndicator size="small" color={colors.paper} />
                        ) : (
                          <Text style={[styles.emailButtonText, { color: colors.paper }]}>
                            发送验证码
                          </Text>
                        )}
                      </View>
                    </PressableScale>
                  </>
                )}
                {emailDev ? (
                  <Text style={[styles.emailHint, { color: colors.faint }]}>
                    开发模式：验证码会打印在 API 日志中。
                  </Text>
                ) : null}
              </View>
            ) : configQuery.isError ? null : (
              <View style={[styles.emailUnavailable, { borderColor: colors.line }]}>
                <Text style={[styles.emailUnavailableText, { color: colors.muted }]}>
                  邮箱登录暂未配置，请稍后再试。
                </Text>
              </View>
            )}

            <Text style={[styles.privacy, { color: colors.faint }]}>
              {emailEnabled
                ? '邮箱仅用于接收一次性验证码；验证后会自动创建或关联你的账号。'
                : configQuery.isError
                  ? '连接不上服务器，请检查网络后重试。'
                  : '登录服务尚未配置，请联系管理员。'}
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
  emailForm: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 2,
    gap: 8,
  },
  emailTitle: {
    paddingHorizontal: 4,
    paddingBottom: 2,
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  emailLoading: {
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailUnavailable: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    margin: 10,
  },
  emailUnavailableText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
  emailInput: {
    height: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingHorizontal: Spacing.lg,
    fontFamily: Fonts.sans,
    fontSize: 14,
  },
  emailButton: {
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailButtonText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '600',
  },
  emailHint: {
    paddingHorizontal: 4,
    fontFamily: Fonts.sans,
    fontSize: 9,
    lineHeight: 15,
  },
  emailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  emailAction: {
    fontFamily: Fonts.sans,
    fontSize: 9,
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
