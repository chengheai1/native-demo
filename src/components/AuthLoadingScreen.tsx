import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { BrandMark } from '@/components/BrandMark';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function AuthLoadingScreen() {
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
