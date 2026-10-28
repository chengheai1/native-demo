import { useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  withTiming,
} from 'react-native-reanimated';

import { Fonts, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TodoFilter } from '@/api/types';

const TABS: { id: TodoFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'active', label: '进行中' },
  { id: 'done', label: '已完成' },
];

export function FilterTabs({
  filter,
  counts,
  onChange,
}: {
  filter: TodoFilter;
  counts: Record<TodoFilter, number>;
  onChange: (filter: TodoFilter) => void;
}) {
  const { colors, isDark } = useTheme();
  const suppressPress = useSharedValue(false);
  const [width, setWidth] = useState(0);
  const translateX = useSharedValue(0);
  const index = TABS.findIndex((tab) => tab.id === filter);
  const tabWidth = width > 0 ? (width - 8) / TABS.length : 0;

  useEffect(() => {
    translateX.value = withTiming(index * tabWidth, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [index, tabWidth, translateX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  function onLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  function move(delta: number) {
    const next = TABS[index + delta];
    if (next) onChange(next.id);
  }

  function releaseSwipeGuard() {
    setTimeout(() => {
      suppressPress.value = false;
    }, 260);
  }

  const swipe = Gesture.Pan()
    .activeOffsetX([-18, 18])
    .failOffsetY([-14, 14])
    .onStart(() => {
      suppressPress.value = true;
    })
    .onFinalize(() => {
      runOnJS(releaseSwipeGuard)();
    })
    .onEnd((event) => {
      if (event.translationX < -36 || event.velocityX < -600) {
        runOnJS(move)(1);
      } else if (event.translationX > 36 || event.velocityX > 600) {
        runOnJS(move)(-1);
      }
    });

  return (
    <GestureDetector gesture={swipe}>
      <View
        onLayout={onLayout}
        accessibilityRole="tablist"
        accessibilityLabel="筛选任务，可左右滑动切换"
        style={[
          styles.container,
          { backgroundColor: colors.tabTrack, borderColor: colors.line },
        ]}>
      {width > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              width: tabWidth,
              backgroundColor: isDark ? 'rgba(242, 236, 225, 0.13)' : colors.card,
              borderColor: isDark ? 'rgba(242, 236, 225, 0.06)' : colors.line,
              shadowColor: colors.shadow,
            },
            indicatorStyle,
          ]}
        />
      ) : null}
      {TABS.map((tab) => {
        const selected = tab.id === filter;
        return (
          <Pressable
            key={tab.id}
            testID={`filter-${tab.id}`}
            onPress={() => {
              if (suppressPress.value) return;
              onChange(tab.id);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={styles.tab}>
            <Text
              style={[
                styles.label,
                {
                  color: selected ? colors.ink : colors.muted,
                  fontWeight: selected ? '600' : '500',
                },
              ]}>
              {tab.label}
            </Text>
            <Text style={[styles.count, { color: selected ? colors.muted : colors.faint }]}> 
              {counts[tab.id]}
            </Text>
            {selected ? (
              <View style={[styles.activeLine, { backgroundColor: colors.accent }]} />
            ) : null}
          </Pressable>
        );
        })}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 52,
    padding: 4,
    borderRadius: Radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    height: 44,
    borderRadius: Radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
  },
  label: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '500',
  },
  count: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  activeLine: {
    position: 'absolute',
    bottom: 7,
    left: '50%',
    width: 16,
    marginLeft: -8,
    height: 2,
    borderRadius: 1,
  },
});
