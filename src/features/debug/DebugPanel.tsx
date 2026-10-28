import { useEffect, useState } from 'react';
import {
  Keyboard,
  Modal,
  PixelRatio,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type KeyboardEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/AuthProvider';
import { CloseIcon } from '@/components/Icons';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { API_URL } from '@/lib/api-url';

export function DebugPanel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const { status } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = (event: KeyboardEvent) => {
      setKeyboardHeight(Math.round(event.endCoordinates.height));
    };
    const hide = () => setKeyboardHeight(0);
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      show,
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      hide,
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const rows: [string, string][] = [
    ['platform', `${Platform.OS} ${Platform.Version}`],
    ['window', `${Math.round(width)} × ${Math.round(height)}`],
    ['safe area', `T${insets.top} R${insets.right} B${insets.bottom} L${insets.left}`],
    ['keyboard', `${keyboardHeight}px`],
    ['font scale', String(PixelRatio.getFontScale())],
    ['pixel ratio', String(PixelRatio.get())],
    ['api', API_URL],
    ['auth', status],
    ['storage', Platform.OS === 'web' ? 'localStorage' : 'SecureStore'],
  ];
  const text = rows.map(([key, value]) => `${key}: ${value}`).join('\n');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
          onPress={onClose}
          accessibilityLabel="关闭调试信息"
        />
        <View
          style={[
            styles.panel,
            {
              backgroundColor: colors.card,
              borderColor: colors.line,
              marginTop: insets.top + 16,
            },
          ]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.eyebrow, { color: colors.accent }]}>DEVICE LAB</Text>
              <Text style={[styles.title, { color: colors.ink }]}>调试信息</Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="关闭"
              hitSlop={10}
              style={[styles.close, { backgroundColor: colors.tabTrack }]}>
              <CloseIcon size={16} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView style={styles.rows} showsVerticalScrollIndicator={false}>
            {rows.map(([key, value]) => (
              <View key={key} style={[styles.row, { borderBottomColor: colors.line }]}>
                <Text style={[styles.key, { color: colors.faint }]}>{key}</Text>
                <Text style={[styles.value, { color: colors.ink }]}>{value}</Text>
              </View>
            ))}
          </ScrollView>

          <Text style={[styles.note, { color: colors.muted }]}>
            真机调试：iOS 用 Safari → 开发 → 设备；Android WebView / 原生视图用 Chrome
            chrome://inspect。键盘弹出时观察 keyboard 高度与底部输入条是否跟随。
          </Text>

          <Pressable
            onPress={() => void Share.share({ message: text })}
            accessibilityRole="button"
            style={[styles.share, { backgroundColor: colors.ink }]}>
            <Text style={[styles.shareText, { color: colors.paper }]}>分享调试信息</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  panel: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '86%',
    borderRadius: Radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eyebrow: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  title: {
    marginTop: 3,
    fontFamily: Fonts.display,
    fontSize: 22,
    fontWeight: '600',
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rows: {
    marginTop: Spacing.lg,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(127,127,127,0.06)',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  key: {
    width: 90,
    fontFamily: Fonts.mono,
    fontSize: 10,
  },
  value: {
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 10,
    lineHeight: 16,
  },
  note: {
    marginTop: Spacing.md,
    fontFamily: Fonts.sans,
    fontSize: 10,
    lineHeight: 17,
  },
  share: {
    marginTop: Spacing.lg,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '600',
  },
});
