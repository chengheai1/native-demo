import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckIcon, CloseIcon, TrashIcon } from '@/components/Icons';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ToastTone = 'default' | 'success' | 'danger';

type ToastInput = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: ToastTone;
  duration?: number;
};

type ToastState = ToastInput & { id: number };

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
  dismissToast: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const dismissToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = undefined;
    setToast(null);
  }, []);

  const showToast = useCallback((input: ToastInput) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const next: ToastState = {
      ...input,
      tone: input.tone ?? 'default',
      duration: input.duration ?? 4_500,
      id: Date.now() + Math.random(),
    };
    setToast(next);
    timerRef.current = setTimeout(() => {
      setToast((current) => (current?.id === next.id ? null : current));
      timerRef.current = undefined;
    }, next.duration);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const value = useMemo(() => ({ showToast, dismissToast }), [dismissToast, showToast]);
  const Icon =
    toast?.tone === 'success' ? CheckIcon : toast?.tone === 'danger' ? TrashIcon : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        {toast ? (
          <Animated.View
            key={toast.id}
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(140)}
            style={[
              styles.wrap,
              {
                bottom: insets.bottom + 98,
                backgroundColor: colors.ink,
                shadowColor: colors.shadow,
              },
            ]}>
            <View style={styles.row}>
              {Icon ? (
                <View style={[styles.icon, { backgroundColor: 'rgba(246,241,231,0.12)' }]}>
                  <Icon size={15} color={colors.paper} />
                </View>
              ) : null}
              <Text style={[styles.message, { color: colors.paper }]} numberOfLines={3}>
                {toast.message}
              </Text>
              {toast.actionLabel ? (
                <Pressable
                  onPress={() => {
                    toast.onAction?.();
                    dismissToast();
                  }}
                  accessibilityRole="button"
                  style={styles.action}>
                  <Text style={styles.actionText}>{toast.actionLabel}</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={dismissToast}
                accessibilityRole="button"
                accessibilityLabel="关闭提示"
                hitSlop={10}
                style={styles.close}>
                <CloseIcon size={14} color="rgba(246,241,231,0.55)" />
              </Pressable>
            </View>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 18,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 18,
  },
  action: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: Radii.full,
  },
  actionText: {
    color: '#F6B59E',
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '600',
  },
  close: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
