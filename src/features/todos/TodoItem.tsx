import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  LinearTransition,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CheckIcon } from '@/components/Icons';
import { Fonts, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTaskTime } from '@/lib/format';
import type { Todo } from '@/api/types';
import { ACTION_WIDTH, getSwipeVisuals } from './swipeVisuals';

type TodoItemProps = {
  todo: Todo;
  pending?: boolean;
  openId: number | null;
  onOpen: (id: number | null) => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function TodoItem({
  todo,
  pending = false,
  openId,
  onOpen,
  onToggle,
  onEdit,
  onDelete,
}: TodoItemProps) {
  const { colors } = useTheme();
  const reveal = useSharedValue(0);
  const startReveal = useSharedValue(0);
  const rowWidth = useSharedValue(0);
  const checkScale = useSharedValue(todo.completed ? 1 : 0.94);

  useEffect(() => {
    checkScale.value = withTiming(todo.completed ? 1 : 0.94, {
      duration: 160,
      easing: Easing.out(Easing.cubic),
    });
  }, [checkScale, todo.completed]);

  useEffect(() => {
    if (openId !== todo.id) {
      reveal.value = withTiming(0, { duration: 170, easing: Easing.out(Easing.cubic) });
    }
  }, [openId, reveal, todo.id]);

  const pan = Gesture.Pan()
    .enabled(!pending)
    .activeOffsetX([-14, 14])
    .failOffsetY([-14, 14])
    .onStart(() => {
      startReveal.value = reveal.value;
      runOnJS(onOpen)(todo.id);
    })
    .onUpdate((event) => {
      reveal.value = Math.max(
        0,
        Math.min(ACTION_WIDTH, startReveal.value - event.translationX),
      );
    })
    .onEnd((event) => {
      const current = reveal.value;
      const open = current > ACTION_WIDTH / 2 || event.velocityX < -650;
      const close = event.velocityX > 650 || current <= ACTION_WIDTH / 2;
      const shouldOpen = open && !close;
      reveal.value = shouldOpen
        ? withSpring(ACTION_WIDTH, { damping: 18, stiffness: 260, mass: 0.7 })
        : withTiming(0, { duration: 190, easing: Easing.out(Easing.cubic) });
      runOnJS(onOpen)(shouldOpen ? todo.id : null);
    });

  const cardStyle = useAnimatedStyle(() => ({
    width: rowWidth.value > 0 ? Math.max(0, rowWidth.value - reveal.value) : undefined,
    backgroundColor: interpolateColor(
      reveal.value,
      [0, 26],
      [colors.card, colors.swipeCard],
    ),
    borderTopRightRadius: interpolate(
      reveal.value,
      [0, 24],
      [Radii.lg, 0],
      Extrapolation.CLAMP,
    ),
    borderBottomRightRadius: interpolate(
      reveal.value,
      [0, 24],
      [Radii.lg, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const actionsStyle = useAnimatedStyle(() => ({
    width: reveal.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      getSwipeVisuals(reveal.value).textProgress,
      [0, 1],
      [todo.completed ? colors.muted : colors.ink, colors.muted],
    ),
  }));

  const timeStyle = useAnimatedStyle(() => ({
    opacity: getSwipeVisuals(reveal.value).timeOpacity,
  }));

  const edgeShadowStyle = useAnimatedStyle(() => ({
    opacity: getSwipeVisuals(reveal.value).shadowOpacity,
    backgroundImage: `linear-gradient(to right, transparent, ${colors.shadow})`,
  }));

  const innerStyle = useAnimatedStyle(() => ({
    width: rowWidth.value > 0 ? rowWidth.value : undefined,
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  function closeActions() {
    reveal.value = withTiming(0, { duration: 170, easing: Easing.out(Easing.cubic) });
  }

  function execute(action: () => void) {
    closeActions();
    onOpen(null);
    action();
  }

  function handleSurfacePress(action: () => void) {
    if (reveal.value > 4) {
      closeActions();
      onOpen(null);
      return;
    }
    onOpen(null);
    action();
  }

  return (
    <Animated.View
      layout={LinearTransition.duration(200)}
      testID={`todo-${todo.id}`}
      onLayout={(event) => {
        rowWidth.value = event.nativeEvent.layout.width;
      }}
      style={styles.outer}>
      <Animated.View style={[styles.actions, actionsStyle]}>
        <View style={styles.actionsContent}>
          <Pressable
            onPress={() => execute(onToggle)}
            accessibilityRole="button"
            accessibilityLabel={todo.completed ? '撤销完成' : '标记完成'}
            style={[styles.actionButton, { backgroundColor: '#C97E30' }]}
          />
          <Pressable
            onPress={() => execute(onDelete)}
            accessibilityRole="button"
            accessibilityLabel="删除任务"
            style={[styles.actionButton, { backgroundColor: '#FA5151' }]}
          />
        </View>
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.actionsText}>
          <Text style={styles.actionText}>{todo.completed ? '撤销' : '完成'}</Text>
          <Text style={styles.actionText}>删除</Text>
        </View>
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.card,
            {
              borderColor: colors.line,
              shadowColor: colors.shadow,
              opacity: pending ? 0.72 : 1,
            },
            cardStyle,
          ]}>
          <Animated.View style={[styles.cardInner, innerStyle]}>
            <Animated.View style={checkStyle}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: todo.completed, disabled: pending }}
                accessibilityLabel={
                  todo.completed
                    ? `标记「${todo.title}」为未完成`
                    : `完成「${todo.title}」`
                }
                onPress={() => handleSurfacePress(onToggle)}
                disabled={pending}
                style={styles.checkboxHit}>
                <View
                  style={[
                    styles.checkCircle,
                    {
                      borderColor: todo.completed ? colors.ink : colors.lineStrong,
                      backgroundColor: todo.completed ? colors.ink : 'transparent',
                    },
                  ]}>
                  {todo.completed ? (
                    <CheckIcon size={14} color={colors.paper} strokeWidth={2.6} />
                  ) : null}
                </View>
              </Pressable>
            </Animated.View>

            <Pressable
              onPress={() => handleSurfacePress(onEdit)}
              disabled={pending}
              accessibilityRole="button"
              accessibilityLabel={`编辑「${todo.title}」`}
              accessibilityHint="左滑显示完成和删除操作"
              style={styles.copy}>
              <Animated.Text
                numberOfLines={2}
                style={[
                  styles.title,
                  {
                    textDecorationLine: todo.completed ? 'line-through' : 'none',
                    textDecorationColor: colors.muted,
                  },
                  titleStyle,
                ]}>
                {todo.title}
              </Animated.Text>
              <Animated.Text style={[styles.time, { color: colors.faint }, timeStyle]}>
                {formatTaskTime(todo.createdAt)}
                {pending ? ' · 保存中' : ''}
              </Animated.Text>
            </Pressable>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.edgeShadow, edgeShadowStyle]} />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: Radii.lg,
    overflow: 'hidden',
  },
  actions: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  actionsContent: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
  },
  actionsText: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: ACTION_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  actionText: {
    width: ACTION_WIDTH / 2,
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '400',
  },
  card: {
    minHeight: 76,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  cardInner: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  edgeShadow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 32,
  },
  checkboxHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    paddingVertical: 2,
    paddingRight: 4,
  },
  title: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    paddingRight: 8,
  },
  time: {
    marginTop: 3,
    fontFamily: Fonts.sans,
    fontSize: 10,
  },
});
