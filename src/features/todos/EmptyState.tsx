import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Circle, Path, Svg } from 'react-native-svg';

import { ArrowRightIcon, PlusIcon } from '@/components/Icons';
import { PressableScale } from '@/components/PressableScale';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TodoFilter } from '@/api/types';

const COPY: Record<TodoFilter, { title: string; body: string; cta?: string }> = {
  all: {
    title: '今天还没有安排',
    body: '从一件小事开始。写下来，就已经前进了一点。',
    cta: '写下第一件事',
  },
  active: {
    title: '没有进行中的任务',
    body: '清单暂时是空的，给自己留一点余白。',
  },
  done: {
    title: '还没有完成的任务',
    body: '勾掉一件，它就会出现在这里。',
  },
};

export function EmptyState({
  filter,
  onAdd,
  onShowAll,
}: {
  filter: TodoFilter;
  onAdd: () => void;
  onShowAll: () => void;
}) {
  const { colors } = useTheme();
  const copy = COPY[filter];

  return (
    <Animated.View entering={FadeIn.duration(260)} style={styles.container}>
      <Svg width={168} height={150} viewBox="0 0 180 160">
        <Circle cx="92" cy="72" r="38" fill={colors.accentSoft} />
        <Path d="M42 125h96" stroke={colors.line} strokeWidth={1.5} strokeLinecap="round" />
        <Path
          d="M62 91c9 8 19 15 33 15s25-7 34-17"
          fill="none"
          stroke={colors.accent}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Circle cx="132" cy="42" r="4" fill={colors.accent} />
        <Path d="M134 54v8M130 58h8" stroke={colors.accent} strokeWidth={1.5} strokeLinecap="round" />
        <Path
          d="M43 58l5 2-2 5"
          fill="none"
          stroke={colors.sage}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={[styles.title, { color: colors.ink }]}>{copy.title}</Text>
      <Text style={[styles.body, { color: colors.muted }]}>{copy.body}</Text>

      {copy.cta ? (
        <PressableScale onPress={onAdd} style={styles.ctaWrap}>
          <View style={[styles.cta, { backgroundColor: colors.ink }]}>
            <PlusIcon size={15} color={colors.paper} />
            <Text style={[styles.ctaText, { color: colors.paper }]}>{copy.cta}</Text>
          </View>
        </PressableScale>
      ) : (
        <PressableScale onPress={onShowAll} style={styles.ctaWrap}>
          <View style={styles.ghost}>
            <Text style={[styles.ghostText, { color: colors.muted }]}>回到全部</Text>
            <ArrowRightIcon size={14} color={colors.muted} />
          </View>
        </PressableScale>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 28,
    paddingBottom: 20,
  },
  title: {
    marginTop: 10,
    fontFamily: Fonts.display,
    fontSize: 22,
    fontWeight: '600',
  },
  body: {
    marginTop: 7,
    maxWidth: 250,
    textAlign: 'center',
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 20,
  },
  ctaWrap: {
    marginTop: 22,
  },
  cta: {
    height: 44,
    borderRadius: Radii.full,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  ctaText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '600',
  },
  ghost: {
    height: 40,
    borderRadius: Radii.full,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ghostText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '500',
  },
});
