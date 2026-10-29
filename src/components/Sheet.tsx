import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloseIcon } from '@/components/Icons';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Fired after the exit animation and the native modal has been removed. */
  onClosed?: () => void;
  children: ReactNode;
};

export function Sheet({ visible, onClose, title, description, onClosed, children }: SheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const mountedRef = useRef(visible);
  const onClosedRef = useRef(onClosed);
  const translateY = useSharedValue(1000);

  useEffect(() => {
    onClosedRef.current = onClosed;
  }, [onClosed]);

  const finishClose = useCallback(() => {
    setMounted(false);
    onClosedRef.current?.();
  }, []);

  useEffect(() => {
    if (visible) {
      mountedRef.current = true;
      setMounted(true);
      translateY.value = 1000;
      translateY.value = withTiming(0, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    if (mountedRef.current) {
      translateY.value = withTiming(1000, { duration: 220 }, (finished) => {
        if (finished) {
          mountedRef.current = false;
          runOnJS(finishClose)();
        }
      });
    }
  }, [finishClose, translateY, visible]);

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > 110 || event.velocityY > 700) {
        runOnJS(onClose)();
      } else {
        translateY.value = withTiming(0, {
          duration: 160,
          easing: Easing.out(Easing.cubic),
        });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}>
        <Pressable
          accessibilityLabel="关闭面板"
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: height * 0.88,
              paddingBottom: Math.max(insets.bottom, 12) + 6,
              backgroundColor: colors.paper,
              borderColor: colors.line,
              shadowColor: colors.shadow,
            },
            sheetStyle,
          ]}>
          <GestureDetector gesture={pan}>
            <View style={styles.handleArea}>
              <View style={[styles.handle, { backgroundColor: colors.lineStrong }]} />
            </View>
          </GestureDetector>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
              {description ? (
                <Text style={[styles.description, { color: colors.muted }]}>{description}</Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="关闭"
              hitSlop={10}
              style={[styles.close, { backgroundColor: colors.tabTrack }]}>
              <CloseIcon size={17} color={colors.muted} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}>
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    shadowOpacity: 0.2,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -10 },
    elevation: 20,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radii.full,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 23,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  description: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 18,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
});
