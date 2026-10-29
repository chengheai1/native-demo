import { useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloseIcon, GlobeIcon, RefreshIcon } from '@/components/Icons';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { WebViewContainer } from './WebViewContainer';
import { normalizeWebViewUrl } from './url';

export const DEFAULT_WEBVIEW_URL = 'https://baidu.com';

export function WebViewSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(DEFAULT_WEBVIEW_URL);
  const [url, setUrl] = useState(DEFAULT_WEBVIEW_URL);
  const [reloads, setReloads] = useState(0);
  const [invalid, setInvalid] = useState(false);

  function load() {
    const next = normalizeWebViewUrl(draft);
    if (!next) {
      setInvalid(true);
      return;
    }
    Keyboard.dismiss();
    setInvalid(false);
    setDraft(next);
    setUrl(next);
    setReloads((value) => value + 1);
  }

  function reload() {
    setInvalid(false);
    setReloads((value) => value + 1);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.paper }]}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.titleRow}>
            <View style={styles.titleCopy}>
              <Text style={[styles.eyebrow, { color: colors.accent }]}>WEBVIEW LAB</Text>
              <Text style={[styles.title, { color: colors.ink }]}>网页容器</Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="关闭网页容器"
              hitSlop={10}
              style={[styles.close, { backgroundColor: colors.tabTrack }]}>
              <CloseIcon size={17} color={colors.muted} />
            </Pressable>
          </View>

          <View
            style={[
              styles.addressBar,
              { backgroundColor: colors.card, borderColor: colors.line },
            ]}>
            <GlobeIcon size={15} color={colors.faint} />
            <TextInput
              value={draft}
              onChangeText={(value) => {
                setDraft(value);
                if (invalid) setInvalid(false);
              }}
              onSubmitEditing={load}
              placeholder="https://baidu.com"
              placeholderTextColor={colors.faint}
              selectionColor={colors.accent}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              selectTextOnFocus
              accessibilityLabel="网页地址"
              style={[
                styles.input,
                { color: colors.ink },
                Platform.OS === 'web' ? (webInputReset as TextStyle) : null,
              ]}
            />
            <Pressable
              onPress={load}
              accessibilityRole="button"
              accessibilityLabel="打开网址"
              style={[styles.open, { backgroundColor: colors.ink }]}>
              <Text style={[styles.openText, { color: colors.paper }]}>打开</Text>
            </Pressable>
          </View>

          {invalid ? (
            <Text style={[styles.hint, { color: colors.accent }]}>
              请输入有效的网址，例如 baidu.com 或 https://baidu.com
            </Text>
          ) : (
            <View style={styles.metaRow}>
              <Text style={[styles.currentUrl, { color: colors.faint }]} numberOfLines={1}>
                {url}
              </Text>
              <Pressable
                onPress={reload}
                accessibilityRole="button"
                accessibilityLabel="重新加载网页"
                hitSlop={8}
                style={styles.reload}>
                <RefreshIcon size={12} color={colors.muted} />
                <Text style={[styles.reloadText, { color: colors.muted }]}>重新加载</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={[styles.stage, { borderColor: colors.line, backgroundColor: colors.card }]}>
          {visible ? <WebViewContainer key={`${url}#${reloads}`} url={url} /> : null}
        </View>

        <Text
          style={[
            styles.footer,
            {
              color: colors.faint,
              paddingBottom: Math.max(insets.bottom, 12) + 4,
            },
          ]}>
          {Platform.OS === 'web'
            ? 'Web 端以 iframe 回退，部分站点可能禁止嵌入。'
            : 'react-native-webview · 支持页面内导航与 JS。'}
        </Text>
      </View>
    </Modal>
  );
}

const webInputReset = { outlineStyle: 'none' };

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  titleCopy: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.md,
    paddingLeft: Spacing.md,
    paddingRight: 5,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontFamily: Fonts.mono,
    fontSize: 11,
  },
  open: {
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  openText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '600',
  },
  hint: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    lineHeight: 16,
    paddingHorizontal: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: 2,
  },
  currentUrl: {
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 9,
  },
  reload: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  reloadText: {
    fontFamily: Fonts.sans,
    fontSize: 9,
  },
  stage: {
    flex: 1,
    marginHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  footer: {
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    fontFamily: Fonts.sans,
    fontSize: 9,
    letterSpacing: 0.2,
  },
});
