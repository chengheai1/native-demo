import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { BrandMark } from '@/components/BrandMark';
import { PressableScale } from '@/components/PressableScale';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { RefreshIcon } from '@/components/Icons';

export function ServiceError({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  const { colors } = useTheme();

  return (
    <AppScreen>
      <View style={styles.root}>
        <BrandMark size="sm" />
        <View style={styles.body}>
          <View style={[styles.icon, { backgroundColor: colors.tabTrack }]}>
            <RefreshIcon size={22} color={colors.muted} />
          </View>
          <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.muted }]}>{message}</Text>
          <PressableScale onPress={onRetry} style={styles.buttonWrap}>
            <View style={[styles.button, { backgroundColor: colors.ink }]}>
              <RefreshIcon size={15} color={colors.paper} />
              <Text style={[styles.buttonText, { color: colors.paper }]}>重新连接</Text>
            </View>
          </PressableScale>
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
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 24,
    fontFamily: Fonts.display,
    fontSize: 32,
    fontWeight: '600',
    lineHeight: 42,
  },
  message: {
    marginTop: 10,
    maxWidth: 300,
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 22,
  },
  buttonWrap: {
    alignSelf: 'flex-start',
    marginTop: 28,
  },
  button: {
    height: 44,
    borderRadius: Radii.full,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  buttonText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '600',
  },
});
