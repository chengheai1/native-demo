import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronLeftIcon } from '@/components/Icons';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { visibleWebViewProgress } from './loadingProgress';
import { resolveWebViewTitle } from './pageTitle';
import { WebViewContainer } from './WebViewContainer';

export const DEFAULT_WEBVIEW_URL = 'https://stack021.com/';

export function WebViewScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [progress, setProgress] = useState(0);
  const visibleProgress = visibleWebViewProgress(progress);

  const close = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/todos');
  }, [router]);

  return (
    <View style={[styles.root, { backgroundColor: colors.paper }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.navBar}>
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="返回"
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <ChevronLeftIcon size={25} color={colors.ink} />
          </Pressable>
          <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {visibleProgress === null ? null : (
          <View style={[styles.progressTrack, { backgroundColor: colors.tabTrack }]}>
            <View
              style={[
                styles.progressValue,
                {
                  width: `${visibleProgress * 100}%` as `${number}%`,
                  backgroundColor: colors.accent,
                },
              ]}
            />
          </View>
        )}
      </View>

      <WebViewContainer
        url={DEFAULT_WEBVIEW_URL}
        onCloseRequest={close}
        onNavigate={(page) => setTitle(resolveWebViewTitle(page.title))}
        onProgressChange={setProgress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    zIndex: 1,
  },
  navBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.5,
  },
  title: {
    flex: 1,
    paddingRight: 44,
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  progressTrack: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: 2,
    overflow: 'hidden',
  },
  progressValue: {
    height: '100%',
  },
});
