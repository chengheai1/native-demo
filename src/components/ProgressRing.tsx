import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Circle, Svg } from 'react-native-svg';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);
  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const ratio = total === 0 ? 0 : completed / total;
  const allDone = total > 0 && completed === total;

  useEffect(() => {
    progress.value = withTiming(ratio, {
      duration: 480,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, ratio]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`已完成 ${completed} 项，共 ${total} 项`}
      style={styles.container}>
      <Svg width={66} height={66} viewBox="0 0 66 66" style={styles.svg}>
        <Circle cx="33" cy="33" r={radius} fill="none" stroke={colors.line} strokeWidth={3} />
        <AnimatedCircle
          cx="33"
          cy="33"
          r={radius}
          fill="none"
          stroke={allDone ? colors.sage : colors.accent}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={styles.label}>
        <Text style={[styles.value, { color: colors.ink }]}>
          {completed}
          <Text style={[styles.total, { color: colors.faint }]}>/{total}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 66,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  label: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: Fonts.display,
    fontSize: 15,
    fontWeight: '600',
  },
  total: {
    fontSize: 10,
    fontWeight: '400',
  },
});
