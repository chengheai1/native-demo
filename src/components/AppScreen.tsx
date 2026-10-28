import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function AppScreen({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.paper }, style]}>
      <LinearGradient
        colors={isDark ? [colors.paper, '#0F0E0D'] : [colors.paper, colors.paperAlt]}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[
          styles.blob,
          styles.blobTop,
          { backgroundColor: colors.accent, opacity: isDark ? 0.08 : 0.07 },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.blob,
          styles.blobBottom,
          { backgroundColor: colors.sage, opacity: isDark ? 0.12 : 0.1 },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobTop: {
    width: 280,
    height: 280,
    top: -120,
    right: -100,
  },
  blobBottom: {
    width: 340,
    height: 340,
    bottom: -160,
    left: -140,
  },
});
