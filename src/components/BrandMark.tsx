import { StyleSheet, Text, View } from 'react-native';

import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const { colors } = useTheme();
  const compact = size === 'sm';
  const mark = compact ? 34 : 42;
  const glyph = compact ? 15 : 19;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.mark,
          {
            width: mark,
            height: mark,
            borderRadius: compact ? 12 : 14,
            backgroundColor: colors.ink,
          },
        ]}>
        <Text style={{ color: colors.paper, fontFamily: Fonts.display, fontSize: glyph }}>序</Text>
        <View
          style={[
            styles.dot,
            {
              backgroundColor: colors.accent,
              borderColor: colors.paper,
              width: compact ? 9 : 10,
              height: compact ? 9 : 10,
            },
          ]}
        />
      </View>
      <View style={styles.wordmark}>
        <Text style={[styles.name, { color: colors.ink }]}>XU</Text>
        <Text style={[styles.tag, { color: colors.muted }]}>A QUIET LIST</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1C1A17',
    shadowOpacity: 0.18,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  dot: {
    position: 'absolute',
    top: -2,
    right: -2,
    borderRadius: Radii.full,
    borderWidth: 2,
  },
  wordmark: {
    gap: 4,
  },
  name: {
    fontFamily: Fonts.display,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 3.2,
  },
  tag: {
    fontFamily: Fonts.sans,
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 1.8,
  },
});
