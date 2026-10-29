import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Sheet } from '@/components/Sheet';
import {
  GlobeIcon,
  InfoIcon,
  LogoutIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from '@/components/Icons';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { User } from '@/api/types';
import type { ThemeMode } from '@/constants/theme';

const THEME_OPTIONS: { id: ThemeMode; label: string; icon: typeof MonitorIcon }[] = [
  { id: 'system', label: '跟随系统', icon: MonitorIcon },
  { id: 'light', label: '浅色', icon: SunIcon },
  { id: 'dark', label: '深色', icon: MoonIcon },
];

export function ProfileSheet({
  user,
  visible,
  onClose,
  onLogout,
  onOpenDebug,
  onOpenWebView,
  onClosed,
  logoutPending,
}: {
  user: User;
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
  onOpenDebug: () => void;
  onOpenWebView: () => void;
  onClosed?: () => void;
  logoutPending: boolean;
}) {
  const { colors, mode, setMode } = useTheme();

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      title="账号"
      description="管理登录与调试信息">
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.line }]}>
        <Avatar user={user} size={60} />
        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.ink }]} numberOfLines={1}>
              {user.name}
            </Text>
            {user.isDemo ? (
              <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.badgeText, { color: colors.accent }]}>演示</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.email, { color: colors.muted }]} numberOfLines={1}>
            {user.email}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.faint }]}>外观</Text>
        <View
          style={[
            styles.themeTrack,
            { backgroundColor: colors.tabTrack, borderColor: colors.line },
          ]}>
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = mode === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => setMode(option.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.themeOption,
                  selected && {
                    backgroundColor: colors.card,
                    borderColor: colors.line,
                  },
                ]}>
                <Icon size={14} color={selected ? colors.ink : colors.muted} />
                <Text
                  style={[
                    styles.themeText,
                    { color: selected ? colors.ink : colors.muted },
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.faint }]}>开发</Text>
        <Pressable
          onPress={onOpenDebug}
          accessibilityRole="button"
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.line }]}>
          <InfoIcon size={18} color={colors.muted} />
          <Text style={[styles.rowText, { color: colors.ink }]}>调试信息</Text>
          <Text style={[styles.rowValue, { color: colors.faint }]}>视口 / API</Text>
        </Pressable>
        <Pressable
          onPress={onOpenWebView}
          accessibilityRole="button"
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.line }]}>
          <GlobeIcon size={18} color={colors.muted} />
          <Text style={[styles.rowText, { color: colors.ink }]}>网页容器</Text>
          <Text style={[styles.rowValue, { color: colors.faint }]}>WebView</Text>
        </Pressable>
      </View>

      {user.isDemo ? (
        <Text style={[styles.demoNote, { color: colors.sage, backgroundColor: colors.sageSoft }]}>
          这是演示账号，数据保存在本机 SQLite。退出后会生成一份新的体验清单。
        </Text>
      ) : null}

      <Pressable
        onPress={onLogout}
        disabled={logoutPending}
        accessibilityRole="button"
        style={[styles.logout, { borderColor: colors.line, backgroundColor: colors.card }]}>
        {logoutPending ? (
          <ActivityIndicator size="small" color={colors.ink} />
        ) : (
          <LogoutIcon size={16} color={colors.ink} />
        )}
        <Text style={[styles.logoutText, { color: colors.ink }]}>
          {logoutPending ? '正在退出…' : '退出登录'}
        </Text>
      </Pressable>

      <View style={[styles.footer, { borderTopColor: colors.line }]}>
        <Text style={[styles.footerText, { color: colors.faint }]}>XU · MOBILE PROTOTYPE</Text>
        <Text style={[styles.footerText, { color: colors.faint }]}>V0.1.0</Text>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
  },
  identity: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    flexShrink: 1,
    fontFamily: Fonts.display,
    fontSize: 19,
    fontWeight: '600',
  },
  badge: {
    borderRadius: Radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '600',
  },
  email: {
    fontFamily: Fonts.sans,
    fontSize: 11,
  },
  section: {
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  sectionLabel: {
    paddingHorizontal: 2,
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.4,
  },
  themeTrack: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  themeOption: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  themeText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '500',
  },
  row: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
  },
  rowText: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 13,
  },
  rowValue: {
    fontFamily: Fonts.sans,
    fontSize: 10,
  },
  demoNote: {
    marginTop: Spacing.lg,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontFamily: Fonts.sans,
    fontSize: 10,
    lineHeight: 17,
  },
  logout: {
    marginTop: Spacing.xl,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  logoutText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontFamily: Fonts.sans,
    fontSize: 8,
    letterSpacing: 1.1,
  },
});
